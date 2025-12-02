"use client"
import { useMemo, useState } from "react"
import { Card } from "./ui/card"
import { Button } from "./ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip"
import { Switch } from "./ui/switch"
import { Label } from "./ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Badge } from "./ui/badge"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./ui/collapsible"
import type { DeviceType, SceneConfig, Phase, Status4D, BuildingInfo, Floor, Room } from "@/lib/types"
import { status4DColors, status4DLabels, phaseVisibilityMap } from "@/lib/types"
import { Eye, EyeOff, Zap, Thermometer, HardDrive, Edit3, GitBranch, Columns, Rows, Building2, Layers, DoorOpen, ChevronDown, ChevronRight } from "lucide-react"
import type { JSX } from "react/jsx-runtime"

interface RackElevationViewProps {
  sceneConfig: SceneConfig
  deviceTypes: DeviceType[]
  selectedRackId: string | null
  onRackSelect: (rackId: string) => void
  selectedDeviceId: string | null
  onDeviceSelect: (deviceId: string | null) => void
  currentPhase?: Phase
  visibleStatuses?: Set<Status4D>
  onEditDevice?: (deviceId: string) => void
  show4DLinks?: boolean
}

export function RackElevationView({
  sceneConfig,
  deviceTypes,
  selectedRackId,
  onRackSelect,
  selectedDeviceId,
  onDeviceSelect,
  currentPhase = "AS_IS",
  visibleStatuses,
  onEditDevice,
  show4DLinks = false,
}: RackElevationViewProps) {
  // Get related device IDs for the selected device
  const relatedDeviceIds = useMemo(() => {
    if (!selectedDeviceId) return new Set<string>()
    const selectedDevice = sceneConfig.devices.find(d => d.id === selectedDeviceId)
    if (!selectedDevice) return new Set<string>()
    return new Set(
      sceneConfig.devices
        .filter(d => d.logicalEquipmentId === selectedDevice.logicalEquipmentId)
        .map(d => d.id)
    )
  }, [selectedDeviceId, sceneConfig])

  // Group devices by logicalEquipmentId for 4D links
  const deviceGroups = useMemo(() => {
    const groups = new Map<string, string[]>()
    sceneConfig.devices.forEach(device => {
      if (!groups.has(device.logicalEquipmentId)) {
        groups.set(device.logicalEquipmentId, [])
      }
      groups.get(device.logicalEquipmentId)!.push(device.id)
    })
    // Only return groups with multiple devices
    return new Map([...groups].filter(([_, ids]) => ids.length > 1))
  }, [sceneConfig])

  // View toggles
  const [showFront, setShowFront] = useState(true)
  const [showBack, setShowBack] = useState(true)
  const [backLayout, setBackLayout] = useState<'below' | 'side'>('below') // 'below' or 'side'
  
  // Building and floor filters
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>("all")
  const [selectedFloorId, setSelectedFloorId] = useState<string>("all")
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set()) // Empty = all expanded

  // Get buildings from config (or create default)
  const buildings: BuildingInfo[] = useMemo(() => {
    if (sceneConfig.buildings && sceneConfig.buildings.length > 0) {
      return sceneConfig.buildings
    }
    // Create default building if none defined
    return [{
      id: "default-building",
      siteId: sceneConfig.siteId,
      name: "Main Building",
      glbUri: sceneConfig.building.glbUri,
      transformWorld: sceneConfig.building.transformWorld,
    }]
  }, [sceneConfig])

  // Get floors from config (or create default)
  const floors: Floor[] = useMemo(() => {
    if (sceneConfig.floors && sceneConfig.floors.length > 0) {
      return sceneConfig.floors
    }
    // Create default floor if none defined
    return [{
      id: "default-floor",
      buildingId: "default-building",
      name: "Ground Floor",
      level: 0,
    }]
  }, [sceneConfig])

  // Get available floors based on selected building
  const availableFloors = useMemo(() => {
    if (selectedBuildingId === "all") return floors
    return floors.filter(f => f.buildingId === selectedBuildingId)
  }, [floors, selectedBuildingId])

  // Build a map of room -> floor -> building
  const roomHierarchy = useMemo(() => {
    const hierarchy = new Map<string, { floorId: string; buildingId: string }>()
    
    sceneConfig.rooms.forEach(room => {
      const floorId = room.floorId || "default-floor"
      const floor = floors.find(f => f.id === floorId)
      const buildingId = floor?.buildingId || "default-building"
      hierarchy.set(room.id, { floorId, buildingId })
    })
    
    return hierarchy
  }, [sceneConfig.rooms, floors])

  // Group racks by building and floor
  const racksGroupedByLocation = useMemo(() => {
    const groups = new Map<string, { building: BuildingInfo; floor: Floor; room: Room; racks: typeof sceneConfig.racks }>()
    
    sceneConfig.racks.forEach(rack => {
      const room = sceneConfig.rooms.find(r => r.id === rack.roomId)
      if (!room) return
      
      const hierarchy = roomHierarchy.get(room.id)
      if (!hierarchy) return
      
      const building = buildings.find(b => b.id === hierarchy.buildingId) || buildings[0]
      const floor = floors.find(f => f.id === hierarchy.floorId) || floors[0]
      
      // Apply filters
      if (selectedBuildingId !== "all" && building.id !== selectedBuildingId) return
      if (selectedFloorId !== "all" && floor.id !== selectedFloorId) return
      
      const groupKey = `${building.id}-${floor.id}-${room.id}`
      
      if (!groups.has(groupKey)) {
        groups.set(groupKey, { building, floor, room, racks: [] })
      }
      groups.get(groupKey)!.racks.push(rack)
    })
    
    return groups
  }, [sceneConfig.racks, sceneConfig.rooms, roomHierarchy, buildings, floors, selectedBuildingId, selectedFloorId])

  // Organize groups by building -> floor -> room hierarchy for display
  const hierarchicalGroups = useMemo(() => {
    const result = new Map<string, {
      building: BuildingInfo
      floors: Map<string, {
        floor: Floor
        rooms: Map<string, { room: Room; racks: typeof sceneConfig.racks }>
      }>
    }>()
    
    racksGroupedByLocation.forEach(({ building, floor, room, racks }) => {
      if (!result.has(building.id)) {
        result.set(building.id, { building, floors: new Map() })
      }
      const buildingGroup = result.get(building.id)!
      
      if (!buildingGroup.floors.has(floor.id)) {
        buildingGroup.floors.set(floor.id, { floor, rooms: new Map() })
      }
      const floorGroup = buildingGroup.floors.get(floor.id)!
      
      floorGroup.rooms.set(room.id, { room, racks })
    })
    
    return result
  }, [racksGroupedByLocation])

  // Toggle group collapse (collapsed = hidden, not collapsed = visible)
  const toggleGroup = (groupId: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev)
      if (next.has(groupId)) {
        next.delete(groupId) // Expand (remove from collapsed)
      } else {
        next.add(groupId) // Collapse (add to collapsed)
      }
      return next
    })
  }
  
  // Check if a group is expanded (not in collapsed set)
  const isGroupExpanded = (groupId: string) => !collapsedGroups.has(groupId)

  // Determine rack order - reverse if only back is shown
  const getRackOrder = (racks: typeof sceneConfig.racks) => {
    const orderedRacks = [...racks]
    if (!showFront && showBack) {
      return orderedRacks.reverse()
    }
    return orderedRacks
  }
  const getDeviceTypeName = (deviceTypeId: string) => {
    const deviceType = deviceTypes.find((dt) => dt.id === deviceTypeId)
    return deviceType?.category || "DEVICE"
  }

  const handleDeviceClick = (deviceId: string) => {
    if (selectedDeviceId === deviceId) {
      onDeviceSelect(null)
    } else {
      onDeviceSelect(deviceId)
    }
  }

  const handleRackClick = (rackId: string) => {
    onRackSelect(rackId)
  }

  const renderRack = (rackId: string) => {
    const rack = sceneConfig.racks.find((r) => r.id === rackId)
    if (!rack) return null

    // Filter devices based on phase and status visibility
    const allowedStatusesForPhase = phaseVisibilityMap[currentPhase]
    const devicesInRack = sceneConfig.devices
      .filter((d) => {
        // Must be in this rack
        if (d.rackId !== rack.id) return false
        
        // Must be allowed in current phase
        if (!allowedStatusesForPhase.includes(d.status4D)) return false
        
        // Must be in visible statuses (if specified)
        if (visibleStatuses && !visibleStatuses.has(d.status4D)) return false
        
        return true
      })
      .sort((a, b) => a.uStart - b.uStart)

    const uHeight = rack.uHeight || 42
    const units: JSX.Element[] = []

    // Real rack proportions: 1U = 1.75 inches (44.45mm), rack width = 19 inches (482.6mm)
    // Using 8px per U for proportional height, and 152px width (19:1.75 ≈ 10.86, so 8*10.86 ≈ 87px, but we use 152px for better visibility)
    const uHeightPx = 8
    const rackWidthPx = 152

    for (let u = uHeight; u >= 1; u--) {
      // Check for any device at this U position (including filtered ones)
      const anyDeviceAtU = sceneConfig.devices.find((d) => 
        d.rackId === rack.id && d.uStart <= u && d.uStart + d.uHeight > u
      )
      const deviceAtU = devicesInRack.find((d) => d.uStart <= u && d.uStart + d.uHeight > u)
      const isDeviceStart = deviceAtU && deviceAtU.uStart === u
      const isFilteredDeviceStart = anyDeviceAtU && anyDeviceAtU.uStart === u && !deviceAtU

      if (isDeviceStart && deviceAtU) {
        const deviceType = getDeviceTypeName(deviceAtU.deviceTypeId)
        const color = status4DColors[deviceAtU.status4D]
        const isSelected = selectedDeviceId === deviceAtU.id
        const isRelated = relatedDeviceIds.has(deviceAtU.id) && !isSelected
        const deviceTypeObj = deviceTypes.find(dt => dt.id === deviceAtU.deviceTypeId)
        const has4DLinks = deviceGroups.has(deviceAtU.logicalEquipmentId)
        const relatedCount = deviceGroups.get(deviceAtU.logicalEquipmentId)?.length || 0

        const tooltipContent = (
          <div className="space-y-1">
            <div className="font-semibold">{deviceAtU.name}</div>
            <div className="text-xs opacity-90">{deviceType}</div>
            <div className="text-xs opacity-75">U{deviceAtU.uStart}-{deviceAtU.uStart + deviceAtU.uHeight - 1}</div>
            <div className="text-xs opacity-75">Status: {status4DLabels[deviceAtU.status4D]}</div>
            {deviceTypeObj && (
              <>
                <div className="flex items-center gap-1 text-xs">
                  <Zap className="w-3 h-3" />
                  {deviceTypeObj.powerKw}kW
                </div>
                <div className="flex items-center gap-1 text-xs">
                  <Thermometer className="w-3 h-3" />
                  {deviceTypeObj.btuHr} BTU/hr
                </div>
                {deviceTypeObj.gpuSlots > 0 && (
                  <div className="flex items-center gap-1 text-xs">
                    <HardDrive className="w-3 h-3" />
                    {deviceTypeObj.gpuSlots} GPU slots
                  </div>
                )}
              </>
            )}
            {has4DLinks && (
              <div className="flex items-center gap-1 text-xs text-cyan-400 pt-1 border-t border-white/20">
                <GitBranch className="w-3 h-3" />
                {relatedCount} 4D states linked
              </div>
            )}
          </div>
        )
        
        units.push(
          <Tooltip key={`${rack.id}-${u}-device`}>
            <TooltipTrigger asChild>
              <div
                className={`cursor-pointer transition-all border group relative ${
                  isSelected 
                    ? "ring-2 ring-blue-400 z-10 border-blue-400" 
                    : isRelated
                      ? "ring-2 ring-cyan-400/70 z-10 border-cyan-400"
                      : "border-gray-700/30 hover:ring-1 hover:ring-gray-400"
                }`}
                style={{
                  height: `${deviceAtU.uHeight * uHeightPx}px`,
                  backgroundColor: color,
                  opacity: isSelected ? 1 : isRelated ? 0.95 : 0.85,
                }}
                onClick={() => handleDeviceClick(deviceAtU.id)}
              >
                <div className="h-full px-1 flex flex-col justify-center text-white overflow-hidden">
                  <div className="text-[9px] font-semibold truncate leading-tight">{deviceAtU.name}</div>
                  <div className="text-[8px] opacity-90 truncate leading-tight">{deviceType}</div>
                  <div className="text-[7px] opacity-75 leading-tight">
                    U{deviceAtU.uStart}-{deviceAtU.uStart + deviceAtU.uHeight - 1}
                  </div>
                </div>
                {/* 4D Link indicator */}
                {show4DLinks && has4DLinks && (
                  <div 
                    className={`absolute left-0.5 top-0.5 w-3 h-3 rounded-full flex items-center justify-center ${
                      isSelected || isRelated ? 'bg-cyan-400' : 'bg-cyan-500/60'
                    }`}
                    title={`${relatedCount} linked states`}
                  >
                    <GitBranch className="w-2 h-2 text-white" />
                  </div>
                )}
                {/* Edit button on device */}
                {onEditDevice && (
                  <button
                    className="absolute right-0.5 top-1/2 -translate-y-1/2 w-5 h-5 bg-white/90 hover:bg-white rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      onEditDevice(deviceAtU.id)
                    }}
                    title="Edit device"
                  >
                    <Edit3 className="w-3 h-3 text-gray-800" />
                  </button>
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent side="right">
              {tooltipContent}
            </TooltipContent>
          </Tooltip>,
        )
      } else if (isFilteredDeviceStart && anyDeviceAtU) {
        // Device exists but is filtered out by phase/status visibility
        units.push(
          <Tooltip key={`${rack.id}-${u}-filtered`}>
            <TooltipTrigger asChild>
              <div
                className="border border-orange-500/50 bg-orange-500/10 flex items-center justify-center cursor-help transition-all hover:bg-orange-500/20"
                style={{
                  height: `${anyDeviceAtU.uHeight * uHeightPx}px`,
                }}
              >
                <div className="h-full px-1 flex flex-col justify-center text-orange-400 overflow-hidden">
                  <div className="text-[8px] font-medium truncate leading-tight text-center opacity-75">
                    FILTERED
                  </div>
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent side="right">
              <div className="space-y-1">
                <div className="font-semibold text-orange-400">Device Filtered</div>
                <div className="text-xs">{anyDeviceAtU.name}</div>
                <div className="text-xs opacity-75">Status: {anyDeviceAtU.status4D.replace('_', ' ')}</div>
                <div className="text-xs opacity-75">Not visible in current phase/status filter</div>
              </div>
            </TooltipContent>
          </Tooltip>,
        )
      } else if (!anyDeviceAtU) {
        units.push(
          <div
            key={`${rack.id}-${u}-empty`}
            className="border border-border/20 bg-background/30 flex items-center justify-center"
            style={{ height: `${uHeightPx}px` }}
          >
            <span className="text-[7px] text-muted-foreground">U{u}</span>
          </div>,
        )
      }
    }

    const isSelected = selectedRackId === rack.id

    const rackTooltipContent = (
      <div className="space-y-1">
        <div className="font-semibold">{rack.name}</div>
        <div className="text-xs">{rack.uHeight}U Capacity</div>
        <div className="text-xs flex items-center gap-1">
          <Zap className="w-3 h-3" />
          {rack.currentPowerKw.toFixed(1)}/{rack.powerKwLimit.toFixed(1)}kW
        </div>
        <div className="text-xs">{devicesInRack.length} devices visible</div>
        <div className="text-xs">
          {Math.round((rack.currentPowerKw / rack.powerKwLimit) * 100)}% power utilization
        </div>
      </div>
    )

    // Calculate card width based on layout
    const cardWidth = showFront && showBack && backLayout === 'side' 
      ? (rackWidthPx * 2 + 36) // Two views side by side
      : (rackWidthPx + 24) // Single column

    const renderRackView = (viewType: 'front' | 'back') => (
      <div className={backLayout === 'side' && showFront && showBack ? '' : viewType === 'front' ? 'mb-3' : ''}>
        <div className="flex items-center gap-1 mb-1">
          <Eye className="w-3 h-3" />
          <span className="text-[10px] font-semibold">{viewType === 'front' ? 'Front' : 'Back'}</span>
        </div>
        <div
          className="bg-card border border-border/40 rounded"
          style={{
            width: `${rackWidthPx}px`,
            display: "flex",
            flexDirection: "column",
          }}
        >
          {units}
        </div>
      </div>
    )

    return (
      <Tooltip key={rack.id}>
        <TooltipTrigger asChild>
          <Card
            className={`shrink-0 p-3 cursor-pointer transition-all ${
              isSelected ? "ring-2 ring-blue-500 bg-blue-950/20" : "hover:ring-1 hover:ring-gray-500"
            }`}
            style={{ width: `${cardWidth}px` }}
            onClick={() => handleRackClick(rack.id)}
          >
            {/* Rack Header */}
            <div className="mb-2 pb-2 border-b border-border/30">
              <div className="text-sm font-semibold truncate">{rack.name}</div>
              <div className="text-[10px] text-muted-foreground space-y-0.5 mt-1">
                <div>{rack.uHeight}U</div>
                <div>
                  {rack.currentPowerKw.toFixed(1)}/{rack.powerKwLimit.toFixed(1)}kW
                </div>
                <div>{devicesInRack.length} visible</div>
              </div>
            </div>

            {/* Views Container */}
            {showFront && showBack && backLayout === 'side' ? (
              // Side-by-side layout
              <div className="flex gap-3">
                {renderRackView('front')}
                {renderRackView('back')}
              </div>
            ) : (
              // Stacked layout (below) or single view
              <>
                {showFront && renderRackView('front')}
                {showBack && renderRackView('back')}
              </>
            )}
          </Card>
        </TooltipTrigger>
        <TooltipContent side="right">
          {rackTooltipContent}
        </TooltipContent>
      </Tooltip>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h3 className="text-lg font-semibold">Rack Elevation Views</h3>
          <p className="text-sm text-muted-foreground">
            Showing {currentPhase.replace('_', '-').toLowerCase()} phase
            {visibleStatuses ? ` • ${visibleStatuses.size} status types visible` : ''}
            {!showFront && showBack && ' • Right-to-left order'}
          </p>
        </div>

        {/* Controls Row */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Building/Floor Selectors */}
          <div className="flex items-center gap-2 bg-card/50 rounded-lg p-2 border border-border/30">
            <Building2 className="w-4 h-4 text-muted-foreground" />
            <Select value={selectedBuildingId} onValueChange={(v) => {
              setSelectedBuildingId(v)
              setSelectedFloorId("all") // Reset floor when building changes
            }}>
              <SelectTrigger className="h-7 w-[140px] text-xs">
                <SelectValue placeholder="All Buildings" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Buildings</SelectItem>
                {buildings.map(b => (
                  <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Layers className="w-4 h-4 text-muted-foreground ml-2" />
            <Select value={selectedFloorId} onValueChange={setSelectedFloorId}>
              <SelectTrigger className="h-7 w-[120px] text-xs">
                <SelectValue placeholder="All Floors" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Floors</SelectItem>
                {availableFloors.map(f => (
                  <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* View Controls */}
          <div className="flex items-center gap-4 bg-card/50 rounded-lg p-2 border border-border/30">
            {/* Front Toggle */}
            <div className="flex items-center gap-2">
              <Switch
                id="show-front"
                checked={showFront}
                onCheckedChange={setShowFront}
                disabled={!showBack && showFront} // Can't disable if it's the only one
              />
              <Label htmlFor="show-front" className="text-xs font-medium cursor-pointer flex items-center gap-1">
                {showFront ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3 opacity-50" />}
                Front
              </Label>
            </div>

            {/* Back Toggle */}
            <div className="flex items-center gap-2">
              <Switch
                id="show-back"
                checked={showBack}
                onCheckedChange={setShowBack}
                disabled={!showFront && showBack} // Can't disable if it's the only one
              />
              <Label htmlFor="show-back" className="text-xs font-medium cursor-pointer flex items-center gap-1">
                {showBack ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3 opacity-50" />}
                Back
              </Label>
      </div>

            {/* Layout Toggle - only show when both views are enabled */}
            {showFront && showBack && (
              <>
                <div className="w-px h-6 bg-border/50" />
                <div className="flex items-center gap-2">
                  <Button
                    variant={backLayout === 'below' ? 'default' : 'outline'}
                    size="sm"
                    className="h-7 px-2"
                    onClick={() => setBackLayout('below')}
                    title="Back below front"
                  >
                    <Rows className="w-3 h-3" />
                  </Button>
                  <Button
                    variant={backLayout === 'side' ? 'default' : 'outline'}
                    size="sm"
                    className="h-7 px-2"
                    onClick={() => setBackLayout('side')}
                    title="Back beside front"
                  >
                    <Columns className="w-3 h-3" />
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Grouped Rack Display - All expanded by default in rectangular containers */}
      <div className="space-y-6">
        {Array.from(hierarchicalGroups.entries()).map(([buildingId, { building, floors: floorGroups }]) => (
          <div 
            key={buildingId} 
            className="border border-amber-500/30 rounded-xl bg-amber-500/5 overflow-hidden"
          >
            {/* Building Header */}
            <button
              onClick={() => toggleGroup(buildingId)}
              className="flex items-center gap-3 w-full text-left p-3 bg-amber-500/10 hover:bg-amber-500/20 transition-colors border-b border-amber-500/20"
            >
              {isGroupExpanded(buildingId) ? (
                <ChevronDown className="w-5 h-5 text-amber-500" />
              ) : (
                <ChevronRight className="w-5 h-5 text-amber-500" />
              )}
              <Building2 className="w-5 h-5 text-amber-500" />
              <span className="font-semibold text-amber-200">{building.name}</span>
              <Badge className="ml-auto bg-amber-500/20 text-amber-300 border-amber-500/30">
                {floorGroups.size} floor{floorGroups.size !== 1 ? 's' : ''}
              </Badge>
            </button>
            
            {/* Building Content */}
            {isGroupExpanded(buildingId) && (
              <div className="p-4 space-y-4">
                {Array.from(floorGroups.entries()).map(([floorId, { floor, rooms: roomGroups }]) => (
                  <div 
                    key={floorId} 
                    className="border border-cyan-500/30 rounded-lg bg-cyan-500/5 overflow-hidden"
                  >
                    {/* Floor Header */}
                    <button
                      onClick={() => toggleGroup(floorId)}
                      className="flex items-center gap-3 w-full text-left p-2.5 bg-cyan-500/10 hover:bg-cyan-500/20 transition-colors border-b border-cyan-500/20"
                    >
                      {isGroupExpanded(floorId) ? (
                        <ChevronDown className="w-4 h-4 text-cyan-500" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-cyan-500" />
                      )}
                      <Layers className="w-4 h-4 text-cyan-500" />
                      <span className="font-medium text-cyan-200">{floor.name}</span>
                      <Badge className="ml-auto bg-cyan-500/20 text-cyan-300 border-cyan-500/30 text-xs">
                        {roomGroups.size} room{roomGroups.size !== 1 ? 's' : ''}
                      </Badge>
                    </button>
                    
                    {/* Floor Content */}
                    {isGroupExpanded(floorId) && (
                      <div className="p-3 space-y-3">
                        {Array.from(roomGroups.entries()).map(([roomId, { room, racks }]) => (
                          <div 
                            key={roomId} 
                            className="border border-green-500/30 rounded-lg bg-green-500/5 overflow-hidden"
                          >
                            {/* Room Header */}
                            <div className="flex items-center gap-2 p-2 bg-green-500/10 border-b border-green-500/20">
                              <DoorOpen className="w-4 h-4 text-green-500" />
                              <span className="font-medium text-sm text-green-200">{room.name}</span>
                              <Badge className="ml-auto bg-green-500/20 text-green-300 border-green-500/30 text-xs">
                                {racks.length} rack{racks.length !== 1 ? 's' : ''}
                              </Badge>
                            </div>
                            
                            {/* Racks - Always visible */}
                            <div 
                              className="flex gap-4 overflow-x-auto p-3" 
                              style={{ scrollSnapType: "x mandatory" }}
                            >
                              {getRackOrder(racks).map((rack) => renderRack(rack.id))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        
        {/* Empty state */}
        {hierarchicalGroups.size === 0 && (
          <div className="text-center py-12 text-muted-foreground border border-border/30 rounded-xl bg-card/30">
            <Building2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No racks found for the selected filters.</p>
            <p className="text-sm mt-1">Try changing the building or floor selection.</p>
          </div>
      )}
      </div>
    </div>
  )
}