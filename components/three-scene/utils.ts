import * as THREE from "three"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js"

// Extended OrbitControls with zoom helper methods
export interface ExtendedOrbitControls extends OrbitControls {
    zoomIn: () => void
    zoomOut: () => void
}

export function createOrbitControls(camera: THREE.Camera, domElement: HTMLElement): ExtendedOrbitControls {
    const controls = new OrbitControls(camera, domElement) as ExtendedOrbitControls

    // Configure for CAD-like behavior
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    controls.enablePan = true
    controls.screenSpacePanning = true // Pan in screen space
    controls.mouseButtons = {
        LEFT: THREE.MOUSE.ROTATE,
        MIDDLE: THREE.MOUSE.DOLLY,
        RIGHT: THREE.MOUSE.PAN
    }
    controls.minDistance = 2
    controls.maxDistance = 200
    controls.maxPolarAngle = Math.PI * 0.95 // Don't flip upside down

    // Add zoom helper methods
    controls.zoomIn = function () {
        const factor = 0.8
        const distance = camera.position.distanceTo(this.target)
        const newDistance = Math.max(this.minDistance, distance * factor)
        const direction = new THREE.Vector3().subVectors(camera.position, this.target).normalize()
        camera.position.copy(this.target).add(direction.multiplyScalar(newDistance))
    }

    controls.zoomOut = function () {
        const factor = 1.25
        const distance = camera.position.distanceTo(this.target)
        const newDistance = Math.min(this.maxDistance, distance * factor)
        const direction = new THREE.Vector3().subVectors(camera.position, this.target).normalize()
        camera.position.copy(this.target).add(direction.multiplyScalar(newDistance))
    }

    return controls
}

export function disposeObject(object: THREE.Object3D) {
    object.traverse((child) => {
        if (child instanceof THREE.Mesh) {
            // Dispose geometry
            child.geometry?.dispose()

            // Dispose materials and their textures
            if (Array.isArray(child.material)) {
                child.material.forEach((mat) => {
                    // Dispose textures
                    Object.values(mat).forEach((value: any) => {
                        if (value?.isTexture) {
                            value.dispose()
                        }
                    })
                    mat.dispose()
                })
            } else if (child.material) {
                // Dispose textures
                Object.values(child.material).forEach((value: any) => {
                    if (value?.isTexture) {
                        value.dispose()
                    }
                })
                child.material.dispose()
            }
        } else if ((child as any).isLine) {
            (child as any).geometry?.dispose()
                ; (child as any).material?.dispose()
        }
    })

    // Clear the object from memory
    object.clear()
}

// Theme-aware colors for the 3D scene
export const sceneThemeColors = {
    light: {
        background: 0xf5f5f0, // Warm off-white
        gridMain: 0xcccccc,
        gridSecondary: 0xe5e5e5,
        gridOpacity: 1.0,
        compassRing: 0xaaaaaa,
    },
    dark: {
        background: 0x09090b, // Dark zinc
        gridMain: 0x2a2a2a, // Much darker grid lines
        gridSecondary: 0x181818, // Very subtle grid
        gridOpacity: 0.4, // Semi-transparent
        compassRing: 0x333333,
    },
}
