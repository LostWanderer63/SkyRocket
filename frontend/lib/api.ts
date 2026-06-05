import type {
  AdminStats,
  Booking,
  CouponResult,
  Deal,
  FareTrend,
  Location,
  OfferFilters,
  Passenger,
  PriceAlert,
  SortKey,
  TransportMode,
  TransportResponse,
  TrainResponse,
  Tour,
  Traveler,
  User,
} from "./types";

export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

const TOKEN_KEY = "skyroute_token";

// "Remember me" -> localStorage (persists across sessions);
// otherwise sessionStorage (cleared when the tab/window closes).
export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY) ?? window.sessionStorage.getItem(TOKEN_KEY);
}
export function setToken(token: string | null, remember = true) {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TOKEN_KEY);
  window.sessionStorage.removeItem(TOKEN_KEY);
  if (!token) return;
  (remember ? window.localStorage : window.sessionStorage).setItem(TOKEN_KEY, token);
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    cache: "no-store",
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

// ---- locations ----
export function searchLocations(mode: TransportMode, q: string, signal?: AbortSignal) {
  const params = new URLSearchParams({ mode, q, limit: "8" });
  return api<{ results: Location[] }>(`/api/locations?${params}`, { signal });
}

// ---- transport (flights / buses) ----
const MODE_PATH: Record<TransportMode, string> = { flight: "flights", train: "trains", bus: "buses" };

export function searchTransport(
  mode: TransportMode,
  args: { from: string; to: string; date: string; sort: SortKey; filters: OfferFilters },
) {
  const p = new URLSearchParams();
  p.set("from", args.from);
  p.set("to", args.to);
  p.set("date", args.date);
  p.set("sort", args.sort);
  p.set("maxPrice", String(args.filters.maxPrice));
  if (args.filters.stops.length) p.set("stops", args.filters.stops.join(","));
  if (args.filters.times.length) p.set("times", args.filters.times.join(","));
  if (args.filters.operators.length) p.set("operators", args.filters.operators.join(","));
  if (args.filters.classes.length) p.set("classes", args.filters.classes.join(","));
  if (args.filters.refundable) p.set("refundable", "true");
  return api<TransportResponse>(`/api/${MODE_PATH[mode]}?${p}`);
}

// ---- trains (IRCTC-style) ----
export function searchTrains(args: {
  from: string;
  to: string;
  date: string;
  sort?: string;
  classes?: string[];
  types?: string[];
  available?: boolean;
}) {
  const p = new URLSearchParams();
  p.set("from", args.from);
  p.set("to", args.to);
  p.set("date", args.date);
  if (args.sort) p.set("sort", args.sort);
  if (args.classes?.length) p.set("classes", args.classes.join(","));
  if (args.types?.length) p.set("types", args.types.join(","));
  if (args.available) p.set("available", "true");
  return api<TrainResponse>(`/api/trains?${p}`);
}

// ---- tours ----
export function listTours(args: { q?: string; category?: string; maxPrice?: number; sort?: string }) {
  const p = new URLSearchParams();
  if (args.q) p.set("q", args.q);
  if (args.category) p.set("category", args.category);
  if (args.maxPrice) p.set("maxPrice", String(args.maxPrice));
  if (args.sort) p.set("sort", args.sort);
  return api<{ count: number; categories: string[]; results: Tour[] }>(`/api/tours?${p}`);
}
export function getTour(id: string) {
  return api<Tour>(`/api/tours/${id}`);
}

// ---- auth (email + OTP) ----
export interface AuthSuccess { user: User; token: string }
export interface NeedsVerification { needsVerification: true; email: string; devCode?: string; message?: string }
export type AuthResult = AuthSuccess | NeedsVerification;
export const isAuthSuccess = (r: AuthResult): r is AuthSuccess => "token" in r;

// Auth POST that surfaces `needsVerification` (HTTP 403) instead of throwing.
async function authPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok && !data?.needsVerification) throw new Error(data?.error ?? `Request failed (${res.status})`);
  return data as T;
}

export function signup(input: { name: string; email: string; password: string }) {
  return authPost<NeedsVerification>("/api/auth/signup", input);
}
export function login(input: { email: string; password: string; remember?: boolean }) {
  return authPost<AuthResult>("/api/auth/login", input);
}
export function verifyOtp(input: { email: string; code: string; purpose?: "verify" | "reset"; remember?: boolean }) {
  return authPost<AuthSuccess>("/api/auth/verify-otp", input);
}
export function resendOtp(input: { email: string; purpose?: "verify" | "reset" }) {
  return authPost<{ ok: boolean; devCode?: string }>("/api/auth/resend-otp", input);
}
export function forgotPassword(input: { email: string }) {
  return authPost<{ ok: boolean; email: string; devCode?: string }>("/api/auth/forgot-password", input);
}
export function resetPassword(input: { email: string; code: string; password: string; remember?: boolean }) {
  return authPost<AuthSuccess>("/api/auth/reset-password", input);
}
export function me() {
  return api<{ user: User }>(`/api/auth/me`);
}

// ---- bookings ----
export interface BookingInput {
  mode: TransportMode | "tour";
  offerId?: string;
  tourId?: string;
  fromCode?: string;
  toCode?: string;
  fromCity?: string;
  toCity?: string;
  date?: string;
  depTime?: string;
  arrTime?: string;
  trainNo?: string;
  trainName?: string;
  operator?: string;
  adults: number;
  children: number;
  infants: number;
  cabin?: string;
  passengers?: Passenger[];
  seats?: string[];
  unitPrice: number;
  currency?: string;
  couponCode?: string;
  contactName: string;
  contactEmail: string;
}

export function createBooking(input: BookingInput) {
  return api<Booking>(`/api/bookings`, { method: "POST", body: JSON.stringify(input) });
}
export function myBookings() {
  return api<{ count: number; results: Booking[] }>(`/api/bookings/me`);
}
export function getBooking(reference: string) {
  return api<Booking>(`/api/bookings/${reference}`);
}
export function cancelBooking(reference: string) {
  return api<Booking & { refund?: { amount: number; currency: string; eta: string } }>(`/api/bookings/${reference}/cancel`, { method: "POST" });
}
export function emailTicket(reference: string) {
  return api<{ ok: boolean; sentTo: string }>(`/api/bookings/${reference}/email-ticket`, { method: "POST" });
}

// ---- deals & coupons ----
export function getDeals() {
  return api<{ count: number; results: Deal[] }>(`/api/deals`);
}
export function validateCoupon(code: string, amount: number) {
  return api<CouponResult>(`/api/payments/coupon?code=${encodeURIComponent(code)}&amount=${amount}`);
}
export function paymentConfig() {
  return api<{ provider: "stripe" | "mock" }>(`/api/payments/config`);
}

// ---- account settings & security ----
export function updateProfile(name: string) {
  return api<AuthSuccess>(`/api/auth/profile`, { method: "PATCH", body: JSON.stringify({ name }) });
}
export function changePassword(input: { currentPassword: string; newPassword: string }) {
  return api<AuthSuccess & { message?: string }>(`/api/auth/change-password`, { method: "POST", body: JSON.stringify(input) });
}
export function logoutAll() {
  return api<AuthSuccess>(`/api/auth/logout-all`, { method: "POST" });
}
export function deleteAccount() {
  return api<{ ok: boolean }>(`/api/auth/account`, { method: "DELETE" });
}

// ---- admin ----
export function adminStats() {
  return api<AdminStats>(`/api/admin/stats`);
}
export function adminBookings() {
  return api<{ count: number; results: Booking[] }>(`/api/admin/bookings`);
}
export function adminCreateTour(input: Tour) {
  return api<unknown>(`/api/admin/tours`, { method: "POST", body: JSON.stringify(input) });
}
export function adminUpdateTour(id: string, patch: Partial<Tour>) {
  return api<unknown>(`/api/admin/tours/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
}
export function adminDeleteTour(id: string) {
  return api<{ ok: boolean }>(`/api/admin/tours/${id}`, { method: "DELETE" });
}

// ---- saved travelers ----
export function listTravelers() {
  return api<{ count: number; results: Traveler[] }>(`/api/travelers`);
}
export function addTraveler(input: { name: string; age: number; gender: "M" | "F" | "O" }) {
  return api<Traveler>(`/api/travelers`, { method: "POST", body: JSON.stringify(input) });
}
export function updateTraveler(id: string, patch: Partial<{ name: string; age: number; gender: "M" | "F" | "O" }>) {
  return api<Traveler>(`/api/travelers/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
}
export function deleteTraveler(id: string) {
  return api<{ ok: boolean }>(`/api/travelers/${id}`, { method: "DELETE" });
}

// ---- price alerts ----
export function listAlerts() {
  return api<{ count: number; results: PriceAlert[] }>(`/api/alerts`);
}
export function createAlert(input: {
  mode: string; fromCode: string; toCode: string; fromCity?: string; toCity?: string;
  cabin?: string; targetPrice: number; currency?: string;
}) {
  return api<PriceAlert>(`/api/alerts`, { method: "POST", body: JSON.stringify(input) });
}
export function deleteAlert(id: string) {
  return api<{ ok: boolean }>(`/api/alerts/${id}`, { method: "DELETE" });
}

// ---- fare trends ----
export function fareTrend(args: { mode: string; from: string; to: string; class?: string; days?: number }) {
  const p = new URLSearchParams({ mode: args.mode, from: args.from, to: args.to });
  if (args.class) p.set("class", args.class);
  if (args.days) p.set("days", String(args.days));
  return api<FareTrend>(`/api/fare-trend?${p}`);
}
