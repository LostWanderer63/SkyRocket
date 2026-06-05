"use client";

import { useState } from "react";
import type { Booking } from "@/lib/types";
import { getBooking, emailTicket, cancelBooking } from "@/lib/api";
import { ETicket } from "./ETicket";

export function PnrLookup() {
  const [ref, setRef] = useState("");
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function lookup(e: React.FormEvent) {
    e.preventDefault();
    if (!ref.trim()) return;
    setLoading(true); setError(null); setNote(null); setBooking(null);
    try {
      setBooking(await getBooking(ref.trim().toUpperCase()));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lookup failed");
    } finally {
      setLoading(false);
    }
  }

  async function doEmail() {
    if (!booking) return;
    setBusy(true); setNote(null);
    try { const r = await emailTicket(booking.reference); setNote(`Ticket sent to ${r.sentTo}.`); }
    catch (err) { setNote(err instanceof Error ? err.message : "Could not email ticket"); }
    finally { setBusy(false); }
  }

  async function doCancel() {
    if (!booking || booking.status === "cancelled") return;
    if (!confirm(`Cancel booking ${booking.reference}? This refunds the full amount.`)) return;
    setBusy(true); setNote(null);
    try {
      const r = await cancelBooking(booking.reference);
      setBooking(r);
      setNote(r.refund ? `Cancelled — refund of ${r.refund.amount} ${r.refund.currency} in ${r.refund.eta}.` : "Booking cancelled.");
    } catch (err) {
      setNote(err instanceof Error ? err.message : "Could not cancel");
    } finally { setBusy(false); }
  }

  return (
    <main className="mx-auto w-[92vw] max-w-[760px] py-10">
      <h1 className="text-3xl font-extrabold">Manage booking / PNR status</h1>
      <p className="mt-1 text-ink-soft">Enter your booking reference (e.g. TR-AB12CD) for your e-ticket, status and actions.</p>

      <form onSubmit={lookup} className="mt-5 flex flex-col gap-2 sm:flex-row print:hidden">
        <input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="Booking reference / PNR" className="input flex-1 uppercase" />
        <button disabled={loading} className="rounded-[10px] bg-brand px-6 py-3 font-semibold text-white hover:bg-brand-dark disabled:opacity-60">
          {loading ? "Checking…" : "Find booking"}
        </button>
      </form>

      {error && <p className="mt-4 rounded-xl2 border border-dashed border-line bg-surface p-6 text-center text-ink-soft print:hidden">{error}</p>}

      {booking && (
        <div className="mt-6 grid gap-3">
          <ETicket booking={booking} />
          {note && <p className="rounded-lg bg-brand-tint px-3 py-2 text-sm text-brand print:hidden">{note}</p>}
          <div className="flex flex-wrap gap-2 print:hidden">
            <button onClick={() => window.print()} className="rounded-[10px] bg-brand px-5 py-2.5 font-semibold text-white hover:bg-brand-dark">Print / Save PDF</button>
            <button onClick={doEmail} disabled={busy} className="rounded-[10px] border border-line px-5 py-2.5 font-semibold hover:bg-bg disabled:opacity-60">Email ticket</button>
            {booking.status !== "cancelled" && (
              <button onClick={doCancel} disabled={busy} className="ml-auto rounded-[10px] border border-red-300 px-5 py-2.5 font-semibold text-red-600 hover:bg-[#fdecec] disabled:opacity-60">Cancel & refund</button>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
