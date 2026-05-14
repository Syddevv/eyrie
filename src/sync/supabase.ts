import { supabase } from "@/lib/supabase";

import type { SyncableTable } from "./types";

export type RemoteSyncRow = Record<string, unknown> & {
  id: string;
  updated_at: string;
  deleted_at?: string | null;
};

export async function fetchRemoteRowById(
  table: SyncableTable,
  userId: string,
  id: string,
) {
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
  if (!rows.length) {
    return [];
  }

  const { data, error } = await supabase
    .from(table)
    .upsert(rows, { onConflict: "id" })
    .select("*");

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
    .limit(limit);

  if (cursorUpdatedAt) {
    query = query.gte("updated_at", cursorUpdatedAt);
  }

  const { data, error } = await query;
  if (error) {
    throw error;
  }

  return (data ?? []) as RemoteSyncRow[];
}
