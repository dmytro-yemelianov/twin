import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowRight } from 'lucide-react'

interface StateMachineProps {
    currentState: string
    targetState?: string
    compact?: boolean
}

const stateColors: Record<string, string> = {
    PROPOSED: 'bg-blue-500',
    EXISTING_RETAINED: 'bg-green-500',
    EXISTING_REMOVED: 'bg-red-500',
    MODIFIED: 'bg-yellow-500',
    FUTURE: 'bg-purple-500',
}

const stateLabels: Record<string, string> = {
    PROPOSED: 'Proposed',
    EXISTING_RETAINED: 'Existing',
    EXISTING_REMOVED: 'Removed',
    MODIFIED: 'Modified',
    FUTURE: 'Future',
}

export function DeviceStateMachine({ currentState, targetState, compact = false }: StateMachineProps) {
    if (compact) {
        return (
            <div className="flex items-center gap-2">
                <Badge className={stateColors[currentState] || 'bg-gray-500'}>
                    {stateLabels[currentState] || currentState}
                </Badge>
                {targetState && (
                    <>
                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                        <Badge className={stateColors[targetState] || 'bg-gray-500'}>
                            {stateLabels[targetState] || targetState}
                        </Badge>
                    </>
                )}
            </div>
        )
    }

    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="text-sm">Device Lifecycle State</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {/* Current State */}
                    <div>
                        <div className="text-xs text-muted-foreground mb-1">Current State</div>
                        <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${stateColors[currentState]}`} />
                            <span className="font-medium">{stateLabels[currentState]}</span>
                        </div>
                    </div>

                    {/* State Transition Arrow */}
                    {targetState && (
                        <>
                            <div className="flex items-center justify-center">
                                <ArrowRight className="h-5 w-5 text-muted-foreground" />
                            </div>

                            {/* Target State */}
                            <div>
                                <div className="text-xs text-muted-foreground mb-1">New State</div>
                                <div className="flex items-center gap-2">
                                    <div className={`w-3 h-3 rounded-full ${stateColors[targetState]}`} />
                                    <span className="font-medium">{stateLabels[targetState]}</span>
                                </div>
                            </div>
                        </>
                    )}

                    {/* State Diagram */}
                    <div className="mt-4 p-3 bg-muted/30 rounded-lg">
                        <svg viewBox="0 0 400 300" className="w-full h-auto">
                            {/* States */}
                            <g>
                                {/* PROPOSED */}
                                <circle cx="200" cy="50" r="30" fill="#3b82f6" opacity={currentState === 'PROPOSED' || targetState === 'PROPOSED' ? 1 : 0.3} />
                                <text x="200" y="55" textAnchor="middle" fill="white" fontSize="12">Proposed</text>

                                {/* EXISTING_RETAINED */}
                                <circle cx="100" cy="150" r="30" fill="#22c55e" opacity={currentState === 'EXISTING_RETAINED' || targetState === 'EXISTING_RETAINED' ? 1 : 0.3} />
                                <text x="100" y="155" textAnchor="middle" fill="white" fontSize="12">Existing</text>

                                {/* MODIFIED */}
                                <circle cx="200" cy="150" r="30" fill="#eab308" opacity={currentState === 'MODIFIED' || targetState === 'MODIFIED' ? 1 : 0.3} />
                                <text x="200" y="155" textAnchor="middle" fill="white" fontSize="12">Modified</text>

                                {/* EXISTING_REMOVED */}
                                <circle cx="300" cy="150" r="30" fill="#ef4444" opacity={currentState === 'EXISTING_REMOVED' || targetState === 'EXISTING_REMOVED' ? 1 : 0.3} />
                                <text x="300" y="150" textAnchor="middle" fill="white" fontSize="10">Removed</text>

                                {/* FUTURE */}
                                <circle cx="200" cy="250" r="30" fill="#a855f7" opacity={currentState === 'FUTURE' || targetState === 'FUTURE' ? 1 : 0.3} />
                                <text x="200" y="255" textAnchor="middle" fill="white" fontSize="12">Future</text>
                            </g>

                            {/* Transitions */}
                            <g stroke="#666" strokeWidth="2" fill="none" opacity="0.4">
                                <path d="M 200,80 L 120,120" markerEnd="url(#arrowhead)" />
                                <path d="M 100,180 L 100,220 L 180,240" markerEnd="url(#arrowhead)" />
                                <path d="M 130,150 L 170,150" markerEnd="url(#arrowhead)" />
                                <path d="M 230,150 L 270,150" markerEnd="url(#arrowhead)" />
                            </g>

                            {/* Arrow marker */}
                            <defs>
                                <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                                    <polygon points="0 0, 10 3.5, 0 7" fill="#666" />
                                </marker>
                            </defs>
                        </svg>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

export function StateMachineDiagram() {
    return (
        <div className="p-4 bg-card rounded-lg border">
            <h3 className="font-semibold mb-3 text-sm">Device Lifecycle</h3>
            <svg viewBox="0 0 500 350" className="w-full h-auto">
                {/* States as rounded rectangles */}
                <g>
                    {/* NEW */}
                    <rect x="220" y="10" width="60" height="30" rx="15" fill="#94a3b8" />
                    <text x="250" y="30" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">NEW</text>

                    {/* PROPOSED */}
                    <rect x="205" y="70" width="90" height="30" rx="15" fill="#3b82f6" />
                    <text x="250" y="90" textAnchor="middle" fill="white" fontSize="12">PROPOSED</text>

                    {/* EXISTING_RETAINED */}
                    <rect x="50" y="140" width="140" height="30" rx="15" fill="#22c55e" />
                    <text x="120" y="160" textAnchor="middle" fill="white" fontSize="12">EXISTING_RETAINED</text>

                    {/* MODIFIED */}
                    <rect x="215" y="140" width="70" height="30" rx="15" fill="#eab308" />
                    <text x="250" y="160" textAnchor="middle" fill="white" fontSize="12">MODIFIED</text>

                    {/* EXISTING_REMOVED */}
                    <rect x="310" y="140" width="150" height="30" rx="15" fill="#ef4444" />
                    <text x="385" y="160" textAnchor="middle" fill="white" fontSize="12">EXISTING_REMOVED</text>

                    {/* FUTURE */}
                    <rect x="215" y="220" width="70" height="30" rx="15" fill="#a855f7" />
                    <text x="250" y="240" textAnchor="middle" fill="white" fontSize="12">FUTURE</text>

                    {/* SOFT DELETE */}
                    <rect x="360" y="280" width="100" height="30" rx="15" fill="#64748b" />
                    <text x="410" y="295" textAnchor="middle" fill="white" fontSize="10">isActive=false</text>
                    <text x="410" y="305" textAnchor="middle" fill="white" fontSize="10">(hidden)</text>
                </g>

                {/* Arrows */}
                <defs>
                    <marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
                        <path d="M0,0 L0,6 L9,3 z" fill="#666" />
                    </marker>
                </defs>
                <g stroke="#666" strokeWidth="2" fill="none" markerEnd="url(#arrow)">
                    {/* NEW -> PROPOSED */}
                    <path d="M 250,40 L 250,70" />

                    {/* PROPOSED -> EXISTING_RETAINED */}
                    <path d="M 230,100 L 160,140" />

                    {/* EXISTING_RETAINED -> MODIFIED */}
                    <path d="M 190,155 L 215,155" />

                    {/* MODIFIED -> EXISTING_RETAINED (loop back) */}
                    <path d="M 235,170 L 235,190 L 140,190 L 140,170" strokeDasharray="3,3" />

                    {/* EXISTING_RETAINED -> EXISTING_REMOVED */}
                    <path d="M 190,145 L 310,145" />

                    {/* EXISTING_RETAINED -> FUTURE */}
                    <path d="M 150,170 L 220,220" />

                    {/* FUTURE -> PROPOSED (activate) */}
                    <path d="M 270,220 L 280,200 L 280,120 L 270,100" strokeDasharray="3,3" />

                    {/* Any state -> soft delete */}
                    <path d="M 385,170 L 410,280" strokeDasharray="5,5" />
                </g>

                {/* Transition labels */}
                <g fill="#666" fontSize="9">
                    <text x="260" y="58">create</text>
                    <text x="175" y="120">deploy</text>
                    <text x="200" y="151">move</text>
                    <text x="250" y="138">remove</text>
                    <text x="110" y="192">reserve</text>
                    <text x="388" y="230" fontSize="8">soft-delete</text>
                </g>
            </svg>
        </div>
    )
}
