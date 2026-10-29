import { neon } from "@neondatabase/serverless";

// Neon Postgres over HTTP. Tables are created on first use, so a fresh database needs no setup step.

type Sql = ReturnType<typeof neon>;
let ready: Promise<void> | null = null;
let client: Sql | null = null;

async function migrate(sql: Sql) {
  await sql`CREATE TABLE IF NOT EXISTS users (
    id serial PRIMARY KEY,
    email text UNIQUE NOT NULL,
    name text,
    picture text,
    role text NOT NULL CHECK (role IN ('owner', 'admin', 'viewer')),
    created_at timestamptz NOT NULL DEFAULT now(),
    last_login_at timestamptz
  )`;
  await sql`CREATE TABLE IF NOT EXISTS invites (
    token text PRIMARY KEY,
    email text NOT NULL,
    role text NOT NULL CHECK (role IN ('admin', 'viewer')),
    created_by text,
    created_at timestamptz NOT NULL DEFAULT now(),
    expires_at timestamptz NOT NULL,
    accepted_at timestamptz
  )`;
  await sql`CREATE TABLE IF NOT EXISTS notes (
    id serial PRIMARY KEY,
    on_date date NOT NULL,
    text text NOT NULL,
    created_by text,
    created_at timestamptz NOT NULL DEFAULT now()
  )`;
  // Section-level access for viewers (null = everything).
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS sections text[]`;
  await sql`ALTER TABLE invites ADD COLUMN IF NOT EXISTS sections text[]`;
  await sql`CREATE TABLE IF NOT EXISTS audit (
    id serial PRIMARY KEY,
    at timestamptz NOT NULL DEFAULT now(),
    actor text,
    action text NOT NULL,
    detail text
  )`;
}

export async function db(): Promise<Sql> {
  if (!client) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set.");
    client = neon(url);
  }
  ready ??= migrate(client).catch((e) => {
    ready = null;
    throw e;
  });
  await ready;
  return client;
}

export type Row = Record<string, unknown>;
