# SkyRoute Travels — multi-modal travel platform

Production-style travel booking platform with a **separate backend and frontend**.
Search and book **flights, trains, buses** and **tour packages** — all driven by
**real airport/station location data** and great-circle distances.

```
skyroute-platform/
  backend/     Express + TypeScript + Prisma (SQLite)  — REST API on :4000
  frontend/    Next.js (App Router) + TypeScript + Tailwind — UI on :3000
```

## Quick start

```bash
# 1. install both apps
npm run install:all

# 2. create + seed the SQLite database (tours)
npm run db:setup

# 3. run backend + frontend together
npm run dev
```

Then open **http://localhost:3000** (redirects to /flights).
Backend health: **http://localhost:4000/api/health**.

> Run them separately with `npm run dev:backend` and `npm run dev:frontend`.

## What's real

- **Airports** — 6,072 real airports (IATA code, city, country, lat/lng) from the
  OpenFlights open dataset (`backend/src/data/airports.json`).
- **Train stations & bus terminals** — curated real hubs with real coordinates.
- **Inventory** — flights/trains/buses are generated deterministically from the
  **great-circle distance** between the two real locations: duration from mode speed,
  price from distance × class × stops, stable per route/date. Pick *any* two real
  airports and you get plausible fares.
- **Tours** — 8 curated packages with real destinations, itineraries and coordinates,
  stored in SQLite via Prisma.
- **Bookings** — every booking (any mode) is validated and **persisted to the database**.

## Backend API (`:4000`)

| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/health` | status + dataset sizes |
| GET | `/api/locations?q=&mode=flight\|train\|bus&limit=` | location typeahead |
| GET | `/api/flights?from=&to=&date=&sort=&maxPrice=&stops=&times=&operators=&classes=&refundable=` | flight search |
| GET | `/api/trains?…` | train search (same contract) |
| GET | `/api/buses?…` | bus search (same contract) |
| GET | `/api/tours?q=&category=&maxPrice=&maxDays=&sort=` | tour packages |
| GET | `/api/tours/:id` | single tour |
| POST | `/api/bookings` | create booking (persisted) |
| GET | `/api/bookings/:reference` | retrieve a booking |

## Frontend (`:3000`)

- `/flights`, `/trains`, `/buses` — one mode-aware search experience (hero, real-location
  typeahead, trip tabs, traveler + class picker, quick chips, sidebar filters, sort, result
  cards, booking modal).
- `/tours` — package grid with search/category/budget/sort filters.
- `/tours/[id]` — itinerary, inclusions, and a live booking sidebar.

The frontend talks to the backend via `NEXT_PUBLIC_API_URL` (`frontend/.env.local`,
default `http://localhost:4000`).

## Swap in a live provider

The backend isolates data behind small modules — replace `backend/src/lib/inventory.ts`
(or proxy a provider like Amadeus/Duffel) returning the same `TransportOffer` shape, and
the entire frontend keeps working unchanged.
