"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Order, Status } from "@/lib/schemas";

const inr = (n: number) => "₹" + n.toLocaleString("en-IN");
const time = (s: string) =>
  new Date(s).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", hour: "numeric", minute: "2-digit", day: "numeric", month: "short" });
const istDay = (s: string | Date) => new Date(s).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

const STATUS_STYLE: Record<Status, string> = {
  new: "bg-saffron text-white",
  preparing: "bg-amber-100 text-amber-800",
  ready: "bg-sky-100 text-sky-800",
  completed: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-stone-200 text-stone-600",
};
const NEXT: Partial<Record<Status, { to: Status; label: string }>> = {
  new: { to: "preparing", label: "Accept & prepare" },
  preparing: { to: "ready", label: "Mark ready" },
  ready: { to: "completed", label: "Complete" },
};
const TABS = [
  { key: "active", label: "Active" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
  { key: "all", label: "All" },
] as const;

function chime() {
  try {
    const ctx = new AudioContext();
    [880, 1320].forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, ctx.currentTime + i * 0.18);
      g.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + i * 0.18 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.18 + 0.35);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + i * 0.18);
      o.stop(ctx.currentTime + i * 0.18 + 0.4);
    });
  } catch {}
}

export default function AdminDashboard() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [days, setDays] = useState(1);
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("active");
  const [search, setSearch] = useState("");
  const [err, setErr] = useState("");
  const [showQr, setShowQr] = useState(false);
  const seen = useRef<Set<string> | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/admin/orders?days=${days}`, { cache: "no-store" });
      if (r.status === 401) return router.refresh();
      if (!r.ok) throw new Error();
      const { orders } = (await r.json()) as { orders: Order[] };
      if (seen.current && orders.some((o) => !seen.current!.has(o.id) && o.status === "new")) chime();
      seen.current = new Set(orders.map((o) => o.id));
      setOrders(orders);
      setErr("");
    } catch {
      setErr("Couldn't refresh orders. Retrying…");
    }
    setLoaded(true);
  }, [days, router]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch + polling
    load();
    const t = setInterval(load, 8000);
    return () => clearInterval(t);
  }, [load]);

  const pending = orders.filter((o) => o.status === "new").length;
  useEffect(() => {
    document.title = pending ? `(${pending}) New orders · Krishna Veg Admin` : "Admin · Krishna Veg";
  }, [pending]);

  async function setStatus(id: string, status: Status) {
    setOrders((os) => os.map((o) => (o.id === id ? { ...o, status } : o)));
    const r = await fetch(`/api/admin/orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!r.ok) {
      setErr("Status update failed");
      load();
    }
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.refresh();
  }

  const today = istDay(new Date());
  const stats = useMemo(() => {
    const t = orders.filter((o) => istDay(o.created_at) === today && o.status !== "cancelled");
    const counts = new Map<string, number>();
    for (const o of t) for (const l of o.items) counts.set(l.name, (counts.get(l.name) ?? 0) + l.qty);
    return {
      count: t.length,
      revenue: t.reduce((s, o) => s + o.total, 0),
      active: orders.filter((o) => ["new", "preparing", "ready"].includes(o.status)).length,
      top: [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6),
    };
  }, [orders, today]);

  const q = search.trim().toLowerCase();
  const visible = orders.filter((o) => {
    const inTab =
      tab === "all" ||
      (tab === "active" && ["new", "preparing", "ready"].includes(o.status)) ||
      o.status === tab;
    const inSearch =
      !q ||
      o.code.toLowerCase().includes(q) ||
      o.customer_name.toLowerCase().includes(q) ||
      o.phone.includes(q) ||
      o.items.some((l) => l.name.toLowerCase().includes(q));
    return inTab && inSearch;
  });

  return (
    <div className="min-h-dvh bg-stone-100">
      <header className="sticky top-0 z-20 border-b border-line bg-cream/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div>
            <p className="font-display text-xl font-semibold leading-none">Krishna Veg</p>
            <p className="mt-1 flex items-center gap-1.5 text-xs text-muted">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" /> Live · refreshes every 8s
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowQr(true)} className="h-9 rounded-xl bg-paper px-3 text-sm font-semibold ring-1 ring-line hover:bg-stone-50">QR code</button>
            <button onClick={logout} className="h-9 rounded-xl bg-ink px-3 text-sm font-semibold text-white hover:bg-stone-800">Log out</button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="New orders" value={String(pending)} accent={pending > 0} />
          <Stat label="In progress" value={String(stats.active)} />
          <Stat label="Orders today" value={String(stats.count)} />
          <Stat label="Revenue today" value={inr(stats.revenue)} />
        </section>

        {stats.top.length > 0 && (
          <section className="mt-3 rounded-2xl bg-paper p-4 ring-1 ring-line">
            <p className="text-xs font-bold uppercase tracking-wider text-muted">Top items today</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {stats.top.map(([name, n]) => (
                <span key={name} className="rounded-full bg-leaf-50 px-3 py-1 text-sm text-leaf ring-1 ring-leaf/15">
                  {name} <b>×{n}</b>
                </span>
              ))}
            </div>
          </section>
        )}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="no-scrollbar flex gap-1 overflow-x-auto rounded-2xl bg-stone-200/70 p-1">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`h-9 flex-none rounded-xl px-4 text-sm font-semibold transition ${tab === t.key ? "bg-paper shadow-sm" : "text-stone-600"}`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, phone, code, dish"
              className="h-10 min-w-0 flex-1 rounded-xl border border-line bg-paper px-3 text-sm outline-none focus:ring-4 focus:ring-leaf/10 sm:w-72"
            />
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="h-10 rounded-xl border border-line bg-paper px-2 text-sm font-medium"
              aria-label="Time range"
            >
              <option value={1}>Last 24h</option>
              <option value={7}>7 days</option>
              <option value={30}>30 days</option>
              <option value={90}>90 days</option>
            </select>
          </div>
        </div>

        {err && <p className="mt-3 rounded-xl bg-red-50 px-4 py-2 text-sm text-red-700 ring-1 ring-red-200">{err}</p>}

        {!loaded ? (
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {[0, 1, 2].map((i) => <div key={i} className="h-56 animate-pulse rounded-2xl bg-stone-200" />)}
          </div>
        ) : visible.length === 0 ? (
          <div className="mt-16 text-center">
            <p className="font-display text-2xl">No orders here yet</p>
            <p className="mt-1 text-sm text-muted">New orders appear automatically with a sound alert.</p>
          </div>
        ) : (
          <ul className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {visible.map((o) => (
              <OrderCard key={o.id} o={o} onStatus={setStatus} />
            ))}
          </ul>
        )}
      </main>

      {showQr && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4" role="dialog" aria-modal="true" aria-label="Menu QR code">
          <button aria-label="Close" onClick={() => setShowQr(false)} className="absolute inset-0 bg-stone-950/50 backdrop-blur-sm" />
          <div className="relative w-full max-w-sm rounded-3xl bg-cream p-6 text-center shadow-2xl">
            <p className="font-display text-2xl font-semibold">Scan to order</p>
            <p className="text-sm text-muted">krishnaveg.vercel.app</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/qr.png" alt="QR code linking to krishnaveg.vercel.app" className="mx-auto mt-4 w-64 rounded-2xl bg-white p-3 ring-1 ring-line" />
            <div className="mt-5 grid grid-cols-2 gap-2">
              <a href="/qr.png" download="krishnaveg-qr.png" className="rounded-xl bg-leaf py-2.5 text-sm font-bold text-white">Download PNG</a>
              <a href="/qr.svg" download="krishnaveg-qr.svg" className="rounded-xl bg-paper py-2.5 text-sm font-bold ring-1 ring-line">Download SVG</a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-2xl p-4 ring-1 ${accent ? "bg-saffron text-white ring-saffron" : "bg-paper ring-line"}`}>
      <p className={`text-xs font-bold uppercase tracking-wider ${accent ? "text-white/80" : "text-muted"}`}>{label}</p>
      <p className="mt-1 font-display text-3xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function OrderCard({ o, onStatus }: { o: Order; onStatus: (id: string, s: Status) => void }) {
  const next = NEXT[o.status];
  const where =
    o.order_type === "dine-in" ? `Table ${o.table_no}` : o.order_type === "takeaway" ? "Takeaway" : "Delivery";
  return (
    <li className={`flex flex-col rounded-2xl bg-paper p-4 ring-1 ${o.status === "new" ? "ring-2 ring-saffron" : "ring-line"}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-mono text-sm font-bold">{o.code}</p>
          <p className="text-xs text-muted">{time(o.created_at)}</p>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-xs font-bold capitalize ${STATUS_STYLE[o.status]}`}>{o.status}</span>
      </div>

      <div className="mt-3 rounded-xl bg-stone-50 p-3">
        <div className="flex items-center justify-between">
          <p className="font-semibold">{o.customer_name}</p>
          <span className="rounded-md bg-ink px-2 py-0.5 text-xs font-bold text-white">{where}</span>
        </div>
        <a href={`tel:+91${o.phone}`} className="text-sm font-medium text-leaf underline-offset-2 hover:underline">
          +91 {o.phone.slice(0, 5)} {o.phone.slice(5)}
        </a>
        {o.address && <p className="mt-1 text-sm text-stone-600">{o.address}</p>}
      </div>

      <ul className="mt-3 space-y-1">
        {o.items.map((l) => (
          <li key={l.id} className="flex justify-between gap-2 text-sm">
            <span>
              <b className="tabular-nums">{l.qty}×</b> {l.name}
            </span>
            <span className="tabular-nums text-muted">{inr(l.price * l.qty)}</span>
          </li>
        ))}
      </ul>
      {o.notes && <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">📝 {o.notes}</p>}

      <div className="mt-auto pt-3">
        <div className="flex items-baseline justify-between border-t border-line pt-3">
          <span className="text-sm text-muted">Total</span>
          <span className="font-display text-xl font-semibold tabular-nums">{inr(o.total)}</span>
        </div>
        <div className="mt-3 flex gap-2">
          {next && (
            <button onClick={() => onStatus(o.id, next.to)} className="h-10 flex-1 rounded-xl bg-leaf text-sm font-bold text-white hover:bg-leaf-600">
              {next.label}
            </button>
          )}
          {["new", "preparing"].includes(o.status) && (
            <button onClick={() => onStatus(o.id, "cancelled")} className="h-10 rounded-xl px-3 text-sm font-semibold text-red-600 ring-1 ring-red-200 hover:bg-red-50">
              Cancel
            </button>
          )}
          {(o.status === "completed" || o.status === "cancelled") && (
            <button onClick={() => onStatus(o.id, "new")} className="h-10 flex-1 rounded-xl text-sm font-semibold text-muted ring-1 ring-line hover:bg-stone-50">
              Reopen
            </button>
          )}
        </div>
      </div>
    </li>
  );
}
