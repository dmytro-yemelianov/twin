"use client"

import { useEffect, useRef } from "react"
import * as THREE from "three"
import type { SceneConfig, DeviceType, Status4D, ColorMode } from "@/lib/types"
import {
  buildScene,
  updateDeviceVisibility,
  updateDeviceColor,
  highlightDevice,
  highlightRacks,
  focusCameraOnDevice,
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
} from "@/lib/three/scene-builder"
import { status4DColors } from "@/lib/types"

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

class SimpleOrbitControls {
  camera: THREE.Camera
  domElement: HTMLElement
  target: THREE.Vector3
  enableDamping: boolean
  dampingFactor: number
  enablePan: boolean

  private isMouseDown = false
  private isRightMouseDown = false
  private previousMousePosition = { x: 0, y: 0 }
  private spherical = { radius: 20, theta: Math.PI / 4, phi: Math.PI / 3 }

  constructor(camera: THREE.Camera, domElement: HTMLElement) {
    this.camera = camera
    this.domElement = domElement
    this.target = new THREE.Vector3()
    this.enableDamping = true
    this.dampingFactor = 0.05
    this.enablePan = true

    this.domElement.addEventListener("mousedown", this.onMouseDown)
    this.domElement.addEventListener("mousemove", this.onMouseMove)
    this.domElement.addEventListener("mouseup", this.onMouseUp)
    this.domElement.addEventListener("wheel", this.onWheel)
    this.domElement.addEventListener("contextmenu", (e) => e.preventDefault())
  }

  private onMouseDown = (event: MouseEvent) => {
    if (event.button === 0) {
      // Left mouse button - rotate
      this.isMouseDown = true
    } else if (event.button === 2) {
      // Right mouse button - pan
      this.isRightMouseDown = true
    }
    this.previousMousePosition = { x: event.clientX, y: event.clientY }
  }

  private onMouseMove = (event: MouseEvent) => {
    const deltaX = event.clientX - this.previousMousePosition.x
    const deltaY = event.clientY - this.previousMousePosition.y

    if (this.isMouseDown) {
      // Rotation
      this.spherical.theta -= deltaX * 0.01
      this.spherical.phi -= deltaY * 0.01
      this.spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, this.spherical.phi))
    } else if (this.isRightMouseDown && this.enablePan) {
      // Panning
      const panSpeed = 0.02
      const right = new THREE.Vector3()
      const up = new THREE.Vector3()

      this.camera.getWorldDirection(new THREE.Vector3())
      right.crossVectors(this.camera.up, new THREE.Vector3(0, 0, 1)).normalize()
      up.set(0, 1, 0)

      this.target.add(right.multiplyScalar(-deltaX * panSpeed))
      this.target.add(up.multiplyScalar(deltaY * panSpeed))
    }

    this.previousMousePosition = { x: event.clientX, y: event.clientY }
  }

  private onMouseUp = (event: MouseEvent) => {
    if (event.button === 0) {
      this.isMouseDown = false
    } else if (event.button === 2) {
      this.isRightMouseDown = false
    }
  }

  private onWheel = (event: WheelEvent) => {
    event.preventDefault()
    this.spherical.radius += event.deltaY * 0.01
    this.spherical.radius = Math.max(2, Math.min(100, this.spherical.radius))
  }

  zoomIn() {
    this.spherical.radius *= 0.9
    this.spherical.radius = Math.max(2, this.spherical.radius)
  }

  zoomOut() {
    this.spherical.radius *= 1.1
    this.spherical.radius = Math.min(100, this.spherical.radius)
  }

  update() {
    const x = this.spherical.radius * Math.sin(this.spherical.phi) * Math.sin(this.spherical.theta)
    const y = this.spherical.radius * Math.cos(this.spherical.phi)
    const z = this.spherical.radius * Math.sin(this.spherical.phi) * Math.cos(this.spherical.theta)

    this.camera.position.set(this.target.x + x, this.target.y + y, this.target.z + z)
    this.camera.lookAt(this.target)
  }

  dispose() {
    this.domElement.removeEventListener("mousedown", this.onMouseDown)
    this.domElement.removeEventListener("mousemove", this.onMouseMove)
    this.domElement.removeEventListener("mouseup", this.onMouseUp)
    this.domElement.removeEventListener("wheel", this.onWheel)
  }
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
  onCameraView,
  triggerResetCamera,
  triggerFitView,
  triggerZoomIn,
  triggerZoomOut,
  triggerSetView,
  selectedRackId = null,
  onRackSelect,
}: ThreeSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const controlsRef = useRef<SimpleOrbitControls | null>(null)
  const sceneObjectsRef = useRef<SceneObjects | null>(null)
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster())
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2())
  const previousHighlightedRacksRef = useRef<string[]>([])
  const originPointRef = useRef<THREE.Group | null>(null)
  const compassRef = useRef<THREE.Group | null>(null)
  const connectionLinesRef = useRef<THREE.Group | null>(null)

  // Initialize Three.js scene
  useEffect(() => {
    if (!containerRef.current) return

    const container = containerRef.current
    const width = container.clientWidth
    const height = container.clientHeight

    // Scene
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x09090b)
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

    const controls = new SimpleOrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.05
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

    // Grid helper
    const gridHelper = new THREE.GridHelper(50, 50, 0x444444, 0x222222)
    scene.add(gridHelper)

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
      const ringMaterial = new THREE.MeshBasicMaterial({ color: 0x333333, side: THREE.DoubleSide })
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

    // Animation loop
    let animationId: number
    const animate = () => {
      animationId = requestAnimationFrame(animate)
      controls.update()
      renderer.render(scene, camera)
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

    // Handle click
    const handleClick = (event: MouseEvent) => {
      if (!container || !camera || !scene) return

      const rect = container.getBoundingClientRect()
      mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

      raycasterRef.current.setFromCamera(mouseRef.current, camera)
      const intersects = raycasterRef.current.intersectObjects(scene.children, true)

      if (intersects.length > 0) {
        // Check ALL intersections and prioritize devices over racks
        let foundDevice: THREE.Object3D | null = null
        let foundRack: THREE.Object3D | null = null

        for (const intersection of intersects) {
          let object = intersection.object
          // Traverse up to find the typed parent
        while (object.parent && !object.userData.type) {
          object = object.parent
        }

          if (object.userData.type === "device" && !foundDevice) {
            foundDevice = object
            break // Devices take priority, stop searching
          } else if (object.userData.type === "rack" && !foundRack) {
            foundRack = object
            // Don't break - keep looking for devices
          }
        }

        // Prioritize device selection over rack selection
        if (foundDevice) {
          onDeviceSelect(foundDevice.name)
          onRackSelect?.(null)
          return
        }

        // Only select rack if no device was found (clicking on empty rack space)
        if (foundRack) {
          onRackSelect?.(foundRack.name)
          onDeviceSelect(null)

          // Focus camera on rack
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

    return () => {
      cancelAnimationFrame(animationId)
      resizeObserver.disconnect()
      window.removeEventListener("resize", handleWindowResize)
      container.removeEventListener("click", handleClick)
      controls.dispose()
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

    // Highlight the selected device and related devices
    highlightRelatedDevices(sceneObjectsRef.current, relatedDeviceIds, selectedDeviceId)

    // Update 4D connection lines highlighting
    if (connectionLinesRef.current) {
      highlight4DLines(connectionLinesRef.current, selectedDeviceId, logicalEquipmentId)
    }

      // Focus camera on selected device
    if (selectedDeviceId) {
      const deviceGroup = devices.get(selectedDeviceId)
      if (deviceGroup && cameraRef.current && controlsRef.current) {
        focusCameraOnDevice(cameraRef.current, controlsRef.current, deviceGroup)
      }
    }
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

  return <div ref={containerRef} className="w-full h-full" />
}
