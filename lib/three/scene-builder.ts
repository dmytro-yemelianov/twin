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

// Create small U-position label sprite
function createULabel(uNumber: number, isLightTheme = false): THREE.Sprite {
  if (typeof document === 'undefined') {
    return new THREE.Sprite(new THREE.SpriteMaterial())
  }
  
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')!
  
  canvas.width = 64
  canvas.height = 32
  
  // Transparent background
  context.clearRect(0, 0, canvas.width, canvas.height)
  
  // Draw text
  context.font = 'bold 20px monospace'
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillStyle = isLightTheme ? '#666666' : '#888888'
  context.fillText(`${uNumber}`, canvas.width / 2, canvas.height / 2)
  
  const texture = new THREE.CanvasTexture(canvas)
  texture.needsUpdate = true
  
  const spriteMaterial = new THREE.SpriteMaterial({ 
    map: texture,
    transparent: true,
    depthTest: false,
  })
  
  const sprite = new THREE.Sprite(spriteMaterial)
  sprite.scale.set(0.2, 0.1, 1)
  sprite.userData.type = 'u-label'
  
  return sprite
}

// Create front/back indicator label
function createFrontBackLabel(text: 'FRONT' | 'BACK'): THREE.Sprite {
  if (typeof document === 'undefined') {
    return new THREE.Sprite(new THREE.SpriteMaterial())
  }
  
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')!
  
  canvas.width = 128
  canvas.height = 32
  
  // Transparent background with subtle tint
  context.clearRect(0, 0, canvas.width, canvas.height)
  
  // Draw text
  context.font = 'bold 16px monospace'
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillStyle = text === 'FRONT' ? '#4ade80' : '#f87171' // Green for front, red for back
  context.fillText(text, canvas.width / 2, canvas.height / 2)
  
  const texture = new THREE.CanvasTexture(canvas)
  texture.needsUpdate = true
  
  const spriteMaterial = new THREE.SpriteMaterial({ 
    map: texture,
    transparent: true,
    depthTest: false,
  })
  
  const sprite = new THREE.Sprite(spriteMaterial)
  sprite.scale.set(0.4, 0.1, 1)
  sprite.userData.type = 'front-back-label'
  
  return sprite
}

function createRackGeometry(uHeight: number): THREE.Group {
  const group = new THREE.Group()

  // Rack dimensions
  const width = 0.6
  const depth = 1.0
  const height = (uHeight / 42) * 2.0 // 2 meters for 42U
  const postSize = 0.03 // Thickness of frame posts
  const railSize = 0.02 // Thickness of horizontal rails

  // Frame material for posts
  const frameMaterial = new THREE.MeshStandardMaterial({
    color: 0x444444,
    metalness: 0.7,
    roughness: 0.3,
  })

  // Create 4 vertical posts at corners
  const postGeometry = new THREE.BoxGeometry(postSize, height, postSize)
  const postPositions = [
    [-width / 2 + postSize / 2, height / 2, -depth / 2 + postSize / 2], // Front-left
    [width / 2 - postSize / 2, height / 2, -depth / 2 + postSize / 2],  // Front-right
    [-width / 2 + postSize / 2, height / 2, depth / 2 - postSize / 2],  // Back-left
    [width / 2 - postSize / 2, height / 2, depth / 2 - postSize / 2],   // Back-right
  ]

  postPositions.forEach((pos) => {
    const post = new THREE.Mesh(postGeometry, frameMaterial)
    post.position.set(pos[0], pos[1], pos[2])
    group.add(post)
  })

  // Create horizontal rails at top and bottom
  const frontBackRailGeometry = new THREE.BoxGeometry(width, railSize, railSize)
  const sideRailGeometry = new THREE.BoxGeometry(railSize, railSize, depth)

  // Bottom rails
  const bottomY = railSize / 2
  const bottomFrontRail = new THREE.Mesh(frontBackRailGeometry, frameMaterial)
  bottomFrontRail.position.set(0, bottomY, -depth / 2 + railSize / 2)
  group.add(bottomFrontRail)

  const bottomBackRail = new THREE.Mesh(frontBackRailGeometry, frameMaterial)
  bottomBackRail.position.set(0, bottomY, depth / 2 - railSize / 2)
  group.add(bottomBackRail)

  const bottomLeftRail = new THREE.Mesh(sideRailGeometry, frameMaterial)
  bottomLeftRail.position.set(-width / 2 + railSize / 2, bottomY, 0)
  group.add(bottomLeftRail)

  const bottomRightRail = new THREE.Mesh(sideRailGeometry, frameMaterial)
  bottomRightRail.position.set(width / 2 - railSize / 2, bottomY, 0)
  group.add(bottomRightRail)

  // Top rails
  const topY = height - railSize / 2
  const topFrontRail = new THREE.Mesh(frontBackRailGeometry, frameMaterial)
  topFrontRail.position.set(0, topY, -depth / 2 + railSize / 2)
  group.add(topFrontRail)

  const topBackRail = new THREE.Mesh(frontBackRailGeometry, frameMaterial)
  topBackRail.position.set(0, topY, depth / 2 - railSize / 2)
  group.add(topBackRail)

  const topLeftRail = new THREE.Mesh(sideRailGeometry, frameMaterial)
  topLeftRail.position.set(-width / 2 + railSize / 2, topY, 0)
  group.add(topLeftRail)

  const topRightRail = new THREE.Mesh(sideRailGeometry, frameMaterial)
  topRightRail.position.set(width / 2 - railSize / 2, topY, 0)
  group.add(topRightRail)

  // Add U-position labels on both front and back sides
  // Show labels at key positions: 1, then every 10U, and the top
  const uToMeters = height / uHeight
  const labelPositions: number[] = [1]
  
  for (let u = 10; u <= uHeight; u += 10) {
    if (!labelPositions.includes(u)) {
      labelPositions.push(u)
    }
  }
  if (!labelPositions.includes(uHeight)) {
    labelPositions.push(uHeight)
  }

  // Front labels (left side)
  labelPositions.forEach((uPos) => {
    const label = createULabel(uPos)
    const yPosition = (uPos - 0.5) * uToMeters
    label.position.set(-width / 2 - 0.15, yPosition, -depth / 2)
    label.userData.uPosition = uPos
    label.userData.labelSide = 'front'
    group.add(label)
  })

  // Back labels (right side when looking from back)
  labelPositions.forEach((uPos) => {
    const label = createULabel(uPos)
    const yPosition = (uPos - 0.5) * uToMeters
    label.position.set(width / 2 + 0.15, yPosition, depth / 2)
    label.userData.uPosition = uPos
    label.userData.labelSide = 'back'
    group.add(label)
  })

  // Add FRONT/BACK indicators at the bottom
  const frontLabel = createFrontBackLabel('FRONT')
  frontLabel.position.set(0, -0.15, -depth / 2 - 0.1)
  frontLabel.userData.labelSide = 'front'
  group.add(frontLabel)

  const backLabel = createFrontBackLabel('BACK')
  backLabel.position.set(0, -0.15, depth / 2 + 0.1)
  backLabel.userData.labelSide = 'back'
  group.add(backLabel)

  // Add colored strips on posts to indicate front (green) and back (red)
  const frontStripGeometry = new THREE.BoxGeometry(postSize + 0.01, 0.05, postSize + 0.01)
  const frontStripMaterial = new THREE.MeshBasicMaterial({ color: 0x4ade80, transparent: true, opacity: 0.8 })
  const backStripMaterial = new THREE.MeshBasicMaterial({ color: 0xf87171, transparent: true, opacity: 0.8 })

  // Front strips (bottom of front posts)
  const frontLeftStrip = new THREE.Mesh(frontStripGeometry, frontStripMaterial)
  frontLeftStrip.position.set(-width / 2 + postSize / 2, 0.025, -depth / 2 + postSize / 2)
  group.add(frontLeftStrip)

  const frontRightStrip = new THREE.Mesh(frontStripGeometry, frontStripMaterial)
  frontRightStrip.position.set(width / 2 - postSize / 2, 0.025, -depth / 2 + postSize / 2)
  group.add(frontRightStrip)

  // Back strips (bottom of back posts)
  const backLeftStrip = new THREE.Mesh(frontStripGeometry, backStripMaterial)
  backLeftStrip.position.set(-width / 2 + postSize / 2, 0.025, depth / 2 - postSize / 2)
  group.add(backLeftStrip)

  const backRightStrip = new THREE.Mesh(frontStripGeometry, backStripMaterial)
  backRightStrip.position.set(width / 2 - postSize / 2, 0.025, depth / 2 - postSize / 2)
  group.add(backRightStrip)

  // Add thin mounting rail indicators on the front posts (visual guide for U positions)
  const railIndicatorMaterial = new THREE.LineBasicMaterial({ 
    color: 0x555555,
    transparent: true,
    opacity: 0.5 
  })
  
  // Create horizontal lines for every 5U on front face
  for (let u = 0; u <= uHeight; u += 5) {
    const yPosition = u * uToMeters
    const points = [
      new THREE.Vector3(-width / 2 + postSize, yPosition, -depth / 2 + postSize / 2),
      new THREE.Vector3(width / 2 - postSize, yPosition, -depth / 2 + postSize / 2),
    ]
    const geometry = new THREE.BufferGeometry().setFromPoints(points)
    const line = new THREE.Line(geometry, railIndicatorMaterial)
    group.add(line)
  }

  return group
}

function createDeviceGeometry(uHeight: number, category: string, mounting?: string): THREE.Group {
  const group = new THREE.Group()

  // Handle vertical mount devices (like 0U PDUs)
  const isVerticalMount = mounting === 'vertical'
  
  // Dimensions differ for vertical mount devices
  const width = isVerticalMount ? 0.06 : 0.5  // Thin strip for vertical PDU
  const depth = isVerticalMount ? 0.08 : 0.9
  const height = isVerticalMount ? 2.0 : (uHeight / 42) * 2.0  // Full rack height for vertical

  // Lighter, more pastel colors for better visibility in both themes
  let baseColor = 0x7799cc
  let accentColor = 0x5577aa

  switch (category) {
    case "GPU_SERVER":
      baseColor = 0xffab91 // Light coral/orange for GPU servers
      accentColor = 0xff8a65
      break
    case "SERVER":
      baseColor = 0x90caf9 // Light blue for standard servers
      accentColor = 0x64b5f6
      break
    case "BLADE":
      baseColor = 0xce93d8 // Light purple for blade systems
      accentColor = 0xba68c8
      break
    case "SWITCH":
      baseColor = 0xa5d6a7 // Light green for network equipment
      accentColor = 0x81c784
      break
    case "STORAGE":
      baseColor = 0xffe082 // Light amber for storage
      accentColor = 0xffd54f
      break
    case "PDU":
      baseColor = 0xb0bec5 // Light blue-gray for power distribution
      accentColor = 0x90a4ae
      break
    case "UPS":
      baseColor = 0xffab91 // Light deep orange for UPS
      accentColor = 0xff8a65
      break
    case "NETWORK":
      baseColor = 0x80deea // Light cyan for patch panels
      accentColor = 0x4dd0e1
      break
  }

  // Main chassis body - lighter colors
  // Equipment is oriented with FRONT facing negative Z (same as rack front)
  const geometry = new THREE.BoxGeometry(width, height, depth)
  const material = new THREE.MeshStandardMaterial({
    color: baseColor,
    metalness: 0.3,
    roughness: 0.6,
  })
  material.userData = { isMainChassis: true, originalColor: baseColor }
  const chassis = new THREE.Mesh(geometry, material)
  chassis.userData.isMainMesh = true
  group.add(chassis)

  // Front panel with subtle bezel - FRONT is at negative Z (aligns with rack front)
  const frontPanelGeometry = new THREE.BoxGeometry(width + 0.02, height, 0.03)
  const frontPanelMaterial = new THREE.MeshStandardMaterial({
    color: 0x3a3a3a,
    metalness: 0.7,
    roughness: 0.3,
  })
  const frontPanel = new THREE.Mesh(frontPanelGeometry, frontPanelMaterial)
  frontPanel.position.z = -depth / 2 - 0.015 // Front faces negative Z
  group.add(frontPanel)

  // Add LED indicators on front panel (negative Z side)
  const ledCount = Math.max(2, Math.floor(uHeight / 2))
  const ledGeometry = new THREE.SphereGeometry(0.008, 8, 8)

  for (let i = 0; i < Math.min(ledCount, 4); i++) {
    const ledMaterial = new THREE.MeshStandardMaterial({
      color: accentColor,
      emissive: accentColor,
      emissiveIntensity: 0.5,
      metalness: 0.1,
      roughness: 0.1,
    })
    const led = new THREE.Mesh(ledGeometry, ledMaterial)
    led.position.set(
      -width * 0.3 + (i % 2) * width * 0.6,
      height * 0.3 - Math.floor(i / 2) * (height * 0.2),
      -depth / 2 - 0.04, // Front side (negative Z)
    )
    group.add(led)
  }

  // Add edges for definition - these will be used for highlighting
  const edges = new THREE.EdgesGeometry(geometry)
  const edgesMaterial = new THREE.LineBasicMaterial({ 
    color: 0x333333, 
    linewidth: 1,
    transparent: true,
    opacity: 0.5
  })
  edgesMaterial.userData = { isOutline: true, originalColor: 0x333333, originalOpacity: 0.5 }
  const wireframe = new THREE.LineSegments(edges, edgesMaterial)
  wireframe.userData.isOutline = true
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

    // Check for vertical mounting (from device data or 0U height)
    const mounting = (device as any).mounting || (device.uHeight === 0 ? 'vertical' : undefined)
    const deviceGroup = createDeviceGeometry(device.uHeight, deviceType.category, mounting)
    deviceGroup.name = device.id
    deviceGroup.userData = { type: "device", data: device, mounting }

    // Position device within rack
    const rackGroup = objects.racks.get(device.rackId)
    if (rackGroup) {
      const rack = rackGroup.userData.data as Rack
      
      if (mounting === 'vertical') {
        // Vertical mount devices go on the side of the rack
        // Position at the left side of the rack, spanning full height
        deviceGroup.position.set(-0.35, 1.0, 0) // Left side, vertically centered
      } else {
        const position = computeDevicePosition(device.uStart, device.uHeight, rack.uHeight)
        deviceGroup.position.copy(position)
      }
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
    // Only update main mesh materials, not outlines or other geometry
    if (child instanceof THREE.Mesh && child.userData.isMainMesh) {
      const mat = child.material as THREE.MeshStandardMaterial
      if (mat && mat.color && typeof mat.color.setStyle === 'function') {
        mat.color.setStyle(color)
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

// Create animated selection bounding box
function createSelectionBox(color: number, padding: number = 0.02): THREE.Group {
  const group = new THREE.Group()
  group.userData.isSelectionBox = true
  
  // Create dashed line material
  const material = new THREE.LineDashedMaterial({
    color: color,
    dashSize: 0.05,
    gapSize: 0.03,
    linewidth: 2,
    transparent: true,
    opacity: 1,
  })
  
  // Create corner markers for a more distinctive look
  const cornerLength = 0.08
  const positions: number[] = []
  
  // We'll set the actual positions when we know the bounding box size
  // For now, create the line segments
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  
  const lines = new THREE.LineSegments(geometry, material)
  lines.userData.isSelectionLines = true
  group.add(lines)
  
  return group
}

// Update selection box to fit a device
function updateSelectionBoxGeometry(selectionBox: THREE.Group, targetGroup: THREE.Group, padding: number = 0.03) {
  // Calculate bounding box of the target
  const box = new THREE.Box3().setFromObject(targetGroup)
  const min = box.min
  const max = box.max
  
  // Add padding
  min.x -= padding; min.y -= padding; min.z -= padding
  max.x += padding; max.y += padding; max.z += padding
  
  const corners = [
    [min.x, min.y, min.z], // 0: bottom-left-front
    [max.x, min.y, min.z], // 1: bottom-right-front
    [max.x, max.y, min.z], // 2: top-right-front
    [min.x, max.y, min.z], // 3: top-left-front
    [min.x, min.y, max.z], // 4: bottom-left-back
    [max.x, min.y, max.z], // 5: bottom-right-back
    [max.x, max.y, max.z], // 6: top-right-back
    [min.x, max.y, max.z], // 7: top-left-back
  ]
  
  // Create line segments for all 12 edges of the box
  const edgeIndices = [
    // Front face
    [0, 1], [1, 2], [2, 3], [3, 0],
    // Back face
    [4, 5], [5, 6], [6, 7], [7, 4],
    // Connecting edges
    [0, 4], [1, 5], [2, 6], [3, 7],
  ]
  
  const positions: number[] = []
  for (const [a, b] of edgeIndices) {
    positions.push(...corners[a], ...corners[b])
  }
  
  // Find and update the line segments
  selectionBox.traverse((child) => {
    if (child instanceof THREE.LineSegments && child.userData.isSelectionLines) {
      const geometry = child.geometry as THREE.BufferGeometry
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
      geometry.computeBoundingSphere()
      child.computeLineDistances() // Required for dashed lines
    }
  })
  
  // Position the selection box at world origin (since positions are in world coords)
  selectionBox.position.set(0, 0, 0)
}

// Store for active selection boxes
const activeSelectionBoxes = new Map<string, THREE.Group>()

// Animate selection boxes (call this in the render loop)
export function animateSelectionBoxes(time: number) {
  activeSelectionBoxes.forEach((box) => {
    box.traverse((child) => {
      if (child instanceof THREE.LineSegments) {
        const mat = child.material as THREE.LineDashedMaterial
        // Animate dash offset for marching ants effect
        mat.dashSize = 0.05 + Math.sin(time * 3) * 0.01
        // Pulse opacity
        mat.opacity = 0.7 + Math.sin(time * 4) * 0.3
      }
    })
  })
}

// Get all active selection boxes for cleanup
export function getActiveSelectionBoxes(): THREE.Group[] {
  return Array.from(activeSelectionBoxes.values())
}

// Highlight related devices using animated bounding boxes
export function highlightRelatedDevices(
  sceneObjects: SceneObjects,
  relatedDeviceIds: string[],
  selectedDeviceId: string | null,
  scene?: THREE.Scene
) {
  // Clear existing selection boxes
  activeSelectionBoxes.forEach((box, id) => {
    if (scene) {
      scene.remove(box)
    }
    box.traverse((child) => {
      if (child instanceof THREE.LineSegments) {
        child.geometry.dispose()
        if (child.material instanceof THREE.Material) {
          child.material.dispose()
        }
      }
    })
  })
  activeSelectionBoxes.clear()
  
  sceneObjects.devices.forEach((deviceGroup, deviceId) => {
    const isRelated = relatedDeviceIds.includes(deviceId)
    const isSelected = deviceId === selectedDeviceId

    // Reset edge highlighting on device
    deviceGroup.traverse((child) => {
      if (child instanceof THREE.LineSegments && child.userData.isOutline) {
        const mat = child.material as THREE.LineBasicMaterial
        const origColor = mat.userData?.originalColor ?? 0x333333
        const origOpacity = mat.userData?.originalOpacity ?? 0.5
        mat.color.setHex(origColor)
        mat.opacity = origOpacity
        mat.linewidth = 1
      }
      
      // Reset emissive on mesh
      if (child instanceof THREE.Mesh && child.userData.isMainMesh) {
        const mat = child.material as THREE.MeshStandardMaterial
        mat.emissive.setHex(0x000000)
        mat.emissiveIntensity = 0
      }
    })

    // Create animated selection box for selected/related devices
    if ((isSelected || isRelated) && scene) {
      const color = isSelected ? 0xffdd00 : 0x00ffff // Yellow for selected, cyan for related
      const selectionBox = createSelectionBox(color)
      updateSelectionBoxGeometry(selectionBox, deviceGroup, isSelected ? 0.04 : 0.03)
      
      scene.add(selectionBox)
      activeSelectionBoxes.set(deviceId, selectionBox)
    }
  })
}

// Update label visibility for racks
export function updateRackLabelVisibility(sceneObjects: SceneObjects, visible: boolean) {
  sceneObjects.racks.forEach((rackGroup) => {
    rackGroup.traverse((child) => {
      if (child instanceof THREE.Sprite) {
        const labelType = child.userData.type
        if (labelType === 'u-label' || labelType === 'front-back-label' || labelType === 'rack-label') {
          child.visible = visible
        }
      }
    })
  })
}
