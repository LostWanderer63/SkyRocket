"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { AdminStats, Booking, Tour } from "@/lib/types";
import { adminStats, adminCreateTour, adminDeleteTour, listTours } from "@/lib/api";
import { money } from "@/lib/format";
import { MODES } from "@/lib/modes";
import { useAuth } from "../auth/AuthProvider";

const MODE_ACCENT: Record<string, string> = { flight: "#1f6feb", train: "#7c3aed", bus: "#16a34a", tour: "#ff7a45" };

export function AdminDashboard() {
  const { user, loading: authLoading } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [tours, setTours] = useState<Tour[]>([]);
  const [tab, setTab] = useState<"overview" | "bookings" | "tours">("overview");
  const [err, setErr] = useState<string | null>(null);

  function loadTours() { listTours({}).then((r) => setTours(r.results)).catch(() => {}); }

  useEffect(() => {
    if (!user?.isAdmin) return;
    adminStats().then(setStats).catch((e) => setErr(e instanceof Error ? e.message : "Failed"));
    loadTours();
  }, [user?.isAdmin]);

  if (authLoading) return <main className="mx-auto w-[92vw] max-w-[1100px] py-16 text-center text-ink-soft">Loading…</main>;
  if (!user?.isAdmin) {
    return (
      <main className="mx-auto w-[92vw] max-w-[1100px] py-16 text-center">
        <h1 className="text-2xl font-bold">Admin access required</h1>
        <p className="mt-2 text-ink-soft">Sign in with an admin account to view this dashboard.</p>
        <Link href="/" className="mt-5 inline-block rounded-[10px] bg-brand px-6 py-3 font-semibold text-white">Back home</Link>
      </main>
    );
  }

  const totalRevenue = stats ? Object.entries(stats.revenueByCurrency).map(([c, v]) => money(v, c)).join(" · ") : "—";

  return (
    <main className="mx-auto w-[92vw] max-w-[1100px] py-8">
      <h1 className="text-3xl font-extrabold">Admin dashboard</h1>
      <p className="mt-1 text-ink-soft">Signed in as {user.email}</p>
      {err && <p className="mt-3 rounded-lg bg-[#fdecec] px-3 py-2 text-sm text-red-600">{err}</p>}

      <nav className="mt-6 flex gap-1 overflow-x-auto border-b border-line">
        {(["overview", "bookings", "tours"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm font-semibold capitalize ${tab === t ? "border-brand text-brand" : "border-transparent text-ink-soft hover:text-ink"}`}>
            {t}
          </button>
        ))}
      </nav>

      <div className="mt-6">
        {tab === "overview" && stats && (
          <>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <Kpi label="Bookings" value={String(stats.bookingsTotal)} sub={`${stats.bookingsActive} active · ${stats.bookingsCancelled} cancelled`} />
              <Kpi label="Revenue" value={totalRevenue} sub="active bookings" />
              <Kpi label="Users" value={String(stats.users)} />
              <Kpi label="Tours" value={String(stats.tours)} />
            </div>

            <section className="mt-6 rounded-xl2 border border-line bg-surface p-5 shadow-soft">
              <h2 className="mb-3 font-bold">Bookings by mode</h2>
              <div className="flex flex-col gap-2">
                {Object.entries(stats.byMode).sort((a, b) => b[1] - a[1]).map(([m, n]) => {
                  const max = Math.max(...Object.values(stats.byMode));
                  return (
                    <div key={m} className="flex items-center gap-3 text-sm">
                      <span className="w-20 font-semibold">{MODES[m as "flight" | "train" | "bus"]?.icon ?? "🏝"} {m}</span>
                      <div className="h-3 flex-1 overflow-hidden rounded-full bg-bg">
                        <div className="h-full rounded-full" style={{ width: `${(n / max) * 100}%`, background: MODE_ACCENT[m] ?? "#1f6feb" }} />
                      </div>
                      <span className="w-8 text-right font-bold">{n}</span>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="mt-6">
              <h2 className="mb-3 font-bold">Recent bookings</h2>
              <BookingsTable rows={stats.recent} />
            </section>
          </>
        )}

        {tab === "bookings" && stats && <BookingsTable rows={stats.recent} />}

        {tab === "tours" && (
          <ToursManager tours={tours} onChanged={loadTours} />
        )}
      </div>
    </main>
  );
}

function Kpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl2 border border-line bg-surface p-4 shadow-soft">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">{label}</p>
      <p className="mt-1 text-xl font-extrabold">{value}</p>
      {sub && <p className="text-xs text-ink-soft">{sub}</p>}
    </div>
  );
}

function BookingsTable({ rows }: { rows: Booking[] }) {
  if (rows.length === 0) return <p className="rounded-xl2 border border-dashed border-line p-8 text-center text-ink-soft">No bookings.</p>;
  return (
    <div className="overflow-x-auto rounded-xl2 border border-line bg-surface shadow-soft">
      <table className="w-full text-sm">
        <thead className="bg-bg text-left text-ink-soft">
          <tr><Th>Ref</Th><Th>Mode</Th><Th>Route</Th><Th>Date</Th><Th>Total</Th><Th>Status</Th></tr>
        </thead>
        <tbody>
          {rows.map((b) => (
            <tr key={b.id} className="border-t border-line">
              <td className="px-3 py-2 font-mono font-semibold">{b.reference}</td>
              <td className="px-3 py-2">{MODES[b.mode as "flight" | "train" | "bus"]?.icon ?? "🏝"} {b.mode}</td>
              <td className="px-3 py-2 text-ink-soft">{b.fromCity ?? b.fromCode ?? "—"} → {b.toCity ?? b.toCode ?? "—"}</td>
              <td className="px-3 py-2 text-ink-soft">{b.date ?? "—"}</td>
              <td className="px-3 py-2 font-bold text-brand">{money(b.totalPrice, b.currency ?? "USD")}</td>
              <td className="px-3 py-2"><span className={`rounded-full px-2 py-0.5 text-xs font-bold capitalize ${b.status === "cancelled" ? "bg-[#fdecec] text-red-600" : "bg-[#eafaf0] text-ok"}`}>{b.status}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function Th({ children }: { children: React.ReactNode }) { return <th className="px-3 py-2 font-semibold">{children}</th>; }

function ToursManager({ tours, onChanged }: { tours: Tour[]; onChanged: () => void }) {
  const [form, setForm] = useState({ id: "", title: "", destination: "", country: "", category: "Adventure", durationDays: 5, priceFrom: 999 });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg(null);
    try {
      await adminCreateTour({
        ...form,
        rating: 4.5, reviews: 0, lat: 0, lng: 0,
        image: "linear-gradient(135deg,#1f6feb,#7c3aed)",
        summary: `${form.title} — a curated ${form.category.toLowerCase()} trip.`,
        highlights: [], itinerary: [], includes: [],
      } as Tour);
      setForm({ id: "", title: "", destination: "", country: "", category: "Adventure", durationDays: 5, priceFrom: 999 });
      setMsg("Tour created");
      onChanged();
    } catch (err) { setMsg(err instanceof Error ? err.message : "Failed"); }
    finally { setBusy(false); }
  }
  async function remove(id: string) {
    if (!confirm(`Delete tour ${id}?`)) return;
    await adminDeleteTour(id); onChanged();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="grid gap-3">
        {tours.map((t) => (
          <div key={t.id} className="flex items-center gap-3 rounded-xl2 border border-line bg-surface p-4 shadow-soft">
            <span className="grid h-10 w-10 place-items-center rounded-xl text-lg" style={{ background: t.image }}>🏝</span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold">{t.title}</p>
              <p className="truncate text-sm text-ink-soft">{t.destination} · {t.category} · {t.durationDays}d · {money(t.priceFrom)}</p>
            </div>
            <button onClick={() => remove(t.id)} className="rounded-[8px] border border-red-200 px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-[#fdecec]">Delete</button>
          </div>
        ))}
      </div>

      <form onSubmit={create} className="h-max rounded-xl2 border border-line bg-surface p-5 shadow-soft">
        <h3 className="mb-3 font-bold">Add a tour</h3>
        <div className="grid gap-2">
          <input required value={form.id} onChange={(e) => setForm({ ...form, id: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })} placeholder="id (slug)" className="input" />
          <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Title" className="input" />
          <input required value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} placeholder="Destination" className="input" />
          <input required value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} placeholder="Country" className="input" />
          <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="input">
            {["Adventure", "Cultural", "Beach", "City"].map((c) => <option key={c}>{c}</option>)}
          </select>
          <div className="grid grid-cols-2 gap-2">
            <input type="number" min={1} value={form.durationDays} onChange={(e) => setForm({ ...form, durationDays: Number(e.target.value) })} placeholder="Days" className="input" />
            <input type="number" min={1} value={form.priceFrom} onChange={(e) => setForm({ ...form, priceFrom: Number(e.target.value) })} placeholder="Price" className="input" />
          </div>
          {msg && <p className="text-sm text-ink-soft">{msg}</p>}
          <button disabled={busy} className="rounded-[10px] bg-brand py-2.5 font-semibold text-white hover:bg-brand-dark disabled:opacity-50">Create tour</button>
        </div>
      </form>
    </div>
  );
}
