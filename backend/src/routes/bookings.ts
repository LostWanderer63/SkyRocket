import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authOptional, authRequired } from "../lib/auth.js";
import { applyCoupon } from "../lib/coupons.js";
import { sendMail, ticketEmail } from "../lib/mailer.js";

export const bookingsRouter = Router();

const passengerSchema = z.object({
  name: z.string().min(1),
  age: z.coerce.number().int().min(0).max(120),
  gender: z.enum(["M", "F", "O"]),
  seat: z.string().optional(),
});

const bookingSchema = z.object({
  mode: z.enum(["flight", "train", "bus", "tour"]),
  offerId: z.string().optional(),
  tourId: z.string().optional(),
  fromCode: z.string().optional(),
  toCode: z.string().optional(),
  fromCity: z.string().optional(),
  toCity: z.string().optional(),
  date: z.string().optional(),
  depTime: z.string().optional(),
  arrTime: z.string().optional(),
  trainNo: z.string().optional(),
  trainName: z.string().optional(),
  operator: z.string().optional(),
  adults: z.number().int().min(1).max(9).default(1),
  children: z.number().int().min(0).max(9).default(0),
  infants: z.number().int().min(0).max(9).default(0),
  cabin: z.string().optional(),
  passengers: z.array(passengerSchema).optional(),
  seats: z.array(z.string()).optional(),
  unitPrice: z.number().int().min(0),
  currency: z.string().optional().default("USD"),
  couponCode: z.string().optional(),
  contactName: z.string().min(2),
  contactEmail: z.string().email(),
});

function makeRef(mode: string): string {
  const p = { flight: "FL", train: "TR", bus: "BU", tour: "TO" }[mode] ?? "SR";
  return `${p}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

// POST /api/bookings  (auth optional — links to user when signed in)
bookingsRouter.post("/", authOptional, async (req, res) => {
  const parsed = bookingSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid booking", details: parsed.error.flatten() });
  }
  const b = parsed.data;
  const paxCount =
    b.passengers?.length ??
    (b.mode === "tour" ? b.adults + b.children : b.adults + b.children + b.infants);
  const gross = b.unitPrice * Math.max(1, paxCount);

  // Apply a promo code if supplied & valid.
  let discount = 0;
  let couponCode: string | undefined;
  if (b.couponCode) {
    const r = applyCoupon(b.couponCode, gross);
    if (r.valid) { discount = r.discount; couponCode = r.code; }
  }
  const totalPrice = Math.max(0, gross - discount);

  const booking = await prisma.booking.create({
    data: {
      reference: makeRef(b.mode),
      mode: b.mode,
      offerId: b.offerId,
      tourId: b.tourId,
      fromCode: b.fromCode,
      toCode: b.toCode,
      fromCity: b.fromCity,
      toCity: b.toCity,
      date: b.date,
      depTime: b.depTime,
      arrTime: b.arrTime,
      trainNo: b.trainNo,
      trainName: b.trainName,
      operator: b.operator,
      adults: b.adults,
      children: b.children,
      infants: b.infants,
      cabin: b.cabin,
      passengers: b.passengers ? JSON.stringify(b.passengers) : null,
      seats: b.seats ? JSON.stringify(b.seats) : null,
      unitPrice: b.unitPrice,
      totalPrice,
      discount,
      couponCode,
      currency: b.currency,
      contactName: b.contactName,
      contactEmail: b.contactEmail,
      userId: req.user?.id,
    },
  });

  // Fire the e-ticket email (best-effort).
  sendMail({ to: booking.contactEmail, ...ticketEmail(booking) }).catch(() => {});

  res.status(201).json(booking);
});

// GET /api/bookings/me  -> current user's bookings (most recent first)
bookingsRouter.get("/me", authRequired, async (req, res) => {
  const bookings = await prisma.booking.findMany({
    where: { userId: req.user!.id },
    orderBy: { createdAt: "desc" },
  });
  res.json({ count: bookings.length, results: bookings });
});

// POST /api/bookings/:reference/cancel — cancel & mark refunded
bookingsRouter.post("/:reference/cancel", authOptional, async (req, res) => {
  const booking = await prisma.booking.findUnique({ where: { reference: req.params.reference } });
  if (!booking) return res.status(404).json({ error: "Booking not found" });
  if (booking.userId && req.user?.id !== booking.userId) return res.status(403).json({ error: "Not your booking" });
  if (booking.status === "cancelled") return res.json(booking);

  const updated = await prisma.booking.update({
    where: { reference: booking.reference },
    data: { status: "cancelled" },
  });
  res.json({ ...updated, refund: { amount: booking.totalPrice, currency: booking.currency, eta: "3–5 business days" } });
});

// POST /api/bookings/:reference/email-ticket — (re)send the e-ticket
bookingsRouter.post("/:reference/email-ticket", async (req, res) => {
  const booking = await prisma.booking.findUnique({ where: { reference: req.params.reference } });
  if (!booking) return res.status(404).json({ error: "Booking not found" });
  await sendMail({ to: booking.contactEmail, ...ticketEmail(booking) });
  res.json({ ok: true, sentTo: booking.contactEmail });
});

// GET /api/bookings/:reference
bookingsRouter.get("/:reference", async (req, res) => {
  const booking = await prisma.booking.findUnique({ where: { reference: req.params.reference } });
  if (!booking) return res.status(404).json({ error: "Booking not found" });
  res.json(booking);
});
