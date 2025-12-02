"use client"

import { useEffect, useRef, useState, useMemo, useCallback } from "react"
import { useTheme } from "next-themes"
import cytoscape, { Core } from "cytoscape"
import type { SceneConfig } from "@/lib/types"

interface HierarchyGraphProps {
  sceneConfig: SceneConfig
  siteName?: string
  onNodeSelect?: (nodeId: string, nodeType: string) => void
  selectedNodeId?: string | null
}

// Theme colors
const themeColors = {
  light: {
    background: '#f8f9fa',
    site: '#6366f1',
    building: '#8b5cf6',
    floor: '#a855f7',
    room: '#22c55e',
    rack: '#3b82f6',
    device: '#f59e0b',
    edge: '#9ca3af',
    text: '#1f2937',
    selectedBorder: '#ef4444',
    hoverBorder: '#3b82f6',
    collapsedBg: '#fef3c7',
  },
  dark: {
    background: '#09090b',
    site: '#818cf8',
    building: '#a78bfa',
    floor: '#c084fc',
    room: '#4ade80',
    rack: '#60a5fa',
    device: '#fbbf24',
    edge: '#52525b',
    text: '#fafafa',
    selectedBorder: '#f87171',
    hoverBorder: '#60a5fa',
    collapsedBg: '#422006',
  },
}

// SVG icons as data URIs (Lucide-style icons)
const createIconSvg = (pathData: string, color: string, bgColor: string) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <rect x="0" y="0" width="24" height="24" rx="4" fill="${bgColor}" stroke="none"/>
    ${pathData}
  </svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

// Icon path data (Lucide-style)
const iconPaths = {
  // Globe icon for Site
  site: '<circle cx="12" cy="12" r="9"/><line x1="3" y1="12" x2="21" y2="12"/><path d="M12 3a15.3 15.3 0 0 1 4 9 15.3 15.3 0 0 1-4 9 15.3 15.3 0 0 1-4-9 15.3 15.3 0 0 1 4-9z"/>',
  // Building icon
  building: '<rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/>',
  // Layers icon for Floor
  floor: '<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>',
  // Door/Room icon
  room: '<path d="M18 20V6a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v14"/><path d="M2 20h20"/><path d="M14 12v.01"/>',
  // Server/Rack icon
  rack: '<rect x="2" y="2" width="20" height="8" rx="2" ry="2"/><rect x="2" y="14" width="20" height="8" rx="2" ry="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/>',
  // CPU/Device icon
  device: '<rect x="4" y="4" width="16" height="16" rx="2" ry="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/>',
  // Collapsed indicator (plus)
  collapsed: '<circle cx="12" cy="12" r="9" fill="none"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>',
}

// Node sizes by type
const nodeSizes: Record<string, number> = {
  site: 55,
  building: 48,
  floor: 42,
  room: 38,
  rack: 34,
  device: 28,
}

export function HierarchyGraph({ 
  sceneConfig, 
  siteName = "Site",
  onNodeSelect,
  selectedNodeId 
}: HierarchyGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const cyRef = useRef<Core | null>(null)
  const { resolvedTheme } = useTheme()
  const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set())
  const [tooltip, setTooltip] = useState<{ x: number; y: number; name: string; type: string; childCount?: number } | null>(null)

  const colors = resolvedTheme === 'light' ? themeColors.light : themeColors.dark

  // Generate icon URLs
  const getIconUrl = useCallback((type: string, isCollapsed: boolean = false) => {
    const iconColor = '#ffffff'
    const bgColor = colors[type as keyof typeof colors] || colors.device
    if (isCollapsed) {
      return createIconSvg(iconPaths[type as keyof typeof iconPaths] || iconPaths.device, iconColor, colors.collapsedBg)
    }
    return createIconSvg(iconPaths[type as keyof typeof iconPaths] || iconPaths.device, iconColor, bgColor as string)
  }, [colors])

  // Build graph data from sceneConfig
  const graphData = useMemo(() => {
    const nodes: cytoscape.ElementDefinition[] = []
    const edges: cytoscape.ElementDefinition[] = []
    const childrenMap = new Map<string, string[]>()
    
    // Return empty if no valid config
    if (!sceneConfig || 
        !Array.isArray(sceneConfig.rooms) || 
        !Array.isArray(sceneConfig.racks) || 
        !Array.isArray(sceneConfig.devices)) {
      return { nodes, edges, childrenMap }
    }
    
    // Helper to track children
    const addChild = (parentId: string, childId: string) => {
      if (!childrenMap.has(parentId)) {
        childrenMap.set(parentId, [])
      }
      childrenMap.get(parentId)!.push(childId)
    }

    // Site node (root) - always use 'site-root' for consistency
    const siteId = 'site-root'
    nodes.push({
      data: { 
        id: siteId, 
        label: siteName, 
        type: 'site',
        nodeType: 'site',
        hasChildren: true,
      }
    })

    // Buildings
    const buildings = sceneConfig.buildings || [{ id: 'building-default', name: 'Building', siteId }]
    buildings.forEach((building) => {
      const buildingId = building.id || `building-${buildings.indexOf(building)}`
      nodes.push({
        data: { 
          id: buildingId, 
          label: building.name || 'Building', 
          type: 'building',
          nodeType: 'building',
          parent: siteId,
          hasChildren: true,
        }
      })
      edges.push({ data: { source: siteId, target: buildingId } })
      addChild(siteId, buildingId)
    })

    // Floors
    const floors = sceneConfig.floors || []
    floors.forEach((floor) => {
      const parentBuildingId = floor.buildingId || buildings[0]?.id || 'building-default'
      nodes.push({
        data: { 
          id: floor.id, 
          label: floor.name, 
          type: 'floor',
          nodeType: 'floor',
          parent: parentBuildingId,
          hasChildren: true,
        }
      })
      edges.push({ data: { source: parentBuildingId, target: floor.id } })
      addChild(parentBuildingId, floor.id)
    })

    // Rooms
    sceneConfig.rooms.forEach((room) => {
      let parentId = room.floorId
      if (!parentId || !floors.find(f => f.id === parentId)) {
        parentId = buildings[0]?.id || 'building-default'
      }
      nodes.push({
        data: { 
          id: room.id, 
          label: room.name, 
          type: 'room',
          nodeType: 'room',
          parent: parentId,
          hasChildren: true,
        }
      })
      edges.push({ data: { source: parentId, target: room.id } })
      addChild(parentId, room.id)
    })

    // Racks
    sceneConfig.racks.forEach((rack) => {
      nodes.push({
        data: { 
          id: rack.id, 
          label: rack.name, 
          type: 'rack',
          nodeType: 'rack',
          parent: rack.roomId,
          hasChildren: true,
        }
      })
      edges.push({ data: { source: rack.roomId, target: rack.id } })
      addChild(rack.roomId, rack.id)
    })

    // Devices
    sceneConfig.devices.forEach((device) => {
      nodes.push({
        data: { 
          id: device.id, 
          label: device.name.length > 12 ? device.name.substring(0, 10) + '...' : device.name, 
          fullName: device.name,
          type: 'device',
          nodeType: 'device',
          parent: device.rackId,
          category: device.category,
          status: device.status4D,
          hasChildren: false,
        }
      })
      edges.push({ data: { source: device.rackId, target: device.id } })
      addChild(device.rackId, device.id)
    })

    // Update hasChildren based on actual children
    nodes.forEach(node => {
      const children = childrenMap.get(node.data.id as string)
      node.data.hasChildren = children && children.length > 0
      node.data.childCount = children?.length || 0
    })

    return { nodes, edges, childrenMap }
  }, [sceneConfig, siteName])

  // Get all descendants of a node
  const getDescendants = useCallback((nodeId: string, visited = new Set<string>()): string[] => {
    if (visited.has(nodeId)) return []
    visited.add(nodeId)
    
    const children = graphData.childrenMap.get(nodeId) || []
    const descendants: string[] = [...children]
    
    children.forEach(childId => {
      descendants.push(...getDescendants(childId, visited))
    })
    
    return descendants
  }, [graphData.childrenMap])

  // Toggle collapse state
  const toggleCollapse = useCallback((nodeId: string) => {
    setCollapsedNodes(prev => {
      const next = new Set(prev)
      if (next.has(nodeId)) {
        next.delete(nodeId)
      } else {
        next.add(nodeId)
      }
      return next
    })
  }, [])

  // Initialize Cytoscape
  useEffect(() => {
    if (!containerRef.current || graphData.nodes.length === 0) return

    const cy = cytoscape({
      container: containerRef.current,
      elements: [...graphData.nodes, ...graphData.edges],
      style: [
        // Node styles with icon backgrounds
        {
          selector: 'node',
          style: {
            'label': 'data(label)',
            'text-valign': 'bottom',
            'text-halign': 'center',
            'text-margin-y': 8,
            'font-size': 10,
            'font-family': 'Inter, system-ui, sans-serif',
            'color': colors.text,
            'text-outline-width': 2,
            'text-outline-color': colors.background,
            'background-color': 'transparent',
            'background-fit': 'contain',
            'background-clip': 'none',
            'border-width': 0,
            'shape': 'rectangle',
          }
        },
        // Type-specific styles with icons
        {
          selector: 'node[type="site"]',
          style: {
            'background-image': getIconUrl('site'),
            'width': nodeSizes.site,
            'height': nodeSizes.site,
            'font-size': 13,
            'font-weight': 'bold',
          }
        },
        {
          selector: 'node[type="building"]',
          style: {
            'background-image': getIconUrl('building'),
            'width': nodeSizes.building,
            'height': nodeSizes.building,
            'font-size': 11,
          }
        },
        {
          selector: 'node[type="floor"]',
          style: {
            'background-image': getIconUrl('floor'),
            'width': nodeSizes.floor,
            'height': nodeSizes.floor,
            'font-size': 10,
          }
        },
        {
          selector: 'node[type="room"]',
          style: {
            'background-image': getIconUrl('room'),
            'width': nodeSizes.room,
            'height': nodeSizes.room,
            'font-size': 10,
          }
        },
        {
          selector: 'node[type="rack"]',
          style: {
            'background-image': getIconUrl('rack'),
            'width': nodeSizes.rack,
            'height': nodeSizes.rack,
            'font-size': 9,
          }
        },
        {
          selector: 'node[type="device"]',
          style: {
            'background-image': getIconUrl('device'),
            'width': nodeSizes.device,
            'height': nodeSizes.device,
            'font-size': 8,
          }
        },
        // Selected node
        {
          selector: 'node:selected',
          style: {
            'border-width': 3,
            'border-color': colors.selectedBorder,
            'border-opacity': 1,
          }
        },
        // Collapsed node style
        {
          selector: 'node.collapsed',
          style: {
            'border-width': 3,
            'border-color': colors.device,
            'border-style': 'dashed',
          }
        },
        // Hidden nodes
        {
          selector: 'node.hidden',
          style: {
            'display': 'none',
          }
        },
        // Hidden edges
        {
          selector: 'edge.hidden',
          style: {
            'display': 'none',
          }
        },
        // Edge styles
        {
          selector: 'edge',
          style: {
            'width': 1.5,
            'line-color': colors.edge,
            'target-arrow-color': colors.edge,
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            'arrow-scale': 0.7,
          }
        },
      ],
      layout: {
        name: 'cose',
        animate: false,
        padding: 60,
      },
      minZoom: 0.15,
      maxZoom: 3,
    })

    cyRef.current = cy

    // Double-click to toggle collapse
    cy.on('dbltap', 'node', (evt) => {
      const node = evt.target
      const nodeId = node.id()
      const hasChildren = node.data('hasChildren')
      
      if (hasChildren) {
        toggleCollapse(nodeId)
      }
    })

    // Single click to select
    cy.on('tap', 'node', (evt) => {
      const node = evt.target
      const nodeType = node.data('nodeType')
      const nodeId = node.id()
      onNodeSelect?.(nodeId, nodeType)
    })

    // Hover for tooltip
    cy.on('mouseover', 'node', (evt) => {
      const node = evt.target
      const nodeId = node.id()
      const nodeType = node.data('nodeType')
      const label = node.data('fullName') || node.data('label')
      const childCount = node.data('childCount')
      
      const renderedPos = node.renderedPosition()
      setTooltip({
        x: renderedPos.x,
        y: renderedPos.y,
        name: label,
        type: nodeType,
        childCount,
      })

      // Highlight effect
      node.style({
        'border-width': 3,
        'border-color': colors.hoverBorder,
        'border-opacity': 1,
      })
    })

    cy.on('mouseout', 'node', (evt) => {
      const node = evt.target
      setTooltip(null)
      
      // Reset style unless selected or collapsed
      if (!node.selected() && !node.hasClass('collapsed')) {
        node.style({
          'border-width': 0,
        })
      }
    })

    // Fit to view
    cy.fit(undefined, 60)

    return () => {
      cy.destroy()
    }
  }, [graphData, colors, onNodeSelect, getIconUrl, toggleCollapse])

  // Handle collapse/expand visibility
  useEffect(() => {
    const cy = cyRef.current
    if (!cy || cy.destroyed()) return

    try {
      // First, show all nodes and edges
      cy.nodes().removeClass('hidden collapsed')
      cy.edges().removeClass('hidden')

      // For each collapsed node, hide its descendants
      collapsedNodes.forEach(collapsedId => {
        const node = cy.getElementById(collapsedId)
        if (node.length > 0) {
          node.addClass('collapsed')
          
          // Hide all descendants
          const descendants = getDescendants(collapsedId)
          descendants.forEach(descId => {
            cy.getElementById(descId).addClass('hidden')
          })
          
          // Hide edges to/from hidden nodes
          cy.edges().forEach(edge => {
            const sourceHidden = cy.getElementById(edge.data('source')).hasClass('hidden')
            const targetHidden = cy.getElementById(edge.data('target')).hasClass('hidden')
            if (sourceHidden || targetHidden) {
              edge.addClass('hidden')
            }
          })
        }
      })

      // Re-run layout after visibility changes (with animation) only if collapsed nodes changed
      if (collapsedNodes.size > 0) {
        cy.layout({
          name: 'cose',
          animate: true,
          animationDuration: 300,
          padding: 60,
          fit: false,
        }).run()
      }
    } catch (e) {
      console.warn('Collapse effect error:', e)
    }
  }, [collapsedNodes, getDescendants])

  // Update selected node styling
  useEffect(() => {
    const cy = cyRef.current
    if (!cy || cy.destroyed()) return

    try {
      cy.nodes().forEach((node) => {
        if (!node.hasClass('collapsed') && node.id() !== selectedNodeId) {
          node.style({ 'border-width': 0 })
        }
      })

      if (selectedNodeId) {
        const selectedNode = cy.getElementById(selectedNodeId)
        if (selectedNode.length > 0) {
          selectedNode.style({
            'border-width': 3,
            'border-color': colors.selectedBorder,
          })
        }
      }
    } catch (e) {
      console.warn('Selection effect error:', e)
    }
  }, [selectedNodeId, colors])

  // Update icons on theme change
  useEffect(() => {
    const cy = cyRef.current
    if (!cy || cy.destroyed()) return

    try {
      if (containerRef.current) {
        containerRef.current.style.backgroundColor = colors.background
      }

      // Update node icons
      const types = ['site', 'building', 'floor', 'room', 'rack', 'device']
      types.forEach(type => {
        cy.nodes(`[type="${type}"]`).forEach(node => {
          const isCollapsed = collapsedNodes.has(node.id())
          node.style({
            'background-image': getIconUrl(type, isCollapsed),
            'color': colors.text,
            'text-outline-color': colors.background,
          })
        })
      })

      // Update edge colors
      cy.edges().forEach((edge) => {
        edge.style({
          'line-color': colors.edge,
          'target-arrow-color': colors.edge,
        })
      })
    } catch (e) {
      console.warn('Theme effect error:', e)
    }
  }, [colors, getIconUrl, collapsedNodes])

  // Control handlers
  const handleFitView = useCallback(() => {
    const cy = cyRef.current
    if (cy && !cy.destroyed()) cy.fit(undefined, 60)
  }, [])

  const handleZoomIn = useCallback(() => {
    const cy = cyRef.current
    if (!cy || cy.destroyed()) return
    cy.zoom(cy.zoom() * 1.3)
  }, [])

  const handleZoomOut = useCallback(() => {
    const cy = cyRef.current
    if (!cy || cy.destroyed()) return
    cy.zoom(cy.zoom() / 1.3)
  }, [])

  const handleRelayout = useCallback(() => {
    const cy = cyRef.current
    if (!cy || cy.destroyed()) return
    try {
      cy.layout({
        name: 'cose',
        animate: true,
        animationDuration: 500,
        padding: 60,
      }).run()
    } catch (e) {
      console.warn('Relayout error:', e)
    }
  }, [])

  const handleExpandAll = useCallback(() => {
    setCollapsedNodes(new Set())
  }, [])

  const handleCollapseToLevel = useCallback((level: number) => {
    const nodesToCollapse = new Set<string>()
    const levelMap: Record<string, number> = {
      site: 0,
      building: 1,
      floor: 2,
      room: 3,
      rack: 4,
      device: 5,
    }
    
    graphData.nodes.forEach(node => {
      const nodeLevel = levelMap[node.data.type as string] || 0
      if (nodeLevel >= level && node.data.hasChildren) {
        nodesToCollapse.add(node.data.id as string)
      }
    })
    
    setCollapsedNodes(nodesToCollapse)
  }, [graphData.nodes])

  // Show loading state if no valid config
  if (!sceneConfig || 
      !Array.isArray(sceneConfig.rooms) || 
      !Array.isArray(sceneConfig.racks) || 
      !Array.isArray(sceneConfig.devices)) {
    return (
      <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: colors.background }}>
        <div className="text-muted-foreground text-sm">Loading hierarchy graph...</div>
      </div>
    )
  }

  return (
    <div className="w-full h-full relative">
      {/* Graph container */}
      <div 
        ref={containerRef} 
        className="w-full h-full"
        style={{ backgroundColor: colors.background }}
      />

      {/* Legend */}
      <div className="absolute top-4 left-4 z-10 bg-card/90 backdrop-blur rounded-lg p-3 border border-border/50 shadow-lg">
        <div className="text-xs font-medium mb-2 text-muted-foreground">Legend</div>
        <div className="space-y-1.5">
          {(['site', 'building', 'floor', 'room', 'rack', 'device'] as const).map((type) => (
            <div key={type} className="flex items-center gap-2 text-xs">
              <div 
                className="w-4 h-4 rounded"
                style={{ backgroundColor: colors[type] }}
              />
              <span className="capitalize text-foreground">{type}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 pt-2 border-t border-border/50 text-xs text-muted-foreground">
          <span className="font-medium">Double-click</span> to collapse/expand
        </div>
      </div>

      {/* Stats */}
      <div className="absolute top-4 right-4 z-10 bg-card/90 backdrop-blur rounded-lg p-3 border border-border/50 shadow-lg">
        <div className="text-xs font-medium mb-2 text-muted-foreground">Statistics</div>
        <div className="space-y-1 text-xs">
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Buildings:</span>
            <span className="font-medium">{sceneConfig.buildings?.length || 1}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Floors:</span>
            <span className="font-medium">{sceneConfig.floors?.length || 0}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Rooms:</span>
            <span className="font-medium">{sceneConfig.rooms.length}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Racks:</span>
            <span className="font-medium">{sceneConfig.racks.length}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Devices:</span>
            <span className="font-medium">{sceneConfig.devices.length}</span>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="absolute bottom-4 left-4 z-10 flex flex-wrap gap-2">
        <div className="flex gap-1 bg-card/90 backdrop-blur border border-border/50 rounded-lg p-1">
          <button
            onClick={handleZoomIn}
            className="px-2 py-1 text-xs hover:bg-accent rounded transition-colors"
            title="Zoom In"
          >
            +
          </button>
          <button
            onClick={handleZoomOut}
            className="px-2 py-1 text-xs hover:bg-accent rounded transition-colors"
            title="Zoom Out"
          >
            −
          </button>
          <button
            onClick={handleFitView}
            className="px-2 py-1 text-xs hover:bg-accent rounded transition-colors"
            title="Fit View"
          >
            Fit
          </button>
          <button
            onClick={handleRelayout}
            className="px-2 py-1 text-xs hover:bg-accent rounded transition-colors"
            title="Re-layout"
          >
            ↻
          </button>
        </div>
        <div className="flex gap-1 bg-card/90 backdrop-blur border border-border/50 rounded-lg p-1">
          <button
            onClick={handleExpandAll}
            className="px-2 py-1 text-xs hover:bg-accent rounded transition-colors"
            title="Expand All"
          >
            Expand
          </button>
          <button
            onClick={() => handleCollapseToLevel(1)}
            className="px-2 py-1 text-xs hover:bg-accent rounded transition-colors"
            title="Collapse to Buildings"
          >
            Buildings
          </button>
          <button
            onClick={() => handleCollapseToLevel(3)}
            className="px-2 py-1 text-xs hover:bg-accent rounded transition-colors"
            title="Collapse to Rooms"
          >
            Rooms
          </button>
          <button
            onClick={() => handleCollapseToLevel(4)}
            className="px-2 py-1 text-xs hover:bg-accent rounded transition-colors"
            title="Collapse to Racks"
          >
            Racks
          </button>
        </div>
      </div>

      {/* Controls hint */}
      <div className="absolute bottom-4 right-4 z-10 text-xs text-muted-foreground bg-card/80 backdrop-blur rounded px-2 py-1">
        <span className="font-medium">Drag</span> Pan • <span className="font-medium">Scroll</span> Zoom • <span className="font-medium">Click</span> Select • <span className="font-medium">Dbl-Click</span> Collapse
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div 
          className="absolute z-50 px-3 py-2 rounded-lg shadow-lg border text-sm pointer-events-none transform -translate-x-1/2"
          style={{ 
            left: tooltip.x, 
            top: tooltip.y - 70,
            backgroundColor: resolvedTheme === 'light' ? 'rgba(255,255,255,0.95)' : 'rgba(24,24,27,0.95)',
            borderColor: resolvedTheme === 'light' ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)',
            color: resolvedTheme === 'light' ? '#1a1a1a' : '#fafafa'
          }}
        >
          <div className="font-medium">{tooltip.name}</div>
          <div className="text-xs opacity-70 capitalize">{tooltip.type}</div>
          {tooltip.childCount !== undefined && tooltip.childCount > 0 && (
            <div className="text-xs opacity-50 mt-1">{tooltip.childCount} children</div>
          )}
        </div>
      )}
    </div>
  )
}
