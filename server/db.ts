import { Pool as NeonPool, neonConfig } from '@neondatabase/serverless';
import { drizzle as neonDrizzle } from 'drizzle-orm/neon-serverless';
import { drizzle as pgDrizzle } from 'drizzle-orm/node-postgres';
import { Pool as PgPool } from 'pg';
import ws from "ws";
import * as schema from "@shared/schema";

// Allow app to start without DATABASE_URL in production (for initial deployment)
// The app will fail when trying to use the database, but health check will pass
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://placeholder:placeholder@localhost:5432/placeholder';

if (!process.env.DATABASE_URL && process.env.NODE_ENV === 'production') {
  console.warn('WARNING: DATABASE_URL not set. Database operations will fail. Please configure DATABASE_URL in Cloud Run.');
}

// Check if using Neon (cloud) or local PostgreSQL
const isNeon = DATABASE_URL.includes('neon.tech');

let pool: NeonPool | PgPool;
let db: ReturnType<typeof neonDrizzle> | ReturnType<typeof pgDrizzle>;

if (isNeon) {
  // Use Neon serverless driver for cloud
  neonConfig.webSocketConstructor = ws;
  pool = new NeonPool({ connectionString: DATABASE_URL });
  db = neonDrizzle({ client: pool as NeonPool, schema });
} else {
  // Use standard PostgreSQL driver for local
  pool = new PgPool({ connectionString: DATABASE_URL });
  db = pgDrizzle({ client: pool as PgPool, schema });
}

export { pool, db };
