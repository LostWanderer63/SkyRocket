import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authRequired } from "../lib/auth.js";
import { cheapestForRoute } from "../lib/cheapest.js";
import type { TransportMode } from "../types/index.js";

export const alertsRouter = Router();

const schema = z.object({
  mode: z.enum(["flight", "train", "bus"]),
  fromCode: z.string().min(2),
  toCode: z.string().min(2),
  fromCity: z.string().optional(),
  toCity: z.string().optional(),
  cabin: z.string().optional(),
  targetPrice: z.number().int().min(1),
  currency: z.string().optional().default("USD"),
});

const today = () => new Date().toISOString().slice(0, 10);

// GET /api/alerts — list with the current cheapest fare + triggered flag
alertsRouter.get("/", authRequired, async (req, res) => {
  const alerts = await prisma.priceAlert.findMany({
    where: { userId: req.user!.id },
    orderBy: { createdAt: "desc" },
  });
  const enriched = alerts.map((a) => {
    const current = cheapestForRoute(a.mode as TransportMode, a.fromCode, a.toCode, today(), a.cabin ?? undefined);
    return { ...a, currentPrice: current, triggered: current != null && current <= a.targetPrice };
  });
  res.json({ count: enriched.length, results: enriched });
});

// POST /api/alerts — subscribe to a route
alertsRouter.post("/", authRequired, async (req, res) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid alert", details: parsed.error.flatten() });
  const a = parsed.data;
  const alert = await prisma.priceAlert.create({
    data: {
      userId: req.user!.id,
      mode: a.mode,
      fromCode: a.fromCode.toUpperCase(),
      toCode: a.toCode.toUpperCase(),
      fromCity: a.fromCity,
      toCity: a.toCity,
      cabin: a.cabin,
      targetPrice: a.targetPrice,
      currency: a.currency,
    },
  });
  const current = cheapestForRoute(a.mode as TransportMode, alert.fromCode, alert.toCode, today(), a.cabin);
  res.status(201).json({ ...alert, currentPrice: current, triggered: current != null && current <= alert.targetPrice });
});

// DELETE /api/alerts/:id
alertsRouter.delete("/:id", authRequired, async (req, res) => {
  const a = await prisma.priceAlert.findUnique({ where: { id: req.params.id } });
  if (!a || a.userId !== req.user!.id) return res.status(404).json({ error: "Not found" });
  await prisma.priceAlert.delete({ where: { id: a.id } });
  res.json({ ok: true });
});
