import * as THREE from "three"
import type { SceneConfig, Rack, Transform, DeviceType } from "@/lib/types"

const modelCache = new Map<string, THREE.Group>()

export async function loadGLTFModel(uri: string): Promise<THREE.Group> {
  // In production, this would use a proper GLTF loader
  console.log("[v0] GLTFLoader not available in preview, using fallback for:", uri)
  const fallback = createFallbackGeometry()
  return Promise.resolve(fallback.clone())
}

function createFallbackGeometry(): THREE.Group {
  const group = new THREE.Group()
  const geometry = new THREE.BoxGeometry(1, 1, 1)
  const material = new THREE.MeshStandardMaterial({ color: 0x888888 })
  const mesh = new THREE.Mesh(geometry, material)
  group.add(mesh)
  return group
}

export function applyTransform(object: THREE.Object3D, transform: Transform) {
  object.position.set(...transform.position)
  object.rotation.set(...transform.rotationEuler)
  object.scale.set(...transform.scale)
}

// Create a text sprite for rack labels
function createTextSprite(text: string, options: { 
  fontSize?: number
  color?: string 
  backgroundColor?: string
} = {}): THREE.Sprite {
  const { fontSize = 48, color = '#ffffff', backgroundColor = 'rgba(0,0,0,0.7)' } = options
  
  // Check if we're in a browser environment
  if (typeof document === 'undefined') {
    // Return an empty sprite for SSR
    return new THREE.Sprite(new THREE.SpriteMaterial())
  }
  
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')!
  
  // Set canvas size
  canvas.width = 256
  canvas.height = 64
  
  // Draw background with rounded corners
  context.fillStyle = backgroundColor
  context.beginPath()
  const radius = 8
  context.moveTo(radius, 0)
  context.lineTo(canvas.width - radius, 0)
  context.quadraticCurveTo(canvas.width, 0, canvas.width, radius)
  context.lineTo(canvas.width, canvas.height - radius)
  context.quadraticCurveTo(canvas.width, canvas.height, canvas.width - radius, canvas.height)
  context.lineTo(radius, canvas.height)
  context.quadraticCurveTo(0, canvas.height, 0, canvas.height - radius)
  context.lineTo(0, radius)
  context.quadraticCurveTo(0, 0, radius, 0)
  context.closePath()
  context.fill()
  
  // Draw text
  context.font = `bold ${fontSize}px Arial, sans-serif`
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillStyle = color
  context.fillText(text, canvas.width / 2, canvas.height / 2)
  
  // Create texture and sprite
  const texture = new THREE.CanvasTexture(canvas)
  texture.needsUpdate = true
  
  const spriteMaterial = new THREE.SpriteMaterial({ 
    map: texture,
    transparent: true,
    depthTest: false,
  })
  
  const sprite = new THREE.Sprite(spriteMaterial)
  sprite.scale.set(1.5, 0.4, 1) // Adjust scale for visibility
  
  return sprite
}

function createRackGeometry(uHeight: number): THREE.Group {
  const group = new THREE.Group()

  // Rack dimensions (simplified)
  const width = 0.6
  const depth = 1.0
  const height = (uHeight / 42) * 2.0 // 2 meters for 42U

  // Rack frame
  const frameGeometry = new THREE.BoxGeometry(width, height, depth)
  const frameMaterial = new THREE.MeshStandardMaterial({
    color: 0x333333,
    metalness: 0.8,
    roughness: 0.2,
    transparent: true,
    opacity: 0.2, // Semi-transparent so devices are visible
  })
  const frame = new THREE.Mesh(frameGeometry, frameMaterial)
  frame.position.y = height / 2

  // Add wireframe edges
  const edges = new THREE.EdgesGeometry(frameGeometry)
  const edgesMaterial = new THREE.LineBasicMaterial({ color: 0x666666 })
  const wireframe = new THREE.LineSegments(edges, edgesMaterial)
  wireframe.position.copy(frame.position)

  group.add(frame)
  group.add(wireframe)

  return group
}

function createDeviceGeometry(uHeight: number, category: string): THREE.Group {
  const group = new THREE.Group()

  const width = 0.5
  const depth = 0.9
  const height = (uHeight / 42) * 2.0

  // Base color and material based on category
  let baseColor = 0x4444ff
  let emissiveColor = 0x0000ff

  switch (category) {
    case "GPU_SERVER":
      baseColor = 0xff6b35 // Orange for high-power GPU servers
      emissiveColor = 0xff4400
      break
    case "SERVER":
      baseColor = 0x2196f3 // Blue for standard servers
      emissiveColor = 0x0066cc
      break
    case "BLADE":
      baseColor = 0x9c27b0 // Purple for blade systems
      emissiveColor = 0x7b1fa2
      break
    case "SWITCH":
      baseColor = 0x4caf50 // Green for network equipment
      emissiveColor = 0x2e7d32
      break
    case "STORAGE":
      baseColor = 0xffc107 // Amber for storage
      emissiveColor = 0xff8f00
      break
    case "PDU":
      baseColor = 0x607d8b // Gray for power distribution
      emissiveColor = 0x455a64
      break
    case "UPS":
      baseColor = 0xff5722 // Deep orange for UPS
      emissiveColor = 0xe64a19
      break
    case "NETWORK":
      baseColor = 0x00bcd4 // Cyan for patch panels
      emissiveColor = 0x0097a7
      break
  }

  // Main chassis body
  const geometry = new THREE.BoxGeometry(width, height, depth)
  const material = new THREE.MeshStandardMaterial({
    color: baseColor,
    metalness: 0.7,
    roughness: 0.3,
  })
  const chassis = new THREE.Mesh(geometry, material)
  group.add(chassis)

  // Front panel with darker bezel
  const frontPanelGeometry = new THREE.BoxGeometry(width + 0.02, height, 0.05)
  const frontPanelMaterial = new THREE.MeshStandardMaterial({
    color: 0x1a1a1a,
    metalness: 0.9,
    roughness: 0.2,
  })
  const frontPanel = new THREE.Mesh(frontPanelGeometry, frontPanelMaterial)
  frontPanel.position.z = depth / 2 + 0.025
  group.add(frontPanel)

  // Add LED indicators on front panel
  const ledCount = Math.max(2, Math.floor(uHeight / 2))
  const ledGeometry = new THREE.SphereGeometry(0.01, 8, 8)

  for (let i = 0; i < ledCount; i++) {
    const ledMaterial = new THREE.MeshStandardMaterial({
      color: emissiveColor,
      emissive: emissiveColor,
      emissiveIntensity: 0.8,
      metalness: 0.1,
      roughness: 0.1,
    })
    const led = new THREE.Mesh(ledGeometry, ledMaterial)
    led.position.set(
      -width * 0.3 + (i % 2) * width * 0.6,
      height * 0.3 - Math.floor(i / 2) * (height * 0.15),
      depth / 2 + 0.06,
    )
    group.add(led)
  }

  // Add ventilation holes for GPU/high-power equipment
  if (category === "GPU_SERVER" || uHeight >= 4) {
    const ventGeometry = new THREE.PlaneGeometry(width * 0.6, height * 0.3)
    const ventMaterial = new THREE.MeshStandardMaterial({
      color: 0x0a0a0a,
      metalness: 0.3,
      roughness: 0.8,
    })
    const vents = new THREE.Mesh(ventGeometry, ventMaterial)
    vents.position.set(0, 0, depth / 2 + 0.055)
    group.add(vents)
  }

  // Add cooling fins/grills on top for larger devices
  if (uHeight >= 4) {
    const grillGeometry = new THREE.BoxGeometry(width * 0.8, 0.01, depth * 0.8)
    const grillMaterial = new THREE.MeshStandardMaterial({
      color: 0x333333,
      metalness: 0.8,
      roughness: 0.4,
    })
    const grill = new THREE.Mesh(grillGeometry, grillMaterial)
    grill.position.y = height / 2
    group.add(grill)
  }

  // Add edges for definition
  const edges = new THREE.EdgesGeometry(geometry)
  const edgesMaterial = new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 2 })
  const wireframe = new THREE.LineSegments(edges, edgesMaterial)
  group.add(wireframe)

  return group
}

function createBuildingShell(rooms: SceneConfig["rooms"]): THREE.Group {
  const buildingGroup = new THREE.Group()

  // Calculate building dimensions based on rooms
  let maxX = 0,
    maxZ = 0
  rooms.forEach((room) => {
    const x = room.transformInBuilding.position[0]
    const z = room.transformInBuilding.position[2]
    maxX = Math.max(maxX, x + 20)
    maxZ = Math.max(maxZ, z + 15)
  })

  const buildingWidth = Math.max(maxX, 35)
  const buildingDepth = Math.max(maxZ, 20)
  const buildingHeight = 4

  // Floor
  const floorGeometry = new THREE.BoxGeometry(buildingWidth, 0.3, buildingDepth)
  const floorMaterial = new THREE.MeshStandardMaterial({
    color: 0x2a2a2a,
    metalness: 0.1,
    roughness: 0.8,
  })
  const floor = new THREE.Mesh(floorGeometry, floorMaterial)
  floor.position.set(buildingWidth / 2, -0.15, buildingDepth / 2)
  floor.receiveShadow = true
  buildingGroup.add(floor)

  // Raised floor tiles pattern
  const tileSize = 2
  const tileGeometry = new THREE.PlaneGeometry(tileSize - 0.05, tileSize - 0.05)
  const tileMaterial = new THREE.MeshStandardMaterial({
    color: 0x383838,
    metalness: 0.2,
    roughness: 0.7,
  })

  for (let x = 0; x < buildingWidth; x += tileSize) {
    for (let z = 0; z < buildingDepth; z += tileSize) {
      const tile = new THREE.Mesh(tileGeometry, tileMaterial)
      tile.rotation.x = -Math.PI / 2
      tile.position.set(x + tileSize / 2, 0.01, z + tileSize / 2)
      buildingGroup.add(tile)
    }
  }

  // Ceiling with cable trays
  const ceilingGeometry = new THREE.BoxGeometry(buildingWidth, 0.1, buildingDepth)
  const ceilingMaterial = new THREE.MeshStandardMaterial({
    color: 0x4a4a4a,
    metalness: 0.3,
    roughness: 0.7,
    transparent: true,
    opacity: 0.3,
  })
  const ceiling = new THREE.Mesh(ceilingGeometry, ceilingMaterial)
  ceiling.position.set(buildingWidth / 2, buildingHeight, buildingDepth / 2)
  ceiling.userData.buildingPart = "ceiling"
  buildingGroup.add(ceiling)

  // Cable trays on ceiling
  const cableTrayGeometry = new THREE.BoxGeometry(0.3, 0.1, buildingDepth - 2)
  const cableTrayMaterial = new THREE.MeshStandardMaterial({
    color: 0x666666,
    metalness: 0.8,
    roughness: 0.3,
  })

  for (let x = 3; x < buildingWidth; x += 6) {
    const tray = new THREE.Mesh(cableTrayGeometry, cableTrayMaterial)
    tray.position.set(x, buildingHeight - 0.3, buildingDepth / 2)
    buildingGroup.add(tray)
  }

  const wallMaterial = new THREE.MeshStandardMaterial({
    color: 0x556677,
    metalness: 0.2,
    roughness: 0.8,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.3,
  })

  // Front wall
  const frontWallGeometry = new THREE.BoxGeometry(buildingWidth, buildingHeight, 0.3)
  const frontWall = new THREE.Mesh(frontWallGeometry, wallMaterial)
  frontWall.position.set(buildingWidth / 2, buildingHeight / 2, -0.15)
  frontWall.userData.buildingPart = "wall"
  buildingGroup.add(frontWall)

  // Back wall
  const backWall = new THREE.Mesh(frontWallGeometry, wallMaterial)
  backWall.position.set(buildingWidth / 2, buildingHeight / 2, buildingDepth + 0.15)
  backWall.userData.buildingPart = "wall"
  buildingGroup.add(backWall)

  // Left wall
  const sideWallGeometry = new THREE.BoxGeometry(0.3, buildingHeight, buildingDepth)
  const leftWall = new THREE.Mesh(sideWallGeometry, wallMaterial)
  leftWall.position.set(-0.15, buildingHeight / 2, buildingDepth / 2)
  leftWall.userData.buildingPart = "wall"
  buildingGroup.add(leftWall)

  // Right wall
  const rightWall = new THREE.Mesh(sideWallGeometry, wallMaterial)
  rightWall.position.set(buildingWidth + 0.15, buildingHeight / 2, buildingDepth / 2)
  rightWall.userData.buildingPart = "wall"
  buildingGroup.add(rightWall)

  rooms.forEach((room, idx) => {
    if (idx > 0) {
      const dividerGeometry = new THREE.BoxGeometry(0.15, buildingHeight, 15)
      const dividerMaterial = new THREE.MeshStandardMaterial({
        color: 0x445566,
        metalness: 0.3,
        roughness: 0.7,
        transparent: true,
        opacity: 0.2,
      })
      const divider = new THREE.Mesh(dividerGeometry, dividerMaterial)
      divider.position.set(room.transformInBuilding.position[0] - 1, buildingHeight / 2, 7.5)
      divider.userData.buildingPart = "divider"
      buildingGroup.add(divider)
    }
  })

  // Add ambient lighting fixtures
  const lightFixtureGeometry = new THREE.CylinderGeometry(0.3, 0.4, 0.2, 8)
  const lightFixtureMaterial = new THREE.MeshStandardMaterial({
    color: 0x888888,
    emissive: 0xffffcc,
    emissiveIntensity: 0.3,
  })

  for (let x = 5; x < buildingWidth; x += 8) {
    for (let z = 5; z < buildingDepth; z += 8) {
      const fixture = new THREE.Mesh(lightFixtureGeometry, lightFixtureMaterial)
      fixture.position.set(x, buildingHeight - 0.5, z)
      buildingGroup.add(fixture)
    }
  }

  return buildingGroup
}

export function computeDevicePosition(uStart: number, deviceUHeight: number, rackUHeight: number): THREE.Vector3 {
  // Calculate vertical position within rack
  // Assume 1U = ~44.45mm, rack is 2m tall for 42U
  const uToMeters = 2.0 / rackUHeight
  const yOffset = uStart * uToMeters

  return new THREE.Vector3(0, yOffset, 0)
}

export interface SceneObjects {
  building: THREE.Group | null
  rooms: Map<string, THREE.Group>
  racks: Map<string, THREE.Group>
  devices: Map<string, THREE.Group>
}

export async function buildScene(
  sceneConfig: SceneConfig,
  deviceTypes: Map<string, DeviceType>,
): Promise<SceneObjects> {
  const objects: SceneObjects = {
    building: null,
    rooms: new Map(),
    racks: new Map(),
    devices: new Map(),
  }

  const buildingShell = createBuildingShell(sceneConfig.rooms)
  objects.building = buildingShell

  // Create rooms
  sceneConfig.rooms.forEach((room) => {
    const roomGroup = new THREE.Group()
    roomGroup.name = room.id
    applyTransform(roomGroup, room.transformInBuilding)
    objects.rooms.set(room.id, roomGroup)
  })

  // Create racks with labels
  for (const rack of sceneConfig.racks) {
    const rackGroup = createRackGeometry(rack.uHeight)
    rackGroup.name = rack.id
    rackGroup.userData = { type: "rack", data: rack }

    applyTransform(rackGroup, rack.positionInRoom)

    // Add rack label
    const rackHeight = (rack.uHeight / 42) * 2.0
    const label = createTextSprite(rack.name)
    label.position.set(0, rackHeight + 0.4, 0) // Position above rack
    label.userData = { type: "rack-label", rackId: rack.id }
    rackGroup.add(label)

    const roomGroup = objects.rooms.get(rack.roomId)
    if (roomGroup) {
      roomGroup.add(rackGroup)
    }

    objects.racks.set(rack.id, rackGroup)
  }

  for (const device of sceneConfig.devices) {
    const deviceType = deviceTypes.get(device.deviceTypeId)
    if (!deviceType) continue

    const deviceGroup = createDeviceGeometry(device.uHeight, deviceType.category)
    deviceGroup.name = device.id
    deviceGroup.userData = { type: "device", data: device }

    // Position device within rack
    const rackGroup = objects.racks.get(device.rackId)
    if (rackGroup) {
      const rack = rackGroup.userData.data as Rack
      const position = computeDevicePosition(device.uStart, device.uHeight, rack.uHeight)
      deviceGroup.position.copy(position)
      rackGroup.add(deviceGroup)
    }

    objects.devices.set(device.id, deviceGroup)
  }

  return objects
}

export function updateDeviceVisibility(device: THREE.Group, visible: boolean) {
  device.visible = visible
}

export function updateDeviceColor(device: THREE.Group, color: string) {
  device.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      if (Array.isArray(child.material)) {
        child.material.forEach((mat) => {
          mat.color.setStyle(color)
        })
      } else {
        child.material.color.setStyle(color)
      }
    }
  })
}

export function highlightDevice(device: THREE.Group, highlight: boolean) {
  device.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      if (Array.isArray(child.material)) {
        child.material.forEach((mat) => {
          mat.emissive.setHex(highlight ? 0xffff00 : 0x000000)
          mat.emissiveIntensity = highlight ? 0.5 : 0
        })
      } else {
        child.material.emissive.setHex(highlight ? 0xffff00 : 0x000000)
        child.material.emissiveIntensity = highlight ? 0.5 : 0
      }
    }
  })
}

export function highlightRacks(rackGroups: THREE.Group[], highlight: boolean) {
  rackGroups.forEach((rack) => {
    rack.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (Array.isArray(child.material)) {
          child.material.forEach((mat) => {
            mat.emissive.setStyle(highlight ? "#22c55e" : "#000000")
            mat.emissiveIntensity = highlight ? 0.6 : 0
          })
        } else {
          child.material.emissive.setStyle(highlight ? "#22c55e" : "#000000")
          child.material.emissiveIntensity = highlight ? 0.6 : 0
        }
      }
    })
  })
}

export function focusCameraOnDevice(camera: THREE.Camera, controls: any, deviceGroup: THREE.Group, duration = 1000) {
  const box = new THREE.Box3().setFromObject(deviceGroup)
  const center = box.getCenter(new THREE.Vector3())
  const size = box.getSize(new THREE.Vector3())

  // Calculate optimal distance
  const maxDim = Math.max(size.x, size.y, size.z)
  const fov = (camera as THREE.PerspectiveCamera).fov * (Math.PI / 180)
  const distance = Math.abs(maxDim / Math.sin(fov / 2)) * 1.5

  // Set target and position
  if (controls) {
    controls.target.copy(center)
    const direction = new THREE.Vector3().subVectors(camera.position, controls.target).normalize()
    camera.position.copy(center).add(direction.multiplyScalar(distance))
    controls.update()
  }
}

export function updateBuildingTransparency(building: THREE.Group, xrayMode: boolean) {
  building.traverse((child) => {
    if (child instanceof THREE.Mesh && child.userData.buildingPart) {
      if (Array.isArray(child.material)) {
        child.material.forEach((mat) => {
          mat.transparent = true
          if (child.userData.buildingPart === "wall" || child.userData.buildingPart === "ceiling") {
            mat.opacity = xrayMode ? 0.05 : 0.3
          } else if (child.userData.buildingPart === "divider") {
            mat.opacity = xrayMode ? 0.02 : 0.2
          }
        })
      } else {
        child.material.transparent = true
        if (child.userData.buildingPart === "wall" || child.userData.buildingPart === "ceiling") {
          child.material.opacity = xrayMode ? 0.05 : 0.3
        } else if (child.userData.buildingPart === "divider") {
          child.material.opacity = xrayMode ? 0.02 : 0.2
        }
      }
    }
  })
}

// Update rack label visibility
export function updateRackLabelsVisibility(sceneObjects: SceneObjects, visible: boolean) {
  sceneObjects.racks.forEach((rackGroup) => {
    rackGroup.traverse((child) => {
      if (child.userData.type === "rack-label") {
        child.visible = visible
      }
    })
  })
}

export function highlightRack(rack: THREE.Group, highlight: boolean) {
  rack.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      if (Array.isArray(child.material)) {
        child.material.forEach((mat) => {
          mat.emissive.setStyle(highlight ? "#3b82f6" : "#000000")
          mat.emissiveIntensity = highlight ? 0.5 : 0
        })
      } else {
        child.material.emissive.setStyle(highlight ? "#3b82f6" : "#000000")
        child.material.emissiveIntensity = highlight ? 0.5 : 0
      }
    }
  })
}

export function focusCameraOnRack(camera: THREE.Camera, controls: any, rackGroup: THREE.Group) {
  const box = new THREE.Box3().setFromObject(rackGroup)
  const center = box.getCenter(new THREE.Vector3())
  const size = box.getSize(new THREE.Vector3())

  // Calculate optimal distance
  const maxDim = Math.max(size.x, size.y, size.z)
  const fov = (camera as THREE.PerspectiveCamera).fov * (Math.PI / 180)
  const distance = Math.abs(maxDim / Math.sin(fov / 2)) * 2.5

  // Set target and position
  if (controls) {
    controls.target.copy(center)
  }

  const direction = new THREE.Vector3().subVectors(camera.position, center).normalize()
  camera.position.copy(center).add(direction.multiplyScalar(distance))

  if (controls) {
    controls.update()
  }
  camera.lookAt(center)
}

export function setCameraView(
  camera: THREE.Camera,
  controls: any,
  view: "top" | "bottom" | "front" | "back" | "left" | "right" | "isometric" | "perspective",
  sceneBounds?: THREE.Box3,
) {
  const target = new THREE.Vector3(0, 0, 0)

  // Calculate scene center and size for proper framing
  if (sceneBounds) {
    sceneBounds.getCenter(target)
  }

  const size = sceneBounds ? sceneBounds.getSize(new THREE.Vector3()) : new THREE.Vector3(30, 10, 30)
  const maxDim = Math.max(size.x, size.y, size.z)
  const distance = maxDim * 2 // Ensure everything is visible

  const position = new THREE.Vector3()

  switch (view) {
    case "top":
      // Top view: Look down along Y axis (XZ plane visible)
      position.set(target.x, target.y + distance, target.z)
      camera.up.set(0, 0, -1) // Orient camera so north is up in viewport
      break
    case "bottom":
      // Bottom view: Look up along Y axis
      position.set(target.x, target.y - distance, target.z)
      camera.up.set(0, 0, 1) // Flip orientation for bottom view
      break
    case "front":
      // Front view: Look along Z axis (XY plane visible)
      position.set(target.x, target.y, target.z - distance)
      camera.up.set(0, 1, 0) // Standard up direction
      break
    case "back":
      // Back view: Look along negative Z axis
      position.set(target.x, target.y, target.z + distance)
      camera.up.set(0, 1, 0) // Standard up direction
      break
    case "left":
      // Left side view: Look along negative X axis
      position.set(target.x - distance, target.y, target.z)
      camera.up.set(0, 1, 0) // Standard up direction
      break
    case "right":
      // Right side view: Look along X axis (YZ plane visible)
      position.set(target.x + distance, target.y, target.z)
      camera.up.set(0, 1, 0) // Standard up direction
      break
    // Legacy support for "side" (maps to right)
    case "side":
      position.set(target.x + distance, target.y, target.z)
      camera.up.set(0, 1, 0)
      break
    case "isometric": {
      // Isometric: 45° angle from all three axes
      const isoDistance = distance * 0.8
      position.set(target.x + isoDistance, target.y + isoDistance, target.z + isoDistance)
      camera.up.set(0, 1, 0)
      break
    }
    case "perspective":
      // Default perspective view
      position.set(target.x + distance * 0.5, target.y + distance * 0.4, target.z + distance * 0.5)
      camera.up.set(0, 1, 0)
      break
  }

  camera.position.copy(position)
  camera.lookAt(target)

  if (controls) {
    controls.target.copy(target)
    controls.update()
  }
}

export function fitCameraToScene(camera: THREE.Camera, controls: any, scene: THREE.Scene) {
  const box = new THREE.Box3()

  // Calculate bounding box for all visible objects
  scene.traverse((object) => {
    if (object.userData.type === "device" || object.userData.type === "rack") {
      const objectBox = new THREE.Box3().setFromObject(object)
      box.union(objectBox)
    }
  })

  // If no objects found, use default bounds
  if (box.isEmpty()) {
    box.set(new THREE.Vector3(-10, 0, -10), new THREE.Vector3(10, 10, 10))
  }

  const center = box.getCenter(new THREE.Vector3())
  const size = box.getSize(new THREE.Vector3())

  const maxDim = Math.max(size.x, size.y, size.z)
  const fov = (camera as THREE.PerspectiveCamera).fov * (Math.PI / 180)
  const distance = Math.abs(maxDim / Math.sin(fov / 2)) * 1.5

  if (controls) {
    controls.target.copy(center)
  }

  const direction = new THREE.Vector3().subVectors(camera.position, center).normalize()
  camera.position.copy(center).add(direction.multiplyScalar(distance))

  if (controls) {
    controls.update()
  }
  camera.lookAt(center)

  return box
}

// Create 4D connection lines between devices with the same logicalEquipmentId
export function create4DConnectionLines(
  sceneObjects: SceneObjects,
  sceneConfig: SceneConfig,
): THREE.Group {
  const linesGroup = new THREE.Group()
  linesGroup.name = "4d-connection-lines"
  linesGroup.userData.type = "4d-lines"

  // Group devices by logicalEquipmentId
  const devicesByLogicalId = new Map<string, string[]>()
  sceneConfig.devices.forEach((device) => {
    if (!devicesByLogicalId.has(device.logicalEquipmentId)) {
      devicesByLogicalId.set(device.logicalEquipmentId, [])
    }
    devicesByLogicalId.get(device.logicalEquipmentId)!.push(device.id)
  })

  // Create lines between related devices
  devicesByLogicalId.forEach((deviceIds, logicalId) => {
    if (deviceIds.length < 2) return // No connection needed for single devices

    // Get world positions of all related devices
    const positions: THREE.Vector3[] = []
    deviceIds.forEach((deviceId) => {
      const deviceGroup = sceneObjects.devices.get(deviceId)
      if (deviceGroup) {
        const worldPos = new THREE.Vector3()
        deviceGroup.getWorldPosition(worldPos)
        // Offset slightly above the device center
        worldPos.y += 0.1
        positions.push(worldPos)
      }
    })

    if (positions.length < 2) return

    // Create curved lines between consecutive positions
    for (let i = 0; i < positions.length - 1; i++) {
      const start = positions[i]
      const end = positions[i + 1]

      // Create a curved path between points
      const midPoint = new THREE.Vector3().lerpVectors(start, end, 0.5)
      midPoint.y += Math.max(1, start.distanceTo(end) * 0.3) // Arc height

      const curve = new THREE.QuadraticBezierCurve3(start, midPoint, end)
      const points = curve.getPoints(20)

      const geometry = new THREE.BufferGeometry().setFromPoints(points)
      
      // Gradient color based on 4D status
      const lineMaterial = new THREE.LineBasicMaterial({
        color: 0x00ffff,
        transparent: true,
        opacity: 0.7,
        linewidth: 2,
      })

      const line = new THREE.Line(geometry, lineMaterial)
      line.userData = { 
        type: "4d-connection",
        logicalEquipmentId: logicalId,
        deviceIds: [deviceIds[i], deviceIds[i + 1]]
      }
      linesGroup.add(line)

      // Add small spheres at connection points
      const sphereGeometry = new THREE.SphereGeometry(0.03, 8, 8)
      const sphereMaterial = new THREE.MeshBasicMaterial({
        color: 0x00ffff,
        transparent: true,
        opacity: 0.8,
      })
      
      const startSphere = new THREE.Mesh(sphereGeometry, sphereMaterial)
      startSphere.position.copy(start)
      linesGroup.add(startSphere)

      if (i === positions.length - 2) {
        const endSphere = new THREE.Mesh(sphereGeometry, sphereMaterial)
        endSphere.position.copy(end)
        linesGroup.add(endSphere)
      }
    }
  })

  return linesGroup
}

// Update visibility of 4D connection lines
export function update4DLinesVisibility(linesGroup: THREE.Group, visible: boolean) {
  linesGroup.visible = visible
}

// Highlight lines connected to a specific device
export function highlight4DLines(
  linesGroup: THREE.Group,
  selectedDeviceId: string | null,
  logicalEquipmentId: string | null
) {
  linesGroup.traverse((child) => {
    if (child instanceof THREE.Line && child.userData.type === "4d-connection") {
      const isRelated = logicalEquipmentId && 
        child.userData.logicalEquipmentId === logicalEquipmentId
      
      const material = child.material as THREE.LineBasicMaterial
      if (isRelated) {
        material.color.setHex(0xffff00) // Yellow for highlighted
        material.opacity = 1
      } else {
        material.color.setHex(0x00ffff) // Cyan for normal
        material.opacity = selectedDeviceId ? 0.2 : 0.7 // Dim when something is selected
      }
    } else if (child instanceof THREE.Mesh && child.geometry instanceof THREE.SphereGeometry) {
      const material = child.material as THREE.MeshBasicMaterial
      material.opacity = selectedDeviceId && !logicalEquipmentId ? 0.2 : 0.8
    }
  })
}

// Get all device IDs that share the same logicalEquipmentId
export function getRelatedDeviceIds(
  sceneConfig: SceneConfig,
  deviceId: string
): string[] {
  const device = sceneConfig.devices.find(d => d.id === deviceId)
  if (!device) return []

  return sceneConfig.devices
    .filter(d => d.logicalEquipmentId === device.logicalEquipmentId)
    .map(d => d.id)
}

// Highlight related devices (same logicalEquipmentId)
export function highlightRelatedDevices(
  sceneObjects: SceneObjects,
  relatedDeviceIds: string[],
  selectedDeviceId: string | null
) {
  sceneObjects.devices.forEach((deviceGroup, deviceId) => {
    const isRelated = relatedDeviceIds.includes(deviceId)
    const isSelected = deviceId === selectedDeviceId

    deviceGroup.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const materials = Array.isArray(child.material) ? child.material : [child.material]
        materials.forEach((mat) => {
          if (isSelected) {
            mat.emissive.setHex(0xffff00) // Yellow for selected
            mat.emissiveIntensity = 0.5
          } else if (isRelated) {
            mat.emissive.setHex(0x00ffff) // Cyan for related
            mat.emissiveIntensity = 0.4
          } else {
            mat.emissive.setHex(0x000000)
            mat.emissiveIntensity = 0
          }
        })
      }
    })
  })
}
