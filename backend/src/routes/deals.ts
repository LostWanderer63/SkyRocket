import { Router } from "express";
import { cheapestForRoute } from "../lib/cheapest.js";
import type { TransportMode } from "../types/index.js";

export const dealsRouter = Router();

const ROUTES: { mode: TransportMode; from: string; to: string; fromCity: string; toCity: string; currency: string }[] = [
  { mode: "flight", from: "JFK", to: "LHR", fromCity: "New York", toCity: "London", currency: "USD" },
  { mode: "flight", from: "SFO", to: "HND", fromCity: "San Francisco", toCity: "Tokyo", currency: "USD" },
  { mode: "flight", from: "DXB", to: "SIN", fromCity: "Dubai", toCity: "Singapore", currency: "USD" },
  { mode: "train", from: "BCT", to: "NDLS", fromCity: "Mumbai", toCity: "New Delhi", currency: "INR" },
  { mode: "train", from: "HWH", to: "NDLS", fromCity: "Kolkata", toCity: "New Delhi", currency: "INR" },
  { mode: "train", from: "MAS", to: "SBC", fromCity: "Chennai", toCity: "Bengaluru", currency: "INR" },
  { mode: "bus", from: "DLB", to: "PNB", fromCity: "New Delhi", toCity: "Pune", currency: "USD" },
];

// GET /api/deals — cheapest fare today for a curated set of popular routes
dealsRouter.get("/", (_req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const deals = ROUTES.map((r) => ({
    ...r,
    date: today,
    price: cheapestForRoute(r.mode, r.from, r.to, today),
  })).filter((d) => d.price != null);
  res.json({ count: deals.length, results: deals });
});
