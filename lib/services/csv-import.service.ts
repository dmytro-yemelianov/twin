import { db } from '@/lib/db'
import { sites, buildings, floors, rooms, racks, devices, deviceTypes, anomalies } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { detectAnomalies, saveAnomalies, type VerificationDevice } from './anomaly-detection.service'

// CSV row type based on DUMM-Inventory.csv structure
export interface DummInventoryCsvRow {
    STATE: string
    CITY: string
    CLLI: string
    'RACK ID': string
    'BAY NAME': string
    BAY: string
    RACK: string
    CHASSIS: string
    USAGE: string
    'FULL RACK NAME': string
    'RACK STATUS': string
    'RACK CREATED': string
    'RACK MODIFIED': string
    'EQUIPMENT NAME': string
    'EQPT STATUS': string
    'EQPT-W': string
    'EQPT-H': string
    'EQPT-D': string
    'EQPT CREATED': string
    'EQPT MODIFIED': string
    'RACK-W': string
    'RACK-H': string
    'RACK-D': string
    EQPT_ID: string
    'SOURCE SYSTEM': string
}

export interface ImportResult {
    success: boolean
    sitesCreated: number
    racksCreated: number
    devicesCreated: number
    anomaliesDetected: number
    anomaliesDetails?: {
        missing: number
        unexpected: number
        misplaced: number
        mismatch: number
    }
    errors: string[]
    warnings: string[]
}

// Status mapping from CSV to 4D status enum
const STATUS_MAPPING: Record<string, string> = {
    'IN SERVICE': 'EXISTING_RETAINED',
    'OUT OF SERVICE': 'EXISTING_REMOVED',
    'PLANNED': 'PROPOSED',
    'FUTURE': 'FUTURE',
    'MODIFIED': 'MODIFIED',
}

// Usage to room type mapping
const USAGE_TO_ROOM_TYPE: Record<string, string> = {
    'FACILITY': 'MECHANICAL',
    'CUSTOMER': 'DATA_HALL',
}

/**
 * Import equipment inventory from DUMM-Inventory.csv format
 */
export async function importDummInventoryCsv(
    csvRows: DummInventoryCsvRow[],
    regionId: string
): Promise<ImportResult> {
    const result: ImportResult = {
        success: true,
        sitesCreated: 0,
        racksCreated: 0,
        devicesCreated: 0,
        anomaliesDetected: 0,
        errors: [],
        warnings: [],
    }

    try {
        // 1. Group rows by CLLI (site identifier)
        const rowsBySite = new Map<string, DummInventoryCsvRow[]>()
        for (const row of csvRows) {
            if (!row.CLLI) {
                result.warnings.push(`Row missing CLLI, skipping: ${JSON.stringify(row)}`)
                continue
            }
            if (!rowsBySite.has(row.CLLI)) {
                rowsBySite.set(row.CLLI, [])
            }
            rowsBySite.get(row.CLLI)!.push(row)
        }

        // 2. Process each site and collect verification data
        const verificationData: VerificationDevice[] = []
        let importedSiteId: string | null = null

        for (const [clli, siteRows] of rowsBySite) {
            try {
                const siteId = await importSite(clli, siteRows, regionId, result)
                if (!importedSiteId) importedSiteId = siteId
                
                // Collect verification data from imported rows
                for (const row of siteRows) {
                    if (row['EQUIPMENT NAME'] && row['FULL RACK NAME']) {
                        verificationData.push({
                            rackName: row['FULL RACK NAME'],
                            deviceName: row['EQUIPMENT NAME'],
                            uPosition: parseIntSafe(row.CHASSIS) ?? undefined,
                            uHeight: parseUHeight(row['EQPT-H']) ?? undefined,
                            serialNumber: row.EQPT_ID,
                            widthMm: parseIntSafe(row['EQPT-W']) ?? undefined,
                            depthMm: parseIntSafe(row['EQPT-D']) ?? undefined,
                            status: row['EQPT STATUS']
                        })
                    }
                }
            } catch (error) {
                result.errors.push(`Failed to import site ${clli}: ${error}`)
                result.success = false
            }
        }

        // 3. Run anomaly detection if we have verification data and a site
        if (verificationData.length > 0 && importedSiteId) {
            try {
                const anomalyResult = await detectAnomalies(importedSiteId, verificationData)
                result.anomaliesDetected = anomalyResult.anomalies.length
                result.anomaliesDetails = {
                    missing: anomalyResult.summary.missing,
                    unexpected: anomalyResult.summary.unexpected,
                    misplaced: anomalyResult.summary.misplaced,
                    mismatch: anomalyResult.summary.mismatch
                }

                // Save detected anomalies
                if (anomalyResult.anomalies.length > 0) {
                    await saveAnomalies(importedSiteId, anomalyResult.anomalies)
                }
            } catch (error) {
                result.warnings.push(`Anomaly detection failed: ${error}`)
            }
        }
    } catch (error) {
        result.errors.push(`Import failed: ${error}`)
        result.success = false
    }

    return result
}

async function importSite(
    clli: string,
    siteRows: DummInventoryCsvRow[],
    regionId: string,
    result: ImportResult
): Promise<string> {
    // Check if site already exists
    const existingSites = await db.select().from(sites).where(eq(sites.clli, clli))

    let site
    if (existingSites.length > 0) {
        site = existingSites[0]
    } else {
        // Create new site
        const firstRow = siteRows[0]
        const [newSite] = await db.insert(sites).values({
            code: clli,
            name: firstRow.CITY || clli,
            regionId: regionId,
            clli: clli,
            latitude: 0, // Would need geocoding or manual entry
            longitude: 0,
            address: `${firstRow.STATE}, ${firstRow.CITY}`,
            status: 'LEGACY',
        }).returning()

        site = newSite
        result.sitesCreated++
    }

    // Create building (assume single building per site for now)
    const [building] = await db.insert(buildings).values({
        siteId: site.id,
        name: 'Main Building',
        transformWorld: {
            position: [0, 0, 0],
            rotationEuler: [0, 0, 0],
            scale: [1, 1, 1],
        },
    }).returning()

    // Create floor (assume ground floor)
    const [floor] = await db.insert(floors).values({
        buildingId: building.id,
        name: 'Ground Floor',
        level: 0,
    }).returning()

    // Extract unique rooms from BAY NAME pattern
    const uniqueRooms = new Set<string>()
    for (const row of siteRows) {
        const roomName = extractRoomFromBayName(row['BAY NAME'])
        if (roomName) {
            uniqueRooms.add(roomName)
        }
    }

    // Create rooms
    const roomMap = new Map<string, string>() // roomName -> roomId
    for (const roomName of uniqueRooms) {
        const usage = siteRows.find(r => extractRoomFromBayName(r['BAY NAME']) === roomName)?.USAGE || 'CUSTOMER'

        const [room] = await db.insert(rooms).values({
            floorId: floor.id,
            name: roomName,
            transformInBuilding: {
                position: [0, 0, 0],
                rotationEuler: [0, 0, 0],
                scale: [1, 1, 1],
            },
        }).returning()

        roomMap.set(roomName, room.id)
    }

    // Extract unique racks
    const uniqueRacks = new Map<string, DummInventoryCsvRow>()
    for (const row of siteRows) {
        if (row['RACK ID'] && row.RACK) {
            uniqueRacks.set(row['RACK ID'], row)
        }
    }

    // Create racks
    const rackMap = new Map<string, string>() // rackId -> dbRackId
    let rackOrder = 0

    for (const [rackId, rackRow] of uniqueRacks) {
        const roomName = extractRoomFromBayName(rackRow['BAY NAME'])
        const roomId = roomName ? roomMap.get(roomName) : null

        if (!roomId) {
            result.warnings.push(`Could not determine room for rack ${rackId}`)
            continue
        }

        const [rack] = await db.insert(racks).values({
            roomId: roomId,
            name: rackRow['FULL RACK NAME'] || rackId,
            uHeight: parseRackHeight(rackRow['RACK-H']) || 42,
            positionInRoom: {
                position: [0, 0, 0],
                rotationEuler: [0, 0, 0],
                scale: [1, 1, 1],
            },
            rackOrder: rackOrder++,
            widthMm: parseIntSafe(rackRow['RACK-W']),
            depthMm: parseIntSafe(rackRow['RACK-D']),
            heightMm: calculateHeightMm(parseRackHeight(rackRow['RACK-H'])),
        }).returning()

        rackMap.set(rackId, rack.id)
        result.racksCreated++
    }

    // Create device type for unknown equipment (if needed)
    let defaultDeviceType
    const defaultTypes = await db.select().from(deviceTypes).where(eq(deviceTypes.code, 'unknown-1u'))
    if (defaultTypes.length > 0) {
        defaultDeviceType = defaultTypes[0]
    } else {
        const [newType] = await db.insert(deviceTypes).values({
            code: 'unknown-1u',
            category: 'SERVER',
            name: 'Unknown Equipment',
            uHeight: 1,
        }).returning()
        defaultDeviceType = newType
    }

    // Import devices
    for (const row of siteRows) {
        if (!row['EQUIPMENT NAME'] || !row['RACK ID']) {
            continue
        }

        const dbRackId = rackMap.get(row['RACK ID'])
        if (!dbRackId) {
            result.warnings.push(`Rack not found for device: ${row['EQUIPMENT NAME']}`)
            continue
        }

        try {
            await db.insert(devices).values({
                rackId: dbRackId,
                deviceTypeId: defaultDeviceType.id,
                name: row['EQUIPMENT NAME'],
                uStart: 1, // Would need actual U position from data
                uHeight: parseUHeight(row['EQPT-H']) || 1,
                status4D: mapStatus(row['EQPT STATUS']),
                serialNumber: row.EQPT_ID,
                sourceSystem: row['SOURCE SYSTEM'],
                widthMm: parseIntSafe(row['EQPT-W']),
                depthMm: parseIntSafe(row['EQPT-D']),
            })
            result.devicesCreated++
        } catch (error) {
            result.warnings.push(`Failed to import device ${row['EQUIPMENT NAME']}: ${error}`)
        }
    }
    
    return site.id
}

// Helper functions

function extractRoomFromBayName(bayName: string): string | null {
    if (!bayName) return null
    // Extract room identifier from bay name pattern like "DUMMCOCF.001.0001..001.001"
    // Assuming format: SITE.BUILDING.FLOOR..ROOM.RACK
    const parts = bayName.split('.')
    if (parts.length >= 4) {
        return `Room-${parts[3]}` // Use 4th segment as room identifier
    }
    return 'Default Room'
}

function parseRackHeight(value: string | undefined): number | null {
    if (!value) return null
    const num = parseInt(value)
    return isNaN(num) ? null : num
}

function parseUHeight(value: string | undefined): number | null {
    if (!value) return null
    // Convert from millimeters to U units if needed
    const num = parseInt(value)
    if (isNaN(num)) return null

    // If value > 100, assume millimeters and convert
    if (num > 100) {
        return Math.round(num / 44.45) // 1U = 44.45mm
    }
    return num
}

function parseIntSafe(value: string | undefined): number | null {
    if (!value) return null
    const num = parseInt(value)
    return isNaN(num) ? null : num
}

function calculateHeightMm(uHeight: number | null): number | null {
    if (!uHeight) return null
    return Math.round(uHeight * 44.45)
}

function mapStatus(csvStatus: string | undefined): 'EXISTING_RETAINED' | 'EXISTING_REMOVED' | 'PROPOSED' | 'FUTURE' | 'MODIFIED' {
    if (!csvStatus) return 'EXISTING_RETAINED'
    return (STATUS_MAPPING[csvStatus.toUpperCase()] as any) || 'EXISTING_RETAINED'
}
