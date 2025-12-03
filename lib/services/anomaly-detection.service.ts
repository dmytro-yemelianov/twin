import { db } from '@/lib/db'
import { devices, racks, rooms, anomalies } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'

export interface VerificationDevice {
    rackName: string
    deviceName: string
    uPosition?: number
    uHeight?: number
    serialNumber?: string
    model?: string
    widthMm?: number
    depthMm?: number
    status?: string
}

export interface AnomalyDetectionResult {
    anomalies: DetectedAnomaly[]
    summary: {
        total: number
        missing: number
        unexpected: number
        misplaced: number
        mismatch: number
        highSeverity: number
        mediumSeverity: number
        lowSeverity: number
    }
}

export interface DetectedAnomaly {
    type: 'MISSING' | 'UNEXPECTED' | 'MISPLACED' | 'MISMATCH'
    severity: 'HIGH' | 'MEDIUM' | 'LOW'
    deviceName: string
    rackName: string
    expectedValue: any
    actualValue: any
    description: string
    deviceId?: string
}

/**
 * Detect anomalies by comparing expected (system) vs actual (verified) equipment data
 */
export async function detectAnomalies(
    siteId: string,
    verificationData: VerificationDevice[]
): Promise<AnomalyDetectionResult> {
    const detectedAnomalies: DetectedAnomaly[] = []

    // Get all expected devices for the site
    const expectedDevices = await getExpectedDevicesForSite(siteId)

    // Create maps for quick lookup
    const expectedByRackAndName = new Map<string, typeof expectedDevices[0]>()
    const actualByRackAndName = new Map<string, VerificationDevice>()

    for (const device of expectedDevices) {
        const key = `${device.rackName}::${device.deviceName}`
        expectedByRackAndName.set(key, device)
    }

    for (const device of verificationData) {
        const key = `${device.rackName}::${device.deviceName}`
        actualByRackAndName.set(key, device)
    }

    // 1. Detect MISSING equipment (expected but not found)
    for (const [key, expected] of expectedByRackAndName) {
        if (!actualByRackAndName.has(key)) {
            const severity = calculateMissingSeverity(expected)
            detectedAnomalies.push({
                type: 'MISSING',
                severity,
                deviceName: expected.deviceName,
                rackName: expected.rackName,
                deviceId: expected.id,
                expectedValue: {
                    name: expected.deviceName,
                    rack: expected.rackName,
                    uPosition: expected.uStart,
                    serialNumber: expected.serialNumber,
                },
                actualValue: null,
                description: `Equipment "${expected.deviceName}" expected in rack ${expected.rackName} but not found during verification`,
            })
        }
    }

    // 2. Detect UNEXPECTED equipment (found but not in system)
    for (const [key, actual] of actualByRackAndName) {
        if (!expectedByRackAndName.has(key)) {
            detectedAnomalies.push({
                type: 'UNEXPECTED',
                severity: 'MEDIUM',
                deviceName: actual.deviceName,
                rackName: actual.rackName,
                expectedValue: null,
                actualValue: {
                    name: actual.deviceName,
                    rack: actual.rackName,
                    uPosition: actual.uPosition,
                    serialNumber: actual.serialNumber,
                },
                description: `Equipment "${actual.deviceName}" found in rack ${actual.rackName} but not in system`,
            })
        }
    }

    // 3. Detect MISMATCHES for equipment that exists in both
    for (const [key, expected] of expectedByRackAndName) {
        const actual = actualByRackAndName.get(key)
        if (!actual) continue

        const mismatches: string[] = []

        // Check U position
        if (actual.uPosition && expected.uStart && actual.uPosition !== expected.uStart) {
            mismatches.push(`U position differs: expected ${expected.uStart}, actual ${actual.uPosition}`)
        }

        // Check serial number
        if (actual.serialNumber && expected.serialNumber && actual.serialNumber !== expected.serialNumber) {
            mismatches.push(`Serial number differs: expected ${expected.serialNumber}, actual ${actual.serialNumber}`)
        }

        // Check dimensions (with tolerance)
        if (actual.widthMm && expected.widthMm) {
            const widthDiff = Math.abs(actual.widthMm - expected.widthMm)
            const widthDiffPercent = (widthDiff / expected.widthMm) * 100
            if (widthDiffPercent > 10) {
                mismatches.push(`Width differs by ${widthDiffPercent.toFixed(1)}%: expected ${expected.widthMm}mm, actual ${actual.widthMm}mm`)
            }
        }

        if (actual.depthMm && expected.depthMm) {
            const depthDiff = Math.abs(actual.depthMm - expected.depthMm)
            const depthDiffPercent = (depthDiff / expected.depthMm) * 100
            if (depthDiffPercent > 10) {
                mismatches.push(`Depth differs by ${depthDiffPercent.toFixed(1)}%: expected ${expected.depthMm}mm, actual ${actual.depthMm}mm`)
            }
        }

        if (mismatches.length > 0) {
            detectedAnomalies.push({
                type: 'MISMATCH',
                severity: 'LOW',
                deviceName: expected.deviceName,
                rackName: expected.rackName,
                deviceId: expected.id,
                expectedValue: {
                    uPosition: expected.uStart,
                    serialNumber: expected.serialNumber,
                    widthMm: expected.widthMm,
                    depthMm: expected.depthMm,
                },
                actualValue: {
                    uPosition: actual.uPosition,
                    serialNumber: actual.serialNumber,
                    widthMm: actual.widthMm,
                    depthMm: actual.depthMm,
                },
                description: `Attribute mismatches for "${expected.deviceName}": ${mismatches.join('; ')}`,
            })
        }
    }

    // Calculate summary
    const summary = {
        total: detectedAnomalies.length,
        missing: detectedAnomalies.filter(a => a.type === 'MISSING').length,
        unexpected: detectedAnomalies.filter(a => a.type === 'UNEXPECTED').length,
        misplaced: detectedAnomalies.filter(a => a.type === 'MISPLACED').length,
        mismatch: detectedAnomalies.filter(a => a.type === 'MISMATCH').length,
        highSeverity: detectedAnomalies.filter(a => a.severity === 'HIGH').length,
        mediumSeverity: detectedAnomalies.filter(a => a.severity === 'MEDIUM').length,
        lowSeverity: detectedAnomalies.filter(a => a.severity === 'LOW').length,
    }

    return {
        anomalies: detectedAnomalies,
        summary,
    }
}

/**
 * Save detected anomalies to database
 */
export async function saveAnomalies(
    siteId: string,
    detectedAnomalies: DetectedAnomaly[]
): Promise<void> {
    for (const anomaly of detectedAnomalies) {
        await db.insert(anomalies).values({
            siteId,
            deviceId: anomaly.deviceId || null,
            rackName: anomaly.rackName,
            anomalyType: anomaly.type,
            severity: anomaly.severity,
            expectedValue: anomaly.expectedValue,
            actualValue: anomaly.actualValue,
            status: 'OPEN',
            notes: anomaly.description,
        })
    }
}

/**
 * Resolve an anomaly by accepting actual data and updating system
 */
export async function resolveAnomalyAcceptActual(
    anomalyId: string,
    userId: string
): Promise<void> {
    // Get anomaly details
    const [anomaly] = await db.select().from(anomalies).where(eq(anomalies.id, anomalyId))

    if (!anomaly) {
        throw new Error('Anomaly not found')
    }

    if (anomaly.anomalyType === 'UNEXPECTED' && anomaly.actualValue) {
        // Create new device from actual data
        // Would need rack lookup and other logic here
        // For now, just mark as resolved
    } else if (anomaly.anomalyType === 'MISMATCH' && anomaly.deviceId && anomaly.actualValue) {
        // Type cast to access properties
        const actualValue = anomaly.actualValue as any

        // Update device with actual values
        await db.update(devices)
            .set({
                uStart: actualValue.uPosition || undefined,
                serialNumber: actualValue.serialNumber || undefined,
                widthMm: actualValue.widthMm || undefined,
                depthMm: actualValue.depthMm || undefined,
                updatedAt: new Date(),
            })
            .where(eq(devices.id, anomaly.deviceId))
    }

    // Mark anomaly as resolved
    await db.update(anomalies)
        .set({
            status: 'RESOLVED',
            resolution: 'System updated to match actual state',
            resolutionAction: 'ACCEPT_ACTUAL',
            resolvedBy: userId,
            resolvedAt: new Date(),
            updatedAt: new Date(),
        })
        .where(eq(anomalies.id, anomalyId))
}

// Helper functions

async function getExpectedDevicesForSite(siteId: string) {
    // Join devices -> racks -> rooms -> floors -> buildings -> sites to filter by siteId
    const { buildings, floors } = await import('@/lib/db/schema')

    const result = await db
        .select({
            id: devices.id,
            deviceName: devices.name,
            rackName: racks.name,
            uStart: devices.uStart,
            uHeight: devices.uHeight,
            serialNumber: devices.serialNumber,
            widthMm: devices.widthMm,
            depthMm: devices.depthMm,
            status4D: devices.status4D,
        })
        .from(devices)
        .innerJoin(racks, eq(devices.rackId, racks.id))
        .innerJoin(rooms, eq(racks.roomId, rooms.id))
        .innerJoin(floors, eq(rooms.floorId, floors.id))
        .innerJoin(buildings, eq(floors.buildingId, buildings.id))
        .where(
            and(
                eq(buildings.siteId, siteId),
                eq(devices.isActive, true),
                eq(devices.status4D, 'EXISTING_RETAINED')
            )
        )

    return result
}


function calculateMissingSeverity(device: any): 'HIGH' | 'MEDIUM' | 'LOW' {
    // High severity for critical equipment types
    const criticalKeywords = ['switch', 'router', 'server', 'storage', 'core']
    const isCritical = criticalKeywords.some(keyword =>
        device.deviceName.toLowerCase().includes(keyword)
    )

    return isCritical ? 'HIGH' : 'MEDIUM'
}
