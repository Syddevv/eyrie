import { and, count, eq, isNotNull, or } from "drizzle-orm";

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
  fetchRecordById,
  markRecordSyncResult,
} from "./helpers";
import { logSync, logSyncError } from "./logger";
import {
  clearQueueItem,
  countSyncQueue,
  enqueueSync,
  failQueueItem,
  getQueueSnapshot,
  getDueQueueItems,
  lockQueueItem,
  retryQueuedFailures,
  unlockQueueItem,
} from "./queue";
import { syncRegistry } from "./registry";
import { useSyncStore } from "./store";
import { fetchRemoteRowById, fetchRemoteRowsPage, upsertRemoteRows } from "./supabase";
import type { SyncRunReason, SyncRunResult, SyncableTable } from "./types";
import { showSuccessToast } from "@/store/useToastStore";
import { isOfflineGuestUserId } from "@/src/lib/offline-auth";

let activeRun: Promise<SyncRunResult | null> | null = null;

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

  useSyncStore.getState().setSummary({
    pendingCount: Number(pendingRows[0]?.value ?? 0),
    failedCount: Number(failedRows[0]?.value ?? 0),
  });
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

  return {
    queue,
    syncStateRows: migrations,
    pendingCount: queue.length,
    failedCount: queue.filter((item) => item.lastError).length,
    store: useSyncStore.getState(),
  };
}

export async function retrySyncQueue(userId: string) {
  await retryQueuedFailures(userId);
  await refreshSyncCounts(userId);
}

async function ensureBootstrapQueue(userId: string) {
  for (const tableName of SYNCABLE_TABLES) {
    const existingState = await db.query.syncState.findFirst({
      where: and(eq(syncState.userId, userId), eq(syncState.tableName, tableName)),
    });

    if (existingState) {
      continue;
    }

    const ids = await fetchBootstrapRecordIds(tableName, userId);
    for (const id of ids) {
      await enqueueSync(tableName, id, "upsert", userId);
    }
  }
}

async function uploadPendingChanges(userId: string) {
  let uploaded = 0;
  let skipped = 0;
  let failed = 0;
  const items = await getDueQueueItems(userId, MAX_SYNC_BATCH_SIZE);

  for (const item of items) {
    await lockQueueItem(item.id);

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

      const remoteExisting = await fetchRemoteRowById(item.tableName, item.userId, item.recordId);
      const localUpdatedAt = String((record as { updatedAt: string }).updatedAt);

      if (remoteExisting?.updated_at && remoteExisting.updated_at > localUpdatedAt) {
        const message = "Remote record is newer than the local pending change.";
        await markRecordSyncResult(item.tableName, item.recordId, {
          syncStatus: "failed",
          syncError: message,
        });
        await failQueueItem(item.id, item.attemptCount + 1, message);
        failed += 1;
        continue;
      }

      const [remoteRow] = await upsertRemoteRows(item.tableName, [
        registryEntry.toRemote(record as Record<string, unknown>),
      ]);

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
      await failQueueItem(item.id, item.attemptCount + 1, message);
      await markRecordSyncResult(item.tableName, item.recordId, {
        syncStatus: isRetryableSyncError(kind) ? "pending" : "failed",
        syncError: message,
      });
      logSyncError("upload failed", {
        tableName: item.tableName,
        recordId: item.recordId,
        message,
      });
      failed += 1;
    } finally {
      await unlockQueueItem(item.id);
    }
  }

  return { uploaded, skipped, failed };
}

async function upsertSyncCursor(userId: string, tableName: SyncableTable, cursorUpdatedAt: string, cursorId: string) {
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

async function downloadRemoteChanges(userId: string) {
  let downloaded = 0;
  let skipped = 0;

  for (const tableName of SYNCABLE_TABLES) {
    const state = await db.query.syncState.findFirst({
      where: and(eq(syncState.userId, userId), eq(syncState.tableName, tableName)),
    });
    const rows = await fetchRemoteRowsPage(
      tableName,
      userId,
      state?.cursorUpdatedAt ?? null,
      MAX_SYNC_BATCH_SIZE,
    );

    let lastCursor = {
      updatedAt: state?.cursorUpdatedAt ?? null,
      id: state?.cursorId ?? null,
    };

    for (const row of rows) {
      const updatedAt = String(row.updated_at);
      const id = String(row.id);
      const isStrictlyAfterCursor =
        !lastCursor.updatedAt ||
        updatedAt > lastCursor.updatedAt ||
        (updatedAt === lastCursor.updatedAt && (!lastCursor.id || id > lastCursor.id));

      if (!isStrictlyAfterCursor) {
        continue;
      }

      const localRecord = await fetchRecordById(tableName, id);
      const localSyncStatus = (localRecord as { syncStatus?: string } | null)?.syncStatus;
      if (localSyncStatus === "pending" || localSyncStatus === "failed") {
        skipped += 1;
        lastCursor = { updatedAt, id };
        continue;
      }

      await syncRegistry[tableName].upsertLocal(row);
      downloaded += 1;
      lastCursor = { updatedAt, id };
    }

    if (lastCursor.updatedAt && lastCursor.id) {
      await upsertSyncCursor(userId, tableName, lastCursor.updatedAt, lastCursor.id);
    }
  }

  return { downloaded, skipped };
}

export async function runSync(input?: {
  userId?: string | null;
  reason?: SyncRunReason;
  force?: boolean;
}): Promise<SyncRunResult | null> {
  const userId = input?.userId ?? null;
  const reason = input?.reason ?? "manual";

  if (!userId) {
    return null;
  }

  if (isOfflineGuestUserId(userId)) {
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
      message: "Offline guest data will sync after you sign in.",
    };
  }

  const store = useSyncStore.getState();
  if (activeRun && !input?.force) {
    return activeRun;
  }

  if (!store.isOnline && reason !== "manual") {
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
    await ensureBootstrapQueue(userId);

    try {
      const upload = await uploadPendingChanges(userId);
      const download = await downloadRemoteChanges(userId);
      const finishedAt = nowIso();

      const result: SyncRunResult = {
        uploaded: upload.uploaded,
        downloaded: download.downloaded,
        skipped: upload.skipped + download.skipped,
        failed: upload.failed,
        reason,
        startedAt,
        finishedAt,
        state: upload.failed ? "retrying" : "idle",
        message: upload.failed
          ? "Some changes are waiting to retry."
          : null,
      };

      await refreshSyncCounts(userId);
      useSyncStore.getState().setSummary({
        lastSyncedAt: finishedAt,
        lastError: result.message,
        lastErrorKind: result.failed ? "network" : null,
      });
      useSyncStore.getState().setUiState({
        uiState: result.state,
        lastError: result.message,
        lastErrorKind: result.failed ? "network" : null,
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
      const uiState =
        kind === "offline"
          ? "offline"
          : kind === "schema"
            ? "schema_error"
            : isRetryableSyncError(kind)
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
