// 4D Status and Phase Types
export type Status4D = "EXISTING_RETAINED" | "EXISTING_REMOVED" | "PROPOSED" | "FUTURE" | "MODIFIED"

export type Phase = "AS_IS" | "TO_BE" | "FUTURE"

export type ColorMode = "4D_STATUS" | "CUSTOMER" | "POWER"

export type SiteStatus = "AI_READY" | "IN_PROGRESS" | "LEGACY"

export type DeviceCategory = "RACK" | "SERVER" | "SWITCH" | "STORAGE" | "NETWORK"

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
  name: string
  transformInBuilding: Transform
}

export interface Building {
  glbUri: string
  transformWorld: Transform
}

export interface SceneConfig {
  siteId: string
  building: Building
  rooms: Room[]
  racks: Rack[]
  devices: Device[]
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
