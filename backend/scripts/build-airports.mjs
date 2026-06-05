// Parses OpenFlights airports.dat -> airports.json (only entries with valid IATA codes).
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const raw = readFileSync(join(here, "../src/data/airports.dat"), "utf8");

// Minimal CSV line parser (handles quoted fields with commas).
function parseLine(line) {
  const out = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (q && line[i + 1] === '"') { cur += '"'; i++; }
      else q = !q;
    } else if (c === "," && !q) {
      out.push(cur);
      cur = "";
    } else {
      cur += c;
    }
  }
  out.push(cur);
  return out;
}

const airports = [];
for (const line of raw.split("\n")) {
  if (!line.trim()) continue;
  const f = parseLine(line);
  const [, name, city, country, iata, , latS, lngS] = f;
  if (!iata || iata === "\\N" || iata.length !== 3) continue;
  const lat = parseFloat(latS);
  const lng = parseFloat(lngS);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
  airports.push({
    code: iata.toUpperCase(),
    name: name.trim(),
    city: city.trim(),
    country: country.trim(),
    lat: Math.round(lat * 1e5) / 1e5,
    lng: Math.round(lng * 1e5) / 1e5,
  });
}

// Dedupe by IATA (keep first).
const seen = new Set();
const unique = airports.filter((a) => (seen.has(a.code) ? false : seen.add(a.code)));

writeFileSync(join(here, "../src/data/airports.json"), JSON.stringify(unique));
console.log(`wrote ${unique.length} airports`);
