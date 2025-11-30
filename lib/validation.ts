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

  // Check U position range
  const maxU = targetRack.uHeight || 42
  if (targetUPosition < 1 || targetUPosition > maxU) {
    result.valid = false
    result.errors.push(`U position must be between 1 and ${maxU}`)
    return result
  }

  // Check if device fits (considering height in U)
  const deviceHeight = device.uHeight || 1
  if (targetUPosition + deviceHeight - 1 > maxU) {
    result.valid = false
    result.errors.push(`Device requires ${deviceHeight}U but would exceed rack height`)
    return result
  }

  // Check for conflicts with existing devices in target rack
  const devicesInRack = allDevices.filter(
    (d) =>
      d.rackId === targetRackId &&
      d.id !== device.id && // Exclude the device being moved
      d.status !== "removed", // Ignore removed devices
  )

  for (const existing of devicesInRack) {
    const existingHeight = existing.uHeight || 1
    const existingEnd = existing.uPosition + existingHeight - 1
    const newEnd = targetUPosition + deviceHeight - 1

    // Check for overlap
    if (
      (targetUPosition >= existing.uPosition && targetUPosition <= existingEnd) ||
      (newEnd >= existing.uPosition && newEnd <= existingEnd) ||
      (targetUPosition <= existing.uPosition && newEnd >= existingEnd)
    ) {
      result.valid = false
      result.errors.push(`Conflict with ${existing.name} at U${existing.uPosition}-${existingEnd}`)
    }
  }

  // Warnings for power/cooling considerations
  if (device.deviceTypeId?.includes("gpu") && targetRack.powerCapacity) {
    result.warnings.push("GPU servers require high power - verify rack capacity")
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

  const maxU = rack.uHeight || 42
  const available: number[] = []

  const devicesInRack = allDevices.filter((d) => d.rackId === rackId && d.status !== "removed")

  for (let u = 1; u <= maxU - deviceHeight + 1; u++) {
    let isAvailable = true

    for (const device of devicesInRack) {
      const deviceEnd = device.uPosition + (device.uHeight || 1) - 1
      const proposedEnd = u + deviceHeight - 1

      if (
        (u >= device.uPosition && u <= deviceEnd) ||
        (proposedEnd >= device.uPosition && proposedEnd <= deviceEnd) ||
        (u <= device.uPosition && proposedEnd >= deviceEnd)
      ) {
        isAvailable = false
        break
      }
    }

    if (isAvailable) {
      available.push(u)
    }
  }

  return available
}
