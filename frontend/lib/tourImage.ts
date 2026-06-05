import type { Tour } from "./types";

// Destination keyword per tour for a relevant stock photo. Falls back to country.
const KEYWORD: Record<string, string> = {
  "iceland-aurora": "iceland,northern,lights",
  "kyoto-autumn": "kyoto,temple,autumn",
  "patagonia-trek": "patagonia,mountains",
  "amalfi-coast": "amalfi,coast,italy",
  "dubai-luxe": "dubai,skyline",
  "bali-bliss": "bali,rice,terrace",
  "peru-machu": "machu,picchu",
  "kenya-safari": "kenya,safari,wildlife",
};

function lock(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) { h ^= id.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0) % 10000;
}

/** Keyword-based real photo (loremflickr), stable per tour via a lock seed. */
export function tourImage(tour: Pick<Tour, "id" | "country" | "category">, w = 600, h = 400): string {
  const kw = KEYWORD[tour.id] ?? `${tour.country},${tour.category}`;
  return `https://loremflickr.com/${w}/${h}/${encodeURIComponent(kw)}/all?lock=${lock(tour.id)}`;
}
