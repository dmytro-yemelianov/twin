import type { Rack, SceneConfig, AICapacitySuggestion, Phase } from "./types"
import { phaseVisibilityMap } from "./types"

export function findAIReadyCapacity(sceneConfig: SceneConfig, currentPhase: Phase): AICapacitySuggestion | null {
  const { racks, devices } = sceneConfig

  // Get allowed statuses for current phase
  const allowedStatuses = phaseVisibilityMap[currentPhase]

  // Group racks by room
  const racksByRoom: Record<string, Rack[]> = {}
  racks.forEach((rack) => {
    if (!racksByRoom[rack.roomId]) {
      racksByRoom[rack.roomId] = []
    }
    racksByRoom[rack.roomId].push(rack)
  })

  // Sort racks within each room by name
  Object.values(racksByRoom).forEach((roomRacks) => {
    roomRacks.sort((a, b) => a.name.localeCompare(b.name))
  })

  let bestBlock: AICapacitySuggestion | null = null
  let bestScore = -1

  // Try each room
  for (const roomRacks of Object.values(racksByRoom)) {
    // Try blocks of 3 to 6 contiguous racks
    for (let blockSize = 3; blockSize <= Math.min(6, roomRacks.length); blockSize++) {
      for (let start = 0; start <= roomRacks.length - blockSize; start++) {
        const blockRacks = roomRacks.slice(start, start + blockSize)
        const blockRackIds = blockRacks.map((r) => r.id)

        let totalFreeU = 0
        let totalPowerHeadroomKw = 0

        // Calculate metrics for each rack in the block
        blockRacks.forEach((rack) => {
          // Calculate used U in this rack (only for visible devices)
          const rackDevices = devices.filter((d) => d.rackId === rack.id && allowedStatuses.includes(d.status4D))
          const usedU = rackDevices.reduce((sum, d) => sum + d.uHeight, 0)
          const freeU = rack.uHeight - usedU

          // Calculate power headroom
          const powerHeadroomKw = rack.powerKwLimit - rack.currentPowerKw

          totalFreeU += freeU
          totalPowerHeadroomKw += powerHeadroomKw
        })

        // Score: prioritize free U space and adequate power headroom
        // Only consider blocks with at least 20% power headroom
        const avgPowerHeadroom = totalPowerHeadroomKw / blockSize
        if (avgPowerHeadroom < 2.0) {
          continue // Skip blocks with insufficient power headroom
        }

        const score = totalFreeU + totalPowerHeadroomKw * 5 // Weight power more heavily

        if (score > bestScore) {
          bestScore = score
          bestBlock = {
            rackIds: blockRackIds,
            totalFreeU,
            totalPowerHeadroomKw,
            summary: `${blockSize} racks can host ${totalFreeU}U of AI servers with ${totalPowerHeadroomKw.toFixed(1)}kW power headroom available.`,
          }
        }
      }
    }
  }

  return bestBlock
}
