"use client";

import type { Booking } from "@/lib/types";
import { money } from "@/lib/format";
import { MODES } from "@/lib/modes";

function hash(s: string) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

// Deterministic faux-QR block from the booking reference (visual only).
function FauxQR({ seed }: { seed: string }) {
  const n = 21;
  const cells: boolean[] = [];
  let h = hash(seed);
  for (let i = 0; i < n * n; i++) { h = Math.imul(h ^ (h >>> 13), 0x5bd1e995); cells.push((h >>> 7 & 1) === 1); }
  return (
    <div className="grid h-24 w-24 grid-cols-[repeat(21,1fr)] overflow-hidden rounded bg-white p-1" aria-hidden>
      {cells.map((on, i) => <span key={i} className={on ? "bg-ink" : "bg-white"} />)}
    </div>
  );
}

export function ETicket({ booking }: { booking: Booking }) {
  const icon = booking.mode === "tour" ? "🏝" : MODES[booking.mode as "flight" | "train" | "bus"]?.icon ?? "🎫";
  const carrier = booking.trainName ? `${booking.trainNo} · ${booking.trainName}` : booking.operator ?? booking.mode;
  const seats: string[] = booking.seats ? JSON.parse(booking.seats) : [];
  const cancelled = booking.status === "cancelled";

  return (
    <div className="print-area overflow-hidden rounded-xl2 border border-line bg-surface shadow-soft">
      <div className="flex items-center justify-between px-5 py-3 text-white" style={{ background: "linear-gradient(135deg,#1f6feb,#7c3aed)" }}>
        <span className="font-extrabold">SkyRoute · e-ticket</span>
        <span className="text-sm opacity-90">{icon} {booking.mode.toUpperCase()}</span>
      </div>

      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-2xl font-extrabold">{booking.fromCity ?? booking.fromCode} <span className="text-ink-soft">→</span> {booking.toCity ?? booking.toCode}</p>
          <p className="mt-0.5 text-sm text-ink-soft">{carrier}</p>
          <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
            <Cell label="Date" value={booking.date ?? "—"} />
            <Cell label="Departs" value={booking.depTime ?? "—"} />
            <Cell label="Arrives" value={booking.arrTime ?? "—"} />
            <Cell label="Class" value={booking.cabin ?? "—"} />
            <Cell label="Seats" value={seats.length ? seats.join(", ") : "—"} />
            <Cell label="Paid" value={money(booking.totalPrice, booking.currency ?? "USD")} />
          </div>
        </div>
        <div className="flex flex-col items-center gap-2 border-t border-dashed border-line pt-4 sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0">
          <FauxQR seed={booking.reference} />
          <span className="font-mono text-sm font-bold tracking-wider">{booking.reference}</span>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold capitalize ${cancelled ? "bg-[#fdecec] text-red-600" : "bg-[#eafaf0] text-ok"}`}>{booking.status}</span>
        </div>
      </div>
    </div>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[0.68rem] font-bold uppercase tracking-wide text-ink-soft">{label}</p>
      <p className="font-semibold">{value}</p>
    </div>
  );
}
