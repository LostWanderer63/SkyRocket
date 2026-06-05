import { Router } from "express";
import { z } from "zod";
import { applyCoupon } from "../lib/coupons.js";

export const paymentsRouter = Router();

const STRIPE_KEY = process.env.STRIPE_SECRET_KEY;
export const paymentProvider: "stripe" | "mock" = STRIPE_KEY ? "stripe" : "mock";

// GET /api/payments/coupon?code=SAVE10&amount=1200
paymentsRouter.get("/coupon", (req, res) => {
  const code = String(req.query.code ?? "");
  const amount = Number(req.query.amount ?? 0);
  if (!code || !Number.isFinite(amount)) return res.status(400).json({ error: "code and amount required" });
  res.json(applyCoupon(code, amount));
});

const intentSchema = z.object({ amount: z.number().int().min(1), currency: z.string().default("usd") });

// POST /api/payments/intent — Stripe PaymentIntent when keyed, else a mock secret
paymentsRouter.post("/intent", async (req, res) => {
  const parsed = intentSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid amount" });
  const { amount, currency } = parsed.data;

  if (!STRIPE_KEY) {
    return res.json({ provider: "mock", clientSecret: `mock_${Date.now()}`, amount, currency });
  }
  try {
    // Stripe expects the smallest currency unit (e.g. cents).
    const body = new URLSearchParams({ amount: String(amount * 100), currency, "automatic_payment_methods[enabled]": "true" });
    const r = await fetch("https://api.stripe.com/v1/payment_intents", {
      method: "POST",
      headers: { Authorization: `Bearer ${STRIPE_KEY}`, "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    const data = (await r.json()) as { client_secret?: string; error?: { message?: string } };
    if (!r.ok) return res.status(502).json({ error: data.error?.message ?? "Stripe error" });
    res.json({ provider: "stripe", clientSecret: data.client_secret, amount, currency });
  } catch {
    res.status(502).json({ error: "Payment provider unavailable" });
  }
});

// GET /api/payments/config — tell the client which provider is active
paymentsRouter.get("/config", (_req, res) => res.json({ provider: paymentProvider }));
