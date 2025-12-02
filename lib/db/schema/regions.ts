import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

export const regions = pgTable('regions', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: text('code').notNull().unique(), // e.g., "US-East", "EU-West", "APAC"
  name: text('name').notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export type Region = typeof regions.$inferSelect
export type NewRegion = typeof regions.$inferInsert

