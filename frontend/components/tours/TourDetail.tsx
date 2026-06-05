"use client";

import { useState } from "react";
import Link from "next/link";
import type { Tour } from "@/lib/types";
import { money } from "@/lib/format";
import { createBooking } from "@/lib/api";
import { tourImage } from "@/lib/tourImage";
import { DatePicker } from "../DatePicker";

export function TourDetail({ tour }: { tour: Tour }) {
  const [travelers, setTravelers] = useState(2);
  const [date, setDate] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ref, setRef] = useState<string | null>(null);

  const total = travelers * tour.priceFrom;

  async function book(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const booking = await createBooking({
        mode: "tour",
        tourId: tour.id,
        date: date || undefined,
        adults: travelers,
        children: 0,
        infants: 0,
        unitPrice: tour.priceFrom,
        contactName: name,
        contactEmail: email,
      });
      setRef(booking.reference);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Booking failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="py-8">
      <div className="mx-auto w-[92vw] max-w-[1180px]">
        <Link href="/tours" className="mb-4 inline-block text-sm font-semibold text-brand">← All tours</Link>

        <div className="relative mb-6 flex h-60 items-end overflow-hidden rounded-xl2 p-6 sm:h-72" style={{ background: tour.image }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={tourImage(tour, 1200, 500)} alt={tour.destination} className="absolute inset-0 h-full w-full object-cover"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
          <div className="absolute inset-0 bg-gradient-to-t from-black/65 to-transparent" />
          <div className="relative">
            <span className="rounded-full bg-white/90 px-2.5 py-1 text-xs font-bold text-ink">{tour.category}</span>
            <h1 className="mt-2 text-3xl font-extrabold text-white">{tour.title}</h1>
            <p className="text-white/90">{tour.destination} · {tour.durationDays} days · ★ {tour.rating} ({tour.reviews})</p>
          </div>
        </div>

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[1fr_360px]">
          <div className="flex flex-col gap-6">
            <section className="rounded-xl2 border border-line bg-surface p-5">
              <h2 className="mb-2 text-lg font-bold">Overview</h2>
              <p className="text-ink-soft">{tour.summary}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {tour.highlights.map((h) => <span key={h} className="rounded-full bg-brand-tint px-3 py-1 text-sm font-semibold text-brand">{h}</span>)}
              </div>
            </section>

            <section className="rounded-xl2 border border-line bg-surface p-5">
              <h2 className="mb-3 text-lg font-bold">Day-by-day itinerary</h2>
              <ol className="flex flex-col gap-3">
                {tour.itinerary.map((day, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="grid h-7 w-7 flex-shrink-0 place-items-center rounded-full bg-brand text-sm font-bold text-white">{i + 1}</span>
                    <span className="pt-0.5">{day}</span>
                  </li>
                ))}
              </ol>
            </section>

            <section className="rounded-xl2 border border-line bg-surface p-5">
              <h2 className="mb-3 text-lg font-bold">What’s included</h2>
              <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {tour.includes.map((inc) => (
                  <li key={inc} className="flex items-center gap-2 text-ink-soft"><span className="text-ok">✓</span> {inc}</li>
                ))}
              </ul>
            </section>
          </div>

          {/* booking sidebar */}
          <aside className="rounded-xl2 border border-line bg-surface p-5 shadow-soft lg:sticky lg:top-[90px]">
            {!ref ? (
              <form onSubmit={book}>
                <p className="text-sm text-ink-soft">from</p>
                <p className="text-3xl font-extrabold text-brand">{money(tour.priceFrom)}<span className="text-sm font-normal text-ink-soft"> /person</span></p>

                <div className="mt-4 flex flex-col gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[0.76rem] font-bold uppercase text-ink-soft">Start date</label>
                    <DatePicker value={date} min={new Date().toISOString().slice(0, 10)} placeholder="Pick a start date" onChange={setDate} />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-[0.76rem] font-bold uppercase text-ink-soft">Travelers</label>
                    <div className="flex items-center gap-2.5">
                      <button type="button" onClick={() => setTravelers((t) => Math.max(1, t - 1))} className="grid h-8 w-8 place-items-center rounded-lg border border-line text-lg text-brand">−</button>
                      <span className="w-6 text-center font-bold">{travelers}</span>
                      <button type="button" onClick={() => setTravelers((t) => Math.min(12, t + 1))} className="grid h-8 w-8 place-items-center rounded-lg border border-line text-lg text-brand">+</button>
                    </div>
                  </div>
                  <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Lead traveler name" className="input" />
                  <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email for confirmation" className="input" />
                </div>

                <div className="my-4 flex items-center justify-between border-t border-line pt-4">
                  <span className="font-semibold">Total</span>
                  <span className="text-xl font-extrabold text-brand">{money(total)}</span>
                </div>

                {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
                <button type="submit" disabled={busy} className="w-full rounded-[10px] bg-brand py-3 font-semibold text-white hover:bg-brand-dark disabled:opacity-60">
                  {busy ? "Processing…" : "Book this trip"}
                </button>
              </form>
            ) : (
              <div className="py-4 text-center">
                <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full bg-[#eafaf0] text-2xl text-ok">✓</div>
                <h3 className="text-lg font-bold">Trip booked!</h3>
                <p className="mt-1 text-sm text-ink-soft">{travelers} traveler{travelers > 1 ? "s" : ""} · {money(total)}</p>
                <p className="mt-1 text-sm text-ink-soft">Reference: <strong className="text-ink">{ref}</strong></p>
              </div>
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}
