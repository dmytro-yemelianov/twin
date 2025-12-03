import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { devices } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { deleteDevice } from '@/lib/services/device-operations.service'

const updateDeviceSchema = z.object({
    rackId: z.string().uuid().optional(),
    deviceTypeId: z.string().uuid().optional(),
    logicalEquipmentId: z.string().optional(),
    name: z.string().min(1).optional(),
    uStart: z.coerce.number().int().nonnegative().optional(),
    uHeight: z.coerce.number().int().positive().optional(),
    status4D: z
        .enum(['EXISTING_RETAINED', 'EXISTING_REMOVED', 'MODIFIED', 'PROPOSED', 'FUTURE'])
        .optional(),
    powerKw: z.coerce.number().min(0).optional(),
    serialNumber: z.string().optional(),
    assetTag: z.string().optional(),
    customer: z.string().optional(),
    sourceSystem: z.string().optional(),
    widthMm: z.coerce.number().int().positive().optional(),
    depthMm: z.coerce.number().int().positive().optional(),
    purchaseDate: z.coerce.date().optional(),
    warrantyExpiry: z.coerce.date().optional(),
    notes: z.string().optional(),
    isActive: z.boolean().optional(),
})

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = params
        const [device] = await db
            .select()
            .from(devices)
            .where(eq(devices.id, id))

        if (!device) {
            return NextResponse.json(
                { error: 'Device not found' },
                { status: 404 }
            )
        }

        return NextResponse.json(device)
    } catch (error) {
        console.error('Error fetching device:', error)
        return NextResponse.json(
            { error: 'Failed to fetch device' },
            { status: 500 }
        )
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = params
        const userId = request.headers.get('x-user-id')

        if (!userId) {
            return NextResponse.json(
                { error: 'User authentication required' },
                { status: 401 }
            )
        }

        const result = await deleteDevice({
            deviceId: id,
            userId,
        })

        if (!result.success) {
            return NextResponse.json(
                { error: result.error },
                { status: result.error === 'Device not found' ? 404 : 500 }
            )
        }

        return NextResponse.json({
            success: true,
            device: result.device,
            message: 'Device soft-deleted (isActive set to false)',
        })
    } catch (error) {
        console.error('Error deleting device:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = params
        const body = await request.json()
        const parsed = updateDeviceSchema.safeParse(body)

        if (!parsed.success) {
            return NextResponse.json(
                { error: 'Validation failed', details: parsed.error.flatten() },
                { status: 400 }
            )
        }

        const updates = parsed.data

        if (Object.keys(updates).length === 0) {
            return NextResponse.json(
                { error: 'No valid fields provided for update' },
                { status: 400 }
            )
        }

        const [updated] = await db
            .update(devices)
            .set({
                ...updates,
                updatedAt: new Date(),
            })
            .where(eq(devices.id, id))
            .returning()

        if (!updated) {
            return NextResponse.json(
                { error: 'Device not found' },
                { status: 404 }
            )
        }

        return NextResponse.json(updated)
    } catch (error) {
        console.error('Error updating device:', error)
        return NextResponse.json(
            { error: 'Failed to update device' },
            { status: 500 }
        )
    }
}
