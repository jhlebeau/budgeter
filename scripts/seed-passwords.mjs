// One-off script: set password "password" for all users who have no passwordHash.
// Run with: node --env-file=.env scripts/seed-passwords.mjs

import bcrypt from "bcryptjs";
import pg from "pg";

const { Pool } = pg;

const pool = new Pool({ connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL });

const hash = await bcrypt.hash("password", 12);
const result = await pool.query(
  `UPDATE "User" SET "passwordHash" = $1 WHERE "passwordHash" IS NULL`,
  [hash],
);

console.log(`Updated ${result.rowCount} user(s).`);
await pool.end();
