import { useEffect, useRef } from "react"
import { useTheme } from "next-themes"
import * as THREE from "three"
import { ViewHelper } from "three/examples/jsm/helpers/ViewHelper.js"
import { createOrbitControls, sceneThemeColors, type ExtendedOrbitControls } from "../utils"

export function useSceneSetup(
    containerRef: React.RefObject<HTMLDivElement | null>,
    showOrigin: boolean,
    showCompass: boolean
) {
    const { resolvedTheme } = useTheme()
    const sceneRef = useRef<THREE.Scene | null>(null)
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
    const controlsRef = useRef<ExtendedOrbitControls | null>(null)
    const gridHelperRef = useRef<THREE.GridHelper | null>(null)
    const viewHelperRef = useRef<ViewHelper | null>(null)
    const originPointRef = useRef<THREE.Group | null>(null)
    const compassRef = useRef<THREE.Group | null>(null)

    useEffect(() => {
        if (!containerRef.current) return

        const container = containerRef.current
        const width = container.clientWidth
        const height = container.clientHeight

        // Scene
        const scene = new THREE.Scene()
        const themeColors = resolvedTheme === "light" ? sceneThemeColors.light : sceneThemeColors.dark
        scene.background = new THREE.Color(themeColors.background)
        sceneRef.current = scene

        // Camera
        const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000)
        camera.position.set(15, 10, 15)
        cameraRef.current = camera

        // Renderer
        const renderer = new THREE.WebGLRenderer({ antialias: true })
        renderer.setSize(width, height)
        renderer.setPixelRatio(window.devicePixelRatio)
        renderer.shadowMap.enabled = true
        container.appendChild(renderer.domElement)
        rendererRef.current = renderer

        const controls = createOrbitControls(camera, renderer.domElement)
        controlsRef.current = controls

        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4)
        scene.add(ambientLight)

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
        directionalLight.position.set(10, 20, 10)
        directionalLight.castShadow = true
        scene.add(directionalLight)

        const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.4)
        scene.add(hemisphereLight)

        // Grid helper
        const gridHelper = new THREE.GridHelper(50, 50, themeColors.gridMain, themeColors.gridSecondary)
        if (Array.isArray(gridHelper.material)) {
            gridHelper.material.forEach((mat) => {
                ; (mat as THREE.LineBasicMaterial).transparent = true
                    ; (mat as THREE.LineBasicMaterial).opacity = themeColors.gridOpacity
            })
        } else {
            ; (gridHelper.material as THREE.LineBasicMaterial).transparent = true
                ; (gridHelper.material as THREE.LineBasicMaterial).opacity = themeColors.gridOpacity
        }
        scene.add(gridHelper)
        gridHelperRef.current = gridHelper

        // Origin point indicator
        const createOriginPoint = () => {
            const originGroup = new THREE.Group()

            // Central sphere
            const sphereGeometry = new THREE.SphereGeometry(0.15, 16, 12)
            const sphereMaterial = new THREE.MeshBasicMaterial({ color: 0xff6b35 })
            const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial)
            originGroup.add(sphere)

            // Axis lines
            const lineMaterial = new THREE.LineBasicMaterial({ linewidth: 3 })

            // X-axis (red)
            const xGeometry = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(-2, 0, 0),
                new THREE.Vector3(2, 0, 0)
            ])
            const xLine = new THREE.Line(xGeometry, new THREE.LineBasicMaterial({ color: 0xff0000, linewidth: 3 }))
            originGroup.add(xLine)

            // Y-axis (green)
            const yGeometry = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(0, -2, 0),
                new THREE.Vector3(0, 2, 0)
            ])
            const yLine = new THREE.Line(yGeometry, new THREE.LineBasicMaterial({ color: 0x00ff00, linewidth: 3 }))
            originGroup.add(yLine)

            // Z-axis (blue)
            const zGeometry = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(0, 0, -2),
                new THREE.Vector3(0, 0, 2)
            ])
            const zLine = new THREE.Line(zGeometry, new THREE.LineBasicMaterial({ color: 0x0000ff, linewidth: 3 }))
            originGroup.add(zLine)

            originGroup.position.set(0, 0.1, 0)
            originGroup.visible = showOrigin

            return originGroup
        }

        const originPoint = createOriginPoint()
        scene.add(originPoint)
        originPointRef.current = originPoint

        // Compass indicator
        const createCompass = () => {
            const compassGroup = new THREE.Group()

            // Compass ring
            const ringGeometry = new THREE.RingGeometry(1.8, 2.0, 32)
            const ringMaterial = new THREE.MeshBasicMaterial({ color: themeColors.compassRing, side: THREE.DoubleSide })
            ringMaterial.name = "compassRing"
            const ring = new THREE.Mesh(ringGeometry, ringMaterial)
            ring.rotation.x = -Math.PI / 2
            compassGroup.add(ring)

            // North arrow
            const arrowGeometry = new THREE.ConeGeometry(0.1, 0.3, 8)
            const northMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 })
            const northArrow = new THREE.Mesh(arrowGeometry, northMaterial)
            northArrow.position.set(0, 0.2, -1.9)
            northArrow.rotation.x = Math.PI / 2
            compassGroup.add(northArrow)

            // Directional labels
            const labelGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.1)
            const nMarker = new THREE.Mesh(labelGeometry, new THREE.MeshBasicMaterial({ color: 0xff0000 }))
            nMarker.position.set(0, 0.1, -2.2)
            compassGroup.add(nMarker)

            const sMarker = new THREE.Mesh(labelGeometry, new THREE.MeshBasicMaterial({ color: 0x00ff00 }))
            sMarker.position.set(0, 0.1, 2.2)
            compassGroup.add(sMarker)

            const eMarker = new THREE.Mesh(labelGeometry, new THREE.MeshBasicMaterial({ color: 0x0000ff }))
            eMarker.position.set(2.2, 0.1, 0)
            compassGroup.add(eMarker)

            const wMarker = new THREE.Mesh(labelGeometry, new THREE.MeshBasicMaterial({ color: 0xffff00 }))
            wMarker.position.set(-2.2, 0.1, 0)
            compassGroup.add(wMarker)

            compassGroup.position.set(0, 0.05, 0)
            compassGroup.visible = showCompass

            return compassGroup
        }

        const compass = createCompass()
        scene.add(compass)
        compassRef.current = compass

        // ViewHelper
        const viewHelper = new ViewHelper(camera, renderer.domElement)
        viewHelper.center.set(0.85, 0.85, 0)
        viewHelperRef.current = viewHelper

        const handleViewHelperClick = (event: MouseEvent) => {
            viewHelper.handleClick(event)
        }

        renderer.domElement.addEventListener('click', handleViewHelperClick)

        // Animation loop
        let animationId: number
        const clock = new THREE.Clock()

        const animate = () => {
            animationId = requestAnimationFrame(animate)
            const delta = clock.getDelta()

            controls.update()

            if (viewHelper.animating) {
                viewHelper.update(delta)
            }

            renderer.render(scene, camera)

            renderer.autoClear = false
            viewHelper.render(renderer)
            renderer.autoClear = true
        }
        animate()

        // Resize handling
        const handleResize = (entries?: ResizeObserverEntry[]) => {
            if (!container || !camera || !renderer) return
            const width = entries?.[0]?.contentRect.width || container.clientWidth
            const height = entries?.[0]?.contentRect.height || container.clientHeight
            if (width === 0 || height === 0) return

            camera.aspect = width / height
            camera.updateProjectionMatrix()
            renderer.setSize(width, height)
        }

        const resizeObserver = new ResizeObserver(handleResize)
        resizeObserver.observe(container)
        window.addEventListener("resize", () => handleResize())

        return () => {
            cancelAnimationFrame(animationId)
            resizeObserver.disconnect()
            window.removeEventListener("resize", () => handleResize())
            renderer.domElement.removeEventListener('click', handleViewHelperClick)
            controls.dispose()
            if (viewHelperRef.current) {
                viewHelperRef.current.dispose()
                viewHelperRef.current = null
            }
            renderer.dispose()
            container.removeChild(renderer.domElement)
        }
    }, []) // Empty deps - setup once

    // Toggle origin visibility
    useEffect(() => {
        if (originPointRef.current) {
            originPointRef.current.visible = showOrigin
        }
    }, [showOrigin])

    // Toggle compass visibility
    useEffect(() => {
        if (compassRef.current) {
            compassRef.current.visible = showCompass
        }
    }, [showCompass])

    return {
        sceneRef,
        cameraRef,
        rendererRef,
        controlsRef,
        gridHelperRef,
        originPointRef,
        compassRef,
        viewHelperRef
    }
}
