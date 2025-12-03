import { NextRequest, NextResponse } from 'next/server'
import { moveDevice } from '@/lib/services/device-operations.service'
import type { Phase } from '@/lib/types'

export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const body = await request.json()
        const { targetRackId, targetUPosition, targetPhase, moveType, userId } = body

        // Validation
        if (!targetRackId || targetUPosition === undefined || !targetPhase || !moveType) {
            return NextResponse.json(
                { error: 'Missing required fields: targetRackId, targetUPosition, targetPhase, moveType' },
                { status: 400 }
            )
        }

        if (!['MODIFIED', 'CREATE_PROPOSED'].includes(moveType)) {
            return NextResponse.json(
                { error: 'Invalid moveType. Must be MODIFIED or CREATE_PROPOSED' },
                { status: 400 }
            )
        }

        if (!['AS_IS', 'TO_BE', 'FUTURE'].includes(targetPhase)) {
            return NextResponse.json(
                { error: 'Invalid targetPhase. Must be AS_IS, TO_BE, or FUTURE' },
                { status: 400 }
            )
        }

        // Execute move
        const result = await moveDevice({
            deviceId: params.id,
            targetRackId,
            targetUPosition,
            targetPhase: targetPhase as Phase,
            moveType,
            userId: userId || 'system', // TODO: Get from auth context
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
