import type { OfferFilters } from "./types";

export const fmtDur = (m: number) => `${Math.floor(m / 60)}h ${m % 60}m`;

export const stopLabel = (n: number, mode: string) => {
  const word = mode === "flight" ? "stop" : "change";
  return n === 0 ? (mode === "flight" ? "Non-stop" : "Direct") : `${n} ${word}${n > 1 ? "s" : ""}`;
};

export const money = (n: number, currency = "USD") =>
  n.toLocaleString("en-US", { style: "currency", currency, maximumFractionDigits: 0 });

export const initials = (name: string) =>
  name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

export const depHour = (t: string) => parseInt(t.split(":")[0], 10);

export const defaultFilters = (): OfferFilters => ({
  stops: [],
  maxPrice: 100000,
  times: [],
  operators: [],
  classes: [],
  refundable: false,
});

export const isoOffset = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};
