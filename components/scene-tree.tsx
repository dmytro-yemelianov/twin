"use client"

import { useState } from "react"
import { ChevronRight, ChevronDown, Building2, Layers, DoorOpen, Server, Cpu } from "lucide-react"
import { cn } from "@/lib/utils"
import type { SceneConfig } from "@/lib/types"

interface SceneTreeProps {
    sceneConfig: SceneConfig
    selectedBuildingId?: string | null
    selectedFloorId?: string | null
    selectedRoomId?: string | null
    selectedRackId?: string | null
    selectedDeviceId?: string | null
    onSelectBuilding?: (id: string) => void
    onSelectFloor?: (id: string) => void
    onSelectRoom?: (id: string) => void
    onSelectRack?: (id: string) => void
    onSelectDevice?: (id: string) => void
    showPanel?: boolean
    panelHeight?: number
    className?: string
}

export function SceneTree({
    sceneConfig,
    selectedBuildingId,
    selectedFloorId,
    selectedRoomId,
    selectedRackId,
    selectedDeviceId,
    onSelectBuilding,
    onSelectFloor,
    onSelectRoom,
    onSelectRack,
    onSelectDevice,
    showPanel = false,
    panelHeight = 280,
    className
}: SceneTreeProps) {
    const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['root']))
    const [isCollapsed, setIsCollapsed] = useState(false)

    const toggleNode = (id: string) => {
        setExpandedNodes(prev => {
            const next = new Set(prev)
            if (next.has(id)) {
                next.delete(id)
            } else {
                next.add(id)
            }
            return next
        })
    }

    const buildings = sceneConfig.buildings || []
    const floors = sceneConfig.floors || []
    const rooms = sceneConfig.rooms || []
    const racks = sceneConfig.racks || []
    const devices = sceneConfig.devices || []

    const bottomOffset = showPanel ? panelHeight + 8 : 20

    return (
        <div
            className={cn(
                "fixed left-4 top-20 z-10 flex flex-col",
                "bg-background/40 backdrop-blur-sm border border-border/30 rounded-lg",
                "transition-all duration-200 hover:bg-background/90 hover:backdrop-blur-md",
                "shadow-lg overflow-hidden",
                isCollapsed ? "w-auto" : "w-[280px]",
                className
            )}
            style={{ bottom: `${bottomOffset}px` }}
        >
            <div className="p-2 border-b border-border/30 bg-background/20 flex items-center justify-between gap-2">
                {!isCollapsed && (
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Scene Browser
                    </div>
                )}
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="p-1 hover:bg-accent rounded transition-colors shrink-0"
                    title={isCollapsed ? "Expand" : "Collapse"}
                >
                    {isCollapsed ? (
                        <ChevronRight className="w-3.5 h-3.5" />
                    ) : (
                        <ChevronDown className="w-3.5 h-3.5 rotate-180" />
                    )}
                </button>
            </div>

            {!isCollapsed && (
                <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
                    <TreeNode
                        icon={Building2}
                        label={sceneConfig.siteId}
                        isExpanded={expandedNodes.has('root')}
                        onToggle={() => toggleNode('root')}
                        isSelected={false}
                        hasChildren={buildings.length > 0}
                        level={0}
                    />

                    {expandedNodes.has('root') && buildings.map(building => {
                        const buildingFloors = floors.filter(f => f.buildingId === building.id)
                        const isExpanded = expandedNodes.has(building.id)
                        const isSelected = selectedBuildingId === building.id

                        return (
                            <div key={building.id}>
                                <TreeNode
                                    icon={Building2}
                                    label={building.name}
                                    isExpanded={isExpanded}
                                    onToggle={() => toggleNode(building.id)}
                                    isSelected={isSelected}
                                    onClick={() => onSelectBuilding?.(building.id)}
                                    hasChildren={buildingFloors.length > 0}
                                    level={1}
                                />

                                {isExpanded && buildingFloors.map(floor => {
                                    const floorRooms = rooms.filter(r => {
                                        const floorId = r.floorId || 'default-floor'
                                        return floorId === floor.id
                                    })
                                    const floorExpanded = expandedNodes.has(floor.id)
                                    const floorSelected = selectedFloorId === floor.id

                                    return (
                                        <div key={floor.id}>
                                            <TreeNode
                                                icon={Layers}
                                                label={floor.name}
                                                isExpanded={floorExpanded}
                                                onToggle={() => toggleNode(floor.id)}
                                                isSelected={floorSelected}
                                                onClick={() => onSelectFloor?.(floor.id)}
                                                hasChildren={floorRooms.length > 0}
                                                level={2}
                                            />

                                            {floorExpanded && floorRooms.map(room => {
                                                const roomRacks = racks.filter(r => r.roomId === room.id)
                                                const roomExpanded = expandedNodes.has(room.id)
                                                const roomSelected = selectedRoomId === room.id

                                                return (
                                                    <div key={room.id}>
                                                        <TreeNode
                                                            icon={DoorOpen}
                                                            label={room.name}
                                                            isExpanded={roomExpanded}
                                                            onToggle={() => toggleNode(room.id)}
                                                            isSelected={roomSelected}
                                                            onClick={() => onSelectRoom?.(room.id)}
                                                            hasChildren={roomRacks.length > 0}
                                                            level={3}
                                                        />

                                                        {roomExpanded && roomRacks.map(rack => {
                                                            const rackDevices = devices.filter(d => d.rackId === rack.id)
                                                            const rackExpanded = expandedNodes.has(rack.id)
                                                            const rackSelected = selectedRackId === rack.id

                                                            return (
                                                                <div key={rack.id}>
                                                                    <TreeNode
                                                                        icon={Server}
                                                                        label={rack.name}
                                                                        isExpanded={rackExpanded}
                                                                        onToggle={() => toggleNode(rack.id)}
                                                                        isSelected={rackSelected}
                                                                        onClick={() => onSelectRack?.(rack.id)}
                                                                        hasChildren={rackDevices.length > 0}
                                                                        level={4}
                                                                    />

                                                                    {rackExpanded && rackDevices.map(device => {
                                                                        const deviceSelected = selectedDeviceId === device.id

                                                                        return (
                                                                            <TreeNode
                                                                                key={device.id}
                                                                                icon={Cpu}
                                                                                label={device.name}
                                                                                isSelected={deviceSelected}
                                                                                onClick={() => onSelectDevice?.(device.id)}
                                                                                hasChildren={false}
                                                                                level={5}
                                                                            />
                                                                        )
                                                                    })}
                                                                </div>
                                                            )
                                                        })}
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    )
                                })}
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

interface TreeNodeProps {
    icon: React.ElementType
    label: string
    isExpanded?: boolean
    onToggle?: () => void
    isSelected: boolean
    onClick?: () => void
    hasChildren: boolean
    level: number
}

function TreeNode({
    icon: Icon,
    label,
    isExpanded,
    onToggle,
    isSelected,
    onClick,
    hasChildren,
    level
}: TreeNodeProps) {
    return (
        <div
            className={cn(
                "flex items-center gap-1 px-1 py-0.5 rounded text-xs transition-colors group",
                isSelected ? "bg-primary/20 text-primary font-medium" : "hover:bg-accent/50 text-muted-foreground",
                onClick && "cursor-pointer"
            )}
            style={{ paddingLeft: `${4 + level * 12}px` }}
            onClick={(e) => {
                e.stopPropagation()
                onClick?.()
            }}
        >
            {hasChildren ? (
                <button
                    onClick={(e) => {
                        e.stopPropagation()
                        onToggle?.()
                    }}
                    className="w-3 h-3 flex items-center justify-center hover:bg-accent rounded"
                >
                    {isExpanded ? (
                        <ChevronDown className="w-3 h-3" />
                    ) : (
                        <ChevronRight className="w-3 h-3" />
                    )}
                </button>
            ) : (
                <div className="w-3" />
            )}

            <Icon className={cn(
                "w-3 h-3 shrink-0",
                isSelected ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
            )} />

            <span className="truncate flex-1">
                {label}
            </span>
        </div>
    )
}
