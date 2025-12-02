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
    <div className="flex flex-col gap-3">
      {/* Zoom and View Controls */}
      <div className="bg-background/95 backdrop-blur-sm border border-border rounded-lg shadow-lg flex flex-col">
        <Button
          variant="ghost"
          size="icon"
          onClick={onZoomIn}
          className="rounded-none rounded-t-lg hover:bg-muted"
          title="Zoom In (Scroll Up)"
        >
          <ZoomIn className="w-4 h-4" />
        </Button>

        <div className="border-t border-border/50" />

        <Button
          variant="ghost"
          size="icon"
          onClick={onZoomOut}
          className="rounded-none hover:bg-muted"
          title="Zoom Out (Scroll Down)"
        >
          <ZoomOut className="w-4 h-4" />
        </Button>

        <div className="border-t border-border/50" />

        <Button
          variant="ghost"
          size="icon"
          onClick={onFitView}
          className="rounded-none hover:bg-muted"
          title="Fit All (F)"
        >
          <Maximize2 className="w-4 h-4" />
        </Button>

        <div className="border-t border-border/50" />

        <Button
          variant="ghost"
          size="icon"
          onClick={onResetCamera}
          className="rounded-none rounded-b-lg hover:bg-muted"
          title="Reset View (Home)"
        >
          <RotateCw className="w-4 h-4" />
        </Button>
      </div>

      {/* Scene Helpers Toggle */}
      <div className="bg-background/95 backdrop-blur-sm border border-border rounded-lg shadow-lg flex flex-col">
        {onToggleOrigin && (
          <>
            <Button
              variant={showOrigin ? "default" : "ghost"}
              size="icon"
              onClick={onToggleOrigin}
              className="rounded-none rounded-t-lg hover:bg-muted"
              title="Toggle Origin Point"
            >
              <Target className="w-4 h-4" />
            </Button>
            <div className="border-t border-border/50" />
          </>
        )}
        
        {onToggleCompass && (
          <Button
            variant={showCompass ? "default" : "ghost"}
            size="icon"
            onClick={onToggleCompass}
            className={`rounded-none ${!onToggleOrigin ? 'rounded-t-lg' : ''} rounded-b-lg hover:bg-muted`}
            title="Toggle Compass"
          >
            <Navigation className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Mouse Controls Help */}
      <div className="bg-background/95 backdrop-blur-sm border border-border rounded-lg p-2 shadow-lg text-[9px] text-muted-foreground max-w-[140px]">
        <div className="space-y-0.5">
          <div className="flex items-center gap-1">
            <span className="font-semibold text-[8px]">LMB:</span>
            <span>Rotate</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="font-semibold text-[8px]">RMB:</span>
            <span>Pan</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="font-semibold text-[8px]">Wheel:</span>
            <span>Zoom</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="font-semibold text-[8px]">F:</span>
            <span>Fit All</span>
          </div>
        </div>
      </div>
    </div>
  )
}
