import { NextRequest, NextResponse } from 'next/server'
import { resolveAnomalyAcceptActual } from '@/lib/services/anomaly-detection.service'

export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const body = await request.json()
        const { userId, action } = body

        if (!userId) {
            return NextResponse.json(
                { error: 'User ID is required' },
                { status: 400 }
            )
        }

        if (action === 'ACCEPT_ACTUAL') {
            await resolveAnomalyAcceptActual(params.id, userId)
            return NextResponse.json({ success: true })
        }

        return NextResponse.json(
            { error: 'Invalid resolution action' },
            { status: 400 }
        )
    } catch (error) {
        console.error('Error resolving anomaly:', error)
        return NextResponse.json(
            { error: 'Failed to resolve anomaly' },
            { status: 500 }
        )
    }
}
