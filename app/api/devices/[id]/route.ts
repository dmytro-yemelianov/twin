import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { devices } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { deleteDevice } from '@/lib/services/device-operations.service'

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
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
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const body = await request.json().catch(() => ({}))
        const userId = body.userId || 'system' // TODO: Get from auth context

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
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const body = await request.json()
        const updates = body

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
