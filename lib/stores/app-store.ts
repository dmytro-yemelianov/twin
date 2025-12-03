import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import type { Site, Phase, Status4D, ColorMode, SceneConfig, DeviceType, AICapacitySuggestion } from '@/lib/types'

interface AppState {
  // Site Management
  sites: Site[]
  selectedSite: Site | null
  setSites: (sites: Site[]) => void
  selectSite: (site: Site | null) => void

  // Scene Configuration
  sceneConfig: SceneConfig | null
  deviceTypes: DeviceType[]
  setSceneConfig: (config: SceneConfig | null) => void
  setDeviceTypes: (types: DeviceType[]) => void

  // View State
  currentView: 'map' | 'documents' | 'models' | 'twin'
  setCurrentView: (view: 'map' | 'documents' | 'models' | 'twin') => void

  // Phase Management
  currentPhase: Phase
  setCurrentPhase: (phase: Phase) => void

  // Status Visibility
  statusVisibility: Record<Status4D, boolean>
  setStatusVisibility: (status: Status4D, visible: boolean) => void
  setAllStatusVisibility: (visible: boolean) => void

  // Color Mode
  colorMode: ColorMode
  setColorMode: (mode: ColorMode) => void

  // Selection State
  selectedBuildingId: string | null
  selectedFloorId: string | null
  selectedRoomId: string | null
  selectedRackId: string | null
  selectedDeviceId: string | null
  selectBuilding: (buildingId: string | null) => void
  selectFloor: (floorId: string | null) => void
  selectRoom: (roomId: string | null) => void
  selectRack: (rackId: string | null) => void
  selectDevice: (deviceId: string | null) => void

  // AI Capacity
  aiCapacitySuggestion: AICapacitySuggestion | null
  highlightedRacks: string[]
  setAiCapacitySuggestion: (suggestion: AICapacitySuggestion | null) => void
  setHighlightedRacks: (rackIds: string[]) => void

  // UI State
  showBuilding: boolean
  xrayMode: boolean
  showOrigin: boolean
  showCompass: boolean
  currentView3D: string
  showInventory: boolean
  showSitesDrawer: boolean
  showDetailsDrawer: boolean
  setShowBuilding: (show: boolean) => void
  setXrayMode: (enabled: boolean) => void
  setShowOrigin: (show: boolean) => void
  setShowCompass: (show: boolean) => void
  setCurrentView3D: (view: string) => void
  setShowInventory: (show: boolean) => void
  setShowSitesDrawer: (show: boolean) => void
  setShowDetailsDrawer: (show: boolean) => void

  // Loading States
  isLoading: boolean
  isSceneLoading: boolean
  setIsLoading: (loading: boolean) => void
  setIsSceneLoading: (loading: boolean) => void

  // Reset Functions
  resetSelection: () => void
  resetViewState: () => void
}

const initialStatusVisibility: Record<Status4D, boolean> = {
  EXISTING_RETAINED: true,
  EXISTING_REMOVED: true,
  PROPOSED: true,
  FUTURE: true,
  MODIFIED: true,
}

export const useAppStore = create<AppState>()(
  devtools(
    persist(
      immer((set) => ({
        // Site Management
        sites: [],
        selectedSite: null,
        setSites: (sites) =>
          set((state) => {
            state.sites = sites
          }),
        selectSite: (site) =>
          set((state) => {
            state.selectedSite = site
            // Don't auto-switch to twin view - let user explicitly navigate
          }),

        // Scene Configuration
        sceneConfig: null,
        deviceTypes: [],
        setSceneConfig: (config) =>
          set((state) => {
            state.sceneConfig = config
          }),
        setDeviceTypes: (types) =>
          set((state) => {
            state.deviceTypes = types
          }),

        // View State
        currentView: 'map',
        setCurrentView: (view) =>
          set((state) => {
            state.currentView = view
          }),

        // Phase Management
        currentPhase: 'AS_IS',
        setCurrentPhase: (phase) =>
          set((state) => {
            state.currentPhase = phase
          }),

        // Status Visibility
        statusVisibility: initialStatusVisibility,
        setStatusVisibility: (status, visible) =>
          set((state) => {
            state.statusVisibility[status] = visible
          }),
        setAllStatusVisibility: (visible) =>
          set((state) => {
            Object.keys(state.statusVisibility).forEach((key) => {
              state.statusVisibility[key as Status4D] = visible
            })
          }),

        // Color Mode
        colorMode: '4D_STATUS',
        setColorMode: (mode) =>
          set((state) => {
            state.colorMode = mode
          }),

        // Selection State
        selectedBuildingId: null,
        selectedFloorId: null,
        selectedRoomId: null,
        selectedRackId: null,
        selectedDeviceId: null,
        selectBuilding: (buildingId) =>
          set((state) => {
            state.selectedBuildingId = buildingId
            // Clear child selections when building changes
            if (buildingId !== state.selectedBuildingId) {
              state.selectedFloorId = null
              state.selectedRoomId = null
              state.selectedRackId = null
              state.selectedDeviceId = null
            }
          }),
        selectFloor: (floorId) =>
          set((state) => {
            state.selectedFloorId = floorId
            // Clear child selections when floor changes
            if (floorId !== state.selectedFloorId) {
              state.selectedRoomId = null
              state.selectedRackId = null
              state.selectedDeviceId = null
            }
          }),
        selectRoom: (roomId) =>
          set((state) => {
            state.selectedRoomId = roomId
            // Clear child selections when room changes
            if (roomId !== state.selectedRoomId) {
              state.selectedRackId = null
              state.selectedDeviceId = null
            }
          }),
        selectRack: (rackId) =>
          set((state) => {
            state.selectedRackId = rackId
            if (rackId) {
              state.selectedDeviceId = null
            }
          }),
        selectDevice: (deviceId) =>
          set((state) => {
            state.selectedDeviceId = deviceId
            if (deviceId) {
              state.selectedRackId = null
            }
          }),

        // AI Capacity
        aiCapacitySuggestion: null,
        highlightedRacks: [],
        setAiCapacitySuggestion: (suggestion) =>
          set((state) => {
            state.aiCapacitySuggestion = suggestion
          }),
        setHighlightedRacks: (rackIds) =>
          set((state) => {
            state.highlightedRacks = rackIds
          }),

        // UI State
        showBuilding: true,
        xrayMode: false,
        showOrigin: false,
        showCompass: true,
        currentView3D: 'perspective',
        showInventory: false,
        showSitesDrawer: false,
        showDetailsDrawer: false,
        setShowBuilding: (show) =>
          set((state) => {
            state.showBuilding = show
          }),
        setXrayMode: (enabled) =>
          set((state) => {
            state.xrayMode = enabled
          }),
        setShowOrigin: (show) =>
          set((state) => {
            state.showOrigin = show
          }),
        setShowCompass: (show) =>
          set((state) => {
            state.showCompass = show
          }),
        setCurrentView3D: (view) =>
          set((state) => {
            state.currentView3D = view
          }),
        setShowInventory: (show) =>
          set((state) => {
            state.showInventory = show
          }),
        setShowSitesDrawer: (show) =>
          set((state) => {
            state.showSitesDrawer = show
          }),
        setShowDetailsDrawer: (show) =>
          set((state) => {
            state.showDetailsDrawer = show
          }),

        // Loading States
        isLoading: true,
        isSceneLoading: true,
        setIsLoading: (loading) =>
          set((state) => {
            state.isLoading = loading
          }),
        setIsSceneLoading: (loading) =>
          set((state) => {
            state.isSceneLoading = loading
          }),

        // Reset Functions
        resetSelection: () =>
          set((state) => {
            state.selectedBuildingId = null
            state.selectedFloorId = null
            state.selectedRoomId = null
            state.selectedRackId = null
            state.selectedDeviceId = null
            state.highlightedRacks = []
          }),
        resetViewState: () =>
          set((state) => {
            state.currentPhase = 'AS_IS'
            state.statusVisibility = initialStatusVisibility
            state.colorMode = '4D_STATUS'
            state.showBuilding = true
            state.showOrigin = false
            state.showCompass = true
            state.currentView3D = 'perspective'
            state.xrayMode = false
          }),
      })),
      {
        name: 'twin-app-store',
        partialize: (state) => ({
          currentPhase: state.currentPhase,
          colorMode: state.colorMode,
          statusVisibility: state.statusVisibility,
          showBuilding: state.showBuilding,
          showOrigin: state.showOrigin,
          showCompass: state.showCompass,
          currentView3D: state.currentView3D,
          xrayMode: state.xrayMode,
        }),
      }
    ),
    {
      name: 'TwinAppStore',
    }
  )
)