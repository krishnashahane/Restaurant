import "server-only";
import { neon } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");

export const sql = neon(url);

let ready: Promise<void> | null = null;

/** Idempotent schema setup, run once per server instance. */
export function ensureSchema(): Promise<void> {
  ready ??= (async () => {
    await sql`
      CREATE TABLE IF NOT EXISTS orders (
        id            uuid PRIMARY KEY,
        code          text UNIQUE NOT NULL,
        created_at    timestamptz NOT NULL DEFAULT now(),
        updated_at    timestamptz NOT NULL DEFAULT now(),
        customer_name text NOT NULL,
        phone         text NOT NULL,
        order_type    text NOT NULL CHECK (order_type IN ('dine-in','takeaway','delivery')),
        table_no      text,
        address       text,
        notes         text,
        items         jsonb NOT NULL,
        total         integer NOT NULL CHECK (total >= 0),
        status        text NOT NULL DEFAULT 'new'
                      CHECK (status IN ('new','preparing','ready','completed','cancelled'))
      )`;
    await sql`CREATE INDEX IF NOT EXISTS orders_created_idx ON orders (created_at DESC)`;
    await sql`
      CREATE TABLE IF NOT EXISTS rate_events (
        bucket text NOT NULL,
        at     timestamptz NOT NULL DEFAULT now()
      )`;
    await sql`CREATE INDEX IF NOT EXISTS rate_events_idx ON rate_events (bucket, at)`;
  })().catch((e) => {
    ready = null;
    throw e;
  });
  return ready;
}

/**
 * Sliding-window rate limit backed by Postgres (works across serverless instances).
 * Returns true when the request is allowed (and records it).
 */
export async function rateLimit(bucket: string, max: number, windowSec: number): Promise<boolean> {
  await ensureSchema();
  const rows = (await sql`
    SELECT count(*)::int AS n FROM rate_events
    WHERE bucket = ${bucket} AND at > now() - make_interval(secs => ${windowSec})`) as { n: number }[];
  if (rows[0].n >= max) return false;
  await sql`INSERT INTO rate_events (bucket) VALUES (${bucket})`;
  // Opportunistic cleanup of old events.
  if (Math.random() < 0.05) await sql`DELETE FROM rate_events WHERE at < now() - interval '1 day'`;
  return true;
}

export async function clearRate(bucket: string) {
  await sql`DELETE FROM rate_events WHERE bucket = ${bucket}`;
}
