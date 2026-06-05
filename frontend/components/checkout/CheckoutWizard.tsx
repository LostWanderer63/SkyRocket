"use client";

import { useEffect, useMemo, useState } from "react";
import type { BookingLeg, Passenger, PassengerCounts, Traveler } from "@/lib/types";
import { money } from "@/lib/format";
import { createBooking, listTravelers, addTraveler, validateCoupon } from "@/lib/api";
import { useAuth } from "../auth/AuthProvider";
import { SeatMap } from "./SeatMap";
import { TrainBerthMap } from "./TrainBerthMap";

interface Props {
  legs: BookingLeg[];
  pax: PassengerCounts;
  onClose: () => void;
}

type Step = "passengers" | "seats" | "review" | "done";

export function CheckoutWizard({ legs, pax, onClose }: Props) {
  const { user, signedIn } = useAuth();
  const seatCount = pax.adults + pax.children; // infants share a lap
  const totalPax = pax.adults + pax.children + pax.infants;

  const [step, setStep] = useState<Step>("passengers");
  const [passengers, setPassengers] = useState<Passenger[]>(
    Array.from({ length: totalPax }, (_, i) => ({
      name: "",
      age: i < pax.adults ? 30 : 8,
      gender: "M" as const,
    })),
  );
  // seats per leg id
  const [seats, setSeats] = useState<Record<string, string[]>>({});
  const [contactName, setContactName] = useState(user?.name ?? "");
  const [contactEmail, setContactEmail] = useState(user?.email ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refs, setRefs] = useState<string[]>([]);
  const [saved, setSaved] = useState<Traveler[]>([]);
  const [saveNew, setSaveNew] = useState(true);
  const [promo, setPromo] = useState("");
  const [coupon, setCoupon] = useState<{ code: string; discount: number; message: string } | null>(null);
  const [promoBusy, setPromoBusy] = useState(false);
  const [card, setCard] = useState({ number: "", exp: "", cvc: "" });

  // Load the user's saved travelers for one-tap autofill.
  useEffect(() => {
    if (!signedIn) return;
    listTravelers().then((r) => setSaved(r.results)).catch(() => setSaved([]));
  }, [signedIn]);

  function applySaved(i: number, id: string) {
    const t = saved.find((x) => x.id === id);
    if (t) setPax(i, { name: t.name, age: t.age, gender: t.gender });
  }

  const seatLegs = useMemo(() => legs.filter((l) => l.hasSeatMap), [legs]);
  const grandTotal = legs.reduce((sum, l) => sum + l.unitPrice * Math.max(1, totalPax), 0);
  const cur = legs[0]?.currency ?? "USD";
  const discount = coupon?.discount ?? 0;
  const payable = Math.max(0, grandTotal - discount);

  async function applyPromo() {
    if (!promo.trim()) return;
    setPromoBusy(true);
    try {
      const r = await validateCoupon(promo.trim(), grandTotal);
      setCoupon(r.valid ? { code: r.code!, discount: r.discount, message: r.message } : { code: "", discount: 0, message: r.message });
    } catch {
      setCoupon({ code: "", discount: 0, message: "Could not check code" });
    } finally { setPromoBusy(false); }
  }

  const setPax = (i: number, patch: Partial<Passenger>) =>
    setPassengers((ps) => ps.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));

  const passengersValid = passengers.every((p) => p.name.trim().length > 1 && p.age >= 0);
  const seatsValid = seatLegs.every((l) => (seats[l.title]?.length ?? 0) === seatCount);

  async function pay() {
    setBusy(true);
    setError(null);
    try {
      const created: string[] = [];
      for (let li = 0; li < legs.length; li++) {
        const leg = legs[li]!;
        const legSeats = seats[leg.title] ?? [];
        const paxForLeg: Passenger[] = passengers.map((p, i) => ({
          ...p,
          seat: i < legSeats.length ? legSeats[i] : undefined,
        }));
        const booking = await createBooking({
          mode: leg.mode,
          offerId: leg.offerId,
          fromCode: leg.fromCode,
          toCode: leg.toCode,
          fromCity: leg.fromCity,
          toCity: leg.toCity,
          date: leg.date,
          depTime: leg.depTime,
          arrTime: leg.arrTime,
          operator: leg.operator,
          trainNo: leg.trainNo,
          trainName: leg.trainName,
          cabin: leg.cabin,
          adults: pax.adults,
          children: pax.children,
          infants: pax.infants,
          passengers: paxForLeg,
          seats: legSeats,
          unitPrice: leg.unitPrice,
          currency: leg.currency,
          couponCode: li === 0 && coupon?.code ? coupon.code : undefined,
          contactName,
          contactEmail,
        });
        created.push(booking.reference);
      }
      // Persist any newly-typed travelers to the profile (deduped server-side).
      if (signedIn && saveNew) {
        const existing = new Set(saved.map((t) => `${t.name}|${t.age}|${t.gender}`));
        await Promise.allSettled(
          passengers
            .filter((p) => p.name.trim().length > 1 && !existing.has(`${p.name}|${p.age}|${p.gender}`))
            .map((p) => addTraveler({ name: p.name.trim(), age: p.age, gender: p.gender })),
        );
      }
      setRefs(created);
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Booking failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div className="flex max-h-[94vh] w-full max-w-[560px] flex-col rounded-t-xl2 bg-surface shadow-card sm:rounded-xl2" onClick={(e) => e.stopPropagation()}>
        {/* header */}
        <div className="flex items-center justify-between border-b border-line p-5">
          <div>
            <h3 className="text-lg font-bold">{step === "done" ? "Booking confirmed" : "Checkout"}</h3>
            {step !== "done" && <Steps step={step} hasSeats={seatLegs.length > 0} />}
          </div>
          <button onClick={onClose} aria-label="Close" className="text-2xl leading-none text-ink-soft hover:text-ink">×</button>
        </div>

        {/* body */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* trip summary */}
          {step !== "done" && (
            <div className="mb-4 grid gap-2">
              {legs.map((l) => (
                <div key={l.title} className="flex items-center justify-between rounded-xl2 border border-line bg-bg px-4 py-3 text-sm">
                  <div>
                    <p className="font-bold">{l.title}</p>
                    <p className="text-ink-soft">{l.subtitle} · {l.date} · {l.cabin}</p>
                  </div>
                  <span className="font-bold text-brand">{money(l.unitPrice, l.currency)}<span className="text-xs font-normal text-ink-soft">/pax</span></span>
                </div>
              ))}
            </div>
          )}

          {step === "passengers" && (
            <div className="grid gap-3">
              {passengers.map((p, i) => (
                <div key={i} className="rounded-xl2 border border-line p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-sm font-bold">Traveler {i + 1} {i >= pax.adults + pax.children ? "(infant)" : ""}</p>
                    {saved.length > 0 && (
                      <select defaultValue="" onChange={(e) => { applySaved(i, e.target.value); e.target.value = ""; }}
                        className="rounded-[8px] border border-line bg-bg px-2 py-1 text-xs font-semibold text-brand">
                        <option value="" disabled>Use saved…</option>
                        {saved.map((t) => <option key={t.id} value={t.id}>{t.name} · {t.age}{t.gender}</option>)}
                      </select>
                    )}
                  </div>
                  <div className="grid grid-cols-[1fr_80px_90px] gap-2">
                    <input value={p.name} onChange={(e) => setPax(i, { name: e.target.value })} placeholder="Full name" className="input" />
                    <input type="number" min={0} max={120} value={p.age} onChange={(e) => setPax(i, { age: Number(e.target.value) })} placeholder="Age" className="input" />
                    <select value={p.gender} onChange={(e) => setPax(i, { gender: e.target.value as Passenger["gender"] })} className="input">
                      <option value="M">Male</option>
                      <option value="F">Female</option>
                      <option value="O">Other</option>
                    </select>
                  </div>
                </div>
              ))}
              {signedIn && (
                <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-soft">
                  <input type="checkbox" checked={saveNew} onChange={(e) => setSaveNew(e.target.checked)} className="h-4 w-4 accent-brand" />
                  Save new travelers to my profile for next time
                </label>
              )}
            </div>
          )}

          {step === "seats" && (
            <div className="grid gap-5">
              {seatLegs.map((l) => (
                <div key={l.title}>
                  <p className="mb-2 font-bold">{l.title} <span className="font-normal text-ink-soft">— pick {seatCount} {l.mode === "train" ? "berth" : "seat"}{seatCount > 1 ? "s" : ""}</span></p>
                  {l.mode === "train" ? (
                    <TrainBerthMap classCode={l.cabin} legId={l.offerId ?? l.title} needed={seatCount}
                      selected={seats[l.title] ?? []} onChange={(s) => setSeats((m) => ({ ...m, [l.title]: s }))} />
                  ) : (
                    <SeatMap mode={l.mode} legId={l.offerId ?? l.title} needed={seatCount}
                      selected={seats[l.title] ?? []} onChange={(s) => setSeats((m) => ({ ...m, [l.title]: s }))} />
                  )}
                </div>
              ))}
            </div>
          )}

          {step === "review" && (
            <div className="grid gap-4">
              <div className="grid gap-2">
                <label className="text-[0.76rem] font-bold uppercase text-ink-soft">Contact details</label>
                <input value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Contact name" className="input" />
                <input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="Email for tickets" className="input" />
              </div>

              {/* promo code */}
              <div className="grid gap-2">
                <label className="text-[0.76rem] font-bold uppercase text-ink-soft">Promo code</label>
                <div className="flex gap-2">
                  <input value={promo} onChange={(e) => setPromo(e.target.value.toUpperCase())} placeholder="e.g. SAVE10" className="input flex-1 uppercase" />
                  <button type="button" onClick={applyPromo} disabled={promoBusy} className="rounded-[10px] border border-line px-4 font-semibold hover:bg-bg disabled:opacity-50">Apply</button>
                </div>
                {coupon && (
                  <p className={`text-sm ${coupon.discount > 0 ? "text-ok" : "text-red-600"}`}>{coupon.message}</p>
                )}
              </div>

              {/* mock card */}
              <div className="grid gap-2">
                <label className="text-[0.76rem] font-bold uppercase text-ink-soft">Card details <span className="text-ink-soft">(test mode)</span></label>
                <input value={card.number} onChange={(e) => setCard({ ...card, number: e.target.value.replace(/[^\d ]/g, "").slice(0, 19) })} placeholder="4242 4242 4242 4242" inputMode="numeric" className="input" />
                <div className="grid grid-cols-2 gap-2">
                  <input value={card.exp} onChange={(e) => setCard({ ...card, exp: e.target.value.replace(/[^\d/]/g, "").slice(0, 5) })} placeholder="MM/YY" className="input" />
                  <input value={card.cvc} onChange={(e) => setCard({ ...card, cvc: e.target.value.replace(/\D/g, "").slice(0, 4) })} placeholder="CVC" inputMode="numeric" className="input" />
                </div>
                <p className="text-xs text-ink-soft">Demo checkout — no real charge. Use any test card number.</p>
              </div>

              {/* price summary */}
              <div className="rounded-xl2 border border-line p-4 text-sm">
                <Line2 label="Subtotal" value={money(grandTotal, cur)} />
                {discount > 0 && <Line2 label={`Discount (${coupon?.code})`} value={`− ${money(discount, cur)}`} ok />}
                <div className="my-2 border-t border-line" />
                <Line2 label={<strong>Total payable</strong>} value={<strong className="text-brand">{money(payable, cur)}</strong>} />
              </div>
              <div className="rounded-xl2 border border-line p-4">
                <p className="mb-2 font-bold">Travelers</p>
                <ul className="grid gap-1 text-sm text-ink-soft">
                  {passengers.map((p, i) => (
                    <li key={i} className="flex justify-between">
                      <span>{p.name || `Traveler ${i + 1}`} · {p.age}{p.gender}</span>
                      <span>{seatLegs.map((l) => seats[l.title]?.[i]).filter(Boolean).join(" / ") || "—"}</span>
                    </li>
                  ))}
                </ul>
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
            </div>
          )}

          {step === "done" && (
            <div className="py-4 text-center">
              <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-[#eafaf0] text-3xl text-ok">✓</div>
              <h3 className="text-xl font-bold">You’re booked!</h3>
              <p className="mt-1 text-ink-soft">{totalPax} traveler{totalPax > 1 ? "s" : ""} · {money(payable, cur)}</p>
              <div className="mt-3 grid gap-1">
                {legs.map((l, i) => (
                  <p key={l.title} className="text-sm text-ink-soft">{l.title} — ref <strong className="text-ink">{refs[i]}</strong></p>
                ))}
              </div>
              <p className="mt-3 text-xs text-ink-soft">Saved to your account &amp; the backend database.</p>
            </div>
          )}
        </div>

        {/* footer */}
        <div className="flex items-center justify-between gap-3 border-t border-line p-5">
          {step === "done" ? (
            <button onClick={onClose} className="ml-auto rounded-[10px] bg-brand px-6 py-3 font-semibold text-white hover:bg-brand-dark">Done</button>
          ) : (
            <>
              <div>
                <p className="text-xs text-ink-soft">Total</p>
                <p className="text-xl font-extrabold text-brand">{money(payable, cur)}</p>
              </div>
              <div className="flex gap-2">
                {step !== "passengers" && (
                  <button onClick={() => setStep(step === "review" ? (seatLegs.length ? "seats" : "passengers") : "passengers")} className="rounded-[10px] border border-line px-4 py-3 font-semibold">Back</button>
                )}
                {step === "passengers" && (
                  <button disabled={!passengersValid} onClick={() => setStep(seatLegs.length ? "seats" : "review")} className="rounded-[10px] bg-brand px-6 py-3 font-semibold text-white hover:bg-brand-dark disabled:opacity-50">Continue</button>
                )}
                {step === "seats" && (
                  <button disabled={!seatsValid} onClick={() => setStep("review")} className="rounded-[10px] bg-brand px-6 py-3 font-semibold text-white hover:bg-brand-dark disabled:opacity-50">Continue</button>
                )}
                {step === "review" && (
                  <button disabled={busy || contactName.length < 2 || !contactEmail.includes("@")} onClick={pay} className="rounded-[10px] bg-brand px-6 py-3 font-semibold text-white hover:bg-brand-dark disabled:opacity-50">
                    {busy ? "Processing…" : `Pay ${money(payable, cur)}`}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Line2({ label, value, ok }: { label: React.ReactNode; value: React.ReactNode; ok?: boolean }) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span className="text-ink-soft">{label}</span>
      <span className={ok ? "text-ok" : ""}>{value}</span>
    </div>
  );
}

function Steps({ step, hasSeats }: { step: Step; hasSeats: boolean }) {
  const all: { key: Step; label: string }[] = [
    { key: "passengers", label: "Travelers" },
    ...(hasSeats ? [{ key: "seats" as Step, label: "Seats" }] : []),
    { key: "review", label: "Pay" },
  ];
  const idx = all.findIndex((s) => s.key === step);
  return (
    <div className="mt-1 flex items-center gap-1.5 text-xs text-ink-soft">
      {all.map((s, i) => (
        <span key={s.key} className="flex items-center gap-1.5">
          <span className={`font-semibold ${i <= idx ? "text-brand" : ""}`}>{i + 1}. {s.label}</span>
          {i < all.length - 1 && <span>›</span>}
        </span>
      ))}
    </div>
  );
}
