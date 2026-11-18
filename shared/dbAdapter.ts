import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Drop-in replacement for Blink's `blink.db.<table>` API, backed by Supabase.
 * Supports exactly what AImHighAI uses: equality `where`, single-field
 * `orderBy`, `limit`, plus create / update / delete / count.
 * Every Supabase error is thrown — never swallowed.
 */
type Where = Record<string, string | number | boolean | null | undefined>;
type Direction = "asc" | "desc";

export interface ListOptions {
  where?: Where;
  orderBy?: Record<string, Direction>;
  limit?: number;
}

function applyWhere<Q extends { eq: (c: string, v: unknown) => Q; is: (c: string, v: null) => Q }>(q: Q, where?: Where): Q {
  if (!where) return q;
  for (const [col, val] of Object.entries(where)) {
    if (val === undefined) continue;
    q = val === null ? q.is(col, null) : q.eq(col, val);
  }
  return q;
}

export function makeTable(sb: SupabaseClient, table: string) {
  return {
    async list<T = any>(opts: ListOptions = {}): Promise<T[]> {
      let q: any = sb.from(table).select("*");
      q = applyWhere(q, opts.where);
      if (opts.orderBy) {
        for (const [col, dir] of Object.entries(opts.orderBy)) q = q.order(col, { ascending: dir === "asc" });
      }
      if (opts.limit) q = q.limit(opts.limit);
      const { data, error } = await q;
      if (error) throw new Error(`db.${table}.list failed: ${error.message}`);
      return (data ?? []) as T[];
    },

    async count(opts: { where?: Where } = {}): Promise<number> {
      let q: any = sb.from(table).select("*", { count: "exact", head: true });
      q = applyWhere(q, opts.where);
      const { count, error } = await q;
      if (error) throw new Error(`db.${table}.count failed: ${error.message}`);
      return count ?? 0;
    },

    async create<T = any>(row: Record<string, unknown>): Promise<T> {
      const { data, error } = await sb.from(table).insert(row).select("*").single();
      if (error) throw new Error(`db.${table}.create failed: ${error.message}`);
      return data as T;
    },

    async update<T = any>(id: string, patch: Record<string, unknown>): Promise<T> {
      const { data, error } = await sb.from(table).update(patch).eq("id", id).select("*").single();
      if (error) throw new Error(`db.${table}.update failed: ${error.message}`);
      return data as T;
    },

    async delete(id: string): Promise<void> {
      const { error } = await sb.from(table).delete().eq("id", id);
      if (error) throw new Error(`db.${table}.delete failed: ${error.message}`);
    },
  };
}

const TABLES = [
  "leads", "leadScores", "generatedAssets", "outreachSequences", "outreachAnalytics",
  "invoices", "invoiceReminders", "agentRuns", "affiliates", "affiliateReferrals", "subscribers",
] as const;

export type TableName = (typeof TABLES)[number];
export type Db = Record<TableName, ReturnType<typeof makeTable>>;

export function makeDb(sb: SupabaseClient): Db {
  return Object.fromEntries(TABLES.map((t) => [t, makeTable(sb, t)])) as Db;
}
