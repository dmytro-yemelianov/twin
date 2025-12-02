import { pgEnum } from 'drizzle-orm/pg-core'

// Site status enum
export const siteStatusEnum = pgEnum('site_status', ['AI_READY', 'IN_PROGRESS', 'LEGACY'])

// Device category enum
export const deviceCategoryEnum = pgEnum('device_category', [
  'RACK',
  'SERVER',
  'SWITCH',
  'STORAGE',
  'NETWORK',
  'GPU_SERVER',
  'PDU',
  'UPS',
  'BLADE',
])

// 4D Status enum for lifecycle management
export const status4DEnum = pgEnum('status_4d', [
  'EXISTING_RETAINED',
  'EXISTING_REMOVED',
  'PROPOSED',
  'FUTURE',
  'MODIFIED',
])

// Phase enum for viewing modes
export const phaseEnum = pgEnum('phase', ['AS_IS', 'TO_BE', 'FUTURE'])

// Modification type for history tracking
export const modificationTypeEnum = pgEnum('modification_type', ['move', 'add', 'remove', 'edit'])

// User role enum
export const userRoleEnum = pgEnum('user_role', ['admin', 'editor', 'viewer'])

