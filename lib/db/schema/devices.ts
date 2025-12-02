import { pgTable, text, timestamp, uuid, integer, real, boolean } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { racks } from './racks'
import { deviceTypes } from './device-types'
import { status4DEnum } from './enums'

export const devices = pgTable('devices', {
  id: uuid('id').primaryKey().defaultRandom(),
  rackId: uuid('rack_id')
    .references(() => racks.id, { onDelete: 'cascade' })
    .notNull(),
  deviceTypeId: uuid('device_type_id')
    .references(() => deviceTypes.id)
    .notNull(),
  logicalEquipmentId: text('logical_equipment_id'), // Links physical instances across phases
  name: text('name').notNull(),
  uStart: integer('u_start').notNull(),
  uHeight: integer('u_height').notNull(),
  status4D: status4DEnum('status_4d').default('EXISTING_RETAINED').notNull(),
  powerKw: real('power_kw').default(0).notNull(),
  serialNumber: text('serial_number'),
  assetTag: text('asset_tag'),
  purchaseDate: timestamp('purchase_date'),
  warrantyExpiry: timestamp('warranty_expiry'),
  notes: text('notes'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const devicesRelations = relations(devices, ({ one }) => ({
  rack: one(racks, {
    fields: [devices.rackId],
    references: [racks.id],
  }),
  deviceType: one(deviceTypes, {
    fields: [devices.deviceTypeId],
    references: [deviceTypes.id],
  }),
}))

export type Device = typeof devices.$inferSelect
export type NewDevice = typeof devices.$inferInsert

