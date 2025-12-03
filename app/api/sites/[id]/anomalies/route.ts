import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { anomalies } from '@/lib/db/schema'
import { eq, desc, and } from 'drizzle-orm'
import { detectAnomalies, saveAnomalies, VerificationDevice } from '@/lib/services/anomaly-detection.service'

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const searchParams = request.nextUrl.searchParams
        const status = searchParams.get('status')
        const severity = searchParams.get('severity')
        const type = searchParams.get('type')

        // Note: Drizzle query building with dynamic filters is better done with array of conditions
        const conditions = [eq(anomalies.siteId, params.id)]
        if (status) conditions.push(eq(anomalies.status, status as any))
        if (severity) conditions.push(eq(anomalies.severity, severity as any))
        if (type) conditions.push(eq(anomalies.anomalyType, type as any))

        const results = await db
            .select()
            .from(anomalies)
            .where(and(...conditions))
            .orderBy(desc(anomalies.createdAt))

        return NextResponse.json(results)
    } catch (error) {
        console.error('Error fetching anomalies:', error)
        return NextResponse.json(
            { error: 'Failed to fetch anomalies' },
            { status: 500 }
        )
    }
}

export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const body = await request.json()
        const { verificationData, save = true } = body

        if (!verificationData || !Array.isArray(verificationData)) {
            return NextResponse.json(
                { error: 'Invalid verification data' },
                { status: 400 }
            )
        }

        // Run detection
        const result = await detectAnomalies(
            params.id,
            verificationData as VerificationDevice[]
        )

        // Save if requested
        if (save && result.anomalies.length > 0) {
            await saveAnomalies(params.id, result.anomalies)
        }

        return NextResponse.json(result)
    } catch (error) {
        console.error('Error detecting anomalies:', error)
        return NextResponse.json(
            { error: 'Failed to detect anomalies' },
            { status: 500 }
        )
    }
}
