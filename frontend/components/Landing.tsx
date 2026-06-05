"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Deal, Tour } from "@/lib/types";
import { getDeals, listTours } from "@/lib/api";
import { money } from "@/lib/format";
import { MODES, NAV } from "@/lib/modes";
import { TourCard } from "./tours/TourCard";

interface RecentSearch { mode: string; from: string; to: string; fromCity?: string; toCity?: string; href: string }

export function Landing() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [tours, setTours] = useState<Tour[]>([]);
  const [recent, setRecent] = useState<RecentSearch[]>([]);

  useEffect(() => {
    getDeals().then((r) => setDeals(r.results)).catch(() => {});
    listTours({ sort: "rating" }).then((r) => setTours(r.results.slice(0, 3))).catch(() => {});
    try { setRecent(JSON.parse(localStorage.getItem("skyroute_recent") ?? "[]")); } catch { /* ignore */ }
  }, []);

  const modeHref: Record<string, string> = { flight: "/flights", train: "/trains", bus: "/buses" };
  const tileIcon: Record<string, string> = { "/flights": "✈", "/trains": "🚆", "/buses": "🚌", "/tours": "🏝" };

  return (
    <>
      {/* hero */}
      <section className="pb-10 pt-16 [background:radial-gradient(1100px_360px_at_85%_-10%,rgba(124,58,237,0.18),transparent_60%),linear-gradient(180deg,#eef3fc,#f5f7fb)] dark:[background:radial-gradient(1100px_360px_at_85%_-10%,rgba(124,58,237,0.22),transparent_60%),linear-gradient(180deg,#15203a,#0d1320)]">
        <div className="mx-auto w-[92vw] max-w-[1100px] text-center">
          <p className="mb-2 text-[0.78rem] font-bold uppercase tracking-wider text-brand">Flights · Trains · Buses · Tours</p>
          <h1 className="mx-auto max-w-[18ch] text-[clamp(2rem,5vw,3.2rem)] font-extrabold leading-[1.05] tracking-tight">One search for every way to travel</h1>
          <p className="mx-auto mt-3 max-w-[60ch] text-[1.05rem] text-ink-soft">Real airports & stations, live-style fares, seat selection, e-tickets and price alerts — all in one place.</p>

          <div className="mt-7 flex flex-wrap justify-center gap-3">
            {NAV.filter((n) => n.href !== "/pnr").map((n) => (
              <Link key={n.href} href={n.href} className="rounded-xl2 border border-line bg-surface px-6 py-4 font-bold shadow-soft transition-transform hover:-translate-y-0.5 hover:border-brand">
                <span className="mr-2 text-lg">{tileIcon[n.href] ?? "🧭"}</span>{n.label}
              </Link>
            ))}
          </div>

          {recent.length > 0 && (
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-sm">
              <span className="text-ink-soft">Recent:</span>
              {recent.slice(0, 4).map((r, i) => (
                <Link key={i} href={r.href} className="rounded-full border border-line bg-surface px-3 py-1 font-semibold hover:border-brand hover:text-brand">
                  {MODES[r.mode as "flight" | "train" | "bus"]?.icon} {r.fromCity ?? r.from} → {r.toCity ?? r.to}
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* deals */}
      <section className="mx-auto w-[92vw] max-w-[1100px] py-10">
        <h2 className="mb-1 text-2xl font-extrabold">Today’s cheapest fares</h2>
        <p className="mb-5 text-ink-soft">Lowest available price right now across popular routes.</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {deals.map((d, i) => (
            <Link key={i} href={modeHref[d.mode] ?? "/flights"}
              className="group flex items-center justify-between rounded-xl2 border border-line bg-surface p-5 shadow-soft transition-all hover:-translate-y-0.5 hover:border-brand">
              <div>
                <p className="text-xs font-bold uppercase text-ink-soft">{MODES[d.mode as "flight" | "train" | "bus"]?.icon} {d.mode}</p>
                <p className="mt-1 font-bold">{d.fromCity} <span className="text-ink-soft">→</span> {d.toCity}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-ink-soft">from</p>
                <p className="text-xl font-extrabold text-brand">{money(d.price, d.currency)}</p>
              </div>
            </Link>
          ))}
          {deals.length === 0 && [0, 1, 2].map((i) => <div key={i} className="h-24 animate-pulse rounded-xl2 border border-line bg-surface" />)}
        </div>
      </section>

      {/* trending tours */}
      {tours.length > 0 && (
        <section className="mx-auto w-[92vw] max-w-[1100px] py-6 pb-14">
          <div className="mb-5 flex items-end justify-between">
            <div>
              <h2 className="text-2xl font-extrabold">Trending tours</h2>
              <p className="text-ink-soft">Top-rated curated trips.</p>
            </div>
            <Link href="/tours" className="font-semibold text-brand">All tours →</Link>
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {tours.map((t) => <TourCard key={t.id} tour={t} />)}
          </div>
        </section>
      )}
    </>
  );
}
