# Krishna Veg — Online Menu & Ordering

Pure vegetarian restaurant · 79, Bapdev Chowk, Kiwale, Dehu Road, Pune

| | |
|---|---|
| **Live site** | https://krishnaveg.vercel.app |
| **Admin** | https://krishnaveg.vercel.app/admin |
| **Hours** | 8:00 AM – 12:00 midnight |
| **Phone** | +91 95528 66699 · +91 95613 07935 |

---

## 1. QR Code

<p align="center">
  <img src="public/qr.png" alt="QR code for https://krishnaveg.vercel.app" width="260">
  <br>
  <b>Scan to view the menu and order</b>
  <br>
  <a href="https://krishnaveg.vercel.app">krishnaveg.vercel.app</a>
</p>

| File | Use |
|---|---|
| [`public/qr.png`](public/qr.png) | 1024 × 1024 PNG for printing and sharing |
| [`public/qr.svg`](public/qr.svg) | Vector file that scales to any size (print shops) |

Print at least **3 × 3 cm** and keep the white border. To regenerate it, run `node scripts/qr.mjs`.

---

## 2. Features

### Customers
- 190 dishes in 16 categories, with prices and 102 dish photos
- Search, a Jain filter and category navigation
- Cart, then order for **Dine-in** (table number), **Takeaway** or **Delivery**
- Live order tracking at `/order/<id>`
- Payment at the counter or on delivery

### Admin (`/admin`)
- Every order: customer name, phone, table or address, items, notes and total
- Refreshes every 8 seconds and plays a sound when a new order arrives
- Status flow: New → Preparing → Ready → Completed / Cancelled
- Today's orders, revenue and top-selling items
- QR code download (PNG / SVG)

---

## 3. Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS 4 |
| Database | Neon Postgres |
| Validation | Zod |
| Hosting | Vercel (region `sin1`) |

---

## 4. Project Structure

```
src/
├── app/
│   ├── page.tsx              # Menu + ordering
│   ├── order/[id]/           # Order tracking
│   ├── admin/                # Admin dashboard
│   └── api/                  # Order and admin APIs
├── components/               # Menu, AdminDashboard, AdminLogin, OrderStatus
├── data/menu.json            # Menu: names, prices, categories, images
├── lib/                      # auth, db, schemas, menu helpers
└── proxy.ts                  # Content Security Policy (per-request nonce)
public/
├── menu/                     # Dish photos (WebP)
├── qr.png
└── qr.svg
scripts/
├── qr.mjs                    # QR generator
└── images.mjs                # Photo optimiser
```

---

## 5. Setup

```bash
npm install
vercel env pull .env.local    # DATABASE_URL, ADMIN_PASSWORD_HASH, SESSION_SECRET
npm run dev                   # http://localhost:3000
```

### Deploy
```bash
vercel deploy --prod
```

---

## 6. Maintenance

### Edit the menu
Edit `src/data/menu.json` (name, price, category, image), then redeploy.

### Change the admin password
```bash
node -e 'const c=require("crypto"),s=c.randomBytes(16),h=c.scryptSync(process.argv[1],s,64,{N:32768,r:8,p:1,maxmem:134217728});console.log(["scrypt",32768,8,1,s.toString("base64url"),h.toString("base64url")].join("."))' 'NEW_PASSWORD'
vercel env rm ADMIN_PASSWORD_HASH production
vercel env add ADMIN_PASSWORD_HASH production   # paste the generated hash
vercel deploy --prod
```

---

## 7. Security

The admin password is stored as a scrypt hash, and admin sessions use signed HttpOnly cookies. The app also has CSRF protection, rate limiting, a nonce-based CSP, prices computed on the server and parameterised SQL.
Full report: [`SECURITY_AUDIT.md`](SECURITY_AUDIT.md)

---

## License

[MIT](LICENSE)
