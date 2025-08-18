import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '$env/dynamic/private';
import * as schema from './schema.js';

const DATABASE_URL = env.DATABASE_URL;

if (!DATABASE_URL) {
	throw new Error('DATABASE_URL environment variable is required');
}

// Create the connection
const client = postgres(DATABASE_URL);

// Create the drizzle instance
export const db = drizzle(client, { schema });

// Export types and schema for convenience
export * from './schema.js';
