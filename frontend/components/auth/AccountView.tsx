"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Booking } from "@/lib/types";
import { myBookings, emailTicket, cancelBooking } from "@/lib/api";
import { money } from "@/lib/format";
import { MODES } from "@/lib/modes";
import { useAuth } from "./AuthProvider";
import { AuthModal } from "./AuthModal";
import { SavedTravelers } from "./SavedTravelers";
import { PriceAlerts } from "./PriceAlerts";
import { AccountSettings } from "./AccountSettings";
import { FareTrendChart } from "../FareTrendChart";

type Section = "bookings" | "travelers" | "alerts" | "trends" | "settings";

const MODE_ACCENT: Record<string, string> = {
  flight: "#1f6feb", train: "#7c3aed", bus: "#16a34a", tour: "#ff7a45",
};

export function AccountView() {
  const { signedIn, loading: authLoading, user, logout } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [authOpen, setAuthOpen] = useState(false);
  const [section, setSection] = useState<Section>("bookings");
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");

  function reload() {
    return myBookings().then((r) => setBookings(r.results)).catch(() => setBookings([]));
  }
  useEffect(() => {
    if (!signedIn) { setLoading(false); return; }
    setLoading(true);
    reload().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signedIn]);

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = useMemo(() => bookings.filter((b) => !b.date || b.date >= today), [bookings, today]);
  const past = useMemo(() => bookings.filter((b) => b.date && b.date < today), [bookings, today]);

  const spendByCur = useMemo(() => {
    const m: Record<string, number> = {};
    for (const b of bookings) m[b.currency ?? "USD"] = (m[b.currency ?? "USD"] ?? 0) + b.totalPrice;
    return m;
  }, [bookings]);

  const trendRoutes = useMemo(() => {
    const seen = new Set<string>();
    const out: { mode: string; from: string; to: string; fromCity?: string; toCity?: string; cabin?: string }[] = [];
    for (const b of bookings) {
      if (b.mode === "tour" || !b.fromCode || !b.toCode) continue;
      const key = `${b.mode}:${b.fromCode}:${b.toCode}:${b.cabin ?? ""}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ mode: b.mode, from: b.fromCode, to: b.toCode, fromCity: b.fromCity ?? undefined, toCity: b.toCity ?? undefined, cabin: b.cabin ?? undefined });
      if (out.length >= 4) break;
    }
    return out;
  }, [bookings]);

  if (authLoading) return <main className="mx-auto w-[92vw] max-w-[1100px] py-16 text-center text-ink-soft">Loading…</main>;

  if (!signedIn) {
    return (
      <main className="mx-auto w-[92vw] max-w-[1100px] py-16 text-center">
        <h1 className="text-2xl font-bold">Sign in to view your profile</h1>
        <p className="mt-2 text-ink-soft">Your trips across flights, trains, buses and tours live here.</p>
        <button onClick={() => setAuthOpen(true)} className="mt-5 rounded-[10px] bg-brand px-6 py-3 font-semibold text-white hover:bg-brand-dark">Sign in</button>
        {authOpen && <AuthModal onClose={() => setAuthOpen(false)} />}
      </main>
    );
  }

  const list = tab === "upcoming" ? upcoming : past;
  const SECTIONS: { key: Section; label: string; icon: string }[] = [
    { key: "bookings", label: "Bookings", icon: "🎫" },
    { key: "travelers", label: "Travelers", icon: "👤" },
    { key: "alerts", label: "Price alerts", icon: "🔔" },
    { key: "trends", label: "Fare trends", icon: "📈" },
    { key: "settings", label: "Settings", icon: "⚙️" },
  ];

  return (
    <main className="mx-auto w-[92vw] max-w-[1100px] py-8">
      {/* compact header */}
      <section className="flex flex-col gap-4 rounded-xl2 border border-line p-5 shadow-soft sm:flex-row sm:items-center [background:linear-gradient(160deg,#eef3fc,#f7f9fd)] dark:[background:linear-gradient(160deg,#16223c,#121a2c)]">
        <span className="grid h-14 w-14 flex-shrink-0 place-items-center rounded-2xl bg-brand text-xl font-extrabold text-white">
          {user?.name.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0">
          <h1 className="truncate text-xl font-extrabold">{user?.name}</h1>
          <p className="truncate text-sm text-ink-soft">{user?.email}</p>
        </div>
        <div className="flex items-center gap-5 sm:ml-auto">
          <HeaderStat value={String(bookings.length)} label="Trips" />
          <HeaderStat value={String(upcoming.length)} label="Upcoming" />
          <HeaderStat value={Object.entries(spendByCur).map(([c, v]) => money(v, c)).join(" · ") || "—"} label="Spent" />
          <button onClick={logout} className="rounded-[10px] border border-line bg-surface px-4 py-2 text-sm font-semibold hover:bg-bg">Log out</button>
        </div>
      </section>

      {/* section nav */}
      <nav className="mt-6 flex gap-1 overflow-x-auto border-b border-line">
        {SECTIONS.map((s) => (
          <button key={s.key} onClick={() => setSection(s.key)}
            className={`flex items-center gap-1.5 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
              section === s.key ? "border-brand text-brand" : "border-transparent text-ink-soft hover:text-ink"}`}>
            <span>{s.icon}</span>{s.label}
            {s.key === "bookings" && bookings.length > 0 && <span className="rounded-full bg-bg px-1.5 text-xs">{bookings.length}</span>}
          </button>
        ))}
      </nav>

      <div className="mt-6">
        {section === "bookings" && (
          <>
            <div className="mb-4 inline-flex gap-1 rounded-full bg-bg p-1">
              {(["upcoming", "past"] as const).map((t) => (
                <button key={t} onClick={() => setTab(t)} className={`rounded-full px-5 py-2 text-sm font-semibold capitalize ${tab === t ? "bg-surface text-brand shadow-soft" : "text-ink-soft"}`}>
                  {t} ({t === "upcoming" ? upcoming.length : past.length})
                </button>
              ))}
            </div>
            {loading ? (
              <div className="grid gap-3">{[0, 1, 2].map((i) => <div key={i} className="h-[88px] animate-pulse rounded-xl2 border border-line bg-surface" />)}</div>
            ) : list.length === 0 ? (
              <Empty>No {tab} trips. <Link href="/flights" className="font-semibold text-brand">Book one →</Link></Empty>
            ) : (
              <div className="grid gap-3">{list.map((b) => <Row key={b.id} b={b} onChanged={reload} />)}</div>
            )}
          </>
        )}

        {section === "travelers" && <SavedTravelers />}
        {section === "alerts" && <PriceAlerts />}
        {section === "settings" && <AccountSettings />}
        {section === "trends" && (
          trendRoutes.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {trendRoutes.map((r) => (
                <FareTrendChart key={`${r.mode}-${r.from}-${r.to}-${r.cabin ?? ""}`}
                  mode={r.mode} from={r.from} to={r.to} fromCity={r.fromCity} toCity={r.toCity} cabin={r.cabin} />
              ))}
            </div>
          ) : <Empty>Book a flight, train or bus and we’ll chart its fare trend here.</Empty>
        )}
      </div>
    </main>
  );
}

function HeaderStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="hidden text-center sm:block">
      <p className="text-base font-extrabold leading-tight">{value}</p>
      <p className="text-[0.7rem] font-semibold uppercase tracking-wide text-ink-soft">{label}</p>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl2 border border-dashed border-line bg-surface p-10 text-center text-ink-soft">{children}</div>;
}

function Row({ b, onChanged }: { b: Booking; onChanged: () => void }) {
  const accent = MODE_ACCENT[b.mode] ?? "#1f6feb";
  const icon = b.mode === "tour" ? "🏝" : MODES[b.mode as "flight" | "train" | "bus"]?.icon ?? "🎫";
  const seats: string[] = b.seats ? JSON.parse(b.seats) : [];
  const cancelled = b.status === "cancelled";
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const title = b.mode === "tour" ? "Tour package"
    : b.trainName ? `${b.trainNo} · ${b.trainName}`
      : `${b.fromCity ?? b.fromCode ?? ""} → ${b.toCity ?? b.toCode ?? ""}`.trim() || (b.operator ?? b.mode);

  async function email() {
    setBusy(true); setNote(null);
    try { const r = await emailTicket(b.reference); setNote(`Sent to ${r.sentTo}`); }
    catch { setNote("Email failed"); } finally { setBusy(false); }
  }
  async function cancel() {
    if (!confirm(`Cancel ${b.reference}? Full refund will be issued.`)) return;
    setBusy(true); setNote(null);
    try { await cancelBooking(b.reference); await onChanged(); }
    catch { setNote("Cancel failed"); } finally { setBusy(false); }
  }

  return (
    <article className="rounded-xl2 border border-line bg-surface p-4 shadow-soft">
      <div className="flex items-center gap-4">
        <span className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-xl text-lg text-white" style={{ background: accent, opacity: cancelled ? 0.5 : 1 }}>{icon}</span>
        <div className="min-w-0 flex-1">
          <p className={`truncate font-bold ${cancelled ? "text-ink-soft line-through" : ""}`}>{title}</p>
          <p className="truncate text-sm text-ink-soft">
            {b.date ?? "—"}{b.depTime ? ` · ${b.depTime}` : ""}{b.cabin ? ` · ${b.cabin}` : ""}{seats.length ? ` · ${seats.join(", ")}` : ""}
          </p>
        </div>
        <div className="flex flex-shrink-0 flex-col items-end gap-1">
          <span className="font-extrabold text-brand">{money(b.totalPrice, b.currency ?? "USD")}</span>
          <span className={`rounded-full px-2 py-0.5 text-[0.7rem] font-bold capitalize ${cancelled ? "bg-[#fdecec] text-red-600" : "bg-[#eafaf0] text-ok"}`}>{b.status}</span>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3 text-sm">
        <Link href="/pnr" className="font-semibold text-brand">View e-ticket ({b.reference})</Link>
        <button onClick={email} disabled={busy} className="rounded-[8px] border border-line px-2.5 py-1 font-semibold hover:bg-bg disabled:opacity-50">Email</button>
        {!cancelled && <button onClick={cancel} disabled={busy} className="rounded-[8px] border border-red-200 px-2.5 py-1 font-semibold text-red-600 hover:bg-[#fdecec] disabled:opacity-50">Cancel</button>}
        {note && <span className="text-xs text-ink-soft">{note}</span>}
      </div>
    </article>
  );
}
