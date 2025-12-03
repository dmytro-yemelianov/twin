"use client"

import { useState, useMemo } from "react"
import { Card } from "./ui/card"
import { Button } from "./ui/button"
import { Label } from "./ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Textarea } from "./ui/textarea"
import { Input } from "./ui/input"
import type { Device, SceneConfig, Status4D, Phase } from "@/lib/types"
import { status4DColors, status4DLabels } from "@/lib/types"
import { validateDevicePlacement, getAvailableUPositions } from "@/lib/validation"
import { addModification, getModifications } from "@/lib/modification-tracker"
import { Move, AlertCircle, CheckCircle2, History, ArrowRight, GitBranch, MapPin, Trash2 } from "lucide-react"
import { MoveDeviceDialog, DeleteDeviceDialog } from "@/components/devices"
import { DeviceStateMachine } from "@/components/devices/device-state-machine"

interface EquipmentEditorProps {
  sceneConfig: SceneConfig
  selectedDeviceId: string | null
  currentPhase: Phase
  onDeviceModified: (updatedDevice: Device) => void
  onClose?: () => void
}

export function EquipmentEditor({ sceneConfig, selectedDeviceId, currentPhase, onDeviceModified, onClose }: EquipmentEditorProps) {
  const selectedDevice = useMemo(() => {
    return sceneConfig.devices.find((d) => d.id === selectedDeviceId)
  }, [sceneConfig, selectedDeviceId])

  const [showMoveDialog, setShowMoveDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  // Get all related devices (same logicalEquipmentId) across all 4D states
  const deviceHistory = useMemo(() => {
    if (!selectedDevice) return []
    return sceneConfig.devices
      .filter((d) => d.logicalEquipmentId === selectedDevice.logicalEquipmentId)
      .sort((a, b) => {
        // Sort by 4D status order
        const statusOrder: Status4D[] = ["EXISTING_REMOVED", "EXISTING_RETAINED", "MODIFIED", "PROPOSED", "FUTURE"]
        return statusOrder.indexOf(a.status4D) - statusOrder.indexOf(b.status4D)
      })
  }, [sceneConfig, selectedDevice])

  const [targetRackId, setTargetRackId] = useState<string>(selectedDevice?.rackId || "")
  const [targetUPosition, setTargetUPosition] = useState<string>(selectedDevice?.uStart.toString() || "")
  const [targetPhase, setTargetPhase] = useState<Phase>(currentPhase)
  const [scheduledDate, setScheduledDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState<string>("")
  const [validationResult, setValidationResult] = useState<ReturnType<typeof validateDevicePlacement> | null>(null)

  const availableUPositions = useMemo(() => {
    if (!selectedDevice || !targetRackId) return []
    return getAvailableUPositions(targetRackId, selectedDevice.uHeight, sceneConfig.devices, sceneConfig.racks)
  }, [targetRackId, selectedDevice, sceneConfig])

  const targetRack = useMemo(() => {
    return sceneConfig.racks.find((r) => r.id === targetRackId)
  }, [targetRackId, sceneConfig])

  const modifications = useMemo(() => {
    if (!selectedDeviceId) return []
    return getModifications().filter((m) => m.deviceId === selectedDeviceId)
  }, [selectedDeviceId])

  const handleRackChange = (rackId: string) => {
    setTargetRackId(rackId)
    setTargetUPosition("")
    setValidationResult(null)
  }

  const handleUPositionChange = (uPos: string) => {
    setTargetUPosition(uPos)

    if (!selectedDevice || !targetRackId || !uPos) {
      setValidationResult(null)
      return
    }

    const uPosition = Number.parseInt(uPos)
    if (isNaN(uPosition)) {
      setValidationResult(null)
      return
    }

    const result = validateDevicePlacement(
      selectedDevice,
      targetRackId,
      uPosition,
      sceneConfig.devices,
      sceneConfig.racks,
    )
    setValidationResult(result)
  }

  const handleMove = () => {
    if (!selectedDevice || !targetRackId || !targetUPosition || !validationResult?.valid) {
      return
    }

    const uPosition = Number.parseInt(targetUPosition)
    const isMovingRacks = targetRackId !== selectedDevice.rackId
    const isMovingPosition = uPosition !== selectedDevice.uStart

    if (!isMovingRacks && !isMovingPosition) {
      alert("Device is already at this position")
      return
    }

    // Determine new status based on modification
    let newStatus: Status4D = selectedDevice.status4D
    if (selectedDevice.status4D === "EXISTING_RETAINED") {
      newStatus = "MODIFIED"
    }

    // Create updated device
    const updatedDevice: Device = {
      ...selectedDevice,
      rackId: targetRackId,
      uStart: uPosition,
      status4D: newStatus,
    }

    // Log the modification with phase scheduling
    const modification = addModification({
      type: "move",
      deviceId: selectedDevice.id,
      deviceName: selectedDevice.name,
      targetPhase: targetPhase,
      scheduledDate: scheduledDate,
      isApplied: targetPhase === currentPhase, // Only apply if target phase matches current
      from: {
        rackId: selectedDevice.rackId,
        uPosition: selectedDevice.uStart,
      },
      to: {
        rackId: targetRackId,
        uPosition: uPosition,
      },
      statusChange:
        newStatus !== selectedDevice.status4D
          ? {
              from: selectedDevice.status4D,
              to: newStatus,
            }
          : undefined,
      notes: notes || undefined,
    })

    // Only apply the modification immediately if target phase matches current phase
    if (targetPhase === currentPhase) {
      onDeviceModified(updatedDevice)
      alert("Device moved successfully!")
    } else {
      alert(`Move scheduled for ${targetPhase} phase on ${scheduledDate}`)
    }

    // Reset form
    setNotes("")
    setValidationResult(null)
  }

  if (!selectedDevice) {
    return (
      <Card className="p-6 text-center">
        <Move className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm text-muted-foreground">No device selected</p>
        <p className="text-xs text-muted-foreground mt-1">Select a device to modify its position</p>
      </Card>
    )
  }

  const fromRack = sceneConfig.racks.find((r) => r.id === selectedDevice.rackId)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Equipment Editor</h3>
          <p className="text-xs text-muted-foreground">Manage equipment lifecycle and positioning</p>
        </div>
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        )}
      </div>

      {/* Current Device Info with Actions */}
      <Card className="p-4 bg-muted/20">
        <div className="space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs text-muted-foreground">Selected Device</div>
              <div className="font-semibold">{selectedDevice.name}</div>
            </div>
            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowMoveDialog(true)}
              >
                <Move className="h-4 w-4 mr-1" />
                Move
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowDeleteDialog(true)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div>
              <div className="text-muted-foreground">Current Rack</div>
              <div className="font-medium">{fromRack?.name}</div>
            </div>
            <div>
              <div className="text-muted-foreground">U Position</div>
              <div className="font-medium">U{selectedDevice.uStart}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Height</div>
              <div className="font-medium">{selectedDevice.uHeight}U</div>
            </div>
          </div>
          
          {/* State Machine Visualization */}
          <div className="pt-2 border-t border-border/30">
            <DeviceStateMachine 
              currentState={selectedDevice.status4D} 
              targetState={selectedDevice.status4D}
              compact
            />
          </div>
        </div>
      </Card>

      {/* 4D State Timeline - Device History */}
      {deviceHistory.length > 1 && (
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <GitBranch className="w-4 h-4 text-cyan-400" />
            <h4 className="text-sm font-semibold">4D State Timeline</h4>
            <span className="text-xs text-muted-foreground">({deviceHistory.length} states)</span>
          </div>
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-3 top-3 bottom-3 w-0.5 bg-gradient-to-b from-cyan-500/50 via-cyan-500/30 to-cyan-500/10" />
            
            <div className="space-y-3">
              {deviceHistory.map((device, index) => {
                const rack = sceneConfig.racks.find((r) => r.id === device.rackId)
                const isCurrentSelection = device.id === selectedDeviceId
                const color = status4DColors[device.status4D]
                
                return (
                  <div
                    key={device.id}
                    className={`relative pl-8 py-2 rounded transition-all ${
                      isCurrentSelection 
                        ? 'bg-blue-950/30 border border-blue-500/30' 
                        : 'hover:bg-muted/20'
                    }`}
                  >
                    {/* Timeline dot */}
                    <div
                      className={`absolute left-1.5 top-4 w-3 h-3 rounded-full border-2 ${
                        isCurrentSelection ? 'border-blue-400' : 'border-background'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                    
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className="px-1.5 py-0.5 rounded text-[10px] font-medium text-white"
                            style={{ backgroundColor: color }}
                          >
                            {status4DLabels[device.status4D]}
                          </span>
                          {isCurrentSelection && (
                            <span className="text-[10px] text-blue-400 font-medium">← Selected</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          <MapPin className="w-3 h-3" />
                          <span>{rack?.name || 'Unknown'}</span>
                          <span>•</span>
                          <span>U{device.uStart}-{device.uStart + device.uHeight - 1}</span>
                        </div>
                        {device.rackId !== selectedDevice.rackId && (
                          <div className="text-[10px] text-yellow-500/80 mt-0.5">
                            Different location from selected
                          </div>
                        )}
                      </div>
                      <div className="text-right text-xs">
                        <div className="text-muted-foreground">{device.powerKw}kW</div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
          
          {/* Summary */}
          <div className="mt-3 pt-3 border-t border-border/30 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <span>Equipment ID:</span>
              <code className="px-1 py-0.5 bg-muted/30 rounded text-[10px]">
                {selectedDevice.logicalEquipmentId}
              </code>
            </div>
          </div>
        </Card>
      )}

      {/* Move Controls */}
      <Card className="p-4 space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Move className="w-4 h-4" />
          <span>Move Equipment</span>
        </div>

        <div className="space-y-3">
          <div>
            <Label className="text-sm">Target Rack</Label>
            <Select value={targetRackId} onValueChange={handleRackChange}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select target rack" />
              </SelectTrigger>
              <SelectContent>
                {sceneConfig.racks.map((rack) => (
                  <SelectItem key={rack.id} value={rack.id}>
                    {rack.name} ({rack.uHeight}U, {rack.currentPowerKw.toFixed(1)}/{rack.powerKwLimit.toFixed(1)}kW)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {targetRackId && (
            <div>
              <Label className="text-sm">Target U Position</Label>
              <Select value={targetUPosition} onValueChange={handleUPositionChange}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select U position" />
                </SelectTrigger>
                <SelectContent>
                  {availableUPositions.length === 0 ? (
                    <SelectItem value="none" disabled>
                      No available positions in this rack
                    </SelectItem>
                  ) : (
                    availableUPositions.map((u) => (
                      <SelectItem key={u} value={u.toString()}>
                        U{u} - U{u + selectedDevice.uHeight - 1}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {availableUPositions.length > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  {availableUPositions.length} available position{availableUPositions.length !== 1 ? "s" : ""}
                </p>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-sm">Target Phase</Label>
              <Select value={targetPhase} onValueChange={(value) => setTargetPhase(value as Phase)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AS_IS">As-Is (Current)</SelectItem>
                  <SelectItem value="TO_BE">To-Be (Target)</SelectItem>
                  <SelectItem value="FUTURE">Future (Long-term)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm">Scheduled Date</Label>
              <Input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <Label className="text-sm">Notes (Optional)</Label>
            <Textarea
              placeholder="Add notes about this modification..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1"
              rows={2}
            />
          </div>
        </div>

        {/* Validation Result */}
        {validationResult && (
          <div
            className={`flex items-start gap-2 p-3 rounded text-sm ${
              validationResult.valid
                ? "bg-green-950/20 border border-green-800 text-green-400"
                : "bg-red-950/20 border border-red-800 text-red-400"
            }`}
          >
            {validationResult.valid ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            )}
            <div className="flex-1 space-y-1">
              {validationResult.valid && <div>Position is available</div>}
              {validationResult.errors.map((err, i) => (
                <div key={i}>{err}</div>
              ))}
              {validationResult.warnings.map((warn, i) => (
                <div key={i} className="text-yellow-400">
                  {warn}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Move Preview */}
        {targetRackId && targetUPosition && validationResult?.valid && (
          <div className="flex items-center gap-2 p-3 bg-blue-950/20 border border-blue-800 rounded text-sm">
            <div className="flex-1 flex items-center gap-2">
              <span>
                {fromRack?.name} U{selectedDevice.uStart}
              </span>
              <ArrowRight className="w-4 h-4" />
              <span>
                {targetRack?.name} U{targetUPosition}
              </span>
            </div>
          </div>
        )}

        <Button className="w-full" disabled={!validationResult?.valid} onClick={handleMove}>
          {targetPhase === currentPhase ? 'Apply Move Now' : `Schedule for ${targetPhase} Phase`}
        </Button>
      </Card>

      {/* Modification History */}
      {modifications.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <History className="w-4 h-4" />
            <h4 className="text-sm font-semibold">Modification History</h4>
          </div>
          <div className="space-y-2">
            {modifications
              .slice(-5)
              .reverse()
              .map((mod) => (
                <div key={mod.id} className="text-xs p-2 bg-muted/20 rounded">
                  <div className="font-medium">{mod.type.toUpperCase()}</div>
                  <div className="text-muted-foreground">
                    {mod.from && mod.to && (
                      <>
                        {sceneConfig.racks.find((r) => r.id === mod.from?.rackId)?.name} U{mod.from?.uPosition}
                        {" → "}
                        {sceneConfig.racks.find((r) => r.id === mod.to?.rackId)?.name} U{mod.to?.uPosition}
                      </>
                    )}
                  </div>
                  <div className="text-muted-foreground">{new Date(mod.timestamp).toLocaleString()}</div>
                  {mod.notes && <div className="text-muted-foreground mt-1">{mod.notes}</div>}
                </div>
              ))}
          </div>
        </Card>
      )}

      {/* Move Device Dialog */}
      {showMoveDialog && selectedDevice && (
        <MoveDeviceDialog
          device={{
            id: selectedDevice.id,
            name: selectedDevice.name,
            status4D: selectedDevice.status4D,
            uHeight: selectedDevice.uHeight,
            currentRackId: selectedDevice.rackId,
            currentUPosition: selectedDevice.uStart,
          }}
          open={showMoveDialog}
          onOpenChange={setShowMoveDialog}
          onSuccess={() => {
            setShowMoveDialog(false)
            // Refresh or handle success
            window.location.reload()
          }}
        />
      )}

      {/* Delete Device Dialog */}
      {showDeleteDialog && selectedDevice && (
        <DeleteDeviceDialog
          device={{
            id: selectedDevice.id,
            name: selectedDevice.name,
            status4D: selectedDevice.status4D,
          }}
          open={showDeleteDialog}
          onOpenChange={setShowDeleteDialog}
          onSuccess={() => {
            setShowDeleteDialog(false)
            // Refresh or handle success
            window.location.reload()
          }}
        />
      )}
    </div>
  )
}
