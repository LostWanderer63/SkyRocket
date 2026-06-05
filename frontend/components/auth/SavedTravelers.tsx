"use client";

import { useEffect, useState } from "react";
import type { Traveler } from "@/lib/types";
import { listTravelers, addTraveler, deleteTraveler, updateTraveler } from "@/lib/api";

export function SavedTravelers() {
  const [travelers, setTravelers] = useState<Traveler[]>([]);
  const [name, setName] = useState("");
  const [age, setAge] = useState(30);
  const [gender, setGender] = useState<"M" | "F" | "O">("M");
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ name: string; age: number; gender: "M" | "F" | "O" }>({ name: "", age: 30, gender: "M" });

  useEffect(() => {
    listTravelers().then((r) => setTravelers(r.results)).catch(() => setTravelers([]));
  }, []);

  function startEdit(t: Traveler) {
    setEditId(t.id);
    setDraft({ name: t.name, age: t.age, gender: t.gender });
  }
  async function saveEdit() {
    if (!editId || draft.name.trim().length < 2) return;
    const updated = await updateTraveler(editId, { name: draft.name.trim(), age: draft.age, gender: draft.gender });
    setTravelers((list) => list.map((t) => (t.id === editId ? updated : t)));
    setEditId(null);
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (name.trim().length < 2) return;
    setBusy(true);
    try {
      const t = await addTraveler({ name: name.trim(), age, gender });
      setTravelers((list) => (list.some((x) => x.id === t.id) ? list : [...list, t]));
      setName("");
      setAge(30);
      setOpen(false);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    await deleteTraveler(id);
    setTravelers((list) => list.filter((t) => t.id !== id));
  }

  return (
    <section className="rounded-xl2 border border-line bg-surface p-5 shadow-soft">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">Saved travelers</h2>
          <p className="text-sm text-ink-soft">Autofill passengers at checkout in one tap.</p>
        </div>
        <button onClick={() => setOpen((v) => !v)} className="rounded-[10px] bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark">
          {open ? "Cancel" : "+ Add traveler"}
        </button>
      </div>

      {open && (
        <form onSubmit={add} className="mb-4 grid gap-2 sm:grid-cols-[1fr_80px_100px_auto]">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" className="input" />
          <div className="grid grid-cols-2 gap-2 sm:contents">
            <input type="number" min={0} max={120} value={age} onChange={(e) => setAge(Number(e.target.value))} placeholder="Age" className="input" />
            <select value={gender} onChange={(e) => setGender(e.target.value as "M" | "F" | "O")} className="input">
              <option value="M">Male</option><option value="F">Female</option><option value="O">Other</option>
            </select>
          </div>
          <button disabled={busy} className="h-11 rounded-[10px] bg-brand px-4 font-semibold text-white hover:bg-brand-dark disabled:opacity-60">Save</button>
        </form>
      )}

      {travelers.length === 0 ? (
        <p className="rounded-xl2 border border-dashed border-line p-6 text-center text-sm text-ink-soft">No saved travelers yet.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {travelers.map((t) =>
            editId === t.id ? (
              <div key={t.id} className="grid gap-2 rounded-xl2 border border-brand bg-brand-tint/40 p-2">
                <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Full name" className="input" />
                <div className="grid grid-cols-2 gap-2">
                  <input type="number" min={0} max={120} value={draft.age} onChange={(e) => setDraft({ ...draft, age: Number(e.target.value) })} placeholder="Age" className="input" />
                  <select value={draft.gender} onChange={(e) => setDraft({ ...draft, gender: e.target.value as "M" | "F" | "O" })} className="input">
                    <option value="M">Male</option><option value="F">Female</option><option value="O">Other</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={saveEdit} className="h-10 rounded-[8px] bg-brand text-sm font-semibold text-white">Save</button>
                  <button onClick={() => setEditId(null)} className="h-10 rounded-[8px] border border-line text-sm font-semibold">Cancel</button>
                </div>
              </div>
            ) : (
              <div key={t.id} className="flex items-center gap-3 rounded-xl2 border border-line bg-bg px-3 py-2 text-sm">
                <span className="grid h-7 w-7 flex-shrink-0 place-items-center rounded-full bg-brand text-xs font-bold text-white">{t.name.charAt(0).toUpperCase()}</span>
                <span className="min-w-0 flex-1 truncate font-semibold">{t.name} <span className="font-normal text-ink-soft">· {t.age}{t.gender}</span></span>
                <div className="ml-auto flex flex-shrink-0 items-center gap-1">
                  <button onClick={() => startEdit(t)} className="rounded-[8px] px-2 py-1 text-xs font-semibold text-brand hover:bg-brand-tint">Edit</button>
                  <button onClick={() => remove(t.id)} className="rounded-[8px] px-2 py-1 text-xs font-semibold text-red-600 hover:bg-[#fdecec]">Remove</button>
                </div>
              </div>
            ),
          )}
        </div>
      )}
    </section>
  );
}
