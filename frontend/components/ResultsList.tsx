"use client";

import type { SortKey, TransportOffer } from "@/lib/types";
import { OfferCard } from "./OfferCard";

const SORTS: { value: SortKey; label: string }[] = [
  { value: "best", label: "Best" },
  { value: "cheapest", label: "Cheapest" },
  { value: "fastest", label: "Fastest" },
  { value: "early", label: "Earliest departure" },
];

interface Props {
  offers: TransportOffer[];
  total: number;
  loading: boolean;
  error: string | null;
  sort: SortKey;
  noun: string;
  onSort: (s: SortKey) => void;
  onSelect: (o: TransportOffer) => void;
  onOpenFilters: () => void;
  onReset: () => void;
}

export function ResultsList({ offers, total, loading, error, sort, noun, onSort, onSelect, onOpenFilters, onReset }: Props) {
  return (
    <section>
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="text-ink-soft">
          <strong className="text-[1.25rem] text-ink">{offers.length}</strong>
          {total > offers.length ? <span className="text-sm"> of {total}</span> : null} {noun} found
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onOpenFilters} className="rounded-[10px] border border-line bg-surface px-3 py-2 text-sm font-semibold lg:hidden">
            Filters
          </button>
          <div className="flex items-center gap-2 text-sm text-ink-soft">
            <label htmlFor="sort" className="hidden sm:block">Sort by</label>
            <select id="sort" value={sort} onChange={(e) => onSort(e.target.value as SortKey)}
              className="rounded-[10px] border border-line bg-surface px-3 py-2 font-medium text-ink">
              {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl2 border border-dashed border-line bg-surface p-12 text-center text-ink-soft">
          <p className="mb-1 font-semibold text-ink">Couldn’t load results</p>
          <p className="text-sm">{error}</p>
        </div>
      ) : loading ? (
        <div className="grid gap-4">
          {[0, 1, 2].map((i) => <div key={i} className="h-[170px] animate-pulse rounded-xl2 border border-line bg-surface" />)}
        </div>
      ) : offers.length === 0 ? (
        <div className="rounded-xl2 border border-dashed border-line bg-surface p-12 text-center text-ink-soft">
          <p className="mb-3">No {noun} match your search or filters.</p>
          <button onClick={onReset} className="rounded-[10px] px-4 py-2 font-semibold text-ink hover:bg-line">Reset filters</button>
        </div>
      ) : (
        <div className="grid gap-4">
          {offers.map((o) => <OfferCard key={o.id} offer={o} onSelect={onSelect} />)}
        </div>
      )}
    </section>
  );
}
