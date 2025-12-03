import { db } from '@/lib/db'
import { devices, racks, equipmentHistory, users } from '@/lib/db/schema'
import { eq, and, or, ne } from 'drizzle-orm'
import type { Phase } from '@/lib/types'

export interface MoveDeviceOptions {
    deviceId: string
    targetRackId: string
    targetUPosition: number
    targetPhase: Phase
    moveType: 'MODIFIED' | 'CREATE_PROPOSED' // User selectable
    userId: string
}

export interface DeleteDeviceOptions {
    deviceId: string
    userId: string
}

export interface ValidationResult {
    valid: boolean
    conflicts?: Array<{
        deviceId: string
        deviceName: string
        uStart: number
        uEnd: number
    }>
    error?: string
}

/**
 * Get devices that are visible/active in a specific phase for a rack
 */
export async function getDevicesInPhase(
    rackId: string,
    phase: Phase
): Promise<typeof devices.$inferSelect[]> {
    const statusFilters = {
        AS_IS: ['EXISTING_RETAINED', 'EXISTING_REMOVED', 'MODIFIED'],
        TO_BE: ['EXISTING_RETAINED', 'PROPOSED', 'MODIFIED'],
        FUTURE: ['EXISTING_RETAINED', 'PROPOSED', 'FUTURE'],
    }[phase]

    const result = await db
        .select()
        .from(devices)
        .where(
            and(
                eq(devices.rackId, rackId),
                eq(devices.isActive, true),
                or(...statusFilters.map(status => eq(devices.status4D, status as any)))
            )
        )

    return result
}

/**
 * Validate that a device can be placed in the target rack position
 */
export async function validateRackSpace(
    rackId: string,
    uPosition: number,
    uHeight: number,
    phase: Phase,
    excludeDeviceId?: string
): Promise<ValidationResult> {
    const devicesInPhase = await getDevicesInPhase(rackId, phase)

    const targetEnd = uPosition + uHeight
    const conflicts = []

    for (const device of devicesInPhase) {
        if (device.id === excludeDeviceId) continue

        const deviceEnd = device.uStart + device.uHeight

        // Check for overlap: devices overlap if NOT (one ends before the other starts)
        const overlaps = !(deviceEnd <= uPosition || device.uStart >= targetEnd)

        if (overlaps) {
            conflicts.push({
                deviceId: device.id,
                deviceName: device.name,
                uStart: device.uStart,
                uEnd: deviceEnd,
            })
        }
    }

    if (conflicts.length > 0) {
        return {
            valid: false,
            conflicts,
            error: `U-space conflict detected. ${conflicts.length} device(s) occupy overlapping positions.`,
        }
    }

    return { valid: true }
}

/**
 * Move a device to a new rack/position with validation
 */
export async function moveDevice(options: MoveDeviceOptions): Promise<{
    success: boolean
    device?: typeof devices.$inferSelect
    newDevice?: typeof devices.$inferSelect
    error?: string
}> {
    const { deviceId, targetRackId, targetUPosition, targetPhase, moveType, userId } = options

    try {
        // 1. Get the device
        const [device] = await db.select().from(devices).where(eq(devices.id, deviceId))
        if (!device) {
            return { success: false, error: 'Device not found' }
        }

        // 2. Validate rack space
        const validation = await validateRackSpace(
            targetRackId,
            targetUPosition,
            device.uHeight,
            targetPhase,
            deviceId // Exclude current device if moving within same rack
        )

        if (!validation.valid) {
            return { success: false, error: validation.error, ...validation }
        }

        // 3. Perform move based on user's choice
        if (moveType === 'MODIFIED') {
            // Option A: Mark as MODIFIED, update location
            const [updated] = await db
                .update(devices)
                .set({
                    status4D: 'MODIFIED',
                    rackId: targetRackId,
                    uStart: targetUPosition,
                    updatedAt: new Date(),
                })
                .where(eq(devices.id, deviceId))
                .returning()

            // Record in history
            await db.insert(equipmentHistory).values({
                deviceId: device.id,
                deviceName: device.name,
                modificationType: 'move',
                targetPhase,
                fromLocation: {
                    rackId: device.rackId,
                    uPosition: device.uStart,
                },
                toLocation: {
                    rackId: targetRackId,
                    uPosition: targetUPosition,
                },
                userId,
                notes: `Device moved from rack ${device.rackId} to ${targetRackId}`,
            })

            return { success: true, device: updated }
        } else {
            // Option B: Create PROPOSED copy, mark original as EXISTING_REMOVED
            const logicalId = device.logicalEquipmentId || `logical-${Date.now()}`

            // Update original to EXISTING_REMOVED
            await db
                .update(devices)
                .set({
                    status4D: 'EXISTING_REMOVED',
                    logicalEquipmentId: logicalId,
                    updatedAt: new Date(),
                })
                .where(eq(devices.id, deviceId))

            // Create new PROPOSED copy
            const [newDevice] = await db
                .insert(devices)
                .values({
                    rackId: targetRackId,
                    deviceTypeId: device.deviceTypeId,
                    logicalEquipmentId: logicalId,
                    name: device.name,
                    uStart: targetUPosition,
                    uHeight: device.uHeight,
                    status4D: 'PROPOSED',
                    powerKw: device.powerKw,
                    serialNumber: device.serialNumber,
                    assetTag: device.assetTag,
                    customer: device.customer,
                    sourceSystem: device.sourceSystem,
                    widthMm: device.widthMm,
                    depthMm: device.depthMm,
                    isActive: true,
                })
                .returning()

            // Record history for both
            await db.insert(equipmentHistory).values([
                {
                    deviceId: device.id,
                    deviceName: device.name,
                    modificationType: 'move',
                    targetPhase,
                    fromLocation: { rackId: device.rackId, uPosition: device.uStart },
                    statusChange: { from: device.status4D, to: 'EXISTING_REMOVED' },
                    userId,
                    notes: `Original device marked for removal (relocation planned)`,
                },
                {
                    deviceId: newDevice.id,
                    deviceName: newDevice.name,
                    modificationType: 'add',
                    targetPhase,
                    toLocation: { rackId: targetRackId, uPosition: targetUPosition },
                    statusChange: { from: null, to: 'PROPOSED' },
                    userId,
                    notes: `New device created for planned relocation (linked: ${logicalId})`,
                },
            ])

            return { success: true, device, newDevice }
        }
    } catch (error) {
        console.error('Error moving device:', error)
        return { success: false, error: 'Failed to move device' }
    }
}

/**
 * Soft-delete a device (set isActive =false)
 */
export async function deleteDevice(options: DeleteDeviceOptions): Promise<{
    success: boolean
    device?: typeof devices.$inferSelect
    error?: string
}> {
    const { deviceId, userId } = options

    try {
        // 1. Get the device
        const [device] = await db.select().from(devices).where(eq(devices.id, deviceId))
        if (!device) {
            return { success: false, error: 'Device not found' }
        }

        // 2. Soft delete: set isActive = false
        // Optionally also transition to EXISTING_REMOVED if currently EXISTING_RETAINED
        const newStatus = device.status4D === 'EXISTING_RETAINED' ? 'EXISTING_REMOVED' : device.status4D

        const [updated] = await db
            .update(devices)
            .set({
                isActive: false,
                status4D: newStatus as any,
                updatedAt: new Date(),
            })
            .where(eq(devices.id, deviceId))
            .returning()

        // 3. Record in history
        await db.insert(equipmentHistory).values({
            deviceId: device.id,
            deviceName: device.name,
            modificationType: 'remove',
            statusChange: {
                from: device.status4D,
                to: newStatus,
            },
            userId,
            notes: `Device soft-deleted (isActive set to false)`,
        })

        return { success: true, device: updated }
    } catch (error) {
        console.error('Error deleting device:', error)
        return { success: false, error: 'Failed to delete device' }
    }
}
