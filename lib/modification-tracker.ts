import type { Status4D } from "./types"

export interface EquipmentModification {
  id: string
  timestamp: Date
  type: "move" | "add" | "remove" | "edit"
  deviceId: string
  deviceName: string
  from?: {
    rackId: string
    uPosition: number
  }
  to?: {
    rackId: string
    uPosition: number
  }
  statusChange?: {
    from: Status4D
    to: Status4D
  }
  notes?: string
}

const STORAGE_KEY = "dt_modifications"

/**
 * Get all modifications
 */
export function getModifications(): EquipmentModification[] {
  const data = localStorage.getItem(STORAGE_KEY)
  if (!data) return []
  return JSON.parse(data)
}

/**
 * Add a new modification
 */
export function addModification(mod: Omit<EquipmentModification, "id" | "timestamp">): EquipmentModification {
  const modification: EquipmentModification = {
    ...mod,
    id: `mod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date(),
  }

  const existing = getModifications()
  existing.push(modification)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(existing))

  return modification
}

/**
 * Clear all modifications (for demo reset)
 */
export function clearModifications(): void {
  localStorage.removeItem(STORAGE_KEY)
}

/**
 * Get modifications for a specific device
 */
export function getDeviceModifications(deviceId: string): EquipmentModification[] {
  const all = getModifications()
  return all.filter((m) => m.deviceId === deviceId)
}
