import type { Location, TransportMode, TransportOffer } from "../types/index.js";
import { haversine, hashStr, seededRng } from "./geo.js";

interface ModeConfig {
  operators: { name: string; color: string; code: string }[];
  classes: string[];
  speedKmh: number; // average incl. stops
  pricePerKm: number; // base economy/standard
  classMultiplier: Record<string, number>;
  maxRangeKm: number; // beyond this the mode isn't offered
  amenities: string[];
  stopFactor: number; // higher => more stops on long routes
}

const CONFIG: Record<TransportMode, ModeConfig> = {
  flight: {
    operators: [
      { name: "SkyRoute Air", color: "#1f6feb", code: "SR" },
      { name: "GlobalWings", color: "#7c3aed", code: "GW" },
      { name: "AeroNova", color: "#ff7a45", code: "AN" },
      { name: "BlueJet", color: "#0ea5e9", code: "BJ" },
      { name: "Cirrus Atlantic", color: "#16a34a", code: "CA" },
    ],
    classes: ["Economy", "Premium Economy", "Business", "First"],
    speedKmh: 760,
    pricePerKm: 0.11,
    classMultiplier: { Economy: 1, "Premium Economy": 1.6, Business: 2.9, First: 4.5 },
    maxRangeKm: 18000,
    amenities: ["Wi-Fi", "Meal", "USB power", "Entertainment", "Extra legroom"],
    stopFactor: 0.55,
  },
  train: {
    operators: [
      { name: "EuroRail Express", color: "#1f6feb", code: "ER" },
      { name: "Velocити High-Speed", color: "#7c3aed", code: "VH" },
      { name: "Continental Rail", color: "#16a34a", code: "CR" },
      { name: "MetroLink", color: "#ff7a45", code: "ML" },
    ],
    classes: ["Standard", "First", "Business"],
    speedKmh: 165,
    pricePerKm: 0.16,
    classMultiplier: { Standard: 1, First: 1.7, Business: 2.4 },
    maxRangeKm: 1800,
    amenities: ["Wi-Fi", "Power socket", "Cafe car", "Quiet coach", "Bike space"],
    stopFactor: 0.9,
  },
  bus: {
    operators: [
      { name: "FlixRoute", color: "#16a34a", code: "FR" },
      { name: "MegaCoach", color: "#1f6feb", code: "MC" },
      { name: "NightLiner", color: "#7c3aed", code: "NL" },
      { name: "CityHopper", color: "#ff7a45", code: "CH" },
    ],
    classes: ["Standard", "Recliner", "Sleeper"],
    speedKmh: 78,
    pricePerKm: 0.07,
    classMultiplier: { Standard: 1, Recliner: 1.35, Sleeper: 1.8 },
    maxRangeKm: 1400,
    amenities: ["Wi-Fi", "USB charging", "AC", "Reclining seats", "Onboard toilet"],
    stopFactor: 1.3,
  },
};

const pad = (n: number) => String(n).padStart(2, "0");
const minToHHMM = (m: number) => `${pad(Math.floor((m % 1440) / 60))}:${pad(m % 60)}`;

function pickAmenities(rng: () => number, pool: string[]): string[] {
  return pool.filter(() => rng() > 0.45).slice(0, 4);
}

/**
 * Generate a deterministic, distance-aware set of offers between two real
 * locations. Same inputs always yield the same inventory.
 */
export function generateOffers(
  mode: TransportMode,
  from: Location,
  to: Location,
  date: string,
): TransportOffer[] {
  const cfg = CONFIG[mode];
  const distanceKm = Math.round(haversine(from, to));

  if (distanceKm < 5 || distanceKm > cfg.maxRangeKm) return [];

  const seed = hashStr(`${mode}:${from.code}:${to.code}:${date}`);
  const rng = seededRng(seed);

  const count = mode === "flight" ? 8 : 6;
  const offers: TransportOffer[] = [];

  for (let i = 0; i < count; i++) {
    const op = cfg.operators[Math.floor(rng() * cfg.operators.length)]!;
    const serviceClass = cfg.classes[Math.floor(rng() * cfg.classes.length)]!;

    // Stops scale with distance and mode.
    const stopChance = Math.min(0.85, (distanceKm / cfg.maxRangeKm) * cfg.stopFactor);
    let stops = 0;
    if (rng() < stopChance) stops = 1;
    if (stops === 1 && rng() < stopChance * 0.5) stops = 2;

    // Duration from distance + per-stop layover + small variance.
    const baseMin = (distanceKm / cfg.speedKmh) * 60;
    const layover = stops * (mode === "flight" ? 75 : 25);
    const variance = 1 + (rng() - 0.5) * 0.16;
    const durMin = Math.max(20, Math.round((baseMin + layover) * variance));

    // Departure spread across the day.
    const depMinutes = Math.floor(rng() * 1320) + 60; // 01:00–23:00
    const arrMinutes = depMinutes + durMin;

    // Price from distance, class, stops discount, and variance.
    const classMult = cfg.classMultiplier[serviceClass] ?? 1;
    const stopDiscount = 1 - stops * 0.07;
    const priceVar = 1 + (rng() - 0.4) * 0.3;
    const minFare = mode === "flight" ? 39 : 9;
    const price = Math.max(
      minFare,
      Math.round((distanceKm * cfg.pricePerKm * classMult * stopDiscount * priceVar) / 5) * 5,
    );

    offers.push({
      id: `${mode}-${from.code}-${to.code}-${date}-${i}`,
      mode,
      operator: op.name,
      operatorColor: op.color,
      vehicleNo: `${op.code}${100 + Math.floor(rng() * 899)}`,
      from: from.code,
      to: to.code,
      fromCity: from.city,
      toCity: to.city,
      dep: minToHHMM(depMinutes),
      arr: minToHHMM(arrMinutes),
      depDate: date,
      durMin,
      stops,
      distanceKm,
      price,
      currency: "USD",
      serviceClass,
      refundable: rng() > 0.55,
      seatsLeft: 1 + Math.floor(rng() * 9),
      amenities: pickAmenities(rng, cfg.amenities),
    });
  }

  return offers;
}

export const MODE_CLASSES = (mode: TransportMode) => CONFIG[mode].classes;
