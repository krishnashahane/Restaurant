# Krishna Veg — Security Audit

**Scope:** https://krishnaveg.vercel.app — public menu and ordering, order tracking, `/admin` dashboard, all `/api/*` routes, dependencies and deployment config.
**Date:** 31 Oct 2026 · **Stack:** Next.js 16.4 (App Router) on Vercel (sin1), Neon Postgres.

## Summary

| Area | Result |
|---|---|
| Authentication (admin) | ✅ Hardened |
| Authorization (admin APIs) | ✅ Every admin route checks the session server-side |
| Brute-force protection | ✅ 5 tries per 15 min per IP, plus a global cap |
| CSRF | ✅ SameSite=Strict cookie + strict Origin check on every state-changing request |
| XSS | ✅ React escaping + per-request nonce CSP with `strict-dynamic`; no `dangerouslySetInnerHTML` |
| SQL injection | ✅ Parameterised queries only (Neon tagged templates) |
| Price tampering | ✅ The server ignores client prices and recomputes from the menu |
| Input validation | ✅ zod schemas, length caps, control-character stripping, 16 KB body cap |
| Order spam / abuse | ✅ Rate limits per phone and per IP, honeypot field |
| Secrets | ✅ Only in encrypted Vercel env vars; `.env*` gitignored; nothing secret in the client bundle |
| Transport & headers | ✅ HSTS (preload), CSP, X-Frame-Options DENY, nosniff, COOP, CORP, Referrer-Policy, Permissions-Policy |
| Privacy / indexing | ✅ `/admin`, `/api`, `/order` are noindex and disallowed in robots; admin and API responses are `no-store` |
| Dependencies | ✅ `npm audit --omit=dev` → 0 vulnerabilities (1 moderate in dev-only ESLint tooling, never shipped) |

## Controls in detail

### Admin authentication
- The password is **never stored in code**. Only a scrypt hash (N=32768, r=8, p=1, 16-byte random salt, 64-byte key) is stored, in the `ADMIN_PASSWORD_HASH` env var, and compared with `crypto.timingSafeEqual`.
- On success the server issues an HMAC-SHA256 signed session token (secret: 48 random bytes in `SESSION_SECRET`) with an 8-hour expiry.
- Cookie: `__Host-kv_admin`; `HttpOnly`, `Secure`, `SameSite=Strict`, `Path=/`, no Domain. The `__Host-` prefix stops subdomain cookie injection.
- Failed logins get a randomised 400–700 ms delay, plus rate limiting backed by Postgres, so it holds across serverless instances.
- Verified: forged or tampered cookie → 401; no cookie → 401; 6th wrong attempt → 429.

### Order API (`POST /api/orders`)
- Origin must match the host (CSRF), the content type must be JSON, and the body is capped at 16 KB.
- zod validation: name 2–60 characters, Indian mobile `^[6-9]\d{9}$`, order type enum, table/address required by type, max 60 lines, qty 1–25.
- Item IDs are looked up in the server-side menu. Unknown IDs are rejected, and **price and total are computed on the server**.
- Rate limits: 5 orders per phone and 30 per IP every 10 minutes. The IP limit is generous because diners on shared Wi-Fi share one IP.
- Order IDs are random UUIDv4s. The public status endpoint returns **no personal data** (no name, phone or address).

### Admin API
- `GET /api/admin/orders` and `PATCH /api/admin/orders/[id]` check the session on every call. PATCH also checks Origin, validates the UUID and only accepts a status from the allowed enum.

### Content Security Policy (via `src/proxy.ts`)
```
default-src 'self'; script-src 'self' 'nonce-<random per request>' 'strict-dynamic';
style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; font-src 'self';
connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self';
frame-ancestors 'none'; upgrade-insecure-requests
```
Fonts and images are self-hosted, so there are no third-party origins and no tracking scripts.

## Tests run (all passed)
- Valid order → 201, with the total computed on the server.
- Client-supplied `price: 1` → ignored; the correct menu price is charged.
- Missing or foreign `Origin` → 403.
- Unknown item ID → 422. Negative quantity → 422.
- SQL payload `x'); DROP TABLE orders;--` in the name field → stored as plain text and rendered escaped; the table is intact.
- Admin endpoints without a session → 401. Forged token → 401.
- Brute force → locked after 5 attempts.
- CSP nonce present in the HTML, with zero CSP violations in the browser console.

## Residual risks and recommendations
1. **The password is shared and fixed.** Rotate it periodically. To change it, generate a new scrypt hash, update `ADMIN_PASSWORD_HASH` in Vercel and redeploy. Rotating `SESSION_SECRET` logs everyone out.
2. **Orders are unverified (no OTP or payment).** Someone could place fake orders with a made-up phone number. Rate limits keep this small. Call to confirm any large delivery order before cooking.
3. `style-src 'unsafe-inline'` is kept for React inline styles. The impact is low because script execution stays nonce-locked.
4. **Customer data (name, phone, address) is personal data** under India's DPDP Act. The admin view only fetches the last 1–90 days. Consider purging orders older than 90 days.
5. **Menu photos and prices were taken from the restaurant's Zomato listing.** Make sure you have the rights to use the photos.
