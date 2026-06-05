"use client";

import { useEffect, useRef, useState } from "react";
import type { PassengerCounts } from "@/lib/types";

interface Props {
  pax: PassengerCounts;
  serviceClass: string;
  classes: string[];
  classLabel: string;
  showInfants?: boolean;
  onChange: (pax: PassengerCounts, serviceClass: string) => void;
}

export function PassengerPicker({ pax, serviceClass, classes, classLabel, showInfants = true, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const total = pax.adults + pax.children + (showInfants ? pax.infants : 0);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function step(key: keyof PassengerCounts, delta: number) {
    const min = key === "adults" ? 1 : 0;
    const next = { ...pax, [key]: Math.max(min, pax[key] + delta) };
    if (next.adults + next.children + next.infants > 9) return;
    onChange(next, serviceClass);
  }

  return (
    <div className="relative flex flex-col gap-1.5" ref={ref}>
      <label className="text-[0.76rem] font-bold uppercase tracking-wide text-ink-soft">
        Passengers &amp; {classLabel.toLowerCase()}
      </label>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-11 items-center justify-between rounded-[10px] border border-line bg-surface px-3 text-left focus:border-brand focus:outline focus:outline-2 focus:outline-brand-tint"
      >
        <span className="truncate">
          {total} {total > 1 ? "travelers" : "traveler"} · {serviceClass}
        </span>
        <span className="text-ink-soft">▾</span>
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+0.4rem)] z-30 grid w-[300px] max-w-[88vw] gap-3.5 rounded-xl2 border border-line bg-surface p-4 shadow-card">
          <Row label="Adults" hint="12+ years" value={pax.adults} min={1} total={total} onStep={(d) => step("adults", d)} />
          <Row label="Children" hint="2–11 years" value={pax.children} min={0} total={total} onStep={(d) => step("children", d)} />
          {showInfants && (
            <Row label="Infants" hint="Under 2" value={pax.infants} min={0} total={total} onStep={(d) => step("infants", d)} />
          )}

          <div className="flex flex-col gap-1.5 border-t border-line pt-3">
            <label className="text-[0.76rem] font-bold uppercase text-ink-soft">{classLabel}</label>
            <select
              value={serviceClass}
              onChange={(e) => onChange(pax, e.target.value)}
              className="rounded-[10px] border border-line bg-surface px-3 py-2.5 focus:border-brand focus:outline-none"
            >
              {classes.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-[10px] bg-brand py-2.5 font-semibold text-white hover:bg-brand-dark"
          >
            Done
          </button>
        </div>
      )}
    </div>
  );
}

function Row({
  label,
  hint,
  value,
  min,
  total,
  onStep,
}: {
  label: string;
  hint: string;
  value: number;
  min: number;
  total: number;
  onStep: (d: number) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <strong className="block text-[0.95rem]">{label}</strong>
        <small className="text-[0.78rem] text-ink-soft">{hint}</small>
      </div>
      <div className="flex items-center gap-2.5">
        <StepBtn disabled={value <= min} onClick={() => onStep(-1)}>−</StepBtn>
        <span className="min-w-[18px] text-center font-bold">{value}</span>
        <StepBtn disabled={total >= 9} onClick={() => onStep(1)}>+</StepBtn>
      </div>
    </div>
  );
}

function StepBtn({ children, disabled, onClick }: { children: React.ReactNode; disabled?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="grid h-[30px] w-[30px] place-items-center rounded-lg border border-line bg-surface text-lg leading-none text-brand disabled:cursor-not-allowed disabled:opacity-35"
    >
      {children}
    </button>
  );
}
