import type { NextRequest } from "next/server";
import { z } from "zod";
import { SESSION_COOKIE, createSessionToken, sessionCookieOptions, verifyPassword } from "@/lib/auth";
import { clearRate, rateLimit } from "@/lib/db";
import { clientIp, json, readJson, sameOrigin } from "@/lib/http";

const schema = z.object({ password: z.string().min(1).max(200) });

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return json({ error: "Forbidden" }, 403);
  const ip = clientIp(req);
  const bucket = `login:${ip}`;

  // 5 attempts per 15 minutes per IP, plus a global cap against distributed guessing.
  if (!(await rateLimit(bucket, 5, 900)) || !(await rateLimit("login:global", 100, 900))) {
    return json({ error: "Too many attempts. Try again in 15 minutes." }, 429);
  }

  let body: unknown;
  try {
    body = await readJson(req, 1024);
  } catch {
    return json({ error: "Invalid request" }, 400);
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success || !verifyPassword(parsed.data.password)) {
    await new Promise((r) => setTimeout(r, 400 + Math.random() * 300));
    return json({ error: "Incorrect password" }, 401);
  }

  await clearRate(bucket);
  const res = json({ ok: true });
  res.cookies.set(SESSION_COOKIE, createSessionToken(), sessionCookieOptions);
  return res;
}
