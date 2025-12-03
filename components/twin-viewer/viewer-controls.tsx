"use client"

import { Package, Layout, Calendar, BarChart3, GitBranch, FileText, Eye, EyeOff, Tag, List, AlertTriangle, Database, Server } from "lucide-react"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

interface ViewerControlsProps {
    currentTab: string
    onTabChange: (tab: string) => void
    showBuilding: boolean
    onToggleBuilding: () => void
    showLabels: boolean
    onToggleLabels: () => void
    show4DLines: boolean
    onToggle4DLines: () => void
    showInventory?: boolean
    onToggleInventory?: () => void
    showAnomalies?: boolean
    onToggleAnomalies?: () => void
}

export function ViewerControls({
    currentTab,
    onTabChange,
    showBuilding,
    onToggleBuilding,
    showLabels,
    onToggleLabels,
    show4DLines,
    onToggle4DLines,
    showInventory,
    onToggleInventory,
    showAnomalies,
    onToggleAnomalies,
}: ViewerControlsProps) {
    const visualizationTabs = ['3d', 'racks', 'drawings', 'graph']
    const dataTabs = ['equipment', 'racks-table'] 
    const analyticsTabs = ['timeline', 'gantt']

    return (
        <div className="flex items-center gap-2">
            {/* Primary Views */}
            <div className="flex items-center bg-background/50 rounded-lg p-1 border border-border/30">
                <Tooltip>
                    <TooltipTrigger asChild>
                        <button
                            onClick={() => onTabChange('3d')}
                            className={`px-3 h-7 rounded-md transition-all flex items-center justify-center gap-1 text-xs font-medium ${currentTab === '3d'
                                ? 'bg-primary text-primary-foreground shadow-sm'
                                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                                }`}
                        >
                            <Package className="w-3 h-3" />
                            3D
                        </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                        <p>3D Visualization</p>
                    </TooltipContent>
                </Tooltip>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <button
                            onClick={() => onTabChange(dataTabs.includes(currentTab) ? currentTab : 'equipment')}
                            className={`px-3 h-7 rounded-md transition-all flex items-center justify-center gap-1 text-xs font-medium ${dataTabs.includes(currentTab)
                                ? 'bg-primary text-primary-foreground shadow-sm'
                                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                                }`}
                        >
                            <Database className="w-3 h-3" />
                            Data
                        </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                        <p>Data Tables</p>
                        <p className="text-xs text-muted-foreground">Equipment & Rack data views</p>
                    </TooltipContent>
                </Tooltip>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <button
                            onClick={() => onTabChange(analyticsTabs.includes(currentTab) ? currentTab : 'timeline')}
                            className={`px-3 h-7 rounded-md transition-all flex items-center justify-center gap-1 text-xs font-medium ${analyticsTabs.includes(currentTab)
                                ? 'bg-primary text-primary-foreground shadow-sm'
                                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                                }`}
                        >
                            <BarChart3 className="w-3 h-3" />
                            Analytics
                        </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                        <p>Analytics & Timeline</p>
                        <p className="text-xs text-muted-foreground">Timeline and planning views</p>
                    </TooltipContent>
                </Tooltip>
            </div>

            {/* Secondary Views - only show when parent is active */}
            {dataTabs.includes(currentTab) && (
                <div className="flex items-center bg-muted/30 rounded-lg p-1 border border-border/20">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button
                                onClick={() => onTabChange('equipment')}
                                className={`w-8 h-6 rounded transition-all flex items-center justify-center ${currentTab === 'equipment'
                                    ? 'bg-background shadow-sm'
                                    : 'hover:bg-background/50'
                                    }`}
                            >
                                <Database className="w-3 h-3" />
                            </button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">Equipment</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button
                                onClick={() => onTabChange('racks-table')}
                                className={`w-8 h-6 rounded transition-all flex items-center justify-center ${currentTab === 'racks-table'
                                    ? 'bg-background shadow-sm'
                                    : 'hover:bg-background/50'
                                    }`}
                            >
                                <Server className="w-3 h-3" />
                            </button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">Racks</TooltipContent>
                    </Tooltip>
                </div>
            )}

            {analyticsTabs.includes(currentTab) && (
                <div className="flex items-center bg-muted/30 rounded-lg p-1 border border-border/20">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button
                                onClick={() => onTabChange('timeline')}
                                className={`w-8 h-6 rounded transition-all flex items-center justify-center ${currentTab === 'timeline'
                                    ? 'bg-background shadow-sm'
                                    : 'hover:bg-background/50'
                                    }`}
                            >
                                <BarChart3 className="w-3 h-3" />
                            </button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">Timeline</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button
                                onClick={() => onTabChange('gantt')}
                                className={`w-8 h-6 rounded transition-all flex items-center justify-center ${currentTab === 'gantt'
                                    ? 'bg-background shadow-sm'
                                    : 'hover:bg-background/50'
                                    }`}
                            >
                                <Calendar className="w-3 h-3" />
                            </button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">Gantt</TooltipContent>
                    </Tooltip>
                </div>
            )}

            {currentTab === '3d' && (
                <div className="flex items-center bg-muted/30 rounded-lg p-1 border border-border/20">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button
                                onClick={() => onTabChange('racks')}
                                className="w-8 h-6 rounded transition-all flex items-center justify-center hover:bg-background/50"
                            >
                                <Layout className="w-3 h-3" />
                            </button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">Rack Elevation</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button
                                onClick={() => onTabChange('graph')}
                                className="w-8 h-6 rounded transition-all flex items-center justify-center hover:bg-background/50"
                            >
                                <GitBranch className="w-3 h-3" />
                            </button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">Hierarchy</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button
                                onClick={() => onTabChange('drawings')}
                                className="w-8 h-6 rounded transition-all flex items-center justify-center hover:bg-background/50"
                            >
                                <FileText className="w-3 h-3" />
                            </button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">Drawings</TooltipContent>
                    </Tooltip>
                </div>
            )}

            {/* Display Options Group - Only show in 3D view */}
            {currentTab === '3d' && (
                <div className="flex items-center bg-background/50 rounded-lg p-1 border border-border/30">
                <Tooltip>
                    <TooltipTrigger asChild>
                        <button
                            onClick={onToggleBuilding}
                            className={`w-8 h-7 rounded-md transition-all flex items-center justify-center ${showBuilding
                                ? 'bg-primary text-primary-foreground shadow-sm'
                                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                                }`}
                        >
                            {showBuilding ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                        <p>Building Shell</p>
                        <p className="text-xs text-muted-foreground">Toggle building visibility in 3D</p>
                    </TooltipContent>
                </Tooltip>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <button
                            onClick={onToggleLabels}
                            className={`w-8 h-7 rounded-md transition-all flex items-center justify-center ${showLabels
                                ? 'bg-primary text-primary-foreground shadow-sm'
                                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                                }`}
                        >
                            <Tag className="w-4 h-4" />
                        </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                        <p>Labels</p>
                        <p className="text-xs text-muted-foreground">Show rack and U-position labels</p>
                    </TooltipContent>
                </Tooltip>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <button
                            onClick={onToggle4DLines}
                            className={`w-8 h-7 rounded-md transition-all flex items-center justify-center ${show4DLines
                                ? 'bg-cyan-500 text-white shadow-sm'
                                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                                }`}
                        >
                            <GitBranch className="w-4 h-4" />
                        </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                        <p>4D Links</p>
                        <p className="text-xs text-muted-foreground">Show equipment state connections</p>
                    </TooltipContent>
                </Tooltip>
                </div>
            )}

            {/* Panels Group - Only show in 3D view */}
            {currentTab === '3d' && (onToggleInventory || onToggleAnomalies) && (
                <div className="flex items-center bg-background/50 rounded-lg p-1 border border-border/30">
                    {onToggleInventory && (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <button
                                    onClick={onToggleInventory}
                                    className={`w-8 h-7 rounded-md transition-all flex items-center justify-center ${showInventory
                                        ? 'bg-primary text-primary-foreground shadow-sm'
                                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                                        }`}
                                >
                                    <List className="w-4 h-4" />
                                </button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom">
                                <p>Device Inventory</p>
                                <p className="text-xs text-muted-foreground">Show device list panel</p>
                            </TooltipContent>
                        </Tooltip>
                    )}
                    {onToggleAnomalies && (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <button
                                    onClick={onToggleAnomalies}
                                    className={`w-8 h-7 rounded-md transition-all flex items-center justify-center ${showAnomalies
                                        ? 'bg-primary text-primary-foreground shadow-sm'
                                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                                        }`}
                                >
                                    <AlertTriangle className="w-4 h-4" />
                                </button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom">
                                <p>Anomaly Detection</p>
                                <p className="text-xs text-muted-foreground">Review detected discrepancies</p>
                            </TooltipContent>
                        </Tooltip>
                    )}
                </div>
            )}
        </div>
    )
}
