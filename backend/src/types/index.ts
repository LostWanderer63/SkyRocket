export type TransportMode = "flight" | "train" | "bus";

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
  dep: string; // "HH:MM"
  arr: string;
  depDate: string; // ISO yyyy-mm-dd
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

export type AvailabilityStatus = "AVL" | "RAC" | "WL";

export interface TrainClassOption {
  code: string; // 1A, 2A, 3A, SL, CC, EC, 2S
  name: string;
  fare: number;
  availability: { status: AvailabilityStatus; count: number; label: string };
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
  runningDays: boolean[]; // Sun..Sat
  runsOnDate: boolean;
  classes: TrainClassOption[];
  timeline: TrainStop[];
}
