import "dotenv/config";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";

if (!process.env.DATABASE_URL || !process.env.DIRECT_URL) {
  throw new Error(
    "DATABASE_URL and DIRECT_URL are required. Copy the Supabase pooler and direct connection strings into apps/api/.env.",
  );
}

const require = createRequire(import.meta.url);
const prismaCli = require.resolve("prisma/build/index.js");

execFileSync(
  process.execPath,
  [prismaCli, "migrate", "deploy", "--schema", "prisma/schema.prisma"],
  {
    cwd: new URL("..", import.meta.url),
    env: process.env,
    stdio: "inherit",
  },
);
