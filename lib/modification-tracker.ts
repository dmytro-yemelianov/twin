import { generateId, readJSON, removeKey, writeJSON } from "./storage"
import type { Status4D, Phase } from "./types"

type ModificationType = "move" | "add" | "remove" | "edit"

export interface EquipmentModification {
  id: string
  timestamp: string
  type: ModificationType
  deviceId: string
  deviceName: string
  targetPhase?: Phase
  scheduledDate?: string
  isApplied?: boolean
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

function sanitizeModification(record: unknown): EquipmentModification | null {
  if (!record || typeof record !== "object") {
    return null
  }

  const raw = record as Record<string, any>
  if (
    typeof raw.id !== "string" ||
    typeof raw.timestamp !== "string" ||
    typeof raw.type !== "string" ||
    typeof raw.deviceId !== "string" ||
    typeof raw.deviceName !== "string"
  ) {
    return null
  }

  if (!["move", "add", "remove", "edit"].includes(raw.type)) {
    return null
  }

  const sanitizePosition = (value: any) => {
    if (!value || typeof value !== "object") return undefined
    const rackId = typeof value.rackId === "string" ? value.rackId : undefined
    const uPosition = typeof value.uPosition === "number" ? value.uPosition : Number(value.uPosition)
    if (!rackId || Number.isNaN(uPosition)) return undefined
    return { rackId, uPosition }
  }

  const statusChange =
    raw.statusChange &&
    typeof raw.statusChange === "object" &&
    typeof raw.statusChange.from === "string" &&
    typeof raw.statusChange.to === "string"
      ? {
          from: raw.statusChange.from as Status4D,
          to: raw.statusChange.to as Status4D,
        }
      : undefined

  return {
    id: raw.id,
    timestamp: raw.timestamp,
    type: raw.type as ModificationType,
    deviceId: raw.deviceId,
    deviceName: raw.deviceName,
    targetPhase: typeof raw.targetPhase === "string" ? raw.targetPhase as Phase : undefined,
    scheduledDate: typeof raw.scheduledDate === "string" ? raw.scheduledDate : undefined,
    isApplied: typeof raw.isApplied === "boolean" ? raw.isApplied : false,
    from: sanitizePosition(raw.from),
    to: sanitizePosition(raw.to),
    statusChange,
    notes: typeof raw.notes === "string" ? raw.notes : undefined,
  }
}

function readModifications(): EquipmentModification[] {
  const data = readJSON<unknown[]>(STORAGE_KEY, [])
  if (!Array.isArray(data)) return []
  return data.map((entry) => sanitizeModification(entry)).filter((entry): entry is EquipmentModification => Boolean(entry))
}

export function getModifications(): EquipmentModification[] {
  return readModifications()
}

export function addModification(mod: Omit<EquipmentModification, "id" | "timestamp">): EquipmentModification {
  const newModification: EquipmentModification = {
    ...mod,
    id: generateId("mod"),
    timestamp: new Date().toISOString(),
  }

  const existing = getModifications()
  const updated = [...existing, newModification]
  writeJSON(STORAGE_KEY, updated)

  return newModification
}

export function clearModifications(): void {
  removeKey(STORAGE_KEY)
}

export function getDeviceModifications(deviceId: string): EquipmentModification[] {
  return getModifications().filter((modification) => modification.deviceId === deviceId)
}
