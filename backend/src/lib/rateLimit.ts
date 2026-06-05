import type { NextFunction, Request, Response } from "express";

/**
 * Lightweight in-memory sliding-window rate limiter keyed by client IP + bucket.
 * Single-instance only — swap for Redis if you scale horizontally.
 */
interface Bucket { hits: number[]; }
const store = new Map<string, Bucket>();

function clientIp(req: Request): string {
  const fwd = req.headers["x-forwarded-for"];
  if (typeof fwd === "string" && fwd.length) return fwd.split(",")[0]!.trim();
  return req.ip ?? req.socket.remoteAddress ?? "unknown";
}

// Periodically drop empty buckets so the map doesn't grow unbounded.
setInterval(() => {
  const now = Date.now();
  for (const [k, b] of store) {
    b.hits = b.hits.filter((t) => now - t < 10 * 60_000);
    if (b.hits.length === 0) store.delete(k);
  }
}, 5 * 60_000).unref?.();

export function rateLimit(opts: { windowMs: number; max: number; bucket: string }) {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = `${opts.bucket}:${clientIp(req)}`;
    const now = Date.now();
    const b = store.get(key) ?? { hits: [] };
    b.hits = b.hits.filter((t) => now - t < opts.windowMs);

    if (b.hits.length >= opts.max) {
      const retry = Math.ceil((opts.windowMs - (now - b.hits[0]!)) / 1000);
      res.setHeader("Retry-After", String(retry));
      return res.status(429).json({ error: `Too many requests — try again in ${retry}s` });
    }

    b.hits.push(now);
    store.set(key, b);
    next();
  };
}
