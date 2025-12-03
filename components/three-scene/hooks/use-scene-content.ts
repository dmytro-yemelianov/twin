import { useEffect, useRef } from "react"
import { useTheme } from "next-themes"
import * as THREE from "three"
import {
    buildScene,
    updateDeviceVisibility,
    updateDeviceColor,
    highlightRelatedDevices,
    highlight4DLines,
    highlightRacks,
    highlightRack,
    updateBuildingTransparency,
    update4DLinesVisibility,
    create4DConnectionLines,
    getRelatedDeviceIds,
    disposeObject,
    updateSceneTheme,
    type SceneObjects
} from "@/lib/three/scene-builder"
import { status4DColors } from "@/lib/types"
import type { SceneConfig, DeviceType, Status4D, ColorMode } from "@/lib/types"

interface UseSceneContentProps {
    sceneRef: React.MutableRefObject<THREE.Scene | null>
    sceneObjectsRef: React.MutableRefObject<SceneObjects | null>
    connectionLinesRef: React.MutableRefObject<THREE.Group | null>
    sceneConfig: SceneConfig
    deviceTypes: DeviceType[]
    visibleStatuses: Set<Status4D>
    colorMode: ColorMode
    showBuilding: boolean
    selectedDeviceId: string | null
    selectedRackId: string | null
    highlightedRacks: string[]
    xrayMode: boolean
    show4DLines: boolean
}

export function useSceneContent({
    sceneRef,
    sceneObjectsRef,
    connectionLinesRef,
    sceneConfig,
    deviceTypes,
    visibleStatuses,
    colorMode,
    showBuilding,
    selectedDeviceId,
    selectedRackId,
    highlightedRacks,
    xrayMode,
    show4DLines
}: UseSceneContentProps) {
    const previousHighlightedRacksRef = useRef<string[]>([])
    const { resolvedTheme } = useTheme()

    // Build scene objects
    useEffect(() => {
        if (!sceneRef.current) return

        const scene = sceneRef.current
        const deviceTypeMap = new Map(deviceTypes.map((dt) => [dt.id, dt]))
        let isCancelled = false

        const previousObjects = sceneObjectsRef.current
        if (previousObjects) {
            if (previousObjects.building) {
                scene.remove(previousObjects.building)
                disposeObject(previousObjects.building)
            }
            previousObjects.rooms.forEach((room) => {
                scene.remove(room)
                disposeObject(room)
            })
            sceneObjectsRef.current = null
            previousHighlightedRacksRef.current = []
        }

        // Clean up previous connection lines
        if (connectionLinesRef.current) {
            scene.remove(connectionLinesRef.current)
            disposeObject(connectionLinesRef.current)
            connectionLinesRef.current = null
        }

        buildScene(sceneConfig, deviceTypeMap).then((objects) => {
            if (!sceneRef.current || isCancelled) return

            // Add building with initial visibility
            if (objects.building) {
                objects.building.userData.sceneObject = true
                objects.building.visible = showBuilding
                scene.add(objects.building)
            }

            // Add rooms
            objects.rooms.forEach((room) => {
                room.userData.sceneObject = true
                scene.add(room)
            })

            sceneObjectsRef.current = objects

            // Create 4D connection lines
            const linesGroup = create4DConnectionLines(objects, sceneConfig)
            linesGroup.visible = show4DLines
            scene.add(linesGroup)
            connectionLinesRef.current = linesGroup
        })

        return () => {
            isCancelled = true
        }
        // Note: showBuilding is used for initial visibility but not in deps to avoid full rebuild
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sceneConfig, deviceTypes, show4DLines])

    // Update device visibility based on status filters
    useEffect(() => {
        if (!sceneObjectsRef.current) return

        const { devices } = sceneObjectsRef.current

        devices.forEach((deviceGroup) => {
            const deviceData = deviceGroup.userData.data
            const isVisible = visibleStatuses.has(deviceData.status4D)
            updateDeviceVisibility(deviceGroup, isVisible)
        })
    }, [visibleStatuses, sceneObjectsRef])

    // Update device colors based on color mode
    useEffect(() => {
        if (!sceneObjectsRef.current) return

        const { devices } = sceneObjectsRef.current

        // Helper to generate consistent colors from strings
        const stringToColor = (str: string) => {
            let hash = 0;
            for (let i = 0; i < str.length; i++) {
                hash = str.charCodeAt(i) + ((hash << 5) - hash);
            }
            // Generate pastel/pleasing colors
            const h = Math.abs(hash) % 360;
            return `hsl(${h}, 70%, 60%)`;
        }

        devices.forEach((deviceGroup) => {
            const deviceData = deviceGroup.userData.data
            let color = "#888888" // neutral default

            if (colorMode === "4D_STATUS") {
                color = status4DColors[deviceData.status4D as Status4D]
            } else if (colorMode === "CUSTOMER") {
                if (deviceData.customer) {
                    color = stringToColor(deviceData.customer)
                } else {
                    color = "#cccccc" // Light gray for no customer
                }
            } else if (colorMode === "POWER") {
                // Simple power visualization (heat map style)
                // Assuming max power per device is around 2kW for visualization scaling
                const power = deviceData.powerKw || 0
                const intensity = Math.min(power / 1.5, 1) // Cap at 1.5kW
                // Interpolate from Green (low power) to Red (high power)
                const hue = (1 - intensity) * 120
                color = `hsl(${hue}, 70%, 50%)`
            }

            updateDeviceColor(deviceGroup, color)
        })
    }, [colorMode, sceneObjectsRef])

    // Update building visibility
    useEffect(() => {
        if (!sceneObjectsRef.current?.building) return
        sceneObjectsRef.current.building.visible = showBuilding
    }, [showBuilding, sceneObjectsRef])

    // Handle device selection and highlight related devices
    useEffect(() => {
        if (!sceneObjectsRef.current) return

        // Get related device IDs (same logicalEquipmentId)
        const relatedDeviceIds = selectedDeviceId
            ? getRelatedDeviceIds(sceneConfig, selectedDeviceId)
            : []

        // Get the logicalEquipmentId for the selected device
        const selectedDevice = selectedDeviceId
            ? sceneConfig.devices.find(d => d.id === selectedDeviceId)
            : null
        const logicalEquipmentId = selectedDevice?.logicalEquipmentId || null

        // Highlight the selected device and related devices with animated bounding boxes
        highlightRelatedDevices(sceneObjectsRef.current, relatedDeviceIds, selectedDeviceId, sceneRef.current || undefined)

        // Update 4D connection lines highlighting
        if (connectionLinesRef.current) {
            highlight4DLines(connectionLinesRef.current, selectedDeviceId, logicalEquipmentId)
        }
    }, [selectedDeviceId, sceneConfig, sceneObjectsRef, sceneRef, connectionLinesRef])

    // Handle rack highlighting (AI capacity)
    useEffect(() => {
        if (!sceneObjectsRef.current) return

        const { racks } = sceneObjectsRef.current
        const previouslyHighlighted = previousHighlightedRacksRef.current

        previouslyHighlighted.forEach((rackId) => {
            const rack = racks.get(rackId)
            if (rack) {
                highlightRacks([rack], false)
            }
        })

        const rackGroups: THREE.Group[] = []
        highlightedRacks.forEach((rackId) => {
            const rack = racks.get(rackId)
            if (rack) {
                rackGroups.push(rack)
            }
        })

        if (rackGroups.length > 0) {
            highlightRacks(rackGroups, true)
        }

        previousHighlightedRacksRef.current = highlightedRacks
    }, [highlightedRacks, sceneObjectsRef])

    // Update building transparency (X-ray mode)
    useEffect(() => {
        if (!sceneObjectsRef.current?.building) return
        updateBuildingTransparency(sceneObjectsRef.current.building, xrayMode)
    }, [xrayMode, sceneObjectsRef])

    // Update 4D connection lines visibility
    useEffect(() => {
        if (!connectionLinesRef.current) return
        update4DLinesVisibility(connectionLinesRef.current, show4DLines)
    }, [show4DLines, connectionLinesRef])

    // Highlight selected rack
    useEffect(() => {
        if (!sceneObjectsRef.current) return

        const { racks } = sceneObjectsRef.current

        racks.forEach((rack, rackId) => {
            highlightRack(rack, rackId === selectedRackId)
        })
    }, [selectedRackId, sceneObjectsRef])

    // Update theme colors when theme changes
    useEffect(() => {
        if (!sceneObjectsRef.current) return

        const isDarkTheme = resolvedTheme === 'dark'
        updateSceneTheme(sceneObjectsRef.current, isDarkTheme)
    }, [resolvedTheme, sceneObjectsRef])
}
