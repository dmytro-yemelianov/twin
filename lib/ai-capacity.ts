import type { Rack, SceneConfig, AICapacitySuggestion, Phase } from "./types"
import { phaseVisibilityMap } from "./types"

export function findAIReadyCapacity(sceneConfig: SceneConfig, currentPhase: Phase): AICapacitySuggestion | null {
  const { racks, devices } = sceneConfig
  const allowedStatuses = new Set(phaseVisibilityMap[currentPhase])

  const racksByRoom: Record<string, Rack[]> = {}
  racks.forEach((rack) => {
    if (!racksByRoom[rack.roomId]) {
      racksByRoom[rack.roomId] = []
    }
    racksByRoom[rack.roomId].push(rack)
  })
  Object.values(racksByRoom).forEach((roomRacks) => roomRacks.sort((a, b) => a.name.localeCompare(b.name)))

  const devicesByRack = devices.reduce<Record<string, typeof devices>>((acc, device) => {
    if (!allowedStatuses.has(device.status4D)) {
      return acc
    }
    if (!acc[device.rackId]) {
      acc[device.rackId] = []
    }
    acc[device.rackId].push(device)
    return acc
  }, {})

  const rackMetrics = new Map<
    string,
    {
      freeU: number
      powerHeadroom: number
    }
  >()

  racks.forEach((rack) => {
    const rackDevices = devicesByRack[rack.id] ?? []
    const usedU = rackDevices.reduce((sum, d) => sum + d.uHeight, 0)
    rackMetrics.set(rack.id, {
      freeU: Math.max(0, rack.uHeight - usedU),
      powerHeadroom: Math.max(0, rack.powerKwLimit - rack.currentPowerKw),
    })
  })

  let bestBlock: AICapacitySuggestion | null = null
  let bestScore = -1

  for (const roomRacks of Object.values(racksByRoom)) {
    for (let blockSize = 3; blockSize <= Math.min(6, roomRacks.length); blockSize++) {
      for (let start = 0; start <= roomRacks.length - blockSize; start++) {
        const blockRacks = roomRacks.slice(start, start + blockSize)

        const totals = blockRacks.reduce(
          (acc, rack) => {
            const metrics = rackMetrics.get(rack.id)
            if (!metrics) return acc
            acc.freeU += metrics.freeU
            acc.power += metrics.powerHeadroom
            return acc
          },
          { freeU: 0, power: 0 },
        )

        const avgPowerHeadroom = totals.power / blockSize
        if (avgPowerHeadroom < 2) {
          continue
        }

        const score = totals.freeU + totals.power * 5
        if (score > bestScore) {
          bestScore = score
          bestBlock = {
            rackIds: blockRacks.map((rack) => rack.id),
            totalFreeU: totals.freeU,
            totalPowerHeadroomKw: totals.power,
            summary: `${blockSize} racks can host ${totals.freeU}U of AI servers with ${totals.power.toFixed(1)}kW power headroom available.`,
          }
        }
      }
    }
  }

  return bestBlock
}
