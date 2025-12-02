import { describe, it, expect, beforeEach } from 'vitest'
import { useAppStore } from '../app-store'
import type { Site, Status4D } from '../../types'

// Mock site data
const mockSite: Site = {
  id: 'site1',
  name: 'Test Site',
  region: 'US-East',
  lat: 40.7128,
  lon: -74.0060,
  rackCount: 100,
  aiReadyRacks: 25,
  status: 'AI_READY',
  sceneConfigUri: '/data/configs/site1.json'
}

describe('useAppStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useAppStore.getState().setSites([])
    useAppStore.getState().selectSite(null)
    useAppStore.getState().resetSelection()
    useAppStore.getState().resetViewState()
  })

  describe('site management', () => {
    it('should set sites correctly', () => {
      const store = useAppStore.getState()
      const sites = [mockSite]
      
      store.setSites(sites)
      
      expect(useAppStore.getState().sites).toEqual(sites)
    })

    it('should select site and set view to twin', () => {
      const store = useAppStore.getState()
      
      store.selectSite(mockSite)
      
      expect(useAppStore.getState().selectedSite).toEqual(mockSite)
      expect(useAppStore.getState().currentView).toBe('twin')
    })

    it('should clear selection when null is passed', () => {
      const store = useAppStore.getState()
      
      // First select a site
      store.selectSite(mockSite)
      expect(useAppStore.getState().selectedSite).toEqual(mockSite)
      
      // Then clear selection
      store.selectSite(null)
      expect(useAppStore.getState().selectedSite).toBeNull()
    })
  })

  describe('view state management', () => {
    it('should change current view', () => {
      const store = useAppStore.getState()
      
      store.setCurrentView('map')
      expect(useAppStore.getState().currentView).toBe('map')
      
      store.setCurrentView('documents')
      expect(useAppStore.getState().currentView).toBe('documents')
      
      store.setCurrentView('models')
      expect(useAppStore.getState().currentView).toBe('models')
    })

    it('should change current phase', () => {
      const store = useAppStore.getState()
      
      store.setCurrentPhase('TO_BE')
      expect(useAppStore.getState().currentPhase).toBe('TO_BE')
      
      store.setCurrentPhase('FUTURE')
      expect(useAppStore.getState().currentPhase).toBe('FUTURE')
    })

    it('should change color mode', () => {
      const store = useAppStore.getState()
      
      store.setColorMode('CUSTOMER')
      expect(useAppStore.getState().colorMode).toBe('CUSTOMER')
      
      store.setColorMode('POWER')
      expect(useAppStore.getState().colorMode).toBe('POWER')
    })
  })

  describe('status visibility', () => {
    it('should toggle individual status visibility', () => {
      const store = useAppStore.getState()
      const initialVisibility = store.statusVisibility.EXISTING_RETAINED
      
      store.setStatusVisibility('EXISTING_RETAINED', !initialVisibility)
      
      expect(useAppStore.getState().statusVisibility.EXISTING_RETAINED).toBe(!initialVisibility)
    })

    it('should set all status visibility', () => {
      const store = useAppStore.getState()
      
      store.setAllStatusVisibility(false)
      
      const allStatuses = Object.values(useAppStore.getState().statusVisibility)
      expect(allStatuses.every(visible => visible === false)).toBe(true)
      
      store.setAllStatusVisibility(true)
      
      const allStatusesAgain = Object.values(useAppStore.getState().statusVisibility)
      expect(allStatusesAgain.every(visible => visible === true)).toBe(true)
    })
  })

  describe('selection management', () => {
    it('should select device and clear rack selection', () => {
      const store = useAppStore.getState()
      
      // First select a rack
      store.selectRack('rack1')
      expect(useAppStore.getState().selectedRackId).toBe('rack1')
      
      // Then select a device - should clear rack
      store.selectDevice('device1')
      expect(useAppStore.getState().selectedDeviceId).toBe('device1')
      expect(useAppStore.getState().selectedRackId).toBeNull()
    })

    it('should select rack and clear device selection', () => {
      const store = useAppStore.getState()
      
      // First select a device
      store.selectDevice('device1')
      expect(useAppStore.getState().selectedDeviceId).toBe('device1')
      
      // Then select a rack - should clear device
      store.selectRack('rack1')
      expect(useAppStore.getState().selectedRackId).toBe('rack1')
      expect(useAppStore.getState().selectedDeviceId).toBeNull()
    })

    it('should reset all selections', () => {
      const store = useAppStore.getState()
      
      // Set some selections
      store.selectDevice('device1')
      store.setHighlightedRacks(['rack1', 'rack2'])
      
      // Reset
      store.resetSelection()
      
      expect(useAppStore.getState().selectedDeviceId).toBeNull()
      expect(useAppStore.getState().selectedRackId).toBeNull()
      expect(useAppStore.getState().highlightedRacks).toEqual([])
    })
  })

  describe('UI state management', () => {
    it('should toggle building visibility', () => {
      const store = useAppStore.getState()
      const initialValue = store.showBuilding
      
      store.setShowBuilding(!initialValue)
      expect(useAppStore.getState().showBuilding).toBe(!initialValue)
    })

    it('should toggle xray mode', () => {
      const store = useAppStore.getState()
      
      store.setXrayMode(true)
      expect(useAppStore.getState().xrayMode).toBe(true)
      
      store.setXrayMode(false)
      expect(useAppStore.getState().xrayMode).toBe(false)
    })

    it('should manage drawer states', () => {
      const store = useAppStore.getState()
      
      store.setShowSitesDrawer(true)
      expect(useAppStore.getState().showSitesDrawer).toBe(true)
      
      store.setShowDetailsDrawer(true)
      expect(useAppStore.getState().showDetailsDrawer).toBe(true)
      
      store.setShowSitesDrawer(false)
      store.setShowDetailsDrawer(false)
      expect(useAppStore.getState().showSitesDrawer).toBe(false)
      expect(useAppStore.getState().showDetailsDrawer).toBe(false)
    })
  })

  describe('AI capacity management', () => {
    it('should set AI capacity suggestion and highlighted racks', () => {
      const store = useAppStore.getState()
      const mockSuggestion = {
        rackIds: ['rack1', 'rack2'],
        totalFreeU: 80,
        totalPowerHeadroomKw: 15,
        summary: 'Test suggestion'
      }
      
      store.setAiCapacitySuggestion(mockSuggestion)
      store.setHighlightedRacks(mockSuggestion.rackIds)
      
      expect(useAppStore.getState().aiCapacitySuggestion).toEqual(mockSuggestion)
      expect(useAppStore.getState().highlightedRacks).toEqual(['rack1', 'rack2'])
    })

    it('should clear AI capacity suggestion', () => {
      const store = useAppStore.getState()
      const mockSuggestion = {
        rackIds: ['rack1'],
        totalFreeU: 40,
        totalPowerHeadroomKw: 8,
        summary: 'Test'
      }
      
      // Set suggestion
      store.setAiCapacitySuggestion(mockSuggestion)
      expect(useAppStore.getState().aiCapacitySuggestion).toEqual(mockSuggestion)
      
      // Clear suggestion
      store.setAiCapacitySuggestion(null)
      expect(useAppStore.getState().aiCapacitySuggestion).toBeNull()
    })
  })

  describe('loading states', () => {
    it('should manage loading states', () => {
      const store = useAppStore.getState()
      
      store.setIsLoading(true)
      expect(useAppStore.getState().isLoading).toBe(true)
      
      store.setIsSceneLoading(true)
      expect(useAppStore.getState().isSceneLoading).toBe(true)
      
      store.setIsLoading(false)
      store.setIsSceneLoading(false)
      expect(useAppStore.getState().isLoading).toBe(false)
      expect(useAppStore.getState().isSceneLoading).toBe(false)
    })
  })

  describe('reset functions', () => {
    it('should reset view state to defaults', () => {
      const store = useAppStore.getState()
      
      // Change some values
      store.setCurrentPhase('FUTURE')
      store.setColorMode('POWER')
      store.setStatusVisibility('EXISTING_RETAINED', false)
      store.setShowBuilding(false)
      store.setXrayMode(true)
      
      // Reset
      store.resetViewState()
      
      // Check defaults
      expect(useAppStore.getState().currentPhase).toBe('AS_IS')
      expect(useAppStore.getState().colorMode).toBe('4D_STATUS')
      expect(useAppStore.getState().showBuilding).toBe(true)
      expect(useAppStore.getState().xrayMode).toBe(false)
      // Status visibility should be reset to initial state
      expect(useAppStore.getState().statusVisibility.EXISTING_RETAINED).toBe(true)
    })
  })
})