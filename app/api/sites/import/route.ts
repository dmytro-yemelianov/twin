import { NextRequest, NextResponse } from 'next/server'
import { importDummInventoryCsv, DummInventoryCsvRow } from '@/lib/services/csv-import.service'

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData()
        const file = formData.get('file') as File
        const regionId = formData.get('regionId') as string

        if (!file) {
            return NextResponse.json(
                { error: 'File is required' },
                { status: 400 }
            )
        }

        if (!regionId) {
            return NextResponse.json(
                { error: 'Region ID is required' },
                { status: 400 }
            )
        }

        const text = await file.text()
        const rows = parseCsv(text)

        const result = await importDummInventoryCsv(rows, regionId)

        return NextResponse.json(result)
    } catch (error) {
        console.error('Error importing CSV:', error)
        return NextResponse.json(
            { error: 'Failed to import CSV' },
            { status: 500 }
        )
    }
}

function parseCsv(text: string): DummInventoryCsvRow[] {
    const lines = text.split(/\r?\n/).filter(line => line.trim() !== '')
    if (lines.length === 0) return []

    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))
    const rows: DummInventoryCsvRow[] = []

    for (let i = 1; i < lines.length; i++) {
        // Simple CSV split (doesn't handle commas inside quotes perfectly, but sufficient for DUMM format)
        // For robust parsing, use a library like csv-parse or papa-parse
        // Here we assume standard CSV without complex quoting
        const values = lines[i].split(',')
        const row: any = {}

        for (let j = 0; j < headers.length; j++) {
            const value = values[j] ? values[j].trim().replace(/^"|"$/g, '') : ''
            row[headers[j]] = value
        }

        rows.push(row as DummInventoryCsvRow)
    }

    return rows
}
