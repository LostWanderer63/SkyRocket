import type { TransportOffer } from "../types/index.js";

export type SortKey = "best" | "cheapest" | "fastest" | "early";

export interface OfferFilters {
  stops: number[];
  maxPrice: number;
  times: ("morning" | "afternoon" | "evening")[];
  operators: string[];
  classes: string[];
  refundable: boolean;
}

const depHour = (t: string) => parseInt(t.split(":")[0] ?? "0", 10);
const bucket = (t: string) => {
  const h = depHour(t);
  return h < 12 ? "morning" : h < 18 ? "afternoon" : "evening";
};

export function filterOffers(list: TransportOffer[], f: OfferFilters): TransportOffer[] {
  return list.filter((o) => {
    if (f.stops.length && !f.stops.includes(Math.min(o.stops, 2))) return false;
    if (o.price > f.maxPrice) return false;
    if (f.times.length && !f.times.includes(bucket(o.dep))) return false;
    if (f.operators.length && !f.operators.includes(o.operator)) return false;
    if (f.classes.length && !f.classes.includes(o.serviceClass)) return false;
    if (f.refundable && !o.refundable) return false;
    return true;
  });
}

export function sortOffers(list: TransportOffer[], key: SortKey): TransportOffer[] {
  const s = [...list];
  switch (key) {
    case "cheapest":
      return s.sort((a, b) => a.price - b.price);
    case "fastest":
      return s.sort((a, b) => a.durMin - b.durMin);
    case "early":
      return s.sort((a, b) => depHour(a.dep) - depHour(b.dep));
    default:
      return s.sort(
        (a, b) =>
          a.price / 100 + a.durMin / 60 + a.stops * 3 -
          (b.price / 100 + b.durMin / 60 + b.stops * 3),
      );
  }
}

export function parseFilters(q: Record<string, unknown>): OfferFilters {
  const list = (v: unknown) =>
    typeof v === "string" && v.length ? v.split(",").map((s) => s.trim()).filter(Boolean) : [];
  return {
    stops: list(q.stops).map(Number),
    maxPrice: Number(q.maxPrice ?? 1_000_000),
    times: list(q.times) as OfferFilters["times"],
    operators: list(q.operators),
    classes: list(q.classes),
    refundable: q.refundable === "true",
  };
}
