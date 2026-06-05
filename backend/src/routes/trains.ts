import { Router } from "express";
import { z } from "zod";
import { searchTrains, suggestStations } from "../lib/trains.js";
import { resolveFares, fareSourceConfigured } from "../lib/fareProvider.js";
import type { TrainOffer } from "../types/index.js";

export const trainsRouter = Router();

const schema = z.object({
  from: z.string().min(2),
  to: z.string().min(2),
  date: z.string().optional(),
  sort: z.enum(["early", "fastest", "cheapest", "availability"]).optional().default("early"),
});

const depMin = (o: TrainOffer) => {
  const [h, m] = o.dep.split(":").map(Number);
  return (o.depDay - 1) * 1440 + (h ?? 0) * 60 + (m ?? 0);
};
const minFare = (o: TrainOffer) => Math.min(...o.classes.map((c) => c.fare));
const availRank = (o: TrainOffer) => {
  const best = o.classes.reduce((acc, c) => {
    const r = c.availability.status === "AVL" ? 0 : c.availability.status === "RAC" ? 1 : 2;
    return Math.min(acc, r);
  }, 3);
  return best;
};

// GET /api/trains?from=MMCT&to=NDLS&date=2026-06-12&sort=early&classes=3A,SL&types=Rajdhani&available=true
trainsRouter.get("/", async (req, res) => {
  const parsed = schema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: "Missing or invalid from/to", details: parsed.error.flatten() });
  }
  const { from, to, sort } = parsed.data;
  const date = parsed.data.date ?? new Date().toISOString().slice(0, 10);

  if (from.toUpperCase() === to.toUpperCase()) {
    return res.status(400).json({ error: "Origin and destination are the same" });
  }

  let offers = searchTrains(from, to, date);

  // Stable facets from the UNFILTERED set so filter options never vanish/jump.
  const allClasses = Array.from(new Set(offers.flatMap((o) => o.classes.map((c) => c.code))));
  const allTypes = Array.from(new Set(offers.map((o) => o.trainType)));

  // Optional filters.
  const list = (v: unknown) =>
    typeof v === "string" && v.length ? v.split(",").map((s) => s.trim()) : [];
  const classFilter = list(req.query.classes);
  const typeFilter = list(req.query.types);
  const onlyAvailable = req.query.available === "true";
  const onlyRunning = req.query.running === "true";

  if (classFilter.length) offers = offers.filter((o) => o.classes.some((c) => classFilter.includes(c.code)));
  if (typeFilter.length) offers = offers.filter((o) => typeFilter.includes(o.trainType));
  if (onlyAvailable) offers = offers.filter((o) => o.classes.some((c) => c.availability.status === "AVL"));
  if (onlyRunning) offers = offers.filter((o) => o.runsOnDate);

  switch (sort) {
    case "fastest": offers.sort((a, b) => a.durMin - b.durMin); break;
    case "cheapest": offers.sort((a, b) => minFare(a) - minFare(b)); break;
    case "availability": offers.sort((a, b) => availRank(a) - availRank(b) || depMin(a) - depMin(b)); break;
    default: offers.sort((a, b) => depMin(a) - depMin(b));
  }

  // When a live fare provider is configured, enrich the top results with real
  // fares (capped to stay within rate limits); otherwise keep the model fares.
  if (fareSourceConfigured === "live") {
    await Promise.allSettled(
      offers.slice(0, 8).map(async (o) => {
        const { fares } = await resolveFares({
          trainNo: o.trainNo, from: o.from, to: o.to, date, km: o.distanceKm,
          type: o.trainType, classes: o.classes.map((c) => c.code),
        });
        for (const c of o.classes) if (fares[c.code] != null) c.fare = fares[c.code]!;
      }),
    );
  }

  // Dead-end help: suggest nearby well-served hubs when nothing direct was found.
  const suggestions = offers.length === 0
    ? { from: suggestStations(from), to: suggestStations(to) }
    : null;

  res.json({
    mode: "train",
    from: from.toUpperCase(),
    to: to.toUpperCase(),
    date,
    count: offers.length,
    fareSource: fareSourceConfigured,
    classes: allClasses,
    types: allTypes,
    suggestions,
    results: offers,
  });
});
