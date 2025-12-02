import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sites, regions } from '@/lib/db/schema'
import { eq, or } from 'drizzle-orm'
import { z } from 'zod'

// Validation schema for updating a site
const updateSiteSchema = z.object({
  name: z.string().min(1).optional(),
  regionId: z.string().uuid().optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  rackCount: z.number().int().min(0).optional(),
  aiReadyRacks: z.number().int().min(0).optional(),
  status: z.enum(['AI_READY', 'IN_PROGRESS', 'LEGACY']).optional(),
  address: z.string().optional(),
  timezone: z.string().optional(),
})

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // Try to find by UUID first, then by code
    const site = await db
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
      .where(or(eq(sites.id, id), eq(sites.code, id)))
      .limit(1)

    if (site.length === 0) {
      return NextResponse.json(
        { error: 'Site not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(site[0])
  } catch (error) {
    console.error('Failed to fetch site:', error)
    return NextResponse.json(
      { error: 'Failed to fetch site' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const validated = updateSiteSchema.parse(body)

    const [updatedSite] = await db
      .update(sites)
      .set({ ...validated, updatedAt: new Date() })
      .where(or(eq(sites.id, id), eq(sites.code, id)))
      .returning()

    if (!updatedSite) {
      return NextResponse.json(
        { error: 'Site not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(updatedSite)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Failed to update site:', error)
    return NextResponse.json(
      { error: 'Failed to update site' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    const [deletedSite] = await db
      .delete(sites)
      .where(or(eq(sites.id, id), eq(sites.code, id)))
      .returning()

    if (!deletedSite) {
      return NextResponse.json(
        { error: 'Site not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, deleted: deletedSite })
  } catch (error) {
    console.error('Failed to delete site:', error)
    return NextResponse.json(
      { error: 'Failed to delete site' },
      { status: 500 }
    )
  }
}

