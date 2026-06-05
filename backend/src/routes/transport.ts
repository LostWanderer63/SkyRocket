import { Router } from "express";
import { z } from "zod";
import type { TransportMode } from "../types/index.js";
import { getLocation } from "../lib/locations.js";
import { generateOffers, MODE_CLASSES } from "../lib/inventory.js";
import { filterOffers, sortOffers, parseFilters, type SortKey } from "../lib/filterSort.js";

/**
 * One router factory shared by /flights, /trains and /buses — same search
 * contract, different mode + location dataset.
 */
export function transportRouter(mode: TransportMode): Router {
  const router = Router();

  const schema = z.object({
    from: z.string().min(2),
    to: z.string().min(2),
    date: z.string().optional(),
    sort: z.enum(["best", "cheapest", "fastest", "early"]).optional().default("best"),
  });

  // GET /api/{mode}?from=JFK&to=LHR&date=2026-06-12&sort=cheapest&maxPrice=900&stops=0,1...
  router.get("/", async (req, res) => {
    const parsed = schema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ error: "Missing or invalid from/to", details: parsed.error.flatten() });
    }
    const { from, to, sort } = parsed.data;
    const date = parsed.data.date ?? new Date().toISOString().slice(0, 10);

    const origin = getLocation(mode, from);
    const dest = getLocation(mode, to);
    if (!origin || !dest) {
      return res.status(404).json({
        error: `Unknown ${mode} location code(s)`,
        from: origin ? undefined : from,
        to: dest ? undefined : to,
      });
    }
    if (origin.code === dest.code) {
      return res.status(400).json({ error: "Origin and destination are the same" });
    }

    const all = generateOffers(mode, origin, dest, date);
    const filters = parseFilters(req.query as Record<string, unknown>);
    const results = sortOffers(filterOffers(all, filters), sort as SortKey);

    // Stable filter facets derived from the UNFILTERED set so options never
    // vanish/jump as the user toggles filters.
    const operators = Array.from(new Set(all.map((o) => o.operator))).sort();
    const priceMax = all.reduce((m, o) => Math.max(m, o.price), 0) || 2000;

    res.json({
      mode,
      origin,
      destination: dest,
      date,
      distanceKm: all[0]?.distanceKm ?? null,
      total: all.length,
      count: results.length,
      classes: MODE_CLASSES(mode),
      operators,
      priceMax,
      results,
    });
  });

  return router;
}
