import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sites, buildings, floors, rooms, racks, devices, deviceTypes } from '@/lib/db/schema'
import { eq, or, inArray } from 'drizzle-orm'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // Find the site by UUID or code
    const [site] = await db
      .select()
      .from(sites)
      .where(or(eq(sites.id, id), eq(sites.code, id)))
      .limit(1)

    if (!site) {
      return NextResponse.json(
        { error: 'Site not found' },
        { status: 404 }
      )
    }

    const siteId = site.id

    // Fetch all buildings for this site
    const siteBuildings = await db
      .select()
      .from(buildings)
      .where(eq(buildings.siteId, siteId))

    if (siteBuildings.length === 0) {
      // Return empty scene config
      return NextResponse.json({
        siteId: site.code,
        building: {
          glbUri: '',
          transformWorld: { position: [0, 0, 0], rotationEuler: [0, 0, 0], scale: [1, 1, 1] },
        },
        buildings: [],
        floors: [],
        rooms: [],
        racks: [],
        devices: [],
      })
    }

    const buildingIds = siteBuildings.map((b) => b.id)

    // Fetch floors for all buildings
    const siteFloors = await db
      .select()
      .from(floors)
      .where(inArray(floors.buildingId, buildingIds))

    const floorIds = siteFloors.map((f) => f.id)

    // Fetch rooms for all floors
    const siteRooms = floorIds.length > 0
      ? await db
          .select()
          .from(rooms)
          .where(inArray(rooms.floorId, floorIds))
      : []

    const roomIds = siteRooms.map((r) => r.id)

    // Fetch racks for all rooms
    const siteRacks = roomIds.length > 0
      ? await db
          .select()
          .from(racks)
          .where(inArray(racks.roomId, roomIds))
      : []

    const rackIds = siteRacks.map((r) => r.id)

    // Fetch devices for all racks with device type info
    const siteDevices = rackIds.length > 0
      ? await db
          .select({
            id: devices.id,
            rackId: devices.rackId,
            deviceTypeId: devices.deviceTypeId,
            deviceTypeCode: deviceTypes.code,
            logicalEquipmentId: devices.logicalEquipmentId,
            name: devices.name,
            uStart: devices.uStart,
            uHeight: devices.uHeight,
            status4D: devices.status4D,
            powerKw: devices.powerKw,
          })
          .from(devices)
          .leftJoin(deviceTypes, eq(devices.deviceTypeId, deviceTypes.id))
          .where(inArray(devices.rackId, rackIds))
      : []

    // Create ID mapping for transformation (UUID -> original-style IDs)
    const buildingIdMap = new Map(siteBuildings.map((b, i) => [b.id, `bldg-${site.code}-${String.fromCharCode(97 + i)}`]))
    const floorIdMap = new Map(siteFloors.map((f) => [f.id, `floor-${buildingIdMap.get(f.buildingId)}-${f.level}`]))
    const roomIdMap = new Map(siteRooms.map((r, i) => [r.id, `room-DC-${String(i + 1).padStart(2, '0')}`]))
    const rackIdMap = new Map(siteRacks.map((r, i) => [r.id, `rack-${String(i + 1).padStart(2, '0')}`]))

    // Transform to SceneConfig format matching existing frontend types
    const sceneConfig = {
      siteId: site.code,
      
      // Legacy building format (use first building)
      building: {
        glbUri: siteBuildings[0]?.glbUri ?? '',
        transformWorld: siteBuildings[0]?.transformWorld ?? { position: [0, 0, 0], rotationEuler: [0, 0, 0], scale: [1, 1, 1] },
      },
      
      // Full buildings array
      buildings: siteBuildings.map((b) => ({
        id: buildingIdMap.get(b.id),
        siteId: site.code,
        name: b.name,
        glbUri: b.glbUri,
        transformWorld: b.transformWorld,
        floors: b.floorCount,
        area: b.areaSqm,
      })),
      
      floors: siteFloors.map((f) => ({
        id: floorIdMap.get(f.id),
        buildingId: buildingIdMap.get(f.buildingId),
        name: f.name,
        level: f.level,
        elevation: f.elevationM,
      })),
      
      rooms: siteRooms.map((r) => ({
        id: roomIdMap.get(r.id),
        floorId: floorIdMap.get(r.floorId),
        name: r.name,
        transformInBuilding: r.transformInBuilding,
        area: r.areaSqm,
      })),
      
      racks: siteRacks.map((r) => ({
        id: rackIdMap.get(r.id),
        roomId: roomIdMap.get(r.roomId),
        name: r.name,
        uHeight: r.uHeight,
        positionInRoom: r.positionInRoom,
        powerKwLimit: r.powerKwLimit,
        currentPowerKw: r.currentPowerKw,
      })),
      
      devices: siteDevices.map((d, i) => ({
        id: `dev-${String(i + 1).padStart(3, '0')}`,
        logicalEquipmentId: d.logicalEquipmentId,
        rackId: rackIdMap.get(d.rackId),
        deviceTypeId: d.deviceTypeCode, // Use code for compatibility
        name: d.name,
        uStart: d.uStart,
        uHeight: d.uHeight,
        status4D: d.status4D,
        powerKw: d.powerKw,
      })),
    }

    return NextResponse.json(sceneConfig)
  } catch (error) {
    console.error('Failed to fetch scene config:', error)
    return NextResponse.json(
      { error: 'Failed to fetch scene config' },
      { status: 500 }
    )
  }
}

