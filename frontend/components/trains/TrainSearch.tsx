"use client";

import { useCallback, useEffect, useState } from "react";
import type { BookingLeg, Location, TrainClassOption, TrainOffer } from "@/lib/types";
import { MODES } from "@/lib/modes";
import { isoOffset, money } from "@/lib/format";
import { searchTrains } from "@/lib/api";
import { SearchCard, type SearchValues } from "../SearchCard";
import { TrainCard } from "./TrainCard";
import { CheckoutWizard } from "../checkout/CheckoutWizard";
import { RouteInsights } from "../RouteInsights";
import { pushRecent } from "@/lib/recent";

const NDLS: Location = { code: "NDLS", name: "New Delhi", city: "New Delhi", country: "India", lat: 28.643, lng: 77.219, mode: "train" };
const BCT: Location = { code: "BCT", name: "Mumbai Central", city: "Mumbai", country: "India", lat: 18.969, lng: 72.819, mode: "train" };

const SORTS = [
  { value: "early", label: "Earliest" },
  { value: "fastest", label: "Fastest" },
  { value: "cheapest", label: "Cheapest" },
  { value: "availability", label: "Best availability" },
];

function trainToLeg(o: TrainOffer, c: TrainClassOption, date: string): BookingLeg {
  return {
    mode: "train",
    title: `${o.fromCity} → ${o.toCity}`,
    subtitle: `${o.trainNo} ${o.trainName} · ${o.dep}–${o.arr} · ${c.name}`,
    fromCode: o.from, toCode: o.to, fromCity: o.fromCity, toCity: o.toCity,
    date, depTime: o.dep, arrTime: o.arr,
    trainNo: o.trainNo, trainName: o.trainName,
    cabin: c.code, unitPrice: c.fare, currency: "INR", offerId: `${o.id}-${c.code}`, hasSeatMap: true,
  };
}

export function TrainSearch() {
  const meta = MODES.train;
  const initialSearch: SearchValues = {
    origin: BCT, destination: NDLS, depart: isoOffset(7), ret: isoOffset(14),
    trip: "round", pax: { adults: 1, children: 0, infants: 0 }, serviceClass: "SL",
  };

  const [search, setSearch] = useState<SearchValues>(initialSearch);
  const [sort, setSort] = useState("early");
  const [classFilter, setClassFilter] = useState<string[]>([]);
  const [typeFilter, setTypeFilter] = useState<string[]>([]);
  const [onlyAvail, setOnlyAvail] = useState(false);

  const [outbound, setOutbound] = useState<TrainOffer[]>([]);
  const [inbound, setInbound] = useState<TrainOffer[]>([]);
  const [allClasses, setAllClasses] = useState<string[]>([]);
  const [allTypes, setAllTypes] = useState<string[]>([]);
  const [fareSource, setFareSource] = useState<"live" | "model">("model");
  const [suggestions, setSuggestions] = useState<{ from: Location[]; to: Location[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [tab, setTab] = useState<"out" | "in">("out");
  const [pickOut, setPickOut] = useState<BookingLeg | null>(null);
  const [pickIn, setPickIn] = useState<BookingLeg | null>(null);
  const [checkout, setCheckout] = useState<BookingLeg[] | null>(null);

  const isRound = search.trip === "round";

  const run = useCallback(async () => {
    if (!search.origin || !search.destination) return;
    setLoading(true); setError(null);
    try {
      const args = { sort, classes: classFilter, types: typeFilter, available: onlyAvail };
      const outReq = searchTrains({ from: search.origin.code, to: search.destination.code, date: search.depart, ...args });
      const inReq = isRound
        ? searchTrains({ from: search.destination.code, to: search.origin.code, date: search.ret || search.depart, ...args })
        : Promise.resolve(null);
      const [out, inb] = await Promise.all([outReq, inReq]);
      setOutbound(out.results);
      setInbound(inb?.results ?? []);
      setAllClasses(Array.from(new Set([...out.classes, ...(inb?.classes ?? [])])));
      setAllTypes(Array.from(new Set([...out.types, ...(inb?.types ?? [])])));
      setFareSource(out.fareSource);
      setSuggestions(out.suggestions);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
      setOutbound([]); setInbound([]);
    } finally { setLoading(false); }
  }, [search.origin, search.destination, search.depart, search.ret, isRound, sort, classFilter, typeFilter, onlyAvail]);

  useEffect(() => { run(); }, [run]);

  function onSearch(v: SearchValues) {
    setSearch(v); setPickOut(null); setPickIn(null); setTab("out");
    if (v.origin && v.destination) {
      pushRecent({ mode: "train", from: v.origin.code, to: v.destination.code, fromCity: v.origin.city, toCity: v.destination.city, href: "/trains" });
    }
  }

  function selectClass(o: TrainOffer, c: TrainClassOption) {
    const date = tab === "out" ? search.depart : (search.ret || search.depart);
    const leg = trainToLeg(o, c, date);
    if (!isRound) { setCheckout([leg]); return; }
    if (tab === "out") { setPickOut(leg); setTab("in"); }
    else setPickIn(leg);
  }

  const toggle = (arr: string[], v: string, set: (x: string[]) => void) =>
    set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  const shown = tab === "out" ? outbound : inbound;

  return (
    <>
      <section className="pb-6 pt-12 [background:radial-gradient(1200px_380px_at_80%_-10%,rgba(124,58,237,0.18),transparent_60%),linear-gradient(180deg,#f1ecfd,#f5f7fb)] dark:[background:radial-gradient(1200px_380px_at_80%_-10%,rgba(124,58,237,0.24),transparent_60%),linear-gradient(180deg,#1b1636,#0d1320)]">
        <div className="mx-auto w-[92vw] max-w-[1180px]">
          <div className="max-w-[640px]">
            <p className="mb-1.5 text-[0.78rem] font-bold uppercase tracking-wider text-[#7c3aed]">{meta.icon} Indian Railways · real trains & timetable</p>
            <h1 className="mb-2.5 text-[clamp(1.9rem,4vw,2.9rem)] font-extrabold leading-[1.1] tracking-tight">{meta.heading}</h1>
            <p className="text-[1.05rem] text-ink-soft">8,200+ real stations and 5,200+ real trains with live-style class availability and full halt schedules.</p>
          </div>
          <SearchCard mode="train" classes={allClasses.length ? allClasses : ["SL", "3A", "2A"]} initial={initialSearch}
            quick={{}} onQuickToggle={() => {}} onSearch={onSearch} busy={loading}
            onTripChange={(trip) => { setSearch((s) => ({ ...s, trip })); setPickOut(null); setPickIn(null); setTab("out"); }} />
        </div>
      </section>

      <main className="py-8">
        <div className="mx-auto grid w-[92vw] max-w-[1180px] grid-cols-1 items-start gap-6 lg:grid-cols-[270px_1fr]">
          {/* filters */}
          <aside className="hidden rounded-xl2 border border-line bg-surface p-5 lg:block lg:sticky lg:top-[90px]">
            <h3 className="mb-2 text-[1.05rem] font-bold">Filters</h3>
            <FilterBlock title="Class">
              {(allClasses.length ? allClasses : ["1A", "2A", "3A", "SL", "CC"]).map((c) => (
                <Chk key={c} label={c} checked={classFilter.includes(c)} onChange={() => toggle(classFilter, c, setClassFilter)} />
              ))}
            </FilterBlock>
            <FilterBlock title="Train type">
              {(allTypes.length ? allTypes : ["Rajdhani", "Shatabdi", "Superfast"]).map((t) => (
                <Chk key={t} label={t} checked={typeFilter.includes(t)} onChange={() => toggle(typeFilter, t, setTypeFilter)} />
              ))}
            </FilterBlock>
            <FilterBlock title="Availability">
              <Chk label="Available only (AVL)" checked={onlyAvail} onChange={() => setOnlyAvail((v) => !v)} />
            </FilterBlock>
          </aside>

          <div>
            {search.origin && search.destination && (
              <RouteInsights mode="train" from={search.origin.code} to={search.destination.code}
                fromCity={search.origin.city} toCity={search.destination.city} currency="INR" />
            )}

            {isRound && (
              <div className="mb-4 inline-flex flex-wrap gap-1 rounded-full bg-bg p-1">
                <Tab active={tab === "out"} onClick={() => setTab("out")} label={`Onward · ${search.origin?.code}→${search.destination?.code}`} done={!!pickOut} />
                <Tab active={tab === "in"} onClick={() => setTab("in")} label={`Return · ${search.destination?.code}→${search.origin?.code}`} done={!!pickIn} />
              </div>
            )}

            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-ink-soft">
                <span><strong className="text-[1.25rem] text-ink">{shown.length}</strong> trains</span>
                <span className={`rounded-full px-2 py-0.5 text-[0.7rem] font-bold ${fareSource === "live" ? "bg-[#eafaf0] text-ok" : "bg-bg text-ink-soft"}`}>
                  {fareSource === "live" ? "● Live fares" : "Estimated fares"}
                </span>
              </div>
              <select value={sort} onChange={(e) => setSort(e.target.value)} className="rounded-[10px] border border-line bg-surface px-3 py-2 text-sm font-medium">
                {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>

            {error ? (
              <Empty>{error}</Empty>
            ) : loading ? (
              <div className="grid gap-4">{[0, 1, 2].map((i) => <div key={i} className="h-44 animate-pulse rounded-xl2 border border-line bg-surface" />)}</div>
            ) : shown.length === 0 ? (
              <div className="rounded-xl2 border border-dashed border-line bg-surface p-8 text-center">
                <p className="font-semibold text-ink">No direct trains for this route on the selected date.</p>
                {suggestions && (suggestions.from.length > 0 || suggestions.to.length > 0) ? (
                  <div className="mt-4 grid gap-3 text-left sm:grid-cols-2">
                    <SuggestCol title={`Nearby hubs to ${search.origin?.city ?? "origin"}`} stations={suggestions.from}
                      onPick={(loc) => { setSearch((s) => ({ ...s, origin: loc })); setPickOut(null); setPickIn(null); setTab("out"); }} />
                    <SuggestCol title={`Nearby hubs to ${search.destination?.city ?? "destination"}`} stations={suggestions.to}
                      onPick={(loc) => { setSearch((s) => ({ ...s, destination: loc })); setPickOut(null); setPickIn(null); setTab("out"); }} />
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-ink-soft">Try major hubs like New Delhi (NDLS), Howrah (HWH), Chennai (MAS) or Mumbai (BCT).</p>
                )}
              </div>
            ) : (
              <div className="grid gap-4">{shown.map((o) => <TrainCard key={o.id} offer={o} onSelect={selectClass} />)}</div>
            )}
          </div>
        </div>
      </main>

      {isRound && (pickOut || pickIn) && !checkout && (
        <div className="sticky bottom-0 z-40 border-t border-line bg-surface/95 backdrop-blur">
          <div className="mx-auto flex w-[92vw] max-w-[1180px] flex-wrap items-center gap-4 py-3">
            <Picked label="Onward" leg={pickOut} />
            <Picked label="Return" leg={pickIn} />
            <button disabled={!pickOut || !pickIn} onClick={() => pickOut && pickIn && setCheckout([pickOut, pickIn])}
              className="ml-auto rounded-[10px] bg-brand px-6 py-3 font-semibold text-white hover:bg-brand-dark disabled:opacity-50">
              {pickOut && pickIn ? `Book both · ${money(pickOut.unitPrice + pickIn.unitPrice)}/pax` : "Pick both legs"}
            </button>
          </div>
        </div>
      )}

      {checkout && <CheckoutWizard legs={checkout} pax={search.pax} onClose={() => setCheckout(null)} />}
    </>
  );
}

function FilterBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="border-t border-line py-3"><h4 className="mb-2 text-[0.9rem] font-bold">{title}</h4>{children}</div>;
}
function Chk({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return <label className="flex cursor-pointer items-center gap-2.5 py-1 text-[0.92rem]"><input type="checkbox" checked={checked} onChange={onChange} className="h-4 w-4 accent-brand" />{label}</label>;
}
function Tab({ active, onClick, label, done }: { active: boolean; onClick: () => void; label: string; done: boolean }) {
  return <button onClick={onClick} className={`rounded-full px-4 py-2 text-sm font-semibold ${active ? "bg-surface text-brand shadow-soft" : "text-ink-soft"}`}>{label}{done && <span className="ml-1 text-ok">✓</span>}</button>;
}
function Picked({ label, leg }: { label: string; leg: BookingLeg | null }) {
  return <div className="text-sm"><span className="font-bold">{label}: </span>{leg ? <span className="text-ink-soft">{leg.trainNo} · {leg.cabin} · {money(leg.unitPrice)}</span> : <span className="text-ink-soft">not selected</span>}</div>;
}
function Empty({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl2 border border-dashed border-line bg-surface p-12 text-center text-ink-soft">{children}</div>;
}
function SuggestCol({ title, stations, onPick }: { title: string; stations: Location[]; onPick: (loc: Location) => void }) {
  if (!stations.length) return <div />;
  return (
    <div className="rounded-xl2 border border-line p-3">
      <p className="mb-2 text-[0.72rem] font-bold uppercase text-ink-soft">{title}</p>
      <div className="flex flex-wrap gap-1.5">
        {stations.map((s) => (
          <button key={s.code} onClick={() => onPick(s)}
            className="rounded-full border border-line px-2.5 py-1 text-sm font-semibold hover:border-brand hover:bg-brand-tint hover:text-brand">
            {s.city} <span className="text-ink-soft">({s.code})</span>
          </button>
        ))}
      </div>
    </div>
  );
}
