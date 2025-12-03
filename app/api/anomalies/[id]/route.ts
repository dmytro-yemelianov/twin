import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { anomalies } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const body = await request.json()
        const { status, assignedTo, notes, severity } = body

        const updateData: any = {
            updatedAt: new Date(),
        }

        if (status) updateData.status = status
        if (assignedTo) updateData.assignedTo = assignedTo
        if (notes) updateData.notes = notes
        if (severity) updateData.severity = severity

        await db
            .update(anomalies)
            .set(updateData)
            .where(eq(anomalies.id, id))

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error updating anomaly:', error)
        return NextResponse.json(
            { error: 'Failed to update anomaly' },
            { status: 500 }
        )
    }
}

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const [anomaly] = await db
            .select()
            .from(anomalies)
            .where(eq(anomalies.id, id))

        if (!anomaly) {
            return NextResponse.json(
                { error: 'Anomaly not found' },
                { status: 404 }
            )
        }

        return NextResponse.json(anomaly)
    } catch (error) {
        console.error('Error fetching anomaly:', error)
        return NextResponse.json(
            { error: 'Failed to fetch anomaly' },
            { status: 500 }
        )
    }
}
