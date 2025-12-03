import { pgTable, text, timestamp, uuid, jsonb } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { sites } from './sites'
import { devices } from './devices'
import { users } from './users'
import { pgEnum } from 'drizzle-orm/pg-core'

// Anomaly type enum
export const anomalyTypeEnum = pgEnum('anomaly_type', [
    'MISSING',     // Expected equipment not found
    'UNEXPECTED',  // Equipment found but not in system
    'MISPLACED',   // Equipment in wrong location
    'MISMATCH',    // Attribute differences (dimensions, model, etc.)
])

// Severity enum
export const severityEnum = pgEnum('severity', ['HIGH', 'MEDIUM', 'LOW'])

// Anomaly status enum
export const anomalyStatusEnum = pgEnum('anomaly_status', [
    'OPEN',          // Newly detected
    'INVESTIGATING', // Being reviewed
    'RESOLVED',      // Fix applied
    'CLOSED',        // Verified and closed
    'FALSE_POSITIVE', // Not actually an anomaly
])

export const anomalies = pgTable('anomalies', {
    id: uuid('id').primaryKey().defaultRandom(),
    siteId: uuid('site_id')
        .references(() => sites.id, { onDelete: 'cascade' })
        .notNull(),
    deviceId: uuid('device_id').references(() => devices.id, { onDelete: 'set null' }),
    rackName: text('rack_name'), // Denormalized for history
    anomalyType: anomalyTypeEnum('anomaly_type').notNull(),
    severity: severityEnum('severity').notNull(),
    expectedValue: jsonb('expected_value'), // What system expected
    actualValue: jsonb('actual_value'), // What was found on-site
    status: anomalyStatusEnum('status').default('OPEN').notNull(),
    resolution: text('resolution'), // Description of how it was resolved
    resolutionAction: text('resolution_action'), // Action taken: ACCEPT_ACTUAL, UPDATE_SYSTEM, ESCALATE, etc.
    assignedTo: uuid('assigned_to').references(() => users.id),
    resolvedBy: uuid('resolved_by').references(() => users.id),
    notes: text('notes'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    resolvedAt: timestamp('resolved_at'),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const anomaliesRelations = relations(anomalies, ({ one }) => ({
    site: one(sites, {
        fields: [anomalies.siteId],
        references: [sites.id],
    }),
    device: one(devices, {
        fields: [anomalies.deviceId],
        references: [devices.id],
    }),
    assignee: one(users, {
        fields: [anomalies.assignedTo],
        references: [users.id],
    }),
    resolver: one(users, {
        fields: [anomalies.resolvedBy],
        references: [users.id],
    }),
}))

export type Anomaly = typeof anomalies.$inferSelect
export type NewAnomaly = typeof anomalies.$inferInsert
