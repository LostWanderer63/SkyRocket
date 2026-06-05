"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  value: string; // ISO yyyy-mm-dd
  onChange: (iso: string) => void;
  min?: string;
  max?: string;
  disabled?: boolean;
  placeholder?: string;
}

const WD = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const pad = (n: number) => String(n).padStart(2, "0");
const iso = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;
const todayISO = () => {
  const d = new Date();
  return iso(d.getFullYear(), d.getMonth(), d.getDate());
};

function fmt(isoStr: string): string {
  if (!isoStr) return "";
  const [y, m, d] = isoStr.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]!.slice(0, 3)} ${y}`; // e.g. "12 Jun 2026"
}

export function DatePicker({ value, onChange, min, max, disabled, placeholder = "Select date" }: Props) {
  const [open, setOpen] = useState(false);
  const init = value || min || todayISO();
  const [y0, m0] = init.split("-").map(Number);
  const [view, setView] = useState({ y: y0, m: (m0 ?? 1) - 1 }); // m is 0-based
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!value) return;
    const [vy, vm] = value.split("-").map(Number);
    setView({ y: vy, m: vm - 1 });
  }, [value]);

  useEffect(() => {
    function onDoc(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const first = new Date(view.y, view.m, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(first).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  const disabledDay = (d: number) => {
    const s = iso(view.y, view.m, d);
    if (min && s < min) return true;
    if (max && s > max) return true;
    return false;
  };
  const shift = (delta: number) => setView((v) => {
    const m = v.m + delta;
    return { y: v.y + Math.floor(m / 12), m: ((m % 12) + 12) % 12 };
  });

  const today = todayISO();

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={`input flex items-center justify-between gap-1 text-left ${disabled ? "pointer-events-none opacity-45" : ""}`}
      >
        <span className={`truncate ${value ? "" : "text-ink-soft"}`}>{value ? fmt(value) : placeholder}</span>
        <span className="flex-shrink-0 text-ink-soft">📅</span>
      </button>

      {open && (
        <div className="absolute left-0 top-[calc(100%+0.4rem)] z-40 w-[280px] max-w-[calc(100vw-2rem)] rounded-xl2 border border-line bg-surface p-3 shadow-card">
          <div className="mb-2 flex items-center justify-between">
            <button type="button" onClick={() => shift(-1)} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-bg" aria-label="Previous month">‹</button>
            <span className="text-sm font-bold">{MONTHS[view.m]} {view.y}</span>
            <button type="button" onClick={() => shift(1)} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-bg" aria-label="Next month">›</button>
          </div>

          <div className="mb-1 grid grid-cols-7 text-center text-[0.66rem] font-bold uppercase text-ink-soft">
            {WD.map((d) => <span key={d}>{d}</span>)}
          </div>

          <div className="grid grid-cols-7 gap-0.5">
            {cells.map((d, i) => {
              if (d === null) return <span key={i} />;
              const s = iso(view.y, view.m, d);
              const sel = s === value;
              const isToday = s === today;
              const off = disabledDay(d);
              return (
                <button
                  key={i}
                  type="button"
                  disabled={off}
                  onClick={() => { onChange(s); setOpen(false); }}
                  className={`grid h-9 place-items-center rounded-lg text-sm transition-colors ${
                    sel ? "bg-brand font-bold text-white"
                    : off ? "cursor-not-allowed text-ink-soft/30"
                    : "hover:bg-brand-tint"} ${isToday && !sel ? "font-bold text-brand ring-1 ring-inset ring-brand/40" : ""}`}
                >
                  {d}
                </button>
              );
            })}
          </div>

          <div className="mt-2 flex justify-between border-t border-line pt-2 text-xs">
            <button type="button" onClick={() => { const t = today; if (!min || t >= min) { onChange(t); setOpen(false); } }} className="font-semibold text-brand">Today</button>
            <button type="button" onClick={() => setOpen(false)} className="font-semibold text-ink-soft">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
