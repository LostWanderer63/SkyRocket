// tsc compiles .ts only — copy the JSON/data assets into dist/data so the
// compiled modules can require them at runtime (Render/production).
import { mkdirSync, readdirSync, copyFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const src = join(here, "../src/data");
const dest = join(here, "../dist/data");

mkdirSync(dest, { recursive: true });

let n = 0;
for (const name of readdirSync(src)) {
  const from = join(src, name);
  if (statSync(from).isDirectory()) continue; // skip raw/
  if (!/\.(json|dat)$/.test(name)) continue;
  copyFileSync(from, join(dest, name));
  n++;
}
console.log(`copied ${n} data files to dist/data`);
