// Preprocess the DataMeet Indian Railways open dataset (stations + trains +
// schedules) into the compact shape the train engine consumes.
//   raw/stations.json  raw/trains.json  raw/schedules.json
//     -> ../indianStations.json  ../indianTrains.json
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const raw = (f) => JSON.parse(readFileSync(join(here, "../src/data/raw", f), "utf8"));

const R = 6371;
const toRad = (d) => (d * Math.PI) / 180;
function haversine(a, b) {
  const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
const title = (s) =>
  String(s).toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()).replace(/\bJn\b/g, "Jn").trim();
const hhmm = (t) => (!t || t === "None" ? null : t.slice(0, 5));
const mins = (t) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };

// ---- stations ----
const stationsRaw = raw("stations.json").features;
const stations = [];
const coord = new Map();
for (const f of stationsRaw) {
  const p = f.properties;
  if (!f.geometry || !p.code || String(p.code).startsWith("XX")) continue;
  const [lng, lat] = f.geometry.coordinates;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
  const code = p.code.toUpperCase();
  const station = {
    code,
    name: title(p.name),
    city: title(p.name),
    country: "India",
    lat: Math.round(lat * 1e5) / 1e5,
    lng: Math.round(lng * 1e5) / 1e5,
  };
  stations.push(station);
  coord.set(code, { lat: station.lat, lng: station.lng });
}

// ---- train meta (classes, total distance, type) ----
const trainMeta = new Map();
for (const f of raw("trains.json").features) {
  const p = f.properties;
  const classes = [];
  if (p.first_ac) classes.push("1A");
  if (p.second_ac) classes.push("2A");
  if (p.third_ac) classes.push("3A");
  if (p.chair_car) classes.push("CC");
  if (p.first_class) classes.push("FC");
  if (p.sleeper) classes.push("SL");
  if (classes.length === 0) classes.push("2S");
  trainMeta.set(String(p.number), {
    name: title(p.name),
    type: p.type || "Express",
    classes,
    distance: Number(p.distance) || 0,
  });
}

// ---- schedules grouped by train ----
const byTrain = new Map();
for (const s of raw("schedules.json")) {
  const num = String(s.train_number);
  if (!byTrain.has(num)) byTrain.set(num, { name: s.train_name, stops: [] });
  byTrain.get(num).stops.push({
    code: String(s.station_code).toUpperCase(),
    arr: hhmm(s.arrival),
    dep: hhmm(s.departure),
    day: Number(s.day) || 1,
  });
}

const trains = [];
for (const [number, grp] of byTrain) {
  // Order stops by absolute time (day then minute of dep/arr).
  const stops = grp.stops
    .map((st) => ({ ...st, _t: (st.day - 1) * 1440 + mins(st.dep ?? st.arr ?? "00:00") }))
    .sort((a, b) => a._t - b._t);
  if (stops.length < 2) continue;

  // Cumulative straight-line distance, scaled to the train's real total.
  let rawCum = 0;
  const cum = [0];
  for (let i = 1; i < stops.length; i++) {
    const a = coord.get(stops[i - 1].code), b = coord.get(stops[i].code);
    if (a && b) rawCum += haversine(a, b);
    cum.push(rawCum);
  }
  const meta = trainMeta.get(number);
  const total = meta?.distance || Math.round(rawCum);
  const scale = rawCum > 0 ? total / rawCum : 1;

  trains.push({
    number,
    name: meta?.name || title(grp.name),
    type: meta?.type || "Express",
    runningDays: [true, true, true, true, true, true, true],
    classes: meta?.classes || ["SL"],
    stops: stops.map((st, i) => ({
      code: st.code,
      day: st.day,
      arr: st.arr,
      dep: st.dep,
      km: Math.round(cum[i] * scale),
    })),
  });
}

// Keep only stations that are actually used by some train (smaller typeahead set
// that still covers every searchable route), plus drop trains with unknown stops.
const usedCodes = new Set();
for (const t of trains) for (const s of t.stops) usedCodes.add(s.code);
const usedStations = stations.filter((s) => usedCodes.has(s.code));

writeFileSync(join(here, "../src/data/indianStations.json"), JSON.stringify(usedStations));
writeFileSync(join(here, "../src/data/indianTrains.json"), JSON.stringify(trains));
console.log(`stations: ${usedStations.length} (of ${stations.length}), trains: ${trains.length}`);
