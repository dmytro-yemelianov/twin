"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Maximize2, RotateCw, Eye, Compass, Box, Layers, Grid3x3, ZoomIn, ZoomOut } from "lucide-react"

interface CameraControlsProps {
  onResetCamera: () => void
  onFitView: () => void
  onSetView: (view: "top" | "front" | "side" | "isometric" | "perspective") => void
  onZoomIn: () => void
  onZoomOut: () => void
  currentView?: string
}

export function CameraControls({
  onResetCamera,
  onFitView,
  onSetView,
  onZoomIn,
  onZoomOut,
  currentView = "perspective",
}: CameraControlsProps) {
  return (
    <Card className="p-3 space-y-3 border-border/50">
      <div className="space-y-2">
        <Label className="text-xs font-semibold">Camera Controls</Label>

        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" size="sm" onClick={onZoomIn} className="text-xs bg-transparent" title="Zoom In">
            <ZoomIn className="w-3 h-3 mr-1" />
            Zoom +
          </Button>
          <Button variant="outline" size="sm" onClick={onZoomOut} className="text-xs bg-transparent" title="Zoom Out">
            <ZoomOut className="w-3 h-3 mr-1" />
            Zoom -
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onFitView}
            className="text-xs bg-transparent"
            title="Fit All Objects"
          >
            <Maximize2 className="w-3 h-3 mr-1" />
            Fit All
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onResetCamera}
            className="text-xs bg-transparent"
            title="Reset Camera"
          >
            <RotateCw className="w-3 h-3 mr-1" />
            Reset
          </Button>
        </div>
      </div>

      <div className="space-y-2 border-t border-border/50 pt-3">
        <Label className="text-xs font-semibold">Predefined Views</Label>

        <div className="grid grid-cols-2 gap-2">
          <Button
            variant={currentView === "top" ? "secondary" : "outline"}
            size="sm"
            onClick={() => onSetView("top")}
            className="text-xs"
            title="Top View (Plan)"
          >
            <Grid3x3 className="w-3 h-3 mr-1" />
            Top
          </Button>
          <Button
            variant={currentView === "front" ? "secondary" : "outline"}
            size="sm"
            onClick={() => onSetView("front")}
            className="text-xs"
            title="Front View (Elevation)"
          >
            <Layers className="w-3 h-3 mr-1" />
            Front
          </Button>
          <Button
            variant={currentView === "side" ? "secondary" : "outline"}
            size="sm"
            onClick={() => onSetView("side")}
            className="text-xs"
            title="Side View"
          >
            <Box className="w-3 h-3 mr-1" />
            Side
          </Button>
          <Button
            variant={currentView === "isometric" ? "secondary" : "outline"}
            size="sm"
            onClick={() => onSetView("isometric")}
            className="text-xs"
            title="Isometric View (45°)"
          >
            <Compass className="w-3 h-3 mr-1" />
            Iso
          </Button>
          <Button
            variant={currentView === "perspective" ? "secondary" : "outline"}
            size="sm"
            onClick={() => onSetView("perspective")}
            className="text-xs col-span-2"
            title="Perspective View"
          >
            <Eye className="w-3 h-3 mr-1" />
            Perspective
          </Button>
        </div>
      </div>

      <div className="text-xs text-muted-foreground border-t border-border/50 pt-2">
        <p className="mb-1">Mouse Controls:</p>
        <ul className="space-y-0.5 text-[10px]">
          <li>• Drag: Rotate view</li>
          <li>• Wheel: Zoom in/out</li>
          <li>• Right-click + drag: Pan</li>
        </ul>
      </div>
    </Card>
  )
}
