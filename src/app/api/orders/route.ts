import crypto from "node:crypto";
import type { NextRequest } from "next/server";
import { ensureSchema, rateLimit, sql } from "@/lib/db";
import { clientIp, json, readJson, sameOrigin } from "@/lib/http";
import { getItem } from "@/lib/menu";
import { orderSchema, type OrderLine } from "@/lib/schemas";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const makeCode = () =>
  "KV-" + Array.from(crypto.randomBytes(5), (b) => ALPHABET[b % ALPHABET.length]).join("");

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return json({ error: "Forbidden" }, 403);

  let body: unknown;
  try {
    body = await readJson(req);
  } catch {
    return json({ error: "Invalid request" }, 400);
  }

  const parsed = orderSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return json({ error: issue?.message ?? "Invalid order", field: issue?.path[0] }, 422);
  }
  const o = parsed.data;
  if (o.website) return json({ error: "Invalid order" }, 400);

  // Prices always come from the server-side menu, never from the client.
  const merged = new Map<string, number>();
  for (const line of o.items) merged.set(line.id, (merged.get(line.id) ?? 0) + line.qty);
  const lines: OrderLine[] = [];
  for (const [id, qty] of merged) {
    const item = getItem(id);
    if (!item) return json({ error: "An item in your cart is no longer available" }, 422);
    if (qty > 25) return json({ error: `Maximum 25 × ${item.name} per order` }, 422);
    lines.push({ id, name: item.name, price: item.price, qty });
  }
  const total = lines.reduce((s, l) => s + l.price * l.qty, 0);

  const ip = clientIp(req);
  // Per-IP cap is generous because diners on the restaurant Wi-Fi / mobile CGNAT share an IP.
  if (!(await rateLimit(`order:phone:${o.phone}`, 5, 600)) || !(await rateLimit(`order:ip:${ip}`, 30, 600))) {
    return json({ error: "Too many orders in a short time. Please wait a few minutes or call us." }, 429);
  }

  await ensureSchema();
  const id = crypto.randomUUID();
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = makeCode();
    try {
      await sql`
        INSERT INTO orders (id, code, customer_name, phone, order_type, table_no, address, notes, items, total)
        VALUES (${id}, ${code}, ${o.name}, ${o.phone}, ${o.type},
                ${o.type === "dine-in" ? o.table || null : null},
                ${o.type === "delivery" ? o.address || null : null},
                ${o.notes || null}, ${JSON.stringify(lines)}::jsonb, ${total})`;
      return json({ id, code, total }, 201);
    } catch (e) {
      if (!(e instanceof Error && /orders_code_key|duplicate key/.test(e.message))) {
        console.error("order insert failed", e instanceof Error ? e.message : e);
        return json({ error: "Could not place order. Please try again." }, 500);
      }
    }
  }
  return json({ error: "Could not place order. Please try again." }, 500);
}
