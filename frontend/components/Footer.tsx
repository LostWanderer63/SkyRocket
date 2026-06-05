"use client";

import { useState } from "react";
import { Brand } from "./Header";

export function Footer() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);

  return (
    <footer className="mt-8 bg-[#0f1b2d] text-[#c7d2e2]">
      <div className="mx-auto grid w-[92vw] max-w-[1180px] grid-cols-1 gap-8 py-12 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1.4fr]">
        <div>
          <Brand light />
          <p className="mt-3 max-w-[30ch] text-[#91a1ba]">
            Multi-modal travel booking for flights, trains, buses and curated tours.
          </p>
        </div>

        <FooterCol title="Popular tours" links={["Iceland Northern Lights", "Kyoto in Autumn", "Patagonia Trek", "Amalfi Coast"]} />
        <FooterCol title="Support" links={["Help center", "Manage booking", "Refund policy", "Contact us"]} />

        <div>
          <h5 className="mb-3.5 font-semibold text-white">Get deals</h5>
          <p className="mb-2.5 text-[#91a1ba]">Fare alerts in your inbox.</p>
          <form
            className="flex gap-1.5"
            onSubmit={(e) => {
              e.preventDefault();
              setDone(true);
              setEmail("");
            }}
          >
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
              className="min-w-0 flex-1 rounded-[10px] border border-[#2a3a52] bg-[#16243a] px-3 py-2.5 text-white placeholder:text-[#6f7f97]"
            />
            <button className="rounded-[10px] bg-brand px-4 py-2.5 font-semibold text-white hover:bg-brand-dark">
              Join
            </button>
          </form>
          {done && <p className="mt-2 text-sm text-ok">Subscribed — alerts on the way.</p>}
        </div>
      </div>

      <div className="mx-auto flex w-[92vw] max-w-[1180px] flex-col justify-between gap-2 border-t border-[#1d2c43] py-5 text-[0.82rem] text-[#7b8aa3] sm:flex-row">
        <span>© 2026 SkyRoute Travels. All rights reserved.</span>
        <span>Production-grade Next.js demo — patterns ready for live API integration.</span>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: string[] }) {
  return (
    <div>
      <h5 className="mb-3.5 font-semibold text-white">{title}</h5>
      {links.map((l) => (
        <a key={l} href="#" className="block py-1 text-[#aebccf] hover:text-white">
          {l}
        </a>
      ))}
    </div>
  );
}
