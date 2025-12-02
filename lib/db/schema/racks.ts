import { pgTable, text, timestamp, uuid, real, integer, jsonb, boolean } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { rooms } from './rooms'
import { devices } from './devices'
import type { TransformData } from './buildings'

export const racks = pgTable('racks', {
  id: uuid('id').primaryKey().defaultRandom(),
  roomId: uuid('room_id')
    .references(() => rooms.id, { onDelete: 'cascade' })
    .notNull(),
  name: text('name').notNull(), // e.g., "A-01-01"
  uHeight: integer('u_height').default(42).notNull(),
  positionInRoom: jsonb('position_in_room').$type<TransformData>().notNull(),
  powerKwLimit: real('power_kw_limit').default(12.0).notNull(),
  currentPowerKw: real('current_power_kw').default(0).notNull(),
  weightKgLimit: real('weight_kg_limit'),
  isAiReady: boolean('is_ai_ready').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const racksRelations = relations(racks, ({ one, many }) => ({
  room: one(rooms, {
    fields: [racks.roomId],
    references: [rooms.id],
  }),
  devices: many(devices),
}))

export type Rack = typeof racks.$inferSelect
export type NewRack = typeof racks.$inferInsert

