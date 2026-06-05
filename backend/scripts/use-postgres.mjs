// Flips the Prisma datasource to PostgreSQL for production deploys, leaving the
// local default (SQLite) untouched in your working copy. Run in CI/build only.
//   node scripts/use-postgres.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const schemaPath = join(here, "../prisma/schema.prisma");

let schema = readFileSync(schemaPath, "utf8");
if (schema.includes('provider = "postgresql"')) {
  console.log("schema already on postgresql");
  process.exit(0);
}
schema = schema.replace('provider = "sqlite"', 'provider = "postgresql"');
writeFileSync(schemaPath, schema);
console.log("switched Prisma datasource -> postgresql");
