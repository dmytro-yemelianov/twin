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

// Node emojis by type
const nodeEmojis: Record<string, string> = {
  site: '🌐',
  building: '🏢',
  floor: '🏗️',
  room: '🚪',
  rack: '🗄️',
  device: '💻',
}

// Theme colors
const themeColors = {
  light: {
    background: '#f8fafc',
    site: '#6366f1',
    building: '#8b5cf6',
    floor: '#a855f7',
    room: '#22c55e',
    rack: '#3b82f6',
    device: '#f59e0b',
    edge: '#94a3b8',
    text: '#1e293b',
    selectedBorder: '#ef4444',
    hoverBorder: '#0ea5e9',
  },
  dark: {
    background: '#0f172a',
    site: '#818cf8',
    building: '#a78bfa',
    floor: '#c084fc',
    room: '#4ade80',
    rack: '#60a5fa',
    device: '#fbbf24',
    edge: '#475569',
    text: '#f1f5f9',
    selectedBorder: '#f87171',
    hoverBorder: '#38bdf8',
  },
}

// Node sizes by type
const nodeSizes: Record<string, number> = {
  site: 70,
  building: 60,
  floor: 50,
  room: 45,
  rack: 40,
  device: 35,
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

    // Site node (root)
    const siteId = 'site-root'
    nodes.push({
      data: { 
        id: siteId, 
        label: siteName,
        emoji: nodeEmojis.site,
        type: 'site',
        nodeType: 'site',
        hasChildren: true,
      }
    })

    // Buildings
    const buildings = sceneConfig.buildings || [{ id: 'building-default', name: 'Building' }]
    buildings.forEach((building) => {
      const buildingId = building.id || `building-${buildings.indexOf(building)}`
      nodes.push({
        data: { 
          id: buildingId, 
          label: building.name || 'Building',
          emoji: nodeEmojis.building,
          type: 'building',
          nodeType: 'building',
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
          emoji: nodeEmojis.floor,
          type: 'floor',
          nodeType: 'floor',
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
          emoji: nodeEmojis.room,
          type: 'room',
          nodeType: 'room',
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
          emoji: nodeEmojis.rack,
          type: 'rack',
          nodeType: 'rack',
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
          label: device.name.length > 15 ? device.name.substring(0, 12) + '...' : device.name,
          fullName: device.name,
          emoji: nodeEmojis.device,
          type: 'device',
          nodeType: 'device',
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
        // Base node style - emoji as content
        {
          selector: 'node',
          style: {
            'content': 'data(emoji)',
            'text-valign': 'center',
            'text-halign': 'center',
            'font-size': 24,
            'width': 50,
            'height': 50,
            'background-color': 'transparent',
            'border-width': 0,
            'text-outline-width': 0,
          }
        },
        // Type-specific sizes
        {
          selector: 'node[type="site"]',
          style: {
            'font-size': 36,
            'width': nodeSizes.site,
            'height': nodeSizes.site,
          }
        },
        {
          selector: 'node[type="building"]',
          style: {
            'font-size': 32,
            'width': nodeSizes.building,
            'height': nodeSizes.building,
          }
        },
        {
          selector: 'node[type="floor"]',
          style: {
            'font-size': 28,
            'width': nodeSizes.floor,
            'height': nodeSizes.floor,
          }
        },
        {
          selector: 'node[type="room"]',
          style: {
            'font-size': 26,
            'width': nodeSizes.room,
            'height': nodeSizes.room,
          }
        },
        {
          selector: 'node[type="rack"]',
          style: {
            'font-size': 24,
            'width': nodeSizes.rack,
            'height': nodeSizes.rack,
          }
        },
        {
          selector: 'node[type="device"]',
          style: {
            'font-size': 20,
            'width': nodeSizes.device,
            'height': nodeSizes.device,
          }
        },
        // Hover effect - add colored circle background
        {
          selector: 'node:active, node:grabbed',
          style: {
            'background-color': colors.hoverBorder,
            'background-opacity': 0.3,
          }
        },
        // Selected node
        {
          selector: 'node:selected',
          style: {
            'background-color': colors.selectedBorder,
            'background-opacity': 0.3,
            'border-width': 3,
            'border-color': colors.selectedBorder,
          }
        },
        // Collapsed node style - add indicator
        {
          selector: 'node.collapsed',
          style: {
            'border-width': 3,
            'border-color': colors.device,
            'border-style': 'dashed',
            'background-color': colors.device,
            'background-opacity': 0.15,
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
            'width': 2,
            'line-color': colors.edge,
            'target-arrow-color': colors.edge,
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            'arrow-scale': 0.8,
            'opacity': 0.7,
          }
        },
      ],
      layout: {
        name: 'cose',
        animate: false,
        padding: 80,
        nodeRepulsion: () => 8000,
        idealEdgeLength: () => 80,
        edgeElasticity: () => 100,
        nestingFactor: 1.2,
        gravity: 0.25,
        numIter: 1000,
        coolingFactor: 0.95,
        minTemp: 1.0,
      },
      minZoom: 0.1,
      maxZoom: 4,
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

      // Highlight - add subtle background
      const typeColor = colors[nodeType as keyof typeof colors] || colors.device
      node.style({
        'background-color': typeColor,
        'background-opacity': 0.25,
      })
    })

    cy.on('mouseout', 'node', (evt) => {
      const node = evt.target
      setTooltip(null)
      
      // Reset style unless selected or collapsed
      if (!node.selected() && !node.hasClass('collapsed')) {
        node.style({
          'background-color': 'transparent',
          'background-opacity': 0,
        })
      }
    })

    // Fit to view after layout
    cy.one('layoutstop', () => {
      cy.fit(undefined, 80)
    })

    return () => {
      cy.destroy()
    }
  }, [graphData, colors, onNodeSelect, toggleCollapse])

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

      // Re-run layout if there are collapsed nodes
      if (collapsedNodes.size > 0) {
        cy.layout({
          name: 'cose',
          animate: true,
          animationDuration: 400,
          padding: 80,
          nodeRepulsion: () => 8000,
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
      // Clear previous selections visually
      cy.nodes().forEach((node) => {
        if (!node.hasClass('collapsed') && node.id() !== selectedNodeId) {
          node.style({ 
            'background-color': 'transparent',
            'background-opacity': 0,
            'border-width': 0 
          })
        }
      })

      if (selectedNodeId) {
        const selectedNode = cy.getElementById(selectedNodeId)
        if (selectedNode.length > 0) {
          selectedNode.style({
            'background-color': colors.selectedBorder,
            'background-opacity': 0.3,
            'border-width': 3,
            'border-color': colors.selectedBorder,
          })
        }
      }
    } catch (e) {
      console.warn('Selection effect error:', e)
    }
  }, [selectedNodeId, colors])

  // Update on theme change
  useEffect(() => {
    const cy = cyRef.current
    if (!cy || cy.destroyed()) return

    try {
      if (containerRef.current) {
        containerRef.current.style.backgroundColor = colors.background
      }

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
  }, [colors])

  // Control handlers
  const handleFitView = useCallback(() => {
    const cy = cyRef.current
    if (cy && !cy.destroyed()) cy.fit(undefined, 80)
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
        animationDuration: 600,
        padding: 80,
        nodeRepulsion: () => 8000,
        idealEdgeLength: () => 80,
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
      <div className="absolute top-4 left-4 z-10 bg-card/95 backdrop-blur-sm rounded-xl p-4 border border-border/50 shadow-xl">
        <div className="text-xs font-semibold mb-3 text-muted-foreground uppercase tracking-wide">Legend</div>
        <div className="space-y-2">
          {Object.entries(nodeEmojis).map(([type, emoji]) => (
            <div key={type} className="flex items-center gap-3 text-sm">
              <span className="text-lg">{emoji}</span>
              <span className="capitalize text-foreground">{type}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-3 border-t border-border/50 text-xs text-muted-foreground">
          <span className="font-medium">Double-click</span> to collapse/expand
        </div>
      </div>

      {/* Stats */}
      <div className="absolute top-4 right-4 z-10 bg-card/95 backdrop-blur-sm rounded-xl p-4 border border-border/50 shadow-xl">
        <div className="text-xs font-semibold mb-3 text-muted-foreground uppercase tracking-wide">Statistics</div>
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between gap-6">
            <span className="text-muted-foreground">Buildings</span>
            <span className="font-semibold tabular-nums">{sceneConfig.buildings?.length || 1}</span>
          </div>
          <div className="flex justify-between gap-6">
            <span className="text-muted-foreground">Floors</span>
            <span className="font-semibold tabular-nums">{sceneConfig.floors?.length || 0}</span>
          </div>
          <div className="flex justify-between gap-6">
            <span className="text-muted-foreground">Rooms</span>
            <span className="font-semibold tabular-nums">{sceneConfig.rooms.length}</span>
          </div>
          <div className="flex justify-between gap-6">
            <span className="text-muted-foreground">Racks</span>
            <span className="font-semibold tabular-nums">{sceneConfig.racks.length}</span>
          </div>
          <div className="flex justify-between gap-6">
            <span className="text-muted-foreground">Devices</span>
            <span className="font-semibold tabular-nums">{sceneConfig.devices.length}</span>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="absolute bottom-4 left-4 z-10 flex flex-wrap gap-2">
        <div className="flex gap-1 bg-card/95 backdrop-blur-sm border border-border/50 rounded-xl p-1.5 shadow-lg">
          <button
            onClick={handleZoomIn}
            className="w-8 h-8 flex items-center justify-center text-sm hover:bg-accent rounded-lg transition-colors"
            title="Zoom In"
          >
            +
          </button>
          <button
            onClick={handleZoomOut}
            className="w-8 h-8 flex items-center justify-center text-sm hover:bg-accent rounded-lg transition-colors"
            title="Zoom Out"
          >
            −
          </button>
          <button
            onClick={handleFitView}
            className="px-3 h-8 flex items-center justify-center text-xs hover:bg-accent rounded-lg transition-colors"
            title="Fit View"
          >
            Fit
          </button>
          <button
            onClick={handleRelayout}
            className="w-8 h-8 flex items-center justify-center text-sm hover:bg-accent rounded-lg transition-colors"
            title="Re-layout"
          >
            ↻
          </button>
        </div>
        <div className="flex gap-1 bg-card/95 backdrop-blur-sm border border-border/50 rounded-xl p-1.5 shadow-lg">
          <button
            onClick={handleExpandAll}
            className="px-3 h-8 flex items-center justify-center text-xs hover:bg-accent rounded-lg transition-colors"
            title="Expand All"
          >
            Expand
          </button>
          <button
            onClick={() => handleCollapseToLevel(1)}
            className="px-3 h-8 flex items-center justify-center text-xs hover:bg-accent rounded-lg transition-colors"
            title="Collapse to Buildings"
          >
            🏢
          </button>
          <button
            onClick={() => handleCollapseToLevel(3)}
            className="px-3 h-8 flex items-center justify-center text-xs hover:bg-accent rounded-lg transition-colors"
            title="Collapse to Rooms"
          >
            🚪
          </button>
          <button
            onClick={() => handleCollapseToLevel(4)}
            className="px-3 h-8 flex items-center justify-center text-xs hover:bg-accent rounded-lg transition-colors"
            title="Collapse to Racks"
          >
            🗄️
          </button>
        </div>
      </div>

      {/* Controls hint */}
      <div className="absolute bottom-4 right-4 z-10 text-xs text-muted-foreground bg-card/80 backdrop-blur-sm rounded-lg px-3 py-1.5 shadow">
        <span className="font-medium">Drag</span> Pan • <span className="font-medium">Scroll</span> Zoom • <span className="font-medium">Click</span> Select
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div 
          className="absolute z-50 px-4 py-2.5 rounded-xl shadow-xl border pointer-events-none transform -translate-x-1/2"
          style={{ 
            left: tooltip.x, 
            top: tooltip.y - 75,
            backgroundColor: resolvedTheme === 'light' ? 'rgba(255,255,255,0.98)' : 'rgba(15,23,42,0.98)',
            borderColor: resolvedTheme === 'light' ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)',
            color: resolvedTheme === 'light' ? '#1e293b' : '#f1f5f9'
          }}
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">{nodeEmojis[tooltip.type] || '📦'}</span>
            <div>
              <div className="font-semibold">{tooltip.name}</div>
              <div className="text-xs opacity-60 capitalize">{tooltip.type}</div>
            </div>
          </div>
          {tooltip.childCount !== undefined && tooltip.childCount > 0 && (
            <div className="text-xs opacity-50 mt-1 pt-1 border-t border-current/10">
              {tooltip.childCount} {tooltip.childCount === 1 ? 'child' : 'children'}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
