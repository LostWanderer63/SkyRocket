import crypto from "node:crypto";
import { prisma } from "./prisma.js";

const SECRET = process.env.OTP_SECRET ?? process.env.JWT_SECRET ?? "dev-otp-secret";
const TTL_MIN = 10;
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_SEC = 30;

export type OtpPurpose = "verify" | "reset";

const hash = (code: string) => crypto.createHmac("sha256", SECRET).update(code).digest("hex");
const sixDigits = () => String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");

export class OtpError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

/** Issue a fresh code for an email+purpose (invalidates prior unconsumed ones). */
export async function issueOtp(email: string, purpose: OtpPurpose): Promise<string> {
  const recent = await prisma.otpCode.findFirst({
    where: { email, purpose, consumed: false },
    orderBy: { createdAt: "desc" },
  });
  if (recent && Date.now() - recent.createdAt.getTime() < RESEND_COOLDOWN_SEC * 1000) {
    const wait = Math.ceil((RESEND_COOLDOWN_SEC * 1000 - (Date.now() - recent.createdAt.getTime())) / 1000);
    throw new OtpError(`Please wait ${wait}s before requesting another code`, 429);
  }

  await prisma.otpCode.updateMany({ where: { email, purpose, consumed: false }, data: { consumed: true } });

  const code = sixDigits();
  await prisma.otpCode.create({
    data: {
      email,
      purpose,
      codeHash: hash(code),
      expiresAt: new Date(Date.now() + TTL_MIN * 60_000),
    },
  });
  return code;
}

/** Validate and consume a code. Throws OtpError on any failure. */
export async function verifyOtp(email: string, purpose: OtpPurpose, code: string): Promise<void> {
  const rec = await prisma.otpCode.findFirst({
    where: { email, purpose, consumed: false },
    orderBy: { createdAt: "desc" },
  });
  if (!rec) throw new OtpError("No active code — request a new one");
  if (rec.expiresAt.getTime() < Date.now()) throw new OtpError("Code expired — request a new one");
  if (rec.attempts >= MAX_ATTEMPTS) throw new OtpError("Too many attempts — request a new code");

  if (hash(code) !== rec.codeHash) {
    await prisma.otpCode.update({ where: { id: rec.id }, data: { attempts: { increment: 1 } } });
    throw new OtpError("Incorrect code");
  }
  await prisma.otpCode.update({ where: { id: rec.id }, data: { consumed: true } });
}
