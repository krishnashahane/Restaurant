"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AdminLogin() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (r.ok) {
        setPassword("");
        router.refresh();
        return;
      }
      const d = await r.json().catch(() => ({}));
      setError(d.error || "Login failed");
    } catch {
      setError("Network error");
    }
    setBusy(false);
  }

  return (
    <main className="grain grid min-h-dvh place-items-center px-5">
      <form onSubmit={submit} className="w-full max-w-sm rounded-3xl bg-cream p-7 shadow-2xl">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-saffron">Staff only</p>
        <h1 className="mt-1 font-display text-3xl font-semibold">Krishna Veg Admin</h1>
        <p className="mt-1 text-sm text-muted">Sign in to see incoming orders.</p>
        <label className="mt-6 block text-sm font-semibold" htmlFor="pw">Password</label>
        <div className="relative mt-1.5">
          <input
            id="pw"
            type={show ? "text" : "password"}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            maxLength={200}
            required
            autoFocus
            className="h-12 w-full rounded-xl border border-line bg-paper px-4 pr-16 text-[15px] outline-none focus:border-leaf/40 focus:ring-4 focus:ring-leaf/10"
          />
          <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-xs font-semibold text-muted hover:bg-stone-100">
            {show ? "Hide" : "Show"}
          </button>
        </div>
        {error && <p role="alert" className="mt-3 text-sm font-medium text-red-600">{error}</p>}
        <button disabled={busy} className="mt-5 h-12 w-full rounded-xl bg-leaf font-bold text-white transition hover:bg-leaf-600 disabled:opacity-60">
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </main>
  );
}
