"use client"

import { useEffect, useRef, useState, useMemo, useCallback } from "react"
import { useTheme } from "next-themes"
import cytoscape, { Core, NodeSingular } from "cytoscape"
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
    edge: '#d1d5db',
    text: '#1f2937',
    selectedBorder: '#ef4444',
    hoverBorder: '#3b82f6',
  },
  dark: {
    background: '#09090b',
    site: '#818cf8',
    building: '#a78bfa',
    floor: '#c084fc',
    room: '#4ade80',
    rack: '#60a5fa',
    device: '#fbbf24',
    edge: '#3f3f46',
    text: '#fafafa',
    selectedBorder: '#f87171',
    hoverBorder: '#60a5fa',
  },
}

// Node sizes by type
const nodeSizes: Record<string, number> = {
  site: 60,
  building: 50,
  floor: 40,
  room: 35,
  rack: 28,
  device: 22,
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
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)
  const [tooltip, setTooltip] = useState<{ x: number; y: number; name: string; type: string } | null>(null)

  const colors = resolvedTheme === 'light' ? themeColors.light : themeColors.dark

  // Build graph data from sceneConfig
  const graphData = useMemo(() => {
    const nodes: cytoscape.ElementDefinition[] = []
    const edges: cytoscape.ElementDefinition[] = []
    
    // Site node (root)
    const siteId = sceneConfig.siteId || 'site-root'
    nodes.push({
      data: { 
        id: siteId, 
        label: siteName, 
        type: 'site',
        nodeType: 'site'
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
          nodeType: 'building'
        }
      })
      edges.push({
        data: { source: siteId, target: buildingId }
      })
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
          nodeType: 'floor'
        }
      })
      edges.push({
        data: { source: parentBuildingId, target: floor.id }
      })
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
          nodeType: 'room'
        }
      })
      edges.push({
        data: { source: parentId, target: room.id }
      })
    })

    // Racks
    sceneConfig.racks.forEach((rack) => {
      nodes.push({
        data: { 
          id: rack.id, 
          label: rack.name, 
          type: 'rack',
          nodeType: 'rack'
        }
      })
      edges.push({
        data: { source: rack.roomId, target: rack.id }
      })
    })

    // Devices
    sceneConfig.devices.forEach((device) => {
      nodes.push({
        data: { 
          id: device.id, 
          label: device.name.length > 15 ? device.name.substring(0, 12) + '...' : device.name, 
          fullName: device.name,
          type: 'device',
          nodeType: 'device',
          category: device.category,
          status: device.status4D
        }
      })
      edges.push({
        data: { source: device.rackId, target: device.id }
      })
    })

    return { nodes, edges }
  }, [sceneConfig, siteName])

  // Initialize Cytoscape
  useEffect(() => {
    if (!containerRef.current) return

    const cy = cytoscape({
      container: containerRef.current,
      elements: [...graphData.nodes, ...graphData.edges],
      style: [
        // Node styles
        {
          selector: 'node',
          style: {
            'label': 'data(label)',
            'text-valign': 'bottom',
            'text-halign': 'center',
            'text-margin-y': 5,
            'font-size': 10,
            'font-family': 'Inter, system-ui, sans-serif',
            'color': colors.text,
            'text-outline-width': 2,
            'text-outline-color': colors.background,
            'background-color': colors.site,
            'border-width': 2,
            'border-color': colors.site,
          }
        },
        // Type-specific styles
        {
          selector: 'node[type="site"]',
          style: {
            'background-color': colors.site,
            'border-color': colors.site,
            'width': nodeSizes.site,
            'height': nodeSizes.site,
            'font-size': 14,
            'font-weight': 'bold',
          }
        },
        {
          selector: 'node[type="building"]',
          style: {
            'background-color': colors.building,
            'border-color': colors.building,
            'width': nodeSizes.building,
            'height': nodeSizes.building,
            'font-size': 12,
          }
        },
        {
          selector: 'node[type="floor"]',
          style: {
            'background-color': colors.floor,
            'border-color': colors.floor,
            'width': nodeSizes.floor,
            'height': nodeSizes.floor,
            'font-size': 11,
          }
        },
        {
          selector: 'node[type="room"]',
          style: {
            'background-color': colors.room,
            'border-color': colors.room,
            'width': nodeSizes.room,
            'height': nodeSizes.room,
            'font-size': 10,
          }
        },
        {
          selector: 'node[type="rack"]',
          style: {
            'background-color': colors.rack,
            'border-color': colors.rack,
            'width': nodeSizes.rack,
            'height': nodeSizes.rack,
            'font-size': 9,
          }
        },
        {
          selector: 'node[type="device"]',
          style: {
            'background-color': colors.device,
            'border-color': colors.device,
            'width': nodeSizes.device,
            'height': nodeSizes.device,
            'font-size': 8,
          }
        },
        // Selected node
        {
          selector: 'node:selected',
          style: {
            'border-width': 4,
            'border-color': colors.selectedBorder,
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
            'arrow-scale': 0.8,
          }
        },
      ],
      layout: {
        name: 'breadthfirst',
        directed: true,
        padding: 50,
        spacingFactor: 1.5,
        avoidOverlap: true,
        roots: `#${sceneConfig.siteId || 'site-root'}`,
      },
      minZoom: 0.2,
      maxZoom: 3,
      wheelSensitivity: 0.3,
    })

    cyRef.current = cy

    // Event handlers
    cy.on('tap', 'node', (evt) => {
      const node = evt.target
      const nodeType = node.data('nodeType')
      const nodeId = node.id()
      onNodeSelect?.(nodeId, nodeType)
    })

    cy.on('mouseover', 'node', (evt) => {
      const node = evt.target
      const nodeId = node.id()
      const nodeType = node.data('nodeType')
      const label = node.data('fullName') || node.data('label')
      
      setHoveredNode(nodeId)
      
      // Get position for tooltip
      const renderedPos = node.renderedPosition()
      setTooltip({
        x: renderedPos.x,
        y: renderedPos.y,
        name: label,
        type: nodeType,
      })

      // Highlight effect
      node.style({
        'border-width': 4,
        'border-color': colors.hoverBorder,
      })
    })

    cy.on('mouseout', 'node', (evt) => {
      const node = evt.target
      setHoveredNode(null)
      setTooltip(null)
      
      // Reset style
      const nodeType = node.data('type')
      const nodeColor = colors[nodeType as keyof typeof colors] || colors.device
      node.style({
        'border-width': 2,
        'border-color': nodeColor,
      })
    })

    // Fit to view
    cy.fit(undefined, 50)

    return () => {
      cy.destroy()
    }
  }, [graphData, colors, onNodeSelect])

  // Update selected node
  useEffect(() => {
    if (!cyRef.current) return
    const cy = cyRef.current

    // Clear previous selection styling
    cy.nodes().forEach((node) => {
      const nodeType = node.data('type')
      const nodeColor = colors[nodeType as keyof typeof colors] || colors.device
      node.style({
        'border-width': 2,
        'border-color': nodeColor,
      })
    })

    // Apply selection styling
    if (selectedNodeId) {
      const selectedNode = cy.getElementById(selectedNodeId)
      if (selectedNode.length > 0) {
        selectedNode.style({
          'border-width': 4,
          'border-color': colors.selectedBorder,
        })
      }
    }
  }, [selectedNodeId, colors])

  // Update colors on theme change
  useEffect(() => {
    if (!cyRef.current) return
    const cy = cyRef.current

    // Update background
    if (containerRef.current) {
      containerRef.current.style.backgroundColor = colors.background
    }

    // Update node colors
    cy.nodes().forEach((node) => {
      const nodeType = node.data('type')
      const nodeColor = colors[nodeType as keyof typeof colors] || colors.device
      node.style({
        'background-color': nodeColor,
        'border-color': nodeColor,
        'color': colors.text,
        'text-outline-color': colors.background,
      })
    })

    // Update edge colors
    cy.edges().forEach((edge) => {
      edge.style({
        'line-color': colors.edge,
        'target-arrow-color': colors.edge,
      })
    })
  }, [colors])

  // Handle fit view
  const handleFitView = useCallback(() => {
    cyRef.current?.fit(undefined, 50)
  }, [])

  // Handle zoom
  const handleZoomIn = useCallback(() => {
    if (!cyRef.current) return
    cyRef.current.zoom(cyRef.current.zoom() * 1.2)
  }, [])

  const handleZoomOut = useCallback(() => {
    if (!cyRef.current) return
    cyRef.current.zoom(cyRef.current.zoom() / 1.2)
  }, [])

  // Re-layout
  const handleRelayout = useCallback(() => {
    if (!cyRef.current) return
    cyRef.current.layout({
      name: 'breadthfirst',
      directed: true,
      padding: 50,
      spacingFactor: 1.5,
      avoidOverlap: true,
      roots: `#${sceneConfig.siteId || 'site-root'}`,
      animate: true,
      animationDuration: 500,
    }).run()
  }, [sceneConfig.siteId])

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
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: colors[type] }}
              />
              <span className="capitalize text-foreground">{type}</span>
            </div>
          ))}
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
      <div className="absolute bottom-4 left-4 z-10 flex gap-2">
        <button
          onClick={handleZoomIn}
          className="px-3 py-1.5 text-xs bg-card/90 backdrop-blur border border-border/50 rounded-lg hover:bg-accent transition-colors"
        >
          Zoom +
        </button>
        <button
          onClick={handleZoomOut}
          className="px-3 py-1.5 text-xs bg-card/90 backdrop-blur border border-border/50 rounded-lg hover:bg-accent transition-colors"
        >
          Zoom -
        </button>
        <button
          onClick={handleFitView}
          className="px-3 py-1.5 text-xs bg-card/90 backdrop-blur border border-border/50 rounded-lg hover:bg-accent transition-colors"
        >
          Fit
        </button>
        <button
          onClick={handleRelayout}
          className="px-3 py-1.5 text-xs bg-card/90 backdrop-blur border border-border/50 rounded-lg hover:bg-accent transition-colors"
        >
          Re-layout
        </button>
      </div>

      {/* Controls hint */}
      <div className="absolute bottom-4 right-4 z-10 text-xs text-muted-foreground bg-card/80 backdrop-blur rounded px-2 py-1">
        <span className="font-medium">Drag</span> Pan • <span className="font-medium">Scroll</span> Zoom • <span className="font-medium">Click</span> Select
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div 
          className="absolute z-50 px-3 py-2 rounded-lg shadow-lg border text-sm pointer-events-none transform -translate-x-1/2"
          style={{ 
            left: tooltip.x, 
            top: tooltip.y - 60,
            backgroundColor: resolvedTheme === 'light' ? 'rgba(255,255,255,0.95)' : 'rgba(24,24,27,0.95)',
            borderColor: resolvedTheme === 'light' ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)',
            color: resolvedTheme === 'light' ? '#1a1a1a' : '#fafafa'
          }}
        >
          <div className="font-medium">{tooltip.name}</div>
          <div className="text-xs opacity-70 capitalize">{tooltip.type}</div>
        </div>
      )}
    </div>
  )
}
