"use client"

import { useState, useMemo } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { 
  MoreHorizontal, 
  Search, 
  Filter, 
  Download,
  Eye,
  Edit,
  Trash2,
  Move,
  GitBranch,
  Server,
  HardDrive,
  Cpu,
  Zap,
  Thermometer,
  Calendar,
  MapPin,
  Hash,
  ArrowUpDown,
  ChevronDown,
  ChevronRight
} from "lucide-react"
import type { SceneConfig, DeviceType, Status4D, Rack } from "@/lib/types"
import type { Device } from "@/lib/db/schema/devices"
import { status4DColors, status4DLabels } from "@/lib/types"
import { DeviceStateMachine } from "@/components/devices/device-state-machine"
import { MoveDeviceDialog } from "@/components/devices/move-device-dialog"
import { DeleteDeviceDialog } from "@/components/devices/delete-device-dialog"
import { StatusBadge } from "@/components/ui/status-badge"

interface EquipmentTableProps {
  sceneConfig: SceneConfig
  deviceTypes: DeviceType[]
  onDeviceSelect?: (deviceId: string) => void
  selectedDeviceId?: string | null
  visibleStatuses?: Set<Status4D>
}

type SortField = 'name' | 'rack' | 'uPosition' | 'power' | 'status' | 'type'
type SortOrder = 'asc' | 'desc'

export function EquipmentTable({
  sceneConfig,
  deviceTypes,
  onDeviceSelect,
  selectedDeviceId,
  visibleStatuses
}: EquipmentTableProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [sortField, setSortField] = useState<SortField>('name')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null)
  const [showDetails, setShowDetails] = useState(false)
  const [showMoveDialog, setShowMoveDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())

  // Create rack lookup map
  const rackMap = useMemo(() => {
    const map = new Map<string, Rack>()
    sceneConfig.racks.forEach(rack => {
      map.set(rack.id, rack)
    })
    return map
  }, [sceneConfig.racks])

  // Create device type lookup map
  const deviceTypeMap = useMemo(() => {
    const map = new Map<string, DeviceType>()
    deviceTypes.forEach(type => {
      map.set(type.id, type)
    })
    return map
  }, [deviceTypes])

  // Filter and enrich devices
  const enrichedDevices = useMemo(() => {
    return sceneConfig.devices
      .filter(device => {
        // Apply visibility filter
        if (visibleStatuses && !visibleStatuses.has(device.status4D)) {
          return false
        }
        // Apply search filter
        if (searchTerm) {
          const search = searchTerm.toLowerCase()
          const rack = rackMap.get(device.rackId)
          const deviceType = deviceTypeMap.get(device.deviceTypeId)
          return (
            device.name.toLowerCase().includes(search) ||
            rack?.name.toLowerCase().includes(search) ||
            deviceType?.name?.toLowerCase().includes(search) ||
            device.status4D.toLowerCase().includes(search)
          )
        }
        return true
      })
      .map(device => {
        const rack = rackMap.get(device.rackId)
        return {
          ...device,
          rack,
          deviceType: deviceTypeMap.get(device.deviceTypeId),
          room: sceneConfig.rooms.find(r => r.id === rack?.roomId)
        }
      })
  }, [sceneConfig.devices, sceneConfig.rooms, rackMap, deviceTypeMap, visibleStatuses, searchTerm])

  // Group devices by logical equipment ID
  const deviceGroups = useMemo(() => {
    const groups = new Map<string, typeof enrichedDevices>()
    enrichedDevices.forEach(device => {
      const key = device.logicalEquipmentId
      if (!groups.has(key)) {
        groups.set(key, [])
      }
      groups.get(key)!.push(device)
    })
    return groups
  }, [enrichedDevices])

  // Sort devices
  const sortedDevices = useMemo(() => {
    const sorted = [...enrichedDevices].sort((a, b) => {
      let comparison = 0
      switch (sortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name)
          break
        case 'rack':
          comparison = (a.rack?.name || '').localeCompare(b.rack?.name || '')
          break
        case 'uPosition':
          comparison = a.uStart - b.uStart
          break
        case 'power':
          comparison = a.powerKw - b.powerKw
          break
        case 'status':
          comparison = a.status4D.localeCompare(b.status4D)
          break
        case 'type':
          comparison = (a.deviceType?.name || '').localeCompare(b.deviceType?.name || '')
          break
      }
      return sortOrder === 'asc' ? comparison : -comparison
    })
    return sorted
  }, [enrichedDevices, sortField, sortOrder])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
  }

  const handleViewDetails = (device: Device) => {
    setSelectedDevice(device)
    setShowDetails(true)
  }

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(groupId)) {
        next.delete(groupId)
      } else {
        next.add(groupId)
      }
      return next
    })
  }

  const exportToCSV = () => {
    const headers = ['Name', 'Type', 'Rack', 'U Position', 'Power (kW)', 'Status', 'Serial', 'Room']
    const rows = sortedDevices.map(d => [
      d.name,
      d.deviceType?.name || '',
      d.rack?.name || '',
      `U${d.uStart}`,
      d.powerKw.toString(),
      d.status4D,
      (d as any).serialNumber || '',
      d.room?.name || ''
    ])
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `equipment-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Equipment Inventory</h3>
          <p className="text-sm text-muted-foreground">
            {sortedDevices.length} devices • {deviceGroups.size} logical equipment groups
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={exportToCSV}>
          <Download className="h-4 w-4 mr-1" />
          Export CSV
        </Button>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, rack, type, or status..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="outline" size="icon">
          <Filter className="h-4 w-4" />
        </Button>
      </div>

      {/* Data Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[30px]"></TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center gap-1">
                      Device Name
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('type')}
                  >
                    <div className="flex items-center gap-1">
                      Type
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('rack')}
                  >
                    <div className="flex items-center gap-1">
                      Location
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('uPosition')}
                  >
                    <div className="flex items-center gap-1">
                      Position
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('power')}
                  >
                    <div className="flex items-center gap-1">
                      Power
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('status')}
                  >
                    <div className="flex items-center gap-1">
                      Status
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </TableHead>
                  <TableHead>4D States</TableHead>
                  <TableHead className="w-[70px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedDevices.map((device) => {
                  const isSelected = device.id === selectedDeviceId
                  const relatedDevices = deviceGroups.get(device.logicalEquipmentId) || []
                  const hasMultipleStates = relatedDevices.length > 1
                  const isExpanded = expandedGroups.has(device.logicalEquipmentId)
                  
                  return (
                    <TableRow
                      key={device.id}
                      className={`transition-colors ${
                        isSelected ? 'bg-accent' : 'hover:bg-muted/50'
                      }`}
                    >
                      <TableCell>
                        {hasMultipleStates && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => toggleGroup(device.logicalEquipmentId)}
                          >
                            {isExpanded ? (
                              <ChevronDown className="h-3 w-3" />
                            ) : (
                              <ChevronRight className="h-3 w-3" />
                            )}
                          </Button>
                        )}
                      </TableCell>
                      <TableCell 
                        className="font-medium cursor-pointer"
                        onClick={() => onDeviceSelect?.(device.id)}
                      >
                        <div className="flex items-center gap-2">
                          {(device.deviceType as any)?.icon === 'server' && <Server className="h-4 w-4" />}
                          {(device.deviceType as any)?.icon === 'storage' && <HardDrive className="h-4 w-4" />}
                          {(device.deviceType as any)?.icon === 'network' && <Cpu className="h-4 w-4" />}
                          {device.name}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {device.deviceType?.name || '-'}
                      </TableCell>
                      <TableCell className="text-sm">
                        <div>
                          <div>{device.rack?.name || '-'}</div>
                          <div className="text-xs text-muted-foreground">{device.room?.name || '-'}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        U{device.uStart}-{device.uStart + device.uHeight - 1}
                        <span className="text-xs text-muted-foreground ml-1">({device.uHeight}U)</span>
                      </TableCell>
                      <TableCell className="text-sm">
                        <div className="flex items-center gap-1">
                          <Zap className="h-3 w-3" />
                          {device.powerKw.toFixed(1)} kW
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={device.status4D} size="sm" />
                      </TableCell>
                      <TableCell>
                        {hasMultipleStates && (
                          <div className="flex items-center gap-1">
                            <GitBranch className="h-3 w-3 text-cyan-500" />
                            <span className="text-xs">{relatedDevices.length} states</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewDetails(device as unknown as Device)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {
                              setSelectedDevice(device as unknown as Device)
                              setShowMoveDialog(true)
                            }}>
                              <Move className="mr-2 h-4 w-4" />
                              Move
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-destructive"
                              onClick={() => {
                                setSelectedDevice(device as unknown as Device)
                                setShowDeleteDialog(true)
                              }}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Device Details Dialog */}
      {showDetails && selectedDevice && (
        <EquipmentDetailsDialog
          device={selectedDevice}
          deviceType={deviceTypeMap.get(selectedDevice.deviceTypeId)}
          rack={rackMap.get(selectedDevice.rackId)}
          relatedDevices={deviceGroups.get(selectedDevice.logicalEquipmentId || '') || []}
          open={showDetails}
          onOpenChange={setShowDetails}
        />
      )}

      {/* Move Dialog */}
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
            window.location.reload()
          }}
        />
      )}

      {/* Delete Dialog */}
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
            window.location.reload()
          }}
        />
      )}
    </div>
  )
}

// Equipment Details Dialog Component
interface EquipmentDetailsDialogProps {
  device: Device & { rack?: Rack; room?: any }
  deviceType?: DeviceType
  rack?: Rack
  relatedDevices: any[]
  open: boolean
  onOpenChange: (open: boolean) => void
}

function EquipmentDetailsDialog({
  device,
  deviceType,
  rack,
  relatedDevices,
  open,
  onOpenChange
}: EquipmentDetailsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Equipment Details: {device.name}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground">Equipment ID</div>
                <div className="font-mono">{device.id}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Logical Equipment ID</div>
                <div className="font-mono">{device.logicalEquipmentId}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Type</div>
                <div>{deviceType?.name || '-'}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Manufacturer</div>
                <div>{(deviceType as any)?.manufacturer || '-'}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Model</div>
                <div>{(deviceType as any)?.model || '-'}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Serial Number</div>
                <div className="font-mono">{device.serialNumber || '-'}</div>
              </div>
            </CardContent>
          </Card>

          {/* Location Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Location</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground">Rack</div>
                <div>{rack?.name || '-'}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Room</div>
                <div>{device.room?.name || '-'}</div>
              </div>
              <div>
                <div className="text-muted-foreground">U Position</div>
                <div>U{device.uStart} - U{device.uStart + device.uHeight - 1}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Height</div>
                <div>{device.uHeight}U</div>
              </div>
            </CardContent>
          </Card>

          {/* Physical Specifications */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Physical Specifications</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground">Width</div>
                <div>{device.widthMm || (deviceType as any)?.widthMm || '-'} mm</div>
              </div>
              <div>
                <div className="text-muted-foreground">Depth</div>
                <div>{device.depthMm || (deviceType as any)?.depthMm || '-'} mm</div>
              </div>
              <div>
                <div className="text-muted-foreground">Weight</div>
                <div>{(deviceType as any)?.weightKg || '-'} kg</div>
              </div>
            </CardContent>
          </Card>

          {/* Power & Thermal */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Power & Thermal</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground flex items-center gap-1">
                  <Zap className="h-3 w-3" />
                  Power Consumption
                </div>
                <div className="font-medium">{device.powerKw.toFixed(2)} kW</div>
              </div>
              <div>
                <div className="text-muted-foreground flex items-center gap-1">
                  <Thermometer className="h-3 w-3" />
                  Thermal Output
                </div>
                <div className="font-medium">{(device.powerKw * 3412).toFixed(0)} BTU/h</div>
              </div>
              <div>
                <div className="text-muted-foreground">Power Redundancy</div>
                <div>{(deviceType as any)?.powerRedundancy || 'N+1'}</div>
              </div>
            </CardContent>
          </Card>

          {/* 4D State Management */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">4D Lifecycle State</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <DeviceStateMachine 
                currentState={device.status4D} 
                targetState={device.status4D}
              />
              
              {relatedDevices.length > 1 && (
                <div className="pt-4 border-t">
                  <div className="text-sm font-medium mb-2">Related States ({relatedDevices.length})</div>
                  <div className="space-y-2">
                    {relatedDevices.map((related) => (
                      <div key={related.id} className="flex items-center justify-between text-sm">
                        <StatusBadge status={related.status4D} size="xs" />
                        <span className="text-muted-foreground">
                          {related.rack?.name} U{related.uStart}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Metadata */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Metadata</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground">Installation Date</div>
                <div>{(device as any).installDate || '-'}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Last Maintenance</div>
                <div>{(device as any).lastMaintenance || '-'}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Asset Tag</div>
                <div>{device.assetTag || '-'}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Cost Center</div>
                <div>{(device as any).costCenter || '-'}</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  )
}