import { createRequire } from "node:module";
import type { Location, TransportMode } from "../types/index.js";

const require = createRequire(import.meta.url);

// Real datasets bundled with the backend.
const airports = require("../data/airports.json") as Omit<Location, "mode">[];
const trainStations = require("../data/trainStations.json") as Omit<Location, "mode">[];
const busStations = require("../data/busStations.json") as Omit<Location, "mode">[];

function tag(rows: Omit<Location, "mode">[], mode: TransportMode): Location[] {
  return rows.map((r) => ({ ...r, mode }));
}

const BY_MODE: Record<TransportMode, Location[]> = {
  flight: tag(airports, "flight"),
  train: tag(trainStations, "train"),
  bus: tag(busStations, "bus"),
};

const INDEX: Record<TransportMode, Map<string, Location>> = {
  flight: new Map(BY_MODE.flight.map((l) => [l.code, l])),
  train: new Map(BY_MODE.train.map((l) => [l.code, l])),
  bus: new Map(BY_MODE.bus.map((l) => [l.code, l])),
};

export function getLocation(mode: TransportMode, code: string): Location | undefined {
  return INDEX[mode].get(code.toUpperCase());
}

export function counts() {
  return {
    flight: BY_MODE.flight.length,
    train: BY_MODE.train.length,
    bus: BY_MODE.bus.length,
  };
}

/**
 * Typeahead search by city / name / IATA code. Ranks exact-code and
 * prefix-city matches first, then substring matches.
 */
export function searchLocations(mode: TransportMode, query: string, limit = 8): Location[] {
  const q = query.trim().toLowerCase();
  if (!q) {
    // No query: return a sensible set of large hubs (first N).
    return BY_MODE[mode].slice(0, limit);
  }

  const scored: { loc: Location; score: number }[] = [];
  for (const loc of BY_MODE[mode]) {
    const code = loc.code.toLowerCase();
    const city = loc.city.toLowerCase();
    const name = loc.name.toLowerCase();
    let score = -1;

    if (code === q) score = 100;
    else if (city === q) score = 90;
    else if (city.startsWith(q)) score = 80;
    else if (code.startsWith(q)) score = 70;
    else if (name.startsWith(q)) score = 60;
    else if (city.includes(q)) score = 40;
    else if (name.includes(q)) score = 30;
    else if (loc.country.toLowerCase().includes(q)) score = 10;

    if (score >= 0) scored.push({ loc, score });
  }

  scored.sort((a, b) => b.score - a.score || a.loc.city.localeCompare(b.loc.city));
  return scored.slice(0, limit).map((s) => s.loc);
}
