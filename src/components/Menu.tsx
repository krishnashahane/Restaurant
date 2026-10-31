"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { MenuItem } from "@/lib/menu";

type Restaurant = {
  name: string;
  tagline: string;
  cuisines: string[];
  address: string;
  phones: string[];
  hours: string;
  lat: number;
  lng: number;
};
type Cart = Record<string, number>;
type OrderType = "dine-in" | "takeaway" | "delivery";

const CART_KEY = "kv-cart-v1";
const inr = (n: number) => "₹" + n.toLocaleString("en-IN");
const slug = (s: string) => "c-" + s.toLowerCase().replace(/[^a-z0-9]+/g, "-");

function loadCart(valid: Set<string>): Cart {
  try {
    const raw = JSON.parse(localStorage.getItem(CART_KEY) || "{}");
    const out: Cart = {};
    for (const [k, v] of Object.entries(raw))
      if (valid.has(k) && Number.isInteger(v) && (v as number) > 0) out[k] = Math.min(v as number, 25);
    return out;
  } catch {
    return {};
  }
}

/** Open 8:00–24:00 IST. */
function isOpenNow(): boolean {
  const h = Number(
    new Intl.DateTimeFormat("en-GB", { hour: "numeric", hourCycle: "h23", timeZone: "Asia/Kolkata" }).format(new Date()),
  );
  return h >= 8;
}

const subscribeNoop = () => () => {};

export default function Menu({
  restaurant,
  categories,
  items,
}: {
  restaurant: Restaurant;
  categories: string[];
  items: MenuItem[];
}) {
  const router = useRouter();
  const valid = useMemo(() => new Set(items.map((i) => i.id)), [items]);
  const byId = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);

  const [cart, setCart] = useState<Cart>({});
  const [hydrated, setHydrated] = useState(false);
  const [query, setQuery] = useState("");
  const [jainOnly, setJainOnly] = useState(false);
  const [active, setActive] = useState(categories[0]);
  const [sheet, setSheet] = useState(false);
  const [bump, setBump] = useState(0);
  const open = useSyncExternalStore(subscribeNoop, isOpenNow, () => true);
  const chipBar = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- restore cart from storage after hydration
    setCart(loadCart(valid));
    setHydrated(true);
  }, [valid]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(cart));
    } catch {}
  }, [cart, hydrated]);

  const q = query.trim().toLowerCase();
  const filtered = useMemo(
    () =>
      items.filter(
        (i) =>
          (!jainOnly || i.jain) &&
          (!q || i.name.toLowerCase().includes(q) || i.category.toLowerCase().includes(q)),
      ),
    [items, q, jainOnly],
  );
  const grouped = useMemo(
    () =>
      categories
        .map((c) => ({ cat: c, list: filtered.filter((i) => i.category === c) }))
        .filter((g) => g.list.length),
    [categories, filtered],
  );

  // Track which category is on screen.
  useEffect(() => {
    const els = grouped.map((g) => document.getElementById(slug(g.cat))).filter(Boolean) as HTMLElement[];
    const io = new IntersectionObserver(
      (entries) => {
        const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (vis[0]) setActive(vis[0].target.getAttribute("data-cat")!);
      },
      { rootMargin: "-140px 0px -60% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [grouped]);

  useEffect(() => {
    const bar = chipBar.current;
    const chip = bar?.querySelector<HTMLElement>(`[data-chip="${CSS.escape(active)}"]`);
    if (bar && chip) bar.scrollTo({ left: chip.offsetLeft - bar.clientWidth / 2 + chip.clientWidth / 2, behavior: "smooth" });
  }, [active]);

  const count = Object.values(cart).reduce((a, b) => a + b, 0);
  const total = Object.entries(cart).reduce((s, [id, n]) => s + (byId.get(id)?.price ?? 0) * n, 0);

  const change = (id: string, d: number) => {
    setCart((c) => {
      const n = Math.max(0, Math.min(25, (c[id] ?? 0) + d));
      const next = { ...c };
      if (n === 0) delete next[id];
      else next[id] = n;
      return next;
    });
    if (d > 0) setBump((b) => b + 1);
  };

  const telPrimary = restaurant.phones[0];
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${restaurant.lat},${restaurant.lng}`;

  return (
    <div className="pb-32">
      {/* Hero */}
      <header className="grain relative overflow-hidden text-white">
        <div className="mx-auto max-w-6xl px-4 pb-10 pt-8 sm:px-6 sm:pb-14 sm:pt-12">
          <div className="flex items-center gap-2 text-[13px] font-medium text-white/80">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 ring-1 ring-white/20 backdrop-blur">
              <span className="h-2 w-2 rounded-full bg-emerald-300" /> 100% Pure Veg
            </span>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 ring-1 backdrop-blur ${
                open ? "bg-emerald-400/15 ring-emerald-300/40" : "bg-red-400/15 ring-red-300/40"
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${open ? "bg-emerald-300" : "bg-red-300"}`} />
              {open ? "Open now" : "Closed"} · {restaurant.hours}
            </span>
          </div>
          <h1 className="mt-5 font-display text-5xl font-semibold leading-[0.95] tracking-tight sm:text-7xl">
            Krishna <span className="italic text-amber-200">Veg</span>
          </h1>
          <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-white/80 sm:text-lg">
            {restaurant.cuisines.slice(0, 5).join(" · ")}. Freshly cooked, made to order.
          </p>
          <div className="mt-6 flex flex-wrap gap-2.5">
            <a
              href="#menu"
              className="rounded-full bg-amber-300 px-5 py-2.5 text-sm font-semibold text-leaf shadow-lg shadow-black/10 transition hover:bg-amber-200"
            >
              Order now
            </a>
            <a
              href={`tel:${telPrimary}`}
              className="rounded-full bg-white/10 px-5 py-2.5 text-sm font-semibold ring-1 ring-white/25 backdrop-blur transition hover:bg-white/20"
            >
              Call {telPrimary.replace("+91", "")}
            </a>
            <a
              href={mapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full bg-white/10 px-5 py-2.5 text-sm font-semibold ring-1 ring-white/25 backdrop-blur transition hover:bg-white/20"
            >
              Directions
            </a>
          </div>
          <p className="mt-5 flex items-start gap-2 text-[13px] text-white/65">
            <svg viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 flex-none" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 21s-7-6.1-7-11a7 7 0 1 1 14 0c0 4.9-7 11-7 11z" />
              <circle cx="12" cy="10" r="2.5" />
            </svg>
            {restaurant.address}
          </p>
        </div>
        <div aria-hidden="true" className="pointer-events-none absolute right-6 top-1/2 hidden -translate-y-1/2 grid-cols-2 gap-3 lg:grid xl:right-[max(1.5rem,calc((100vw-72rem)/2))]">
          {["/menu/cheese-pav-bhaji.webp", "/menu/paneer-tikka.webp", "/menu/kaju-paneer-biryani.webp", "/menu/malai-kofta.webp"].map((src, i) => (
            <div key={src} className={`relative h-36 w-36 overflow-hidden rounded-3xl shadow-2xl ring-4 ring-white/10 ${i % 2 ? "translate-y-6" : "-translate-y-2"} ${i === 0 ? "-rotate-3" : i === 3 ? "rotate-3" : ""}`}>
              <Image src={src} alt="" fill sizes="144px" className="object-cover" priority />
            </div>
          ))}
        </div>
      </header>

      {/* Sticky search + categories */}
      <div id="menu" className="sticky top-0 z-30 border-b border-line bg-cream/90 backdrop-blur-xl">
        <div className="mx-auto max-w-6xl px-4 pt-3 sm:px-6">
          <div className="flex gap-2">
            <label className="relative flex-1">
              <span className="sr-only">Search the menu</span>
              <svg viewBox="0 0 24 24" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" fill="none" stroke="currentColor" strokeWidth="2.2">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search paneer, pav bhaji, noodles…"
                maxLength={60}
                className="h-11 w-full rounded-full border border-line bg-paper pl-10 pr-10 text-[15px] outline-none transition placeholder:text-stone-400 focus:border-leaf/40 focus:ring-4 focus:ring-leaf/10"
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  aria-label="Clear search"
                  className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full text-muted hover:bg-stone-100"
                >
                  ×
                </button>
              )}
            </label>
            <button
              onClick={() => setJainOnly((v) => !v)}
              aria-pressed={jainOnly}
              className={`h-11 flex-none rounded-full border px-4 text-sm font-semibold transition ${
                jainOnly ? "border-leaf bg-leaf text-white" : "border-line bg-paper text-ink hover:border-leaf/40"
              }`}
            >
              Jain
            </button>
          </div>
          <div ref={chipBar} className="no-scrollbar relative -mx-4 mt-3 flex gap-1.5 overflow-x-auto px-4 pb-3 sm:-mx-6 sm:px-6">
            {grouped.map((g) => (
              <a
                key={g.cat}
                href={`#${slug(g.cat)}`}
                data-chip={g.cat}
                className={`flex-none whitespace-nowrap rounded-full px-3.5 py-1.5 text-[13px] font-medium transition ${
                  active === g.cat ? "bg-ink text-white" : "bg-paper text-stone-600 ring-1 ring-line hover:text-ink"
                }`}
              >
                {g.cat}
                <span className={`ml-1.5 text-[11px] ${active === g.cat ? "text-white/60" : "text-stone-400"}`}>{g.list.length}</span>
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Menu */}
      <main className="mx-auto max-w-6xl px-4 sm:px-6">
        {grouped.length === 0 && (
          <div className="py-24 text-center">
            <p className="font-display text-2xl">Nothing matches “{query}”</p>
            <button onClick={() => { setQuery(""); setJainOnly(false); }} className="mt-4 text-sm font-semibold text-saffron">
              Clear filters
            </button>
          </div>
        )}
        {grouped.map((g) => (
          <section key={g.cat} id={slug(g.cat)} data-cat={g.cat} className="scroll-mt-36 pt-8">
            <div className="mb-4 flex items-baseline justify-between">
              <h2 className="font-display text-[26px] font-semibold tracking-tight sm:text-3xl">{g.cat}</h2>
              <span className="text-xs font-medium text-muted">{g.list.length} items</span>
            </div>
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {g.list.map((item) => (
                <ItemCard key={item.id} item={item} qty={cart[item.id] ?? 0} onChange={change} />
              ))}
            </ul>
          </section>
        ))}

        <footer className="mt-16 border-t border-line py-10 text-center text-sm text-muted">
          <p className="font-display text-xl text-ink">Krishna Veg</p>
          <p className="mt-1">{restaurant.address}</p>
          <p className="mt-1">
            {restaurant.phones.map((p, i) => (
              <span key={p}>
                {i > 0 && " · "}
                <a className="underline-offset-2 hover:underline" href={`tel:${p}`}>{p.replace("+91", "+91 ")}</a>
              </span>
            ))}
          </p>
          <p className="mt-3 text-xs">Prices are inclusive of applicable taxes. Pay at the counter or on delivery.</p>
        </footer>
      </main>

      {/* Cart bar */}
      {hydrated && count > 0 && !sheet && (
        <div className="fixed inset-x-0 bottom-0 z-40 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] animate-fade">
          <button
            onClick={() => setSheet(true)}
            className="mx-auto flex w-full max-w-xl items-center justify-between rounded-2xl bg-leaf px-5 py-4 text-white shadow-2xl shadow-leaf/30 transition hover:bg-leaf-600"
          >
            <span className="flex items-center gap-3">
              <span key={bump} className="grid h-8 min-w-8 place-items-center rounded-full bg-white/15 px-2 text-sm font-bold animate-pop">
                {count}
              </span>
              <span className="text-left">
                <span className="block text-[15px] font-semibold">{inr(total)}</span>
                <span className="block text-xs text-white/70">{count === 1 ? "1 item" : `${count} items`} in cart</span>
              </span>
            </span>
            <span className="flex items-center gap-1 text-[15px] font-semibold">
              View cart
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m9 18 6-6-6-6" /></svg>
            </span>
          </button>
        </div>
      )}

      {sheet && (
        <CartSheet
          cart={cart}
          byId={byId}
          total={total}
          onChange={change}
          onClose={() => setSheet(false)}
          onPlaced={(id) => {
            setCart({});
            try { localStorage.removeItem(CART_KEY); } catch {}
            router.push(`/order/${id}`);
          }}
        />
      )}
    </div>
  );
}

function Stepper({ qty, onMinus, onPlus, label }: { qty: number; onMinus: () => void; onPlus: () => void; label: string }) {
  return (
    <div className="flex h-9 items-center overflow-hidden rounded-xl bg-leaf text-white shadow-sm">
      <button onClick={onMinus} aria-label={`Remove one ${label}`} className="grid h-9 w-9 place-items-center text-lg font-bold hover:bg-white/10">−</button>
      <span className="w-6 text-center text-sm font-bold tabular-nums" aria-live="polite">{qty}</span>
      <button onClick={onPlus} aria-label={`Add one more ${label}`} className="grid h-9 w-9 place-items-center text-lg font-bold hover:bg-white/10">+</button>
    </div>
  );
}

function ItemCard({ item, qty, onChange }: { item: MenuItem; qty: number; onChange: (id: string, d: number) => void }) {
  return (
    <li className="group flex gap-3 rounded-2xl bg-paper p-3 ring-1 ring-line transition hover:shadow-lg hover:shadow-stone-900/5">
      <div className="relative h-28 w-28 flex-none overflow-hidden rounded-xl bg-leaf-50 sm:h-32 sm:w-32">
        {item.image ? (
          <Image
            src={item.image}
            alt={item.name}
            fill
            sizes="128px"
            className="object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="grid h-full w-full place-items-center bg-gradient-to-br from-amber-50 to-leaf-50 p-2 text-center">
            <span className="font-display text-[15px] font-semibold leading-tight text-leaf/70">{item.name}</span>
          </div>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-1.5">
          <span className="veg-mark" title="Vegetarian" />
          {item.jain && <span className="rounded bg-saffron-50 px-1.5 py-px text-[10px] font-bold uppercase tracking-wide text-saffron">Jain</span>}
        </div>
        <h3 className="mt-1 text-[15px] font-semibold leading-snug">{item.name}</h3>
        {item.description && <p className="mt-0.5 line-clamp-2 text-[12.5px] leading-snug text-muted">{item.description}</p>}
        <div className="mt-auto flex items-center justify-between pt-2">
          <span className="text-[15px] font-bold tabular-nums">{inr(item.price)}</span>
          {qty > 0 ? (
            <Stepper qty={qty} label={item.name} onMinus={() => onChange(item.id, -1)} onPlus={() => onChange(item.id, 1)} />
          ) : (
            <button
              onClick={() => onChange(item.id, 1)}
              aria-label={`Add ${item.name}`}
              className="h-9 rounded-xl border border-leaf/25 bg-leaf-50 px-5 text-sm font-bold text-leaf transition hover:bg-leaf hover:text-white"
            >
              ADD
            </button>
          )}
        </div>
      </div>
    </li>
  );
}

function CartSheet({
  cart,
  byId,
  total,
  onChange,
  onClose,
  onPlaced,
}: {
  cart: Cart;
  byId: Map<string, MenuItem>;
  total: number;
  onChange: (id: string, d: number) => void;
  onClose: () => void;
  onPlaced: (id: string) => void;
}) {
  const [type, setType] = useState<OrderType>("dine-in");
  const [form, setForm] = useState({ name: "", phone: "", table: "", address: "", notes: "", website: "" });
  const [error, setError] = useState<{ msg: string; field?: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const lines = Object.entries(cart).filter(([id]) => byId.has(id));

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("kv-customer") || "{}");
      // eslint-disable-next-line react-hooks/set-state-in-effect -- prefill from storage
      setForm((f) => ({ ...f, name: typeof saved.name === "string" ? saved.name : "", phone: typeof saved.phone === "string" ? saved.phone : "" }));
    } catch {}
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  useEffect(() => {
    if (lines.length === 0) onClose();
  }, [lines.length, onClose]);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          phone: form.phone,
          type,
          table: type === "dine-in" ? form.table : undefined,
          address: type === "delivery" ? form.address : undefined,
          notes: form.notes || undefined,
          website: form.website || undefined,
          items: lines.map(([id, qty]) => ({ id, qty })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError({ msg: data.error || "Something went wrong. Please try again.", field: data.field });
        setBusy(false);
        return;
      }
      try { localStorage.setItem("kv-customer", JSON.stringify({ name: form.name, phone: form.phone })); } catch {}
      onPlaced(data.id);
    } catch {
      setError({ msg: "Network error. Check your connection and try again." });
      setBusy(false);
    }
  }

  const input =
    "h-12 w-full rounded-xl border border-line bg-paper px-4 text-[15px] outline-none transition placeholder:text-stone-400 focus:border-leaf/40 focus:ring-4 focus:ring-leaf/10";
  const bad = (f: string) => (error?.field === f ? " border-red-400 ring-4 ring-red-100" : "");

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label="Your cart">
      <button aria-label="Close cart" onClick={onClose} className="absolute inset-0 bg-stone-950/50 backdrop-blur-sm animate-fade" />
      <form
        onSubmit={submit}
        className="relative flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-cream shadow-2xl animate-sheet sm:rounded-3xl"
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div>
            <h2 className="font-display text-2xl font-semibold">Your order</h2>
            <p className="text-xs text-muted">Krishna Veg · Dehu Road</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="grid h-9 w-9 place-items-center rounded-full bg-paper text-xl ring-1 ring-line hover:bg-stone-100">
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <ul className="divide-y divide-line rounded-2xl bg-paper px-4 ring-1 ring-line">
            {lines.map(([id, qty]) => {
              const it = byId.get(id)!;
              return (
                <li key={id} className="flex items-center gap-3 py-3">
                  <span className="veg-mark" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{it.name}</p>
                    <p className="text-xs text-muted tabular-nums">{inr(it.price)} × {qty}</p>
                  </div>
                  <Stepper qty={qty} label={it.name} onMinus={() => onChange(id, -1)} onPlus={() => onChange(id, 1)} />
                  <span className="w-16 text-right text-sm font-bold tabular-nums">{inr(it.price * qty)}</span>
                </li>
              );
            })}
          </ul>

          <fieldset className="mt-5">
            <legend className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">How would you like it?</legend>
            <div className="grid grid-cols-3 gap-1 rounded-2xl bg-stone-200/60 p-1">
              {(["dine-in", "takeaway", "delivery"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  aria-pressed={type === t}
                  className={`h-10 rounded-xl text-sm font-semibold capitalize transition ${type === t ? "bg-paper text-ink shadow-sm" : "text-stone-600"}`}
                >
                  {t.replace("-", " ")}
                </button>
              ))}
            </div>
          </fieldset>

          <div className="mt-4 grid gap-3">
            <input className={input + bad("name")} placeholder="Your name" autoComplete="name" value={form.name} onChange={set("name")} maxLength={60} required />
            <input className={input + bad("phone")} placeholder="Mobile number" autoComplete="tel" inputMode="tel" value={form.phone} onChange={set("phone")} maxLength={16} required />
            {type === "dine-in" && (
              <input className={input + bad("table")} placeholder="Table number" inputMode="numeric" value={form.table} onChange={set("table")} maxLength={10} required />
            )}
            {type === "delivery" && (
              <textarea className={input + " h-24 resize-none py-3" + bad("address")} placeholder="Full delivery address with landmark" autoComplete="street-address" value={form.address} onChange={set("address")} maxLength={300} required />
            )}
            <input className={input} placeholder="Cooking notes (optional) – less spicy, no onion…" value={form.notes} onChange={set("notes")} maxLength={300} />
            <input className="hidden" tabIndex={-1} autoComplete="off" aria-hidden="true" value={form.website} onChange={set("website")} name="website" />
          </div>

          {error && <p role="alert" className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 ring-1 ring-red-200">{error.msg}</p>}
        </div>

        <div className="border-t border-line bg-paper px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">
          <div className="mb-3 flex items-baseline justify-between">
            <span className="text-sm text-muted">To pay {type === "delivery" ? "on delivery" : "at counter"}</span>
            <span className="font-display text-2xl font-semibold tabular-nums">{inr(total)}</span>
          </div>
          <button
            type="submit"
            disabled={busy}
            className="flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-leaf py-3.5 text-[15px] font-bold text-white shadow-lg shadow-leaf/25 transition hover:bg-leaf-600 disabled:opacity-60"
          >
            {busy ? "Placing order…" : "Place order"}
          </button>
        </div>
      </form>
    </div>
  );
}
