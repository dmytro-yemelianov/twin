import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AlertCircle, CheckCircle, HelpCircle, AlertTriangle, RefreshCw, Check, Search, X, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import type { VerificationDevice } from '@/lib/services/anomaly-detection.service'

interface Anomaly {
    id: string
    siteId: string
    deviceId?: string
    rackName: string
    anomalyType: 'MISSING' | 'UNEXPECTED' | 'MISPLACED' | 'MISMATCH'
    severity: 'HIGH' | 'MEDIUM' | 'LOW'
    expectedValue: any
    actualValue: any
    status: 'OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'CLOSED' | 'FALSE_POSITIVE'
    notes: string
    createdAt: string
}

interface AnomalyPanelProps {
    siteId: string
    onClose?: () => void
}

export function AnomalyPanel({ siteId, onClose }: AnomalyPanelProps) {
    const [anomalies, setAnomalies] = useState<Anomaly[]>([])
    const [loading, setLoading] = useState(false)
    const [detecting, setDetecting] = useState(false)
    const [filter, setFilter] = useState<string>('all')

    const fetchAnomalies = async () => {
        setLoading(true)
        try {
            const res = await fetch(`/api/sites/${siteId}/anomalies`)
            if (!res.ok) throw new Error('Failed to fetch anomalies')
            const data = await res.json()
            setAnomalies(data)
        } catch (error) {
            console.error(error)
            toast.error('Failed to load anomalies')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (siteId) fetchAnomalies()
    }, [siteId])

    const runDetection = async () => {
        setDetecting(true)
        try {
            // For demo purposes, we'll create sample verification data
            // In production, this would come from a physical audit or IoT sensors
            const verificationData: VerificationDevice[] = [
                // This would normally come from scanning/audit
            ]

            const res = await fetch(`/api/sites/${siteId}/anomalies`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    verificationData,
                    save: true
                })
            })

            if (!res.ok) throw new Error('Detection failed')
            
            const result = await res.json()
            toast.success(`Detection complete: ${result.anomalies?.length || 0} anomalies found`)
            fetchAnomalies()
        } catch (error) {
            console.error(error)
            toast.error('Failed to run anomaly detection')
        } finally {
            setDetecting(false)
        }
    }

    const resolveAnomaly = async (id: string, action: string) => {
        try {
            const res = await fetch(`/api/anomalies/${id}/resolve`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: 'user-123', // TODO: Get from auth context
                    action
                })
            })

            if (!res.ok) throw new Error('Failed to resolve')

            toast.success('Anomaly resolved')
            fetchAnomalies()
        } catch (error) {
            toast.error('Failed to resolve anomaly')
        }
    }

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'HIGH': return 'destructive'
            case 'MEDIUM': return 'warning' // Note: You might need to define a warning variant or use default
            case 'LOW': return 'secondary'
            default: return 'default'
        }
    }

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'MISSING': return <AlertCircle className="h-4 w-4 text-red-500" />
            case 'UNEXPECTED': return <HelpCircle className="h-4 w-4 text-orange-500" />
            case 'MISPLACED': return <AlertTriangle className="h-4 w-4 text-yellow-500" />
            case 'MISMATCH': return <RefreshCw className="h-4 w-4 text-blue-500" />
            default: return <AlertCircle className="h-4 w-4" />
        }
    }

    const filteredAnomalies = anomalies.filter(a => {
        if (filter === 'all') return a.status !== 'RESOLVED' && a.status !== 'CLOSED'
        if (filter === 'resolved') return a.status === 'RESOLVED' || a.status === 'CLOSED'
        return a.status === filter
    })

    return (
        <Card className="h-full flex flex-col shadow-lg">
            <CardHeader className="pb-3">
                <div className="flex justify-between items-center mb-2">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-orange-500" />
                            Anomaly Detection
                        </CardTitle>
                        <CardDescription>Review discrepancies between system and reality</CardDescription>
                    </div>
                    <div className="flex gap-2">
                        <Button 
                            variant="outline" 
                            size="sm"
                            onClick={runDetection} 
                            disabled={detecting}
                        >
                            {detecting ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Search className="h-4 w-4" />
                            )}
                            <span className="ml-1">Detect</span>
                        </Button>
                        <Button 
                            variant="outline" 
                            size="icon" 
                            onClick={fetchAnomalies} 
                            disabled={loading}
                        >
                            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        </Button>
                        {onClose && (
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={onClose}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                </div>
                <Tabs defaultValue="all" onValueChange={setFilter} className="w-full mt-2">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="all">Active ({anomalies.filter(a => a.status !== 'RESOLVED' && a.status !== 'CLOSED').length})</TabsTrigger>
                        <TabsTrigger value="OPEN">Open</TabsTrigger>
                        <TabsTrigger value="resolved">Resolved</TabsTrigger>
                    </TabsList>
                </Tabs>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden p-0">
                <ScrollArea className="h-[500px] px-4">
                    <div className="space-y-4 py-2">
                        {filteredAnomalies.length === 0 ? (
                            <div className="text-center py-10 text-muted-foreground">
                                No anomalies found matching filter.
                            </div>
                        ) : (
                            filteredAnomalies.map(anomaly => (
                                <Card key={anomaly.id} className="overflow-hidden">
                                    <div className="p-3 flex items-start gap-3">
                                        <div className="mt-1">{getTypeIcon(anomaly.anomalyType)}</div>
                                        <div className="flex-1 space-y-1">
                                            <div className="flex justify-between items-start">
                                                <div className="font-medium flex items-center gap-2">
                                                    {anomaly.anomalyType}
                                                    <Badge variant={getSeverityColor(anomaly.severity) as any} className="text-[10px] h-5">
                                                        {anomaly.severity}
                                                    </Badge>
                                                </div>
                                                <span className="text-xs text-muted-foreground">
                                                    {new Date(anomaly.createdAt).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <p className="text-sm text-muted-foreground">
                                                {anomaly.notes}
                                            </p>
                                            <div className="text-xs bg-muted/50 p-2 rounded mt-2 grid grid-cols-2 gap-2">
                                                <div>
                                                    <span className="font-semibold block">Expected:</span>
                                                    <pre className="whitespace-pre-wrap font-mono text-[10px]">
                                                        {JSON.stringify(anomaly.expectedValue, null, 2) || 'N/A'}
                                                    </pre>
                                                </div>
                                                <div>
                                                    <span className="font-semibold block">Actual:</span>
                                                    <pre className="whitespace-pre-wrap font-mono text-[10px]">
                                                        {JSON.stringify(anomaly.actualValue, null, 2) || 'N/A'}
                                                    </pre>
                                                </div>
                                            </div>

                                            {anomaly.status !== 'RESOLVED' && anomaly.status !== 'CLOSED' && (
                                                <div className="flex gap-2 mt-3 justify-end">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-7 text-xs"
                                                        onClick={() => resolveAnomaly(anomaly.id, 'IGNORE')}
                                                    >
                                                        Ignore
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        className="h-7 text-xs"
                                                        onClick={() => resolveAnomaly(anomaly.id, 'ACCEPT_ACTUAL')}
                                                    >
                                                        <Check className="h-3 w-3 mr-1" />
                                                        Accept Actual
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </Card>
                            ))
                        )}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    )
}
