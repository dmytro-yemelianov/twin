"use client"

import { Button } from "@/components/ui/button"
import { ZoomIn, ZoomOut, Maximize2, RotateCw, Compass, Navigation, Target, Grid3x3 } from "lucide-react"
import { useState } from "react"

interface ViewportControlsProps {
  onResetCamera: () => void
  onFitView: () => void
  onSetView: (view: "top" | "bottom" | "front" | "back" | "left" | "right" | "isometric" | "perspective") => void
  onZoomIn: () => void
  onZoomOut: () => void
  onToggleOrigin?: () => void
  onToggleCompass?: () => void
  showOrigin?: boolean
  showCompass?: boolean
  currentView?: string
}

export function ViewportControls({
  onResetCamera,
  onFitView,
  onSetView,
  onZoomIn,
  onZoomOut,
  onToggleOrigin,
  onToggleCompass,
  showOrigin = false,
  showCompass = true,
  currentView = "perspective",
}: ViewportControlsProps) {
  const [hoveredFace, setHoveredFace] = useState<string | null>(null)

  const faces = [
    { view: "front" as const, label: "FRONT", position: "center", className: "col-start-2 row-start-2" },
    { view: "top" as const, label: "TOP", position: "top", className: "col-start-2 row-start-1" },
    { view: "side" as const, label: "RIGHT", position: "right", className: "col-start-3 row-start-2" },
  ]

  return (
    <div className="absolute top-4 right-4 z-20 flex flex-col gap-3">
      <div className="bg-background/95 backdrop-blur-sm border border-border rounded-lg p-3 shadow-lg">
        {/* 3D Navigation Cube */}
        <div className="grid grid-cols-3 grid-rows-3 gap-1 mb-3 relative">
          {/* Top face */}
          <button
            onClick={() => onSetView("top")}
            onMouseEnter={() => setHoveredFace("top")}
            onMouseLeave={() => setHoveredFace(null)}
            className={`
              col-start-2 row-start-1
              w-10 h-10 border border-border/50 rounded text-[8px] font-bold
              transition-all duration-200
              ${currentView === "top" ? "bg-primary text-primary-foreground" : "bg-muted/50 hover:bg-muted"}
              ${hoveredFace === "top" ? "scale-105 shadow-md" : ""}
            `}
            title="Top View (Plan)"
          >
            TOP
          </button>

          {/* Left face */}
          <button
            onClick={() => onSetView("left")}
            onMouseEnter={() => setHoveredFace("left")}
            onMouseLeave={() => setHoveredFace(null)}
            className={`
              col-start-1 row-start-2
              w-10 h-10 border border-border/50 rounded text-[8px] font-bold
              transition-all duration-200
              ${currentView === "left" ? "bg-primary text-primary-foreground" : "bg-muted/50 hover:bg-muted"}
              ${hoveredFace === "left" ? "scale-105 shadow-md" : ""}
            `}
            title="Left Side View"
          >
            LEFT
          </button>

          {/* Front face (center) */}
          <button
            onClick={() => onSetView("front")}
            onMouseEnter={() => setHoveredFace("front")}
            onMouseLeave={() => setHoveredFace(null)}
            className={`
              col-start-2 row-start-2
              w-10 h-10 border border-border/50 rounded text-[8px] font-bold
              transition-all duration-200
              ${currentView === "front" ? "bg-primary text-primary-foreground" : "bg-muted/50 hover:bg-muted"}
              ${hoveredFace === "front" ? "scale-105 shadow-md" : ""}
            `}
            title="Front View"
          >
            FRONT
          </button>

          {/* Right face */}
          <button
            onClick={() => onSetView("right")}
            onMouseEnter={() => setHoveredFace("right")}
            onMouseLeave={() => setHoveredFace(null)}
            className={`
              col-start-3 row-start-2
              w-10 h-10 border border-border/50 rounded text-[8px] font-bold
              transition-all duration-200
              ${currentView === "right" ? "bg-primary text-primary-foreground" : "bg-muted/50 hover:bg-muted"}
              ${hoveredFace === "right" ? "scale-105 shadow-md" : ""}
            `}
            title="Right Side View"
          >
            RIGHT
          </button>

          {/* Bottom face */}
          <button
            onClick={() => onSetView("bottom")}
            onMouseEnter={() => setHoveredFace("bottom")}
            onMouseLeave={() => setHoveredFace(null)}
            className={`
              col-start-2 row-start-3
              w-10 h-10 border border-border/50 rounded text-[8px] font-bold
              transition-all duration-200
              ${currentView === "bottom" ? "bg-primary text-primary-foreground" : "bg-muted/50 hover:bg-muted"}
              ${hoveredFace === "bottom" ? "scale-105 shadow-md" : ""}
            `}
            title="Bottom View"
          >
            BOTTOM
          </button>

          {/* Back face */}
          <button
            onClick={() => onSetView("back")}
            onMouseEnter={() => setHoveredFace("back")}
            onMouseLeave={() => setHoveredFace(null)}
            className={`
              col-start-1 row-start-3
              w-10 h-10 border border-border/50 rounded text-[8px] font-bold
              transition-all duration-200
              ${currentView === "back" ? "bg-primary text-primary-foreground" : "bg-muted/50 hover:bg-muted"}
              ${hoveredFace === "back" ? "scale-105 shadow-md" : ""}
            `}
            title="Back View"
          >
            BACK
          </button>

          {/* Isometric corner */}
          <button
            onClick={() => onSetView("isometric")}
            onMouseEnter={() => setHoveredFace("isometric")}
            onMouseLeave={() => setHoveredFace(null)}
            className={`
              col-start-3 row-start-1
              w-10 h-10 border border-border/50 rounded
              flex items-center justify-center
              transition-all duration-200
              ${currentView === "isometric" ? "bg-primary text-primary-foreground" : "bg-muted/50 hover:bg-muted"}
              ${hoveredFace === "isometric" ? "scale-105 shadow-md" : ""}
            `}
            title="Isometric View"
          >
            <Compass className="w-4 h-4" />
          </button>

          {/* Perspective corner */}
          <button
            onClick={() => onSetView("perspective")}
            onMouseEnter={() => setHoveredFace("perspective")}
            onMouseLeave={() => setHoveredFace(null)}
            className={`
              col-start-1 row-start-1
              w-10 h-10 border border-border/50 rounded text-[8px] font-bold
              transition-all duration-200
              ${currentView === "perspective" ? "bg-primary text-primary-foreground" : "bg-muted/50 hover:bg-muted"}
              ${hoveredFace === "perspective" ? "scale-105 shadow-md" : ""}
            `}
            title="Perspective View"
          >
            3D
          </button>
        </div>

        <div className="text-[9px] text-center text-muted-foreground border-t border-border/50 pt-2">
          <span className="font-semibold text-foreground">{currentView.toUpperCase()}</span>
        </div>
      </div>

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
