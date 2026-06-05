import { getLocation } from "./locations.js";
import { generateOffers } from "./inventory.js";
import { searchTrains } from "./trains.js";
import type { TransportMode } from "../types/index.js";

/** Cheapest available fare for a route on a date (deterministic). */
export function cheapestForRoute(
  mode: TransportMode,
  from: string,
  to: string,
  date: string,
  cls?: string,
): number | null {
  if (mode === "train") {
    const offers = searchTrains(from, to, date);
    const fares = offers.flatMap((o) =>
      o.classes.filter((c) => !cls || c.code === cls).map((c) => c.fare),
    );
    return fares.length ? Math.min(...fares) : null;
  }
  const origin = getLocation(mode, from);
  const dest = getLocation(mode, to);
  if (!origin || !dest) return null;
  const offers = generateOffers(mode, origin, dest, date);
  const prices = offers.filter((o) => !cls || o.serviceClass === cls).map((o) => o.price);
  return prices.length ? Math.min(...prices) : null;
}
