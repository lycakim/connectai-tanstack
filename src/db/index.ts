import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '@/db/schema';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    throw new Error('DATABASE_URL is not set. Copy .env.example to .env.');
}

/**
 * On serverless platforms (e.g. Vercel), each function instance holds its own
 * pool, so keep the per-instance pool small and point DATABASE_URL at a pooled
 * endpoint (Neon/Supabase pooler or pgbouncer). Tune with DB_POOL_MAX.
 */
const pool = new Pool({
    connectionString,
    max: Number(process.env.DB_POOL_MAX ?? 10),
    idleTimeoutMillis: 10_000,
    allowExitOnIdle: true,
});

export const db = drizzle(pool, { schema });
