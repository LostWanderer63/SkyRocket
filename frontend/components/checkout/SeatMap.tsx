"use client";

import { useMemo } from "react";
import type { TransportMode } from "@/lib/types";

interface Props {
  mode: TransportMode;
  legId: string; // seed for deterministic occupancy
  needed: number;
  selected: string[];
  onChange: (seats: string[]) => void;
}

// Per-mode coach layout: columns either side of an aisle.
const LAYOUT: Record<TransportMode, { rows: number; left: string[]; right: string[]; label: string }> = {
  flight: { rows: 12, left: ["A", "B", "C"], right: ["D", "E", "F"], label: "Cabin · 3-3" },
  bus: { rows: 11, left: ["A", "B"], right: ["C", "D"], label: "Coach · 2-2" },
  train: { rows: 9, left: ["LB", "MB", "UB"], right: ["SL", "SU"], label: "Sleeper coach · berths" },
};

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

export function SeatMap({ mode, legId, needed, selected, onChange }: Props) {
  const cfg = LAYOUT[mode];

  // Deterministic occupied set so the map is stable per leg.
  const occupied = useMemo(() => {
    const set = new Set<string>();
    const cols = [...cfg.left, ...cfg.right];
    for (let r = 1; r <= cfg.rows; r++) {
      for (const c of cols) {
        const id = `${r}${c}`;
        if (hash(`${legId}:${id}`) % 100 < 32) set.add(id);
      }
    }
    return set;
  }, [cfg, legId]);

  function toggle(id: string) {
    if (occupied.has(id)) return;
    if (selected.includes(id)) onChange(selected.filter((s) => s !== id)); // deselect / undo
    else if (selected.length < needed) onChange([...selected, id]);
    else onChange([...selected.slice(1), id]); // at capacity: replace the oldest pick
  }

  function Seat({ id }: { id: string }) {
    const isOcc = occupied.has(id);
    const isSel = selected.includes(id);
    return (
      <button
        type="button"
        disabled={isOcc}
        onClick={() => toggle(id)}
        title={id}
        className={`grid h-9 min-w-[2.4rem] place-items-center rounded-md border text-[0.7rem] font-bold transition-colors ${
          isOcc ? "cursor-not-allowed border-line bg-line text-ink-soft/50"
          : isSel ? "border-brand bg-brand text-white"
          : "border-line bg-surface text-ink-soft hover:border-brand"
        }`}
      >
        {id}
      </button>
    );
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-3 text-xs text-ink-soft">
        <span className="font-semibold">{cfg.label}</span>
        <Legend className="border-line bg-surface" label="Available" />
        <Legend className="border-brand bg-brand" label="Selected" />
        <Legend className="border-line bg-line" label="Booked" />
        <span className="ml-auto font-semibold text-ink">{selected.length}/{needed} chosen</span>
      </div>

      <div className="overflow-x-auto rounded-xl2 border border-line bg-bg p-3">
        <div className="flex flex-col gap-1.5">
          {Array.from({ length: cfg.rows }, (_, i) => i + 1).map((r) => (
            <div key={r} className="flex items-center gap-1.5">
              <span className="w-5 text-right text-[0.7rem] font-bold text-ink-soft">{r}</span>
              {cfg.left.map((c) => <Seat key={c} id={`${r}${c}`} />)}
              <span className="w-5" />
              {cfg.right.map((c) => <Seat key={c} id={`${r}${c}`} />)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`inline-block h-3.5 w-3.5 rounded border ${className}`} />
      {label}
    </span>
  );
}
