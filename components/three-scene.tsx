"use client"

import { useEffect, useRef, useState } from "react"
import { useTheme } from "next-themes"
import * as THREE from "three"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js"
import { ViewHelper } from "three/examples/jsm/helpers/ViewHelper.js"
import type { SceneConfig, DeviceType, Status4D, ColorMode } from "@/lib/types"
import {
  buildScene,
  updateDeviceVisibility,
  updateDeviceColor,
  highlightDevice,
  highlightRacks,
  focusCameraOnRack,
  updateBuildingTransparency,
  highlightRack,
  type SceneObjects,
  setCameraView,
  fitCameraToScene,
  create4DConnectionLines,
  update4DLinesVisibility,
  highlight4DLines,
  getRelatedDeviceIds,
  highlightRelatedDevices,
  animateSelectionBoxes,
  updateRackLabelVisibility,
} from "@/lib/three/scene-builder"
import { status4DColors } from "@/lib/types"

// Theme-aware colors for the 3D scene
const sceneThemeColors = {
  light: {
    background: 0xf5f5f0, // Warm off-white
    gridMain: 0xcccccc,
    gridSecondary: 0xe5e5e5,
    gridOpacity: 1.0,
    compassRing: 0xaaaaaa,
  },
  dark: {
    background: 0x09090b, // Dark zinc
    gridMain: 0x2a2a2a, // Much darker grid lines
    gridSecondary: 0x181818, // Very subtle grid
    gridOpacity: 0.4, // Semi-transparent
    compassRing: 0x333333,
  },
}

function disposeObject(object: THREE.Object3D) {
  object.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      // Dispose geometry
      child.geometry?.dispose()
      
      // Dispose materials and their textures
      if (Array.isArray(child.material)) {
        child.material.forEach((mat) => {
          // Dispose textures
          Object.values(mat).forEach((value: any) => {
            if (value?.isTexture) {
              value.dispose()
            }
          })
          mat.dispose()
        })
      } else if (child.material) {
        // Dispose textures
        Object.values(child.material).forEach((value: any) => {
          if (value?.isTexture) {
            value.dispose()
          }
        })
        child.material.dispose()
      }
    } else if ((child as any).isLine) {
      (child as any).geometry?.dispose()
      ;(child as any).material?.dispose()
    }
  })
  
  // Clear the object from memory
  object.clear()
}

// Extended OrbitControls with zoom helper methods
interface ExtendedOrbitControls extends OrbitControls {
  zoomIn: () => void
  zoomOut: () => void
}

function createOrbitControls(camera: THREE.Camera, domElement: HTMLElement): ExtendedOrbitControls {
  const controls = new OrbitControls(camera, domElement) as ExtendedOrbitControls
  
  // Configure for CAD-like behavior
  controls.enableDamping = true
  controls.dampingFactor = 0.05
  controls.enablePan = true
  controls.screenSpacePanning = true // Pan in screen space
  controls.mouseButtons = {
    LEFT: THREE.MOUSE.ROTATE,
    MIDDLE: THREE.MOUSE.DOLLY,
    RIGHT: THREE.MOUSE.PAN
  }
  controls.minDistance = 2
  controls.maxDistance = 200
  controls.maxPolarAngle = Math.PI * 0.95 // Don't flip upside down
  
  // Add zoom helper methods
  controls.zoomIn = function() {
    const factor = 0.8
    const distance = camera.position.distanceTo(this.target)
    const newDistance = Math.max(this.minDistance, distance * factor)
    const direction = new THREE.Vector3().subVectors(camera.position, this.target).normalize()
    camera.position.copy(this.target).add(direction.multiplyScalar(newDistance))
  }
  
  controls.zoomOut = function() {
    const factor = 1.25
    const distance = camera.position.distanceTo(this.target)
    const newDistance = Math.min(this.maxDistance, distance * factor)
    const direction = new THREE.Vector3().subVectors(camera.position, this.target).normalize()
    camera.position.copy(this.target).add(direction.multiplyScalar(newDistance))
  }
  
  return controls
}

interface TooltipData {
  type: 'device' | 'rack'
  id: string
  name: string
  details?: string
  x: number
  y: number
}

interface ThreeSceneProps {
  sceneConfig: SceneConfig
  deviceTypes: DeviceType[]
  visibleStatuses: Set<Status4D>
  colorMode: ColorMode
  showBuilding: boolean
  selectedDeviceId: string | null
  onDeviceSelect: (deviceId: string | null) => void
  selectedRackId?: string | null
  onRackSelect?: (rackId: string | null) => void
  highlightedRacks?: string[]
  xrayMode?: boolean
  showOrigin?: boolean
  showCompass?: boolean
  show4DLines?: boolean
  showLabels?: boolean
  onCameraView?: (view: string) => void
  triggerResetCamera?: number
  triggerFitView?: number
  triggerZoomIn?: number
  triggerZoomOut?: number
  triggerSetView?: { view: string; timestamp: number } | null
}

export function ThreeScene({
  sceneConfig,
  deviceTypes,
  visibleStatuses,
  colorMode,
  showBuilding,
  selectedDeviceId,
  onDeviceSelect,
  highlightedRacks = [],
  xrayMode = false,
  showOrigin = false,
  showCompass = true,
  show4DLines = false,
  showLabels = true,
  onCameraView,
  triggerResetCamera,
  triggerFitView,
  triggerZoomIn,
  triggerZoomOut,
  triggerSetView,
  selectedRackId = null,
  onRackSelect,
}: ThreeSceneProps) {
  const { resolvedTheme } = useTheme()
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const controlsRef = useRef<ExtendedOrbitControls | null>(null)
  const sceneObjectsRef = useRef<SceneObjects | null>(null)
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster())
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2())
  const previousHighlightedRacksRef = useRef<string[]>([])
  const originPointRef = useRef<THREE.Group | null>(null)
  const compassRef = useRef<THREE.Group | null>(null)
  const connectionLinesRef = useRef<THREE.Group | null>(null)
  const gridHelperRef = useRef<THREE.GridHelper | null>(null)
  const viewHelperRef = useRef<ViewHelper | null>(null)
  const viewHelperContainerRef = useRef<HTMLDivElement | null>(null)
  const [tooltip, setTooltip] = useState<TooltipData | null>(null)
  const hoveredObjectRef = useRef<THREE.Object3D | null>(null)

  // Initialize Three.js scene
  useEffect(() => {
    if (!containerRef.current) return

    const container = containerRef.current
    const width = container.clientWidth
    const height = container.clientHeight

    // Scene
    const scene = new THREE.Scene()
    const themeColors = resolvedTheme === "light" ? sceneThemeColors.light : sceneThemeColors.dark
    scene.background = new THREE.Color(themeColors.background)
    sceneRef.current = scene

    // Camera
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000)
    camera.position.set(15, 10, 15)
    cameraRef.current = camera

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.shadowMap.enabled = true
    container.appendChild(renderer.domElement)
    rendererRef.current = renderer

    const controls = createOrbitControls(camera, renderer.domElement)
    controlsRef.current = controls

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4)
    scene.add(ambientLight)

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
    directionalLight.position.set(10, 20, 10)
    directionalLight.castShadow = true
    scene.add(directionalLight)

    const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.4)
    scene.add(hemisphereLight)

    // Grid helper - semi-transparent for dark mode
    const gridHelper = new THREE.GridHelper(50, 50, themeColors.gridMain, themeColors.gridSecondary)
    if (Array.isArray(gridHelper.material)) {
      gridHelper.material.forEach((mat) => {
        ;(mat as THREE.LineBasicMaterial).transparent = true
        ;(mat as THREE.LineBasicMaterial).opacity = themeColors.gridOpacity
      })
    } else {
      ;(gridHelper.material as THREE.LineBasicMaterial).transparent = true
      ;(gridHelper.material as THREE.LineBasicMaterial).opacity = themeColors.gridOpacity
    }
    scene.add(gridHelper)
    gridHelperRef.current = gridHelper

    // Origin point indicator
    const createOriginPoint = () => {
      const originGroup = new THREE.Group()
      
      // Central sphere
      const sphereGeometry = new THREE.SphereGeometry(0.15, 16, 12)
      const sphereMaterial = new THREE.MeshBasicMaterial({ color: 0xff6b35 })
      const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial)
      originGroup.add(sphere)
      
      // Axis lines
      const lineMaterial = new THREE.LineBasicMaterial({ linewidth: 3 })
      
      // X-axis (red)
      const xGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-2, 0, 0),
        new THREE.Vector3(2, 0, 0)
      ])
      const xLine = new THREE.Line(xGeometry, new THREE.LineBasicMaterial({ color: 0xff0000, linewidth: 3 }))
      originGroup.add(xLine)
      
      // Y-axis (green)
      const yGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, -2, 0),
        new THREE.Vector3(0, 2, 0)
      ])
      const yLine = new THREE.Line(yGeometry, new THREE.LineBasicMaterial({ color: 0x00ff00, linewidth: 3 }))
      originGroup.add(yLine)
      
      // Z-axis (blue)
      const zGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, -2),
        new THREE.Vector3(0, 0, 2)
      ])
      const zLine = new THREE.Line(zGeometry, new THREE.LineBasicMaterial({ color: 0x0000ff, linewidth: 3 }))
      originGroup.add(zLine)
      
      originGroup.position.set(0, 0.1, 0) // Slightly above floor
      originGroup.visible = showOrigin
      
      return originGroup
    }
    
    const originPoint = createOriginPoint()
    scene.add(originPoint)
    originPointRef.current = originPoint

    // Compass indicator
    const createCompass = () => {
      const compassGroup = new THREE.Group()
      
      // Compass ring
      const ringGeometry = new THREE.RingGeometry(1.8, 2.0, 32)
      const ringMaterial = new THREE.MeshBasicMaterial({ color: themeColors.compassRing, side: THREE.DoubleSide })
      ringMaterial.name = "compassRing" // Mark for theme updates
      const ring = new THREE.Mesh(ringGeometry, ringMaterial)
      ring.rotation.x = -Math.PI / 2
      compassGroup.add(ring)
      
      // North arrow
      const arrowGeometry = new THREE.ConeGeometry(0.1, 0.3, 8)
      const northMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 })
      const northArrow = new THREE.Mesh(arrowGeometry, northMaterial)
      northArrow.position.set(0, 0.2, -1.9)
      northArrow.rotation.x = Math.PI / 2
      compassGroup.add(northArrow)
      
      // Directional labels using simple geometry
      const labelMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff })
      
      // N, S, E, W markers using small cubes
      const labelGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.1)
      const nMarker = new THREE.Mesh(labelGeometry, new THREE.MeshBasicMaterial({ color: 0xff0000 }))
      nMarker.position.set(0, 0.1, -2.2)
      compassGroup.add(nMarker)
      
      const sMarker = new THREE.Mesh(labelGeometry, new THREE.MeshBasicMaterial({ color: 0x00ff00 }))
      sMarker.position.set(0, 0.1, 2.2)
      compassGroup.add(sMarker)
      
      const eMarker = new THREE.Mesh(labelGeometry, new THREE.MeshBasicMaterial({ color: 0x0000ff }))
      eMarker.position.set(2.2, 0.1, 0)
      compassGroup.add(eMarker)
      
      const wMarker = new THREE.Mesh(labelGeometry, new THREE.MeshBasicMaterial({ color: 0xffff00 }))
      wMarker.position.set(-2.2, 0.1, 0)
      compassGroup.add(wMarker)
      
      compassGroup.position.set(0, 0.05, 0)
      compassGroup.visible = showCompass
      
      return compassGroup
    }
    
    const compass = createCompass()
    scene.add(compass)
    compassRef.current = compass

    // Create ViewHelper (CAD-style view cube)
    const viewHelper = new ViewHelper(camera, renderer.domElement)
    viewHelper.center.set(0.85, -0.85, 0) // Position in bottom-right corner (NDC: 1=right, -1=bottom)
    viewHelperRef.current = viewHelper
    
    // Handle ViewHelper click events
    const handleViewHelperClick = (event: MouseEvent) => {
      // Get the ViewHelper container bounds
      const rect = renderer.domElement.getBoundingClientRect()
      const viewHelperSize = 128 // ViewHelper default size
      const margin = 16
      
      // Check if click is in the ViewHelper area (bottom-right corner)
      const viewHelperX = rect.right - viewHelperSize - margin
      const viewHelperY = rect.bottom - viewHelperSize - margin
      
      if (
        event.clientX >= viewHelperX &&
        event.clientX <= rect.right - margin &&
        event.clientY >= viewHelperY &&
        event.clientY <= rect.bottom - margin
      ) {
        // Convert click to ViewHelper space
        const x = (event.clientX - viewHelperX) / viewHelperSize
        const y = (event.clientY - viewHelperY) / viewHelperSize
        
        // Let ViewHelper handle the click
        viewHelper.handleClick(event)
      }
    }
    
    renderer.domElement.addEventListener('click', handleViewHelperClick)

    // Animation loop
    let animationId: number
    const clock = new THREE.Clock()
    const animate = () => {
      animationId = requestAnimationFrame(animate)
      const delta = clock.getDelta()
      const elapsed = clock.getElapsedTime()
      
      controls.update()
      
      // Update ViewHelper animation (for smooth camera transitions)
      if (viewHelper.animating) {
        viewHelper.update(delta)
      }

      // Animate selection bounding boxes
      animateSelectionBoxes(elapsed)
      
      renderer.render(scene, camera)
      
      // Render ViewHelper (must be after main render with autoClear disabled)
      renderer.autoClear = false
      viewHelper.render(renderer)
      renderer.autoClear = true
    }
    animate()

    const handleResize = (entries?: ResizeObserverEntry[]) => {
      if (!container || !camera || !renderer) return

      // Get dimensions from ResizeObserver entry or fall back to clientWidth/Height
      const width = entries?.[0]?.contentRect.width || container.clientWidth
      const height = entries?.[0]?.contentRect.height || container.clientHeight

      // Skip if dimensions are invalid
      if (width === 0 || height === 0) return

      camera.aspect = width / height
      camera.updateProjectionMatrix()
      renderer.setSize(width, height)
    }

    // Create ResizeObserver to watch container size changes
    const resizeObserver = new ResizeObserver(handleResize)
    resizeObserver.observe(container)

    // Also listen to window resize as backup
    const handleWindowResize = () => handleResize()
    window.addEventListener("resize", handleWindowResize)

    // Helper to find clickable object from intersection
    const findClickableObject = (object: THREE.Object3D): { type: 'device' | 'rack' | null, object: THREE.Object3D | null } => {
      let current: THREE.Object3D | null = object
      while (current) {
        if (current.userData.type === 'device') {
          return { type: 'device', object: current }
        }
        if (current.userData.type === 'rack') {
          return { type: 'rack', object: current }
        }
        current = current.parent
      }
      return { type: null, object: null }
    }

    // Handle click - improved raycasting
    const handleClick = (event: MouseEvent) => {
      if (!container || !camera || !scene) return

      const rect = container.getBoundingClientRect()
      mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

      raycasterRef.current.setFromCamera(mouseRef.current, camera)
      
      // Only raycast against meshes (not lines, sprites, etc.) for more accurate selection
      const meshes: THREE.Object3D[] = []
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh && obj.visible) {
          meshes.push(obj)
        }
      })
      
      const intersects = raycasterRef.current.intersectObjects(meshes, false)

      if (intersects.length > 0) {
        // Find the closest device or rack
        let foundDevice: THREE.Object3D | null = null
        let foundRack: THREE.Object3D | null = null

        for (const intersection of intersects) {
          const result = findClickableObject(intersection.object)
          
          if (result.type === 'device' && !foundDevice) {
            foundDevice = result.object
            break // Devices take priority
          } else if (result.type === 'rack' && !foundRack) {
            foundRack = result.object
          }
        }

        if (foundDevice) {
          onDeviceSelect(foundDevice.name)
          onRackSelect?.(null)
          return
        }

        if (foundRack) {
          onRackSelect?.(foundRack.name)
          onDeviceSelect(null)

          if (sceneObjectsRef.current && cameraRef.current && controlsRef.current) {
            const rackGroup = sceneObjectsRef.current.racks.get(foundRack.name)
            if (rackGroup) {
              focusCameraOnRack(cameraRef.current, controlsRef.current, rackGroup)
            }
          }
          return
        }
      }

      onDeviceSelect(null)
      onRackSelect?.(null)
    }
    container.addEventListener("click", handleClick)

    // Handle mouse move for tooltips
    const handleMouseMove = (event: MouseEvent) => {
      if (!container || !camera || !scene || !sceneObjectsRef.current) return

      const rect = container.getBoundingClientRect()
      mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

      raycasterRef.current.setFromCamera(mouseRef.current, camera)
      
      const meshes: THREE.Object3D[] = []
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh && obj.visible) {
          meshes.push(obj)
        }
      })
      
      const intersects = raycasterRef.current.intersectObjects(meshes, false)

      if (intersects.length > 0) {
        for (const intersection of intersects) {
          const result = findClickableObject(intersection.object)
          
          if (result.type === 'device' && result.object) {
            const deviceData = result.object.userData.data
            if (deviceData && hoveredObjectRef.current !== result.object) {
              hoveredObjectRef.current = result.object
              setTooltip({
                type: 'device',
                id: deviceData.id,
                name: deviceData.name,
                details: `U${deviceData.uStart}-${deviceData.uStart + deviceData.uHeight - 1} • ${deviceData.status4D.replace('_', ' ')}`,
                x: event.clientX - rect.left,
                y: event.clientY - rect.top
              })
            } else if (hoveredObjectRef.current === result.object) {
              // Update position only
              setTooltip(prev => prev ? { ...prev, x: event.clientX - rect.left, y: event.clientY - rect.top } : null)
            }
            return
          } else if (result.type === 'rack' && result.object) {
            const rackData = result.object.userData.data
            if (rackData && hoveredObjectRef.current !== result.object) {
              hoveredObjectRef.current = result.object
              setTooltip({
                type: 'rack',
                id: rackData.id,
                name: rackData.name,
                details: `${rackData.uHeight}U • ${rackData.powerCapacityKw}kW`,
                x: event.clientX - rect.left,
                y: event.clientY - rect.top
              })
            } else if (hoveredObjectRef.current === result.object) {
              setTooltip(prev => prev ? { ...prev, x: event.clientX - rect.left, y: event.clientY - rect.top } : null)
            }
            return
          }
        }
      }

      // No intersection - clear tooltip
      if (hoveredObjectRef.current) {
        hoveredObjectRef.current = null
        setTooltip(null)
      }
    }
    container.addEventListener("mousemove", handleMouseMove)

    // Handle mouse leave
    const handleMouseLeave = () => {
      hoveredObjectRef.current = null
      setTooltip(null)
    }
    container.addEventListener("mouseleave", handleMouseLeave)

    return () => {
      cancelAnimationFrame(animationId)
      resizeObserver.disconnect()
      window.removeEventListener("resize", handleWindowResize)
      container.removeEventListener("click", handleClick)
      container.removeEventListener("mousemove", handleMouseMove)
      container.removeEventListener("mouseleave", handleMouseLeave)
      renderer.domElement.removeEventListener('click', handleViewHelperClick)
      controls.dispose()
      if (viewHelperRef.current) {
        viewHelperRef.current.dispose()
        viewHelperRef.current = null
      }
      renderer.dispose()
      container.removeChild(renderer.domElement)
      if (sceneObjectsRef.current) {
        if (sceneObjectsRef.current.building) {
          disposeObject(sceneObjectsRef.current.building)
        }
        sceneObjectsRef.current.rooms.forEach((room) => {
          disposeObject(room)
        })
        sceneObjectsRef.current = null
      }
    }
  }, [onDeviceSelect, onRackSelect])

  // Build scene objects
  useEffect(() => {
    if (!sceneRef.current) return

    const scene = sceneRef.current
    const deviceTypeMap = new Map(deviceTypes.map((dt) => [dt.id, dt]))
    let isCancelled = false

    const previousObjects = sceneObjectsRef.current
    if (previousObjects) {
      if (previousObjects.building) {
        scene.remove(previousObjects.building)
        disposeObject(previousObjects.building)
      }
      previousObjects.rooms.forEach((room) => {
        scene.remove(room)
        disposeObject(room)
      })
      sceneObjectsRef.current = null
      previousHighlightedRacksRef.current = []
    }

    // Clean up previous connection lines
    if (connectionLinesRef.current) {
      scene.remove(connectionLinesRef.current)
      disposeObject(connectionLinesRef.current)
      connectionLinesRef.current = null
    }

    buildScene(sceneConfig, deviceTypeMap).then((objects) => {
      if (!sceneRef.current || isCancelled) return

      // Add building with initial visibility
      if (objects.building) {
        objects.building.userData.sceneObject = true
        objects.building.visible = showBuilding
        scene.add(objects.building)
      }

      // Add rooms
      objects.rooms.forEach((room) => {
        room.userData.sceneObject = true
        scene.add(room)
      })

      sceneObjectsRef.current = objects

      // Create 4D connection lines
      const linesGroup = create4DConnectionLines(objects, sceneConfig)
      linesGroup.visible = show4DLines
      scene.add(linesGroup)
      connectionLinesRef.current = linesGroup
    })

    return () => {
      isCancelled = true
    }
    // Note: showBuilding is used for initial visibility but not in deps to avoid full rebuild
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sceneConfig, deviceTypes, show4DLines])

  // Update device visibility based on status filters
  useEffect(() => {
    if (!sceneObjectsRef.current) return

    const { devices } = sceneObjectsRef.current

    devices.forEach((deviceGroup, deviceId) => {
      const deviceData = deviceGroup.userData.data
      const isVisible = visibleStatuses.has(deviceData.status4D)
      updateDeviceVisibility(deviceGroup, isVisible)
    })
  }, [visibleStatuses])

  // Update device colors based on color mode
  useEffect(() => {
    if (!sceneObjectsRef.current) return

    const { devices } = sceneObjectsRef.current

    devices.forEach((deviceGroup) => {
      const deviceData = deviceGroup.userData.data

      let color = "#888888" // neutral default

      if (colorMode === "4D_STATUS") {
        color = status4DColors[deviceData.status4D as Status4D]
      }
      // Customer and Power modes not implemented yet, use neutral

      updateDeviceColor(deviceGroup, color)
    })
  }, [colorMode])

  // Update building visibility
  useEffect(() => {
    if (!sceneObjectsRef.current?.building) return
    sceneObjectsRef.current.building.visible = showBuilding
  }, [showBuilding])

  // Handle device selection and highlight related devices
  useEffect(() => {
    if (!sceneObjectsRef.current) return

    const { devices } = sceneObjectsRef.current

    // Get related device IDs (same logicalEquipmentId)
    const relatedDeviceIds = selectedDeviceId 
      ? getRelatedDeviceIds(sceneConfig, selectedDeviceId)
      : []
    
    // Get the logicalEquipmentId for the selected device
    const selectedDevice = selectedDeviceId 
      ? sceneConfig.devices.find(d => d.id === selectedDeviceId)
      : null
    const logicalEquipmentId = selectedDevice?.logicalEquipmentId || null

    // Highlight the selected device and related devices with animated bounding boxes
    highlightRelatedDevices(sceneObjectsRef.current, relatedDeviceIds, selectedDeviceId, sceneRef.current || undefined)

    // Update 4D connection lines highlighting
    if (connectionLinesRef.current) {
      highlight4DLines(connectionLinesRef.current, selectedDeviceId, logicalEquipmentId)
    }

    // Note: Camera no longer auto-focuses on device selection to maintain user's view
  }, [selectedDeviceId, sceneConfig])

  useEffect(() => {
    if (!sceneObjectsRef.current) return

    const { racks } = sceneObjectsRef.current
    const previouslyHighlighted = previousHighlightedRacksRef.current

    previouslyHighlighted.forEach((rackId) => {
      const rack = racks.get(rackId)
      if (rack) {
        highlightRacks([rack], false)
      }
    })

    const rackGroups: THREE.Group[] = []
    highlightedRacks.forEach((rackId) => {
      const rack = racks.get(rackId)
      if (rack) {
        rackGroups.push(rack)
      }
    })

    if (rackGroups.length > 0) {
      highlightRacks(rackGroups, true)
    }

    previousHighlightedRacksRef.current = highlightedRacks
  }, [highlightedRacks])

  useEffect(() => {
    if (!sceneObjectsRef.current?.building) return
    updateBuildingTransparency(sceneObjectsRef.current.building, xrayMode)
  }, [xrayMode])

  // Update 4D connection lines visibility
  useEffect(() => {
    if (!connectionLinesRef.current) return
    update4DLinesVisibility(connectionLinesRef.current, show4DLines)
  }, [show4DLines])

  useEffect(() => {
    if (!sceneObjectsRef.current) return

    const { racks } = sceneObjectsRef.current

    racks.forEach((rack, rackId) => {
      highlightRack(rack, rackId === selectedRackId)
    })
  }, [selectedRackId])

  useEffect(() => {
    if (!cameraRef.current || !controlsRef.current || !sceneRef.current) return
    if (triggerResetCamera === undefined) return

    setCameraView(cameraRef.current, controlsRef.current, "perspective")
    onCameraView?.("perspective")
  }, [triggerResetCamera, onCameraView])

  useEffect(() => {
    if (!cameraRef.current || !controlsRef.current || !sceneRef.current) return
    if (triggerFitView === undefined) return

    fitCameraToScene(cameraRef.current, controlsRef.current, sceneRef.current)
  }, [triggerFitView])

  useEffect(() => {
    if (!controlsRef.current) return
    if (triggerZoomIn === undefined) return

    controlsRef.current.zoomIn()
  }, [triggerZoomIn])

  useEffect(() => {
    if (!controlsRef.current) return
    if (triggerZoomOut === undefined) return

    controlsRef.current.zoomOut()
  }, [triggerZoomOut])

  useEffect(() => {
    if (!cameraRef.current || !controlsRef.current || !sceneRef.current) return
    if (!triggerSetView) return

    const box = fitCameraToScene(cameraRef.current, controlsRef.current, sceneRef.current)

    // Reset camera up vector before setting view
    cameraRef.current.up.set(0, 1, 0)

    setCameraView(cameraRef.current, controlsRef.current, triggerSetView.view as any, box)
    onCameraView?.(triggerSetView.view)
  }, [triggerSetView, onCameraView])

  // Update origin point visibility
  useEffect(() => {
    if (originPointRef.current) {
      originPointRef.current.visible = showOrigin
    }
  }, [showOrigin])

  // Update compass visibility
  useEffect(() => {
    if (compassRef.current) {
      compassRef.current.visible = showCompass
    }
  }, [showCompass])

  // Update scene colors when theme changes
  useEffect(() => {
    if (!sceneRef.current) return

    const themeColors = resolvedTheme === "light" ? sceneThemeColors.light : sceneThemeColors.dark

    // Update background
    sceneRef.current.background = new THREE.Color(themeColors.background)

    // Update grid helper
    if (gridHelperRef.current) {
      if (Array.isArray(gridHelperRef.current.material)) {
        // Grid has two materials: center line and grid lines
        ;(gridHelperRef.current.material[0] as THREE.LineBasicMaterial).color.setHex(themeColors.gridMain)
        ;(gridHelperRef.current.material[0] as THREE.LineBasicMaterial).opacity = themeColors.gridOpacity
        ;(gridHelperRef.current.material[1] as THREE.LineBasicMaterial).color.setHex(themeColors.gridSecondary)
        ;(gridHelperRef.current.material[1] as THREE.LineBasicMaterial).opacity = themeColors.gridOpacity
      }
    }

    // Update compass ring
    if (compassRef.current) {
      compassRef.current.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshBasicMaterial) {
          if (child.material.name === "compassRing") {
            child.material.color.setHex(themeColors.compassRing)
          }
        }
      })
    }
  }, [resolvedTheme])

  // Update label visibility
  useEffect(() => {
    if (!sceneObjectsRef.current) return
    updateRackLabelVisibility(sceneObjectsRef.current, showLabels)
  }, [showLabels])

  return (
    <div ref={containerRef} className="w-full h-full relative">
      {/* Tooltip overlay */}
      {tooltip && (
        <div 
          className="absolute pointer-events-none z-50 px-3 py-2 rounded-lg shadow-lg border text-sm max-w-xs"
          style={{ 
            left: tooltip.x + 12, 
            top: tooltip.y + 12,
            backgroundColor: resolvedTheme === 'light' ? 'rgba(255,255,255,0.95)' : 'rgba(24,24,27,0.95)',
            borderColor: resolvedTheme === 'light' ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)',
            color: resolvedTheme === 'light' ? '#1a1a1a' : '#fafafa'
          }}
        >
          <div className="font-medium flex items-center gap-2">
            <span 
              className="w-2 h-2 rounded-full" 
              style={{ backgroundColor: tooltip.type === 'device' ? '#3b82f6' : '#22c55e' }}
            />
            {tooltip.name}
          </div>
          {tooltip.details && (
            <div className="text-xs opacity-70 mt-0.5">{tooltip.details}</div>
          )}
        </div>
      )}
    </div>
  )
}
