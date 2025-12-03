"use client"

import { useEffect, useMemo, useState } from "react"
import dynamic from "next/dynamic"
import { useAppStore } from "@/lib/stores/app-store"
import { useSceneConfig, useDeviceTypes } from "@/lib/hooks/use-data"
import { findAIReadyCapacity } from "@/lib/ai-capacity"
import { useDebouncedCallback } from "@/lib/hooks/use-debounce"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { useToast } from "@/components/ui/use-toast"
import { SceneSkeleton, InventorySkeleton } from "@/components/loading-states"
import { phaseVisibilityMap } from "@/lib/types"
import type { Site, Phase, Status4D } from "@/lib/types"

// Import extracted components
import { ViewerHeader } from "./viewer-header"
import { ViewerControls } from "./viewer-controls"
import { ViewerOverlay } from "./viewer-overlay"

// Import existing components directly
import { RackElevationView } from "@/components/rack-elevation-view"
import { EquipmentEditor } from "@/components/equipment-editor"
import { TimelineView } from "@/components/timeline-view"
import { MaintenanceGantt } from "@/components/maintenance-gantt"
import { VerticalBreadcrumbs } from "@/components/vertical-breadcrumbs"
import { SceneTree } from "@/components/scene-tree"
import { AnomalyPanel } from "@/components/anomalies/anomaly-panel"
import { CsvImportDialog } from "@/components/import/csv-import-dialog"
import { EquipmentTable } from "@/components/equipment-table"
import { RackTable } from "@/components/rack-table"

// Lazy load heavy components
const ThreeScene = dynamic(() => import("@/components/three-scene/three-scene").then(mod => ({ default: mod.ThreeScene })), {
    loading: () => <SceneSkeleton />,
    ssr: false
})

const InventoryPanelDynamic = dynamic(() => import("@/components/inventory-panel").then(mod => ({ default: mod.InventoryPanel })), {
    loading: () => <InventorySkeleton />,
    ssr: false
})

const AnomalyPanelDynamic = dynamic(() => import("@/components/anomalies/anomaly-panel").then(mod => ({ default: mod.AnomalyPanel })), {
    loading: () => <InventorySkeleton />,
    ssr: false
})

const HierarchyGraphDynamic = dynamic(() => import("@/components/hierarchy-graph").then(mod => ({ default: mod.HierarchyGraph })), {
    loading: () => <SceneSkeleton />,
    ssr: false
})

const DrawingGeneratorDynamic = dynamic(() => import("@/components/drawing/drawing-generator").then(mod => ({ default: mod.DrawingGenerator })), {
    loading: () => <SceneSkeleton />,
    ssr: false
})

interface TwinViewerProps {
    site: Site
    sites?: Site[]
    onSiteChange?: (site: Site) => void
}

export function TwinViewer({ site, sites = [], onSiteChange }: TwinViewerProps) {
    const { toast } = useToast()

    // Zustand store state
    const {
        currentPhase,
        setCurrentPhase,
        statusVisibility,
        setStatusVisibility,
        colorMode,
        showBuilding,
        setShowBuilding,
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
        showInventory,
        setShowInventory,
        aiCapacitySuggestion,
        setAiCapacitySuggestion,
        highlightedRacks,
        setHighlightedRacks,
        xrayMode,
        setSceneConfig,
        setDeviceTypes,
        isSceneLoading,
        setIsSceneLoading
    } = useAppStore()

    // Local state
    const [currentTab, setCurrentTab] = useState('3d')
    const [showOrigin, setShowOrigin] = useState(false)
    const [showCompass, setShowCompass] = useState(true)
    const [show4DLines, setShow4DLines] = useState(false)
    const [showLabels, setShowLabels] = useState(true)
    const [showAIAnalysis, setShowAIAnalysis] = useState(false)
    const [showEquipmentEditor, setShowEquipmentEditor] = useState(false)
    const [showAnomalies, setShowAnomalies] = useState(false)
    const [showAnomalyPanel, setShowAnomalyPanel] = useState(false)
    const [showImportDialog, setShowImportDialog] = useState(false)

    // Camera triggers
    const [triggerResetCamera, setTriggerResetCamera] = useState(0)
    const [triggerFitView, setTriggerFitView] = useState(0)
    const [triggerZoomIn, setTriggerZoomIn] = useState(0)
    const [triggerZoomOut, setTriggerZoomOut] = useState(0)

    // Inventory panel resize state
    const [inventoryHeight, setInventoryHeight] = useState(280)
    const [isResizing, setIsResizing] = useState(false)
    const minInventoryHeight = 150
    const maxInventoryHeight = 500

    // Handlers
    const handleDeviceModified = (_updatedDevice: any) => {
        // In a real implementation, this would update the store/backend
    }

    const handleEditDevice = (deviceId: string) => {
        selectDevice(deviceId)
        setShowEquipmentEditor(true)
    }

    // Inventory panel resize handlers
    const handleResizeStart = (e: React.MouseEvent) => {
        e.preventDefault()
        setIsResizing(true)

        const startY = e.clientY
        const startHeight = inventoryHeight

        const handleMouseMove = (moveEvent: MouseEvent) => {
            const deltaY = startY - moveEvent.clientY
            const newHeight = Math.min(maxInventoryHeight, Math.max(minInventoryHeight, startHeight + deltaY))
            setInventoryHeight(newHeight)
        }

        const handleMouseUp = () => {
            setIsResizing(false)
            document.removeEventListener('mousemove', handleMouseMove)
            document.removeEventListener('mouseup', handleMouseUp)
        }

        document.addEventListener('mousemove', handleMouseMove)
        document.addEventListener('mouseup', handleMouseUp)
    }

    // 3D View control handlers
    const handleResetCamera = () => setTriggerResetCamera(prev => prev + 1)
    const handleFitView = () => setTriggerFitView(prev => prev + 1)
    const handleZoomIn = () => setTriggerZoomIn(prev => prev + 1)
    const handleZoomOut = () => setTriggerZoomOut(prev => prev + 1)

    // React Query hooks
    const { data: sceneConfig, isLoading: sceneLoading } = useSceneConfig(site.sceneConfigUri)
    const { data: deviceTypes = [], isLoading: deviceTypesLoading } = useDeviceTypes()

    // Update store when data loads
    useEffect(() => {
        if (sceneConfig) setSceneConfig(sceneConfig)
    }, [sceneConfig, setSceneConfig])

    useEffect(() => {
        if (deviceTypes.length > 0) setDeviceTypes(deviceTypes)
    }, [deviceTypes, setDeviceTypes])

    useEffect(() => {
        setIsSceneLoading(sceneLoading || deviceTypesLoading)
    }, [sceneLoading, deviceTypesLoading, setIsSceneLoading])

    // Memoized computations
    const visibleStatuses = useMemo(() => {
        return new Set(
            Object.entries(statusVisibility)
                .filter(([_, visible]) => visible)
                .map(([status]) => status as Status4D)
        )
    }, [statusVisibility])

    const relatedDevices = useMemo(() => {
        if (!selectedDeviceId || !sceneConfig) return []
        const selectedDevice = sceneConfig.devices.find(d => d.id === selectedDeviceId)
        if (!selectedDevice) return []
        return sceneConfig.devices.filter(
            d => d.logicalEquipmentId === selectedDevice.logicalEquipmentId && d.id !== selectedDeviceId
        )
    }, [selectedDeviceId, sceneConfig])

    // AI Capacity Calculation
    const debouncedAICapacityCalc = useDebouncedCallback(() => {
        if (!sceneConfig || !showAIAnalysis) {
            setAiCapacitySuggestion(null)
            setHighlightedRacks([])
            return
        }

        const suggestion = findAIReadyCapacity(sceneConfig, currentPhase)
        setAiCapacitySuggestion(suggestion)

        if (suggestion) {
            setHighlightedRacks(suggestion.rackIds)
        } else {
            setHighlightedRacks([])
        }
    }, 500)

    useEffect(() => {
        debouncedAICapacityCalc()
    }, [currentPhase, sceneConfig, showAIAnalysis, debouncedAICapacityCalc])

    useEffect(() => {
        if (aiCapacitySuggestion && showAIAnalysis) {
            toast({
                title: "🤖 AI-Ready Capacity Found!",
                description: `${aiCapacitySuggestion.totalFreeU}U available across ${aiCapacitySuggestion.rackIds.length} racks with ${aiCapacitySuggestion.totalPowerHeadroomKw.toFixed(1)}kW headroom`,
                duration: 5000
            })
        }
    }, [aiCapacitySuggestion, showAIAnalysis, toast])

    // Build breadcrumbs based on selection
    const breadcrumbs = useMemo(() => {
        const items: Array<{ label: string; type: any; id?: string }> = []

        if (!sceneConfig) return items

        // Add building if selected
        if (selectedBuildingId) {
            const building = sceneConfig.buildings?.find(b => b.id === selectedBuildingId)
            if (building) {
                items.push({ label: building.name, type: 'building', id: building.id })
            }
        }

        // Add floor if selected
        if (selectedFloorId) {
            const floor = sceneConfig.floors?.find(f => f.id === selectedFloorId)
            if (floor) {
                items.push({ label: floor.name, type: 'floor', id: floor.id })
            }
        }

        // Add room if selected
        if (selectedRoomId) {
            const room = sceneConfig.rooms.find(r => r.id === selectedRoomId)
            if (room) {
                items.push({ label: room.name, type: 'room', id: room.id })
            }
        }

        // Add rack if selected
        if (selectedRackId) {
            const rack = sceneConfig.racks.find(r => r.id === selectedRackId)
            if (rack) {
                items.push({ label: rack.name, type: 'rack', id: rack.id })
            }
        }

        // Add device if selected
        if (selectedDeviceId) {
            const device = sceneConfig.devices.find(d => d.id === selectedDeviceId)
            if (device) {
                items.push({ label: device.name, type: 'device', id: device.id })
            }
        }

        return items
    }, [selectedBuildingId, selectedFloorId, selectedRoomId, selectedRackId, selectedDeviceId, sceneConfig])

    // Loading state
    if (isSceneLoading || !sceneConfig || deviceTypes.length === 0) {
        return <SceneSkeleton />
    }

    const toggleStatusVisibility = (status: Status4D) => {
        setStatusVisibility(status, !statusVisibility[status])
    }

    const handlePhaseChange = (phase: Phase) => {
        setCurrentPhase(phase)

        const allowedStatuses = phaseVisibilityMap[phase]
        Object.keys(statusVisibility).forEach((status) => {
            setStatusVisibility(status as Status4D, allowedStatuses.includes(status as Status4D))
        })

        toast({
            title: `Switched to ${phase} phase`,
            description: `Showing equipment for ${phase.replace('_', '-').toLowerCase()} configuration`
        })
    }

    return (
        <div className="flex flex-col h-full bg-background">
            {/* Top Controls */}
            <ViewerHeader
                site={site}
                sites={sites}
                onSiteChange={onSiteChange}
                sceneConfig={sceneConfig}
                selectedBuildingId={selectedBuildingId}
                selectBuilding={selectBuilding}
                selectedFloorId={selectedFloorId}
                selectFloor={selectFloor}
                selectedRoomId={selectedRoomId}
                selectRoom={selectRoom}
                selectedRackId={selectedRackId}
                selectRack={selectRack}
                selectedDeviceId={selectedDeviceId}
                selectDevice={selectDevice}
                currentPhase={currentPhase}
                onPhaseChange={handlePhaseChange}
                statusVisibility={statusVisibility}
                onToggleStatus={toggleStatusVisibility}
            >
                <div className="flex items-center gap-2">
                    <ViewerControls
                        currentTab={currentTab}
                        onTabChange={setCurrentTab}
                        showBuilding={showBuilding}
                        onToggleBuilding={() => setShowBuilding(!showBuilding)}
                        showLabels={showLabels}
                        onToggleLabels={() => setShowLabels(!showLabels)}
                        show4DLines={show4DLines}
                        onToggle4DLines={() => setShow4DLines(!show4DLines)}
                        showInventory={showInventory}
                        onToggleInventory={() => setShowInventory(!showInventory)}
                        showAnomalies={showAnomalyPanel}
                        onToggleAnomalies={() => setShowAnomalyPanel(!showAnomalyPanel)}
                    />

                    {/* Import CSV Dialog */}
                    <CsvImportDialog
                        regionId={site.region}
                        onSuccess={() => {
                            // Refresh page to load new data
                            window.location.reload()
                            toast({
                                title: "Import Complete",
                                description: "Data imported successfully. Refreshing view..."
                            })
                        }}
                    />
                </div>
            </ViewerHeader>

            {/* Main Content with Tabs */}
            <div className="flex-1 min-h-0 flex flex-col">
                <div className="flex-1 min-h-0 relative">
                    {currentTab === '3d' && (
                        <>
                            <ThreeScene
                                sceneConfig={sceneConfig}
                                deviceTypes={deviceTypes}
                                visibleStatuses={visibleStatuses}
                                colorMode={colorMode}
                                showBuilding={showBuilding}
                                selectedDeviceId={selectedDeviceId}
                                onDeviceSelect={selectDevice}
                                selectedRackId={selectedRackId}
                                onRackSelect={selectRack}
                                highlightedRacks={highlightedRacks}
                                xrayMode={xrayMode}
                                showOrigin={showOrigin}
                                showCompass={showCompass}
                                show4DLines={show4DLines}
                                showLabels={showLabels}
                                triggerResetCamera={triggerResetCamera}
                                triggerFitView={triggerFitView}
                                triggerZoomIn={triggerZoomIn}
                                triggerZoomOut={triggerZoomOut}
                            />

                            {/* Scene Tree Browser */}
                            <SceneTree
                                sceneConfig={sceneConfig}
                                selectedBuildingId={selectedBuildingId}
                                selectedFloorId={selectedFloorId}
                                selectedRoomId={selectedRoomId}
                                selectedRackId={selectedRackId}
                                selectedDeviceId={selectedDeviceId}
                                onSelectBuilding={selectBuilding}
                                onSelectFloor={selectFloor}
                                onSelectRoom={selectRoom}
                                onSelectRack={selectRack}
                                onSelectDevice={selectDevice}
                                showPanel={showInventory || showAnomalyPanel}
                                panelHeight={inventoryHeight}
                            />

                            <ViewerOverlay
                                selectedDeviceId={selectedDeviceId}
                                sceneConfig={sceneConfig}
                                relatedDevices={relatedDevices}
                                onEditDevice={handleEditDevice}
                                onSelectDevice={selectDevice}
                                onResetCamera={handleResetCamera}
                                onFitView={handleFitView}
                                onZoomIn={handleZoomIn}
                                onZoomOut={handleZoomOut}
                                showOrigin={showOrigin}
                                onToggleOrigin={() => setShowOrigin(!showOrigin)}
                                showCompass={showCompass}
                                onToggleCompass={() => setShowCompass(!showCompass)}
                            />
                        </>
                    )}

                    {currentTab === 'racks' && (
                        <div className="h-full p-4 overflow-auto bg-background">
                            <RackElevationView
                                sceneConfig={sceneConfig}
                                deviceTypes={deviceTypes}
                                selectedRackId={selectedRackId}
                                onRackSelect={selectRack}
                                selectedDeviceId={selectedDeviceId}
                                onDeviceSelect={selectDevice}
                                currentPhase={currentPhase}
                                visibleStatuses={visibleStatuses}
                                onEditDevice={handleEditDevice}
                                show4DLinks={show4DLines}
                            />
                        </div>
                    )}

                    {currentTab === 'timeline' && (
                        <div className="h-full p-4 overflow-auto bg-background">
                            <TimelineView
                                devices={sceneConfig?.devices.filter(d => visibleStatuses.has(d.status4D)) || []}
                                currentPhase={currentPhase}
                            />
                        </div>
                    )}

                    {currentTab === 'gantt' && (
                        <div className="h-full p-4 overflow-auto bg-background">
                            <MaintenanceGantt />
                        </div>
                    )}

                    {currentTab === 'graph' && sceneConfig && (
                        <div className="h-full">
                            <HierarchyGraphDynamic
                                sceneConfig={sceneConfig}
                                siteName={site.name}
                                selectedNodeId={selectedDeviceId || selectedRackId || selectedRoomId}
                                onNodeSelect={(nodeId, nodeType) => {
                                    if (nodeType === 'device') {
                                        selectDevice(nodeId)
                                    } else if (nodeType === 'rack') {
                                        selectRack(nodeId)
                                    } else if (nodeType === 'room') {
                                        selectRoom(nodeId)
                                    } else if (nodeType === 'floor') {
                                        selectFloor(nodeId)
                                    } else if (nodeType === 'building') {
                                        selectBuilding(nodeId)
                                    }
                                }}
                            />
                        </div>
                    )}

                    {currentTab === 'drawings' && sceneConfig && (
                        <div className="h-full">
                            <DrawingGeneratorDynamic
                                sceneConfig={sceneConfig}
                                deviceTypes={deviceTypes}
                                siteName={site.name}
                            />
                        </div>
                    )}

                    {currentTab === 'equipment' && (
                        <div className="h-full p-4 overflow-auto bg-background">
                            <EquipmentTable
                                sceneConfig={sceneConfig}
                                deviceTypes={deviceTypes}
                                onDeviceSelect={selectDevice}
                                selectedDeviceId={selectedDeviceId}
                                visibleStatuses={visibleStatuses}
                            />
                        </div>
                    )}

                    {currentTab === 'racks-table' && (
                        <div className="h-full p-4 overflow-auto bg-background">
                            <RackTable
                                sceneConfig={sceneConfig}
                                onRackSelect={selectRack}
                                selectedRackId={selectedRackId}
                            />
                        </div>
                    )}
                </div>

                {/* Bottom Panels */}
                {currentTab === '3d' && (
                    <>
                        {/* Inventory Panel with Resize */}
                        {showInventory && (
                            <div
                                className="border-t border-border/50 bg-card/50 flex flex-col"
                                style={{ height: inventoryHeight }}
                            >
                                {/* Resize Handle */}
                                <div
                                    className={`h-1.5 cursor-ns-resize hover:bg-primary/30 transition-colors flex items-center justify-center group ${isResizing ? 'bg-primary/40' : 'bg-transparent'
                                        }`}
                                    onMouseDown={handleResizeStart}
                                >
                                    <div className="w-12 h-0.5 bg-border group-hover:bg-primary/50 rounded-full" />
                                </div>

                                {/* Panel Content */}
                                <div className="flex-1 min-h-0 overflow-hidden">
                                    <InventoryPanelDynamic
                                        sceneConfig={sceneConfig}
                                        selectedDeviceId={selectedDeviceId}
                                        onDeviceSelect={selectDevice}
                                        onClose={() => setShowInventory(false)}
                                        onRefresh={() => {
                                            // Refresh scene data after operations
                                            window.location.reload()
                                        }}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Anomaly Panel - Floating */}
                        {showAnomalyPanel && (
                            <div className="absolute top-4 right-4 w-96 h-[600px] z-50">
                                <AnomalyPanel
                                    siteId={site.id}
                                    onClose={() => setShowAnomalyPanel(false)}
                                />
                            </div>
                        )}
                    </>
                )}
            </div>

            {showEquipmentEditor && (
                <Dialog open={showEquipmentEditor} onOpenChange={setShowEquipmentEditor}>
                    <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
                        <DialogHeader>
                            <DialogTitle>Equipment Modification</DialogTitle>
                            <DialogDescription>Edit device properties and view 4D state history</DialogDescription>
                        </DialogHeader>
                        <EquipmentEditor
                            sceneConfig={sceneConfig}
                            selectedDeviceId={selectedDeviceId}
                            currentPhase={currentPhase}
                            onDeviceModified={handleDeviceModified}
                            onClose={() => setShowEquipmentEditor(false)}
                        />
                    </DialogContent>
                </Dialog>
            )}
        </div>
    )
}
