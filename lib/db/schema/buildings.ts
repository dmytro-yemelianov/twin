import { pgTable, text, timestamp, uuid, real, integer, jsonb } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { sites } from './sites'
import { floors } from './floors'

// Transform stored as JSONB for flexibility
export type TransformData = {
  position: [number, number, number]
  rotationEuler: [number, number, number]
  scale: [number, number, number]
}

export const buildings = pgTable('buildings', {
  id: uuid('id').primaryKey().defaultRandom(),
  siteId: uuid('site_id')
    .references(() => sites.id, { onDelete: 'cascade' })
    .notNull(),
  name: text('name').notNull(),
  glbUri: text('glb_uri'),
  transformWorld: jsonb('transform_world').$type<TransformData>().notNull(),
  floorCount: integer('floor_count').default(1),
  areaSqm: real('area_sqm'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const buildingsRelations = relations(buildings, ({ one, many }) => ({
  site: one(sites, {
    fields: [buildings.siteId],
    references: [sites.id],
  }),
  floors: many(floors),
}))

export type Building = typeof buildings.$inferSelect
export type NewBuilding = typeof buildings.$inferInsert

