"use client"
import { Card } from "./ui/card"
import type { DeviceType, SceneConfig } from "@/lib/types"
import { status4DColors } from "@/lib/types"
import { Eye } from "lucide-react"
import type { JSX } from "react/jsx-runtime"

interface RackElevationViewProps {
  sceneConfig: SceneConfig
  deviceTypes: DeviceType[]
  selectedRackId: string | null
  onRackSelect: (rackId: string) => void
  selectedDeviceId: string | null
  onDeviceSelect: (deviceId: string | null) => void
}

export function RackElevationView({
  sceneConfig,
  deviceTypes,
  selectedRackId,
  onRackSelect,
  selectedDeviceId,
  onDeviceSelect,
}: RackElevationViewProps) {
  const getDeviceTypeName = (deviceTypeId: string) => {
    const deviceType = deviceTypes.find((dt) => dt.id === deviceTypeId)
    return deviceType?.category || "DEVICE"
  }

  const handleDeviceClick = (deviceId: string) => {
    if (selectedDeviceId === deviceId) {
      onDeviceSelect(null)
    } else {
      onDeviceSelect(deviceId)
    }
  }

  const handleRackClick = (rackId: string) => {
    onRackSelect(rackId)
  }

  const renderRack = (rackId: string) => {
    const rack = sceneConfig.racks.find((r) => r.id === rackId)
    if (!rack) return null

    const devicesInRack = sceneConfig.devices
      .filter((d) => d.rackId === rack.id && d.status4D !== "EXISTING_REMOVED")
      .sort((a, b) => a.uStart - b.uStart)

    const uHeight = rack.uHeight || 42
    const units: JSX.Element[] = []

    // Real rack proportions: 1U = 1.75 inches (44.45mm), rack width = 19 inches (482.6mm)
    // Using 8px per U for proportional height, and 152px width (19:1.75 ≈ 10.86, so 8*10.86 ≈ 87px, but we use 152px for better visibility)
    const uHeightPx = 8
    const rackWidthPx = 152

    for (let u = uHeight; u >= 1; u--) {
      const deviceAtU = devicesInRack.find((d) => d.uStart <= u && d.uStart + d.uHeight > u)
      const isDeviceStart = deviceAtU && deviceAtU.uStart === u

      if (isDeviceStart && deviceAtU) {
        const deviceType = getDeviceTypeName(deviceAtU.deviceTypeId)
        const color = status4DColors[deviceAtU.status4D]
        const isSelected = selectedDeviceId === deviceAtU.id

        units.push(
          <div
            key={`${rack.id}-${u}-device`}
            className={`cursor-pointer transition-all border border-gray-700/30 ${
              isSelected ? "ring-2 ring-blue-400 z-10" : "hover:ring-1 hover:ring-gray-400"
            }`}
            style={{
              height: `${deviceAtU.uHeight * uHeightPx}px`,
              backgroundColor: color,
              opacity: isSelected ? 1 : 0.85,
            }}
            onClick={() => handleDeviceClick(deviceAtU.id)}
          >
            <div className="h-full px-1 flex flex-col justify-center text-white overflow-hidden">
              <div className="text-[9px] font-semibold truncate leading-tight">{deviceAtU.name}</div>
              <div className="text-[8px] opacity-90 truncate leading-tight">{deviceType}</div>
              <div className="text-[7px] opacity-75 leading-tight">
                U{deviceAtU.uStart}-{deviceAtU.uStart + deviceAtU.uHeight - 1}
              </div>
            </div>
          </div>,
        )
      } else if (!deviceAtU) {
        units.push(
          <div
            key={`${rack.id}-${u}-empty`}
            className="border border-border/20 bg-background/30 flex items-center justify-center"
            style={{ height: `${uHeightPx}px` }}
          >
            <span className="text-[7px] text-muted-foreground">U{u}</span>
          </div>,
        )
      }
    }

    const isSelected = selectedRackId === rack.id

    return (
      <Card
        key={rack.id}
        className={`shrink-0 p-3 cursor-pointer transition-all ${
          isSelected ? "ring-2 ring-blue-500 bg-blue-950/20" : "hover:ring-1 hover:ring-gray-500"
        }`}
        style={{ width: `${rackWidthPx + 24}px` }}
        onClick={() => handleRackClick(rack.id)}
      >
        {/* Rack Header */}
        <div className="mb-2 pb-2 border-b border-border/30">
          <div className="text-sm font-semibold truncate">{rack.name}</div>
          <div className="text-[10px] text-muted-foreground space-y-0.5 mt-1">
            <div>{rack.uHeight}U</div>
            <div>
              {rack.currentPowerKw.toFixed(1)}/{rack.powerKwLimit.toFixed(1)}kW
            </div>
            <div>{devicesInRack.length} devices</div>
          </div>
        </div>

        {/* Front View */}
        <div className="mb-3">
          <div className="flex items-center gap-1 mb-1">
            <Eye className="w-3 h-3" />
            <span className="text-[10px] font-semibold">Front</span>
          </div>
          <div
            className="bg-card border border-border/40 rounded"
            style={{
              width: `${rackWidthPx}px`,
              display: "flex",
              flexDirection: "column",
            }}
          >
            {units}
          </div>
        </div>

        {/* Back View */}
        <div>
          <div className="flex items-center gap-1 mb-1">
            <Eye className="w-3 h-3" />
            <span className="text-[10px] font-semibold">Back</span>
          </div>
          <div
            className="bg-card border border-border/40 rounded"
            style={{
              width: `${rackWidthPx}px`,
              display: "flex",
              flexDirection: "column",
            }}
          >
            {units}
          </div>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Rack Elevation Views</h3>
          <p className="text-sm text-muted-foreground">All racks shown with front and back views</p>
        </div>
      </div>

      {/* Horizontal Scrolling Rack Container */}
      <div className="relative">
        <div className="flex gap-4 overflow-x-auto pb-4" style={{ scrollSnapType: "x mandatory" }}>
          {sceneConfig.racks.map((rack) => renderRack(rack.id))}
        </div>
      </div>

      {/* Legend */}
      <Card className="p-3">
        <h4 className="text-sm font-semibold mb-2">4D Status Legend</h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 text-xs">
          {Object.entries(status4DColors).map(([status, color]) => (
            <div key={status} className="flex items-center gap-2">
              <div className="w-4 h-4 rounded border border-gray-600" style={{ backgroundColor: color }} />
              <span className="truncate">{status.replace(/_/g, " ")}</span>
            </div>
          ))}
        </div>
      </Card>

      {selectedDeviceId && (
        <Card className="p-3 bg-blue-950/20 border-blue-800">
          <div className="text-sm">
            <div className="font-semibold mb-1">Selected Device</div>
            <div className="text-muted-foreground text-xs">
              Device is highlighted in all views. Click again to deselect or select another device.
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}
