import { Router } from "express";
import { z } from "zod";
import { cheapestForRoute } from "../lib/cheapest.js";
import { hashStr, seededRng } from "../lib/geo.js";
import type { TransportMode } from "../types/index.js";

export const fareTrendRouter = Router();

const schema = z.object({
  mode: z.enum(["flight", "train", "bus"]),
  from: z.string().min(2),
  to: z.string().min(2),
  class: z.string().optional(),
  days: z.coerce.number().int().min(5).max(30).optional().default(14),
});

const WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const isoPlus = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

/** Cheapest fare for a route on a given date (deterministic per date). */
function cheapestFor(mode: TransportMode, from: string, to: string, date: string, cls?: string): number | null {
  const base = cheapestForRoute(mode, from, to, date, cls);
  if (base == null) return null;
  if (mode !== "train") return base; // flights/buses already vary per date
  // Train fares are fixed, but premium/flexi trains and weekend demand nudge the
  // cheapest available price — model that for a meaningful trend line.
  const wd = new Date(`${date}T00:00:00`).getDay();
  const weekend = wd === 0 || wd === 5 || wd === 6 ? 1.07 : 1;
  const jitter = 0.96 + seededRng(hashStr(`${from}:${to}:${date}:${cls ?? ""}`))() * 0.12;
  return Math.round((base * weekend * jitter) / 5) * 5;
}

// GET /api/fare-trend?mode=train&from=BCT&to=NDLS&class=3A&days=14
fareTrendRouter.get("/", (req, res) => {
  const parsed = schema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: "Invalid query", details: parsed.error.flatten() });
  const { mode, from, to, days } = parsed.data;
  const cls = parsed.data.class;

  const points: { date: string; weekday: string; price: number | null }[] = [];
  for (let i = 0; i < days; i++) {
    const date = isoPlus(i);
    const price = cheapestFor(mode as TransportMode, from.toUpperCase(), to.toUpperCase(), date, cls);
    points.push({ date, weekday: WD[new Date(`${date}T00:00:00`).getDay()]!, price });
  }

  const valid = points.filter((p) => p.price != null) as { date: string; weekday: string; price: number }[];
  if (valid.length === 0) return res.json({ mode, from, to, currency: mode === "train" ? "INR" : "USD", points, min: null, max: null, cheapestDate: null });

  const min = Math.min(...valid.map((p) => p.price));
  const max = Math.max(...valid.map((p) => p.price));
  const cheapest = valid.find((p) => p.price === min)!;

  res.json({
    mode,
    from: from.toUpperCase(),
    to: to.toUpperCase(),
    currency: mode === "train" ? "INR" : "USD",
    points,
    min,
    max,
    cheapestDate: cheapest.date,
  });
});
