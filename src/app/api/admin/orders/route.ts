import type { NextRequest } from "next/server";
import { isAdmin } from "@/lib/auth";
import { ensureSchema, sql } from "@/lib/db";
import { json } from "@/lib/http";

export async function GET(req: NextRequest) {
  if (!(await isAdmin())) return json({ error: "Unauthorized" }, 401);
  const days = Math.min(Math.max(Number(req.nextUrl.searchParams.get("days")) || 2, 1), 90);
  await ensureSchema();
  const orders = await sql`
    SELECT id, code, created_at, customer_name, phone, order_type, table_no, address, notes, items, total, status
    FROM orders WHERE created_at > now() - make_interval(days => ${days})
    ORDER BY created_at DESC LIMIT 500`;
  return json({ orders });
}
