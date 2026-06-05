import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authAdmin } from "../lib/auth.js";

export const adminRouter = Router();
adminRouter.use(authAdmin); // every admin route requires admin

// GET /api/admin/stats — KPIs + breakdowns + recent bookings
adminRouter.get("/stats", async (_req, res) => {
  const [bookings, users, tours] = await Promise.all([
    prisma.booking.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.user.count(),
    prisma.tour.count(),
  ]);

  const active = bookings.filter((b) => b.status !== "cancelled");
  const revenueByCurrency: Record<string, number> = {};
  const byMode: Record<string, number> = {};
  for (const b of active) {
    revenueByCurrency[b.currency] = (revenueByCurrency[b.currency] ?? 0) + b.totalPrice;
  }
  for (const b of bookings) byMode[b.mode] = (byMode[b.mode] ?? 0) + 1;

  res.json({
    bookingsTotal: bookings.length,
    bookingsActive: active.length,
    bookingsCancelled: bookings.length - active.length,
    users,
    tours,
    revenueByCurrency,
    byMode,
    recent: bookings.slice(0, 10),
  });
});

// GET /api/admin/bookings — recent bookings
adminRouter.get("/bookings", async (_req, res) => {
  const bookings = await prisma.booking.findMany({ orderBy: { createdAt: "desc" }, take: 50 });
  res.json({ count: bookings.length, results: bookings });
});

// ---- tour management ----
const tourSchema = z.object({
  id: z.string().min(2),
  title: z.string().min(2),
  destination: z.string().min(2),
  country: z.string().min(2),
  category: z.string().min(2),
  durationDays: z.number().int().min(1),
  priceFrom: z.number().int().min(1),
  rating: z.number().min(0).max(5).default(4.5),
  reviews: z.number().int().min(0).default(0),
  lat: z.number().default(0),
  lng: z.number().default(0),
  image: z.string().default("linear-gradient(135deg,#1f6feb,#7c3aed)"),
  summary: z.string().default(""),
  highlights: z.array(z.string()).default([]),
  itinerary: z.array(z.string()).default([]),
  includes: z.array(z.string()).default([]),
});

const encode = (t: z.infer<typeof tourSchema>) => ({
  ...t,
  highlights: JSON.stringify(t.highlights),
  itinerary: JSON.stringify(t.itinerary),
  includes: JSON.stringify(t.includes),
});

// POST /api/admin/tours
adminRouter.post("/tours", async (req, res) => {
  const parsed = tourSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid tour", details: parsed.error.flatten() });
  const exists = await prisma.tour.findUnique({ where: { id: parsed.data.id } });
  if (exists) return res.status(409).json({ error: "Tour id already exists" });
  const tour = await prisma.tour.create({ data: encode(parsed.data) });
  res.status(201).json(tour);
});

// PATCH /api/admin/tours/:id
adminRouter.patch("/tours/:id", async (req, res) => {
  const parsed = tourSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid update" });
  const data: Record<string, unknown> = { ...parsed.data };
  for (const k of ["highlights", "itinerary", "includes"] as const) {
    if (parsed.data[k]) data[k] = JSON.stringify(parsed.data[k]);
  }
  delete (data as { id?: string }).id;
  try {
    const tour = await prisma.tour.update({ where: { id: req.params.id }, data });
    res.json(tour);
  } catch {
    res.status(404).json({ error: "Tour not found" });
  }
});

// DELETE /api/admin/tours/:id
adminRouter.delete("/tours/:id", async (req, res) => {
  try {
    await prisma.booking.updateMany({ where: { tourId: req.params.id }, data: { tourId: null } });
    await prisma.tour.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch {
    res.status(404).json({ error: "Tour not found" });
  }
});
