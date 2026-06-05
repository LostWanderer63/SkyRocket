"use client";

import { useEffect, useRef, useState } from "react";
import type { Location, TransportMode } from "@/lib/types";
import { searchLocations } from "@/lib/api";

interface Props {
  mode: TransportMode;
  label: string;
  placeholder: string;
  value: Location | null;
  onSelect: (loc: Location) => void;
}

export function LocationInput({ mode, label, placeholder, value, onSelect }: Props) {
  const [text, setText] = useState(value ? `${value.city} (${value.code})` : "");
  const [options, setOptions] = useState<Location[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Keep text in sync when the parent swaps origin/destination.
  useEffect(() => {
    setText(value ? `${value.city} (${value.code})` : "");
  }, [value]);

  // Reset typed text when the transport mode changes (datasets differ).
  useEffect(() => {
    setOptions([]);
  }, [mode]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function query(q: string) {
    setText(q);
    setOpen(true);
    setActive(0);
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    // Debounce via a short timeout tied to this controller.
    const handle = setTimeout(async () => {
      try {
        const { results } = await searchLocations(mode, q, ctrl.signal);
        setOptions(results);
      } catch {
        /* aborted or failed — ignore */
      } finally {
        setLoading(false);
      }
    }, 180);
    ctrl.signal.addEventListener("abort", () => clearTimeout(handle));
  }

  function choose(loc: Location) {
    onSelect(loc);
    setText(`${loc.city} (${loc.code})`);
    setOpen(false);
  }

  function onKey(e: React.KeyboardEvent) {
    if (!open || !options.length) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => (a + 1) % options.length); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => (a - 1 + options.length) % options.length); }
    else if (e.key === "Enter") { e.preventDefault(); const o = options[active]; if (o) choose(o); }
    else if (e.key === "Escape") setOpen(false);
  }

  return (
    <div className="relative flex min-w-0 flex-col gap-1.5" ref={ref}>
      <label className="text-[0.76rem] font-bold uppercase tracking-wide text-ink-soft">{label}</label>
      <input
        value={text}
        onChange={(e) => query(e.target.value)}
        onFocus={() => { setOpen(true); if (!options.length) query(text); }}
        onKeyDown={onKey}
        placeholder={placeholder}
        autoComplete="off"
        className="input"
      />

      {open && (text.length > 0 || options.length > 0) && (
        <ul className="absolute top-[calc(100%+0.35rem)] z-40 max-h-72 w-[320px] max-w-[88vw] overflow-y-auto rounded-xl2 border border-line bg-surface py-1 shadow-card">
          {loading && options.length === 0 && (
            <li className="px-3 py-2 text-sm text-ink-soft">Searching…</li>
          )}
          {!loading && options.length === 0 && (
            <li className="px-3 py-2 text-sm text-ink-soft">No matches</li>
          )}
          {options.map((o, i) => (
            <li key={`${o.mode}-${o.code}`}>
              <button
                type="button"
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(o)}
                className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left ${
                  i === active ? "bg-brand-tint" : ""
                }`}
              >
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{o.city}</span>
                  <span className="block truncate text-xs text-ink-soft">{o.name} · {o.country}</span>
                </span>
                <span className="rounded bg-bg px-1.5 py-0.5 text-xs font-bold text-ink-soft">{o.code}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
