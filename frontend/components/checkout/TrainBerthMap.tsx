"use client";

import { useMemo } from "react";

interface Props {
  classCode: string; // 1A 2A 3A SL CC EC 2S FC
  legId: string;
  needed: number;
  selected: string[];
  onChange: (seats: string[]) => void;
}

type Berth = { type: string; label: string };

// One bay's berth pattern per class (Indian Railways coach layouts).
const BAY: Record<string, { coach: string; bays: number; berths: Berth[] }> = {
  SL: { coach: "S", bays: 9, berths: [
    { type: "LB", label: "Lower" }, { type: "MB", label: "Middle" }, { type: "UB", label: "Upper" },
    { type: "LB", label: "Lower" }, { type: "MB", label: "Middle" }, { type: "UB", label: "Upper" },
    { type: "SL", label: "Side Lower" }, { type: "SU", label: "Side Upper" },
  ]},
  "3A": { coach: "B", bays: 8, berths: [
    { type: "LB", label: "Lower" }, { type: "MB", label: "Middle" }, { type: "UB", label: "Upper" },
    { type: "LB", label: "Lower" }, { type: "MB", label: "Middle" }, { type: "UB", label: "Upper" },
    { type: "SL", label: "Side Lower" }, { type: "SU", label: "Side Upper" },
  ]},
  "2A": { coach: "A", bays: 6, berths: [
    { type: "LB", label: "Lower" }, { type: "UB", label: "Upper" },
    { type: "LB", label: "Lower" }, { type: "UB", label: "Upper" },
    { type: "SL", label: "Side Lower" }, { type: "SU", label: "Side Upper" },
  ]},
  "1A": { coach: "H", bays: 6, berths: [
    { type: "LB", label: "Lower" }, { type: "UB", label: "Upper" },
  ]},
};

const CHAIR = new Set(["CC", "EC", "2S", "FC"]);

function hash(s: string) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

const TYPE_TONE: Record<string, string> = {
  LB: "text-emerald-700", MB: "text-amber-700", UB: "text-sky-700",
  SL: "text-emerald-700", SU: "text-sky-700",
};

export function TrainBerthMap({ classCode, legId, needed, selected, onChange }: Props) {
  const cfg = BAY[classCode];
  const isChair = CHAIR.has(classCode) || !cfg;

  const occupied = useMemo(() => {
    const set = new Set<string>();
    const total = isChair ? 60 : cfg!.bays * cfg!.berths.length;
    for (let i = 1; i <= total; i++) if (hash(`${legId}:${classCode}:${i}`) % 100 < 35) set.add(String(i));
    return set;
  }, [legId, classCode, cfg, isChair]);

  function toggle(id: string) {
    if (occupied.has(id)) return;
    if (selected.includes(id)) onChange(selected.filter((s) => s !== id)); // deselect / undo
    else if (selected.length < needed) onChange([...selected, id]);
    else onChange([...selected.slice(1), id]); // at capacity: replace the oldest pick
  }

  function Tile({ n, type }: { n: number; type?: string }) {
    const id = String(n);
    const isOcc = occupied.has(id);
    const isSel = selected.includes(id);
    return (
      <button type="button" disabled={isOcc} onClick={() => toggle(id)} title={type ? `${n} ${type}` : `${n}`}
        className={`flex h-11 min-w-[3rem] flex-col items-center justify-center rounded-md border text-[0.7rem] font-bold leading-none transition-colors ${
          isOcc ? "cursor-not-allowed border-line bg-line text-ink-soft/50"
          : isSel ? "border-brand bg-brand text-white"
          : "border-line bg-surface hover:border-brand"}`}>
        <span>{n}</span>
        {type && <span className={`mt-0.5 text-[0.6rem] ${isSel ? "text-white" : TYPE_TONE[type] ?? "text-ink-soft"}`}>{type}</span>}
      </button>
    );
  }

  if (isChair) {
    // Chair-car style: rows of 3+3.
    return (
      <div>
        <Legend chosen={selected.length} needed={needed} chair />
        <div className="overflow-x-auto rounded-xl2 border border-line bg-bg p-3">
          <div className="flex flex-col gap-1.5">
            {Array.from({ length: 10 }, (_, r) => (
              <div key={r} className="flex items-center gap-1.5">
                <span className="w-5 text-right text-[0.7rem] font-bold text-ink-soft">{r + 1}</span>
                {[1, 2, 3].map((c) => <Tile key={c} n={r * 6 + c} />)}
                <span className="w-5" />
                {[4, 5, 6].map((c) => <Tile key={c} n={r * 6 + c} />)}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const { coach, bays, berths } = cfg!;
  const bayLen = berths.length;
  return (
    <div>
      <Legend chosen={selected.length} needed={needed} />
      <div className="grid gap-2 overflow-x-auto rounded-xl2 border border-line bg-bg p-3 sm:grid-cols-2">
        {Array.from({ length: bays }, (_, b) => (
          <div key={b} className="rounded-lg border border-line bg-surface p-2">
            <p className="mb-1.5 text-[0.7rem] font-bold text-ink-soft">Coach {coach}1 · Bay {b + 1}</p>
            <div className="flex flex-wrap gap-1.5">
              {berths.map((berth, i) => <Tile key={i} n={b * bayLen + i + 1} type={berth.type} />)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Legend({ chosen, needed, chair }: { chosen: number; needed: number; chair?: boolean }) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-3 text-xs text-ink-soft">
      <span className="font-semibold">{chair ? "Chair car · 3-3" : "Sleeper coach · LB/MB/UB + side berths"}</span>
      <span className="flex items-center gap-1.5"><i className="inline-block h-3.5 w-3.5 rounded border border-line bg-surface" />Free</span>
      <span className="flex items-center gap-1.5"><i className="inline-block h-3.5 w-3.5 rounded border border-brand bg-brand" />Picked</span>
      <span className="flex items-center gap-1.5"><i className="inline-block h-3.5 w-3.5 rounded border border-line bg-line" />Booked</span>
      <span className="ml-auto font-semibold text-ink">{chosen}/{needed}</span>
    </div>
  );
}
