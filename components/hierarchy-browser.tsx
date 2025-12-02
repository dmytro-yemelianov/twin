"use client"

import { useState, useMemo, useCallback, useEffect } from "react"
import type { Site, SceneConfig, HierarchyNodeType, BuildingInfo, Floor, Room, Rack, Device } from "@/lib/types"
import { useSceneConfig } from "@/lib/hooks/use-data"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { 
  Globe, 
  MapPin, 
  Building2, 
  Layers, 
  DoorOpen, 
  Server, 
  Cpu,
  ChevronRight,
  ChevronDown,
  Home,
  ArrowLeft,
  X,
  Loader2
} from "lucide-react"

interface HierarchyBrowserProps {
  sites: Site[]
  selectedSite: Site | null
  sceneConfig?: SceneConfig | null // Made optional since we'll fetch it
  onSiteSelect: (site: Site) => void
  onBuildingSelect?: (buildingId: string) => void
  onFloorSelect?: (floorId: string) => void
  onRoomSelect?: (roomId: string) => void
  onRackSelect?: (rackId: string) => void
  onDeviceSelect?: (deviceId: string) => void
  onClose?: () => void
}

interface HierarchyItem {
  id: string
  type: HierarchyNodeType
  name: string
  parentId: string | null
  icon: React.ReactNode
  children: HierarchyItem[]
  data?: any
  stats?: string
}

const typeIcons: Record<HierarchyNodeType, React.ReactNode> = {
  region: <Globe className="w-4 h-4" />,
  site: <MapPin className="w-4 h-4" />,
  building: <Building2 className="w-4 h-4" />,
  floor: <Layers className="w-4 h-4" />,
  room: <DoorOpen className="w-4 h-4" />,
  rack: <Server className="w-4 h-4" />,
  device: <Cpu className="w-4 h-4" />,
}

const typeColors: Record<HierarchyNodeType, string> = {
  region: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  site: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  building: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  floor: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  room: "bg-green-500/20 text-green-400 border-green-500/30",
  rack: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  device: "bg-pink-500/20 text-pink-400 border-pink-500/30",
}

function HierarchyNode({ 
  item, 
  level = 0,
  expanded,
  onToggle,
  onSelect,
  selectedId,
}: { 
  item: HierarchyItem
  level?: number
  expanded: Set<string>
  onToggle: (id: string) => void
  onSelect: (item: HierarchyItem) => void
  selectedId: string | null
}) {
  const isExpanded = expanded.has(item.id)
  const hasChildren = item.children.length > 0
  const isSelected = selectedId === item.id

  return (
    <div className="select-none">
      <div
        className={`flex items-center gap-2 py-1.5 px-2 rounded-md cursor-pointer transition-colors ${
          isSelected 
            ? "bg-primary/20 border border-primary/40" 
            : "hover:bg-accent/50"
        }`}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={() => onSelect(item)}
      >
        {hasChildren ? (
          <button
            className="p-0.5 hover:bg-accent rounded"
            onClick={(e) => {
              e.stopPropagation()
              onToggle(item.id)
            }}
          >
            {isExpanded ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )}
          </button>
        ) : (
          <span className="w-4" />
        )}
        
        <div className={`p-1 rounded ${typeColors[item.type]}`}>
          {item.icon}
        </div>
        
        <span className="text-sm font-medium flex-1 truncate">{item.name}</span>
        
        {item.stats && (
          <span className="text-xs text-muted-foreground">{item.stats}</span>
        )}
      </div>
      
      {hasChildren && isExpanded && (
        <div className="border-l border-border/30 ml-4">
          {item.children.map((child) => (
            <HierarchyNode
              key={child.id}
              item={child}
              level={level + 1}
              expanded={expanded}
              onToggle={onToggle}
              onSelect={onSelect}
              selectedId={selectedId}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function HierarchyBrowser({
  sites,
  selectedSite,
  sceneConfig: externalSceneConfig,
  onSiteSelect,
  onBuildingSelect,
  onFloorSelect,
  onRoomSelect,
  onRackSelect,
  onDeviceSelect,
  onClose,
}: HierarchyBrowserProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [breadcrumb, setBreadcrumb] = useState<HierarchyItem[]>([])

  // Fetch scene config for selected site if not provided
  const { data: fetchedSceneConfig, isLoading: isLoadingConfig } = useSceneConfig(
    selectedSite?.sceneConfigUri || null
  )
  
  // Use external config if provided, otherwise use fetched config
  const sceneConfig = externalSceneConfig || fetchedSceneConfig || null

  // Build the hierarchy tree
  const hierarchyTree = useMemo(() => {
    const regions = new Map<string, Site[]>()
    
    // Group sites by region
    sites.forEach((site) => {
      if (!regions.has(site.region)) {
        regions.set(site.region, [])
      }
      regions.get(site.region)!.push(site)
    })

    // Build region nodes
    const regionNodes: HierarchyItem[] = Array.from(regions.entries()).map(([regionName, regionSites]) => {
      // Build site nodes for this region
      const siteNodes: HierarchyItem[] = regionSites.map((site) => {
        // If this is the selected site with config, build its children
        let buildingNodes: HierarchyItem[] = []
        
        if (selectedSite?.id === site.id && sceneConfig) {
          const buildings = sceneConfig.buildings || [{
            id: "default-building",
            siteId: site.id,
            name: "Main Building",
            glbUri: sceneConfig.building.glbUri,
            transformWorld: sceneConfig.building.transformWorld,
          }]
          
          const floors = sceneConfig.floors || [{
            id: "default-floor",
            buildingId: "default-building",
            name: "Ground Floor",
            level: 0,
          }]

          buildingNodes = buildings.map((building: BuildingInfo) => {
            // Get floors for this building
            const buildingFloors = floors.filter((f: Floor) => f.buildingId === building.id)
            
            const floorNodes: HierarchyItem[] = buildingFloors.map((floor: Floor) => {
              // Get rooms for this floor
              const floorRooms = sceneConfig.rooms.filter((r: Room) => r.floorId === floor.id)
              
              const roomNodes: HierarchyItem[] = floorRooms.map((room: Room) => {
                // Get racks for this room
                const roomRacks = sceneConfig.racks.filter((rack: Rack) => rack.roomId === room.id)
                
                const rackNodes: HierarchyItem[] = roomRacks.map((rack: Rack) => {
                  // Get devices for this rack
                  const rackDevices = sceneConfig.devices.filter((d: Device) => d.rackId === rack.id)
                  
                  const deviceNodes: HierarchyItem[] = rackDevices.map((device: Device) => ({
                    id: device.id,
                    type: "device" as HierarchyNodeType,
                    name: device.name,
                    parentId: rack.id,
                    icon: typeIcons.device,
                    children: [],
                    data: device,
                    stats: `U${device.uStart}`,
                  }))

                  return {
                    id: rack.id,
                    type: "rack" as HierarchyNodeType,
                    name: rack.name,
                    parentId: room.id,
                    icon: typeIcons.rack,
                    children: deviceNodes,
                    data: rack,
                    stats: `${rackDevices.length} devices`,
                  }
                })

                return {
                  id: room.id,
                  type: "room" as HierarchyNodeType,
                  name: room.name,
                  parentId: floor.id,
                  icon: typeIcons.room,
                  children: rackNodes,
                  data: room,
                  stats: `${roomRacks.length} racks`,
                }
              })

              return {
                id: floor.id,
                type: "floor" as HierarchyNodeType,
                name: floor.name,
                parentId: building.id,
                icon: typeIcons.floor,
                children: roomNodes,
                data: floor,
                stats: `${floorRooms.length} rooms`,
              }
            })

            return {
              id: building.id,
              type: "building" as HierarchyNodeType,
              name: building.name,
              parentId: site.id,
              icon: typeIcons.building,
              children: floorNodes,
              data: building,
              stats: `${buildingFloors.length} floors`,
            }
          })
        }

        return {
          id: site.id,
          type: "site" as HierarchyNodeType,
          name: site.name,
          parentId: regionName,
          icon: typeIcons.site,
          children: buildingNodes,
          data: site,
          stats: `${site.rackCount} racks`,
        }
      })

      return {
        id: regionName,
        type: "region" as HierarchyNodeType,
        name: regionName,
        parentId: null,
        icon: typeIcons.region,
        children: siteNodes,
        stats: `${regionSites.length} sites`,
      }
    })

    return regionNodes
  }, [sites, selectedSite, sceneConfig])

  const toggleExpand = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const handleSelect = useCallback((item: HierarchyItem) => {
    setSelectedId(item.id)
    
    // Build breadcrumb path
    const path: HierarchyItem[] = []
    const findPath = (nodes: HierarchyItem[], targetId: string): boolean => {
      for (const node of nodes) {
        if (node.id === targetId) {
          path.push(node)
          return true
        }
        if (node.children.length > 0 && findPath(node.children, targetId)) {
          path.unshift(node)
          return true
        }
      }
      return false
    }
    findPath(hierarchyTree, item.id)
    setBreadcrumb(path)

    // Call appropriate selection handler
    switch (item.type) {
      case "site":
        const site = sites.find((s) => s.id === item.id)
        if (site) {
          onSiteSelect(site)
          // Auto-expand the site
          setExpanded((prev) => new Set([...prev, item.id]))
        }
        break
      case "building":
        onBuildingSelect?.(item.id)
        break
      case "floor":
        onFloorSelect?.(item.id)
        break
      case "room":
        onRoomSelect?.(item.id)
        break
      case "rack":
        onRackSelect?.(item.id)
        break
      case "device":
        onDeviceSelect?.(item.id)
        break
    }
  }, [hierarchyTree, sites, onSiteSelect, onBuildingSelect, onFloorSelect, onRoomSelect, onRackSelect, onDeviceSelect])

  // Auto-expand path to selected site
  useMemo(() => {
    if (selectedSite) {
      const newExpanded = new Set(expanded)
      // Find and expand the region containing the selected site
      const siteRegion = sites.find((s) => s.id === selectedSite.id)?.region
      if (siteRegion) {
        newExpanded.add(siteRegion)
        newExpanded.add(selectedSite.id)
      }
      setExpanded(newExpanded)
    }
  }, [selectedSite?.id])

  return (
    <Card className="h-full flex flex-col border-border/50">
      {/* Header */}
      <div className="p-3 border-b border-border/50 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Home className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-semibold text-sm">Hierarchy Browser</h3>
          {isLoadingConfig && (
            <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
          )}
        </div>
        {onClose && (
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Breadcrumb */}
      {breadcrumb.length > 0 && (
        <div className="px-3 py-2 border-b border-border/50 flex items-center gap-1 overflow-x-auto shrink-0">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2"
            onClick={() => {
              setSelectedId(null)
              setBreadcrumb([])
            }}
          >
            <Home className="w-3 h-3" />
          </Button>
          {breadcrumb.map((item, index) => (
            <div key={item.id} className="flex items-center gap-1">
              <ChevronRight className="w-3 h-3 text-muted-foreground" />
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                      index === breadcrumb.length - 1
                        ? "bg-primary/20 text-primary"
                        : "hover:bg-accent text-muted-foreground"
                    }`}
                    onClick={() => handleSelect(item)}
                  >
                    <span className={`p-0.5 rounded ${typeColors[item.type]}`}>
                      {item.icon}
                    </span>
                    <span className="max-w-[80px] truncate">{item.name}</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>{item.type}: {item.name}</p>
                </TooltipContent>
              </Tooltip>
            </div>
          ))}
        </div>
      )}

      {/* Legend */}
      <div className="px-3 py-2 border-b border-border/50 flex flex-wrap gap-2 shrink-0">
        {(["region", "site", "building", "floor", "room", "rack", "device"] as HierarchyNodeType[]).map((type) => (
          <div
            key={type}
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] border ${typeColors[type]}`}
          >
            {typeIcons[type]}
            <span className="capitalize">{type}</span>
          </div>
        ))}
      </div>

      {/* Tree */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {hierarchyTree.map((region) => (
            <HierarchyNode
              key={region.id}
              item={region}
              expanded={expanded}
              onToggle={toggleExpand}
              onSelect={handleSelect}
              selectedId={selectedId}
            />
          ))}
        </div>
      </ScrollArea>

      {/* Selected Item Details */}
      {selectedId && breadcrumb.length > 0 && (
        <div className="p-3 border-t border-border/50 shrink-0">
          <div className="flex items-center gap-2 mb-2">
            <div className={`p-1.5 rounded ${typeColors[breadcrumb[breadcrumb.length - 1].type]}`}>
              {breadcrumb[breadcrumb.length - 1].icon}
            </div>
            <div>
              <div className="font-medium text-sm">{breadcrumb[breadcrumb.length - 1].name}</div>
              <div className="text-xs text-muted-foreground capitalize">
                {breadcrumb[breadcrumb.length - 1].type}
                {breadcrumb[breadcrumb.length - 1].stats && ` • ${breadcrumb[breadcrumb.length - 1].stats}`}
              </div>
            </div>
          </div>
          
          {/* Quick stats based on type */}
          {breadcrumb[breadcrumb.length - 1].type === "site" && breadcrumb[breadcrumb.length - 1].data && (
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-muted/30 rounded p-2">
                <div className="text-muted-foreground">Racks</div>
                <div className="font-medium">{breadcrumb[breadcrumb.length - 1].data.rackCount}</div>
              </div>
              <div className="bg-muted/30 rounded p-2">
                <div className="text-muted-foreground">AI Ready</div>
                <div className="font-medium">{breadcrumb[breadcrumb.length - 1].data.aiReadyRacks}</div>
              </div>
            </div>
          )}
          
          {breadcrumb[breadcrumb.length - 1].type === "device" && breadcrumb[breadcrumb.length - 1].data && (
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-muted/30 rounded p-2">
                <div className="text-muted-foreground">Position</div>
                <div className="font-medium">U{breadcrumb[breadcrumb.length - 1].data.uStart}</div>
              </div>
              <div className="bg-muted/30 rounded p-2">
                <div className="text-muted-foreground">Power</div>
                <div className="font-medium">{breadcrumb[breadcrumb.length - 1].data.powerKw} kW</div>
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  )
}

