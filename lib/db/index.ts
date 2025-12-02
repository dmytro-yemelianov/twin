import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

// Create postgres.js client (works with Supabase, Neon, and any PostgreSQL)
// Use connection pooler URL for serverless environments
const connectionString = process.env.DATABASE_URL!

// For serverless/edge, use these options
const client = postgres(connectionString, {
  prepare: false, // Required for Supabase Transaction Pooler
  max: 1, // Limit connections in serverless
})

// Create the Drizzle database instance with schema
export const db = drizzle(client, { schema })

// Export schema for convenience
export { schema }

// Export type for the database instance
export type Database = typeof db
