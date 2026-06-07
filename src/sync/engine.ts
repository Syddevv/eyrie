import { and, count, eq, isNotNull } from "drizzle-orm";

import { db } from "@/src/db/client";
import { syncQueue, syncState } from "@/src/db/schema";
import { nowIso } from "@/src/db/utils/time";
import { SYNCABLE_TABLES, MAX_SYNC_BATCH_SIZE } from "./constants";
import {
  classifySyncError,
  isRetryableSyncError,
  normalizeSyncError,
} from "./errors";
import {
  fetchBootstrapRecordIds,
  fetchFailedRecordIds,
  fetchRecordById,
  markRecordSyncResult,
} from "./helpers";
import { logSync, logSyncError } from "./logger";
import {
  clearQueueItem,
  enqueueSync,
  failQueueItem,
  getQueueSnapshot,
  getDueQueueItems,
  lockQueueItem,
  retryQueuedFailures,
  updateQueueItemPayloadSnapshot,
  unlockQueueItem,
} from "./queue";
import { syncRegistry } from "./registry";
import { useSyncStore } from "./store";
import { fetchRemoteRowById, fetchRemoteRowsPage, upsertRemoteRows } from "./supabase";
import type { SyncRunReason, SyncRunResult, SyncableTable } from "./types";
import { showSuccessToast } from "@/store/useToastStore";

let activeRun: Promise<SyncRunResult | null> | null = null;

type SyncCursor = {
  updatedAt: string | null;
  id: string | null;
};

type DeferredRemoteRow = {
  tableName: SyncableTable;
  row: Record<string, unknown> & { id: string; updated_at: string };
  localSyncStatus?: string;
};

function isAfterCursor(cursor: SyncCursor, updatedAt: string, id: string) {
  return (
    !cursor.updatedAt ||
    updatedAt > cursor.updatedAt ||
    (updatedAt === cursor.updatedAt && (!cursor.id || id > cursor.id))
  );
}

function advanceCursor(cursor: SyncCursor, updatedAt: string, id: string): SyncCursor {
  return isAfterCursor(cursor, updatedAt, id) ? { updatedAt, id } : cursor;
}

function isForeignKeyConstraintError(error: unknown) {
  const message = normalizeSyncError(error, "Sync failed.");
  return message.includes("FOREIGN KEY constraint failed");
}

export async function needsInitialHydration(userId: string) {
  const rows = await db.query.syncState.findMany({
    where: eq(syncState.userId, userId),
    limit: 1,
  });

  return rows.length === 0;
}

export async function refreshSyncCounts(userId: string) {
  const pendingRows = await db
    .select({ value: count() })
    .from(syncQueue)
    .where(eq(syncQueue.userId, userId));
  const failedRows = await db
    .select({ value: count() })
    .from(syncQueue)
    .where(and(eq(syncQueue.userId, userId), isNotNull(syncQueue.lastError)));

  const summary = {
    pendingCount: Number(pendingRows[0]?.value ?? 0),
    failedCount: Number(failedRows[0]?.value ?? 0),
  };

  useSyncStore.getState().setSummary(summary);
  return summary;
}

export async function forceFullResync(userId: string) {
  await db.delete(syncState).where(eq(syncState.userId, userId));
  for (const tableName of SYNCABLE_TABLES) {
    const ids = await fetchBootstrapRecordIds(tableName, userId);
    for (const id of ids) {
      await enqueueSync(tableName, id, "upsert", userId);
    }
  }
}

export async function getSyncDiagnostics(userId: string) {
  const queue = await getQueueSnapshot(userId);
  const migrations = await db.query.syncState.findMany({
    where: eq(syncState.userId, userId),
  });
  const failedRecords = (
    await Promise.all(
      SYNCABLE_TABLES.map(async (tableName) => {
        const ids = await fetchFailedRecordIds(tableName, userId);
        return Promise.all(
          ids.map(async (id) => {
            const record = await fetchRecordById(tableName, id);
            return {
              tableName,
              recordId: id,
              syncStatus: (record as { syncStatus?: string } | null)?.syncStatus ?? null,
              syncError: (record as { syncError?: string | null } | null)?.syncError ?? null,
              deletedAt: (record as { deletedAt?: string | null } | null)?.deletedAt ?? null,
            };
          }),
        );
      }),
    )
  ).flat();

  return {
    queue,
    queueIssues: queue.map((item) => ({
      tableName: item.tableName,
      recordId: item.recordId,
      operation: item.operation,
      attemptCount: item.attemptCount,
      nextRetryAt: item.nextRetryAt,
      lastError: item.lastError,
      payloadSnapshot: __DEV__ ? item.payloadSnapshot : null,
    })),
    failedRecords,
    syncStateRows: migrations,
    pendingCount: queue.length,
    failedCount: queue.filter((item) => item.lastError).length,
    store: useSyncStore.getState(),
  };
}

export async function retrySyncQueue(userId: string) {
  await retryQueuedFailures(userId);

  for (const tableName of SYNCABLE_TABLES) {
    const failedIds = await fetchFailedRecordIds(tableName, userId);
    for (const id of failedIds) {
      const record = await fetchRecordById(tableName, id);
      await markRecordSyncResult(tableName, id, {
        syncStatus: "pending",
        lastSyncedAt: null,
        syncError: null,
      });
      await enqueueSync(
        tableName,
        id,
        (record as { deletedAt?: string | null } | null)?.deletedAt
          ? "delete"
          : "upsert",
        userId,
      );
    }
  }

  await refreshSyncCounts(userId);
}

async function ensureBootstrapQueue(userId: string) {
  for (const tableName of SYNCABLE_TABLES) {
    const ids = await fetchBootstrapRecordIds(tableName, userId);
    for (const id of ids) {
      const record = await fetchRecordById(tableName, id);
      const syncStatus = (record as { syncStatus?: string } | null)?.syncStatus;

      if (syncStatus !== "pending") {
        continue;
      }

      await enqueueSync(
        tableName,
        id,
        (record as { deletedAt?: string | null } | null)?.deletedAt
          ? "delete"
          : "upsert",
        userId,
      );
    }
  }
}

async function uploadPendingChanges(
  userId: string,
  options?: { includeDelayed?: boolean },
) {
  let uploaded = 0;
  let skipped = 0;
  let retryableFailures = 0;
  let permanentFailures = 0;
  let lastRetryableError: string | null = null;
  let lastPermanentError: string | null = null;
  let lastRetryableErrorKind: "network" | "offline" | "unknown" | null = null;
  let lastPermanentErrorKind: "auth" | "schema" | "unknown" | null = null;
  const items = await getDueQueueItems(
    userId,
    MAX_SYNC_BATCH_SIZE,
    options?.includeDelayed ?? false,
  );

  for (const item of items) {
    await lockQueueItem(item.id);
    let payloadSnapshot: string | null = null;

    try {
      const record = await fetchRecordById(item.tableName, item.recordId);

      if (!record) {
        await clearQueueItem(item.id);
        skipped += 1;
        continue;
      }

      const registryEntry = syncRegistry[item.tableName];
      if (!registryEntry.shouldSyncRecord(record as Record<string, unknown>)) {
        await markRecordSyncResult(item.tableName, item.recordId, {
          syncStatus: "synced",
          lastSyncedAt: nowIso(),
          syncError: null,
        });
        await clearQueueItem(item.id);
        skipped += 1;
        continue;
      }

      const remotePayload = registryEntry.toRemote(record as Record<string, unknown>);
      if (__DEV__) {
        payloadSnapshot = JSON.stringify(remotePayload);
        await updateQueueItemPayloadSnapshot(item.id, payloadSnapshot);
      } else {
        await updateQueueItemPayloadSnapshot(item.id, null);
      }
      const remoteExisting = await fetchRemoteRowById(item.tableName, item.userId, item.recordId);
      const localUpdatedAt = String((record as { updatedAt: string }).updatedAt);

      if (remoteExisting?.updated_at && remoteExisting.updated_at > localUpdatedAt) {
        await markRecordSyncResult(item.tableName, item.recordId, {
          syncStatus: "synced",
          lastSyncedAt: String(remoteExisting.updated_at),
          syncError: null,
          updatedAt: String(remoteExisting.updated_at),
        });
        await clearQueueItem(item.id);
        skipped += 1;
        continue;
      }

      const [remoteRow] = await upsertRemoteRows(item.tableName, [remotePayload]);

      await markRecordSyncResult(item.tableName, item.recordId, {
        syncStatus: "synced",
        lastSyncedAt: String(remoteRow?.updated_at ?? nowIso()),
        syncError: null,
      });
      await clearQueueItem(item.id);
      uploaded += 1;
    } catch (error) {
      const kind = classifySyncError(error);
      const message = normalizeSyncError(error, "Upload failed.");
      const isRetryable = isRetryableSyncError(kind);

      if (isRetryable) {
        await failQueueItem(item.id, item.attemptCount + 1, message);
      } else {
        await clearQueueItem(item.id);
      }

      await markRecordSyncResult(item.tableName, item.recordId, {
        syncStatus: isRetryable ? "pending" : "failed",
        syncError: message,
      });
      logSyncError("upload failed", {
        tableName: item.tableName,
        recordId: item.recordId,
        operation: item.operation,
        attemptCount: item.attemptCount + 1,
        message,
        payloadSnapshot: __DEV__ ? payloadSnapshot : null,
      });

      if (isRetryable) {
        retryableFailures += 1;
        lastRetryableError = message;
        lastRetryableErrorKind = kind === "offline" ? "offline" : "network";
      } else {
        permanentFailures += 1;
        lastPermanentError = message;
        lastPermanentErrorKind =
          kind === "auth" || kind === "schema" ? kind : "unknown";
      }
    } finally {
      await unlockQueueItem(item.id);
    }
  }

  return {
    uploaded,
    skipped,
    retryableFailures,
    permanentFailures,
    lastRetryableError,
    lastPermanentError,
    lastRetryableErrorKind,
    lastPermanentErrorKind,
  };
}

async function upsertSyncCursor(
  userId: string,
  tableName: SyncableTable,
  cursorUpdatedAt: string | null,
  cursorId: string | null,
) {
  const existing = await db.query.syncState.findFirst({
    where: and(eq(syncState.userId, userId), eq(syncState.tableName, tableName)),
  });
  const timestamp = nowIso();

  if (!existing) {
    await db.insert(syncState).values({
      id: `${userId}:${tableName}`,
      userId,
      tableName,
      cursorUpdatedAt,
      cursorId,
      lastFullSyncAt: timestamp,
      lastSuccessAt: timestamp,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    return;
  }

  await db
    .update(syncState)
    .set({
      cursorUpdatedAt,
      cursorId,
      lastFullSyncAt: timestamp,
      lastSuccessAt: timestamp,
      updatedAt: timestamp,
    })
    .where(eq(syncState.id, existing.id));
}

async function downloadRemoteChanges(
  userId: string,
  options?: { preferRemote?: boolean },
) {
  let downloaded = 0;
  let skipped = 0;
  let deferredRows: DeferredRemoteRow[] = [];

  for (const tableName of SYNCABLE_TABLES) {
    const state = await db.query.syncState.findFirst({
      where: and(eq(syncState.userId, userId), eq(syncState.tableName, tableName)),
    });
    let lastCursor: SyncCursor = {
      updatedAt: state?.cursorUpdatedAt ?? null,
      id: state?.cursorId ?? null,
    };
    let offset = 0;

    while (true) {
      const rows = await fetchRemoteRowsPage(
        tableName,
        userId,
        state?.cursorUpdatedAt ?? null,
        state?.cursorId ?? null,
        MAX_SYNC_BATCH_SIZE,
        offset,
      );

      if (!rows.length) {
        break;
      }

      for (const row of rows) {
        const updatedAt = String(row.updated_at);
        const id = String(row.id);
        const isStrictlyAfterCursor = isAfterCursor(lastCursor, updatedAt, id);

        if (!isStrictlyAfterCursor) {
          continue;
        }

        const localRecord = await fetchRecordById(tableName, id);
        const localSyncStatus = (localRecord as { syncStatus?: string } | null)?.syncStatus;
        if (!options?.preferRemote && localSyncStatus === "pending") {
          skipped += 1;
          lastCursor = advanceCursor(lastCursor, updatedAt, id);
          continue;
        }

        try {
          await syncRegistry[tableName].upsertLocal(row);
          downloaded += 1;
          lastCursor = advanceCursor(lastCursor, updatedAt, id);
        } catch (error) {
          if (isForeignKeyConstraintError(error)) {
            deferredRows.push({
              tableName,
              row: row as DeferredRemoteRow["row"],
              localSyncStatus,
            });
            continue;
          }

          throw error;
        }
      }

      if (rows.length < MAX_SYNC_BATCH_SIZE || tableName === "users") {
        break;
      }

      offset += rows.length;
    }

    await upsertSyncCursor(userId, tableName, lastCursor.updatedAt, lastCursor.id);
  }

  for (let attempt = 0; attempt < 3 && deferredRows.length > 0; attempt += 1) {
    const remaining: DeferredRemoteRow[] = [];
    let resolvedThisPass = 0;

    for (const item of deferredRows) {
      if (!options?.preferRemote && item.localSyncStatus === "pending") {
        skipped += 1;
        resolvedThisPass += 1;
        continue;
      }

      try {
        await syncRegistry[item.tableName].upsertLocal(item.row);
        downloaded += 1;
        resolvedThisPass += 1;
      } catch (error) {
        if (isForeignKeyConstraintError(error)) {
          remaining.push(item);
          continue;
        }

        throw error;
      }
    }

    if (resolvedThisPass === 0) {
      deferredRows = remaining;
      break;
    }

    deferredRows = remaining;
  }

  if (deferredRows.length > 0) {
    for (const item of deferredRows) {
      logSyncError("restore row skipped after foreign key retries", {
        tableName: item.tableName,
        recordId: String(item.row.id),
        updatedAt: String(item.row.updated_at),
      });
    }
  }

  return { downloaded, skipped };
}

export async function runSync(input?: {
  userId?: string | null;
  reason?: SyncRunReason;
  force?: boolean;
  pullFirst?: boolean;
}): Promise<SyncRunResult | null> {
  const userId = input?.userId ?? null;
  const reason = input?.reason ?? "manual";

  if (!userId) {
    return null;
  }

  if (activeRun) {
    const inFlightResult = await activeRun;

    if (!input?.force) {
      return inFlightResult;
    }
  }

  const store = useSyncStore.getState();

  if (!store.isOnline && reason !== "manual" && !input?.force) {
    await refreshSyncCounts(userId);
    return {
      uploaded: 0,
      downloaded: 0,
      skipped: 0,
      failed: 0,
      reason,
      startedAt: nowIso(),
      finishedAt: nowIso(),
      state: "offline",
      message: "Offline mode. Changes will sync automatically.",
    };
  }

  activeRun = (async () => {
    const startedAt = nowIso();
    useSyncStore.getState().setOnline(true);
    useSyncStore.getState().markSyncStarted();
    const syncStore = useSyncStore.getState();
    useSyncStore.getState().setSyncing({
      isSyncing: true,
      reason,
      uiState: syncStore.isRestoring ? "restoring" : "syncing",
    });
    try {
      if (input?.pullFirst) {
        await downloadRemoteChanges(userId, { preferRemote: true });
      }

      await ensureBootstrapQueue(userId);

      const upload = await uploadPendingChanges(userId, {
        includeDelayed: Boolean(input?.force || reason === "manual"),
      });
      const download = await downloadRemoteChanges(userId);
      const finishedAt = nowIso();
      const queueSummary = await refreshSyncCounts(userId);
      const hasRetryableBacklog = queueSummary.pendingCount > 0;
      const hasPermanentFailures = upload.permanentFailures > 0;
      const state =
        hasPermanentFailures
          ? "failed"
          : hasRetryableBacklog
            ? "retrying"
            : "idle";
      const message = hasPermanentFailures
        ? upload.lastPermanentError ?? "Some changes need manual review."
        : hasRetryableBacklog
          ? upload.lastRetryableError ?? "Some changes are waiting to retry."
          : null;
      const lastErrorKind = hasPermanentFailures
        ? upload.lastPermanentErrorKind
        : hasRetryableBacklog
          ? upload.lastRetryableErrorKind
          : null;

      const result: SyncRunResult = {
        uploaded: upload.uploaded,
        downloaded: download.downloaded,
        skipped: upload.skipped + download.skipped,
        failed: upload.retryableFailures + upload.permanentFailures,
        reason,
        startedAt,
        finishedAt,
        state,
        message,
      };

      useSyncStore.getState().setSummary({
        lastSyncedAt: finishedAt,
        lastError: result.message,
        lastErrorKind,
      });
      useSyncStore.getState().setUiState({
        uiState: result.state,
        lastError: result.message,
        lastErrorKind,
        isOnline: true,
      });
      if (reason === "manual" && !result.failed) {
        showSuccessToast({
          title: "Sync successful",
          message: "Your latest changes are now up to date.",
          dedupeKey: "sync:manual-success",
          source: "sync-engine",
        });
      }
      logSync("sync completed", result);
      return result;
    } catch (error) {
      const kind = classifySyncError(error);
      const message = normalizeSyncError(error, "Sync failed.");
      const queueSummary = await refreshSyncCounts(userId);
      const hasRetryableBacklog = queueSummary.pendingCount > 0;
      const uiState =
        kind === "offline"
          ? "offline"
          : kind === "schema"
            ? "schema_error"
            : isRetryableSyncError(kind) && hasRetryableBacklog
              ? "retrying"
              : "failed";
      const finishedAt = nowIso();

      useSyncStore.getState().setSummary({
        lastError: kind === "offline" ? null : message,
        lastErrorKind: kind,
      });
      useSyncStore.getState().setUiState({
        uiState,
        lastError: kind === "offline" ? null : message,
        lastErrorKind: kind,
        isOnline: kind === "offline" ? false : store.isOnline,
      });
      logSyncError("sync run failed", { reason, message });
      return {
        uploaded: 0,
        downloaded: 0,
        skipped: 0,
        failed: 1,
        reason,
        startedAt,
        finishedAt,
        state: uiState,
        message:
          kind === "offline"
            ? "Offline mode. Changes will sync automatically."
            : message,
      } satisfies SyncRunResult;
    } finally {
      useSyncStore.getState().markSyncCompleted();
      useSyncStore.getState().setSyncing({ isSyncing: false, reason });
      activeRun = null;
    }
  })();

  return activeRun;
}
