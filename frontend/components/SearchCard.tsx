"use client";

import { useState } from "react";
import type { Location, PassengerCounts, TransportMode } from "@/lib/types";
import { MODES } from "@/lib/modes";
import { isoOffset } from "@/lib/format";
import { LocationInput } from "./LocationInput";
import { PassengerPicker } from "./PassengerPicker";
import { DatePicker } from "./DatePicker";

export interface SearchValues {
  origin: Location | null;
  destination: Location | null;
  depart: string;
  ret: string;
  trip: "round" | "oneway";
  pax: PassengerCounts;
  serviceClass: string;
}

const QUICK = [
  { key: "direct", label: "Direct only" },
  { key: "morning", label: "Morning" },
  { key: "refundable", label: "Refundable" },
] as const;

interface Props {
  mode: TransportMode;
  classes: string[];
  initial: SearchValues;
  quick: Record<string, boolean>;
  onQuickToggle: (key: string, on: boolean) => void;
  onSearch: (v: SearchValues) => void;
  onTripChange?: (trip: "round" | "oneway") => void;
  busy?: boolean;
}

export function SearchCard({ mode, classes, initial, quick, onQuickToggle, onSearch, onTripChange, busy }: Props) {
  const meta = MODES[mode];
  const [v, setV] = useState<SearchValues>(initial);
  const set = (patch: Partial<SearchValues>) => setV((s) => ({ ...s, ...patch }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    onSearch(v);
  }

  return (
    <form onSubmit={submit} className="mt-6 rounded-xl2 border border-line bg-surface p-4 shadow-card">
      <div className="mb-4 inline-flex gap-1 rounded-full bg-bg p-1">
        {(["round", "oneway"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => { set({ trip: t }); onTripChange?.(t); }}
            className={`rounded-full px-4 py-2 font-semibold transition-all ${
              v.trip === t ? "bg-surface text-brand shadow-soft" : "text-ink-soft"
            }`}
          >
            {t === "round" ? "Round trip" : "One way"}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 items-end gap-3 md:grid-cols-2 lg:grid-cols-[1.3fr_auto_1.3fr_1fr_1fr_1.2fr_auto]">
        <LocationInput
          mode={mode}
          label={meta.originLabel}
          placeholder={meta.placeholder}
          value={v.origin}
          onSelect={(loc) => set({ origin: loc })}
        />

        <button
          type="button"
          aria-label="Swap"
          title="Swap"
          onClick={() => set({ origin: v.destination, destination: v.origin })}
          className="mb-1.5 hidden h-10 w-10 self-end rounded-full border border-line bg-surface text-lg text-brand shadow-soft transition-transform hover:rotate-180 lg:block"
        >
          ⇄
        </button>

        <LocationInput
          mode={mode}
          label={meta.destLabel}
          placeholder={meta.placeholder}
          value={v.destination}
          onSelect={(loc) => set({ destination: loc })}
        />

        <Field label="Departure">
          <DatePicker value={v.depart} min={isoOffset(0)} onChange={(d) => set({ depart: d, ret: v.ret && v.ret < d ? d : v.ret })} />
        </Field>

        <Field label="Return">
          <DatePicker value={v.ret} min={v.depart} disabled={v.trip !== "round"} placeholder="Add return" onChange={(d) => set({ ret: d })} />
        </Field>

        <PassengerPicker
          pax={v.pax}
          serviceClass={v.serviceClass}
          classes={classes}
          classLabel={meta.classLabel}
          onChange={(pax, serviceClass) => set({ pax, serviceClass })}
        />

        <button
          type="submit"
          disabled={busy}
          className="h-11 whitespace-nowrap rounded-[10px] bg-brand px-6 font-semibold text-white transition-colors hover:bg-brand-dark disabled:opacity-60"
        >
          {busy ? "Searching…" : `Search ${meta.label.toLowerCase()}`}
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {QUICK.map((q) => (
          <label
            key={q.key}
            className={`flex cursor-pointer select-none items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold ${
              quick[q.key] ? "border-brand bg-brand-tint text-brand" : "border-line text-ink-soft"
            }`}
          >
            <input
              type="checkbox"
              className="accent-brand"
              checked={!!quick[q.key]}
              onChange={(e) => onQuickToggle(q.key, e.target.checked)}
            />
            {q.label}
          </label>
        ))}
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label className="text-[0.76rem] font-bold uppercase tracking-wide text-ink-soft">{label}</label>
      {children}
    </div>
  );
}
