"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { BookingLeg, Location, OfferFilters, SortKey, TransportMode, TransportOffer } from "@/lib/types";
import { MODES } from "@/lib/modes";
import { defaultFilters, isoOffset, stopLabel } from "@/lib/format";
import { pushRecent } from "@/lib/recent";
import { searchTransport } from "@/lib/api";
import { SearchCard, type SearchValues } from "./SearchCard";
import { Filters } from "./Filters";
import { ResultsList } from "./ResultsList";
import { CheckoutWizard } from "./checkout/CheckoutWizard";
import { RouteInsights } from "./RouteInsights";
import { money } from "@/lib/format";

// Default origin/destination per mode (codes that exist in the datasets).
const DEFAULTS: Record<Exclude<TransportMode, "train">, { from: Location; to: Location; cls: string }> = {
  flight: {
    from: { code: "JFK", name: "John F Kennedy International Airport", city: "New York", country: "United States", lat: 40.64, lng: -73.78, mode: "flight" },
    to: { code: "LHR", name: "London Heathrow Airport", city: "London", country: "United Kingdom", lat: 51.47, lng: -0.46, mode: "flight" },
    cls: "Economy",
  },
  bus: {
    from: { code: "DLB", name: "Delhi ISBT Kashmere Gate", city: "New Delhi", country: "India", lat: 28.67, lng: 77.23, mode: "bus" },
    to: { code: "PNB", name: "Pune Swargate Bus Stand", city: "Pune", country: "India", lat: 18.5, lng: 73.86, mode: "bus" },
    cls: "Standard",
  },
};

function offerToLeg(o: TransportOffer): BookingLeg {
  return {
    mode: o.mode,
    title: `${o.fromCity} → ${o.toCity}`,
    subtitle: `${o.operator} · ${o.dep}–${o.arr} · ${stopLabel(o.stops, o.mode)}`,
    fromCode: o.from,
    toCode: o.to,
    fromCity: o.fromCity,
    toCity: o.toCity,
    date: o.depDate,
    depTime: o.dep,
    arrTime: o.arr,
    operator: o.operator,
    cabin: o.serviceClass,
    unitPrice: o.price,
    currency: o.currency,
    offerId: o.id,
    hasSeatMap: true,
  };
}

export function TransportSearch({ mode }: { mode: Exclude<TransportMode, "train"> }) {
  const meta = MODES[mode];
  const def = DEFAULTS[mode];

  const initialSearch: SearchValues = {
    origin: def.from,
    destination: def.to,
    depart: isoOffset(7),
    ret: isoOffset(14),
    trip: "round",
    pax: { adults: 1, children: 0, infants: 0 },
    serviceClass: def.cls,
  };

  const [search, setSearch] = useState<SearchValues>(initialSearch);
  const [filters, setFilters] = useState<OfferFilters>(defaultFilters());
  const [quick, setQuick] = useState<Record<string, boolean>>({});
  const [sort, setSort] = useState<SortKey>("best");

  const [outbound, setOutbound] = useState<TransportOffer[]>([]);
  const [inbound, setInbound] = useState<TransportOffer[]>([]);
  const [totals, setTotals] = useState({ out: 0, in: 0 });
  const [classes, setClasses] = useState<string[]>([]);
  const [operators, setOperators] = useState<string[]>([]);
  const [priceMax, setPriceMax] = useState(2000);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [tab, setTab] = useState<"out" | "in">("out");
  const [pickOut, setPickOut] = useState<TransportOffer | null>(null);
  const [pickIn, setPickIn] = useState<TransportOffer | null>(null);
  const [checkout, setCheckout] = useState<BookingLeg[] | null>(null);
  const [drawer, setDrawer] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  const isRound = search.trip === "round";

  const run = useCallback(async () => {
    if (!search.origin || !search.destination) return;
    setLoading(true);
    setError(null);
    try {
      const outReq = searchTransport(mode, { from: search.origin.code, to: search.destination.code, date: search.depart, sort, filters });
      const inReq = isRound
        ? searchTransport(mode, { from: search.destination.code, to: search.origin.code, date: search.ret || search.depart, sort, filters })
        : Promise.resolve(null);
      const [out, inb] = await Promise.all([outReq, inReq]);
      setOutbound(out.results);
      setTotals({ out: out.total, in: inb?.total ?? 0 });
      setClasses(out.classes);
      setOperators(out.operators);
      setPriceMax(out.priceMax);
      setInbound(inb?.results ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
      setOutbound([]); setInbound([]);
    } finally {
      setLoading(false);
    }
  }, [mode, search.origin, search.destination, search.depart, search.ret, isRound, sort, filters]);

  useEffect(() => { run(); }, [run]);

  function onSearch(v: SearchValues) {
    setSearch(v);
    setPickOut(null); setPickIn(null); setTab("out");
    if (v.origin && v.destination) {
      pushRecent({ mode, from: v.origin.code, to: v.destination.code, fromCity: v.origin.city, toCity: v.destination.city, href: `/${mode === "flight" ? "flights" : "buses"}` });
    }
    resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function onQuickToggle(key: string, on: boolean) {
    setQuick((q) => ({ ...q, [key]: on }));
    setFilters((f) => {
      const next = { ...f };
      if (key === "direct") next.stops = on ? [0] : [];
      if (key === "morning") next.times = on ? Array.from(new Set([...f.times, "morning" as const])) : f.times.filter((t) => t !== "morning");
      if (key === "refundable") next.refundable = on;
      return next;
    });
  }
  function clearFilters() { setFilters(defaultFilters()); setQuick({}); }

  function select(o: TransportOffer) {
    if (!isRound) { setCheckout([offerToLeg(o)]); return; }
    if (tab === "out") { setPickOut(o); setTab("in"); }
    else setPickIn(o);
  }


  const shown = tab === "out" ? outbound : inbound;
  const total = tab === "out" ? totals.out : totals.in;

  const filterPanel = (
    <Filters filters={filters} operators={operators} classes={classes} priceCeiling={priceMax}
      stopWord={mode === "flight" ? "Stop" : "Change"} onChange={setFilters} onClear={clearFilters} />
  );

  function startCheckout() {
    if (pickOut && pickIn) setCheckout([offerToLeg(pickOut), offerToLeg(pickIn)]);
  }

  return (
    <>
      <section className="pb-6 pt-12 [background:radial-gradient(1200px_380px_at_80%_-10%,rgba(31,111,235,0.18),transparent_60%),linear-gradient(180deg,#eef3fc,#f5f7fb)] dark:[background:radial-gradient(1200px_380px_at_80%_-10%,rgba(31,111,235,0.22),transparent_60%),linear-gradient(180deg,#13203a,#0d1320)]">
        <div className="mx-auto w-[92vw] max-w-[1180px]">
          <div className="max-w-[640px]">
            <p className="mb-1.5 text-[0.78rem] font-bold uppercase tracking-wider text-brand">{meta.icon} {meta.label} · real-time locations & fares</p>
            <h1 className="mb-2.5 text-[clamp(1.9rem,4vw,2.9rem)] font-extrabold leading-[1.1] tracking-tight">{meta.heading}</h1>
            <p className="text-[1.05rem] text-ink-soft">{meta.sub}</p>
          </div>
          <SearchCard mode={mode} classes={classes.length ? classes : [def.cls]} initial={initialSearch}
            quick={quick} onQuickToggle={onQuickToggle} onSearch={onSearch} busy={loading}
            onTripChange={(trip) => { setSearch((s) => ({ ...s, trip })); setPickOut(null); setPickIn(null); setTab("out"); }} />
        </div>
      </section>

      <main ref={resultsRef} className="py-8">
        <div className="mx-auto grid w-[92vw] max-w-[1180px] grid-cols-1 items-start gap-6 lg:grid-cols-[270px_1fr]">
          <div className="hidden lg:block">{filterPanel}</div>

          <div>
            {search.origin && search.destination && (
              <RouteInsights mode={mode} from={search.origin.code} to={search.destination.code}
                fromCity={search.origin.city} toCity={search.destination.city} cabin={search.serviceClass} currency="USD" />
            )}

            {isRound && (
              <div className="mb-4 inline-flex gap-1 rounded-full bg-bg p-1">
                <LegTab active={tab === "out"} onClick={() => setTab("out")} label={`Outbound · ${search.origin?.code}→${search.destination?.code}`} pick={pickOut} />
                <LegTab active={tab === "in"} onClick={() => setTab("in")} label={`Return · ${search.destination?.code}→${search.origin?.code}`} pick={pickIn} />
              </div>
            )}

            <ResultsList offers={shown} total={total} loading={loading} error={error} sort={sort}
              noun={meta.label.toLowerCase()} onSort={setSort} onSelect={select}
              onOpenFilters={() => setDrawer(true)} onReset={clearFilters} />
          </div>
        </div>
      </main>

      {/* round-trip selection bar */}
      {isRound && (pickOut || pickIn) && !checkout && (
        <div className="sticky bottom-0 z-40 border-t border-line bg-surface/95 backdrop-blur">
          <div className="mx-auto flex w-[92vw] max-w-[1180px] flex-wrap items-center gap-4 py-3">
            <Picked label="Outbound" o={pickOut} />
            <Picked label="Return" o={pickIn} />
            <button disabled={!pickOut || !pickIn} onClick={startCheckout}
              className="ml-auto rounded-[10px] bg-brand px-6 py-3 font-semibold text-white hover:bg-brand-dark disabled:opacity-50">
              {pickOut && pickIn ? `Book both · ${money((pickOut.price + pickIn.price))}/pax` : "Pick both legs"}
            </button>
          </div>
        </div>
      )}

      {drawer && (
        <div className="fixed inset-0 z-[90] flex lg:hidden" onClick={() => setDrawer(false)}>
          <div className="ml-auto h-full w-[88vw] max-w-[340px] overflow-y-auto bg-bg p-4" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-bold">Filters</h3>
              <button onClick={() => setDrawer(false)} aria-label="Close" className="text-2xl leading-none text-ink-soft">×</button>
            </div>
            {filterPanel}
            <button onClick={() => setDrawer(false)} className="mt-4 w-full rounded-[10px] bg-brand py-3 font-semibold text-white">Show {shown.length} results</button>
          </div>
        </div>
      )}

      {checkout && <CheckoutWizard legs={checkout} pax={search.pax} onClose={() => setCheckout(null)} />}
    </>
  );
}

function LegTab({ active, onClick, label, pick }: { active: boolean; onClick: () => void; label: string; pick: TransportOffer | null }) {
  return (
    <button onClick={onClick} className={`rounded-full px-4 py-2 text-sm font-semibold ${active ? "bg-surface text-brand shadow-soft" : "text-ink-soft"}`}>
      {label} {pick && <span className="ml-1 text-ok">✓</span>}
    </button>
  );
}

function Picked({ label, o }: { label: string; o: TransportOffer | null }) {
  return (
    <div className="text-sm">
      <span className="font-bold">{label}: </span>
      {o ? <span className="text-ink-soft">{o.operator} {o.dep}–{o.arr} · {money(o.price)}</span> : <span className="text-ink-soft">not selected</span>}
    </div>
  );
}
