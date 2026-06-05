import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { hashPassword, verifyPassword, signToken, authRequired, isAdmin } from "../lib/auth.js";
import { issueOtp, verifyOtp, OtpError, type OtpPurpose } from "../lib/otp.js";
import { sendMail, otpEmail, welcomeEmail, exposeDevCode } from "../lib/mailer.js";
import { rateLimit } from "../lib/rateLimit.js";

export const authRouter = Router();

// Throttle abuse-prone endpoints per IP.
const writeLimit = rateLimit({ windowMs: 60_000, max: 8, bucket: "auth-write" });
const codeLimit = rateLimit({ windowMs: 60_000, max: 15, bucket: "auth-code" });

const emailField = z.string().email().transform((e) => e.toLowerCase());
const signupSchema = z.object({ name: z.string().min(2), email: emailField, password: z.string().min(6) });
const loginSchema = z.object({ email: emailField, password: z.string().min(1), remember: z.boolean().optional().default(false) });
const verifySchema = z.object({ email: emailField, code: z.string().length(6), purpose: z.enum(["verify", "reset"]).optional().default("verify"), remember: z.boolean().optional().default(false) });
const resendSchema = z.object({ email: emailField, purpose: z.enum(["verify", "reset"]).optional().default("verify") });
const forgotSchema = z.object({ email: emailField });
const resetSchema = z.object({ email: emailField, code: z.string().length(6), password: z.string().min(6), remember: z.boolean().optional().default(false) });

const safeUser = (u: { id: string; email: string; name: string }) => ({ id: u.id, email: u.email, name: u.name, isAdmin: isAdmin(u.email) });

async function sendOtp(email: string, purpose: OtpPurpose) {
  const code = await issueOtp(email, purpose);
  const mail = otpEmail(code, purpose);
  await sendMail({ to: email, ...mail });
  return exposeDevCode ? code : undefined; // dev convenience only
}

// POST /api/auth/signup — create unverified user, email an OTP
authRouter.post("/signup", writeLimit, async (req, res) => {
  const parsed = signupSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid signup", details: parsed.error.flatten() });
  const { name, email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    if (existing.emailVerified) return res.status(409).json({ error: "Email already registered" });
    // Unverified: refresh password/name and re-send code.
    await prisma.user.update({ where: { email }, data: { name, passwordHash: await hashPassword(password) } });
  } else {
    await prisma.user.create({ data: { name, email, passwordHash: await hashPassword(password), emailVerified: false } });
  }

  try {
    const devCode = await sendOtp(email, "verify");
    res.status(201).json({ needsVerification: true, email, message: "Verification code sent", devCode });
  } catch (e) {
    if (e instanceof OtpError) return res.status(e.status).json({ error: e.message, needsVerification: true, email });
    throw e;
  }
});

// POST /api/auth/verify-otp — verify email, return token
authRouter.post("/verify-otp", codeLimit, async (req, res) => {
  const parsed = verifySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid request" });
  const { email, code, purpose, remember } = parsed.data;

  try {
    await verifyOtp(email, purpose, code);
  } catch (e) {
    if (e instanceof OtpError) return res.status(e.status).json({ error: e.message });
    throw e;
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(404).json({ error: "User not found" });

  if (purpose === "verify" && !user.emailVerified) {
    await prisma.user.update({ where: { email }, data: { emailVerified: true } });
    const w = welcomeEmail(user.name);
    sendMail({ to: email, ...w }).catch(() => {});
  }
  res.json({ user: safeUser(user), token: signToken(safeUser(user), remember, user.tokenVersion) });
});

// POST /api/auth/resend-otp
authRouter.post("/resend-otp", codeLimit, async (req, res) => {
  const parsed = resendSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid request" });
  const { email, purpose } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.json({ ok: true }); // don't leak existence
  try {
    const devCode = await sendOtp(email, purpose);
    res.json({ ok: true, message: "Code sent", devCode });
  } catch (e) {
    if (e instanceof OtpError) return res.status(e.status).json({ error: e.message });
    throw e;
  }
});

// POST /api/auth/login
authRouter.post("/login", writeLimit, async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid login" });
  const { email, password, remember } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return res.status(401).json({ error: "Invalid email or password" });
  }
  if (!user.emailVerified) {
    const devCode = await sendOtp(email, "verify").catch(() => undefined);
    return res.status(403).json({ error: "Email not verified", needsVerification: true, email, devCode });
  }
  res.json({ user: safeUser(user), token: signToken(safeUser(user), remember, user.tokenVersion) });
});

// POST /api/auth/forgot-password — always returns ok (no user enumeration)
authRouter.post("/forgot-password", writeLimit, async (req, res) => {
  const parsed = forgotSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid email" });
  const { email } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.json({ ok: true, email });
  try {
    const devCode = await sendOtp(email, "reset");
    res.json({ ok: true, email, message: "Reset code sent", devCode });
  } catch (e) {
    if (e instanceof OtpError) return res.status(e.status).json({ error: e.message });
    throw e;
  }
});

// POST /api/auth/reset-password — verify reset OTP, set new password, return token
authRouter.post("/reset-password", codeLimit, async (req, res) => {
  const parsed = resetSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
  const { email, code, password, remember } = parsed.data;

  try {
    await verifyOtp(email, "reset", code);
  } catch (e) {
    if (e instanceof OtpError) return res.status(e.status).json({ error: e.message });
    throw e;
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(404).json({ error: "User not found" });
  await prisma.user.update({ where: { email }, data: { passwordHash: await hashPassword(password), emailVerified: true } });
  res.json({ user: safeUser(user), token: signToken(safeUser(user), remember, user.tokenVersion) });
});

// PATCH /api/auth/profile — update display name (re-issues token with new name)
authRouter.patch("/profile", authRequired, async (req, res) => {
  const parsed = z.object({ name: z.string().min(2) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid name" });
  const user = await prisma.user.update({ where: { id: req.user!.id }, data: { name: parsed.data.name } });
  const su = safeUser(user);
  res.json({ user: su, token: signToken(su, true, user.tokenVersion) });
});

// POST /api/auth/change-password — verify current, set new, invalidate other sessions
authRouter.post("/change-password", writeLimit, authRequired, async (req, res) => {
  const parsed = z.object({ currentPassword: z.string().min(1), newPassword: z.string().min(6) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid request" });
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user || !(await verifyPassword(parsed.data.currentPassword, user.passwordHash))) {
    return res.status(401).json({ error: "Current password is incorrect" });
  }
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(parsed.data.newPassword), tokenVersion: { increment: 1 } },
  });
  const su = safeUser(updated);
  res.json({ user: su, token: signToken(su, true, updated.tokenVersion), message: "Password changed — other devices signed out" });
});

// POST /api/auth/logout-all — bump token version (invalidate every issued token)
authRouter.post("/logout-all", authRequired, async (req, res) => {
  const updated = await prisma.user.update({ where: { id: req.user!.id }, data: { tokenVersion: { increment: 1 } } });
  const su = safeUser(updated);
  res.json({ user: su, token: signToken(su, true, updated.tokenVersion) });
});

// DELETE /api/auth/account — remove the user and related data
authRouter.delete("/account", authRequired, async (req, res) => {
  const id = req.user!.id;
  await prisma.traveler.deleteMany({ where: { userId: id } });
  await prisma.priceAlert.deleteMany({ where: { userId: id } });
  await prisma.booking.updateMany({ where: { userId: id }, data: { userId: null } });
  await prisma.user.delete({ where: { id } });
  res.json({ ok: true });
});

// GET /api/auth/me
authRouter.get("/me", authRequired, (req, res) =>
  res.json({ user: { ...req.user!, isAdmin: isAdmin(req.user!.email) } }),
);
