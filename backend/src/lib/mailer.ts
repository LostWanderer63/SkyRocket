import nodemailer, { type Transporter } from "nodemailer";

/**
 * Email delivery. Uses real SMTP when SMTP_HOST is configured; otherwise falls
 * back to a console transport that prints the message (handy for local dev).
 */
const SMTP_HOST = process.env.SMTP_HOST;
const FROM = process.env.MAIL_FROM ?? "SkyRoute Travels <no-reply@skyroute.test>";

let transporter: Transporter | null = null;
export const mailerMode: "smtp" | "console" = SMTP_HOST ? "smtp" : "console";

if (SMTP_HOST) {
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });
}

/** In dev (console mode) we may surface the OTP to the client for testing. */
export const exposeDevCode = mailerMode === "console" && process.env.HIDE_DEV_CODE !== "true";

export async function sendMail(opts: { to: string; subject: string; html: string; text: string }) {
  if (transporter) {
    await transporter.sendMail({ from: FROM, ...opts });
    return;
  }
  // Console fallback.
  console.log("\n──────── EMAIL (dev console transport) ────────");
  console.log(`To:      ${opts.to}`);
  console.log(`Subject: ${opts.subject}`);
  console.log(opts.text);
  console.log("───────────────────────────────────────────────\n");
}

// ---- templates ----
const shell = (title: string, body: string) => `
  <div style="font-family:system-ui,Segoe UI,Arial,sans-serif;max-width:480px;margin:0 auto;border:1px solid #e4e9f2;border-radius:16px;overflow:hidden">
    <div style="background:linear-gradient(135deg,#1f6feb,#7c3aed);padding:20px 24px;color:#fff">
      <strong style="font-size:18px">SkyRoute Travels</strong>
    </div>
    <div style="padding:24px;color:#0f1b2d">
      <h2 style="margin:0 0 8px">${title}</h2>
      ${body}
    </div>
    <div style="padding:16px 24px;background:#f5f7fb;color:#5a6b82;font-size:12px">
      Flights · Trains · Buses · Tours — booked in one place.
    </div>
  </div>`;

export function otpEmail(code: string, purpose: "verify" | "reset") {
  const action = purpose === "verify" ? "verify your email" : "reset your password";
  const subject = purpose === "verify" ? "Verify your SkyRoute email" : "Reset your SkyRoute password";
  const html = shell(
    purpose === "verify" ? "Confirm your email" : "Reset your password",
    `<p style="color:#5a6b82">Use this code to ${action}. It expires in 10 minutes.</p>
     <div style="font-size:32px;font-weight:800;letter-spacing:8px;background:#e9f1ff;color:#1f6feb;text-align:center;padding:14px;border-radius:12px;margin:12px 0">${code}</div>
     <p style="color:#5a6b82;font-size:13px">Didn't request this? You can ignore this email.</p>`,
  );
  const text = `Your SkyRoute code to ${action} is: ${code} (expires in 10 minutes).`;
  return { subject, html, text };
}

export function ticketEmail(b: {
  reference: string; mode: string; fromCity?: string | null; toCity?: string | null;
  fromCode?: string | null; toCode?: string | null; date?: string | null; depTime?: string | null;
  trainNo?: string | null; trainName?: string | null; operator?: string | null;
  cabin?: string | null; seats?: string | null; totalPrice: number; currency: string; status: string;
}) {
  const route = `${b.fromCity ?? b.fromCode ?? ""} → ${b.toCity ?? b.toCode ?? ""}`;
  const carrier = b.trainName ? `${b.trainNo} · ${b.trainName}` : b.operator ?? b.mode;
  const seats = b.seats ? (JSON.parse(b.seats) as string[]).join(", ") : "—";
  const html = shell(
    `Your e-ticket · ${b.reference}`,
    `<table style="width:100%;border-collapse:collapse;font-size:14px;color:#0f1b2d">
      <tr><td style="color:#5a6b82;padding:4px 0">Booking</td><td style="text-align:right;font-weight:700">${b.reference}</td></tr>
      <tr><td style="color:#5a6b82;padding:4px 0">${b.mode}</td><td style="text-align:right">${carrier}</td></tr>
      <tr><td style="color:#5a6b82;padding:4px 0">Route</td><td style="text-align:right;font-weight:700">${route}</td></tr>
      <tr><td style="color:#5a6b82;padding:4px 0">Date</td><td style="text-align:right">${b.date ?? "—"} ${b.depTime ?? ""}</td></tr>
      <tr><td style="color:#5a6b82;padding:4px 0">Class / seats</td><td style="text-align:right">${b.cabin ?? "—"} · ${seats}</td></tr>
      <tr><td style="color:#5a6b82;padding:8px 0">Total paid</td><td style="text-align:right;font-weight:800;color:#1f6feb">${b.currency} ${b.totalPrice}</td></tr>
    </table>
    <p style="color:#5a6b82;font-size:12px;margin-top:12px">Status: ${b.status}. Show this email or your reference at boarding.</p>`,
  );
  return { subject: `E-ticket ${b.reference} — SkyRoute`, html, text: `SkyRoute e-ticket ${b.reference}: ${carrier}, ${route}, ${b.date ?? ""} ${b.depTime ?? ""}, ${b.cabin ?? ""} ${seats}. Total ${b.currency} ${b.totalPrice}. Status ${b.status}.` };
}

export function welcomeEmail(name: string) {
  const html = shell(
    `Welcome aboard, ${name}! ✈`,
    `<p style="color:#5a6b82">Your email is verified and your account is ready. Search flights, trains, buses and curated tours — all in one place, with saved travelers, price alerts and PNR status.</p>`,
  );
  return { subject: "Welcome to SkyRoute Travels", html, text: `Welcome aboard, ${name}! Your SkyRoute account is ready.` };
}
