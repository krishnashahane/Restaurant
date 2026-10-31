import type { NextRequest } from "next/server";
import { isAdmin } from "@/lib/auth";
import { ensureSchema, sql } from "@/lib/db";
import { json, readJson, sameOrigin } from "@/lib/http";
import { statusSchema } from "@/lib/schemas";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function PATCH(req: NextRequest, ctx: RouteContext<"/api/admin/orders/[id]">) {
  if (!sameOrigin(req)) return json({ error: "Forbidden" }, 403);
  if (!(await isAdmin())) return json({ error: "Unauthorized" }, 401);
  const { id } = await ctx.params;
  if (!UUID.test(id)) return json({ error: "Not found" }, 404);
  let body: unknown;
  try {
    body = await readJson(req, 512);
  } catch {
    return json({ error: "Invalid request" }, 400);
  }
  const parsed = statusSchema.safeParse(body);
  if (!parsed.success) return json({ error: "Invalid status" }, 422);
  await ensureSchema();
  const rows = await sql`UPDATE orders SET status = ${parsed.data.status}, updated_at = now() WHERE id = ${id} RETURNING id, status`;
  if (!rows.length) return json({ error: "Not found" }, 404);
  return json(rows[0]);
}
