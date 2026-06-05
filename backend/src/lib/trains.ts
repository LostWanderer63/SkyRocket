import { createRequire } from "node:module";
import { hashStr, seededRng, haversine } from "./geo.js";
import { modelFare } from "./fareProvider.js";
import type {
  AvailabilityStatus,
  Location,
  TrainClassOption,
  TrainOffer,
  TrainStop,
} from "../types/index.js";

const require = createRequire(import.meta.url);

interface RawStop { code: string; day: number; arr: string | null; dep: string | null; km: number; }
interface RawTrain {
  number: string;
  name: string;
  type: string;
  runningDays: boolean[];
  classes: string[];
  stops: RawStop[];
}

const stationsRaw = require("../data/indianStations.json") as Omit<Location, "mode">[];
const trains = require("../data/indianTrains.json") as RawTrain[];

export const STATIONS: Location[] = stationsRaw.map((s) => ({ ...s, mode: "train" }));
const STATION_BY_CODE = new Map(STATIONS.map((s) => [s.code, s]));

const CLASS_NAMES: Record<string, string> = {
  "1A": "AC First Class",
  "2A": "AC 2-Tier",
  "3A": "AC 3-Tier",
  SL: "Sleeper",
  CC: "AC Chair Car",
  EC: "Exec. Chair Car",
  FC: "First Class",
  "2S": "Second Sitting",
};

const toMin = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
};
const absMin = (day: number, t: string) => (day - 1) * 1440 + toMin(t);

// Stations within ~35 km of the searched station share a metro/cluster
// (e.g. New Delhi + Nizamuddin + Delhi Jn; Mumbai Central + CSMT + LTT + Bandra).
const CLUSTER_KM = 35;
function clusterCodes(code: string): Set<string> {
  const origin = STATION_BY_CODE.get(code.toUpperCase());
  if (!origin) return new Set([code.toUpperCase()]);
  const set = new Set<string>();
  for (const s of STATIONS) {
    if (haversine(origin, s) <= CLUSTER_KM) set.add(s.code);
  }
  set.add(origin.code);
  return set;
}

// How many trains call at each station — a proxy for "major hub".
const POPULARITY = (() => {
  const m = new Map<string, number>();
  for (const t of trains) for (const s of t.stops) m.set(s.code, (m.get(s.code) ?? 0) + 1);
  return m;
})();

/**
 * Nearest well-served hubs to a station — used to suggest alternatives when a
 * route returns no direct trains so the search never dead-ends.
 */
export function suggestStations(code: string, limit = 4): Location[] {
  const origin = STATION_BY_CODE.get(code.toUpperCase());
  if (!origin) return [];
  // Only real hubs (many trains call there), nearest first.
  return STATIONS
    .filter((s) => s.code !== origin.code && (POPULARITY.get(s.code) ?? 0) >= 60)
    .map((s) => ({ s, d: haversine(origin, s) }))
    .filter((x) => x.d <= 600)
    .sort((a, b) => a.d - b.d)
    .slice(0, limit)
    .map((x) => x.s);
}

function availabilityFor(trainNo: string, date: string, cls: string): TrainClassOption["availability"] {
  const rng = seededRng(hashStr(`${trainNo}:${date}:${cls}`));
  const r = rng();
  const premium = cls === "1A" || cls === "EC";
  let status: AvailabilityStatus;
  let count: number;
  if (r < (premium ? 0.4 : 0.55)) { status = "AVL"; count = 1 + Math.floor(rng() * (premium ? 12 : 60)); }
  else if (r < 0.8) { status = "RAC"; count = 1 + Math.floor(rng() * 30); }
  else { status = "WL"; count = 1 + Math.floor(rng() * 40); }
  const label =
    status === "AVL" ? `AVL ${count}` : status === "RAC" ? `RAC ${count}` : `WL ${count}`;
  return { status, count, label };
}

function buildTimeline(train: RawTrain, fromIdx: number, toIdx: number): TrainStop[] {
  const segment = train.stops.slice(fromIdx, toIdx + 1);
  const last = segment.length - 1;
  // Real schedules list every wayside station; keep only genuine halts
  // (arrival != departure) plus the boarding and alighting points.
  return segment
    .filter((s, i) => i === 0 || i === last || (s.arr && s.dep && s.arr !== s.dep))
    .map((s) => {
      const st = STATION_BY_CODE.get(s.code);
      return {
        code: s.code,
        name: st?.name ?? s.code,
        city: st?.city ?? s.code,
        arr: s.arr,
        dep: s.dep,
        day: s.day,
        km: s.km,
      };
    });
}

const weekday = (iso: string) => new Date(`${iso}T00:00:00`).getDay(); // 0=Sun

/**
 * Find trains between two stations for a date. Matches on a geo-cluster of each
 * endpoint, so any of a city's terminals (e.g. NDLS/NZM/DLI) counts as a hit and
 * the actual boarding/alighting station is reported.
 */
export function searchTrains(fromCode: string, toCode: string, date: string): TrainOffer[] {
  const wd = weekday(date);
  const from = fromCode.toUpperCase();
  const to = toCode.toUpperCase();
  const fromSet = clusterCodes(from);
  const toSet = clusterCodes(to);
  const offers: TrainOffer[] = [];

  for (const train of trains) {
    const stops = train.stops;
    // Origin: prefer the exact station; otherwise the earliest cluster sibling.
    let fromIdx = stops.findIndex((s) => s.code === from);
    if (fromIdx === -1) {
      for (let i = 0; i < stops.length; i++) {
        if (fromSet.has(stops[i]!.code)) { fromIdx = i; break; }
      }
    }
    if (fromIdx === -1) continue;

    // Destination: prefer the exact station after origin; otherwise the deepest
    // (last) cluster sibling — i.e. the actual terminus, not an outer suburb.
    let toIdx = -1;
    for (let j = fromIdx + 1; j < stops.length; j++) {
      if (stops[j]!.code === to) { toIdx = j; break; }
    }
    if (toIdx === -1) {
      for (let j = stops.length - 1; j > fromIdx; j--) {
        if (toSet.has(stops[j]!.code)) { toIdx = j; break; }
      }
    }
    if (toIdx === -1) continue;

    const board = train.stops[fromIdx]!;
    const alight = train.stops[toIdx]!;
    const depT = board.dep ?? board.arr;
    const arrT = alight.arr ?? alight.dep;
    if (!depT || !arrT) continue; // skip stops with no usable time in the raw data
    const km = alight.km - board.km;
    if (km <= 0) continue;
    const durMin = absMin(alight.day, arrT) - absMin(board.day, depT);

    const classes: TrainClassOption[] = train.classes.map((c) => ({
      code: c,
      name: CLASS_NAMES[c] ?? c,
      fare: modelFare(c, km, train.type),
      availability: availabilityFor(train.number, date, c),
    }));

    offers.push({
      id: `train-${train.number}-${board.code}-${alight.code}-${date}`,
      trainNo: train.number,
      trainName: train.name,
      trainType: train.type,
      from: board.code,
      to: alight.code,
      fromName: STATION_BY_CODE.get(board.code)?.name ?? board.code,
      toName: STATION_BY_CODE.get(alight.code)?.name ?? alight.code,
      fromCity: STATION_BY_CODE.get(board.code)?.city ?? board.code,
      toCity: STATION_BY_CODE.get(alight.code)?.city ?? alight.code,
      dep: depT,
      arr: arrT,
      depDay: board.day,
      arrDay: alight.day,
      durMin,
      distanceKm: km,
      runningDays: train.runningDays,
      runsOnDate: !!train.runningDays[wd],
      classes,
      timeline: buildTimeline(train, fromIdx, toIdx),
    });
  }

  return offers;
}

export function searchTrainStations(query: string, limit = 8): Location[] {
  const q = query.trim().toLowerCase();
  if (!q) return STATIONS.slice(0, limit);
  const scored = STATIONS.map((s) => {
    const code = s.code.toLowerCase();
    const city = s.city.toLowerCase();
    const name = s.name.toLowerCase();
    let score = -1;
    if (code === q) score = 100;
    else if (city === q) score = 90;
    else if (city.startsWith(q)) score = 80;
    else if (code.startsWith(q)) score = 70;
    else if (name.toLowerCase().includes(q)) score = 40;
    else if (city.includes(q)) score = 30;
    return { s, score };
  }).filter((x) => x.score >= 0);
  scored.sort((a, b) => b.score - a.score || a.s.city.localeCompare(b.s.city));
  return scored.slice(0, limit).map((x) => x.s);
}

export function trainStationCount() {
  return STATIONS.length;
}
