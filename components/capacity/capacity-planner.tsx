import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Loader2, Search, Zap, Database, LayoutGrid } from 'lucide-react'
import { toast } from 'sonner'
import { AICapacitySuggestion } from '@/lib/types'

interface CapacityPlannerProps {
    siteId: string
    onSuggestionFound: (suggestion: AICapacitySuggestion) => void
}

export function CapacityPlanner({ siteId, onSuggestionFound }: CapacityPlannerProps) {
    const [loading, setLoading] = useState(false)
    const [numRacks, setNumRacks] = useState(5)
    const [minPower, setMinPower] = useState(5)
    const [minU, setMinU] = useState(20)

    const handleSearch = async () => {
        setLoading(true)
        try {
            // Mock API call - replace with actual endpoint when available
            // const res = await fetch(`/api/sites/${siteId}/capacity/analyze?numRacks=${numRacks}&minPower=${minPower}&minU=${minU}`)
            // const data = await res.json()

            // Simulating a delay and result for now
            await new Promise(resolve => setTimeout(resolve, 1500))

            const mockSuggestion: AICapacitySuggestion = {
                rackIds: ['rack-101', 'rack-102', 'rack-103', 'rack-104', 'rack-105'], // These would need to match actual IDs
                totalFreeU: 180,
                totalPowerHeadroomKw: 45.5,
                summary: `Found ${numRacks} contiguous racks with >${minPower}kW power and >${minU}U space each.`
            }

            onSuggestionFound(mockSuggestion)
            toast.success('Capacity block found')
        } catch (error) {
            console.error(error)
            toast.error('Failed to analyze capacity')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <LayoutGrid className="h-5 w-5" />
                    Capacity Planner
                </CardTitle>
                <CardDescription>Find contiguous space for new deployments</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-2">
                    <div className="flex justify-between">
                        <Label>Number of Racks</Label>
                        <span className="text-sm font-medium">{numRacks}</span>
                    </div>
                    <Slider
                        value={[numRacks]}
                        onValueChange={(v) => setNumRacks(v[0])}
                        min={1}
                        max={20}
                        step={1}
                    />
                </div>

                <div className="space-y-2">
                    <div className="flex justify-between">
                        <Label className="flex items-center gap-1">
                            <Zap className="h-3 w-3" /> Min Power per Rack (kW)
                        </Label>
                        <span className="text-sm font-medium">{minPower} kW</span>
                    </div>
                    <Slider
                        value={[minPower]}
                        onValueChange={(v) => setMinPower(v[0])}
                        min={0}
                        max={20}
                        step={0.5}
                    />
                </div>

                <div className="space-y-2">
                    <div className="flex justify-between">
                        <Label className="flex items-center gap-1">
                            <Database className="h-3 w-3" /> Min Free Space (U)
                        </Label>
                        <span className="text-sm font-medium">{minU} U</span>
                    </div>
                    <Slider
                        value={[minU]}
                        onValueChange={(v) => setMinU(v[0])}
                        min={1}
                        max={42}
                        step={1}
                    />
                </div>

                <Button className="w-full" onClick={handleSearch} disabled={loading}>
                    {loading ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Analyzing...
                        </>
                    ) : (
                        <>
                            <Search className="mr-2 h-4 w-4" />
                            Find Capacity
                        </>
                    )}
                </Button>
            </CardContent>
        </Card>
    )
}
