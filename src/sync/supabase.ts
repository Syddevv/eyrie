import { assertSupabaseConfigured, supabase } from "@/lib/supabase";

import type { SyncableTable } from "./types";

const SYNC_REQUEST_TIMEOUT_MS = 8000;

export type RemoteSyncRow = Record<string, unknown> & {
  id: string;
  updated_at: string;
  deleted_at?: string | null;
};

function withSyncTimeout<T>(request: PromiseLike<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("Sync request timed out."));
    }, SYNC_REQUEST_TIMEOUT_MS);

    Promise.resolve(request)
      .then(resolve)
      .catch(reject)
      .finally(() => clearTimeout(timeout));
  });
}

export async function fetchRemoteRowById(
  table: SyncableTable,
  userId: string,
  id: string,
) {
  assertSupabaseConfigured("Cloud sync");
  const client = supabase;
  if (!client) {
    throw new Error("Cloud sync is not configured.");
  }

  if (table === "users") {
    const { data, error } = await withSyncTimeout(
      client.from("users").select("*").eq("id", id).maybeSingle(),
    );
    if (error) {
      throw error;
    }
    return data as RemoteSyncRow | null;
  }

  const { data, error } = await withSyncTimeout(
    client
      .from(table)
      .select("*")
      .eq("user_id", userId)
      .eq("id", id)
      .maybeSingle(),
  );

  if (error) {
    throw error;
  }

  return data as RemoteSyncRow | null;
}

export async function upsertRemoteRows(table: SyncableTable, rows: Record<string, unknown>[]) {
  assertSupabaseConfigured("Cloud sync");
  const client = supabase;
  if (!client) {
    throw new Error("Cloud sync is not configured.");
  }

  if (!rows.length) {
    return [];
  }

  const { data, error } = await withSyncTimeout(
    client.from(table).upsert(rows, { onConflict: "id" }).select("*"),
  );

  if (error) {
    throw error;
  }

  return (data ?? []) as RemoteSyncRow[];
}

export async function fetchRemoteRowsPage(
  table: SyncableTable,
  userId: string,
  cursorUpdatedAt: string | null,
  limit: number,
) {
  assertSupabaseConfigured("Cloud sync");
  const client = supabase;
  if (!client) {
    throw new Error("Cloud sync is not configured.");
  }

  if (table === "users") {
    const query = client.from("users").select("*").eq("id", userId).limit(1);
    const { data, error } = await withSyncTimeout(
      cursorUpdatedAt ? query.gte("updated_at", cursorUpdatedAt) : query,
    );

    if (error) {
      throw error;
    }

    return (data ?? []) as RemoteSyncRow[];
  }

  let query = client
    .from(table)
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: true })
    .order("id", { ascending: true })
    .limit(limit);

  if (cursorUpdatedAt) {
    query = query.gte("updated_at", cursorUpdatedAt);
  }

  const { data, error } = await withSyncTimeout(query);
  if (error) {
    throw error;
  }

  return (data ?? []) as RemoteSyncRow[];
}
