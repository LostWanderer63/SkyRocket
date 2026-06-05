import { Router } from "express";
import { z } from "zod";
import { searchLocations, getLocation, counts } from "../lib/locations.js";
import { searchTrainStations } from "../lib/trains.js";
import type { TransportMode } from "../types/index.js";

export const locationsRouter = Router();

const querySchema = z.object({
  q: z.string().optional().default(""),
  mode: z.enum(["flight", "train", "bus"]).default("flight"),
  limit: z.coerce.number().min(1).max(25).optional().default(8),
});

// GET /api/locations?q=lon&mode=flight&limit=8
locationsRouter.get("/", (req, res) => {
  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid query", details: parsed.error.flatten() });
  }
  const { q, mode, limit } = parsed.data;
  // Trains use the IRCTC-style Indian station dataset.
  const results =
    mode === "train"
      ? searchTrainStations(q, limit)
      : searchLocations(mode as TransportMode, q, limit);
  res.json({ count: results.length, results });
});

// GET /api/locations/:mode/:code  -> single location lookup
locationsRouter.get("/:mode/:code", (req, res) => {
  const mode = req.params.mode as TransportMode;
  if (!["flight", "train", "bus"].includes(mode)) {
    return res.status(400).json({ error: "Invalid mode" });
  }
  const loc = getLocation(mode, req.params.code);
  if (!loc) return res.status(404).json({ error: "Location not found" });
  res.json(loc);
});

// GET /api/locations/meta  -> dataset sizes
locationsRouter.get("/meta/counts", (_req, res) => res.json(counts()));
