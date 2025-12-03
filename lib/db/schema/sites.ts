import { pgTable, text, timestamp, uuid, real, integer } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { regions } from './regions'
import { buildings } from './buildings'
import { siteStatusEnum } from './enums'

export const sites = pgTable('sites', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: text('code').notNull().unique(), // e.g., "site-nyc-01"
  name: text('name').notNull(), // e.g., "NYC-01"
  regionId: uuid('region_id')
    .references(() => regions.id)
    .notNull(),
  clli: text('clli'), // Common Language Location Identifier (from CSV)
  latitude: real('latitude').notNull(),
  longitude: real('longitude').notNull(),
  rackCount: integer('rack_count').default(0).notNull(),
  aiReadyRacks: integer('ai_ready_racks').default(0).notNull(),
  status: siteStatusEnum('status').default('LEGACY').notNull(),
  address: text('address'),
  timezone: text('timezone'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const sitesRelations = relations(sites, ({ one, many }) => ({
  region: one(regions, {
    fields: [sites.regionId],
    references: [regions.id],
  }),
  buildings: many(buildings),
}))

export type Site = typeof sites.$inferSelect
export type NewSite = typeof sites.$inferInsert

