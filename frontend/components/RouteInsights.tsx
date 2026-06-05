"use client";

import { useState } from "react";
import { fareTrend } from "@/lib/api";
import { useAuth } from "./auth/AuthProvider";
import { FareTrendChart } from "./FareTrendChart";
import { AlertModal } from "./AlertModal";

interface Props {
  mode: string;
  from: string;
  to: string;
  fromCity?: string;
  toCity?: string;
  cabin?: string;
  currency: string;
}

export function RouteInsights({ mode, from, to, fromCity, toCity, cabin, currency }: Props) {
  const { signedIn } = useAuth();
  const [showTrend, setShowTrend] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [suggested, setSuggested] = useState<number | null>(null);

  if (!from || !to) return null;

  async function openAlert() {
    try {
      const t = await fareTrend({ mode, from, to, class: cabin, days: 14 });
      setSuggested(t.min);
    } catch { /* ignore */ }
    setAlertOpen(true);
  }

  return (
    <div className="mb-4 rounded-xl2 border border-line bg-surface p-3">
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={() => setShowTrend((v) => !v)}
          className="rounded-full border border-line px-3 py-1.5 text-sm font-semibold hover:border-brand hover:text-brand">
          📈 {showTrend ? "Hide" : "Show"} fare trend
        </button>
        {signedIn ? (
          <button onClick={openAlert}
            className="rounded-full border border-line px-3 py-1.5 text-sm font-semibold hover:border-brand hover:text-brand">
            🔔 Set price alert
          </button>
        ) : (
          <span className="text-xs text-ink-soft">Sign in to set a lowest-fare alert</span>
        )}
        <span className="ml-auto text-xs text-ink-soft">{fromCity ?? from} → {toCity ?? to}{cabin ? ` · ${cabin}` : ""}</span>
      </div>

      {showTrend && (
        <div className="mt-3">
          <FareTrendChart mode={mode} from={from} to={to} fromCity={fromCity} toCity={toCity} cabin={cabin} />
        </div>
      )}

      {alertOpen && (
        <AlertModal mode={mode} from={from} to={to} fromCity={fromCity} toCity={toCity} cabin={cabin}
          currency={currency} suggested={suggested} onClose={() => setAlertOpen(false)} />
      )}
    </div>
  );
}
