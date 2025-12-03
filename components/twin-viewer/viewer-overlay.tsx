"use client"

import { Edit3, GitBranch } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ViewportControls } from "@/components/viewport-controls"
import type { SceneConfig, Device } from "@/lib/types"

interface ViewerOverlayProps {
    selectedDeviceId: string | null
    sceneConfig: SceneConfig | undefined
    relatedDevices: Device[]
    onEditDevice: (id: string) => void
    onSelectDevice: (id: string | null) => void
    // Viewport controls props
    onResetCamera: () => void
    onFitView: () => void
    onZoomIn: () => void
    onZoomOut: () => void
    showOrigin: boolean
    onToggleOrigin: () => void
    showCompass: boolean
    onToggleCompass: () => void
}

export function ViewerOverlay({
    selectedDeviceId,
    sceneConfig,
    relatedDevices,
    onEditDevice,
    onSelectDevice,
    onResetCamera,
    onFitView,
    onZoomIn,
    onZoomOut,
    showOrigin,
    onToggleOrigin,
    showCompass,
    onToggleCompass,
}: ViewerOverlayProps) {
    return (
        <>
            {/* Selected Device Edit Popup */}
            {selectedDeviceId && (
                <div className="absolute bottom-4 left-4 z-20">
                    <Card className="p-3 bg-card/95 backdrop-blur border-blue-500/30 shadow-lg max-w-xs">
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse shrink-0" />
                            <div className="flex-1 min-w-0">
                                <div className="text-xs font-medium truncate">
                                    {sceneConfig?.devices.find(d => d.id === selectedDeviceId)?.name || 'Device'}
                                </div>
                                <div className="text-[10px] text-muted-foreground">
                                    {sceneConfig?.devices.find(d => d.id === selectedDeviceId)?.status4D.replace('_', ' ')}
                                </div>
                                {relatedDevices.length > 0 && (
                                    <div className="text-[10px] text-cyan-400 flex items-center gap-1 mt-0.5">
                                        <GitBranch className="w-3 h-3" />
                                        {relatedDevices.length} related state{relatedDevices.length > 1 ? 's' : ''} highlighted
                                    </div>
                                )}
                            </div>
                            <Button
                                size="sm"
                                className="gap-1.5 h-7"
                                onClick={() => onEditDevice(selectedDeviceId)}
                            >
                                <Edit3 className="w-3 h-3" />
                                Edit
                            </Button>
                            <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0"
                                onClick={() => onSelectDevice(null)}
                            >
                                ×
                            </Button>
                        </div>
                    </Card>
                </div>
            )}

            {/* Viewport Controls - bottom-center */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20">
                <ViewportControls
                    onResetCamera={onResetCamera}
                    onFitView={onFitView}
                    onZoomIn={onZoomIn}
                    onZoomOut={onZoomOut}
                    onToggleOrigin={onToggleOrigin}
                    onToggleCompass={onToggleCompass}
                    showOrigin={showOrigin}
                    showCompass={showCompass}
                />
            </div>
        </>
    )
}
