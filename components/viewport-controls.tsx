"use client"

import { Button } from "@/components/ui/button"
import { ZoomIn, ZoomOut, Maximize2, RotateCw, Target, Navigation } from "lucide-react"

interface ViewportControlsProps {
  onResetCamera: () => void
  onFitView: () => void
  onZoomIn: () => void
  onZoomOut: () => void
  onToggleOrigin?: () => void
  onToggleCompass?: () => void
  showOrigin?: boolean
  showCompass?: boolean
}

export function ViewportControls({
  onResetCamera,
  onFitView,
  onZoomIn,
  onZoomOut,
  onToggleOrigin,
  onToggleCompass,
  showOrigin = false,
  showCompass = true,
}: ViewportControlsProps) {
  return (
    <div className="flex flex-col gap-2">
      {/* Compact Controls Row */}
      <div className="bg-background/90 backdrop-blur-sm border border-border/50 rounded-lg shadow-lg p-1.5 flex items-center gap-1">
        {/* Zoom Controls */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onZoomIn}
          className="h-8 w-8 hover:bg-muted"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </Button>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={onZoomOut}
          className="h-8 w-8 hover:bg-muted"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </Button>

        <div className="w-px h-5 bg-border/50" />

        {/* View Controls */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onFitView}
          className="h-8 w-8 hover:bg-muted"
          title="Fit All (F)"
        >
          <Maximize2 className="w-4 h-4" />
        </Button>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={onResetCamera}
          className="h-8 w-8 hover:bg-muted"
          title="Reset View"
        >
          <RotateCw className="w-4 h-4" />
        </Button>

        {(onToggleOrigin || onToggleCompass) && (
          <>
            <div className="w-px h-5 bg-border/50" />
            
            {/* Scene Helpers */}
            {onToggleOrigin && (
              <Button
                variant={showOrigin ? "secondary" : "ghost"}
                size="icon"
                onClick={onToggleOrigin}
                className="h-8 w-8 hover:bg-muted"
                title="Toggle Origin"
              >
                <Target className="w-4 h-4" />
              </Button>
            )}
            
            {onToggleCompass && (
              <Button
                variant={showCompass ? "secondary" : "ghost"}
                size="icon"
                onClick={onToggleCompass}
                className="h-8 w-8 hover:bg-muted"
                title="Toggle Compass"
              >
                <Navigation className="w-4 h-4" />
              </Button>
            )}
          </>
        )}
      </div>

      {/* Compact Mouse Help */}
      <div className="bg-background/80 backdrop-blur-sm border border-border/50 rounded-md px-2 py-1 text-[9px] text-muted-foreground flex gap-3">
        <span><b>LMB</b> Rotate</span>
        <span><b>RMB</b> Pan</span>
        <span><b>Scroll</b> Zoom</span>
      </div>
    </div>
  )
}
