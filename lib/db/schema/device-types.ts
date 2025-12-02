import { pgTable, text, timestamp, uuid, integer, real } from 'drizzle-orm/pg-core'
import { deviceCategoryEnum } from './enums'

export const deviceTypes = pgTable('device_types', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: text('code').notNull().unique(), // e.g., "gpu-server-4u"
  category: deviceCategoryEnum('category').notNull(),
  name: text('name'),
  description: text('description'),
  modelRef: text('model_ref'), // GLB file path
  uHeight: integer('u_height').notNull(),
  powerKw: real('power_kw'),
  btuHr: real('btu_hr'),
  gpuSlots: integer('gpu_slots'),
  weightKg: real('weight_kg'),
  depthMm: integer('depth_mm'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export type DeviceType = typeof deviceTypes.$inferSelect
export type NewDeviceType = typeof deviceTypes.$inferInsert

