"use client";

import Link from "next/link";
import type { Tour } from "@/lib/types";
import { money } from "@/lib/format";
import { tourImage } from "@/lib/tourImage";

export function TourCard({ tour }: { tour: Tour }) {
  return (
    <Link
      href={`/tours/${tour.id}`}
      className="group flex animate-rise flex-col overflow-hidden rounded-xl2 border border-line bg-surface shadow-soft transition-all hover:-translate-y-1 hover:border-brand"
    >
      <div className="relative h-44 overflow-hidden" style={{ background: tour.image }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={tourImage(tour)} alt={tour.destination} loading="lazy"
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
        <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-xs font-bold text-ink">{tour.category}</span>
        <span className="absolute right-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-xs font-bold text-white">★ {tour.rating}</span>
        <div className="absolute bottom-0 w-full bg-gradient-to-t from-black/65 to-transparent p-3">
          <p className="text-sm font-semibold text-white">{tour.destination}</p>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="font-bold leading-snug group-hover:text-brand">{tour.title}</h3>
        <p className="line-clamp-2 text-sm text-ink-soft">{tour.summary}</p>

        <div className="mt-1 flex flex-wrap gap-1.5">
          {tour.highlights.slice(0, 3).map((h) => (
            <span key={h} className="rounded-full bg-bg px-2 py-0.5 text-[0.72rem] font-semibold text-ink-soft">{h}</span>
          ))}
        </div>

        <div className="mt-auto flex items-end justify-between pt-3">
          <div>
            <span className="text-xs text-ink-soft">from</span>
            <p className="text-xl font-extrabold text-brand">{money(tour.priceFrom)}</p>
          </div>
          <div className="text-right text-xs text-ink-soft">
            <p>{tour.durationDays} days</p>
            <p>{tour.reviews} reviews</p>
          </div>
        </div>
      </div>
    </Link>
  );
}
