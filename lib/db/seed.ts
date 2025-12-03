/**
 * Database seeding script
 * Run with: pnpm db:seed
 * 
 * This script migrates data from the static JSON files to the database.
 */

import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'
import { eq } from 'drizzle-orm'

// Import JSON data
import sitesJson from '../../public/data/sites.json'
import deviceTypesJson from '../../public/data/device-types.json'

// Scene configs will be imported dynamically
const sceneConfigs: Record<string, string> = {
  'site-nyc-01': '/data/configs/site-nyc-01.json',
  'site-sf-01': '/data/configs/site-sf-01.json',
  'site-chi-01': '/data/configs/site-chi-01.json',
  'site-mia-01': '/data/configs/site-mia-01.json',
}

async function loadSceneConfig(uri: string) {
  // In Node.js environment, use fs
  const fs = await import('fs')
  const path = await import('path')
  const filePath = path.join(process.cwd(), 'public', uri)
  
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf-8')
    return JSON.parse(content)
  }
  return null
}

async function seed() {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is not set')
    console.log('\nTo set up your database with Supabase:')
    console.log('1. Create an account at https://supabase.com (free)')
    console.log('2. Create a new project')
    console.log('3. Go to Project Settings > Database')
    console.log('4. Copy the "Connection string" (URI format)')
    console.log('5. Create a .env.local file with: DATABASE_URL="your-connection-string"')
    console.log('\nNote: Use the "Transaction" pooler connection string for best compatibility')
    process.exit(1)
  }

  console.log('🌱 Starting database seed...\n')

  const client = postgres(process.env.DATABASE_URL, { prepare: false })
  const db = drizzle(client, { schema })

  try {
    // 1. Create regions from unique site regions
    console.log('📍 Creating regions...')
    const uniqueRegions = [...new Set(sitesJson.sites.map((s) => s.region))]
    const regionMap = new Map<string, string>()

    for (const regionCode of uniqueRegions) {
      // Check if region exists
      const existing = await db
        .select()
        .from(schema.regions)
        .where(eq(schema.regions.code, regionCode))
        .limit(1)

      if (existing.length > 0) {
        regionMap.set(regionCode, existing[0].id)
        console.log(`  ✓ Region "${regionCode}" already exists`)
      } else {
        const [newRegion] = await db
          .insert(schema.regions)
          .values({ code: regionCode, name: regionCode })
          .returning()
        regionMap.set(regionCode, newRegion.id)
        console.log(`  ✓ Created region "${regionCode}"`)
      }
    }
    console.log(`  Total: ${uniqueRegions.length} regions\n`)

    // 2. Migrate device types
    console.log('🔧 Creating device types...')
    const deviceTypeMap = new Map<string, string>()

    for (const dt of deviceTypesJson.deviceTypes) {
      const existing = await db
        .select()
        .from(schema.deviceTypes)
        .where(eq(schema.deviceTypes.code, dt.id))
        .limit(1)

      if (existing.length > 0) {
        deviceTypeMap.set(dt.id, existing[0].id)
        console.log(`  ✓ Device type "${dt.id}" already exists`)
      } else {
        const [newDt] = await db
          .insert(schema.deviceTypes)
          .values({
            code: dt.id,
            category: dt.category as any,
            name: (dt as any).name,
            description: dt.description,
            modelRef: dt.modelRef,
            uHeight: dt.uHeight,
            powerKw: (dt as any).powerKw || 0,
            btuHr: (dt as any).btuHr || 0,
            gpuSlots: (dt as any).gpuSlots || 0,
          })
          .returning()
        deviceTypeMap.set(dt.id, newDt.id)
        console.log(`  ✓ Created device type "${dt.id}"`)
      }
    }
    console.log(`  Total: ${deviceTypesJson.deviceTypes.length} device types\n`)

    // 3. Migrate sites and their scene configs
    console.log('🏢 Creating sites and scene data...')

    for (const site of sitesJson.sites) {
      // Check if site exists
      const existingSite = await db
        .select()
        .from(schema.sites)
        .where(eq(schema.sites.code, site.id))
        .limit(1)

      let siteId: string

      if (existingSite.length > 0) {
        siteId = existingSite[0].id
        console.log(`  ✓ Site "${site.name}" already exists`)
      } else {
        const [newSite] = await db
          .insert(schema.sites)
          .values({
            code: site.id,
            name: site.name,
            regionId: regionMap.get(site.region)!,
            latitude: site.lat,
            longitude: site.lon,
            rackCount: site.rackCount,
            aiReadyRacks: site.aiReadyRacks,
            status: site.status as any,
          })
          .returning()
        siteId = newSite.id
        console.log(`  ✓ Created site "${site.name}"`)
      }

      // Load and migrate scene config if available
      const sceneConfigUri = sceneConfigs[site.id]
      if (sceneConfigUri) {
        const sceneConfig = await loadSceneConfig(sceneConfigUri)
        if (sceneConfig) {
          await migrateSceneConfig(db, siteId, sceneConfig, deviceTypeMap)
        }
      }
    }
    console.log(`  Total: ${sitesJson.sites.length} sites\n`)

    console.log('✅ Seed completed successfully!')
    
    // Close connection
    await client.end()
  } catch (error) {
    console.error('❌ Seed failed:', error)
    await client.end()
    process.exit(1)
  }
}

async function migrateSceneConfig(
  db: any,
  siteId: string,
  config: any,
  deviceTypeMap: Map<string, string>
) {
  const buildingMap = new Map<string, string>()
  const floorMap = new Map<string, string>()
  const roomMap = new Map<string, string>()
  const rackMap = new Map<string, string>()

  // Migrate buildings
  if (config.buildings) {
    for (const building of config.buildings) {
      const [newBuilding] = await db
        .insert(schema.buildings)
        .values({
          siteId,
          name: building.name,
          glbUri: building.glbUri,
          transformWorld: building.transformWorld,
          floorCount: building.floors,
          areaSqm: building.area,
        })
        .onConflictDoNothing()
        .returning()

      if (newBuilding) {
        buildingMap.set(building.id, newBuilding.id)
      }
    }
  }

  // Migrate floors
  if (config.floors) {
    for (const floor of config.floors) {
      const buildingId = buildingMap.get(floor.buildingId)
      if (!buildingId) continue

      const [newFloor] = await db
        .insert(schema.floors)
        .values({
          buildingId,
          name: floor.name,
          level: floor.level,
          elevationM: floor.elevation,
        })
        .onConflictDoNothing()
        .returning()

      if (newFloor) {
        floorMap.set(floor.id, newFloor.id)
      }
    }
  }

  // Migrate rooms
  if (config.rooms) {
    for (const room of config.rooms) {
      const floorId = floorMap.get(room.floorId)
      if (!floorId) continue

      const [newRoom] = await db
        .insert(schema.rooms)
        .values({
          floorId,
          name: room.name,
          transformInBuilding: room.transformInBuilding,
          areaSqm: room.area,
        })
        .onConflictDoNothing()
        .returning()

      if (newRoom) {
        roomMap.set(room.id, newRoom.id)
      }
    }
  }

  // Migrate racks
  if (config.racks) {
    for (const rack of config.racks) {
      const roomId = roomMap.get(rack.roomId)
      if (!roomId) continue

      const [newRack] = await db
        .insert(schema.racks)
        .values({
          roomId,
          name: rack.name,
          uHeight: rack.uHeight,
          positionInRoom: rack.positionInRoom,
          powerKwLimit: rack.powerKwLimit,
          currentPowerKw: rack.currentPowerKw,
        })
        .onConflictDoNothing()
        .returning()

      if (newRack) {
        rackMap.set(rack.id, newRack.id)
      }
    }
  }

  // Migrate devices
  if (config.devices) {
    for (const device of config.devices) {
      const rackId = rackMap.get(device.rackId)
      const deviceTypeId = deviceTypeMap.get(device.deviceTypeId)
      if (!rackId || !deviceTypeId) continue

      await db
        .insert(schema.devices)
        .values({
          rackId,
          deviceTypeId,
          logicalEquipmentId: device.logicalEquipmentId,
          name: device.name,
          uStart: device.uStart,
          uHeight: device.uHeight,
          status4D: device.status4D as any,
          powerKw: device.powerKw,
        })
        .onConflictDoNothing()
    }
  }
}

// Run seed
seed()
