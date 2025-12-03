import { useEffect, useRef, useState } from "react"
import * as THREE from "three"
import { focusCameraOnRack, type SceneObjects } from "@/lib/three/scene-builder"
import type { ExtendedOrbitControls } from "../utils"

interface TooltipData {
    type: 'device' | 'rack'
    id: string
    name: string
    details?: string
    x: number
    y: number
}

interface UseSceneInteractionProps {
    containerRef: React.RefObject<HTMLDivElement | null>
    sceneRef: React.MutableRefObject<THREE.Scene | null>
    cameraRef: React.MutableRefObject<THREE.PerspectiveCamera | null>
    controlsRef: React.MutableRefObject<ExtendedOrbitControls | null>
    sceneObjectsRef: React.MutableRefObject<SceneObjects | null>
    onDeviceSelect: (deviceId: string | null) => void
    onRackSelect?: (rackId: string | null) => void
}

export function useSceneInteraction({
    containerRef,
    sceneRef,
    cameraRef,
    controlsRef,
    sceneObjectsRef,
    onDeviceSelect,
    onRackSelect
}: UseSceneInteractionProps) {
    const [tooltip, setTooltip] = useState<TooltipData | null>(null)
    const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster())
    const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2())
    const hoveredObjectRef = useRef<THREE.Object3D | null>(null)

    useEffect(() => {
        const container = containerRef.current
        if (!container) return

        const findClickableObject = (object: THREE.Object3D): { type: 'device' | 'rack' | null, object: THREE.Object3D | null } => {
            let current: THREE.Object3D | null = object
            while (current) {
                if (current.userData.type === 'device') {
                    return { type: 'device', object: current }
                }
                if (current.userData.type === 'rack') {
                    return { type: 'rack', object: current }
                }
                current = current.parent
            }
            return { type: null, object: null }
        }

        const handleClick = (event: MouseEvent) => {
            if (!container || !cameraRef.current || !sceneRef.current) return

            const rect = container.getBoundingClientRect()
            mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
            mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

            raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current)

            const meshes: THREE.Object3D[] = []
            sceneRef.current.traverse((obj) => {
                if (obj instanceof THREE.Mesh && obj.visible) {
                    meshes.push(obj)
                }
            })

            const intersects = raycasterRef.current.intersectObjects(meshes, false)

            if (intersects.length > 0) {
                let foundDevice: THREE.Object3D | null = null
                let foundRack: THREE.Object3D | null = null

                for (const intersection of intersects) {
                    const result = findClickableObject(intersection.object)

                    if (result.type === 'device' && !foundDevice) {
                        foundDevice = result.object
                        break
                    } else if (result.type === 'rack' && !foundRack) {
                        foundRack = result.object
                    }
                }

                if (foundDevice) {
                    onDeviceSelect(foundDevice.name)
                    onRackSelect?.(null)
                    return
                }

                if (foundRack) {
                    onRackSelect?.(foundRack.name)
                    onDeviceSelect(null)

                    if (sceneObjectsRef.current && cameraRef.current && controlsRef.current) {
                        const rackGroup = sceneObjectsRef.current.racks.get(foundRack.name)
                        if (rackGroup) {
                            focusCameraOnRack(cameraRef.current, controlsRef.current, rackGroup)
                        }
                    }
                    return
                }
            }

            onDeviceSelect(null)
            onRackSelect?.(null)
        }

        const handleMouseMove = (event: MouseEvent) => {
            if (!container || !cameraRef.current || !sceneRef.current || !sceneObjectsRef.current) return

            const rect = container.getBoundingClientRect()
            mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
            mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

            raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current)

            const meshes: THREE.Object3D[] = []
            sceneRef.current.traverse((obj) => {
                if (obj instanceof THREE.Mesh && obj.visible) {
                    meshes.push(obj)
                }
            })

            const intersects = raycasterRef.current.intersectObjects(meshes, false)

            if (intersects.length > 0) {
                for (const intersection of intersects) {
                    const result = findClickableObject(intersection.object)

                    if (result.type === 'device' && result.object) {
                        const deviceData = result.object.userData.data
                        if (deviceData && hoveredObjectRef.current !== result.object) {
                            hoveredObjectRef.current = result.object
                            setTooltip({
                                type: 'device',
                                id: deviceData.id,
                                name: deviceData.name,
                                details: `U${deviceData.uStart}-${deviceData.uStart + deviceData.uHeight - 1} • ${deviceData.status4D.replace('_', ' ')}`,
                                x: event.clientX - rect.left,
                                y: event.clientY - rect.top
                            })
                        } else if (hoveredObjectRef.current === result.object) {
                            setTooltip(prev => prev ? { ...prev, x: event.clientX - rect.left, y: event.clientY - rect.top } : null)
                        }
                        return
                    } else if (result.type === 'rack' && result.object) {
                        const rackData = result.object.userData.data
                        if (rackData && hoveredObjectRef.current !== result.object) {
                            hoveredObjectRef.current = result.object
                            setTooltip({
                                type: 'rack',
                                id: rackData.id,
                                name: rackData.name,
                                details: `${rackData.uHeight}U • ${rackData.powerCapacityKw}kW`,
                                x: event.clientX - rect.left,
                                y: event.clientY - rect.top
                            })
                        } else if (hoveredObjectRef.current === result.object) {
                            setTooltip(prev => prev ? { ...prev, x: event.clientX - rect.left, y: event.clientY - rect.top } : null)
                        }
                        return
                    }
                }
            }

            if (hoveredObjectRef.current) {
                hoveredObjectRef.current = null
                setTooltip(null)
            }
        }

        const handleMouseLeave = () => {
            hoveredObjectRef.current = null
            setTooltip(null)
        }

        container.addEventListener("click", handleClick)
        container.addEventListener("mousemove", handleMouseMove)
        container.addEventListener("mouseleave", handleMouseLeave)

        return () => {
            container.removeEventListener("click", handleClick)
            container.removeEventListener("mousemove", handleMouseMove)
            container.removeEventListener("mouseleave", handleMouseLeave)
        }
    }, [onDeviceSelect, onRackSelect])

    return { tooltip }
}
