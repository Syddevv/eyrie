import { assertSupabaseConfigured, supabase } from "@/lib/supabase";

import type { SyncableTable } from "./types";

export type RemoteSyncRow = Record<string, unknown> & {
  id: string;
  updated_at: string;
  deleted_at?: string | null;
};

function isMissingUserStreakColumnError(table: SyncableTable, error: unknown) {
  if (table !== "users") {
    return false;
  }

  const message =
    typeof error === "object" && error && "message" in error
      ? String((error as { message?: unknown }).message ?? "")
      : String(error ?? "");

  return (
    message.includes("current_streak") ||
    message.includes("last_active_date") ||
    message.includes("longest_streak")
  );
}

function toLegacyUserRows(rows: Record<string, unknown>[]) {
  return rows.map((row) => {
    const {
      current_streak,
      last_active_date,
      longest_streak,
      ...legacyRow
    } = row;

    void current_streak;
    void last_active_date;
    void longest_streak;

    return legacyRow;
  });
}

export async function fetchRemoteRowById(
  table: SyncableTable,
  userId: string,
  id: string,
) {
  assertSupabaseConfigured("Cloud sync");

  if (table === "users") {
    const { data, error } = await supabase.from("users").select("*").eq("id", id).maybeSingle();
    if (error) {
      throw error;
    }
    return data as RemoteSyncRow | null;
  }

  const { data, error } = await supabase
    .from(table)
    .select("*")
    .eq("user_id", userId)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as RemoteSyncRow | null;
}

export async function upsertRemoteRows(table: SyncableTable, rows: Record<string, unknown>[]) {
  assertSupabaseConfigured("Cloud sync");

  if (!rows.length) {
    return [];
  }

  const attemptUpsert = async (payload: Record<string, unknown>[]) =>
    supabase.from(table).upsert(payload, { onConflict: "id" }).select("*");

  let { data, error } = await attemptUpsert(rows);

  if (error && isMissingUserStreakColumnError(table, error)) {
    ({ data, error } = await attemptUpsert(toLegacyUserRows(rows)));
  }

  if (error) {
    throw error;
  }

  return (data ?? []) as RemoteSyncRow[];
}

export async function fetchRemoteRowsPage(
  table: SyncableTable,
  userId: string,
  cursorUpdatedAt: string | null,
  _cursorId: string | null,
  limit: number,
  offset = 0,
) {
  assertSupabaseConfigured("Cloud sync");

  if (table === "users") {
    const query = supabase.from("users").select("*").eq("id", userId).limit(1);
    const { data, error } = cursorUpdatedAt
      ? await query.gte("updated_at", cursorUpdatedAt)
      : await query;

    if (error) {
      throw error;
    }

    return (data ?? []) as RemoteSyncRow[];
  }

  let query = supabase
    .from(table)
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: true })
    .order("id", { ascending: true })
    .range(offset, offset + limit - 1);

  if (cursorUpdatedAt) {
    query = query.gte("updated_at", cursorUpdatedAt);
  }

  const { data, error } = await query;
  if (error) {
    throw error;
  }

  return (data ?? []) as RemoteSyncRow[];
}
