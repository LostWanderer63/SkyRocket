"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  login, signup, verifyOtp, resendOtp, forgotPassword, resetPassword, isAuthSuccess,
} from "@/lib/api";
import { useAuth } from "./AuthProvider";

type Step = "login" | "signup" | "otp" | "forgot" | "reset";

const PERKS = [
  { icon: "🎫", text: "All your flights, trains, buses & tours in one place" },
  { icon: "⚡", text: "Faster checkout with saved travelers" },
  { icon: "🔔", text: "Fare alerts and trip reminders" },
  { icon: "🔁", text: "Manage, view PNR status & rebook in a tap" },
];

export function AuthModal({ onClose }: { onClose: () => void }) {
  const { setSession } = useAuth();
  const [step, setStep] = useState<Step>("signup");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [code, setCode] = useState("");
  const [show, setShow] = useState(false);
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [expiresIn, setExpiresIn] = useState(0);
  const [mounted, setMounted] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setMounted(true);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; if (timer.current) clearInterval(timer.current); };
  }, []);

  // One ticker drives the resend cooldown (30s) and the code-expiry clock (10m).
  function startCooldown(s = 30) {
    setCooldown(s);
    setExpiresIn(600);
    if (timer.current) clearInterval(timer.current);
    timer.current = setInterval(() => {
      setCooldown((c) => Math.max(0, c - 1));
      setExpiresIn((e) => Math.max(0, e - 1));
    }, 1000);
  }
  function go(next: Step) { setError(null); setInfo(null); setCode(""); setStep(next); }
  const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  const wrap = async (fn: () => Promise<void>) => {
    setBusy(true); setError(null);
    try { await fn(); } catch (e) { setError(e instanceof Error ? e.message : "Something went wrong"); } finally { setBusy(false); }
  };

  const doLogin = () => wrap(async () => {
    const r = await login({ email, password, remember });
    if (isAuthSuccess(r)) { setSession(r.user, r.token, remember); onClose(); }
    else { setDevCode(r.devCode ?? null); setInfo("Verify your email to continue."); startCooldown(); go("otp"); }
  });
  const doSignup = () => wrap(async () => {
    const r = await signup({ name, email, password });
    setDevCode(r.devCode ?? null); setInfo("We sent a 6-digit code to your email."); startCooldown(); go("otp");
  });
  const doVerify = () => wrap(async () => {
    const r = await verifyOtp({ email, code, purpose: "verify", remember });
    setSession(r.user, r.token, remember); onClose();
  });
  const doForgot = () => wrap(async () => {
    const r = await forgotPassword({ email });
    setDevCode(r.devCode ?? null); setInfo("If that email exists, a reset code is on its way."); startCooldown(); go("reset");
  });
  const doReset = () => wrap(async () => {
    const r = await resetPassword({ email, code, password: newPassword, remember });
    setSession(r.user, r.token, remember); onClose();
  });

  // Auto-submit the email-verification code once 6 digits are entered.
  useEffect(() => {
    if (step === "otp" && code.length === 6 && !busy) doVerify();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, step]);
  const doResend = (purpose: "verify" | "reset") => wrap(async () => {
    const r = await resendOtp({ email, purpose });
    setDevCode(r.devCode ?? null); setInfo("New code sent."); startCooldown();
  });

  const titles: Record<Step, string> = {
    login: "Sign in to continue", signup: "Create your account",
    otp: "Verify your email", forgot: "Reset your password", reset: "Set a new password",
  };

  const modal = (
    <div className="fixed inset-0 z-[200] overflow-y-auto bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="grid w-full max-w-[840px] grid-cols-1 overflow-hidden rounded-xl2 bg-surface shadow-card md:grid-cols-2" onClick={(e) => e.stopPropagation()}>
          {/* brand panel */}
          <div className="relative hidden flex-col justify-between overflow-hidden p-7 text-white md:flex"
            style={{ background: "radial-gradient(900px 300px at 0% 0%, rgba(255,255,255,.18), transparent 60%), linear-gradient(160deg,#1f6feb,#1657c2 60%,#7c3aed)" }}>
            <div className="flex items-center gap-2.5 font-extrabold">
              <span className="grid h-9 w-9 place-items-center rounded-[10px] bg-white/15 backdrop-blur">SR</span>
              <span className="text-lg">SkyRoute Travels</span>
            </div>
            <div>
              <h2 className="text-[1.7rem] font-extrabold leading-tight">Join and travel smarter.</h2>
              <ul className="mt-5 grid gap-3">
                {PERKS.map((p) => (
                  <li key={p.text} className="flex items-start gap-3 text-[0.92rem] text-white/90">
                    <span className="grid h-7 w-7 flex-shrink-0 place-items-center rounded-lg bg-white/15 text-base">{p.icon}</span>
                    <span>{p.text}</span>
                  </li>
                ))}
              </ul>
            </div>
            <p className="text-xs text-white/70">Secure email verification on every account.</p>
          </div>

          {/* form panel */}
          <div className="p-6 sm:p-7">
            <div className="mb-5 flex items-center justify-between">
              {(step === "login" || step === "signup") ? (
                <div className="inline-flex gap-1 rounded-full bg-bg p-1">
                  {(["signup", "login"] as const).map((m) => (
                    <button key={m} type="button" onClick={() => go(m)}
                      className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-all ${step === m ? "bg-surface text-brand shadow-soft" : "text-ink-soft"}`}>
                      {m === "signup" ? "Sign up" : "Sign in"}
                    </button>
                  ))}
                </div>
              ) : (
                <button onClick={() => go(step === "reset" ? "forgot" : step === "forgot" ? "login" : "login")} className="text-sm font-semibold text-brand">← Back</button>
              )}
              <button onClick={onClose} aria-label="Close" className="text-2xl leading-none text-ink-soft hover:text-ink">×</button>
            </div>

            <h3 className="text-xl font-extrabold">{titles[step]}</h3>
            {(step === "otp" || step === "reset") && <p className="mt-1 text-sm text-ink-soft">Sent to <strong className="text-ink">{email}</strong></p>}

            <form className="mt-5 grid gap-3.5" onSubmit={(e) => {
              e.preventDefault();
              if (step === "login") doLogin();
              else if (step === "signup") doSignup();
              else if (step === "otp") doVerify();
              else if (step === "forgot") doForgot();
              else doReset();
            }}>
              {step === "signup" && (
                <Field label="Full name"><input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Traveler" className="input pl-10" /><Icon>👤</Icon></Field>
              )}

              {(step === "login" || step === "signup" || step === "forgot") && (
                <Field label="Email"><input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" className="input pl-10" /><Icon>✉️</Icon></Field>
              )}

              {(step === "login" || step === "signup") && (
                <Field label="Password">
                  <input required type={show ? "text" : "password"} minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 6 characters" className="input pl-10 pr-16" /><Icon>🔒</Icon>
                  <button type="button" onClick={() => setShow((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-brand">{show ? "Hide" : "Show"}</button>
                </Field>
              )}

              {(step === "login" || step === "signup") && (
                <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-soft">
                  <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="h-4 w-4 accent-brand" />
                  Remember me for 30 days
                </label>
              )}

              {(step === "otp" || step === "reset") && (
                <Field label="6-digit code">
                  <input required inputMode="numeric" pattern="[0-9]*" maxLength={6} value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="••••••" className="input text-center text-lg tracking-[0.5em]" />
                </Field>
              )}

              {step === "reset" && (
                <Field label="New password">
                  <input required type={show ? "text" : "password"} minLength={6} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Min 6 characters" className="input pl-10 pr-16" /><Icon>🔒</Icon>
                  <button type="button" onClick={() => setShow((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-brand">{show ? "Hide" : "Show"}</button>
                </Field>
              )}

              {devCode && (step === "otp" || step === "reset") && (
                <p className="rounded-lg bg-[#fff7e6] px-3 py-2 text-xs text-[#b7791f]">Dev mode — your code is <strong>{devCode}</strong> (also printed in the backend console).</p>
              )}
              {info && <p className="text-sm text-ink-soft">{info}</p>}
              {error && <p className="rounded-lg bg-[#fdecec] px-3 py-2 text-sm text-red-600">{error}</p>}

              <button type="submit" disabled={busy} className="mt-1 rounded-[10px] bg-brand py-3 font-semibold text-white transition-colors hover:bg-brand-dark disabled:opacity-60">
                {busy ? "Please wait…"
                  : step === "login" ? "Sign in"
                  : step === "signup" ? "Create account"
                  : step === "otp" ? "Verify & continue"
                  : step === "forgot" ? "Send reset code"
                  : "Reset password"}
              </button>
            </form>

            {/* step-specific footers */}
            <div className="mt-4 text-center text-sm text-ink-soft">
              {step === "login" && (
                <button onClick={() => go("forgot")} className="font-semibold text-brand">Forgot password?</button>
              )}
              {(step === "otp" || step === "reset") && (
                <div className="flex items-center justify-center gap-3">
                  <span className={expiresIn === 0 ? "text-red-600" : "text-ink-soft"}>
                    {expiresIn > 0 ? `Code expires in ${mmss(expiresIn)}` : "Code expired"}
                  </span>
                  <button disabled={cooldown > 0} onClick={() => doResend(step === "reset" ? "reset" : "verify")} className="font-semibold text-brand disabled:text-ink-soft">
                    {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return mounted ? createPortal(modal, document.body) : null;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-[0.76rem] font-bold uppercase tracking-wide text-ink-soft">{label}</span>
      <span className="relative block">{children}</span>
    </label>
  );
}
function Icon({ children }: { children: React.ReactNode }) {
  return <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm opacity-70">{children}</span>;
}
