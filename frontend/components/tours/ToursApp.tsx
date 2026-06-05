"use client";

import { useCallback, useEffect, useState } from "react";
import type { Tour } from "@/lib/types";
import { listTours } from "@/lib/api";
import { TourCard } from "./TourCard";

export function ToursApp() {
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("All");
  const [sort, setSort] = useState("popular");
  const [maxPrice, setMaxPrice] = useState(4000);
  const [tours, setTours] = useState<Tour[]>([]);
  const [categories, setCategories] = useState<string[]>(["All"]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listTours({ q, category, sort, maxPrice });
      setTours(data.results);
      setCategories(data.categories);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tours");
    } finally {
      setLoading(false);
    }
  }, [q, category, sort, maxPrice]);

  useEffect(() => {
    const t = setTimeout(run, 150);
    return () => clearTimeout(t);
  }, [run]);

  return (
    <>
      <section className="pb-6 pt-12 [background:radial-gradient(1200px_380px_at_80%_-10%,rgba(255,122,69,0.18),transparent_60%),linear-gradient(180deg,#fff4ee,#f5f7fb)] dark:[background:radial-gradient(1200px_380px_at_80%_-10%,rgba(255,122,69,0.20),transparent_60%),linear-gradient(180deg,#2a1a12,#0d1320)]">
        <div className="mx-auto w-[92vw] max-w-[1180px]">
          <p className="mb-1.5 text-[0.78rem] font-bold uppercase tracking-wider text-accent">Curated tour packages</p>
          <h1 className="mb-2.5 text-[clamp(1.9rem,4vw,2.9rem)] font-extrabold leading-[1.1] tracking-tight">Handpicked trips, fully planned for you</h1>
          <p className="max-w-[640px] text-[1.05rem] text-ink-soft">Multi-day adventures, cultural escapes and beach breaks — flights, stays and guided days bundled into one price.</p>

          <div className="mt-6 grid gap-3 rounded-xl2 border border-line bg-surface p-4 shadow-card sm:grid-cols-[1.6fr_1fr_1fr]">
            <div className="flex flex-col gap-1.5">
              <label className="text-[0.76rem] font-bold uppercase tracking-wide text-ink-soft">Search</label>
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Destination, country or trip" className="input" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[0.76rem] font-bold uppercase tracking-wide text-ink-soft">Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="input">
                {categories.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[0.76rem] font-bold uppercase tracking-wide text-ink-soft">Sort</label>
              <select value={sort} onChange={(e) => setSort(e.target.value)} className="input">
                <option value="popular">Most popular</option>
                <option value="cheapest">Cheapest</option>
                <option value="rating">Top rated</option>
                <option value="shortest">Shortest</option>
              </select>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-3 rounded-xl2 border border-line bg-surface px-4 py-3 shadow-soft">
            <label className="text-sm font-semibold text-ink-soft">Max budget</label>
            <input type="range" min={800} max={4000} step={100} value={maxPrice} onChange={(e) => setMaxPrice(Number(e.target.value))} className="flex-1 accent-brand" />
            <span className="w-20 text-right font-bold text-brand">${maxPrice}</span>
          </div>
        </div>
      </section>

      <main className="py-8">
        <div className="mx-auto w-[92vw] max-w-[1180px]">
          <div className="mb-4 text-ink-soft"><strong className="text-[1.25rem] text-ink">{tours.length}</strong> packages</div>

          {error ? (
            <div className="rounded-xl2 border border-dashed border-line bg-surface p-12 text-center text-ink-soft">{error}</div>
          ) : loading ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="h-80 animate-pulse rounded-xl2 border border-line bg-surface" />)}
            </div>
          ) : tours.length === 0 ? (
            <div className="rounded-xl2 border border-dashed border-line bg-surface p-12 text-center text-ink-soft">No packages match your filters.</div>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {tours.map((t) => <TourCard key={t.id} tour={t} />)}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
