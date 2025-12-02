import { pgTable, text, timestamp, uuid, integer, real } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { buildings } from './buildings'
import { rooms } from './rooms'

export const floors = pgTable('floors', {
  id: uuid('id').primaryKey().defaultRandom(),
  buildingId: uuid('building_id')
    .references(() => buildings.id, { onDelete: 'cascade' })
    .notNull(),
  name: text('name').notNull(),
  level: integer('level').notNull(), // 0 = ground, -1 = basement, 1+ = upper
  elevationM: real('elevation_m').default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const floorsRelations = relations(floors, ({ one, many }) => ({
  building: one(buildings, {
    fields: [floors.buildingId],
    references: [buildings.id],
  }),
  rooms: many(rooms),
}))

export type Floor = typeof floors.$inferSelect
export type NewFloor = typeof floors.$inferInsert

