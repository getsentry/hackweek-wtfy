import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.js';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
	throw new Error('DATABASE_URL environment variable is required');
}

// Create the connection pool
const pool = new Pool({
	connectionString: DATABASE_URL,
	ssl: DATABASE_URL.includes('sslmode=require') ? { rejectUnauthorized: false } : false,
	max: 20, // Maximum pool size
	idleTimeoutMillis: 30000, // Close idle connections after 30 seconds
	connectionTimeoutMillis: 2000 // Return error after 2 seconds if unable to get connection
});

// Create the drizzle instance
export const db = drizzle(pool, { schema });

// Export types and schema for convenience
export * from './schema.js';
