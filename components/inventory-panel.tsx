"use client"

import { useEffect, useMemo, useState } from "react"
import type { SceneConfig } from "@/lib/types"
import { status4DColors, status4DLabels } from "@/lib/types"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, X } from "lucide-react"

interface InventoryPanelProps {
  sceneConfig: SceneConfig
  selectedDeviceId: string | null
  onDeviceSelect: (deviceId: string | null) => void
  onClose: () => void
}

const ROWS_PER_PAGE = 5

export function InventoryPanel({ sceneConfig, selectedDeviceId, onDeviceSelect, onClose }: InventoryPanelProps) {
  const [currentPage, setCurrentPage] = useState(0)

  // Build lookup maps
  const rackMap = useMemo(() => {
    return new Map(sceneConfig.racks.map((r) => [r.id, r]))
  }, [sceneConfig.racks])

  const roomMap = useMemo(() => {
    return new Map(sceneConfig.rooms.map((r) => [r.id, r]))
  }, [sceneConfig.rooms])

  // Prepare table data
  const tableData = useMemo(() => {
    return sceneConfig.devices.map((device) => {
      const rack = rackMap.get(device.rackId)
      const room = rack ? roomMap.get(rack.roomId) : null

      return {
        device,
        rackName: rack?.name || "Unknown",
        roomName: room?.name || "Unknown",
      }
    })
  }, [sceneConfig.devices, rackMap, roomMap])

  const totalPages = Math.ceil(tableData.length / ROWS_PER_PAGE)
  const paginatedData = tableData.slice(currentPage * ROWS_PER_PAGE, (currentPage + 1) * ROWS_PER_PAGE)

  const handlePrevPage = () => {
    setCurrentPage((prev) => Math.max(0, prev - 1))
  }

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(totalPages - 1, prev + 1))
  }

  const handleRowClick = (deviceId: string) => {
    onDeviceSelect(deviceId === selectedDeviceId ? null : deviceId)
  }

  // Auto-scroll to selected device
  useEffect(() => {
    if (!selectedDeviceId) return

    const index = tableData.findIndex((row) => row.device.id === selectedDeviceId)
    if (index === -1) return

    const page = Math.floor(index / ROWS_PER_PAGE)
    setCurrentPage(page)
  }, [selectedDeviceId, tableData])

  return (
    <Card className="w-full h-full flex flex-col border-border/50">
      <CardHeader className="flex flex-row items-center justify-between py-3 px-4 shrink-0">
        <CardTitle className="text-base md:text-lg">Device Inventory</CardTitle>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
          <X className="w-4 h-4" />
        </Button>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 flex flex-col p-3 md:p-4">
        <div className="flex-1 min-h-0 overflow-auto border border-border/50 rounded-lg">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="text-xs md:text-sm">Device</TableHead>
                <TableHead className="text-xs md:text-sm hidden sm:table-cell">Rack</TableHead>
                <TableHead className="text-xs md:text-sm hidden md:table-cell">Room</TableHead>
                <TableHead className="text-xs md:text-sm">Status</TableHead>
                <TableHead className="text-right text-xs md:text-sm hidden lg:table-cell">Power (kW)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.map(({ device, rackName, roomName }) => {
                const isSelected = device.id === selectedDeviceId
                const statusColor = status4DColors[device.status4D]

                return (
                  <TableRow
                    key={device.id}
                    className={`cursor-pointer transition-colors ${isSelected ? "bg-accent" : "hover:bg-muted/50"}`}
                    onClick={() => handleRowClick(device.id)}
                  >
                    <TableCell className="font-medium text-xs md:text-sm">{device.name}</TableCell>
                    <TableCell className="text-xs md:text-sm hidden sm:table-cell">{rackName}</TableCell>
                    <TableCell className="text-xs md:text-sm hidden md:table-cell">{roomName}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2 h-2 md:w-3 md:h-3 rounded-full shrink-0"
                          style={{ backgroundColor: statusColor }}
                        />
                        <span className="text-xs md:text-sm truncate">{status4DLabels[device.status4D]}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-xs md:text-sm hidden lg:table-cell">
                      {device.powerKw.toFixed(1)}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 mt-3 shrink-0">
          <div className="text-xs md:text-sm text-muted-foreground">
            {currentPage * ROWS_PER_PAGE + 1}-{Math.min((currentPage + 1) * ROWS_PER_PAGE, tableData.length)} of{" "}
            {tableData.length}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrevPage}
              disabled={currentPage === 0}
              className="h-8 bg-transparent"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="text-xs md:text-sm">
              {currentPage + 1}/{totalPages}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNextPage}
              disabled={currentPage >= totalPages - 1}
              className="h-8"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
