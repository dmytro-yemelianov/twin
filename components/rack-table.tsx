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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Server,
  Zap,
  Thermometer,
  Activity,
  MapPin,
  Hash,
  ArrowUpDown,
  Search,
  Download,
  Eye,
  TrendingUp,
  AlertTriangle,
  CheckCircle
} from "lucide-react"
import type { Rack, SceneConfig, Room } from "@/lib/types"

interface RackTableProps {
  sceneConfig: SceneConfig
  onRackSelect?: (rackId: string) => void
  selectedRackId?: string | null
}

type SortField = 'name' | 'room' | 'capacity' | 'power' | 'utilization'
type SortOrder = 'asc' | 'desc'

export function RackTable({
  sceneConfig,
  onRackSelect,
  selectedRackId
}: RackTableProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [sortField, setSortField] = useState<SortField>('name')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')
  const [showDetails, setShowDetails] = useState(false)
  const [selectedRack, setSelectedRack] = useState<Rack | null>(null)

  // Create room lookup map
  const roomMap = useMemo(() => {
    const map = new Map<string, Room>()
    sceneConfig.rooms.forEach(room => {
      map.set(room.id, room)
    })
    return map
  }, [sceneConfig.rooms])

  // Calculate rack statistics
  const enrichedRacks = useMemo(() => {
    return sceneConfig.racks.map(rack => {
      const room = roomMap.get(rack.roomId)
      const devicesInRack = sceneConfig.devices.filter(d => d.rackId === rack.id)
      
      // Calculate U space utilization
      const usedUs = new Set<number>()
      devicesInRack.forEach(device => {
        for (let u = device.uStart; u < device.uStart + device.uHeight; u++) {
          usedUs.add(u)
        }
      })
      
      const uUtilization = (usedUs.size / rack.uHeight) * 100
      const powerUtilization = (rack.currentPowerKw / rack.powerKwLimit) * 100
      const deviceCount = devicesInRack.length
      
      // Calculate available contiguous U spaces
      const availableSpaces: { start: number; size: number }[] = []
      let currentStart = -1
      let currentSize = 0
      
      for (let u = 1; u <= rack.uHeight; u++) {
        if (!usedUs.has(u)) {
          if (currentStart === -1) {
            currentStart = u
            currentSize = 1
          } else {
            currentSize++
          }
        } else if (currentStart !== -1) {
          availableSpaces.push({ start: currentStart, size: currentSize })
          currentStart = -1
          currentSize = 0
        }
      }
      if (currentStart !== -1) {
        availableSpaces.push({ start: currentStart, size: currentSize })
      }
      
      const largestSpace = Math.max(...availableSpaces.map(s => s.size), 0)
      
      return {
        ...rack,
        room,
        deviceCount,
        uUtilization,
        powerUtilization,
        availableUs: rack.uHeight - usedUs.size,
        largestSpace,
        thermalLoadBtu: rack.currentPowerKw * 3412,
        status: powerUtilization > 80 ? 'critical' : powerUtilization > 60 ? 'warning' : 'normal'
      }
    })
  }, [sceneConfig.racks, sceneConfig.devices, roomMap])

  // Filter racks
  const filteredRacks = useMemo(() => {
    return enrichedRacks.filter(rack => {
      if (searchTerm) {
        const search = searchTerm.toLowerCase()
        return (
          rack.name.toLowerCase().includes(search) ||
          rack.room?.name.toLowerCase().includes(search)
        )
      }
      return true
    })
  }, [enrichedRacks, searchTerm])

  // Sort racks
  const sortedRacks = useMemo(() => {
    const sorted = [...filteredRacks].sort((a, b) => {
      let comparison = 0
      switch (sortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name)
          break
        case 'room':
          comparison = (a.room?.name || '').localeCompare(b.room?.name || '')
          break
        case 'capacity':
          comparison = a.uHeight - b.uHeight
          break
        case 'power':
          comparison = a.currentPowerKw - b.currentPowerKw
          break
        case 'utilization':
          comparison = a.powerUtilization - b.powerUtilization
          break
      }
      return sortOrder === 'asc' ? comparison : -comparison
    })
    return sorted
  }, [filteredRacks, sortField, sortOrder])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
  }

  const handleViewDetails = (rack: typeof enrichedRacks[0]) => {
    setSelectedRack(rack)
    setShowDetails(true)
  }

  const exportToCSV = () => {
    const headers = ['Rack Name', 'Room', 'Capacity (U)', 'Used Us', 'Power (kW)', 'Power Limit (kW)', 'Utilization (%)', 'Devices']
    const rows = sortedRacks.map(r => [
      r.name,
      r.room?.name || '',
      r.uHeight.toString(),
      (r.uHeight - r.availableUs).toString(),
      r.currentPowerKw.toFixed(2),
      r.powerKwLimit.toFixed(2),
      r.powerUtilization.toFixed(1),
      r.deviceCount.toString()
    ])
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `racks-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  // Calculate totals
  const totals = useMemo(() => {
    const totalUs = sortedRacks.reduce((sum, r) => sum + r.uHeight, 0)
    const usedUs = sortedRacks.reduce((sum, r) => sum + (r.uHeight - r.availableUs), 0)
    const totalPower = sortedRacks.reduce((sum, r) => sum + r.currentPowerKw, 0)
    const totalCapacity = sortedRacks.reduce((sum, r) => sum + r.powerKwLimit, 0)
    const totalDevices = sortedRacks.reduce((sum, r) => sum + r.deviceCount, 0)
    
    return {
      racks: sortedRacks.length,
      totalUs,
      usedUs,
      uUtilization: totalUs > 0 ? (usedUs / totalUs) * 100 : 0,
      totalPower,
      totalCapacity,
      powerUtilization: totalCapacity > 0 ? (totalPower / totalCapacity) * 100 : 0,
      totalDevices
    }
  }, [sortedRacks])

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Rack Infrastructure</h3>
          <p className="text-sm text-muted-foreground">
            {totals.racks} racks • {totals.usedUs}/{totals.totalUs} Us used ({totals.uUtilization.toFixed(1)}%) • 
            {totals.totalPower.toFixed(1)}/{totals.totalCapacity.toFixed(1)} kW ({totals.powerUtilization.toFixed(1)}%)
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={exportToCSV}>
          <Download className="h-4 w-4 mr-1" />
          Export CSV
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Racks</p>
                <p className="text-2xl font-bold">{totals.racks}</p>
              </div>
              <Server className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Space Utilization</p>
                <p className="text-2xl font-bold">{totals.uUtilization.toFixed(1)}%</p>
                <Progress value={totals.uUtilization} className="mt-2" />
              </div>
              <Activity className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Power Usage</p>
                <p className="text-2xl font-bold">{totals.totalPower.toFixed(1)} kW</p>
                <Progress value={totals.powerUtilization} className="mt-2" />
              </div>
              <Zap className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Devices</p>
                <p className="text-2xl font-bold">{totals.totalDevices}</p>
              </div>
              <Hash className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search racks by name or room..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Data Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center gap-1">
                      Rack Name
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('room')}
                  >
                    <div className="flex items-center gap-1">
                      Location
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('capacity')}
                  >
                    <div className="flex items-center gap-1">
                      Capacity
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </TableHead>
                  <TableHead>Space Usage</TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('power')}
                  >
                    <div className="flex items-center gap-1">
                      Power
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </TableHead>
                  <TableHead>Thermal</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[70px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedRacks.map((rack) => {
                  const isSelected = rack.id === selectedRackId
                  
                  return (
                    <TableRow
                      key={rack.id}
                      className={`transition-colors ${
                        isSelected ? 'bg-accent' : 'hover:bg-muted/50'
                      }`}
                    >
                      <TableCell 
                        className="font-medium cursor-pointer"
                        onClick={() => onRackSelect?.(rack.id)}
                      >
                        <div className="flex items-center gap-2">
                          <Server className="h-4 w-4" />
                          {rack.name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm">{rack.room?.name || '-'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{rack.uHeight}U</div>
                          <div className="text-xs text-muted-foreground">
                            {rack.availableUs}U free
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span>{rack.uHeight - rack.availableUs}/{rack.uHeight}U</span>
                            <span className="text-muted-foreground">{rack.uUtilization.toFixed(0)}%</span>
                          </div>
                          <Progress value={rack.uUtilization} className="h-2" />
                          <div className="text-xs text-muted-foreground">
                            Max: {rack.largestSpace}U block
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-1">
                            <Zap className="h-3 w-3" />
                            <span className="text-sm">{rack.currentPowerKw.toFixed(1)}/{rack.powerKwLimit.toFixed(1)} kW</span>
                          </div>
                          <Progress 
                            value={rack.powerUtilization} 
                            className={`h-2 ${
                              rack.status === 'critical' ? '[&>div]:bg-red-500' :
                              rack.status === 'warning' ? '[&>div]:bg-yellow-500' :
                              ''
                            }`}
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Thermometer className="h-3 w-3" />
                          {(rack.thermalLoadBtu / 1000).toFixed(1)}k BTU/h
                        </div>
                      </TableCell>
                      <TableCell>
                        {rack.status === 'critical' && (
                          <Badge variant="destructive">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Critical
                          </Badge>
                        )}
                        {rack.status === 'warning' && (
                          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                            <TrendingUp className="h-3 w-3 mr-1" />
                            High Usage
                          </Badge>
                        )}
                        {rack.status === 'normal' && (
                          <Badge variant="outline" className="text-green-600 border-green-600">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Normal
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleViewDetails(rack)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Rack Details Dialog */}
      {showDetails && selectedRack && (
        <RackDetailsDialog
          rack={selectedRack}
          devices={sceneConfig.devices.filter(d => d.rackId === selectedRack.id)}
          open={showDetails}
          onOpenChange={setShowDetails}
        />
      )}
    </div>
  )
}

// Rack Details Dialog
interface RackDetailsDialogProps {
  rack: any
  devices: any[]
  open: boolean
  onOpenChange: (open: boolean) => void
}

function RackDetailsDialog({
  rack,
  devices,
  open,
  onOpenChange
}: RackDetailsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Rack Details: {rack.name}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Specifications */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Specifications</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground">Location</div>
                <div>{rack.room?.name || '-'}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Capacity</div>
                <div>{rack.uHeight}U ({rack.availableUs}U available)</div>
              </div>
              <div>
                <div className="text-muted-foreground">Power Capacity</div>
                <div>{rack.powerKwLimit.toFixed(1)} kW</div>
              </div>
              <div>
                <div className="text-muted-foreground">Current Load</div>
                <div>{rack.currentPowerKw.toFixed(1)} kW ({rack.powerUtilization.toFixed(1)}%)</div>
              </div>
              <div>
                <div className="text-muted-foreground">Thermal Output</div>
                <div>{rack.thermalLoadBtu.toFixed(0)} BTU/h</div>
              </div>
              <div>
                <div className="text-muted-foreground">Device Count</div>
                <div>{rack.deviceCount} devices</div>
              </div>
            </CardContent>
          </Card>

          {/* Usage Visualization */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Usage Analysis</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Space Utilization</span>
                  <span>{rack.uUtilization.toFixed(1)}%</span>
                </div>
                <Progress value={rack.uUtilization} />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Power Utilization</span>
                  <span>{rack.powerUtilization.toFixed(1)}%</span>
                </div>
                <Progress 
                  value={rack.powerUtilization}
                  className={
                    rack.powerUtilization > 80 ? '[&>div]:bg-red-500' :
                    rack.powerUtilization > 60 ? '[&>div]:bg-yellow-500' :
                    ''
                  }
                />
              </div>
              <div className="text-sm text-muted-foreground">
                Largest contiguous space: {rack.largestSpace}U
              </div>
            </CardContent>
          </Card>

          {/* Installed Devices */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Installed Devices ({devices.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-60 overflow-auto">
                {devices
                  .sort((a, b) => b.uStart - a.uStart)
                  .map(device => (
                    <div key={device.id} className="flex items-center justify-between text-sm p-2 hover:bg-muted/50 rounded">
                      <div>
                        <div className="font-medium">{device.name}</div>
                        <div className="text-xs text-muted-foreground">
                          U{device.uStart}-{device.uStart + device.uHeight - 1} ({device.uHeight}U)
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1">
                          <Zap className="h-3 w-3" />
                          {device.powerKw.toFixed(1)} kW
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  )
}