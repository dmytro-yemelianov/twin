import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { regions } from '@/lib/db/schema'
import { z } from 'zod'

// Validation schema for creating a region
const createRegionSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
})

export async function GET() {
  try {
    const allRegions = await db.select().from(regions)

    return NextResponse.json({ regions: allRegions })
  } catch (error) {
    console.error('Failed to fetch regions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch regions' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const validated = createRegionSchema.parse(body)

    const [newRegion] = await db.insert(regions).values(validated).returning()

    return NextResponse.json(newRegion, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Failed to create region:', error)
    return NextResponse.json(
      { error: 'Failed to create region' },
      { status: 500 }
    )
  }
}

