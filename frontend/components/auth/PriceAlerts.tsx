"use client";

import { useEffect, useState } from "react";
import type { PriceAlert } from "@/lib/types";
import { listAlerts, deleteAlert } from "@/lib/api";
import { money } from "@/lib/format";
import { MODES } from "@/lib/modes";

export function PriceAlerts() {
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listAlerts().then((r) => setAlerts(r.results)).catch(() => setAlerts([])).finally(() => setLoading(false));
  }, []);

  async function remove(id: string) {
    await deleteAlert(id);
    setAlerts((list) => list.filter((a) => a.id !== id));
  }

  if (loading) return <div className="h-24 animate-pulse rounded-xl2 border border-line bg-surface" />;
  if (alerts.length === 0) {
    return (
      <div className="rounded-xl2 border border-dashed border-line bg-surface p-10 text-center text-ink-soft">
        No price alerts yet. Open any search, hit <strong className="text-ink">🔔 Set price alert</strong>, and track it here.
      </div>
    );
  }

  return (
    <section className="rounded-xl2 border border-line bg-surface p-5 shadow-soft">
      <h2 className="mb-1 text-lg font-bold">🔔 Price alerts</h2>
      <p className="mb-3 text-sm text-ink-soft">We watch these routes and flag when the fare hits your target.</p>
      <div className="grid gap-2">
        {alerts.map((a) => {
          const icon = MODES[a.mode as "flight" | "train" | "bus"]?.icon ?? "🎫";
          return (
            <div key={a.id} className="flex flex-wrap items-center gap-3 rounded-xl2 border border-line bg-bg px-4 py-3 text-sm">
              <span className="text-lg">{icon}</span>
              <span className="font-bold">{a.fromCity ?? a.fromCode} → {a.toCity ?? a.toCode}</span>
              {a.cabin && <span className="rounded bg-surface px-1.5 py-0.5 text-xs font-semibold text-ink-soft">{a.cabin}</span>}
              <span className="text-ink-soft">target {money(a.targetPrice, a.currency)}</span>
              <span className="text-ink-soft">· now {a.currentPrice != null ? money(a.currentPrice, a.currency) : "—"}</span>
              {a.triggered ? (
                <span className="rounded-full bg-[#eafaf0] px-2.5 py-1 text-xs font-bold text-ok">● Price hit!</span>
              ) : (
                <span className="rounded-full bg-bg px-2.5 py-1 text-xs font-bold text-ink-soft">Watching</span>
              )}
              <button onClick={() => remove(a.id)} className="ml-auto rounded-[8px] px-2 py-1 text-xs font-semibold text-red-600 hover:bg-[#fdecec]">Remove</button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
