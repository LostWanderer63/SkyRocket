"use client";

import { useState } from "react";
import { updateProfile, changePassword, logoutAll, deleteAccount } from "@/lib/api";
import { useAuth } from "./AuthProvider";

export function AccountSettings() {
  const { user, setSession, logout } = useAuth();
  const [name, setName] = useState(user?.name ?? "");
  const [cur, setCur] = useState("");
  const [next, setNext] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);

  const ok = (msg: string) => setNote({ kind: "ok", msg });
  const err = (e: unknown) => setNote({ kind: "err", msg: e instanceof Error ? e.message : "Something went wrong" });

  async function saveName(e: React.FormEvent) {
    e.preventDefault();
    setBusy("name"); setNote(null);
    try { const r = await updateProfile(name.trim()); setSession(r.user, r.token); ok("Name updated"); }
    catch (e) { err(e); } finally { setBusy(null); }
  }
  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    setBusy("pwd"); setNote(null);
    try { const r = await changePassword({ currentPassword: cur, newPassword: next }); setSession(r.user, r.token); setCur(""); setNext(""); ok(r.message ?? "Password changed"); }
    catch (e) { err(e); } finally { setBusy(null); }
  }
  async function doLogoutAll() {
    setBusy("all"); setNote(null);
    try { const r = await logoutAll(); setSession(r.user, r.token); ok("Signed out of all other devices"); }
    catch (e) { err(e); } finally { setBusy(null); }
  }
  async function doDelete() {
    if (!confirm("Delete your account permanently? This cannot be undone.")) return;
    setBusy("del");
    try { await deleteAccount(); logout(); }
    catch (e) { err(e); setBusy(null); }
  }

  return (
    <div className="grid gap-4">
      {note && <p className={`rounded-lg px-3 py-2 text-sm ${note.kind === "ok" ? "bg-[#eafaf0] text-ok" : "bg-[#fdecec] text-red-600"}`}>{note.msg}</p>}

      <Card title="Profile">
        <form onSubmit={saveName} className="flex flex-col gap-2 sm:flex-row">
          <input value={name} onChange={(e) => setName(e.target.value)} className="input flex-1" placeholder="Display name" />
          <button disabled={busy === "name" || name.trim().length < 2} className="rounded-[10px] bg-brand px-5 py-2.5 font-semibold text-white hover:bg-brand-dark disabled:opacity-50">Save</button>
        </form>
        <p className="mt-2 text-sm text-ink-soft">Signed in as {user?.email}</p>
      </Card>

      <Card title="Change password">
        <form onSubmit={savePassword} className="grid gap-2">
          <input type="password" value={cur} onChange={(e) => setCur(e.target.value)} placeholder="Current password" className="input" />
          <input type="password" minLength={6} value={next} onChange={(e) => setNext(e.target.value)} placeholder="New password (min 6)" className="input" />
          <button disabled={busy === "pwd" || !cur || next.length < 6} className="justify-self-start rounded-[10px] bg-brand px-5 py-2.5 font-semibold text-white hover:bg-brand-dark disabled:opacity-50">Update password</button>
        </form>
        <p className="mt-2 text-xs text-ink-soft">Changing your password signs out all other devices.</p>
      </Card>

      <Card title="Security">
        <button onClick={doLogoutAll} disabled={busy === "all"} className="rounded-[10px] border border-line px-5 py-2.5 font-semibold hover:bg-bg disabled:opacity-50">Log out of all devices</button>
        <p className="mt-2 text-sm text-ink-soft">Invalidates every active session except this one.</p>
      </Card>

      <Card title="Danger zone" danger>
        <button onClick={doDelete} disabled={busy === "del"} className="rounded-[10px] border border-red-300 px-5 py-2.5 font-semibold text-red-600 hover:bg-[#fdecec] disabled:opacity-50">Delete my account</button>
        <p className="mt-2 text-sm text-ink-soft">Permanently removes your account, travelers and alerts. Bookings are anonymised.</p>
      </Card>
    </div>
  );
}

function Card({ title, children, danger }: { title: string; children: React.ReactNode; danger?: boolean }) {
  return (
    <section className={`rounded-xl2 border bg-surface p-5 shadow-soft ${danger ? "border-red-200" : "border-line"}`}>
      <h3 className={`mb-3 text-lg font-bold ${danger ? "text-red-600" : ""}`}>{title}</h3>
      {children}
    </section>
  );
}
