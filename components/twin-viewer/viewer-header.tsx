"use client"

import { useMemo } from "react"
import { ChevronRight, MapPin, Building2, Layers, DoorOpen, Server, Cpu, History, Target, Rocket, Check, Minus, Plus, Clock, Sparkles } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { status4DLabels, status4DColors } from "@/lib/types"
import type { Site, Phase, Status4D, SceneConfig } from "@/lib/types"
import { PHASE_CONFIG, STATUS_CONFIG } from "./constants"

export interface ViewerHeaderProps {
    site: Site
    sites: Site[]
    onSiteChange?: (site: Site) => void
    sceneConfig: SceneConfig | undefined
    // Selection state & handlers
    selectedBuildingId: string | null
    selectBuilding: (id: string | null) => void
    selectedFloorId: string | null
    selectFloor: (id: string | null) => void
    selectedRoomId: string | null
    selectRoom: (id: string | null) => void
    selectedRackId: string | null
    selectRack: (id: string | null) => void
    selectedDeviceId: string | null
    selectDevice: (id: string | null) => void
    // Phase & Status
    currentPhase: Phase
    onPhaseChange: (phase: Phase) => void
    statusVisibility: Record<Status4D, boolean>
    onToggleStatus: (status: Status4D) => void
    children?: React.ReactNode
}

export function ViewerHeader({
    site,
    sites,
    onSiteChange,
    sceneConfig,
    selectedBuildingId,
    selectBuilding,
    selectedFloorId,
    selectFloor,
    selectedRoomId,
    selectRoom,
    selectedRackId,
    selectRack,
    selectedDeviceId,
    selectDevice,
    currentPhase,
    onPhaseChange,
    statusVisibility,
    onToggleStatus,
    children
}: ViewerHeaderProps) {
    // Get sites in the same region for the dropdown
    const sitesInRegion = useMemo(() => {
        return sites.filter((s) => s.region === site.region)
    }, [sites, site.region])

    // Get unique regions
    const regions = useMemo(() => {
        return Array.from(new Set(sites.map((s) => s.region))).sort()
    }, [sites])

    // Handle region change - select first site in that region
    const handleRegionChange = (region: string) => {
        const firstSiteInRegion = sites.find((s) => s.region === region)
        if (firstSiteInRegion && onSiteChange) {
            onSiteChange(firstSiteInRegion)
        }
    }

    return (
        <div className="flex items-center justify-between gap-4 p-4 border-b border-border/50 bg-card/50 backdrop-blur">
            <div className="flex items-center gap-4">
                {/* Breadcrumb Navigation */}
                {sites.length > 0 && onSiteChange && (
                    <div className="flex items-center gap-1 text-sm">
                        <span className="text-muted-foreground">Sites</span>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />

                        {/* Region Dropdown */}
                        <Select value={site.region} onValueChange={handleRegionChange}>
                            <SelectTrigger className="h-7 w-auto gap-1 border-0 bg-transparent hover:bg-accent px-2">
                                <MapPin className="w-3 h-3 text-muted-foreground" />
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {regions.map((region) => (
                                    <SelectItem key={region} value={region}>
                                        {region}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <ChevronRight className="w-4 h-4 text-muted-foreground" />

                        {/* Site Dropdown */}
                        <Select value={site.id} onValueChange={(id) => {
                            const selectedSite = sites.find((s) => s.id === id)
                            if (selectedSite && onSiteChange) onSiteChange(selectedSite)
                        }}>
                            <SelectTrigger className="h-7 w-auto gap-1 border-0 bg-transparent hover:bg-accent px-2 font-medium">
                                <Building2 className="w-3 h-3 text-muted-foreground" />
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {sitesInRegion.map((s) => (
                                    <SelectItem key={s.id} value={s.id}>
                                        {s.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}

                {/* Separator if breadcrumb is shown */}
                {sites.length > 0 && onSiteChange && (
                    <div className="w-px h-6 bg-border/50" />
                )}

                {/* Phase Selector Button Group */}
                <div className="flex items-center bg-background/50 rounded-lg p-1 border border-border/30">
                    {(Object.keys(PHASE_CONFIG) as Phase[]).map((phase) => {
                        const config = PHASE_CONFIG[phase]
                        const isActive = currentPhase === phase

                        const getPhaseIcon = (p: Phase) => {
                            switch (p) {
                                case 'AS_IS': return <History className="w-3.5 h-3.5" />
                                case 'TO_BE': return <Target className="w-3.5 h-3.5" />
                                case 'FUTURE': return <Rocket className="w-3.5 h-3.5" />
                            }
                        }

                        return (
                            <Tooltip key={phase}>
                                <TooltipTrigger asChild>
                                    <button
                                        onClick={() => onPhaseChange(phase)}
                                        className={`w-7 h-7 rounded-md transition-all flex items-center justify-center ${isActive
                                            ? 'bg-primary text-primary-foreground shadow-sm'
                                            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                                            }`}
                                    >
                                        {getPhaseIcon(phase)}
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent side="bottom">
                                    <p className="font-medium">{config.label}</p>
                                    <p className="text-xs text-muted-foreground">{config.tooltip}</p>
                                </TooltipContent>
                            </Tooltip>
                        )
                    })}
                </div>

                {/* Status Visibility Button Group */}
                <div className="flex items-center bg-background/50 rounded-lg p-1 border border-border/30">
                    {Object.entries(status4DLabels).map(([status, label]) => {
                        const color = status4DColors[status as Status4D]
                        const isVisible = statusVisibility[status as Status4D]
                        const config = STATUS_CONFIG[status as Status4D]

                        // Get the appropriate icon for each status
                        const getStatusIcon = (s: Status4D) => {
                            switch (s) {
                                case 'EXISTING_RETAINED': return <Check className="w-3.5 h-3.5" />
                                case 'EXISTING_REMOVED': return <Minus className="w-3.5 h-3.5" />
                                case 'PROPOSED': return <Plus className="w-3.5 h-3.5" />
                                case 'FUTURE': return <Clock className="w-3.5 h-3.5" />
                                case 'MODIFIED': return <Sparkles className="w-3.5 h-3.5" />
                            }
                        }

                        return (
                            <Tooltip key={status}>
                                <TooltipTrigger asChild>
                                    <button
                                        onClick={() => onToggleStatus(status as Status4D)}
                                        className={`w-7 h-7 rounded-md transition-all flex items-center justify-center ${isVisible
                                            ? 'text-white shadow-sm'
                                            : 'text-muted-foreground hover:bg-accent'
                                            }`}
                                        style={{
                                            backgroundColor: isVisible ? color : 'transparent',
                                            opacity: isVisible ? 1 : 0.5
                                        }}
                                    >
                                        {getStatusIcon(status as Status4D)}
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent side="bottom" className="max-w-xs">
                                    <p className="font-medium">{label}</p>
                                    <p className="text-xs text-muted-foreground">{config.tooltip}</p>
                                </TooltipContent>
                            </Tooltip>
                        )
                    })}
                </div>
            </div>

            {/* This slot allows injecting the controls component */}
            <div className="flex items-center gap-3">
                {children}
            </div>
        </div>
    )
}
