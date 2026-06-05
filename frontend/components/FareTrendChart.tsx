"use client";

import { useEffect, useState } from "react";
import type { FareTrend } from "@/lib/types";
import { fareTrend as fetchTrend } from "@/lib/api";
import { money } from "@/lib/format";

interface Props {
  mode: string;
  from: string;
  to: string;
  fromCity?: string;
  toCity?: string;
  cabin?: string;
}

export function FareTrendChart({ mode, from, to, fromCity, toCity, cabin }: Props) {
  const [trend, setTrend] = useState<FareTrend | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetchTrend({ mode, from, to, class: cabin, days: 14 })
      .then((t) => { if (alive) setTrend(t); })
      .catch(() => { if (alive) setTrend(null); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [mode, from, to, cabin]);

  const icon = mode === "train" ? "🚆" : mode === "bus" ? "🚌" : "✈";

  if (loading) return <div className="h-40 animate-pulse rounded-xl2 border border-line bg-surface" />;
  if (!trend || trend.min == null) return null;

  const { points, min, max, cheapestDate, currency } = trend;
  const span = Math.max(1, (max ?? 0) - (min ?? 0));

  return (
    <div className="rounded-xl2 border border-line bg-surface p-4 shadow-soft">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="font-bold">{icon} {fromCity ?? from} → {toCity ?? to}{cabin ? ` · ${cabin}` : ""}</p>
          <p className="text-xs text-ink-soft">Cheapest fare, next 14 days</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-extrabold text-brand">{money(min!, currency)}</p>
          <p className="text-xs text-ink-soft">from</p>
        </div>
      </div>

      <div className="flex h-28 items-end gap-1">
        {points.map((p) => {
          const h = p.price == null ? 0 : 18 + ((p.price - (min ?? 0)) / span) * 78;
          const isCheap = p.date === cheapestDate;
          const d = new Date(`${p.date}T00:00:00`).getDate();
          return (
            <div key={p.date} className="group relative flex flex-1 flex-col items-center justify-end gap-1">
              {p.price != null && (
                <span className="pointer-events-none absolute -top-5 whitespace-nowrap rounded bg-ink px-1.5 py-0.5 text-[0.62rem] font-bold text-white opacity-0 transition-opacity group-hover:opacity-100">
                  {money(p.price, currency)}
                </span>
              )}
              <div
                className={`w-full rounded-t transition-colors ${isCheap ? "bg-ok" : "bg-brand/35 group-hover:bg-brand"}`}
                style={{ height: `${h}%` }}
              />
              <span className={`text-[0.6rem] ${isCheap ? "font-bold text-ok" : "text-ink-soft"}`}>{p.weekday[0]}{d}</span>
            </div>
          );
        })}
      </div>

      <p className="mt-2 text-xs text-ink-soft">
        Cheapest on <strong className="text-ok">{cheapestDate}</strong> · range {money(min!, currency)}–{money(max!, currency)}
      </p>
    </div>
  );
}
