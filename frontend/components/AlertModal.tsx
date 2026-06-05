"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { createAlert } from "@/lib/api";
import { money } from "@/lib/format";

interface Props {
  mode: string;
  from: string;
  to: string;
  fromCity?: string;
  toCity?: string;
  cabin?: string;
  currency: string;
  suggested?: number | null;
  onClose: () => void;
}

export function AlertModal({ mode, from, to, fromCity, toCity, cabin, currency, suggested, onClose }: Props) {
  const [target, setTarget] = useState(suggested ?? 0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await createAlert({ mode, fromCode: from, toCode: to, fromCity, toCity, cabin, targetPrice: Math.round(target), currency });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not set alert");
    } finally {
      setBusy(false);
    }
  }

  const modal = (
    <div className="fixed inset-0 z-[200] overflow-y-auto bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="w-full max-w-[420px] rounded-xl2 bg-surface p-6 shadow-card" onClick={(e) => e.stopPropagation()}>
          {!done ? (
            <>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-lg font-bold">🔔 Lowest-fare alert</h3>
                <button onClick={onClose} aria-label="Close" className="text-2xl leading-none text-ink-soft hover:text-ink">×</button>
              </div>
              <p className="text-sm text-ink-soft">
                Notify me when {mode} <strong className="text-ink">{fromCity ?? from} → {toCity ?? to}</strong>{cabin ? ` (${cabin})` : ""} drops to or below my target.
              </p>
              <form onSubmit={save} className="mt-4 grid gap-3">
                <label className="grid gap-1.5">
                  <span className="text-[0.76rem] font-bold uppercase text-ink-soft">Target price ({currency})</span>
                  <input type="number" min={1} value={target} onChange={(e) => setTarget(Number(e.target.value))} className="input" />
                </label>
                {suggested != null && <p className="text-xs text-ink-soft">Currently from {money(suggested, currency)}.</p>}
                {error && <p className="text-sm text-red-600">{error}</p>}
                <button type="submit" disabled={busy || target < 1} className="rounded-[10px] bg-brand py-3 font-semibold text-white hover:bg-brand-dark disabled:opacity-60">
                  {busy ? "Saving…" : "Set alert"}
                </button>
              </form>
            </>
          ) : (
            <div className="py-4 text-center">
              <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full bg-[#eafaf0] text-2xl text-ok">🔔</div>
              <h3 className="text-lg font-bold">Alert set!</h3>
              <p className="mt-1 text-sm text-ink-soft">We’ll watch {fromCity ?? from} → {toCity ?? to} for fares ≤ {money(target, currency)}. Track it on your profile.</p>
              <button onClick={onClose} className="mt-4 w-full rounded-[10px] bg-brand py-3 font-semibold text-white hover:bg-brand-dark">Done</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return mounted ? createPortal(modal, document.body) : null;
}
