import { and, asc, eq, isNotNull, isNull, lte, or } from "drizzle-orm";

import { db } from "@/src/db/client";
import { syncQueue } from "@/src/db/schema";
import { createId } from "@/src/db/utils/ids";
import { nowIso } from "@/src/db/utils/time";
import { MAX_SYNC_BATCH_SIZE } from "./constants";
import { nextRetryAt } from "./helpers";
import type { SyncOperation, SyncableTable } from "./types";

export async function enqueueSync(
  table: SyncableTable,
  recordId: string,
  operation: SyncOperation,
  userId: string,
  payloadSnapshot?: string | null,
) {
  const timestamp = nowIso();
  const existing = await db.query.syncQueue.findFirst({
    where: and(
      eq(syncQueue.userId, userId),
      eq(syncQueue.tableName, table),
      eq(syncQueue.recordId, recordId),
    ),
  });

  if (!existing) {
    await db.insert(syncQueue).values({
      id: createId(),
      userId,
      tableName: table,
      recordId,
      operation,
      payloadSnapshot: payloadSnapshot ?? null,
      attemptCount: 0,
      nextRetryAt: null,
      lockedAt: null,
      lastError: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    return;
  }

  const nextOperation =
    operation === "delete" || existing.operation === "delete" ? "delete" : "upsert";

  await db
    .update(syncQueue)
    .set({
      operation: nextOperation,
      payloadSnapshot: payloadSnapshot ?? existing.payloadSnapshot,
      attemptCount: 0,
      nextRetryAt: null,
      lockedAt: null,
      lastError: null,
      updatedAt: timestamp,
    })
    .where(eq(syncQueue.id, existing.id));
}

export async function getDueQueueItems(
  userId: string,
  limit = MAX_SYNC_BATCH_SIZE,
  includeDelayed = false,
) {
  const timestamp = nowIso();
  if (includeDelayed) {
    return db.query.syncQueue.findMany({
      where: and(eq(syncQueue.userId, userId), isNull(syncQueue.lockedAt)),
      orderBy: [asc(syncQueue.createdAt)],
      limit,
    });
  }

  return db.query.syncQueue.findMany({
    where: and(
      eq(syncQueue.userId, userId),
      or(isNull(syncQueue.nextRetryAt), lte(syncQueue.nextRetryAt, timestamp)),
      isNull(syncQueue.lockedAt),
    ),
    orderBy: [asc(syncQueue.createdAt)],
    limit,
  });
}

export async function lockQueueItem(id: string) {
  await db.update(syncQueue).set({ lockedAt: nowIso(), updatedAt: nowIso() }).where(eq(syncQueue.id, id));
}

export async function clearQueueItem(id: string) {
  await db.delete(syncQueue).where(eq(syncQueue.id, id));
}

export async function failQueueItem(id: string, attemptCount: number, lastError: string) {
  await db
    .update(syncQueue)
    .set({
      attemptCount,
      nextRetryAt: nextRetryAt(attemptCount),
      lockedAt: null,
      lastError,
      updatedAt: nowIso(),
    })
    .where(eq(syncQueue.id, id));
}

export async function unlockQueueItem(id: string) {
  await db.update(syncQueue).set({ lockedAt: null, updatedAt: nowIso() }).where(eq(syncQueue.id, id));
}

export async function countSyncQueue(userId: string) {
  const rows = await db.query.syncQueue.findMany({
    where: eq(syncQueue.userId, userId),
  });

  return rows.length;
}

export async function getQueueSnapshot(userId: string) {
  return db.query.syncQueue.findMany({
    where: eq(syncQueue.userId, userId),
    orderBy: [asc(syncQueue.createdAt)],
  });
}

export async function retryQueuedFailures(userId: string) {
  await db
    .update(syncQueue)
    .set({
      nextRetryAt: null,
      lockedAt: null,
      updatedAt: nowIso(),
    })
    .where(eq(syncQueue.userId, userId));
}

export async function clearFailedQueue(userId: string) {
  const rows = await db.query.syncQueue.findMany({
    where: and(eq(syncQueue.userId, userId), isNotNull(syncQueue.lastError)),
  });

  for (const row of rows) {
    await clearQueueItem(row.id);
  }
}
