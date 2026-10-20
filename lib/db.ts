import { neon } from "@neondatabase/serverless";

type Sql = ReturnType<typeof neon>;

let client: Sql | null = null;
let schemaReady: Promise<void> | null = null;

export function getSql(): Sql {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  client ??= neon(url);
  return client;
}

// The Neon HTTP driver runs one statement per call, so the schema is applied
// statement by statement. Every statement is idempotent.
async function applySchema(sql: Sql) {
  await sql`CREATE TABLE IF NOT EXISTS orders (
    id BIGSERIAL PRIMARY KEY,
    external_id TEXT UNIQUE NOT NULL,
    email TEXT,
    amount_agorot INTEGER,
    source TEXT NOT NULL DEFAULT 'grow',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`;
  await sql`CREATE TABLE IF NOT EXISTS credits (
    token TEXT PRIMARY KEY,
    order_id BIGINT NOT NULL REFERENCES orders(id),
    status TEXT NOT NULL DEFAULT 'available',
    started_at TIMESTAMPTZ,
    report_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`;
  await sql`CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    credit_token TEXT NOT NULL REFERENCES credits(token),
    input_url TEXT NOT NULL,
    report JSONB NOT NULL,
    usage JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`;
  await sql`CREATE TABLE IF NOT EXISTS grow_events (
    id BIGSERIAL PRIMARY KEY,
    payload JSONB NOT NULL,
    handled BOOLEAN NOT NULL DEFAULT false,
    note TEXT,
    received_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`;
}

export async function db(): Promise<Sql> {
  const sql = getSql();
  schemaReady ??= applySchema(sql).catch((err) => {
    schemaReady = null;
    throw err;
  });
  await schemaReady;
  return sql;
}
