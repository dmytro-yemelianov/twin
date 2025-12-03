import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { moveDevice } from '@/lib/services/device-operations.service'
import type { Phase } from '@/lib/types'

const moveDeviceSchema = z.object({
    targetRackId: z.string().uuid(),
    targetUPosition: z.coerce.number().int().nonnegative(),
    targetPhase: z.enum(['AS_IS', 'TO_BE', 'FUTURE']),
    moveType: z.enum(['MODIFIED', 'CREATE_PROPOSED']),
})

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const userId = request.headers.get('x-user-id')

        if (!userId) {
            return NextResponse.json(
                { error: 'User authentication required' },
                { status: 401 }
            )
        }

        const body = await request.json()
        const parsed = moveDeviceSchema.safeParse(body)

        if (!parsed.success) {
            return NextResponse.json(
                { error: 'Validation failed', details: parsed.error.flatten() },
                { status: 400 }
            )
        }

        const { targetRackId, targetUPosition, targetPhase, moveType } = parsed.data

        // Execute move
        const result = await moveDevice({
            deviceId: id,
            targetRackId,
            targetUPosition,
            targetPhase: targetPhase as Phase,
            moveType,
            userId,
        })

        if (!result.success) {
            return NextResponse.json(
                { error: result.error, conflicts: result.conflicts },
                { status: result.conflicts ? 409 : 500 }
            )
        }

        return NextResponse.json({
            success: true,
            device: result.device,
            newDevice: result.newDevice,
            message: moveType === 'MODIFIED'
                ? 'Device marked as MODIFIED and moved'
                : 'New PROPOSED device created, original marked EXISTING_REMOVED',
        })
    } catch (error) {
        console.error('Error in move device API:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
