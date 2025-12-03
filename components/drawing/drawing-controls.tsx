import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ZoomIn, ZoomOut, Maximize2, Printer, FileText, Download } from "lucide-react"
import { DrawingType } from "./types"
import { SceneConfig } from "@/lib/types"

interface DrawingControlsProps {
    drawingType: DrawingType
    setDrawingType: (type: DrawingType) => void
    zoom: number
    setZoom: (zoom: number | ((prev: number) => number)) => void
    showGrid: boolean
    setShowGrid: (show: boolean) => void
    showDimensions: boolean
    setShowDimensions: (show: boolean) => void
    showLabels: boolean
    setShowLabels: (show: boolean) => void
    onExportSVG: () => void
    onExportPNG: () => void
    onClose?: () => void
    sceneConfig: SceneConfig
    selectedFloorId: string | null
    setSelectedFloorId: (id: string | null) => void
    selectedRoomId: string | null
    setSelectedRoomId: (id: string | null) => void
    selectedRackId: string | null
    setSelectedRackId: (id: string | null) => void
}

export function DrawingControls({
    drawingType,
    setDrawingType,
    zoom,
    setZoom,
    showGrid,
    setShowGrid,
    showDimensions,
    setShowDimensions,
    showLabels,
    setShowLabels,
    onExportSVG,
    onExportPNG,
    onClose,
    sceneConfig,
    selectedFloorId,
    setSelectedFloorId,
    selectedRoomId,
    setSelectedRoomId,
    selectedRackId,
    setSelectedRackId
}: DrawingControlsProps) {
    return (
        <div className="flex flex-col gap-4 p-4 border-b border-border/50 bg-card/50 backdrop-blur">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Select value={drawingType} onValueChange={(v) => setDrawingType(v as DrawingType)}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Select drawing type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="floor-plan">Floor Plan</SelectItem>
                            <SelectItem value="rack-elevation">Rack Elevation</SelectItem>
                            <SelectItem value="room-layout">Room Layout</SelectItem>
                        </SelectContent>
                    </Select>

                    {/* Context Selectors based on type */}
                    {drawingType === 'floor-plan' && sceneConfig.floors && (
                        <Select value={selectedFloorId || ''} onValueChange={setSelectedFloorId}>
                            <SelectTrigger className="w-[200px]">
                                <SelectValue placeholder="Select Floor" />
                            </SelectTrigger>
                            <SelectContent>
                                {sceneConfig.floors.map(f => (
                                    <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}

                    {drawingType === 'room-layout' && sceneConfig.rooms && (
                        <Select value={selectedRoomId || ''} onValueChange={setSelectedRoomId}>
                            <SelectTrigger className="w-[200px]">
                                <SelectValue placeholder="Select Room" />
                            </SelectTrigger>
                            <SelectContent>
                                {sceneConfig.rooms.map(r => (
                                    <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}

                    {drawingType === 'rack-elevation' && sceneConfig.racks && (
                        <Select value={selectedRackId || ''} onValueChange={setSelectedRackId}>
                            <SelectTrigger className="w-[200px]">
                                <SelectValue placeholder="Select Rack" />
                            </SelectTrigger>
                            <SelectContent>
                                {sceneConfig.racks.map(r => (
                                    <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={() => setZoom(z => Math.max(0.1, z - 0.1))}>
                        <ZoomOut className="w-4 h-4" />
                    </Button>
                    <span className="w-12 text-center text-sm">{(zoom * 100).toFixed(0)}%</span>
                    <Button variant="outline" size="icon" onClick={() => setZoom(z => Math.min(5, z + 0.1))}>
                        <ZoomIn className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => setZoom(1)}>
                        <Maximize2 className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <Button
                            variant={showGrid ? "secondary" : "ghost"}
                            size="sm"
                            onClick={() => setShowGrid(!showGrid)}
                        >
                            Grid
                        </Button>
                        <Button
                            variant={showDimensions ? "secondary" : "ghost"}
                            size="sm"
                            onClick={() => setShowDimensions(!showDimensions)}
                        >
                            Dimensions
                        </Button>
                        <Button
                            variant={showLabels ? "secondary" : "ghost"}
                            size="sm"
                            onClick={() => setShowLabels(!showLabels)}
                        >
                            Labels
                        </Button>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={onExportSVG}>
                        <FileText className="w-4 h-4 mr-2" />
                        Export SVG
                    </Button>
                    <Button variant="outline" size="sm" onClick={onExportPNG}>
                        <Download className="w-4 h-4 mr-2" />
                        Export PNG
                    </Button>
                    {onClose && (
                        <Button variant="ghost" size="sm" onClick={onClose}>
                            Close
                        </Button>
                    )}
                </div>
            </div>
        </div>
    )
}
