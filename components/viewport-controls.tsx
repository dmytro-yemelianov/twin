"use client"

import { Button } from "@/components/ui/button"
import { ZoomIn, ZoomOut, Maximize2, RotateCw, Compass } from "lucide-react"
import { useState } from "react"

interface ViewportControlsProps {
  onResetCamera: () => void
  onFitView: () => void
  onSetView: (view: "top" | "front" | "side" | "isometric" | "perspective") => void
  onZoomIn: () => void
  onZoomOut: () => void
  currentView?: string
}

export function ViewportControls({
  onResetCamera,
  onFitView,
  onSetView,
  onZoomIn,
  onZoomOut,
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
        <div className="grid grid-cols-3 grid-rows-3 gap-1 mb-3">
          {/* Top face */}
          <button
            onClick={() => onSetView("top")}
            onMouseEnter={() => setHoveredFace("top")}
            onMouseLeave={() => setHoveredFace(null)}
            className={`
              col-start-2 row-start-1
              w-12 h-12 border border-border/50 rounded
              flex items-center justify-center text-[10px] font-bold
              transition-all duration-200
              ${currentView === "top" ? "bg-primary text-primary-foreground" : "bg-muted/50 hover:bg-muted"}
              ${hoveredFace === "top" ? "scale-105 shadow-md" : ""}
            `}
            title="Top View (Plan)"
          >
            <div className="text-center leading-tight">
              TOP
              <div className="text-[8px] opacity-70">XY</div>
            </div>
          </button>

          {/* Front face */}
          <button
            onClick={() => onSetView("front")}
            onMouseEnter={() => setHoveredFace("front")}
            onMouseLeave={() => setHoveredFace(null)}
            className={`
              col-start-2 row-start-2
              w-12 h-12 border border-border/50 rounded
              flex items-center justify-center text-[10px] font-bold
              transition-all duration-200
              ${currentView === "front" ? "bg-primary text-primary-foreground" : "bg-muted/50 hover:bg-muted"}
              ${hoveredFace === "front" ? "scale-105 shadow-md" : ""}
            `}
            title="Front View (Elevation)"
          >
            <div className="text-center leading-tight">
              FRONT
              <div className="text-[8px] opacity-70">XZ</div>
            </div>
          </button>

          {/* Right face */}
          <button
            onClick={() => onSetView("side")}
            onMouseEnter={() => setHoveredFace("side")}
            onMouseLeave={() => setHoveredFace(null)}
            className={`
              col-start-3 row-start-2
              w-12 h-12 border border-border/50 rounded
              flex items-center justify-center text-[10px] font-bold
              transition-all duration-200
              ${currentView === "side" ? "bg-primary text-primary-foreground" : "bg-muted/50 hover:bg-muted"}
              ${hoveredFace === "side" ? "scale-105 shadow-md" : ""}
            `}
            title="Right Side View"
          >
            <div className="text-center leading-tight">
              RIGHT
              <div className="text-[8px] opacity-70">YZ</div>
            </div>
          </button>

          {/* Isometric button - corner position */}
          <button
            onClick={() => onSetView("isometric")}
            onMouseEnter={() => setHoveredFace("isometric")}
            onMouseLeave={() => setHoveredFace(null)}
            className={`
              col-start-3 row-start-1
              w-12 h-12 border border-border/50 rounded
              flex items-center justify-center
              transition-all duration-200
              ${currentView === "isometric" ? "bg-primary text-primary-foreground" : "bg-muted/50 hover:bg-muted"}
              ${hoveredFace === "isometric" ? "scale-105 shadow-md" : ""}
            `}
            title="Isometric View (45°)"
          >
            <Compass className="w-5 h-5" />
          </button>

          {/* Perspective button - corner position */}
          <button
            onClick={() => onSetView("perspective")}
            onMouseEnter={() => setHoveredFace("perspective")}
            onMouseLeave={() => setHoveredFace(null)}
            className={`
              col-start-1 row-start-1
              w-12 h-12 border border-border/50 rounded
              flex items-center justify-center text-[10px] font-bold
              transition-all duration-200
              ${currentView === "perspective" ? "bg-primary text-primary-foreground" : "bg-muted/50 hover:bg-muted"}
              ${hoveredFace === "perspective" ? "scale-105 shadow-md" : ""}
            `}
            title="Perspective View"
          >
            <div className="text-center leading-tight">3D</div>
          </button>
        </div>

        <div className="text-[10px] text-center text-muted-foreground border-t border-border/50 pt-2">
          Current: <span className="font-semibold text-foreground">{currentView.toUpperCase()}</span>
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

      <div className="bg-background/95 backdrop-blur-sm border border-border rounded-lg p-2 shadow-lg text-[10px] text-muted-foreground max-w-[160px]">
        <div className="space-y-0.5">
          <div className="flex items-center gap-1">
            <span className="font-semibold">LMB:</span>
            <span>Rotate</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="font-semibold">RMB:</span>
            <span>Pan</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="font-semibold">Wheel:</span>
            <span>Zoom</span>
          </div>
        </div>
      </div>
    </div>
  )
}
