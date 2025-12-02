"use client"

import { useEffect, useRef, useState, useMemo, useCallback } from "react"
import { useTheme } from "next-themes"
import * as THREE from "three"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js"
import type { SceneConfig } from "@/lib/types"

interface HierarchyNode {
  id: string
  name: string
  type: 'site' | 'building' | 'floor' | 'room' | 'rack' | 'device'
  parentId: string | null
  children: string[]
  x: number
  y: number
  z: number
  color: number
  data?: any
}

interface HierarchyGraphProps {
  sceneConfig: SceneConfig
  siteName?: string
  onNodeSelect?: (nodeId: string, nodeType: string) => void
  selectedNodeId?: string | null
}

// Theme colors
const themeColors = {
  light: {
    background: 0xf8f9fa,
    site: 0x6366f1,      // Indigo
    building: 0x8b5cf6,  // Violet
    floor: 0xa855f7,     // Purple
    room: 0x22c55e,      // Green
    rack: 0x3b82f6,      // Blue
    device: 0xf59e0b,    // Amber
    line: 0xd1d5db,
    text: 0x1f2937,
    selectedRing: 0xef4444,
  },
  dark: {
    background: 0x09090b,
    site: 0x818cf8,      // Indigo light
    building: 0xa78bfa,  // Violet light
    floor: 0xc084fc,     // Purple light
    room: 0x4ade80,      // Green light
    rack: 0x60a5fa,      // Blue light
    device: 0xfbbf24,    // Amber light
    line: 0x3f3f46,
    text: 0xfafafa,
    selectedRing: 0xf87171,
  },
}

// Node sizes by type
const nodeSizes = {
  site: 1.2,
  building: 1.0,
  floor: 0.8,
  room: 0.6,
  rack: 0.4,
  device: 0.25,
}

// Layer depths (Z positions)
const layerDepths = {
  site: 0,
  building: -2,
  floor: -4,
  room: -6,
  rack: -8,
  device: -10,
}

export function HierarchyGraph({ 
  sceneConfig, 
  siteName = "Site",
  onNodeSelect,
  selectedNodeId 
}: HierarchyGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)
  const nodesRef = useRef<Map<string, THREE.Group>>(new Map())
  const linesRef = useRef<THREE.Group | null>(null)
  const raycasterRef = useRef(new THREE.Raycaster())
  const mouseRef = useRef(new THREE.Vector2())
  const { resolvedTheme } = useTheme()
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)
  const [tooltip, setTooltip] = useState<{ x: number; y: number; name: string; type: string } | null>(null)

  // Build hierarchy data from sceneConfig
  const hierarchyData = useMemo(() => {
    const nodes = new Map<string, HierarchyNode>()
    
    // Site node (root)
    const siteId = sceneConfig.siteId || 'site-root'
    nodes.set(siteId, {
      id: siteId,
      name: siteName,
      type: 'site',
      parentId: null,
      children: [],
      x: 0,
      y: 0,
      z: layerDepths.site,
      color: 0,
    })

    // Buildings
    const buildings = sceneConfig.buildings || [{ id: 'building-default', name: 'Building', siteId }]
    buildings.forEach((building, idx) => {
      const buildingId = building.id || `building-${idx}`
      nodes.set(buildingId, {
        id: buildingId,
        name: building.name || `Building ${idx + 1}`,
        type: 'building',
        parentId: siteId,
        children: [],
        x: 0,
        y: 0,
        z: layerDepths.building,
        color: 0,
        data: building,
      })
      nodes.get(siteId)!.children.push(buildingId)
    })

    // Floors
    const floors = sceneConfig.floors || []
    if (floors.length > 0) {
      floors.forEach((floor, idx) => {
        const floorId = floor.id
        const parentBuildingId = floor.buildingId || buildings[0]?.id || 'building-default'
        nodes.set(floorId, {
          id: floorId,
          name: floor.name,
          type: 'floor',
          parentId: parentBuildingId,
          children: [],
          x: 0,
          y: 0,
          z: layerDepths.floor,
          color: 0,
          data: floor,
        })
        const parent = nodes.get(parentBuildingId)
        if (parent) parent.children.push(floorId)
      })
    }

    // Rooms
    sceneConfig.rooms.forEach((room, idx) => {
      const roomId = room.id
      // Parent is floor if exists, otherwise building
      let parentId = room.floorId
      if (!parentId || !nodes.has(parentId)) {
        parentId = buildings[0]?.id || 'building-default'
      }
      nodes.set(roomId, {
        id: roomId,
        name: room.name,
        type: 'room',
        parentId,
        children: [],
        x: 0,
        y: 0,
        z: layerDepths.room,
        color: 0,
        data: room,
      })
      const parent = nodes.get(parentId)
      if (parent) parent.children.push(roomId)
    })

    // Racks
    sceneConfig.racks.forEach((rack) => {
      const rackId = rack.id
      const parentId = rack.roomId
      nodes.set(rackId, {
        id: rackId,
        name: rack.name,
        type: 'rack',
        parentId,
        children: [],
        x: 0,
        y: 0,
        z: layerDepths.rack,
        color: 0,
        data: rack,
      })
      const parent = nodes.get(parentId)
      if (parent) parent.children.push(rackId)
    })

    // Devices
    sceneConfig.devices.forEach((device) => {
      const deviceId = device.id
      const parentId = device.rackId
      nodes.set(deviceId, {
        id: deviceId,
        name: device.name,
        type: 'device',
        parentId,
        children: [],
        x: 0,
        y: 0,
        z: layerDepths.device,
        color: 0,
        data: device,
      })
      const parent = nodes.get(parentId)
      if (parent) parent.children.push(deviceId)
    })

    // Calculate positions using tree layout
    const calculatePositions = (nodeId: string, xOffset: number, level: number): number => {
      const node = nodes.get(nodeId)
      if (!node) return xOffset

      const children = node.children
      if (children.length === 0) {
        node.x = xOffset
        node.y = -level * 3
        return xOffset + 2
      }

      let currentX = xOffset
      children.forEach((childId) => {
        currentX = calculatePositions(childId, currentX, level + 1)
      })

      // Center parent above children
      const firstChild = nodes.get(children[0])
      const lastChild = nodes.get(children[children.length - 1])
      if (firstChild && lastChild) {
        node.x = (firstChild.x + lastChild.x) / 2
      } else {
        node.x = xOffset
      }
      node.y = -level * 3

      return currentX
    }

    calculatePositions(siteId, 0, 0)

    return nodes
  }, [sceneConfig, siteName])

  // Initialize Three.js scene
  useEffect(() => {
    if (!containerRef.current) return

    const container = containerRef.current
    const width = container.clientWidth
    const height = container.clientHeight

    // Scene
    const scene = new THREE.Scene()
    const colors = resolvedTheme === 'light' ? themeColors.light : themeColors.dark
    scene.background = new THREE.Color(colors.background)
    sceneRef.current = scene

    // Camera - orthographic for cleaner graph view
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000)
    camera.position.set(0, 0, 30)
    cameraRef.current = camera

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    container.appendChild(renderer.domElement)
    rendererRef.current = renderer

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    controls.enableRotate = true
    controls.enablePan = true
    controls.enableZoom = true
    controls.maxDistance = 100
    controls.minDistance = 5
    controlsRef.current = controls

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8)
    scene.add(ambientLight)

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5)
    directionalLight.position.set(10, 10, 10)
    scene.add(directionalLight)

    // Animation loop
    let animationId: number
    const animate = () => {
      animationId = requestAnimationFrame(animate)
      controls.update()
      renderer.render(scene, camera)
    }
    animate()

    // Handle resize
    const handleResize = () => {
      if (!container || !camera || !renderer) return
      const width = container.clientWidth
      const height = container.clientHeight
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      renderer.setSize(width, height)
    }
    const resizeObserver = new ResizeObserver(handleResize)
    resizeObserver.observe(container)

    // Handle click
    const handleClick = (event: MouseEvent) => {
      if (!container || !camera || !scene) return

      const rect = container.getBoundingClientRect()
      mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

      raycasterRef.current.setFromCamera(mouseRef.current, camera)
      
      const meshes: THREE.Object3D[] = []
      nodesRef.current.forEach((group) => {
        group.traverse((obj) => {
          if (obj instanceof THREE.Mesh) meshes.push(obj)
        })
      })
      
      const intersects = raycasterRef.current.intersectObjects(meshes, false)
      
      if (intersects.length > 0) {
        let current: THREE.Object3D | null = intersects[0].object
        while (current) {
          if (current.userData.nodeId && current.userData.nodeType) {
            onNodeSelect?.(current.userData.nodeId, current.userData.nodeType)
            return
          }
          current = current.parent
        }
      }
    }
    container.addEventListener('click', handleClick)

    // Handle mouse move for hover
    const handleMouseMove = (event: MouseEvent) => {
      if (!container || !camera || !scene) return

      const rect = container.getBoundingClientRect()
      mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

      raycasterRef.current.setFromCamera(mouseRef.current, camera)
      
      const meshes: THREE.Object3D[] = []
      nodesRef.current.forEach((group) => {
        group.traverse((obj) => {
          if (obj instanceof THREE.Mesh) meshes.push(obj)
        })
      })
      
      const intersects = raycasterRef.current.intersectObjects(meshes, false)
      
      if (intersects.length > 0) {
        let current: THREE.Object3D | null = intersects[0].object
        while (current) {
          if (current.userData.nodeId) {
            const node = hierarchyData.get(current.userData.nodeId)
            if (node) {
              setHoveredNode(current.userData.nodeId)
              setTooltip({
                x: event.clientX - rect.left,
                y: event.clientY - rect.top,
                name: node.name,
                type: node.type,
              })
            }
            return
          }
          current = current.parent
        }
      }
      setHoveredNode(null)
      setTooltip(null)
    }
    container.addEventListener('mousemove', handleMouseMove)

    return () => {
      cancelAnimationFrame(animationId)
      resizeObserver.disconnect()
      container.removeEventListener('click', handleClick)
      container.removeEventListener('mousemove', handleMouseMove)
      controls.dispose()
      renderer.dispose()
      container.removeChild(renderer.domElement)
    }
  }, [onNodeSelect, hierarchyData])

  // Build graph nodes and connections
  useEffect(() => {
    if (!sceneRef.current) return

    const scene = sceneRef.current
    const colors = resolvedTheme === 'light' ? themeColors.light : themeColors.dark

    // Clear previous nodes
    nodesRef.current.forEach((group) => {
      scene.remove(group)
      group.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose()
          if (Array.isArray(obj.material)) {
            obj.material.forEach(m => m.dispose())
          } else {
            obj.material.dispose()
          }
        }
      })
    })
    nodesRef.current.clear()

    // Clear previous lines
    if (linesRef.current) {
      scene.remove(linesRef.current)
      linesRef.current.traverse((obj) => {
        if ((obj as any).geometry) (obj as any).geometry.dispose()
        if ((obj as any).material) (obj as any).material.dispose()
      })
    }

    // Create lines group
    const linesGroup = new THREE.Group()
    linesRef.current = linesGroup
    scene.add(linesGroup)

    // Create nodes and connections
    hierarchyData.forEach((node, nodeId) => {
      const nodeGroup = new THREE.Group()
      nodeGroup.userData.nodeId = nodeId
      nodeGroup.userData.nodeType = node.type

      // Node sphere
      const size = nodeSizes[node.type]
      const geometry = new THREE.SphereGeometry(size, 32, 24)
      const color = colors[node.type]
      const material = new THREE.MeshPhongMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.2,
        shininess: 50,
      })
      const sphere = new THREE.Mesh(geometry, material)
      sphere.userData.nodeId = nodeId
      sphere.userData.nodeType = node.type
      nodeGroup.add(sphere)

      // Selection ring for selected node
      if (selectedNodeId === nodeId) {
        const ringGeometry = new THREE.RingGeometry(size + 0.15, size + 0.3, 32)
        const ringMaterial = new THREE.MeshBasicMaterial({
          color: colors.selectedRing,
          side: THREE.DoubleSide,
        })
        const ring = new THREE.Mesh(ringGeometry, ringMaterial)
        nodeGroup.add(ring)
      }

      // Hover ring
      if (hoveredNode === nodeId && selectedNodeId !== nodeId) {
        const ringGeometry = new THREE.RingGeometry(size + 0.1, size + 0.2, 32)
        const ringMaterial = new THREE.MeshBasicMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0.5,
          side: THREE.DoubleSide,
        })
        const ring = new THREE.Mesh(ringGeometry, ringMaterial)
        nodeGroup.add(ring)
      }

      // Text label
      const canvas = document.createElement('canvas')
      const context = canvas.getContext('2d')!
      canvas.width = 256
      canvas.height = 64
      context.fillStyle = 'transparent'
      context.fillRect(0, 0, canvas.width, canvas.height)
      context.font = 'bold 24px Inter, system-ui, sans-serif'
      context.textAlign = 'center'
      context.textBaseline = 'middle'
      context.fillStyle = resolvedTheme === 'light' ? '#374151' : '#e5e7eb'
      
      // Truncate long names
      let displayName = node.name
      if (displayName.length > 15) {
        displayName = displayName.substring(0, 12) + '...'
      }
      context.fillText(displayName, canvas.width / 2, canvas.height / 2)

      const texture = new THREE.CanvasTexture(canvas)
      const labelMaterial = new THREE.SpriteMaterial({ map: texture, transparent: true })
      const label = new THREE.Sprite(labelMaterial)
      label.scale.set(3, 0.75, 1)
      label.position.y = -size - 0.7
      nodeGroup.add(label)

      // Type indicator (small text above)
      const typeCanvas = document.createElement('canvas')
      const typeContext = typeCanvas.getContext('2d')!
      typeCanvas.width = 128
      typeCanvas.height = 32
      typeContext.fillStyle = 'transparent'
      typeContext.fillRect(0, 0, typeCanvas.width, typeCanvas.height)
      typeContext.font = '16px Inter, system-ui, sans-serif'
      typeContext.textAlign = 'center'
      typeContext.textBaseline = 'middle'
      typeContext.fillStyle = resolvedTheme === 'light' ? '#9ca3af' : '#6b7280'
      typeContext.fillText(node.type.toUpperCase(), typeCanvas.width / 2, typeCanvas.height / 2)

      const typeTexture = new THREE.CanvasTexture(typeCanvas)
      const typeMaterial = new THREE.SpriteMaterial({ map: typeTexture, transparent: true })
      const typeLabel = new THREE.Sprite(typeMaterial)
      typeLabel.scale.set(1.5, 0.4, 1)
      typeLabel.position.y = size + 0.5
      nodeGroup.add(typeLabel)

      nodeGroup.position.set(node.x, node.y, node.z)
      scene.add(nodeGroup)
      nodesRef.current.set(nodeId, nodeGroup)

      // Draw connection to parent
      if (node.parentId) {
        const parentNode = hierarchyData.get(node.parentId)
        if (parentNode) {
          const points = [
            new THREE.Vector3(parentNode.x, parentNode.y, parentNode.z),
            new THREE.Vector3(node.x, node.y, node.z),
          ]
          const lineGeometry = new THREE.BufferGeometry().setFromPoints(points)
          const lineMaterial = new THREE.LineBasicMaterial({
            color: colors.line,
            transparent: true,
            opacity: 0.6,
          })
          const line = new THREE.Line(lineGeometry, lineMaterial)
          linesGroup.add(line)
        }
      }
    })

    // Center camera on graph
    if (cameraRef.current && controlsRef.current) {
      const box = new THREE.Box3()
      hierarchyData.forEach((node) => {
        box.expandByPoint(new THREE.Vector3(node.x, node.y, node.z))
      })
      const center = box.getCenter(new THREE.Vector3())
      const size = box.getSize(new THREE.Vector3())
      
      controlsRef.current.target.copy(center)
      cameraRef.current.position.set(center.x, center.y, Math.max(size.x, size.y, 30))
      controlsRef.current.update()
    }
  }, [hierarchyData, selectedNodeId, hoveredNode, resolvedTheme])

  // Update background on theme change
  useEffect(() => {
    if (!sceneRef.current) return
    const colors = resolvedTheme === 'light' ? themeColors.light : themeColors.dark
    sceneRef.current.background = new THREE.Color(colors.background)
  }, [resolvedTheme])

  return (
    <div ref={containerRef} className="w-full h-full relative">
      {/* Legend */}
      <div className="absolute top-4 left-4 z-10 bg-card/90 backdrop-blur rounded-lg p-3 border border-border/50 shadow-lg">
        <div className="text-xs font-medium mb-2 text-muted-foreground">Legend</div>
        <div className="space-y-1.5">
          {(['site', 'building', 'floor', 'room', 'rack', 'device'] as const).map((type) => {
            const colors = resolvedTheme === 'light' ? themeColors.light : themeColors.dark
            return (
              <div key={type} className="flex items-center gap-2 text-xs">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: `#${colors[type].toString(16).padStart(6, '0')}` }}
                />
                <span className="capitalize text-foreground">{type}</span>
              </div>
            )
          })}
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

      {/* Controls hint */}
      <div className="absolute bottom-4 left-4 z-10 text-xs text-muted-foreground bg-card/80 backdrop-blur rounded px-2 py-1">
        <span className="font-medium">LMB</span> Rotate • <span className="font-medium">RMB</span> Pan • <span className="font-medium">Scroll</span> Zoom • <span className="font-medium">Click</span> Select
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div 
          className="absolute z-50 px-3 py-2 rounded-lg shadow-lg border text-sm pointer-events-none"
          style={{ 
            left: tooltip.x + 12, 
            top: tooltip.y + 12,
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

