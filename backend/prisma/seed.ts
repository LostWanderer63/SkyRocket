import { PrismaClient } from "@prisma/client";
import { createRequire } from "node:module";
import type { Tour } from "../src/types/index.js";

const require = createRequire(import.meta.url);
const tours = require("../src/data/tours.json") as Tour[];

const prisma = new PrismaClient();

async function main() {
  for (const t of tours) {
    await prisma.tour.upsert({
      where: { id: t.id },
      update: {},
      create: {
        id: t.id,
        title: t.title,
        destination: t.destination,
        country: t.country,
        category: t.category,
        durationDays: t.durationDays,
        priceFrom: t.priceFrom,
        rating: t.rating,
        reviews: t.reviews,
        lat: t.lat,
        lng: t.lng,
        image: t.image,
        summary: t.summary,
        highlights: JSON.stringify(t.highlights),
        itinerary: JSON.stringify(t.itinerary),
        includes: JSON.stringify(t.includes),
      },
    });
  }
  console.log(`Seeded ${tours.length} tours`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
