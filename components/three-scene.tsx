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
} from "@/lib/three/scene-builder"
import { status4DColors } from "@/lib/types"

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
  highlightedRacks?: string[]
  xrayMode?: boolean
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
  onCameraView,
  triggerResetCamera,
  triggerFitView,
  triggerZoomIn,
  triggerZoomOut,
  triggerSetView,
}: ThreeSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const controlsRef = useRef<SimpleOrbitControls | null>(null)
  const sceneObjectsRef = useRef<SceneObjects | null>(null)
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster())
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2())
  const selectedRackRef = useRef<string | null>(null)

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
    window.addEventListener("resize", () => handleResize())

    // Handle click
    const handleClick = (event: MouseEvent) => {
      if (!container || !camera || !scene) return

      const rect = container.getBoundingClientRect()
      mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

      raycasterRef.current.setFromCamera(mouseRef.current, camera)
      const intersects = raycasterRef.current.intersectObjects(scene.children, true)

      if (intersects.length > 0) {
        // Find the device or rack object
        let object = intersects[0].object
        while (object.parent && !object.userData.type) {
          object = object.parent
        }

        if (object.userData.type === "device") {
          onDeviceSelect(object.name)
          selectedRackRef.current = null
          return
        } else if (object.userData.type === "rack") {
          // Handle rack selection
          selectedRackRef.current = object.name
          onDeviceSelect(null)

          // Focus camera on rack
          if (sceneObjectsRef.current && cameraRef.current && controlsRef.current) {
            const rackGroup = sceneObjectsRef.current.racks.get(object.name)
            if (rackGroup) {
              focusCameraOnRack(cameraRef.current, controlsRef.current, rackGroup)
            }
          }
          return
        }
      }

      onDeviceSelect(null)
      selectedRackRef.current = null
    }
    container.addEventListener("click", handleClick)

    return () => {
      cancelAnimationFrame(animationId)
      resizeObserver.disconnect()
      window.removeEventListener("resize", () => handleResize())
      container.removeEventListener("click", handleClick)
      controls.dispose()
      renderer.dispose()
      container.removeChild(renderer.domElement)
    }
  }, [onDeviceSelect])

  // Build scene objects
  useEffect(() => {
    if (!sceneRef.current) return

    const scene = sceneRef.current
    const deviceTypeMap = new Map(deviceTypes.map((dt) => [dt.id, dt]))

    buildScene(sceneConfig, deviceTypeMap).then((objects) => {
      // Clear previous scene objects (except lights, grid, etc.)
      const objectsToRemove: THREE.Object3D[] = []
      scene.children.forEach((child) => {
        if (child.userData.sceneObject) {
          objectsToRemove.push(child)
        }
      })
      objectsToRemove.forEach((obj) => scene.remove(obj))

      // Add building
      if (objects.building) {
        objects.building.userData.sceneObject = true
        scene.add(objects.building)
      }

      // Add rooms
      objects.rooms.forEach((room) => {
        room.userData.sceneObject = true
        scene.add(room)
      })

      sceneObjectsRef.current = objects
    })
  }, [sceneConfig, deviceTypes])

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

  useEffect(() => {
    if (!sceneObjectsRef.current) return

    const { devices } = sceneObjectsRef.current

    devices.forEach((deviceGroup, deviceId) => {
      const isSelected = deviceId === selectedDeviceId
      highlightDevice(deviceGroup, isSelected)

      // Focus camera on selected device
      if (isSelected && cameraRef.current && controlsRef.current) {
        focusCameraOnDevice(cameraRef.current, controlsRef.current, deviceGroup)
      }
    })
  }, [selectedDeviceId])

  useEffect(() => {
    if (!sceneObjectsRef.current) return

    const { racks } = sceneObjectsRef.current
    const rackGroups: THREE.Group[] = []

    highlightedRacks.forEach((rackId) => {
      const rack = racks.get(rackId)
      if (rack) {
        rackGroups.push(rack)
      }
    })

    // Clear all rack highlights first
    racks.forEach((rack) => {
      highlightRacks([rack], false)
    })

    // Highlight selected racks
    if (rackGroups.length > 0) {
      highlightRacks(rackGroups, true)
    }
  }, [highlightedRacks])

  useEffect(() => {
    if (!sceneObjectsRef.current?.building) return
    updateBuildingTransparency(sceneObjectsRef.current.building, xrayMode)
  }, [xrayMode])

  useEffect(() => {
    if (!sceneObjectsRef.current) return

    const { racks } = sceneObjectsRef.current

    // Clear all rack highlights
    racks.forEach((rack) => {
      highlightRack(rack, false)
    })

    // Highlight selected rack
    if (selectedRackRef.current) {
      const rack = racks.get(selectedRackRef.current)
      if (rack) {
        highlightRack(rack, true)
      }
    }
  }, [selectedRackRef.current, sceneObjectsRef.current])

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

  return <div ref={containerRef} className="w-full h-full" />
}
