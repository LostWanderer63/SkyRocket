# SkyRoute Travels — Next.js flight booking

Production-grade flight search & booking UI built with the Next.js App Router, TypeScript and Tailwind CSS.

## Run

```bash
npm install
npm run dev      # http://localhost:3000  (redirects to /flights)
```

Build for production:

```bash
npm run build
npm run start
```

## Features

- **Search card** — round / one-way / multi-city tabs, airport autocomplete (datalist), date pickers, origin↔destination swap, passenger picker (adults/children/infants, max 9) + cabin class.
- **Quick filter chips** that sync with the sidebar.
- **Filters** — stops, max-price slider, departure time buckets, airlines, refundable-only.
- **Sort** — best / cheapest / fastest / earliest.
- **Results** fetched from the `/api/flights` route; loading skeletons, empty state.
- **Flight cards** — airline avatar, route timeline, tags, seats-left urgency, price.
- **Booking modal** — fare breakdown, total payable, confirmation screen.
- **Fully responsive** — mobile filter drawer, bottom-sheet modal, collapsible nav.

## Structure

```
app/
  layout.tsx            # fonts, metadata, viewport
  page.tsx              # redirect → /flights
  flights/page.tsx      # server page = Header + FlightsApp + Footer
  api/flights/route.ts  # GET filtered+sorted inventory
components/             # Header, Footer, SearchCard, PassengerPicker,
                        # Filters, FlightCard, ResultsList, BookingModal, FlightsApp
lib/                    # types, airports, flights (demo data), utils (filter/sort)
```

## Plugging in a real API

Replace `lib/flights.ts` (or the body of `app/api/flights/route.ts`) with a provider
call — e.g. Amadeus or Duffel — returning the `Flight` shape from `lib/types.ts`.
The UI already drives the API via query params (`from`, `to`, `sort`, `stops`,
`maxPrice`, `times`, `airlines`, `refundable`).
