"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Data = {
  code: string;
  status: "new" | "preparing" | "ready" | "completed" | "cancelled";
  total: number;
  order_type: "dine-in" | "takeaway" | "delivery";
  created_at: string;
  items: { id: string; name: string; price: number; qty: number }[];
};

const inr = (n: number) => "₹" + n.toLocaleString("en-IN");
const STEPS = [
  { key: "new", label: "Order received" },
  { key: "preparing", label: "Being prepared" },
  { key: "ready", label: "Ready" },
  { key: "completed", label: "Completed" },
] as const;

export default function OrderStatus({ id }: { id: string }) {
  const [data, setData] = useState<Data | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let stop = false;
    const load = async () => {
      try {
        const r = await fetch(`/api/orders/${id}`, { cache: "no-store" });
        if (r.status === 404) return setMissing(true);
        if (r.ok && !stop) setData(await r.json());
      } catch {}
    };
    load();
    const t = setInterval(load, 10_000);
    return () => {
      stop = true;
      clearInterval(t);
    };
  }, [id]);

  if (missing)
    return (
      <Shell>
        <h1 className="font-display text-3xl font-semibold">Order not found</h1>
        <Link href="/" className="mt-6 inline-block font-semibold text-saffron">Back to menu →</Link>
      </Shell>
    );

  if (!data)
    return (
      <Shell>
        <div className="h-8 w-40 animate-pulse rounded bg-stone-200" />
        <div className="mt-4 h-40 animate-pulse rounded-2xl bg-stone-200" />
      </Shell>
    );

  const idx = STEPS.findIndex((s) => s.key === data.status);
  const readyLabel = data.order_type === "delivery" ? "Out for delivery" : data.order_type === "dine-in" ? "Serving to your table" : "Ready for pickup";

  return (
    <Shell>
      <div className="flex items-center gap-3">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-leaf text-white">
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m5 12 5 5L20 7" /></svg>
        </span>
        <div>
          <p className="text-sm text-muted">Thank you! Your order is in.</p>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Order {data.code}</h1>
        </div>
      </div>

      {data.status === "cancelled" ? (
        <p className="mt-6 rounded-2xl bg-red-50 p-4 text-sm font-medium text-red-700 ring-1 ring-red-200">
          This order was cancelled by the restaurant. Please call us if you have questions.
        </p>
      ) : (
        <ol className="mt-8 space-y-0">
          {STEPS.map((s, i) => {
            const done = i <= idx;
            return (
              <li key={s.key} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <span className={`grid h-7 w-7 place-items-center rounded-full text-xs font-bold ${done ? "bg-leaf text-white" : "bg-stone-200 text-stone-500"}`}>
                    {done ? "✓" : i + 1}
                  </span>
                  {i < STEPS.length - 1 && <span className={`h-8 w-0.5 ${i < idx ? "bg-leaf" : "bg-stone-200"}`} />}
                </div>
                <p className={`pt-1 text-[15px] ${done ? "font-semibold" : "text-muted"} ${i === idx ? "text-leaf" : ""}`}>
                  {s.key === "ready" ? readyLabel : s.label}
                  {i === idx && data.status !== "completed" && <span className="ml-2 inline-block h-2 w-2 animate-pulse rounded-full bg-saffron" />}
                </p>
              </li>
            );
          })}
        </ol>
      )}

      <div className="mt-8 rounded-2xl bg-paper p-4 ring-1 ring-line">
        <ul className="divide-y divide-line">
          {data.items.map((l) => (
            <li key={l.id} className="flex justify-between py-2 text-sm">
              <span>
                <span className="font-semibold">{l.qty}×</span> {l.name}
              </span>
              <span className="tabular-nums">{inr(l.price * l.qty)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-2 flex justify-between border-t border-line pt-3">
          <span className="text-sm text-muted">Total · pay {data.order_type === "delivery" ? "on delivery" : "at counter"}</span>
          <span className="font-display text-xl font-semibold tabular-nums">{inr(data.total)}</span>
        </div>
      </div>

      <p className="mt-4 text-center text-xs text-muted">This page updates automatically. Keep it open to track your order.</p>
      <Link href="/" className="mt-6 block rounded-2xl bg-leaf py-3.5 text-center font-bold text-white hover:bg-leaf-600">
        Order something else
      </Link>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto min-h-dvh max-w-md px-5 py-10">
      <Link href="/" className="font-display text-lg font-semibold text-leaf">Krishna Veg</Link>
      <div className="mt-8">{children}</div>
    </main>
  );
}
