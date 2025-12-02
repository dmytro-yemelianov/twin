import { pgTable, text, timestamp, uuid, jsonb, boolean } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { devices } from './devices'
import { users } from './users'
import { modificationTypeEnum, phaseEnum } from './enums'

export type LocationData = {
  rackId: string
  uPosition: number
}

export type StatusChangeData = {
  from: string
  to: string
}

export const equipmentHistory = pgTable('equipment_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  deviceId: uuid('device_id').references(() => devices.id, { onDelete: 'set null' }),
  deviceName: text('device_name').notNull(), // Denormalized for history
  modificationType: modificationTypeEnum('modification_type').notNull(),
  targetPhase: phaseEnum('target_phase'),
  scheduledDate: timestamp('scheduled_date'),
  isApplied: boolean('is_applied').default(false).notNull(),
  fromLocation: jsonb('from_location').$type<LocationData | null>(),
  toLocation: jsonb('to_location').$type<LocationData | null>(),
  statusChange: jsonb('status_change').$type<StatusChangeData | null>(),
  notes: text('notes'),
  userId: uuid('user_id').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const equipmentHistoryRelations = relations(equipmentHistory, ({ one }) => ({
  device: one(devices, {
    fields: [equipmentHistory.deviceId],
    references: [devices.id],
  }),
  user: one(users, {
    fields: [equipmentHistory.userId],
    references: [users.id],
  }),
}))

export type EquipmentHistory = typeof equipmentHistory.$inferSelect
export type NewEquipmentHistory = typeof equipmentHistory.$inferInsert

