"use client"

import { useState, useRef, useCallback } from "react"
import { useTheme } from "next-themes"
import type { SceneConfig, DeviceType } from "@/lib/types"
import { Card } from "@/components/ui/card"
import { DrawingType, lightColors, darkColors } from "./types"
import { DrawingControls } from "./drawing-controls"
import { FloorPlanRenderer } from "./floor-plan-renderer"
import { RackElevationRenderer } from "./rack-elevation-renderer"
import { RoomLayoutRenderer } from "./room-layout-renderer"

interface DrawingGeneratorProps {
    sceneConfig: SceneConfig
    deviceTypes?: DeviceType[]
    siteName?: string
    onClose?: () => void
}

export function DrawingGenerator({ sceneConfig, deviceTypes = [], siteName = "Site", onClose }: DrawingGeneratorProps) {
    const { resolvedTheme } = useTheme()
    const svgRef = useRef<SVGSVGElement>(null)

    const [drawingType, setDrawingType] = useState<DrawingType>('floor-plan')
    const [selectedFloorId, setSelectedFloorId] = useState<string | null>(
        sceneConfig.floors?.[0]?.id || null
    )
    const [selectedRoomId, setSelectedRoomId] = useState<string | null>(
        sceneConfig.rooms?.[0]?.id || null
    )
    const [selectedRackId, setSelectedRackId] = useState<string | null>(
        sceneConfig.racks?.[0]?.id || null
    )
    const [zoom, setZoom] = useState(1)
    const [showGrid, setShowGrid] = useState(true)
    const [showDimensions, setShowDimensions] = useState(true)
    const [showLabels, setShowLabels] = useState(true)

    const colors = resolvedTheme === 'light' ? lightColors : darkColors

    // Export functions
    const exportSVG = useCallback(() => {
        if (!svgRef.current) return

        const svgData = new XMLSerializer().serializeToString(svgRef.current)
        const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
        const svgUrl = URL.createObjectURL(svgBlob)

        const downloadLink = document.createElement('a')
        downloadLink.href = svgUrl
        downloadLink.download = `${siteName}-${drawingType}-${Date.now()}.svg`
        document.body.appendChild(downloadLink)
        downloadLink.click()
        document.body.removeChild(downloadLink)
        URL.revokeObjectURL(svgUrl)
    }, [siteName, drawingType])

    const exportPNG = useCallback(() => {
        if (!svgRef.current) return

        const svgData = new XMLSerializer().serializeToString(svgRef.current)
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        const img = new Image()

        const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
        const url = URL.createObjectURL(svgBlob)

        img.onload = () => {
            canvas.width = svgRef.current!.clientWidth
            canvas.height = svgRef.current!.clientHeight
            ctx?.drawImage(img, 0, 0)

            const pngUrl = canvas.toDataURL('image/png')
            const downloadLink = document.createElement('a')
            downloadLink.href = pngUrl
            downloadLink.download = `${siteName}-${drawingType}-${Date.now()}.png`
            document.body.appendChild(downloadLink)
            downloadLink.click()
            document.body.removeChild(downloadLink)
            URL.revokeObjectURL(url)
        }

        img.src = url
    }, [siteName, drawingType])

    return (
        <Card className="flex flex-col h-full bg-background border-border shadow-xl overflow-hidden">
            <DrawingControls
                drawingType={drawingType}
                setDrawingType={setDrawingType}
                zoom={zoom}
                setZoom={setZoom}
                showGrid={showGrid}
                setShowGrid={setShowGrid}
                showDimensions={showDimensions}
                setShowDimensions={setShowDimensions}
                showLabels={showLabels}
                setShowLabels={setShowLabels}
                onExportSVG={exportSVG}
                onExportPNG={exportPNG}
                onClose={onClose}
                sceneConfig={sceneConfig}
                selectedFloorId={selectedFloorId}
                setSelectedFloorId={setSelectedFloorId}
                selectedRoomId={selectedRoomId}
                setSelectedRoomId={setSelectedRoomId}
                selectedRackId={selectedRackId}
                setSelectedRackId={setSelectedRackId}
            />

            <div className="flex-1 overflow-auto p-8 bg-muted/20 flex items-center justify-center">
                <div className="bg-background shadow-sm border border-border/50 rounded-lg overflow-hidden transition-all duration-200">
                    {drawingType === 'floor-plan' && (
                        <FloorPlanRenderer
                            ref={svgRef}
                            sceneConfig={sceneConfig}
                            colors={colors}
                            zoom={zoom}
                            showGrid={showGrid}
                            showDimensions={showDimensions}
                            showLabels={showLabels}
                            siteName={siteName}
                            selectedFloorId={selectedFloorId}
                        />
                    )}
                    {drawingType === 'rack-elevation' && (
                        <RackElevationRenderer
                            ref={svgRef}
                            sceneConfig={sceneConfig}
                            deviceTypes={deviceTypes}
                            colors={colors}
                            zoom={zoom}
                            showGrid={showGrid}
                            showDimensions={showDimensions}
                            showLabels={showLabels}
                            siteName={siteName}
                            selectedRackId={selectedRackId}
                        />
                    )}
                    {drawingType === 'room-layout' && (
                        <RoomLayoutRenderer
                            ref={svgRef}
                            sceneConfig={sceneConfig}
                            colors={colors}
                            zoom={zoom}
                            showGrid={showGrid}
                            showDimensions={showDimensions}
                            showLabels={showLabels}
                            siteName={siteName}
                            selectedRoomId={selectedRoomId}
                        />
                    )}
                </div>
            </div>
        </Card>
    )
}
