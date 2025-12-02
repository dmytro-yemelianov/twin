// 4D Status and Phase Types
export type Status4D = "EXISTING_RETAINED" | "EXISTING_REMOVED" | "PROPOSED" | "FUTURE" | "MODIFIED"

export type Phase = "AS_IS" | "TO_BE" | "FUTURE"

export type ColorMode = "4D_STATUS" | "CUSTOMER" | "POWER"

export type SiteStatus = "AI_READY" | "IN_PROGRESS" | "LEGACY"

export type DeviceCategory = "RACK" | "SERVER" | "SWITCH" | "STORAGE" | "NETWORK" | "GPU_SERVER" | "PDU" | "UPS" | "BLADE"

// Transform Types
export interface Transform {
  position: [number, number, number]
  rotationEuler: [number, number, number]
  scale: [number, number, number]
}

// Site Data
export interface Site {
  id: string
  name: string
  region: string
  lat: number
  lon: number
  rackCount: number
  aiReadyRacks: number
  status: SiteStatus
  sceneConfigUri: string
}

// Device Type
export interface DeviceType {
  id: string
  category: DeviceCategory
  modelRef: string
  uHeight: number
  name?: string
  description?: string
  powerKw?: number
  btuHr?: number
  gpuSlots?: number
}

// Scene Config Types
export interface Device {
  id: string
  logicalEquipmentId: string
  rackId: string
  deviceTypeId: string
  name: string
  uStart: number
  uHeight: number
  status4D: Status4D
  powerKw: number
}

export interface Rack {
  id: string
  roomId: string
  name: string
  uHeight: number
  positionInRoom: Transform
  powerKwLimit: number
  currentPowerKw: number
}

export interface Room {
  id: string
  floorId?: string // optional for backward compatibility
  name: string
  transformInBuilding: Transform
  area?: number // square meters
}

export interface Floor {
  id: string
  buildingId: string
  name: string
  level: number // floor number (0 = ground, -1 = basement, etc.)
  elevation?: number // height in meters
}

export interface BuildingInfo {
  id: string
  siteId: string
  name: string
  glbUri: string
  transformWorld: Transform
  floors?: number
  area?: number // square meters
}

// Legacy Building type for backward compatibility
export interface Building {
  glbUri: string
  transformWorld: Transform
}

export interface SceneConfig {
  siteId: string
  building: Building
  buildings?: BuildingInfo[]
  floors?: Floor[]
  rooms: Room[]
  racks: Rack[]
  devices: Device[]
}

// Hierarchy node types for navigation
export type HierarchyNodeType = 'region' | 'site' | 'building' | 'floor' | 'room' | 'rack' | 'device'

export interface HierarchyNode {
  id: string
  type: HierarchyNodeType
  name: string
  parentId: string | null
  children?: string[]
  data?: any
}

// Phase Visibility Map
export const phaseVisibilityMap: Record<Phase, Status4D[]> = {
  AS_IS: ["EXISTING_RETAINED", "EXISTING_REMOVED"],
  TO_BE: ["EXISTING_RETAINED", "PROPOSED", "MODIFIED"],
  FUTURE: ["EXISTING_RETAINED", "PROPOSED", "FUTURE", "MODIFIED"],
}

// 4D Status Colors
export const status4DColors: Record<Status4D, string> = {
  EXISTING_RETAINED: "#71717a", // neutral grey
  EXISTING_REMOVED: "#ef4444", // red
  PROPOSED: "#22c55e", // green
  FUTURE: "#3b82f6", // blue
  MODIFIED: "#a855f7", // purple
}

// Status Display Names
export const status4DLabels: Record<Status4D, string> = {
  EXISTING_RETAINED: "Existing To Be Retained",
  EXISTING_REMOVED: "Existing To Be Removed",
  PROPOSED: "Proposed",
  FUTURE: "Future",
  MODIFIED: "Modified",
}

// AI Capacity Suggestion Result
export interface AICapacitySuggestion {
  rackIds: string[]
  totalFreeU: number
  totalPowerHeadroomKw: number
  summary: string
}
