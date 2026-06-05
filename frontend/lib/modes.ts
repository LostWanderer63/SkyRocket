import type { TransportMode } from "./types";

export interface ModeMeta {
  key: TransportMode;
  label: string;
  single: string;
  icon: string;
  heading: string;
  sub: string;
  classLabel: string; // "cabin" vs "class"
  originLabel: string;
  destLabel: string;
  placeholder: string;
}

export const MODES: Record<TransportMode, ModeMeta> = {
  flight: {
    key: "flight",
    label: "Flights",
    single: "flight",
    icon: "✈",
    heading: "Find the best flight for your next trip",
    sub: "Compare fares across hundreds of airlines and book in minutes.",
    classLabel: "Cabin",
    originLabel: "From",
    destLabel: "To",
    placeholder: "City or airport",
  },
  train: {
    key: "train",
    label: "Trains",
    single: "train",
    icon: "🚆",
    heading: "Book train tickets across the network",
    sub: "High-speed and intercity rail with real-time stations.",
    classLabel: "Class",
    originLabel: "From station",
    destLabel: "To station",
    placeholder: "City or station",
  },
  bus: {
    key: "bus",
    label: "Buses",
    single: "bus",
    icon: "🚌",
    heading: "Affordable bus travel, everywhere you go",
    sub: "Intercity coaches with the comfort options you want.",
    classLabel: "Seat type",
    originLabel: "From",
    destLabel: "To",
    placeholder: "City or terminal",
  },
};

export const NAV = [
  { href: "/flights", label: "Flights" },
  { href: "/trains", label: "Trains" },
  { href: "/buses", label: "Buses" },
  { href: "/tours", label: "Tours" },
  { href: "/pnr", label: "Manage" },
];
