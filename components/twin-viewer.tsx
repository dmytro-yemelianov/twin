"use client"

import { useEffect, useState } from "react"
import { ThreeScene } from "@/components/three-scene"
import { InventoryPanel } from "@/components/inventory-panel"
import { AICapacityPanel } from "@/components/ai-capacity-panel"
import { TimelineView } from "@/components/timeline-view"
import { MaintenanceGantt } from "@/components/maintenance-gantt"
import { PhaseDemoPanel } from "@/components/phase-demo-panel"
import { GeometryManager } from "@/components/geometry-manager"
import { RackElevationView } from "@/components/rack-elevation-view"
import { EquipmentEditor } from "@/components/equipment-editor"
import { ViewportControls } from "@/components/viewport-controls"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Eye, EyeOff, Menu } from "lucide-react"
import { loadSceneConfig, loadDeviceTypes } from "@/lib/data-loader"
import { findAIReadyCapacity } from "@/lib/ai-capacity"
import type {
  Site,
  SceneConfig,
  DeviceType,
  Phase,
  Status4D,
  ColorMode,
  AICapacitySuggestion,
  Device,
} from "@/lib/types"
import { phaseVisibilityMap, status4DLabels } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Package, Sparkles, Settings2 } from "lucide-react"
import type { GeometryFile } from "@/lib/file-handler"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"

interface TwinViewerProps {
  site: Site
}

export function TwinViewer({ site }: TwinViewerProps) {
  const [sceneConfig, setSceneConfig] = useState<SceneConfig | null>(null)
  const [deviceTypes, setDeviceTypes] = useState<DeviceType[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentPhase, setCurrentPhase] = useState<Phase>("AS_IS")
  const [statusVisibility, setStatusVisibility] = useState<Record<Status4D, boolean>>({
    EXISTING_RETAINED: true,
    EXISTING_REMOVED: true,
    PROPOSED: true,
    FUTURE: true,
    MODIFIED: true,
  })
  const [colorMode, setColorMode] = useState<ColorMode>("4D_STATUS")
  const [showBuilding, setShowBuilding] = useState(true)
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null)
  const [showInventory, setShowInventory] = useState(false)
  const [aiCapacitySuggestion, setAiCapacitySuggestion] = useState<AICapacitySuggestion | null>(null)
  const [highlightedRacks, setHighlightedRacks] = useState<string[]>([])
  const [xrayMode, setXrayMode] = useState(false)
  const [showControlsDrawer, setShowControlsDrawer] = useState(false)
  const [showDemoDrawer, setShowDemoDrawer] = useState(false)
  const [customGeometry, setCustomGeometry] = useState<GeometryFile | null>(null)
  const [selectedRackId, setSelectedRackId] = useState<string | null>(null)
  const [currentCameraView, setCurrentCameraView] = useState("perspective")
  const [resetCameraTrigger, setResetCameraTrigger] = useState(0)
  const [fitViewTrigger, setFitViewTrigger] = useState(0)
  const [zoomInTrigger, setZoomInTrigger] = useState(0)
  const [zoomOutTrigger, setZoomOutTrigger] = useState(0)
  const [setViewTrigger, setSetViewTrigger] = useState<{ view: string; timestamp: number } | null>(null)

  useEffect(() => {
    Promise.all([loadSceneConfig(site.sceneConfigUri), loadDeviceTypes()])
      .then(([config, types]) => {
        setSceneConfig(config)
        setDeviceTypes(types)
        setIsLoading(false)
      })
      .catch((error) => {
        console.error("[v0] Failed to load scene data:", error)
        setIsLoading(false)
      })
  }, [site])

  // Compute visible statuses based on phase and checkboxes
  const visibleStatuses = new Set<Status4D>()
  const allowedByPhase = phaseVisibilityMap[currentPhase]
  allowedByPhase.forEach((status) => {
    if (statusVisibility[status]) {
      visibleStatuses.add(status)
    }
  })

  const handleStatusToggle = (status: Status4D, checked: boolean) => {
    setStatusVisibility((prev) => ({ ...prev, [status]: checked }))
  }

  const handleFindAICapacity = () => {
    if (!sceneConfig) return

    const suggestion = findAIReadyCapacity(sceneConfig, currentPhase)
    if (suggestion) {
      setAiCapacitySuggestion(suggestion)
      setHighlightedRacks(suggestion.rackIds)
    } else {
      alert("No suitable AI-ready capacity found in the current phase.")
    }
  }

  const handleCloseAICapacity = () => {
    setAiCapacitySuggestion(null)
    setHighlightedRacks([])
  }

  const handleDeviceModified = (updatedDevice: Device) => {
    if (!sceneConfig) return

    // Update the device in the scene config
    const updatedDevices = sceneConfig.devices.map((d) => (d.id === updatedDevice.id ? updatedDevice : d))

    setSceneConfig({
      ...sceneConfig,
      devices: updatedDevices,
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center w-full h-full bg-background">
        <div className="flex items-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Loading 3D scene...</span>
        </div>
      </div>
    )
  }

  if (!sceneConfig) {
    return (
      <div className="flex items-center justify-center w-full h-full bg-background">
        <div className="text-center space-y-2">
          <p className="text-lg font-medium">Failed to load scene</p>
          <p className="text-sm text-muted-foreground">Please try again</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full w-full overflow-hidden relative">
      <div className="absolute top-4 left-4 z-10 flex gap-2">
        <Button variant="default" size="sm" onClick={() => setShowControlsDrawer(true)} className="shadow-lg">
          <Settings2 className="w-4 h-4 mr-2" />
          Controls
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowDemoDrawer(true)}
          className="shadow-lg bg-background/95 backdrop-blur"
        >
          <Menu className="w-4 h-4 mr-2" />
          Demo Scenario
        </Button>
      </div>

      {aiCapacitySuggestion && (
        <div className="absolute top-4 right-4 z-10 max-w-sm">
          <AICapacityPanel suggestion={aiCapacitySuggestion} onClose={handleCloseAICapacity} />
        </div>
      )}

      <Sheet open={showControlsDrawer} onOpenChange={setShowControlsDrawer}>
        <SheetContent side="left" className="w-full sm:w-96 overflow-y-auto">
          <SheetHeader>
            <SheetTitle>3D Visualization Controls</SheetTitle>
          </SheetHeader>

          <div className="space-y-6 mt-6">
            <div className="space-y-3">
              <Label className="text-sm">Phase (4D Timeline)</Label>
              <Select value={currentPhase} onValueChange={(v) => setCurrentPhase(v as Phase)}>
                <SelectTrigger className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AS_IS">Phase 1: As-Is</SelectItem>
                  <SelectItem value="TO_BE">Phase 2: To-Be</SelectItem>
                  <SelectItem value="FUTURE">Phase 3: Future</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label className="text-sm">4D Status Layers</Label>
              <div className="space-y-2">
                {(Object.keys(status4DLabels) as Status4D[]).map((status) => {
                  const isAllowedByPhase = allowedByPhase.includes(status)
                  return (
                    <div key={status} className="flex items-center gap-2">
                      <Checkbox
                        id={status}
                        checked={statusVisibility[status]}
                        onCheckedChange={(checked) => handleStatusToggle(status, checked as boolean)}
                        disabled={!isAllowedByPhase}
                      />
                      <Label htmlFor={status} className={`text-sm ${!isAllowedByPhase ? "opacity-50" : ""}`}>
                        {status4DLabels[status]}
                      </Label>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-sm">Color Mode</Label>
              <Select value={colorMode} onValueChange={(v) => setColorMode(v as ColorMode)}>
                <SelectTrigger className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="4D_STATUS">4D Status</SelectItem>
                  <SelectItem value="CUSTOMER">Customer (Soon)</SelectItem>
                  <SelectItem value="POWER">Power (Soon)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="showBuilding"
                  checked={showBuilding}
                  onCheckedChange={(checked) => setShowBuilding(checked as boolean)}
                />
                <Label htmlFor="showBuilding" className="text-sm">
                  Building Shell
                </Label>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="xrayMode"
                  checked={xrayMode}
                  onCheckedChange={(checked) => setXrayMode(checked as boolean)}
                />
                <Label htmlFor="xrayMode" className="text-sm flex items-center gap-1">
                  {xrayMode ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  X-Ray Mode
                </Label>
              </div>
            </div>

            <div className="border-t border-border/50 pt-4 space-y-2">
              <Button
                variant={showInventory ? "secondary" : "outline"}
                size="sm"
                className="w-full text-sm"
                onClick={() => setShowInventory(!showInventory)}
              >
                <Package className="w-4 h-4 mr-2" />
                {showInventory ? "Hide" : "Show"} Inventory
              </Button>

              <Button
                variant="default"
                size="sm"
                className="w-full bg-green-600 hover:bg-green-700 text-sm"
                onClick={handleFindAICapacity}
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Find AI Capacity
              </Button>
            </div>

            <div className="border-t border-border/50 pt-4">
              <GeometryManager
                siteId={site.id}
                onGeometrySelect={setCustomGeometry}
                selectedGeometryId={customGeometry?.id}
              />
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={showDemoDrawer} onOpenChange={setShowDemoDrawer}>
        <SheetContent side="right" className="w-full sm:w-[500px]">
          <SheetHeader>
            <SheetTitle>Demo Scenario Guide</SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            <PhaseDemoPanel currentPhase={currentPhase} onPhaseChange={setCurrentPhase} />
          </div>
        </SheetContent>
      </Sheet>

      <div className="flex-1 min-h-0 w-full">
        <Tabs defaultValue="scene" className="h-full flex flex-col">
          <TabsList className="w-full grid grid-cols-5 shrink-0">
            <TabsTrigger value="scene" className="text-xs md:text-sm">
              3D Scene
            </TabsTrigger>
            <TabsTrigger value="elevation" className="text-xs md:text-sm">
              Rack 2D
            </TabsTrigger>
            <TabsTrigger value="editor" className="text-xs md:text-sm">
              Move
            </TabsTrigger>
            <TabsTrigger value="timeline" className="text-xs md:text-sm">
              Timeline
            </TabsTrigger>
            <TabsTrigger value="maintenance" className="text-xs md:text-sm">
              Maint.
            </TabsTrigger>
          </TabsList>

          <TabsContent
            value="scene"
            className="flex-1 min-h-0 flex flex-col gap-4 mt-0 data-[state=active]:flex relative"
          >
            <ViewportControls
              onResetCamera={() => setResetCameraTrigger((prev) => prev + 1)}
              onFitView={() => setFitViewTrigger((prev) => prev + 1)}
              onSetView={(view) => setSetViewTrigger({ view, timestamp: Date.now() })}
              onZoomIn={() => setZoomInTrigger((prev) => prev + 1)}
              onZoomOut={() => setZoomOutTrigger((prev) => prev + 1)}
              currentView={currentCameraView}
            />

            <div className="flex-1 min-h-0 w-full">
              <ThreeScene
                sceneConfig={sceneConfig}
                deviceTypes={deviceTypes}
                visibleStatuses={visibleStatuses}
                colorMode={colorMode}
                showBuilding={showBuilding}
                selectedDeviceId={selectedDeviceId}
                onDeviceSelect={setSelectedDeviceId}
                highlightedRacks={highlightedRacks}
                xrayMode={xrayMode}
                customGeometry={customGeometry}
                onCameraView={setCurrentCameraView}
                triggerResetCamera={resetCameraTrigger}
                triggerFitView={fitViewTrigger}
                triggerZoomIn={zoomInTrigger}
                triggerZoomOut={zoomOutTrigger}
                triggerSetView={setViewTrigger}
              />
            </div>

            {showInventory && (
              <div className="h-64 md:h-80 border-t">
                <InventoryPanel
                  sceneConfig={sceneConfig}
                  selectedDeviceId={selectedDeviceId}
                  onDeviceSelect={setSelectedDeviceId}
                  onClose={() => setShowInventory(false)}
                />
              </div>
            )}
          </TabsContent>

          <TabsContent value="elevation" className="flex-1 min-h-0 mt-0 overflow-auto data-[state=active]:block">
            <RackElevationView
              sceneConfig={sceneConfig}
              deviceTypes={deviceTypes}
              selectedRackId={selectedRackId}
              onRackSelect={setSelectedRackId}
              selectedDeviceId={selectedDeviceId}
              onDeviceSelect={setSelectedDeviceId}
            />
          </TabsContent>

          <TabsContent value="editor" className="flex-1 min-h-0 mt-0 overflow-auto p-4 data-[state=active]:block">
            <EquipmentEditor
              sceneConfig={sceneConfig}
              selectedDeviceId={selectedDeviceId}
              onDeviceModified={handleDeviceModified}
            />
          </TabsContent>

          <TabsContent value="timeline" className="flex-1 min-h-0 mt-0 overflow-auto p-4 data-[state=active]:block">
            <TimelineView devices={sceneConfig.devices} currentPhase={currentPhase} />
          </TabsContent>

          <TabsContent value="maintenance" className="flex-1 min-h-0 mt-0 overflow-auto p-4 data-[state=active]:block">
            <MaintenanceGantt />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
