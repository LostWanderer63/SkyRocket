"use client";

import type { OfferFilters } from "@/lib/types";
import { money } from "@/lib/format";

interface Props {
  filters: OfferFilters;
  operators: string[];
  classes: string[];
  priceCeiling: number;
  stopWord: string;
  onChange: (f: OfferFilters) => void;
  onClear: () => void;
}

const TIMES: { value: OfferFilters["times"][number]; label: string; hint: string }[] = [
  { value: "morning", label: "Morning", hint: "6–12" },
  { value: "afternoon", label: "Afternoon", hint: "12–18" },
  { value: "evening", label: "Evening", hint: "18–24" },
];

export function Filters({ filters, operators, classes, priceCeiling, stopWord, onChange, onClear }: Props) {
  function toggle<T>(arr: T[], value: T): T[] {
    return arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
  }
  const cap = Math.max(priceCeiling, 100);
  const maxPrice = Math.min(filters.maxPrice, cap);

  return (
    <aside className="rounded-xl2 border border-line bg-surface p-5 lg:sticky lg:top-[90px]">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-[1.05rem] font-bold">Filters</h3>
        <button onClick={onClear} className="font-semibold text-brand">Clear all</button>
      </div>

      <Block title={`${stopWord}s`}>
        {[
          { v: 0, label: stopWord === "Stop" ? "Non-stop" : "Direct" },
          { v: 1, label: `1 ${stopWord.toLowerCase()}` },
          { v: 2, label: `2+ ${stopWord.toLowerCase()}s` },
        ].map((s) => (
          <Check key={s.v} label={s.label} checked={filters.stops.includes(s.v)}
            onChange={() => onChange({ ...filters, stops: toggle(filters.stops, s.v) })} />
        ))}
      </Block>

      <Block title={<span className="flex w-full justify-between">Max price <span className="font-bold text-brand">{money(maxPrice)}</span></span>}>
        <input type="range" min={Math.min(50, cap)} max={cap} step={10} value={maxPrice}
          onChange={(e) => onChange({ ...filters, maxPrice: Number(e.target.value) })}
          className="w-full accent-brand" />
      </Block>

      <Block title="Departure time">
        {TIMES.map((t) => (
          <Check key={t.value} label={t.label} hint={t.hint} checked={filters.times.includes(t.value)}
            onChange={() => onChange({ ...filters, times: toggle(filters.times, t.value) })} />
        ))}
      </Block>

      {operators.length > 0 && (
        <Block title="Operators">
          {operators.map((o) => (
            <Check key={o} label={o} checked={filters.operators.includes(o)}
              onChange={() => onChange({ ...filters, operators: toggle(filters.operators, o) })} />
          ))}
        </Block>
      )}

      {classes.length > 0 && (
        <Block title="Class">
          {classes.map((c) => (
            <Check key={c} label={c} checked={filters.classes.includes(c)}
              onChange={() => onChange({ ...filters, classes: toggle(filters.classes, c) })} />
          ))}
        </Block>
      )}

      <Block title="Options">
        <Check label="Refundable only" checked={filters.refundable}
          onChange={() => onChange({ ...filters, refundable: !filters.refundable })} />
      </Block>
    </aside>
  );
}

function Block({ title, children }: { title: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="border-t border-line py-4">
      <h4 className="mb-2.5 flex justify-between text-[0.9rem] font-bold">{title}</h4>
      {children}
    </div>
  );
}

function Check({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: () => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 py-1 text-[0.92rem]">
      <input type="checkbox" checked={checked} onChange={onChange} className="h-4 w-4 accent-brand" />
      {label}
      {hint && <small className="ml-auto text-ink-soft">{hint}</small>}
    </label>
  );
}
