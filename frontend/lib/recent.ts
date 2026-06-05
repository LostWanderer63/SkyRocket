export interface RecentSearch {
  mode: string;
  from: string;
  to: string;
  fromCity?: string;
  toCity?: string;
  href: string;
}

const KEY = "skyroute_recent";

export function pushRecent(s: RecentSearch) {
  if (typeof window === "undefined") return;
  try {
    const list: RecentSearch[] = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    const deduped = [s, ...list.filter((r) => !(r.mode === s.mode && r.from === s.from && r.to === s.to))].slice(0, 6);
    localStorage.setItem(KEY, JSON.stringify(deduped));
  } catch { /* ignore */ }
}
