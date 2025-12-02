import { pgTable, text, timestamp, uuid, real, jsonb } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { floors } from './floors'
import { racks } from './racks'
import type { TransformData } from './buildings'

export const rooms = pgTable('rooms', {
  id: uuid('id').primaryKey().defaultRandom(),
  floorId: uuid('floor_id')
    .references(() => floors.id, { onDelete: 'cascade' })
    .notNull(),
  name: text('name').notNull(),
  transformInBuilding: jsonb('transform_in_building').$type<TransformData>().notNull(),
  areaSqm: real('area_sqm'),
  coolingCapacityKw: real('cooling_capacity_kw'),
  powerCapacityKw: real('power_capacity_kw'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const roomsRelations = relations(rooms, ({ one, many }) => ({
  floor: one(floors, {
    fields: [rooms.floorId],
    references: [floors.id],
  }),
  racks: many(racks),
}))

export type Room = typeof rooms.$inferSelect
export type NewRoom = typeof rooms.$inferInsert

