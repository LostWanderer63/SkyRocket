import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import type { Tour } from "../types/index.js";

export const toursRouter = Router();

type Row = Awaited<ReturnType<typeof prisma.tour.findFirst>>;

function toTour(r: NonNullable<Row>): Tour {
  return {
    ...r,
    highlights: JSON.parse(r.highlights),
    itinerary: JSON.parse(r.itinerary),
    includes: JSON.parse(r.includes),
  };
}

// GET /api/tours?q=&category=&maxPrice=&maxDays=&sort=
toursRouter.get("/", async (req, res) => {
  const q = String(req.query.q ?? "").trim().toLowerCase();
  const category = String(req.query.category ?? "").trim();
  const maxPrice = Number(req.query.maxPrice ?? Infinity);
  const maxDays = Number(req.query.maxDays ?? Infinity);
  const sort = String(req.query.sort ?? "popular");

  let tours = (await prisma.tour.findMany()).map(toTour);

  if (q) {
    tours = tours.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.destination.toLowerCase().includes(q) ||
        t.country.toLowerCase().includes(q),
    );
  }
  if (category && category !== "All") tours = tours.filter((t) => t.category === category);
  if (Number.isFinite(maxPrice)) tours = tours.filter((t) => t.priceFrom <= maxPrice);
  if (Number.isFinite(maxDays)) tours = tours.filter((t) => t.durationDays <= maxDays);

  switch (sort) {
    case "cheapest": tours.sort((a, b) => a.priceFrom - b.priceFrom); break;
    case "rating": tours.sort((a, b) => b.rating - a.rating); break;
    case "shortest": tours.sort((a, b) => a.durationDays - b.durationDays); break;
    default: tours.sort((a, b) => b.reviews - a.reviews); // popular
  }

  const categories = ["All", ...Array.from(new Set((await prisma.tour.findMany()).map((t) => t.category)))];
  res.json({ count: tours.length, categories, results: tours });
});

// GET /api/tours/:id
toursRouter.get("/:id", async (req, res) => {
  const row = await prisma.tour.findUnique({ where: { id: req.params.id } });
  if (!row) return res.status(404).json({ error: "Tour not found" });
  res.json(toTour(row));
});
