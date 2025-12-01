import type { Device, Rack } from "./types"

export interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

/**
 * Validate if a device can be placed at a specific U position in a rack
 */
export function validateDevicePlacement(
  device: Device,
  targetRackId: string,
  targetUPosition: number,
  allDevices: Device[],
  racks: Rack[],
): ValidationResult {
  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
  }

  const targetRack = racks.find((r) => r.id === targetRackId)
  if (!targetRack) {
    result.valid = false
    result.errors.push("Target rack not found")
    return result
  }

  const maxU = targetRack.uHeight || 42
  if (targetUPosition < 1 || targetUPosition > maxU) {
    result.valid = false
    result.errors.push(`U position must be between 1 and ${maxU}`)
    return result
  }

  const deviceHeight = Math.max(1, device.uHeight || 1)
  if (targetUPosition + deviceHeight - 1 > maxU) {
    result.valid = false
    result.errors.push(`Device requires ${deviceHeight}U but would exceed rack height`)
    return result
  }

  const devicesInRack = allDevices.filter(
    (d) => d.rackId === targetRackId && d.id !== device.id && d.status4D !== "EXISTING_REMOVED",
  )
  const newDeviceEnd = targetUPosition + deviceHeight - 1

  for (const existing of devicesInRack) {
    const existingStart = existing.uStart || 1
    const existingHeight = Math.max(1, existing.uHeight || 1)
    const existingEnd = existingStart + existingHeight - 1

    if (rangesOverlap(existingStart, existingEnd, targetUPosition, newDeviceEnd)) {
      result.valid = false
      result.errors.push(`Conflict with ${existing.name} at U${existingStart}-${existingEnd}`)
    }
  }

  // Warn when the move pushes the rack near or beyond its power limits
  const baseRackLoad = targetRack.currentPowerKw - (device.rackId === targetRackId ? device.powerKw : 0)
  const projectedRackLoad = baseRackLoad + device.powerKw
  if (targetRack.powerKwLimit > 0) {
    if (projectedRackLoad > targetRack.powerKwLimit) {
      result.warnings.push("Projected move exceeds rack power capacity")
    } else if (projectedRackLoad / targetRack.powerKwLimit > 0.9) {
      result.warnings.push("Rack will operate within 10% of its power limit")
    }
  } else {
    result.warnings.push("Rack power limit is not configured")
  }

  if (device.deviceTypeId && device.deviceTypeId.toLowerCase().includes("gpu")) {
    result.warnings.push("GPU devices may require enhanced cooling and power redundancy")
  }

  return result
}

/**
 * Get available U positions in a rack
 */
export function getAvailableUPositions(
  rackId: string,
  deviceHeight: number,
  allDevices: Device[],
  racks: Rack[],
): number[] {
  const rack = racks.find((r) => r.id === rackId)
  if (!rack) return []

  const sanitizedHeight = Math.max(1, deviceHeight)
  const maxU = rack.uHeight || 42
  const available: number[] = []

  const ranges = allDevices
    .filter((device) => device.rackId === rackId && device.status4D !== "EXISTING_REMOVED")
    .map((device) => {
      const start = device.uStart || 1
      const height = Math.max(1, device.uHeight || 1)
      return { start, end: start + height - 1 }
    })

  for (let u = 1; u <= maxU - sanitizedHeight + 1; u += 1) {
    const proposedEnd = u + sanitizedHeight - 1
    const hasConflict = ranges.some((range) => rangesOverlap(range.start, range.end, u, proposedEnd))
    if (!hasConflict) {
      available.push(u)
    }
  }

  return available
}

function rangesOverlap(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart <= bEnd && bStart <= aEnd
}

