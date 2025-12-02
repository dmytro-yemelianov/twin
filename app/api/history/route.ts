import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { equipmentHistory, devices } from '@/lib/db/schema'
import { eq, and, gte, lte, desc } from 'drizzle-orm'
import { z } from 'zod'

// Validation schema for creating a history entry
const createHistorySchema = z.object({
  deviceId: z.string().uuid().optional(),
  deviceName: z.string().min(1),
  modificationType: z.enum(['move', 'add', 'remove', 'edit']),
  targetPhase: z.enum(['AS_IS', 'TO_BE', 'FUTURE']).optional(),
  scheduledDate: z.string().datetime().optional(),
  isApplied: z.boolean().optional().default(false),
  fromLocation: z.object({
    rackId: z.string(),
    uPosition: z.number(),
  }).nullable().optional(),
  toLocation: z.object({
    rackId: z.string(),
    uPosition: z.number(),
  }).nullable().optional(),
  statusChange: z.object({
    from: z.string(),
    to: z.string(),
  }).nullable().optional(),
  notes: z.string().optional(),
  userId: z.string().uuid().optional(),
})

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const deviceId = searchParams.get('deviceId')
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const limit = parseInt(searchParams.get('limit') ?? '100', 10)

    // Build conditions
    const conditions = []
    
    if (deviceId) {
      conditions.push(eq(equipmentHistory.deviceId, deviceId))
    }
    
    if (from) {
      conditions.push(gte(equipmentHistory.createdAt, new Date(from)))
    }
    
    if (to) {
      conditions.push(lte(equipmentHistory.createdAt, new Date(to)))
    }

    const history = await db
      .select()
      .from(equipmentHistory)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(equipmentHistory.createdAt))
      .limit(limit)

    // Transform to match existing EquipmentModification interface
    const transformedHistory = history.map((h) => ({
      id: h.id,
      timestamp: h.createdAt.toISOString(),
      type: h.modificationType,
      deviceId: h.deviceId,
      deviceName: h.deviceName,
      targetPhase: h.targetPhase,
      scheduledDate: h.scheduledDate?.toISOString(),
      isApplied: h.isApplied,
      from: h.fromLocation,
      to: h.toLocation,
      statusChange: h.statusChange,
      notes: h.notes,
      userId: h.userId,
    }))

    return NextResponse.json({ history: transformedHistory })
  } catch (error) {
    console.error('Failed to fetch history:', error)
    return NextResponse.json(
      { error: 'Failed to fetch history' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const validated = createHistorySchema.parse(body)

    const [newHistory] = await db
      .insert(equipmentHistory)
      .values({
        ...validated,
        scheduledDate: validated.scheduledDate ? new Date(validated.scheduledDate) : undefined,
      })
      .returning()

    return NextResponse.json(newHistory, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Failed to create history entry:', error)
    return NextResponse.json(
      { error: 'Failed to create history entry' },
      { status: 500 }
    )
  }
}

