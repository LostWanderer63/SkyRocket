"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV } from "@/lib/modes";
import { useAuth } from "./auth/AuthProvider";
import { AuthModal } from "./auth/AuthModal";
import { ThemeToggle } from "./ThemeProvider";

export function Header() {
  const [open, setOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const { user, signedIn, logout } = useAuth();

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-surface/85 backdrop-blur-md backdrop-saturate-150">
      <div className="mx-auto flex h-[70px] w-[92vw] max-w-[1180px] items-center gap-6">
        <Brand />

        <nav className="ml-2 hidden items-center gap-6 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`border-b-2 py-1 text-[0.95rem] font-semibold transition-colors ${
                isActive(item.href)
                  ? "border-brand text-brand"
                  : "border-transparent text-ink-soft hover:text-ink"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          {signedIn ? (
            <div className="relative hidden sm:block">
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="flex items-center gap-2 rounded-full border border-line py-1.5 pl-1.5 pr-3 font-semibold hover:bg-bg"
              >
                <span className="grid h-7 w-7 place-items-center rounded-full bg-brand text-sm text-white">
                  {user?.name.charAt(0).toUpperCase()}
                </span>
                <span className="max-w-[120px] truncate text-sm">{user?.name}</span>
                <span className="text-ink-soft">▾</span>
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-[calc(100%+0.4rem)] w-52 overflow-hidden rounded-xl2 border border-line bg-surface py-1 shadow-card">
                  <Link href="/account" onClick={() => setMenuOpen(false)} className="block px-4 py-2.5 text-sm font-semibold hover:bg-bg">My bookings</Link>
                  {user?.isAdmin && <Link href="/admin" onClick={() => setMenuOpen(false)} className="block px-4 py-2.5 text-sm font-semibold text-brand hover:bg-bg">⚙️ Admin dashboard</Link>}
                  <button onClick={() => { logout(); setMenuOpen(false); }} className="block w-full px-4 py-2.5 text-left text-sm font-semibold text-red-600 hover:bg-bg">Log out</button>
                </div>
              )}
            </div>
          ) : (
            <button onClick={() => setAuthOpen(true)} className="hidden rounded-[10px] px-4 py-2 font-semibold text-ink hover:bg-line sm:block">
              Sign in
            </button>
          )}
          <Link href="/flights" className="rounded-[10px] bg-brand px-4 py-2 font-semibold text-white transition-colors hover:bg-brand-dark">
            Book now
          </Link>
          <button
            aria-label="Menu"
            onClick={() => setOpen((v) => !v)}
            className="flex flex-col gap-[5px] p-1.5 md:hidden"
          >
            <span className="h-0.5 w-6 rounded bg-ink" />
            <span className="h-0.5 w-6 rounded bg-ink" />
            <span className="h-0.5 w-6 rounded bg-ink" />
          </button>
        </div>
      </div>

      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} />}

      {open && (
        <nav className="flex flex-col border-b border-line bg-surface px-[6vw] pb-4 md:hidden">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={`border-b border-line py-3 font-semibold ${
                isActive(item.href) ? "text-brand" : "text-ink-soft"
              }`}
            >
              {item.label}
            </Link>
          ))}
          {signedIn ? (
            <>
              <Link href="/account" onClick={() => setOpen(false)} className="border-b border-line py-3 font-semibold text-ink-soft">My bookings</Link>
              <button onClick={() => { logout(); setOpen(false); }} className="py-3 text-left font-semibold text-red-600">Log out</button>
            </>
          ) : (
            <button onClick={() => { setAuthOpen(true); setOpen(false); }} className="py-3 text-left font-semibold text-brand">Sign in</button>
          )}
        </nav>
      )}
    </header>
  );
}

export function Brand({ light = false }: { light?: boolean }) {
  return (
    <Link href="/flights" className="flex items-center gap-2.5 font-extrabold">
      <span className="grid h-[38px] w-[38px] place-items-center rounded-[10px] bg-gradient-to-br from-brand to-[#4f9bff] font-extrabold tracking-wide text-white">
        SR
      </span>
      <span className={`text-[1.1rem] ${light ? "text-white" : ""}`}>
        SkyRoute <em className="not-italic text-brand">Travels</em>
      </span>
    </Link>
  );
}
