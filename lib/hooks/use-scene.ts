import { useMemo, useCallback, useState, useEffect } from 'react'
import { useAppStore } from '@/lib/stores/app-store'
import { useSceneConfig, useDeviceTypes } from './use-data'
import { findAIReadyCapacity } from '@/lib/ai-capacity'
import { useDebouncedCallback } from './use-debounce'
import type { Site, Status4D, Phase } from '@/lib/types'

/**
 * Custom hook for managing 3D scene state and computations
 */
export function useScene(site: Site) {
  const {
    currentPhase,
    statusVisibility,
    selectedDeviceId,
    selectedRackId,
    highlightedRacks,
    aiCapacitySuggestion,
    setAiCapacitySuggestion,
    setHighlightedRacks,
    selectDevice,
    selectRack
  } = useAppStore()

  const { data: sceneConfig, isLoading: sceneLoading } = useSceneConfig(site.sceneConfigUri)
  const { data: deviceTypes = [], isLoading: deviceTypesLoading } = useDeviceTypes()

  // Memoized visible statuses for performance
  const visibleStatuses = useMemo(() => {
    return new Set(
      Object.entries(statusVisibility)
        .filter(([_, visible]) => visible)
        .map(([status]) => status as Status4D)
    )
  }, [statusVisibility])

  // Memoized filtered devices based on current phase and visibility
  const visibleDevices = useMemo(() => {
    if (!sceneConfig) return []
    
    return sceneConfig.devices.filter(device => 
      visibleStatuses.has(device.status4D)
    )
  }, [sceneConfig, visibleStatuses])

  // Debounced AI capacity calculation
  const calculateAICapacity = useDebouncedCallback((phase: Phase) => {
    if (!sceneConfig) return
    
    const suggestion = findAIReadyCapacity(sceneConfig, phase)
    setAiCapacitySuggestion(suggestion)
    
    if (suggestion) {
      setHighlightedRacks(suggestion.rackIds)
    } else {
      setHighlightedRacks([])
    }
  }, 300)

  // Device selection handlers
  const handleDeviceSelect = useCallback((deviceId: string | null) => {
    selectDevice(deviceId)
    if (deviceId) {
      selectRack(null) // Clear rack selection when selecting device
    }
  }, [selectDevice, selectRack])

  const handleRackSelect = useCallback((rackId: string | null) => {
    selectRack(rackId)
    if (rackId) {
      selectDevice(null) // Clear device selection when selecting rack
    }
  }, [selectRack, selectDevice])

  // Find device by ID
  const getDeviceById = useCallback((deviceId: string) => {
    return sceneConfig?.devices.find(d => d.id === deviceId)
  }, [sceneConfig])

  // Find rack by ID
  const getRackById = useCallback((rackId: string) => {
    return sceneConfig?.racks.find(r => r.id === rackId)
  }, [sceneConfig])

  // Get devices in a specific rack
  const getDevicesInRack = useCallback((rackId: string) => {
    if (!sceneConfig) return []
    return sceneConfig.devices.filter(d => d.rackId === rackId)
  }, [sceneConfig])

  return {
    // Data
    sceneConfig,
    deviceTypes,
    visibleDevices,
    isLoading: sceneLoading || deviceTypesLoading,

    // State
    currentPhase,
    visibleStatuses,
    selectedDeviceId,
    selectedRackId,
    highlightedRacks,
    aiCapacitySuggestion,

    // Actions
    handleDeviceSelect,
    handleRackSelect,
    calculateAICapacity,

    // Utilities
    getDeviceById,
    getRackById,
    getDevicesInRack
  }
}

/**
 * Custom hook for camera controls with optimized updates
 */
export function useCameraControls() {
  const [resetTrigger, setResetTrigger] = useState(0)
  const [fitViewTrigger, setFitViewTrigger] = useState(0)
  const [zoomInTrigger, setZoomInTrigger] = useState(0)
  const [zoomOutTrigger, setZoomOutTrigger] = useState(0)
  const [currentView, setCurrentView] = useState('perspective')

  const resetCamera = useCallback(() => {
    setResetTrigger(prev => prev + 1)
  }, [])

  const fitView = useCallback(() => {
    setFitViewTrigger(prev => prev + 1)
  }, [])

  const zoomIn = useCallback(() => {
    setZoomInTrigger(prev => prev + 1)
  }, [])

  const zoomOut = useCallback(() => {
    setZoomOutTrigger(prev => prev + 1)
  }, [])

  const setView = useCallback((view: string) => {
    setCurrentView(view)
  }, [])

  return {
    resetTrigger,
    fitViewTrigger,
    zoomInTrigger,
    zoomOutTrigger,
    currentView,
    resetCamera,
    fitView,
    zoomIn,
    zoomOut,
    setView
  }
}

/**
 * Custom hook for managing keyboard shortcuts
 */
export function useKeyboardShortcuts(handlers: Record<string, () => void>) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      if (event.target instanceof HTMLInputElement || 
          event.target instanceof HTMLTextAreaElement) {
        return
      }

      const key = event.key.toLowerCase()
      const withCtrl = event.ctrlKey
      const withShift = event.shiftKey
      const withAlt = event.altKey

      // Build shortcut string
      let shortcut = ''
      if (withCtrl) shortcut += 'ctrl+'
      if (withShift) shortcut += 'shift+'
      if (withAlt) shortcut += 'alt+'
      shortcut += key

      if (handlers[shortcut]) {
        event.preventDefault()
        handlers[shortcut]()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handlers])
}