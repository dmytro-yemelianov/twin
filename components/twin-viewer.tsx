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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Card } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/components/ui/use-toast"

interface TwinViewerProps {
  site: Site
}

export function TwinViewer({ site }: TwinViewerProps) {
  const [sceneConfig, setSceneConfig] = useState<SceneConfig | null>(null)
  const [deviceTypes, setDeviceTypes] = useState<DeviceType[]>([])
  const [isSceneLoading, setIsSceneLoading] = useState(true)
  const [deviceTypesLoading, setDeviceTypesLoading] = useState(true)
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
  const [showDemoDrawer, setShowDemoDrawer] = useState(false)
  const [customGeometry, setCustomGeometry] = useState<GeometryFile | null>(null)
  const [showGeometryDialog, setShowGeometryDialog] = useState(false)
  const [selectedRackId, setSelectedRackId] = useState<string | null>(null)
  const [currentCameraView, setCurrentCameraView] = useState("perspective")
  const [resetCameraTrigger, setResetCameraTrigger] = useState(0)
  const [fitViewTrigger, setFitViewTrigger] = useState(0)
  const [zoomInTrigger, setZoomInTrigger] = useState(0)
  const [zoomOutTrigger, setZoomOutTrigger] = useState(0)
  const [setViewTrigger, setSetViewTrigger] = useState<{ view: string; timestamp: number } | null>(null)

  const { toast } = useToast()

  useEffect(() => {
    let isCancelled = false
    const controller = new AbortController()
    setIsSceneLoading(true)

    loadSceneConfig(site.sceneConfigUri, controller.signal)
      .then((config) => {
        if (isCancelled) return
        setSceneConfig(config)
      })
      .catch((error) => {
        if (isCancelled) return
        console.error("[v0] Failed to load scene data:", error)
      })
      .finally(() => {
        if (!isCancelled) {
          setIsSceneLoading(false)
        }
      })

    return () => {
      isCancelled = true
      controller.abort()
    }
  }, [site])

  useEffect(() => {
    let isCancelled = false
    const controller = new AbortController()
    setDeviceTypesLoading(true)

    loadDeviceTypes(controller.signal)
      .then((types) => {
        if (isCancelled) return
        setDeviceTypes(types)
        setDeviceTypesLoading(false)
      })
      .catch((error) => {
        if (isCancelled) return
        console.error("[v0] Failed to load device types:", error)
        setDeviceTypesLoading(false)
      })

    return () => {
      isCancelled = true
      controller.abort()
    }
  }, [])

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
      toast({
        title: "No AI-ready capacity found",
        description: "Try a different phase or adjust the visible status filters.",
      })
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

  const isLoading = isSceneLoading || deviceTypesLoading

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
      <div className="absolute top-4 left-4 z-20 flex flex-col gap-3 w-[280px]">
        <Card className="bg-card/95 backdrop-blur border-border/60 shadow-xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold flex items-center gap-2">
              <Settings2 className="w-4 h-4" />
              Controls
            </div>
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => setShowDemoDrawer(true)}>
              <Menu className="w-3 h-3 mr-1" />
              Demo
            </Button>
          </div>

          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Phase</Label>
            <Select value={currentPhase} onValueChange={(v) => setCurrentPhase(v as Phase)}>
              <SelectTrigger className="text-sm h-8">
                <SelectValue placeholder="Select phase" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="AS_IS">Phase 1: As-Is</SelectItem>
                <SelectItem value="TO_BE">Phase 2: To-Be</SelectItem>
                <SelectItem value="FUTURE">Phase 3: Future</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <div className="space-y-2 max-h-48 overflow-auto pr-1">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">4D Status Layers</Label>
            <div className="space-y-2">
              {(Object.keys(status4DLabels) as Status4D[]).map((status) => {
                const isAllowedByPhase = allowedByPhase.includes(status)
                return (
                  <div key={status} className="flex items-center gap-2">
                    <Checkbox
                      id={`status-${status}`}
                      checked={statusVisibility[status]}
                      onCheckedChange={(checked) => handleStatusToggle(status, checked as boolean)}
                      disabled={!isAllowedByPhase}
                    />
                    <Label htmlFor={`status-${status}`} className={`text-sm ${!isAllowedByPhase ? "opacity-50" : ""}`}>
                      {status4DLabels[status]}
                    </Label>
                  </div>
                )
              })}
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Color Mode</Label>
            <Select value={colorMode} onValueChange={(v) => setColorMode(v as ColorMode)}>
              <SelectTrigger className="text-sm h-8">
                <SelectValue placeholder="Select mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="4D_STATUS">4D Status</SelectItem>
                <SelectItem value="CUSTOMER" disabled>
                  Customer (Soon)
                </SelectItem>
                <SelectItem value="POWER" disabled>
                  Power (Soon)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <div className="space-y-3">
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
              <Checkbox id="xrayMode" checked={xrayMode} onCheckedChange={(checked) => setXrayMode(checked as boolean)} />
              <Label htmlFor="xrayMode" className="text-sm flex items-center gap-1">
                {xrayMode ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                X-Ray Mode
              </Label>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <Button
              variant={showInventory ? "default" : "outline"}
              size="sm"
              className="w-full justify-between"
              onClick={() => setShowInventory(!showInventory)}
            >
              <span className="flex items-center gap-2 text-sm">
                <Package className="w-4 h-4" />
                Inventory
              </span>
              <span className="text-xs uppercase tracking-wide">{showInventory ? "Hide" : "Show"}</span>
            </Button>
            <Button variant="default" size="sm" className="w-full bg-green-600 hover:bg-green-700" onClick={handleFindAICapacity}>
              <Sparkles className="w-4 h-4 mr-2" />
              Find AI Capacity
            </Button>
            <Button variant="outline" size="sm" className="w-full justify-between" onClick={() => setShowGeometryDialog(true)}>
              <span className="flex items-center gap-2 text-sm">
                <Package className="w-4 h-4" />
                Custom Geometry
              </span>
              <span className="text-xs uppercase tracking-wide">{customGeometry ? "Loaded" : "Default"}</span>
            </Button>
          </div>
        </Card>
      </div>

      {aiCapacitySuggestion && (
        <div className="absolute top-4 right-4 z-10 max-w-sm">
          <AICapacityPanel suggestion={aiCapacitySuggestion} onClose={handleCloseAICapacity} />
        </div>
      )}
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

      <Dialog open={showGeometryDialog} onOpenChange={setShowGeometryDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Custom Building Geometry</DialogTitle>
          </DialogHeader>
          <GeometryManager siteId={site.id} onGeometrySelect={setCustomGeometry} selectedGeometryId={customGeometry?.id} />
        </DialogContent>
      </Dialog>

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
                selectedRackId={selectedRackId}
                onRackSelect={setSelectedRackId}
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
