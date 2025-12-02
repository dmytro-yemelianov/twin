"use client"

import { useEffect, useMemo, useState } from "react"
import dynamic from "next/dynamic"
import { useAppStore } from "@/lib/stores/app-store"
import { useSceneConfig, useDeviceTypes } from "@/lib/hooks/use-data"
import { findAIReadyCapacity } from "@/lib/ai-capacity"
import { useDebouncedCallback } from "@/lib/hooks/use-debounce"
import { Eye, EyeOff, Menu, Package, Layout, Calendar, BarChart3, Edit3, GitBranch, Check, Minus, Plus, Clock, Sparkles, Cpu, History, Target, Rocket, ChevronRight, MapPin, Building2, Globe, Layers, DoorOpen, Server, Tag } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useToast } from "@/components/ui/use-toast"
import { SceneSkeleton, InventorySkeleton } from "@/components/loading-states"
import { phaseVisibilityMap, status4DLabels, status4DColors } from "@/lib/types"
import type { Site, Phase, Status4D } from "@/lib/types"

// Status icons and tooltips configuration
const STATUS_CONFIG: Record<Status4D, { tooltip: string }> = {
  EXISTING_RETAINED: { tooltip: "Equipment that exists today and will remain in place" },
  EXISTING_REMOVED: { tooltip: "Equipment scheduled for decommissioning or removal" },
  PROPOSED: { tooltip: "New equipment proposed for installation" },
  FUTURE: { tooltip: "Equipment planned for future phases" },
  MODIFIED: { tooltip: "Equipment being relocated or upgraded" },
}

// Phase configuration
const PHASE_CONFIG: Record<Phase, { label: string; tooltip: string }> = {
  AS_IS: { label: "As-Is", tooltip: "Current state - shows existing equipment" },
  TO_BE: { label: "To-Be", tooltip: "Target state - shows planned changes" },
  FUTURE: { label: "Future", tooltip: "Long-term vision - includes future expansion" },
}

// Import existing components directly
import { AICapacityPanel } from "./ai-capacity-panel"
import { ViewportControls } from "./viewport-controls"
import { RackElevationView } from "./rack-elevation-view"
import { EquipmentEditor } from "./equipment-editor"
import { TimelineView } from "./timeline-view"
import { MaintenanceGantt } from "./maintenance-gantt"

// Lazy load heavy components - use proper named export destructuring
const ThreeScene = dynamic(() => import("./three-scene").then(mod => ({ default: mod.ThreeScene })), {
  loading: () => <SceneSkeleton />,
  ssr: false
})

const InventoryPanelDynamic = dynamic(() => import("./inventory-panel").then(mod => ({ default: mod.InventoryPanel })), {
  loading: () => <InventorySkeleton />,
  ssr: false
})

const HierarchyGraphDynamic = dynamic(() => import("./hierarchy-graph").then(mod => ({ default: mod.HierarchyGraph })), {
  loading: () => <SceneSkeleton />,
  ssr: false
})

// These components may not exist yet - we'll handle them conditionally
// const TimelineView = dynamic(() => import("./timeline-view"), { ssr: false })
// const MaintenanceGantt = dynamic(() => import("./maintenance-gantt"), { ssr: false })
// const PhaseDemoPanel = dynamic(() => import("./phase-demo-panel"), { ssr: false })
// const GeometryManager = dynamic(() => import("./geometry-manager"), { ssr: false })
// const RackElevationView = dynamic(() => import("./rack-elevation-view"), { ssr: false })
// const EquipmentEditor = dynamic(() => import("./equipment-editor"), { ssr: false })

interface TwinViewerOptimizedProps {
  site: Site
  sites?: Site[]
  onSiteChange?: (site: Site) => void
}

export function TwinViewerOptimized({ site, sites = [], onSiteChange }: TwinViewerOptimizedProps) {
  const { toast } = useToast()

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

  // Zustand store state
  const {
    currentPhase,
    setCurrentPhase,
    statusVisibility,
    setStatusVisibility,
    colorMode,
    setColorMode,
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
    setXrayMode,
    setSceneConfig,
    setDeviceTypes,
    isSceneLoading,
    setIsSceneLoading
  } = useAppStore()

  // Local state for operational panels and 3D scene
  const [currentTab, setCurrentTab] = useState('3d')
  const [showOrigin, setShowOrigin] = useState(false)
  const [showCompass, setShowCompass] = useState(true)
  const [show4DLines, setShow4DLines] = useState(false)
  const [showLabels, setShowLabels] = useState(true) // Show rack labels by default
  const [showAIAnalysis, setShowAIAnalysis] = useState(false) // AI capacity analysis - disabled by default
  const [showEquipmentEditor, setShowEquipmentEditor] = useState(false)
  const [triggerResetCamera, setTriggerResetCamera] = useState(0)
  const [triggerFitView, setTriggerFitView] = useState(0) 
  const [triggerZoomIn, setTriggerZoomIn] = useState(0)
  const [triggerZoomOut, setTriggerZoomOut] = useState(0)
  
  // Inventory panel resize state
  const [inventoryHeight, setInventoryHeight] = useState(280)
  const [isResizing, setIsResizing] = useState(false)
  const minInventoryHeight = 150
  const maxInventoryHeight = 500
  
  // Device modification handler
  const handleDeviceModified = (updatedDevice: any) => {
    // In a real implementation, this would update the store/backend
    console.log('Device modified:', updatedDevice)
  }

  // Direct edit handler - opens editor for a specific device
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
  const handleResetCamera = () => {
    setTriggerResetCamera(prev => prev + 1)
  }

  const handleFitView = () => {
    setTriggerFitView(prev => prev + 1)
  }

  const handleZoomIn = () => {
    setTriggerZoomIn(prev => prev + 1)
  }

  const handleZoomOut = () => {
    setTriggerZoomOut(prev => prev + 1)
  }

  // React Query hooks
  const { data: sceneConfig, isLoading: sceneLoading } = useSceneConfig(site.sceneConfigUri)
  const { data: deviceTypes = [], isLoading: deviceTypesLoading } = useDeviceTypes()

  // Debug device selection
  useEffect(() => {
    console.log('Selected device ID:', selectedDeviceId)
    if (selectedDeviceId && sceneConfig) {
      const device = sceneConfig.devices.find(d => d.id === selectedDeviceId)
      console.log('Selected device:', device)
    }
  }, [selectedDeviceId, sceneConfig])

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

  // Get related devices for selected device (same logicalEquipmentId)
  const relatedDevices = useMemo(() => {
    if (!selectedDeviceId || !sceneConfig) return []
    const selectedDevice = sceneConfig.devices.find(d => d.id === selectedDeviceId)
    if (!selectedDevice) return []
    return sceneConfig.devices.filter(
      d => d.logicalEquipmentId === selectedDevice.logicalEquipmentId && d.id !== selectedDeviceId
    )
  }, [selectedDeviceId, sceneConfig])

  // Debounced AI capacity calculation - only runs when enabled
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

  // Calculate AI capacity when phase, config, or AI analysis toggle changes
  useEffect(() => {
    debouncedAICapacityCalc()
  }, [currentPhase, sceneConfig, showAIAnalysis, debouncedAICapacityCalc])

  // Show AI capacity as toast notification
  useEffect(() => {
    if (aiCapacitySuggestion && showAIAnalysis) {
      toast({
        title: "🤖 AI-Ready Capacity Found!",
        description: `${aiCapacitySuggestion.totalFreeU}U available across ${aiCapacitySuggestion.rackIds.length} racks with ${aiCapacitySuggestion.totalPowerHeadroomKw.toFixed(1)}kW headroom`,
        duration: 5000
      })
    }
  }, [aiCapacitySuggestion, showAIAnalysis, toast])

  // Loading state
  if (isSceneLoading || !sceneConfig || deviceTypes.length === 0) {
    return <SceneSkeleton />
  }

  const toggleStatusVisibility = (status: Status4D) => {
    setStatusVisibility(status, !statusVisibility[status])
  }

  const handlePhaseChange = (phase: Phase) => {
    setCurrentPhase(phase)
    
    // Auto-update status visibility based on phase
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

              {/* Building breadcrumb - show when sceneConfig has buildings */}
              {sceneConfig?.buildings && sceneConfig.buildings.length > 0 && (
                <>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  <Select 
                    value={selectedBuildingId || sceneConfig.buildings[0]?.id || ''} 
                    onValueChange={(id) => {
                      selectBuilding(id)
                      // Clear downstream selections
                      selectFloor(null)
                      selectRoom(null)
                      selectRack(null)
                      selectDevice(null)
                    }}
                  >
                    <SelectTrigger className="h-7 w-auto gap-1 border-0 bg-transparent hover:bg-accent px-2">
                      <Layers className="w-3 h-3 text-muted-foreground" />
                      <SelectValue placeholder="Building" />
                    </SelectTrigger>
                    <SelectContent>
                      {sceneConfig.buildings.map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </>
              )}

              {/* Floor breadcrumb - show when sceneConfig has floors */}
              {sceneConfig?.floors && sceneConfig.floors.length > 0 && (() => {
                const currentBuildingId = selectedBuildingId || sceneConfig.buildings?.[0]?.id
                const floorsInBuilding = sceneConfig.floors.filter(f => f.buildingId === currentBuildingId)
                if (floorsInBuilding.length === 0) return null
                return (
                  <>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    <Select 
                      value={selectedFloorId || floorsInBuilding[0]?.id || ''} 
                      onValueChange={(id) => {
                        selectFloor(id)
                        // Clear downstream selections
                        selectRoom(null)
                        selectRack(null)
                        selectDevice(null)
                      }}
                    >
                      <SelectTrigger className="h-7 w-auto gap-1 border-0 bg-transparent hover:bg-accent px-2">
                        <Layers className="w-3 h-3 text-muted-foreground" />
                        <SelectValue placeholder="Floor" />
                      </SelectTrigger>
                      <SelectContent>
                        {floorsInBuilding.map((f) => (
                          <SelectItem key={f.id} value={f.id}>
                            {f.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </>
                )
              })()}

              {/* Room breadcrumb - show when rooms exist */}
              {sceneConfig?.rooms && sceneConfig.rooms.length > 0 && (() => {
                // Filter rooms by selected floor if floors exist
                const currentFloorId = selectedFloorId || sceneConfig.floors?.[0]?.id
                const roomsInScope = sceneConfig.floors?.length 
                  ? sceneConfig.rooms.filter(r => r.floorId === currentFloorId)
                  : sceneConfig.rooms
                if (roomsInScope.length === 0) return null
                
                // Get the effective room id (selected, or from rack, or from device)
                let effectiveRoomId = selectedRoomId
                if (!effectiveRoomId && selectedRackId) {
                  const rack = sceneConfig.racks.find(r => r.id === selectedRackId)
                  effectiveRoomId = rack?.roomId || null
                }
                if (!effectiveRoomId && selectedDeviceId) {
                  const device = sceneConfig.devices.find(d => d.id === selectedDeviceId)
                  const rack = sceneConfig.racks.find(r => r.id === device?.rackId)
                  effectiveRoomId = rack?.roomId || null
                }
                
                return (
                  <>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    <Select 
                      value={effectiveRoomId || roomsInScope[0]?.id || ''} 
                      onValueChange={(id) => {
                        selectRoom(id)
                        // Clear downstream selections
                        selectRack(null)
                        selectDevice(null)
                      }}
                    >
                      <SelectTrigger className="h-7 w-auto gap-1 border-0 bg-transparent hover:bg-accent px-2">
                        <DoorOpen className="w-3 h-3 text-muted-foreground" />
                        <SelectValue placeholder="Room" />
                      </SelectTrigger>
                      <SelectContent>
                        {roomsInScope.map((r) => (
                          <SelectItem key={r.id} value={r.id}>
                            {r.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </>
                )
              })()}

              {/* Rack breadcrumb - show when a rack or device is selected */}
              {(selectedRackId || selectedDeviceId) && sceneConfig && (() => {
                let rackId = selectedRackId
                if (!rackId && selectedDeviceId) {
                  const device = sceneConfig.devices.find(d => d.id === selectedDeviceId)
                  rackId = device?.rackId || null
                }
                if (!rackId) return null
                
                const rack = sceneConfig.racks.find(r => r.id === rackId)
                if (!rack) return null
                
                // Get all racks in the current room for the dropdown
                const racksInRoom = sceneConfig.racks.filter(r => r.roomId === rack.roomId)
                
                return (
                  <>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    <Select 
                      value={rackId} 
                      onValueChange={(id) => {
                        selectRack(id)
                        selectDevice(null)
                      }}
                    >
                      <SelectTrigger className={`h-7 w-auto gap-1 border-0 px-2 ${
                        selectedRackId ? 'bg-primary/10 font-medium' : 'bg-transparent hover:bg-accent'
                      }`}>
                        <Server className="w-3 h-3" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {racksInRoom.map((r) => (
                          <SelectItem key={r.id} value={r.id}>
                            {r.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </>
                )
              })()}

              {/* Device breadcrumb - show when a device is selected */}
              {selectedDeviceId && sceneConfig && (() => {
                const device = sceneConfig.devices.find(d => d.id === selectedDeviceId)
                if (!device) return null
                
                // Get all devices in the current rack for the dropdown
                const devicesInRack = sceneConfig.devices.filter(d => d.rackId === device.rackId)
                
                return (
                  <>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    <Select 
                      value={selectedDeviceId} 
                      onValueChange={(id) => {
                        selectDevice(id)
                      }}
                    >
                      <SelectTrigger className="h-7 w-auto gap-1 border-0 bg-primary/10 px-2 font-medium">
                        <Cpu className="w-3 h-3" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {devicesInRack.map((d) => (
                          <SelectItem key={d.id} value={d.id}>
                            <span className="max-w-[180px] truncate">{d.name}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </>
                )
              })()}
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
                      onClick={() => handlePhaseChange(phase)}
                      className={`px-2.5 h-7 rounded-md transition-all flex items-center gap-1.5 text-xs font-medium ${
                        isActive 
                          ? 'bg-primary text-primary-foreground shadow-sm' 
                          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                      }`}
                    >
                      {getPhaseIcon(phase)}
                      {config.label}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p>{config.tooltip}</p>
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
                  onClick={() => toggleStatusVisibility(status as Status4D)}
                      className={`w-7 h-7 rounded-md transition-all flex items-center justify-center ${
                    isVisible 
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

        <div className="flex items-center gap-3">
          {/* View Tabs Group */}
          <div className="flex items-center bg-background/50 rounded-lg p-1 border border-border/30">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
              onClick={() => setCurrentTab('3d')}
                  className={`w-8 h-7 rounded-md transition-all flex items-center justify-center ${
                    currentTab === '3d'
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  }`}
            >
              <Package className="w-4 h-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>3D View</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
              onClick={() => setCurrentTab('racks')}
                  className={`w-8 h-7 rounded-md transition-all flex items-center justify-center ${
                    currentTab === 'racks'
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  }`}
            >
              <Layout className="w-4 h-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>2D Racks</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
              onClick={() => setCurrentTab('timeline')}
                  className={`w-8 h-7 rounded-md transition-all flex items-center justify-center ${
                    currentTab === 'timeline'
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  }`}
            >
              <BarChart3 className="w-4 h-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>Timeline</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
              onClick={() => setCurrentTab('gantt')}
                  className={`w-8 h-7 rounded-md transition-all flex items-center justify-center ${
                    currentTab === 'gantt'
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  }`}
            >
              <Calendar className="w-4 h-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>Gantt Chart</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setCurrentTab('graph')}
                  className={`w-8 h-7 rounded-md transition-all flex items-center justify-center ${
                    currentTab === 'graph'
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  }`}
                >
                  <GitBranch className="w-4 h-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>Hierarchy Graph</p>
                <p className="text-xs text-muted-foreground">View equipment hierarchy as node graph</p>
              </TooltipContent>
            </Tooltip>
          </div>

          {/* Display Options Group */}
          <div className="flex items-center bg-background/50 rounded-lg p-1 border border-border/30">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setShowBuilding(!showBuilding)}
                  className={`w-8 h-7 rounded-md transition-all flex items-center justify-center ${
                    showBuilding
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
                  onClick={() => setShowLabels(!showLabels)}
                  className={`w-8 h-7 rounded-md transition-all flex items-center justify-center ${
                    showLabels
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
                  onClick={() => setShow4DLines(!show4DLines)}
                  className={`w-8 h-7 rounded-md transition-all flex items-center justify-center ${
                    show4DLines
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
            <Tooltip>
              <TooltipTrigger asChild>
                <button
            onClick={() => setShowInventory(!showInventory)}
                  className={`w-8 h-7 rounded-md transition-all flex items-center justify-center ${
                    showInventory
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  }`}
          >
            <Menu className="w-4 h-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>Inventory Panel</p>
                <p className="text-xs text-muted-foreground">Show device inventory sidebar</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setShowAIAnalysis(!showAIAnalysis)}
                  className={`w-8 h-7 rounded-md transition-all flex items-center justify-center ${
                    showAIAnalysis
                      ? 'bg-purple-500 text-white shadow-sm'
                      : 'text-muted-foreground/50 hover:bg-accent hover:text-accent-foreground'
                  }`}
                >
                  <Cpu className="w-4 h-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>AI Capacity Analysis</p>
                <p className="text-xs text-muted-foreground">Find optimal racks for GPU workloads</p>
              </TooltipContent>
            </Tooltip>
            </div>
        </div>
      </div>

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

              {/* Selected Device Edit Popup */}
              {selectedDeviceId && (
                <div className="absolute bottom-20 left-4 z-20">
                  <Card className="p-3 bg-card/95 backdrop-blur border-blue-500/30 shadow-lg max-w-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium truncate">
                          {sceneConfig?.devices.find(d => d.id === selectedDeviceId)?.name || 'Device'}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          {sceneConfig?.devices.find(d => d.id === selectedDeviceId)?.status4D.replace('_', ' ')}
                        </div>
                        {relatedDevices.length > 0 && (
                          <div className="text-[10px] text-cyan-400 flex items-center gap-1 mt-0.5">
                            <GitBranch className="w-3 h-3" />
                            {relatedDevices.length} related state{relatedDevices.length > 1 ? 's' : ''} highlighted
                          </div>
                        )}
                      </div>
                      <Button
                        size="sm"
                        className="gap-1.5 h-7"
                        onClick={() => handleEditDevice(selectedDeviceId)}
                      >
                        <Edit3 className="w-3 h-3" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        onClick={() => selectDevice(null)}
                      >
                        ×
                      </Button>
                    </div>
                  </Card>
                </div>
              )}

              {/* Viewport Controls - bottom-left to avoid ViewHelper overlap */}
              <div className="absolute bottom-4 left-4 z-20">
                <ViewportControls
                  onResetCamera={handleResetCamera}
                  onFitView={handleFitView}
                  onZoomIn={handleZoomIn}
                  onZoomOut={handleZoomOut}
                  onToggleOrigin={() => setShowOrigin(!showOrigin)}
                  onToggleCompass={() => setShowCompass(!showCompass)}
                  showOrigin={showOrigin}
                  showCompass={showCompass}
                />
              </div>
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
        </div>
        
        {/* Bottom Inventory Panel with Resize */}
        {showInventory && currentTab === '3d' && (
          <div 
            className="border-t border-border/50 bg-card/50 flex flex-col"
            style={{ height: inventoryHeight }}
          >
            {/* Resize Handle */}
            <div
              className={`h-1.5 cursor-ns-resize hover:bg-primary/30 transition-colors flex items-center justify-center group ${
                isResizing ? 'bg-primary/40' : 'bg-transparent'
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
              />
            </div>
          </div>
        )}
      </div>

      {/* AI Capacity Panel - Removed permanent display, now shows as toast */}

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