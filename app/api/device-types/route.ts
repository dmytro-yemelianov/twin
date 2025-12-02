import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { deviceTypes } from '@/lib/db/schema'
import { z } from 'zod'

// Validation schema for creating a device type
const createDeviceTypeSchema = z.object({
  code: z.string().min(1),
  category: z.enum(['RACK', 'SERVER', 'SWITCH', 'STORAGE', 'NETWORK', 'GPU_SERVER', 'PDU', 'UPS', 'BLADE']),
  name: z.string().optional(),
  description: z.string().optional(),
  modelRef: z.string().optional(),
  uHeight: z.number().int().min(0),
  powerKw: z.number().optional(),
  btuHr: z.number().optional(),
  gpuSlots: z.number().int().optional(),
  weightKg: z.number().optional(),
  depthMm: z.number().int().optional(),
})

export async function GET() {
  try {
    const allDeviceTypes = await db.select().from(deviceTypes)

    // Transform to match existing frontend DeviceType interface
    const transformedDeviceTypes = allDeviceTypes.map((dt) => ({
      id: dt.code, // Use code as id for compatibility
      category: dt.category,
      modelRef: dt.modelRef,
      uHeight: dt.uHeight,
      name: dt.name,
      description: dt.description,
      powerKw: dt.powerKw,
      btuHr: dt.btuHr,
      gpuSlots: dt.gpuSlots,
      // Additional fields
      _dbId: dt.id,
      weightKg: dt.weightKg,
      depthMm: dt.depthMm,
    }))

    return NextResponse.json({ deviceTypes: transformedDeviceTypes })
  } catch (error) {
    console.error('Failed to fetch device types:', error)
    return NextResponse.json(
      { error: 'Failed to fetch device types' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const validated = createDeviceTypeSchema.parse(body)

    const [newDeviceType] = await db.insert(deviceTypes).values(validated).returning()

    return NextResponse.json(newDeviceType, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Failed to create device type:', error)
    return NextResponse.json(
      { error: 'Failed to create device type' },
      { status: 500 }
    )
  }
}

