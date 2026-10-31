import type { NextRequest } from "next/server";
import { ensureSchema, sql } from "@/lib/db";
import { json } from "@/lib/http";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Public order status. The unguessable UUID acts as the capability; no PII is returned. */
export async function GET(_req: NextRequest, ctx: RouteContext<"/api/orders/[id]">) {
  const { id } = await ctx.params;
  if (!UUID.test(id)) return json({ error: "Not found" }, 404);
  await ensureSchema();
  const rows = await sql`SELECT code, status, total, items, order_type, created_at FROM orders WHERE id = ${id}`;
  if (!rows.length) return json({ error: "Not found" }, 404);
  return json(rows[0]);
}
