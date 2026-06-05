"use client";

import { useState } from "react";
import type { TrainClassOption, TrainOffer } from "@/lib/types";
import { fmtDur, money } from "@/lib/format";

const TYPE_COLOR: Record<string, string> = {
  Rajdhani: "#7c3aed",
  Shatabdi: "#0ea5e9",
  Duronto: "#16a34a",
  Superfast: "#1f6feb",
  Exp: "#ff7a45",
  Express: "#ff7a45",
};

const AVAIL_TONE: Record<string, string> = {
  AVL: "bg-[#eafaf0] text-ok border-ok/30",
  RAC: "bg-[#fff7e6] text-[#b7791f] border-[#b7791f]/30",
  WL: "bg-[#fdecec] text-red-600 border-red-300",
};

export function TrainCard({ offer, onSelect }: { offer: TrainOffer; onSelect: (o: TrainOffer, c: TrainClassOption) => void }) {
  const [open, setOpen] = useState(false);
  const color = TYPE_COLOR[offer.trainType] ?? "#1f6feb";

  return (
    <article className="animate-rise rounded-xl2 border border-line bg-surface p-5 shadow-soft transition-colors hover:border-brand">
      {/* header */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-md px-2 py-0.5 text-xs font-bold text-white" style={{ background: color }}>{offer.trainType}</span>
        <span className="font-bold">{offer.trainNo} · {offer.trainName}</span>
        <span className="ml-auto text-xs text-ink-soft">Runs daily · {offer.distanceKm} km</span>
      </div>

      {/* route */}
      <div className="mt-3 flex items-center gap-4">
        <div className="text-center">
          <b className="block text-[1.3rem]">{offer.dep}</b>
          <span className="text-[0.8rem] text-ink-soft">{offer.from} · Day {offer.depDay}</span>
          <span className="block max-w-[120px] truncate text-[0.72rem] text-ink-soft">{offer.fromName}</span>
        </div>
        <div className="flex-1 text-center text-[0.8rem] text-ink-soft">
          {fmtDur(offer.durMin)}
          <div className="relative my-1 h-0.5 bg-line"><span className="absolute -top-2 right-[-2px] text-brand">🚆</span></div>
          {offer.timeline.length} halts
        </div>
        <div className="text-center">
          <b className="block text-[1.3rem]">{offer.arr}</b>
          <span className="text-[0.8rem] text-ink-soft">{offer.to} · Day {offer.arrDay}</span>
          <span className="block max-w-[120px] truncate text-[0.72rem] text-ink-soft">{offer.toName}</span>
        </div>
      </div>

      {/* classes */}
      <div className="mt-4 flex flex-wrap gap-2">
        {offer.classes.map((c) => (
          <button key={c.code} onClick={() => onSelect(offer, c)}
            className="group flex items-center gap-2 rounded-xl2 border border-line px-3 py-2 text-left transition-colors hover:border-brand hover:bg-brand-tint">
            <span className="text-sm font-bold">{c.code}</span>
            <span className="text-sm font-semibold text-brand">{money(c.fare, "INR")}</span>
            <span className={`rounded-full border px-1.5 py-0.5 text-[0.68rem] font-bold ${AVAIL_TONE[c.availability.status]}`}>{c.availability.label}</span>
          </button>
        ))}
      </div>

      {/* timeline toggle */}
      <button onClick={() => setOpen((v) => !v)} className="mt-3 text-sm font-semibold text-brand">
        {open ? "Hide" : "View"} schedule & halts {open ? "▴" : "▾"}
      </button>

      {open && (
        <ol className="mt-3 border-t border-line pt-3">
          {offer.timeline.map((s, i) => (
            <li key={`${s.code}-${i}`} className="flex items-center gap-3 py-1.5 text-sm">
              <span className="grid h-6 w-6 flex-shrink-0 place-items-center rounded-full bg-bg text-[0.7rem] font-bold text-ink-soft">{i + 1}</span>
              <span className="w-16 font-mono text-ink-soft">{s.arr ?? "—"}</span>
              <span className="w-16 font-mono font-semibold">{s.dep ?? "—"}</span>
              <span className="flex-1 truncate"><b>{s.code}</b> {s.name}</span>
              <span className="text-xs text-ink-soft">Day {s.day} · {s.km} km</span>
            </li>
          ))}
        </ol>
      )}
    </article>
  );
}
