"use client";

import type { TransportOffer } from "@/lib/types";
import { fmtDur, initials, money, stopLabel } from "@/lib/format";
import { MODES } from "@/lib/modes";

export function OfferCard({ offer, onSelect }: { offer: TransportOffer; onSelect: (o: TransportOffer) => void }) {
  const icon = MODES[offer.mode].icon;

  return (
    <article className="grid animate-rise grid-cols-1 gap-4 rounded-xl2 border border-line bg-surface p-5 shadow-soft transition-all hover:-translate-y-0.5 hover:border-brand sm:grid-cols-[1fr_auto]">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2.5">
          <span className="grid h-[34px] w-[34px] place-items-center rounded-lg text-[0.8rem] font-extrabold text-white" style={{ background: offer.operatorColor }}>
            {initials(offer.operator)}
          </span>
          <span className="font-bold">
            {offer.operator}
            <small className="block font-medium text-[0.78rem] text-ink-soft">{icon} {offer.vehicleNo} · {offer.serviceClass}</small>
          </span>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-center">
            <b className="block text-[1.15rem]">{offer.dep}</b>
            <span className="text-[0.8rem] text-ink-soft">{offer.from}</span>
          </div>
          <div className="flex-1 text-center text-[0.8rem] text-ink-soft">
            {fmtDur(offer.durMin)}
            <div className="relative my-1 h-0.5 bg-line">
              <span className="absolute -top-2.5 right-[-2px] text-[0.85rem] text-brand">{icon}</span>
            </div>
            {stopLabel(offer.stops, offer.mode)} · {offer.distanceKm} km
          </div>
          <div className="text-center">
            <b className="block text-[1.15rem]">{offer.arr}</b>
            <span className="text-[0.8rem] text-ink-soft">{offer.to}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <Tag tone={offer.stops === 0 ? "brand" : "muted"}>{stopLabel(offer.stops, offer.mode)}</Tag>
          {offer.amenities.slice(0, 3).map((a) => <Tag key={a} tone="muted">{a}</Tag>)}
          <Tag tone={offer.refundable ? "ok" : "muted"}>{offer.refundable ? "Refundable" : "Non-refundable"}</Tag>
          {offer.seatsLeft <= 4 && <Tag tone="accent">{offer.seatsLeft} seats left</Tag>}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-line pt-3 sm:flex-col sm:items-end sm:justify-between sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0">
        <div className="text-right">
          <b className="text-[1.6rem]">{money(offer.price, offer.currency)}</b>
          <small className="block text-[0.78rem] text-ink-soft">per traveler</small>
        </div>
        <span className="hidden text-[0.78rem] text-ink-soft sm:block">{offer.fromCity} → {offer.toCity}</span>
        <button onClick={() => onSelect(offer)} className="rounded-[10px] bg-brand px-5 py-2.5 font-semibold text-white transition-colors hover:bg-brand-dark">
          Select
        </button>
      </div>
    </article>
  );
}

function Tag({ children, tone }: { children: React.ReactNode; tone: "brand" | "ok" | "accent" | "muted" }) {
  const tones: Record<string, string> = {
    brand: "bg-brand-tint text-brand",
    ok: "bg-[#eafaf0] text-ok",
    accent: "bg-[#fff0e8] text-accent",
    muted: "bg-bg text-ink-soft",
  };
  return <span className={`rounded-full px-2.5 py-0.5 text-[0.74rem] font-semibold ${tones[tone]}`}>{children}</span>;
}
