/**
 * Pluggable train-fare source. `LiveIRCTC` calls a keyed provider when
 * IRCTC_API_KEY is set; otherwise we fall back to the deterministic model.
 * Swap providers without touching the engine.
 */

export interface FareQuery {
  trainNo: string;
  from: string;
  to: string;
  date: string;
  km: number;
  type: string;
  classes: string[];
}

export interface FareResult {
  fares: Record<string, number>; // classCode -> fare (INR)
  source: "live" | "model";
}

export interface FareProvider {
  readonly source: "live" | "model";
  getFares(q: FareQuery): Promise<Record<string, number> | null>;
}

// ---- Deterministic model (always available) ----
const MODEL: Record<string, { base: number; perKm: number; reservation: number; superfast: number; ac: boolean }> = {
  "1A": { base: 280, perKm: 3.2, reservation: 60, superfast: 75, ac: true },
  EC: { base: 220, perKm: 2.4, reservation: 50, superfast: 45, ac: true },
  "2A": { base: 180, perKm: 1.9, reservation: 50, superfast: 45, ac: true },
  FC: { base: 150, perKm: 1.6, reservation: 40, superfast: 45, ac: false },
  "3A": { base: 140, perKm: 1.28, reservation: 40, superfast: 45, ac: true },
  CC: { base: 120, perKm: 1.05, reservation: 40, superfast: 45, ac: true },
  SL: { base: 60, perKm: 0.5, reservation: 20, superfast: 30, ac: false },
  "2S": { base: 30, perKm: 0.32, reservation: 15, superfast: 15, ac: false },
};
const SUPERFAST = new Set(["Rajdhani", "Shatabdi", "Duronto", "Superfast", "SF", "Raj", "Shtb", "Drnt"]);

export function modelFare(cls: string, km: number, type: string): number {
  const f = MODEL[cls] ?? MODEL.SL!;
  let fare = f.base + f.perKm * Math.pow(Math.max(km, 1), 0.93) + f.reservation;
  if (SUPERFAST.has(type)) fare += f.superfast;
  if (f.ac) fare *= 1.05;
  return Math.round(fare / 5) * 5;
}

class ModelProvider implements FareProvider {
  readonly source = "model" as const;
  async getFares(q: FareQuery): Promise<Record<string, number>> {
    return Object.fromEntries(q.classes.map((c) => [c, modelFare(c, q.km, q.type)]));
  }
}

// ---- Live IRCTC provider (used only when a key is configured) ----
class LiveIRCTCProvider implements FareProvider {
  readonly source = "live" as const;
  constructor(private apiKey: string, private host = "irctc1.p.rapidapi.com") {}

  async getFares(q: FareQuery): Promise<Record<string, number> | null> {
    try {
      const url = `https://${this.host}/api/v2/getFare?trainNo=${q.trainNo}&fromStationCode=${q.from}&toStationCode=${q.to}`;
      const res = await fetch(url, {
        headers: { "X-RapidAPI-Key": this.apiKey, "X-RapidAPI-Host": this.host },
        signal: AbortSignal.timeout(4000),
      });
      if (!res.ok) return null;
      const body: unknown = await res.json();
      // Map the provider's class fares into our class codes; shape varies by plan.
      const data = (body as { data?: { fare?: Record<string, number>; general?: Record<string, number> } }).data;
      const raw = data?.fare ?? data?.general;
      if (!raw) return null;
      const out: Record<string, number> = {};
      for (const c of q.classes) if (typeof raw[c] === "number") out[c] = Math.round(raw[c]!);
      return Object.keys(out).length ? out : null;
    } catch {
      return null; // network/timeout/shape error -> caller falls back to model
    }
  }
}

const model = new ModelProvider();
const live = process.env.IRCTC_API_KEY ? new LiveIRCTCProvider(process.env.IRCTC_API_KEY) : null;

export const fareSourceConfigured: "live" | "model" = live ? "live" : "model";

/** Resolve fares for one train: live when configured & available, else model. */
export async function resolveFares(q: FareQuery): Promise<FareResult> {
  if (live) {
    const f = await live.getFares(q);
    if (f) {
      // Fill any class the provider omitted with the model value.
      const fares = { ...(await model.getFares(q)), ...f };
      return { fares, source: "live" };
    }
  }
  return { fares: (await model.getFares(q))!, source: "model" };
}
