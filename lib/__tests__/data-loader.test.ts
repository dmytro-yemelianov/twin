import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { loadSites, loadDeviceTypes, loadSceneConfig } from '../data-loader'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('data-loader', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Clear any existing cache
    vi.resetModules()
  })

  afterEach(() => {
    vi.clearAllTimers()
  })

  describe('loadSites', () => {
    it('should fetch and return sites data', async () => {
      const mockSitesData = {
        sites: [
          {
            id: 'site1',
            name: 'Test Site 1',
            region: 'US-East',
            lat: 40.7128,
            lon: -74.0060,
            rackCount: 100,
            aiReadyRacks: 25,
            status: 'AI_READY',
            sceneConfigUri: '/data/configs/site1.json'
          }
        ]
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSitesData
      })

      const result = await loadSites()
      
      expect(mockFetch).toHaveBeenCalledWith('/data/sites.json', { signal: undefined })
      expect(result).toEqual(mockSitesData.sites)
    })

    it('should throw error when fetch fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        url: '/data/sites.json'
      })

      await expect(loadSites()).rejects.toThrow('Failed to fetch /data/sites.json')
    })

    it('should use AbortSignal when provided', async () => {
      const controller = new AbortController()
      const signal = controller.signal

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ sites: [] })
      })

      await loadSites(signal)
      
      expect(mockFetch).toHaveBeenCalledWith('/data/sites.json', { signal })
    })

    it('should cache results for subsequent calls', async () => {
      const mockData = { sites: [{ id: 'test' }] }
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockData
      })

      // First call
      const result1 = await loadSites()
      
      // Second call should use cache
      const result2 = await loadSites()
      
      expect(mockFetch).toHaveBeenCalledTimes(1)
      expect(result1).toEqual(result2)
    })
  })

  describe('loadDeviceTypes', () => {
    it('should fetch and return device types data', async () => {
      const mockDeviceTypesData = {
        deviceTypes: [
          {
            id: 'server1',
            category: 'SERVER',
            modelRef: '/models/server.glb',
            uHeight: 2,
            name: 'Standard Server',
            description: 'A standard 2U server'
          }
        ]
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockDeviceTypesData
      })

      const result = await loadDeviceTypes()
      
      expect(mockFetch).toHaveBeenCalledWith('/data/device-types.json', { signal: undefined })
      expect(result).toEqual(mockDeviceTypesData.deviceTypes)
    })

    it('should handle fetch errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      await expect(loadDeviceTypes()).rejects.toThrow('Network error')
    })
  })

  describe('loadSceneConfig', () => {
    it('should fetch and return scene config data', async () => {
      const mockSceneConfig = {
        name: 'Test Site Scene',
        buildings: [],
        rooms: [],
        racks: [],
        devices: []
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSceneConfig
      })

      const uri = '/data/configs/test-site.json'
      const result = await loadSceneConfig(uri)
      
      expect(mockFetch).toHaveBeenCalledWith(uri, { signal: undefined })
      expect(result).toEqual(mockSceneConfig)
    })

    it('should cache scene configs by URI', async () => {
      const mockData = { name: 'Test', buildings: [], rooms: [], racks: [], devices: [] }
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockData
      })

      const uri = '/data/configs/test.json'
      
      // First call
      await loadSceneConfig(uri)
      
      // Second call should use cache
      const result2 = await loadSceneConfig(uri)
      
      expect(mockFetch).toHaveBeenCalledTimes(1)
      expect(result2).toEqual(mockData)
    })

    it('should handle different URIs separately', async () => {
      const mockData1 = { name: 'Site1', buildings: [], rooms: [], racks: [], devices: [] }
      const mockData2 = { name: 'Site2', buildings: [], rooms: [], racks: [], devices: [] }
      
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockData1
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockData2
        })

      const result1 = await loadSceneConfig('/data/configs/site1.json')
      const result2 = await loadSceneConfig('/data/configs/site2.json')
      
      expect(mockFetch).toHaveBeenCalledTimes(2)
      expect(result1.name).toBe('Site1')
      expect(result2.name).toBe('Site2')
    })
  })

  describe('caching behavior', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should respect cache TTL', async () => {
      const mockData = { sites: [{ id: 'test' }] }
      
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockData
      })

      // First call
      await loadSites()
      
      // Advance time by 6 minutes (past TTL of 5 minutes)
      vi.advanceTimersByTime(6 * 60 * 1000)
      
      // Second call should fetch again
      await loadSites()
      
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })

    it('should use cache within TTL window', async () => {
      const mockData = { sites: [{ id: 'test' }] }
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockData
      })

      // First call
      await loadSites()
      
      // Advance time by 2 minutes (within TTL)
      vi.advanceTimersByTime(2 * 60 * 1000)
      
      // Second call should use cache
      await loadSites()
      
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })
  })
})