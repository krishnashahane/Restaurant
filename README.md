# Krishna Veg — Online Menu & Ordering

Live site: **https://krishnaveg.vercel.app** · Admin: **https://krishnaveg.vercel.app/admin**

- 190 dishes in 16 categories, with prices and 102 photos taken from the restaurant's Zomato "Order Online" menu (`src/data/menu.json`, `public/menu/`).
- Customers browse, search, filter Jain dishes, add to cart and order for dine-in (table no.), takeaway or delivery. Payment is at the counter or on delivery.
- Customers can track their order live at `/order/<id>`.
- Admin sees every order: who ordered, phone, table or address, items, notes and total. Orders refresh every 8 s with a sound alert, and staff can accept → ready → complete or cancel them. The dashboard also shows today's stats and top items, and the QR code to download.
- QR code: `public/qr.png` / `public/qr.svg` (also copied to the parent folder). It points to https://krishnaveg.vercel.app.

## Run locally
```bash
vercel env pull .env.local   # DATABASE_URL, ADMIN_PASSWORD_HASH, SESSION_SECRET
npm install && npm run dev
```

## Change the admin password
```bash
node -e 'const c=require("crypto"),s=c.randomBytes(16),h=c.scryptSync(process.argv[1],s,64,{N:32768,r:8,p:1,maxmem:134217728});console.log(["scrypt",32768,8,1,s.toString("base64url"),h.toString("base64url")].join("."))' 'NEW_PASSWORD'
vercel env rm ADMIN_PASSWORD_HASH production && vercel env add ADMIN_PASSWORD_HASH production   # paste the hash
vercel deploy --prod
```

## Edit the menu
Edit `src/data/menu.json` (name, price, category, image) and redeploy.

See `SECURITY_AUDIT.md` for the security review.
