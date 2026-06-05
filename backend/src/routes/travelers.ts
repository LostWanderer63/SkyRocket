import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authRequired } from "../lib/auth.js";

export const travelersRouter = Router();

const schema = z.object({
  name: z.string().min(2),
  age: z.coerce.number().int().min(0).max(120),
  gender: z.enum(["M", "F", "O"]),
});

// GET /api/travelers — current user's saved travelers
travelersRouter.get("/", authRequired, async (req, res) => {
  const travelers = await prisma.traveler.findMany({
    where: { userId: req.user!.id },
    orderBy: { createdAt: "asc" },
  });
  res.json({ count: travelers.length, results: travelers });
});

// POST /api/travelers — add (deduped by name+age+gender)
travelersRouter.post("/", authRequired, async (req, res) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid traveler", details: parsed.error.flatten() });
  const { name, age, gender } = parsed.data;

  const existing = await prisma.traveler.findFirst({
    where: { userId: req.user!.id, name, age, gender },
  });
  if (existing) return res.json(existing);

  const traveler = await prisma.traveler.create({
    data: { userId: req.user!.id, name, age, gender },
  });
  res.status(201).json(traveler);
});

// PATCH /api/travelers/:id — edit/rename
travelersRouter.patch("/:id", authRequired, async (req, res) => {
  const parsed = schema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid update", details: parsed.error.flatten() });
  const t = await prisma.traveler.findUnique({ where: { id: req.params.id } });
  if (!t || t.userId !== req.user!.id) return res.status(404).json({ error: "Not found" });
  const updated = await prisma.traveler.update({ where: { id: t.id }, data: parsed.data });
  res.json(updated);
});

// DELETE /api/travelers/:id
travelersRouter.delete("/:id", authRequired, async (req, res) => {
  const t = await prisma.traveler.findUnique({ where: { id: req.params.id } });
  if (!t || t.userId !== req.user!.id) return res.status(404).json({ error: "Not found" });
  await prisma.traveler.delete({ where: { id: t.id } });
  res.json({ ok: true });
});
