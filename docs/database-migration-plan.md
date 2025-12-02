# Database Migration Plan

## Executive Summary

This document outlines the plan for migrating the Digital Twin application from static JSON files and localStorage to a proper database system. The goal is to enable:
- Multi-user collaboration
- Real-time data synchronization
- Data persistence across sessions and devices
- Audit trails and history tracking
- Scalable data management

---

## 1. Current State Analysis

### 1.1 Current Data Storage

| Storage Type | Location | Data | Limitations |
|-------------|----------|------|-------------|
| **Static JSON** | `/public/data/sites.json` | Site catalog (15 sites) | Read-only, no CRUD |
| **Static JSON** | `/public/data/device-types.json` | Equipment type catalog | Read-only, no CRUD |
| **Static JSON** | `/public/data/configs/site-*.json` | Scene configs (buildings, floors, rooms, racks, devices) | Read-only, no CRUD |
| **localStorage** | Browser | Equipment modifications tracker | Per-browser, not synced, 5MB limit |
| **localStorage** | Browser (Zustand persist) | UI preferences | Per-browser only |
| **In-memory** | Runtime cache | Fetched data with 5-min TTL | Lost on refresh |

### 1.2 Data Entities (Current)

```
Region (implicit in Site.region)
  └── Site
        ├── Building
        │     └── Floor
        │           └── Room
        │                 └── Rack
        │                       └── Device
        └── SceneConfig (composite)

DeviceType (catalog, shared globally)
EquipmentModification (change tracking)
```

### 1.3 Current TypeScript Types

From `lib/types.ts`:
- `Site` - Data center location with metadata
- `BuildingInfo` - Building within a site  
- `Floor` - Floor within a building
- `Room` - Room/data hall within a floor
- `Rack` - Equipment rack
- `Device` - Equipment installed in rack
- `DeviceType` - Equipment catalog entry
- `Transform` - 3D positioning (embedded)

From `lib/modification-tracker.ts`:
- `EquipmentModification` - Change record for audit trail

---

## 2. Database Engine Recommendation

### 2.1 Recommendation: **PostgreSQL**

**Primary Choice: PostgreSQL 16+**

| Factor | PostgreSQL | SQLite | MongoDB | MySQL |
|--------|------------|--------|---------|-------|
| **JSON Support** | ✅ Excellent (JSONB) | ✅ Good | ✅ Native | ⚠️ Limited |
| **Spatial Data** | ✅ PostGIS | ❌ Limited | ⚠️ 2dsphere | ⚠️ Basic |
| **Relational** | ✅ Strong | ✅ Strong | ❌ Document | ✅ Strong |
| **Transactions** | ✅ ACID | ✅ ACID | ⚠️ Limited | ✅ ACID |
| **Scalability** | ✅ Horizontal | ❌ Single file | ✅ Horizontal | ✅ Horizontal |
| **TypeScript ORM** | ✅ Prisma/Drizzle | ✅ Prisma/Drizzle | ⚠️ Mongoose | ✅ Prisma/Drizzle |
| **3D/Transform Data** | ✅ Array types | ⚠️ JSON only | ✅ Arrays | ⚠️ JSON only |
| **Self-hosted** | ✅ Easy | ✅ Trivial | ✅ Easy | ✅ Easy |
| **Cloud Options** | ✅ Many (Neon, Supabase, RDS) | ❌ Turso only | ✅ Atlas | ✅ PlanetScale |

### 2.2 ORM Choice: **Drizzle ORM**

**Why Drizzle over Prisma:**
- Type-safe SQL with full TypeScript inference
- Smaller bundle size (important for serverless/edge)
- SQL-like syntax (easier to understand queries)
- Better performance (no query engine overhead)
- Native JSON/JSONB support
- Works well with Next.js App Router

### 2.3 Hosting Recommendations

| Environment | Recommendation | Notes |
|-------------|---------------|-------|
| **Development** | Docker PostgreSQL | Local, fast iteration |
| **Production (Small)** | Neon or Supabase | Free tier available, serverless |
| **Production (Scale)** | AWS RDS or Supabase Pro | Multi-region, backups |
| **Self-hosted** | Docker Compose | Full control |

---

## 3. Database Schema Design

### 3.1 Entity Relationship Diagram

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Region    │────<│    Site     │────<│  Building   │
└─────────────┘     └─────────────┘     └─────────────┘
                                               │
                                               ▼
                    ┌─────────────┐     ┌─────────────┐
                    │    Room     │<────│    Floor    │
                    └─────────────┘     └─────────────┘
                           │
                           ▼
                    ┌─────────────┐     ┌─────────────┐
                    │    Rack     │────>│   Device    │
                    └─────────────┘     └─────────────┘
                                               │
                                               ▼
┌─────────────┐                        ┌──────────────────┐
│ DeviceType  │<───────────────────────│ EquipmentHistory │
└─────────────┘                        └──────────────────┘

┌─────────────┐     ┌─────────────┐
│    User     │────<│  UserPref   │
└─────────────┘     └─────────────┘
```

### 3.2 Schema Definition (Drizzle)

```typescript
// schema/regions.ts
import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const regions = pgTable('regions', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: text('code').notNull().unique(), // e.g., "US-East", "EU-West", "APAC"
  name: text('name').notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

```typescript
// schema/sites.ts
import { pgTable, text, timestamp, uuid, real, integer, pgEnum } from 'drizzle-orm/pg-core';
import { regions } from './regions';

export const siteStatusEnum = pgEnum('site_status', ['AI_READY', 'IN_PROGRESS', 'LEGACY']);

export const sites = pgTable('sites', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: text('code').notNull().unique(), // e.g., "site-nyc-01"
  name: text('name').notNull(), // e.g., "NYC-01"
  regionId: uuid('region_id').references(() => regions.id).notNull(),
  latitude: real('latitude').notNull(),
  longitude: real('longitude').notNull(),
  rackCount: integer('rack_count').default(0).notNull(),
  aiReadyRacks: integer('ai_ready_racks').default(0).notNull(),
  status: siteStatusEnum('status').default('LEGACY').notNull(),
  address: text('address'),
  timezone: text('timezone'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

```typescript
// schema/buildings.ts
import { pgTable, text, timestamp, uuid, real, integer, jsonb } from 'drizzle-orm/pg-core';
import { sites } from './sites';

// Transform stored as JSONB for flexibility
export type TransformData = {
  position: [number, number, number];
  rotationEuler: [number, number, number];
  scale: [number, number, number];
};

export const buildings = pgTable('buildings', {
  id: uuid('id').primaryKey().defaultRandom(),
  siteId: uuid('site_id').references(() => sites.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  glbUri: text('glb_uri'),
  transformWorld: jsonb('transform_world').$type<TransformData>().notNull(),
  floorCount: integer('floor_count').default(1),
  areaSqm: real('area_sqm'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

```typescript
// schema/floors.ts
import { pgTable, text, timestamp, uuid, integer, real } from 'drizzle-orm/pg-core';
import { buildings } from './buildings';

export const floors = pgTable('floors', {
  id: uuid('id').primaryKey().defaultRandom(),
  buildingId: uuid('building_id').references(() => buildings.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  level: integer('level').notNull(), // 0 = ground, -1 = basement, 1+ = upper
  elevationM: real('elevation_m').default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

```typescript
// schema/rooms.ts
import { pgTable, text, timestamp, uuid, real, jsonb } from 'drizzle-orm/pg-core';
import { floors } from './floors';
import type { TransformData } from './buildings';

export const rooms = pgTable('rooms', {
  id: uuid('id').primaryKey().defaultRandom(),
  floorId: uuid('floor_id').references(() => floors.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  transformInBuilding: jsonb('transform_in_building').$type<TransformData>().notNull(),
  areaSqm: real('area_sqm'),
  coolingCapacityKw: real('cooling_capacity_kw'),
  powerCapacityKw: real('power_capacity_kw'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

```typescript
// schema/racks.ts
import { pgTable, text, timestamp, uuid, real, integer, jsonb } from 'drizzle-orm/pg-core';
import { rooms } from './rooms';
import type { TransformData } from './buildings';

export const racks = pgTable('racks', {
  id: uuid('id').primaryKey().defaultRandom(),
  roomId: uuid('room_id').references(() => rooms.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(), // e.g., "A-01-01"
  uHeight: integer('u_height').default(42).notNull(),
  positionInRoom: jsonb('position_in_room').$type<TransformData>().notNull(),
  powerKwLimit: real('power_kw_limit').default(12.0).notNull(),
  currentPowerKw: real('current_power_kw').default(0).notNull(),
  weightKgLimit: real('weight_kg_limit'),
  isAiReady: boolean('is_ai_ready').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

```typescript
// schema/device-types.ts
import { pgTable, text, timestamp, uuid, integer, real, pgEnum } from 'drizzle-orm/pg-core';

export const deviceCategoryEnum = pgEnum('device_category', [
  'RACK', 'SERVER', 'SWITCH', 'STORAGE', 'NETWORK', 'GPU_SERVER', 'PDU', 'UPS', 'BLADE'
]);

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
});
```

```typescript
// schema/devices.ts
import { pgTable, text, timestamp, uuid, integer, real, pgEnum, boolean } from 'drizzle-orm/pg-core';
import { racks } from './racks';
import { deviceTypes } from './device-types';

export const status4DEnum = pgEnum('status_4d', [
  'EXISTING_RETAINED', 'EXISTING_REMOVED', 'PROPOSED', 'FUTURE', 'MODIFIED'
]);

export const devices = pgTable('devices', {
  id: uuid('id').primaryKey().defaultRandom(),
  rackId: uuid('rack_id').references(() => racks.id, { onDelete: 'cascade' }).notNull(),
  deviceTypeId: uuid('device_type_id').references(() => deviceTypes.id).notNull(),
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
});
```

```typescript
// schema/equipment-history.ts
import { pgTable, text, timestamp, uuid, integer, pgEnum, jsonb } from 'drizzle-orm/pg-core';
import { devices } from './devices';
import { users } from './users';

export const modificationTypeEnum = pgEnum('modification_type', ['move', 'add', 'remove', 'edit']);
export const phaseEnum = pgEnum('phase', ['AS_IS', 'TO_BE', 'FUTURE']);

export const equipmentHistory = pgTable('equipment_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  deviceId: uuid('device_id').references(() => devices.id, { onDelete: 'set null' }),
  deviceName: text('device_name').notNull(), // Denormalized for history
  modificationType: modificationTypeEnum('modification_type').notNull(),
  targetPhase: phaseEnum('target_phase'),
  scheduledDate: timestamp('scheduled_date'),
  isApplied: boolean('is_applied').default(false).notNull(),
  fromLocation: jsonb('from_location').$type<{ rackId: string; uPosition: number } | null>(),
  toLocation: jsonb('to_location').$type<{ rackId: string; uPosition: number } | null>(),
  statusChange: jsonb('status_change').$type<{ from: string; to: string } | null>(),
  notes: text('notes'),
  userId: uuid('user_id').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
```

```typescript
// schema/users.ts
import { pgTable, text, timestamp, uuid, pgEnum, jsonb } from 'drizzle-orm/pg-core';

export const userRoleEnum = pgEnum('user_role', ['admin', 'editor', 'viewer']);

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  name: text('name'),
  role: userRoleEnum('role').default('viewer').notNull(),
  avatarUrl: text('avatar_url'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// User preferences (replaces localStorage Zustand persist)
export const userPreferences = pgTable('user_preferences', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull().unique(),
  preferences: jsonb('preferences').$type<{
    currentPhase: string;
    colorMode: string;
    statusVisibility: Record<string, boolean>;
    showBuilding: boolean;
    showOrigin: boolean;
    showCompass: boolean;
    currentView3D: string;
    xrayMode: boolean;
  }>().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

### 3.3 Indexes

```typescript
// schema/indexes.ts
import { index } from 'drizzle-orm/pg-core';

// Spatial queries for map view
export const siteLocationIdx = index('site_location_idx').on(sites.latitude, sites.longitude);

// Hierarchy navigation
export const buildingSiteIdx = index('building_site_idx').on(buildings.siteId);
export const floorBuildingIdx = index('floor_building_idx').on(floors.buildingId);
export const roomFloorIdx = index('room_floor_idx').on(rooms.floorId);
export const rackRoomIdx = index('rack_room_idx').on(racks.roomId);
export const deviceRackIdx = index('device_rack_idx').on(devices.rackId);

// 4D phase queries
export const deviceStatusIdx = index('device_status_idx').on(devices.status4D);
export const deviceLogicalIdx = index('device_logical_idx').on(devices.logicalEquipmentId);

// History queries
export const historyDeviceIdx = index('history_device_idx').on(equipmentHistory.deviceId);
export const historyDateIdx = index('history_date_idx').on(equipmentHistory.createdAt);
```

---

## 4. API Design

### 4.1 API Routes Structure

```
/api
├── /sites
│   ├── GET    /                    # List all sites
│   ├── POST   /                    # Create site
│   ├── GET    /:id                 # Get site details
│   ├── PATCH  /:id                 # Update site
│   ├── DELETE /:id                 # Delete site
│   └── GET    /:id/scene           # Get full scene config (buildings, floors, rooms, racks, devices)
│
├── /buildings
│   ├── GET    /?siteId=            # List buildings for site
│   ├── POST   /                    # Create building
│   ├── GET    /:id                 # Get building
│   ├── PATCH  /:id                 # Update building
│   └── DELETE /:id                 # Delete building
│
├── /floors
│   ├── GET    /?buildingId=        # List floors for building
│   ├── POST   /                    # Create floor
│   ├── PATCH  /:id                 # Update floor
│   └── DELETE /:id                 # Delete floor
│
├── /rooms
│   ├── GET    /?floorId=           # List rooms for floor
│   ├── POST   /                    # Create room
│   ├── PATCH  /:id                 # Update room
│   └── DELETE /:id                 # Delete room
│
├── /racks
│   ├── GET    /?roomId=            # List racks for room
│   ├── POST   /                    # Create rack
│   ├── GET    /:id                 # Get rack with devices
│   ├── PATCH  /:id                 # Update rack
│   └── DELETE /:id                 # Delete rack
│
├── /devices
│   ├── GET    /?rackId=&status=    # List devices (filterable)
│   ├── POST   /                    # Create device
│   ├── GET    /:id                 # Get device details
│   ├── PATCH  /:id                 # Update device
│   ├── DELETE /:id                 # Delete device
│   └── POST   /:id/move            # Move device to new rack/position
│
├── /device-types
│   ├── GET    /                    # List all device types
│   ├── POST   /                    # Create device type
│   ├── PATCH  /:id                 # Update device type
│   └── DELETE /:id                 # Delete device type
│
├── /history
│   ├── GET    /?deviceId=&from=&to= # Query modification history
│   └── POST   /                     # Create history entry
│
├── /users
│   ├── GET    /me                  # Current user
│   └── PATCH  /me/preferences      # Update preferences
│
└── /regions
    └── GET    /                    # List all regions
```

### 4.2 Example API Handlers (Next.js App Router)

```typescript
// app/api/sites/route.ts
import { db } from '@/lib/db';
import { sites, regions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  const allSites = await db
    .select({
      id: sites.id,
      code: sites.code,
      name: sites.name,
      region: regions.name,
      lat: sites.latitude,
      lon: sites.longitude,
      rackCount: sites.rackCount,
      aiReadyRacks: sites.aiReadyRacks,
      status: sites.status,
    })
    .from(sites)
    .leftJoin(regions, eq(sites.regionId, regions.id));

  return Response.json({ sites: allSites });
}

export async function POST(request: Request) {
  const body = await request.json();
  // Validate with Zod
  const newSite = await db.insert(sites).values(body).returning();
  return Response.json(newSite[0], { status: 201 });
}
```

```typescript
// app/api/sites/[id]/scene/route.ts
import { db } from '@/lib/db';
import { sites, buildings, floors, rooms, racks, devices } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const siteId = params.id;

  // Fetch all related data in parallel
  const [site, siteBuildings, siteFloors, siteRooms, siteRacks, siteDevices] = await Promise.all([
    db.select().from(sites).where(eq(sites.id, siteId)).limit(1),
    db.select().from(buildings).where(eq(buildings.siteId, siteId)),
    db.select().from(floors)
      .innerJoin(buildings, eq(floors.buildingId, buildings.id))
      .where(eq(buildings.siteId, siteId)),
    // ... similar for rooms, racks, devices
  ]);

  // Transform to SceneConfig format
  const sceneConfig = {
    siteId,
    building: siteBuildings[0] ? {
      glbUri: siteBuildings[0].glbUri,
      transformWorld: siteBuildings[0].transformWorld,
    } : null,
    buildings: siteBuildings,
    floors: siteFloors,
    rooms: siteRooms,
    racks: siteRacks,
    devices: siteDevices,
  };

  return Response.json(sceneConfig);
}
```

---

## 5. Migration Strategy

### 5.1 Phased Approach

```
Phase 1: Setup & Schema (Week 1)
├── Set up PostgreSQL (Docker for dev)
├── Configure Drizzle ORM
├── Create schema files
├── Generate migrations
└── Set up connection pooling

Phase 2: Data Migration (Week 2)
├── Create migration scripts
├── Seed database from JSON files
├── Validate data integrity
└── Create backup procedures

Phase 3: API Layer (Week 2-3)
├── Create API routes
├── Add validation (Zod)
├── Implement CRUD operations
├── Add error handling
└── Write API tests

Phase 4: Frontend Integration (Week 3-4)
├── Update data-loader.ts to use API
├── Implement React Query/SWR for caching
├── Update Zustand store
├── Add optimistic updates
└── Handle loading/error states

Phase 5: History & Preferences (Week 4)
├── Migrate modification tracker
├── Migrate user preferences
├── Add real-time updates (optional)
└── Clean up localStorage usage

Phase 6: Testing & Deployment (Week 5)
├── Integration testing
├── Performance testing
├── Set up production database
├── Deploy and monitor
└── Remove static JSON files
```

### 5.2 Migration Scripts

```typescript
// scripts/migrate-json-to-db.ts
import { db } from '@/lib/db';
import { regions, sites, buildings, floors, rooms, racks, devices, deviceTypes } from '@/lib/db/schema';
import sitesData from '../public/data/sites.json';
import deviceTypesData from '../public/data/device-types.json';
import fs from 'fs';
import path from 'path';

async function migrateData() {
  console.log('Starting migration...');

  // 1. Create regions from unique site regions
  const uniqueRegions = [...new Set(sitesData.sites.map(s => s.region))];
  const regionMap = new Map<string, string>();
  
  for (const regionCode of uniqueRegions) {
    const [region] = await db.insert(regions)
      .values({ code: regionCode, name: regionCode })
      .returning();
    regionMap.set(regionCode, region.id);
  }
  console.log(`Created ${uniqueRegions.length} regions`);

  // 2. Migrate device types
  for (const dt of deviceTypesData.deviceTypes) {
    await db.insert(deviceTypes).values({
      code: dt.id,
      category: dt.category,
      name: dt.name,
      description: dt.description,
      modelRef: dt.modelRef,
      uHeight: dt.uHeight,
      powerKw: dt.powerKw,
      btuHr: dt.btuHr,
      gpuSlots: dt.gpuSlots,
    });
  }
  console.log(`Migrated ${deviceTypesData.deviceTypes.length} device types`);

  // 3. Migrate sites
  for (const site of sitesData.sites) {
    const [newSite] = await db.insert(sites).values({
      code: site.id,
      name: site.name,
      regionId: regionMap.get(site.region)!,
      latitude: site.lat,
      longitude: site.lon,
      rackCount: site.rackCount,
      aiReadyRacks: site.aiReadyRacks,
      status: site.status,
    }).returning();

    // 4. Load and migrate scene config
    const configPath = path.join(process.cwd(), 'public', site.sceneConfigUri);
    if (fs.existsSync(configPath)) {
      const sceneConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      await migrateSceneConfig(newSite.id, sceneConfig);
    }
  }

  console.log('Migration complete!');
}

async function migrateSceneConfig(siteId: string, config: any) {
  // Migrate buildings, floors, rooms, racks, devices...
  // (Implementation details)
}

migrateData().catch(console.error);
```

---

## 6. File Structure

```
lib/
├── db/
│   ├── index.ts              # Database connection
│   ├── schema/
│   │   ├── index.ts          # Export all schemas
│   │   ├── regions.ts
│   │   ├── sites.ts
│   │   ├── buildings.ts
│   │   ├── floors.ts
│   │   ├── rooms.ts
│   │   ├── racks.ts
│   │   ├── devices.ts
│   │   ├── device-types.ts
│   │   ├── equipment-history.ts
│   │   ├── users.ts
│   │   └── indexes.ts
│   ├── migrations/           # Drizzle migrations
│   └── seed.ts               # Seed data
│
├── api/
│   ├── client.ts             # API client (updated)
│   └── endpoints.ts          # Endpoint constants
│
├── services/                 # Business logic layer
│   ├── sites.service.ts
│   ├── scenes.service.ts
│   ├── devices.service.ts
│   └── history.service.ts
│
└── hooks/
    ├── use-sites.ts          # React Query hooks
    ├── use-scene.ts
    └── use-devices.ts
```

---

## 7. Configuration Files

### 7.1 Drizzle Config

```typescript
// drizzle.config.ts
import type { Config } from 'drizzle-kit';

export default {
  schema: './lib/db/schema',
  out: './lib/db/migrations',
  driver: 'pg',
  dbCredentials: {
    connectionString: process.env.DATABASE_URL!,
  },
} satisfies Config;
```

### 7.2 Environment Variables

```env
# .env.local
DATABASE_URL=postgresql://user:password@localhost:5432/twin_db
DATABASE_URL_UNPOOLED=postgresql://user:password@localhost:5432/twin_db

# For Neon/Supabase (production)
# DATABASE_URL=postgresql://user:password@host.neon.tech/twin_db?sslmode=require
```

### 7.3 Docker Compose (Development)

```yaml
# docker-compose.yml
version: '3.8'
services:
  postgres:
    image: postgres:16-alpine
    container_name: twin_postgres
    environment:
      POSTGRES_USER: twin_user
      POSTGRES_PASSWORD: twin_password
      POSTGRES_DB: twin_db
    ports:
      - '5432:5432'
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

---

## 8. Package Dependencies

```json
{
  "dependencies": {
    "drizzle-orm": "^0.29.0",
    "@neondatabase/serverless": "^0.7.0",
    "postgres": "^3.4.0",
    "@tanstack/react-query": "^5.17.0",
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "drizzle-kit": "^0.20.0",
    "dotenv": "^16.3.0"
  }
}
```

---

## 9. Benefits After Migration

| Aspect | Before | After |
|--------|--------|-------|
| **Data Persistence** | Browser localStorage | Centralized PostgreSQL |
| **Multi-user** | Single user per browser | Full collaboration |
| **Sync** | None | Real-time capable |
| **Audit Trail** | Basic localStorage | Full history with user tracking |
| **Search** | Client-side only | Database-powered queries |
| **Scalability** | Limited by JSON file size | Unlimited |
| **Backup** | Manual JSON export | Automated DB backups |
| **Access Control** | None | Role-based (viewer/editor/admin) |

---

## 10. Next Steps

1. **Review this plan** with stakeholders
2. **Choose hosting** (Neon recommended for easy start)
3. **Set up development environment** with Docker
4. **Begin Phase 1** implementation

---

*Document created: December 2, 2025*
*Version: 1.0*

