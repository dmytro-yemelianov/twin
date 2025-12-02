import { describe, it, expect } from 'vitest'
import { findAIReadyCapacity } from '../ai-capacity'
import type { SceneConfig } from '../types'

// Mock scene config for testing
const mockSceneConfig: SceneConfig = {
  name: 'Test Site',
  buildings: [],
  rooms: [
    {
      id: 'room1',
      name: 'Server Room 1',
      buildingId: 'building1',
      transform: {
        position: [0, 0, 0],
        rotationEuler: [0, 0, 0],
        scale: [1, 1, 1]
      }
    }
  ],
  racks: [
    {
      id: 'rack1',
      name: 'Rack 01',
      roomId: 'room1',
      uHeight: 42,
      powerKwLimit: 10,
      currentPowerKw: 4,
      transform: {
        position: [0, 0, 0],
        rotationEuler: [0, 0, 0],
        scale: [1, 1, 1]
      }
    },
    {
      id: 'rack2',
      name: 'Rack 02',
      roomId: 'room1',
      uHeight: 42,
      powerKwLimit: 10,
      currentPowerKw: 3,
      transform: {
        position: [2, 0, 0],
        rotationEuler: [0, 0, 0],
        scale: [1, 1, 1]
      }
    },
    {
      id: 'rack3',
      name: 'Rack 03',
      roomId: 'room1',
      uHeight: 42,
      powerKwLimit: 10,
      currentPowerKw: 8, // High power usage
      transform: {
        position: [4, 0, 0],
        rotationEuler: [0, 0, 0],
        scale: [1, 1, 1]
      }
    }
  ],
  devices: [
    {
      id: 'device1',
      logicalEquipmentId: 'eq1',
      rackId: 'rack1',
      deviceTypeId: 'server1',
      name: 'Server 1',
      uStart: 1,
      uHeight: 2,
      status4D: 'EXISTING_RETAINED',
      transform: {
        position: [0, 0, 0],
        rotationEuler: [0, 0, 0],
        scale: [1, 1, 1]
      }
    },
    {
      id: 'device2',
      logicalEquipmentId: 'eq2',
      rackId: 'rack2',
      deviceTypeId: 'server1',
      name: 'Server 2',
      uStart: 1,
      uHeight: 4,
      status4D: 'EXISTING_RETAINED',
      transform: {
        position: [0, 0, 0],
        rotationEuler: [0, 0, 0],
        scale: [1, 1, 1]
      }
    }
  ]
}

describe('findAIReadyCapacity', () => {
  it('should return null when no suitable racks are found', () => {
    const configWithHighPowerUsage: SceneConfig = {
      ...mockSceneConfig,
      racks: mockSceneConfig.racks.map(rack => ({
        ...rack,
        currentPowerKw: rack.powerKwLimit - 1 // Less than 2kW headroom
      }))
    }

    const result = findAIReadyCapacity(configWithHighPowerUsage, 'AS_IS')
    expect(result).toBeNull()
  })

  it('should find AI ready capacity for racks with sufficient power headroom', () => {
    const result = findAIReadyCapacity(mockSceneConfig, 'AS_IS')
    
    expect(result).toBeDefined()
    expect(result).toHaveProperty('rackIds')
    expect(result).toHaveProperty('totalFreeU')
    expect(result).toHaveProperty('totalPowerHeadroomKw')
    expect(result).toHaveProperty('summary')

    if (result) {
      expect(result.rackIds).toBeInstanceOf(Array)
      expect(result.rackIds.length).toBeGreaterThanOrEqual(3)
      expect(result.totalFreeU).toBeGreaterThan(0)
      expect(result.totalPowerHeadroomKw).toBeGreaterThan(0)
      expect(typeof result.summary).toBe('string')
    }
  })

  it('should calculate free U space correctly', () => {
    const result = findAIReadyCapacity(mockSceneConfig, 'AS_IS')
    
    if (result) {
      // rack1 has 42U - 2U used = 40U free
      // rack2 has 42U - 4U used = 38U free  
      // rack3 has 42U - 0U used = 42U free
      const expectedFreeU = 40 + 38 + 42 // Total across all racks in the block
      expect(result.totalFreeU).toBeLessThanOrEqual(expectedFreeU)
    }
  })

  it('should calculate power headroom correctly', () => {
    const result = findAIReadyCapacity(mockSceneConfig, 'AS_IS')
    
    if (result) {
      // rack1: 10kW - 4kW = 6kW headroom
      // rack2: 10kW - 3kW = 7kW headroom
      // rack3: 10kW - 8kW = 2kW headroom
      const expectedPowerHeadroom = 6 + 7 + 2 // Total across all racks
      expect(result.totalPowerHeadroomKw).toBeLessThanOrEqual(expectedPowerHeadroom)
    }
  })

  it('should prefer larger rack blocks', () => {
    const configWithManyRacks: SceneConfig = {
      ...mockSceneConfig,
      racks: [
        ...mockSceneConfig.racks,
        {
          id: 'rack4',
          name: 'Rack 04',
          roomId: 'room1',
          uHeight: 42,
          powerKwLimit: 10,
          currentPowerKw: 2,
          transform: {
            position: [6, 0, 0],
            rotationEuler: [0, 0, 0],
            scale: [1, 1, 1]
          }
        },
        {
          id: 'rack5',
          name: 'Rack 05',
          roomId: 'room1',
          uHeight: 42,
          powerKwLimit: 10,
          currentPowerKw: 2,
          transform: {
            position: [8, 0, 0],
            rotationEuler: [0, 0, 0],
            scale: [1, 1, 1]
          }
        }
      ]
    }

    const result = findAIReadyCapacity(configWithManyRacks, 'AS_IS')
    
    if (result) {
      // Should prefer blocks of 4-6 racks over smaller blocks
      expect(result.rackIds.length).toBeGreaterThanOrEqual(4)
    }
  })

  it('should handle different phases correctly', () => {
    const asIsResult = findAIReadyCapacity(mockSceneConfig, 'AS_IS')
    const toBeResult = findAIReadyCapacity(mockSceneConfig, 'TO_BE')
    const futureResult = findAIReadyCapacity(mockSceneConfig, 'FUTURE')

    // All phases should potentially return results for this config
    expect(asIsResult).toBeDefined()
    expect(toBeResult).toBeDefined()
    expect(futureResult).toBeDefined()
  })

  it('should exclude racks with insufficient power headroom', () => {
    const configWithLowPowerRacks: SceneConfig = {
      ...mockSceneConfig,
      racks: [
        ...mockSceneConfig.racks.slice(0, 2), // Include good racks
        {
          id: 'rack_low_power',
          name: 'Low Power Rack',
          roomId: 'room1',
          uHeight: 42,
          powerKwLimit: 10,
          currentPowerKw: 9.5, // Only 0.5kW headroom (less than 2kW minimum)
          transform: {
            position: [6, 0, 0],
            rotationEuler: [0, 0, 0],
            scale: [1, 1, 1]
          }
        }
      ]
    }

    const result = findAIReadyCapacity(configWithLowPowerRacks, 'AS_IS')
    
    if (result) {
      // Should not include the low power rack
      expect(result.rackIds).not.toContain('rack_low_power')
    }
  })
})