export type TransportMode = "flight" | "train" | "bus";
export type SortKey = "best" | "cheapest" | "fastest" | "early";

export interface Location {
  code: string;
  name: string;
  city: string;
  country: string;
  lat: number;
  lng: number;
  mode: TransportMode;
}

export interface TransportOffer {
  id: string;
  mode: TransportMode;
  operator: string;
  operatorColor: string;
  vehicleNo: string;
  from: string;
  to: string;
  fromCity: string;
  toCity: string;
  dep: string;
  arr: string;
  depDate: string;
  durMin: number;
  stops: number;
  distanceKm: number;
  price: number;
  currency: string;
  serviceClass: string;
  refundable: boolean;
  seatsLeft: number;
  amenities: string[];
}

export interface TransportResponse {
  mode: TransportMode;
  origin: Location;
  destination: Location;
  date: string;
  distanceKm: number | null;
  total: number;
  count: number;
  classes: string[];
  operators: string[];
  priceMax: number;
  results: TransportOffer[];
}

export interface Tour {
  id: string;
  title: string;
  destination: string;
  country: string;
  category: string;
  durationDays: number;
  priceFrom: number;
  rating: number;
  reviews: number;
  lat: number;
  lng: number;
  image: string;
  summary: string;
  highlights: string[];
  itinerary: string[];
  includes: string[];
}

export interface PassengerCounts {
  adults: number;
  children: number;
  infants: number;
}

export interface OfferFilters {
  stops: number[];
  maxPrice: number;
  times: ("morning" | "afternoon" | "evening")[];
  operators: string[];
  classes: string[];
  refundable: boolean;
}

export interface Booking {
  id: string;
  reference: string;
  mode: string;
  fromCode?: string | null;
  toCode?: string | null;
  fromCity?: string | null;
  toCity?: string | null;
  date?: string | null;
  depTime?: string | null;
  arrTime?: string | null;
  trainNo?: string | null;
  trainName?: string | null;
  operator?: string | null;
  cabin?: string | null;
  seats?: string | null;
  totalPrice: number;
  unitPrice: number;
  currency?: string;
  status: string;
  createdAt: string;
}

// ---- IRCTC-style trains ----
export interface TrainStop {
  code: string;
  name: string;
  city: string;
  arr: string | null;
  dep: string | null;
  day: number;
  km: number;
}

export interface TrainClassOption {
  code: string;
  name: string;
  fare: number;
  availability: { status: "AVL" | "RAC" | "WL"; count: number; label: string };
}

export interface TrainOffer {
  id: string;
  trainNo: string;
  trainName: string;
  trainType: string;
  from: string;
  to: string;
  fromName: string;
  toName: string;
  fromCity: string;
  toCity: string;
  dep: string;
  arr: string;
  depDay: number;
  arrDay: number;
  durMin: number;
  distanceKm: number;
  runningDays: boolean[];
  runsOnDate: boolean;
  classes: TrainClassOption[];
  timeline: TrainStop[];
}

export interface TrainResponse {
  mode: "train";
  from: string;
  to: string;
  date: string;
  count: number;
  fareSource: "live" | "model";
  classes: string[];
  types: string[];
  suggestions: { from: Location[]; to: Location[] } | null;
  results: TrainOffer[];
}

// ---- auth ----
export interface User {
  id: string;
  email: string;
  name: string;
  isAdmin?: boolean;
}

export interface AuthResponse {
  user: User;
  token: string;
}

// ---- checkout ----
export interface Passenger {
  name: string;
  age: number;
  gender: "M" | "F" | "O";
  seat?: string;
}

export interface Traveler {
  id: string;
  name: string;
  age: number;
  gender: "M" | "F" | "O";
}

// ---- fare trends ----
export interface FareTrendPoint {
  date: string;
  weekday: string;
  price: number | null;
}
export interface FareTrend {
  mode: string;
  from: string;
  to: string;
  currency: string;
  points: FareTrendPoint[];
  min: number | null;
  max: number | null;
  cheapestDate: string | null;
}

// ---- admin ----
export interface AdminStats {
  bookingsTotal: number;
  bookingsActive: number;
  bookingsCancelled: number;
  users: number;
  tours: number;
  revenueByCurrency: Record<string, number>;
  byMode: Record<string, number>;
  recent: Booking[];
}

// ---- deals & coupons ----
export interface Deal {
  mode: string;
  from: string;
  to: string;
  fromCity: string;
  toCity: string;
  currency: string;
  date: string;
  price: number;
}
export interface CouponResult {
  valid: boolean;
  code?: string;
  discount: number;
  message: string;
  label?: string;
}

// ---- price alerts ----
export interface PriceAlert {
  id: string;
  mode: string;
  fromCode: string;
  toCode: string;
  fromCity?: string | null;
  toCity?: string | null;
  cabin?: string | null;
  targetPrice: number;
  currency: string;
  active: boolean;
  createdAt: string;
  currentPrice?: number | null;
  triggered?: boolean;
}

// A normalized leg the checkout wizard can book (flight/bus/train segment).
export interface BookingLeg {
  mode: TransportMode;
  title: string;
  subtitle: string;
  fromCode: string;
  toCode: string;
  fromCity: string;
  toCity: string;
  date: string;
  depTime: string;
  arrTime: string;
  operator?: string;
  trainNo?: string;
  trainName?: string;
  cabin: string;
  unitPrice: number;
  currency: string;
  offerId?: string;
  hasSeatMap: boolean;
}
