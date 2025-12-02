import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sites, regions } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

// Validation schema for creating a site
const createSiteSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  regionId: z.string().uuid(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  rackCount: z.number().int().min(0).optional().default(0),
  aiReadyRacks: z.number().int().min(0).optional().default(0),
  status: z.enum(['AI_READY', 'IN_PROGRESS', 'LEGACY']).optional().default('LEGACY'),
  address: z.string().optional(),
  timezone: z.string().optional(),
})

export async function GET() {
  try {
    const allSites = await db
      .select({
        id: sites.id,
        code: sites.code,
        name: sites.name,
        region: regions.name,
        regionId: sites.regionId,
        lat: sites.latitude,
        lon: sites.longitude,
        rackCount: sites.rackCount,
        aiReadyRacks: sites.aiReadyRacks,
        status: sites.status,
        address: sites.address,
        timezone: sites.timezone,
      })
      .from(sites)
      .leftJoin(regions, eq(sites.regionId, regions.id))

    // Transform to match existing frontend Site interface
    const transformedSites = allSites.map((site) => ({
      id: site.code, // Use code as id for compatibility
      name: site.name,
      region: site.region ?? 'Unknown',
      lat: site.lat,
      lon: site.lon,
      rackCount: site.rackCount,
      aiReadyRacks: site.aiReadyRacks,
      status: site.status,
      sceneConfigUri: `/api/sites/${site.id}/scene`, // Point to API
      // Additional fields
      _dbId: site.id,
      regionId: site.regionId,
      address: site.address,
      timezone: site.timezone,
    }))

    return NextResponse.json({ sites: transformedSites })
  } catch (error) {
    console.error('Failed to fetch sites:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sites' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const validated = createSiteSchema.parse(body)

    const [newSite] = await db.insert(sites).values(validated).returning()

    return NextResponse.json(newSite, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Failed to create site:', error)
    return NextResponse.json(
      { error: 'Failed to create site' },
      { status: 500 }
    )
  }
}

