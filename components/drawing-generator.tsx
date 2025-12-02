"use client"

import { useState, useRef, useMemo, useCallback } from "react"
import { useTheme } from "next-themes"
import type { SceneConfig, Room, Rack, Device } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card } from "@/components/ui/card"
import { Download, ZoomIn, ZoomOut, Maximize2, Printer, Layers, Grid3X3, Server, FileText } from "lucide-react"

interface DrawingGeneratorProps {
  sceneConfig: SceneConfig
  siteName?: string
  onClose?: () => void
}

type DrawingType = 'floor-plan' | 'rack-elevation' | 'room-layout' | 'single-line'

interface DrawingColors {
  background: string
  grid: string
  wall: string
  rack: string
  rackFill: string
  equipment: string
  text: string
  dimension: string
  annotation: string
  highlight: string
}

const lightColors: DrawingColors = {
  background: '#ffffff',
  grid: '#e5e7eb',
  wall: '#374151',
  rack: '#1f2937',
  rackFill: '#f3f4f6',
  equipment: '#3b82f6',
  text: '#111827',
  dimension: '#6b7280',
  annotation: '#059669',
  highlight: '#ef4444',
}

const darkColors: DrawingColors = {
  background: '#09090b',
  grid: '#27272a',
  wall: '#a1a1aa',
  rack: '#e4e4e7',
  rackFill: '#18181b',
  equipment: '#60a5fa',
  text: '#fafafa',
  dimension: '#a1a1aa',
  annotation: '#34d399',
  highlight: '#f87171',
}

// Equipment colors by category
const equipmentColors: Record<string, string> = {
  server: '#3b82f6',
  storage: '#8b5cf6',
  network: '#22c55e',
  power: '#f59e0b',
  cooling: '#06b6d4',
  security: '#ef4444',
  other: '#6b7280',
}

// Status colors
const statusColors: Record<string, string> = {
  as_is: '#22c55e',
  to_be_added: '#3b82f6',
  to_be_removed: '#ef4444',
  future: '#8b5cf6',
}

export function DrawingGenerator({ sceneConfig, siteName = "Site", onClose }: DrawingGeneratorProps) {
  const { resolvedTheme } = useTheme()
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  
  const [drawingType, setDrawingType] = useState<DrawingType>('floor-plan')
  const [selectedFloorId, setSelectedFloorId] = useState<string | null>(
    sceneConfig.floors?.[0]?.id || null
  )
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null)
  const [selectedRackId, setSelectedRackId] = useState<string | null>(null)
  const [zoom, setZoom] = useState(1)
  const [showGrid, setShowGrid] = useState(true)
  const [showDimensions, setShowDimensions] = useState(true)
  const [showLabels, setShowLabels] = useState(true)

  const colors = resolvedTheme === 'light' ? lightColors : darkColors

  // Get floors
  const floors = useMemo(() => {
    return sceneConfig.floors || [{ id: 'default', name: 'Ground Floor', buildingId: 'default', elevation: 0 }]
  }, [sceneConfig.floors])

  // Get rooms for selected floor
  const roomsInFloor = useMemo(() => {
    if (!selectedFloorId) return sceneConfig.rooms
    return sceneConfig.rooms.filter(r => r.floorId === selectedFloorId)
  }, [sceneConfig.rooms, selectedFloorId])

  // Get racks for selected room
  const racksInRoom = useMemo(() => {
    if (!selectedRoomId) return []
    return sceneConfig.racks.filter(r => r.roomId === selectedRoomId)
  }, [sceneConfig.racks, selectedRoomId])

  // Get devices for selected rack
  const devicesInRack = useMemo(() => {
    if (!selectedRackId) return []
    return sceneConfig.devices.filter(d => d.rackId === selectedRackId)
  }, [sceneConfig.devices, selectedRackId])

  // Drawing dimensions
  const SCALE = 50 // pixels per meter
  const PADDING = 60
  const U_HEIGHT = 8 // pixels per U
  const RACK_WIDTH = 200

  // Floor plan SVG
  const renderFloorPlan = useCallback(() => {
    const rooms = roomsInFloor
    if (rooms.length === 0) return null

    // Calculate bounds
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    rooms.forEach(room => {
      minX = Math.min(minX, room.position.x)
      minY = Math.min(minY, room.position.z)
      maxX = Math.max(maxX, room.position.x + room.dimensions.width)
      maxY = Math.max(maxY, room.position.z + room.dimensions.depth)
    })

    const width = (maxX - minX) * SCALE + PADDING * 2
    const height = (maxY - minY) * SCALE + PADDING * 2

    return (
      <svg
        ref={svgRef}
        width={width * zoom}
        height={height * zoom}
        viewBox={`0 0 ${width} ${height}`}
        className="drawing-svg"
      >
        {/* Background */}
        <rect width={width} height={height} fill={colors.background} />

        {/* Grid */}
        {showGrid && (
          <g className="grid">
            {Array.from({ length: Math.ceil(width / SCALE) + 1 }).map((_, i) => (
              <line
                key={`v${i}`}
                x1={i * SCALE}
                y1={0}
                x2={i * SCALE}
                y2={height}
                stroke={colors.grid}
                strokeWidth="0.5"
              />
            ))}
            {Array.from({ length: Math.ceil(height / SCALE) + 1 }).map((_, i) => (
              <line
                key={`h${i}`}
                x1={0}
                y1={i * SCALE}
                x2={width}
                y2={i * SCALE}
                stroke={colors.grid}
                strokeWidth="0.5"
              />
            ))}
          </g>
        )}

        {/* Rooms */}
        {rooms.map(room => {
          const x = (room.position.x - minX) * SCALE + PADDING
          const y = (room.position.z - minY) * SCALE + PADDING
          const w = room.dimensions.width * SCALE
          const h = room.dimensions.depth * SCALE

          const racksInThisRoom = sceneConfig.racks.filter(r => r.roomId === room.id)

          return (
            <g key={room.id} className="room">
              {/* Room outline */}
              <rect
                x={x}
                y={y}
                width={w}
                height={h}
                fill="none"
                stroke={colors.wall}
                strokeWidth="3"
              />

              {/* Room fill */}
              <rect
                x={x + 1.5}
                y={y + 1.5}
                width={w - 3}
                height={h - 3}
                fill={colors.background}
                opacity="0.5"
              />

              {/* Room label */}
              {showLabels && (
                <text
                  x={x + w / 2}
                  y={y + 20}
                  textAnchor="middle"
                  fill={colors.text}
                  fontSize="14"
                  fontWeight="bold"
                >
                  {room.name}
                </text>
              )}

              {/* Dimensions */}
              {showDimensions && (
                <>
                  {/* Width dimension */}
                  <g className="dimension">
                    <line
                      x1={x}
                      y1={y - 20}
                      x2={x + w}
                      y2={y - 20}
                      stroke={colors.dimension}
                      strokeWidth="1"
                      markerStart="url(#arrowStart)"
                      markerEnd="url(#arrowEnd)"
                    />
                    <text
                      x={x + w / 2}
                      y={y - 25}
                      textAnchor="middle"
                      fill={colors.dimension}
                      fontSize="10"
                    >
                      {room.dimensions.width.toFixed(1)}m
                    </text>
                  </g>
                  {/* Depth dimension */}
                  <g className="dimension">
                    <line
                      x1={x - 20}
                      y1={y}
                      x2={x - 20}
                      y2={y + h}
                      stroke={colors.dimension}
                      strokeWidth="1"
                    />
                    <text
                      x={x - 25}
                      y={y + h / 2}
                      textAnchor="middle"
                      fill={colors.dimension}
                      fontSize="10"
                      transform={`rotate(-90, ${x - 25}, ${y + h / 2})`}
                    >
                      {room.dimensions.depth.toFixed(1)}m
                    </text>
                  </g>
                </>
              )}

              {/* Racks */}
              {racksInThisRoom.map(rack => {
                const rackX = x + (rack.position.x - room.position.x + room.dimensions.width / 2) * SCALE
                const rackY = y + (rack.position.z - room.position.z + room.dimensions.depth / 2) * SCALE
                const rackW = 0.6 * SCALE  // Standard rack width ~0.6m
                const rackD = 1.2 * SCALE  // Standard rack depth ~1.2m

                return (
                  <g key={rack.id} className="rack">
                    <rect
                      x={rackX - rackW / 2}
                      y={rackY - rackD / 2}
                      width={rackW}
                      height={rackD}
                      fill={colors.rackFill}
                      stroke={colors.rack}
                      strokeWidth="2"
                    />
                    {showLabels && (
                      <text
                        x={rackX}
                        y={rackY + 4}
                        textAnchor="middle"
                        fill={colors.text}
                        fontSize="8"
                      >
                        {rack.name}
                      </text>
                    )}
                  </g>
                )
              })}
            </g>
          )
        })}

        {/* Arrow markers for dimensions */}
        <defs>
          <marker
            id="arrowStart"
            markerWidth="6"
            markerHeight="6"
            refX="0"
            refY="3"
            orient="auto"
          >
            <path d="M6,0 L0,3 L6,6" fill="none" stroke={colors.dimension} strokeWidth="1" />
          </marker>
          <marker
            id="arrowEnd"
            markerWidth="6"
            markerHeight="6"
            refX="6"
            refY="3"
            orient="auto"
          >
            <path d="M0,0 L6,3 L0,6" fill="none" stroke={colors.dimension} strokeWidth="1" />
          </marker>
        </defs>

        {/* Title block */}
        <g className="title-block" transform={`translate(${width - 200}, ${height - 60})`}>
          <rect x="0" y="0" width="190" height="50" fill={colors.background} stroke={colors.wall} strokeWidth="1" />
          <line x1="0" y1="25" x2="190" y2="25" stroke={colors.wall} strokeWidth="0.5" />
          <text x="95" y="16" textAnchor="middle" fill={colors.text} fontSize="10" fontWeight="bold">
            {siteName} - Floor Plan
          </text>
          <text x="95" y="40" textAnchor="middle" fill={colors.dimension} fontSize="8">
            {floors.find(f => f.id === selectedFloorId)?.name || 'All Floors'} | Scale 1:{(SCALE / zoom).toFixed(0)}
          </text>
        </g>

        {/* Legend */}
        <g className="legend" transform={`translate(10, ${height - 80})`}>
          <rect x="0" y="0" width="120" height="70" fill={colors.background} stroke={colors.wall} strokeWidth="1" />
          <text x="60" y="15" textAnchor="middle" fill={colors.text} fontSize="10" fontWeight="bold">Legend</text>
          <rect x="10" y="25" width="20" height="15" fill={colors.rackFill} stroke={colors.rack} strokeWidth="1" />
          <text x="40" y="36" fill={colors.text} fontSize="8">Rack</text>
          <line x1="10" y1="50" x2="30" y2="50" stroke={colors.wall} strokeWidth="3" />
          <text x="40" y="54" fill={colors.text} fontSize="8">Wall</text>
        </g>
      </svg>
    )
  }, [roomsInFloor, sceneConfig.racks, colors, zoom, showGrid, showDimensions, showLabels, selectedFloorId, floors, siteName, SCALE])

  // Rack elevation SVG
  const renderRackElevation = useCallback(() => {
    if (!selectedRackId) {
      return (
        <div className="flex items-center justify-center h-full text-muted-foreground">
          <div className="text-center">
            <Server className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>Select a rack to view elevation</p>
          </div>
        </div>
      )
    }

    const rack = sceneConfig.racks.find(r => r.id === selectedRackId)
    if (!rack) return null

    const devices = devicesInRack.sort((a, b) => (b.uStart || 0) - (a.uStart || 0))
    const rackHeight = (rack.uHeight || 42) * U_HEIGHT
    const width = RACK_WIDTH + PADDING * 2
    const height = rackHeight + PADDING * 2 + 60 // Extra for title

    return (
      <svg
        ref={svgRef}
        width={width * zoom}
        height={height * zoom}
        viewBox={`0 0 ${width} ${height}`}
        className="drawing-svg"
      >
        {/* Background */}
        <rect width={width} height={height} fill={colors.background} />

        {/* Title */}
        <text
          x={width / 2}
          y={30}
          textAnchor="middle"
          fill={colors.text}
          fontSize="16"
          fontWeight="bold"
        >
          {rack.name} - Elevation View
        </text>
        <text
          x={width / 2}
          y={48}
          textAnchor="middle"
          fill={colors.dimension}
          fontSize="10"
        >
          {rack.uHeight || 42}U Rack
        </text>

        {/* Rack frame */}
        <g transform={`translate(${PADDING}, 60)`}>
          {/* Outer frame */}
          <rect
            x="0"
            y="0"
            width={RACK_WIDTH}
            height={rackHeight}
            fill={colors.rackFill}
            stroke={colors.rack}
            strokeWidth="2"
          />

          {/* U position guides */}
          {showGrid && Array.from({ length: (rack.uHeight || 42) + 1 }).map((_, i) => (
            <g key={i}>
              <line
                x1="0"
                y1={rackHeight - i * U_HEIGHT}
                x2={RACK_WIDTH}
                y2={rackHeight - i * U_HEIGHT}
                stroke={colors.grid}
                strokeWidth="0.5"
                strokeDasharray={i % 3 === 0 ? "none" : "2,2"}
              />
              {showLabels && i > 0 && i % 3 === 0 && (
                <text
                  x="-8"
                  y={rackHeight - i * U_HEIGHT + 3}
                  textAnchor="end"
                  fill={colors.dimension}
                  fontSize="8"
                >
                  U{i}
                </text>
              )}
            </g>
          ))}

          {/* Devices */}
          {devices.map(device => {
            const uStart = device.uStart || 1
            const uHeight = device.uHeight || 1
            const y = rackHeight - (uStart + uHeight - 1) * U_HEIGHT
            const h = uHeight * U_HEIGHT - 2
            const category = device.category || 'other'
            const color = equipmentColors[category] || equipmentColors.other
            const statusColor = statusColors[device.status4D] || statusColors.as_is

            return (
              <g key={device.id} className="device">
                {/* Device body */}
                <rect
                  x="10"
                  y={y}
                  width={RACK_WIDTH - 20}
                  height={h}
                  fill={color}
                  stroke={colors.rack}
                  strokeWidth="1"
                  rx="2"
                />
                
                {/* Status indicator */}
                <rect
                  x="10"
                  y={y}
                  width="4"
                  height={h}
                  fill={statusColor}
                  rx="2"
                />

                {/* Device label */}
                {showLabels && h > 12 && (
                  <text
                    x={RACK_WIDTH / 2}
                    y={y + h / 2 + 4}
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize={h > 24 ? "10" : "8"}
                    fontWeight="500"
                  >
                    {device.name.length > 20 ? device.name.substring(0, 18) + '...' : device.name}
                  </text>
                )}

                {/* U position annotation */}
                {showDimensions && (
                  <text
                    x={RACK_WIDTH + 8}
                    y={y + h / 2 + 3}
                    fill={colors.annotation}
                    fontSize="8"
                  >
                    U{uStart}{uHeight > 1 ? `-${uStart + uHeight - 1}` : ''}
                  </text>
                )}
              </g>
            )
          })}
        </g>

        {/* Legend */}
        <g className="legend" transform={`translate(10, ${height - 80})`}>
          <text x="0" y="0" fill={colors.text} fontSize="10" fontWeight="bold">Equipment Categories:</text>
          {Object.entries(equipmentColors).slice(0, 4).map(([cat, color], i) => (
            <g key={cat} transform={`translate(${i * 50}, 15)`}>
              <rect x="0" y="0" width="12" height="8" fill={color} rx="1" />
              <text x="16" y="7" fill={colors.text} fontSize="7" textTransform="capitalize">{cat}</text>
            </g>
          ))}
        </g>

        {/* Status legend */}
        <g className="status-legend" transform={`translate(10, ${height - 50})`}>
          <text x="0" y="0" fill={colors.text} fontSize="10" fontWeight="bold">Status:</text>
          {Object.entries(statusColors).map(([status, color], i) => (
            <g key={status} transform={`translate(${i * 60}, 15)`}>
              <rect x="0" y="0" width="8" height="8" fill={color} rx="1" />
              <text x="12" y="7" fill={colors.text} fontSize="7">{status.replace(/_/g, ' ')}</text>
            </g>
          ))}
        </g>
      </svg>
    )
  }, [selectedRackId, devicesInRack, sceneConfig.racks, colors, zoom, showGrid, showDimensions, showLabels])

  // Room layout SVG (detailed single room)
  const renderRoomLayout = useCallback(() => {
    if (!selectedRoomId) {
      return (
        <div className="flex items-center justify-center h-full text-muted-foreground">
          <div className="text-center">
            <Grid3X3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>Select a room to view layout</p>
          </div>
        </div>
      )
    }

    const room = sceneConfig.rooms.find(r => r.id === selectedRoomId)
    if (!room) return null

    const racks = racksInRoom
    const DETAIL_SCALE = 80 // More detailed scale for room layout
    
    const width = room.dimensions.width * DETAIL_SCALE + PADDING * 2
    const height = room.dimensions.depth * DETAIL_SCALE + PADDING * 2 + 60

    return (
      <svg
        ref={svgRef}
        width={width * zoom}
        height={height * zoom}
        viewBox={`0 0 ${width} ${height}`}
        className="drawing-svg"
      >
        {/* Background */}
        <rect width={width} height={height} fill={colors.background} />

        {/* Title */}
        <text
          x={width / 2}
          y={30}
          textAnchor="middle"
          fill={colors.text}
          fontSize="16"
          fontWeight="bold"
        >
          {room.name} - Room Layout
        </text>

        {/* Grid */}
        {showGrid && (
          <g className="grid" transform={`translate(${PADDING}, 60)`}>
            {Array.from({ length: Math.ceil(room.dimensions.width) + 1 }).map((_, i) => (
              <line
                key={`v${i}`}
                x1={i * DETAIL_SCALE}
                y1={0}
                x2={i * DETAIL_SCALE}
                y2={room.dimensions.depth * DETAIL_SCALE}
                stroke={colors.grid}
                strokeWidth="0.5"
              />
            ))}
            {Array.from({ length: Math.ceil(room.dimensions.depth) + 1 }).map((_, i) => (
              <line
                key={`h${i}`}
                x1={0}
                y1={i * DETAIL_SCALE}
                x2={room.dimensions.width * DETAIL_SCALE}
                y2={i * DETAIL_SCALE}
                stroke={colors.grid}
                strokeWidth="0.5"
              />
            ))}
          </g>
        )}

        {/* Room outline */}
        <g transform={`translate(${PADDING}, 60)`}>
          <rect
            x="0"
            y="0"
            width={room.dimensions.width * DETAIL_SCALE}
            height={room.dimensions.depth * DETAIL_SCALE}
            fill="none"
            stroke={colors.wall}
            strokeWidth="4"
          />

          {/* Racks with details */}
          {racks.map(rack => {
            const rackX = (rack.position.x - room.position.x + room.dimensions.width / 2) * DETAIL_SCALE
            const rackY = (rack.position.z - room.position.z + room.dimensions.depth / 2) * DETAIL_SCALE
            const rackW = 0.6 * DETAIL_SCALE
            const rackD = 1.2 * DETAIL_SCALE
            
            const devicesInThisRack = sceneConfig.devices.filter(d => d.rackId === rack.id)
            const usedU = devicesInThisRack.reduce((sum, d) => sum + (d.uHeight || 1), 0)
            const totalU = rack.uHeight || 42
            const utilizationPct = (usedU / totalU * 100).toFixed(0)

            return (
              <g key={rack.id} className="rack">
                {/* Rack outline */}
                <rect
                  x={rackX - rackW / 2}
                  y={rackY - rackD / 2}
                  width={rackW}
                  height={rackD}
                  fill={colors.rackFill}
                  stroke={colors.rack}
                  strokeWidth="2"
                />
                
                {/* Front indicator */}
                <rect
                  x={rackX - rackW / 2}
                  y={rackY - rackD / 2}
                  width={rackW}
                  height="4"
                  fill={colors.annotation}
                />

                {/* Rack label */}
                {showLabels && (
                  <>
                    <text
                      x={rackX}
                      y={rackY - 5}
                      textAnchor="middle"
                      fill={colors.text}
                      fontSize="10"
                      fontWeight="bold"
                    >
                      {rack.name}
                    </text>
                    <text
                      x={rackX}
                      y={rackY + 8}
                      textAnchor="middle"
                      fill={colors.dimension}
                      fontSize="8"
                    >
                      {utilizationPct}% ({usedU}/{totalU}U)
                    </text>
                  </>
                )}
              </g>
            )
          })}

          {/* Dimensions */}
          {showDimensions && (
            <>
              <g className="dimension">
                <line
                  x1="0"
                  y1={-15}
                  x2={room.dimensions.width * DETAIL_SCALE}
                  y2={-15}
                  stroke={colors.dimension}
                  strokeWidth="1"
                  markerStart="url(#arrowStart)"
                  markerEnd="url(#arrowEnd)"
                />
                <text
                  x={room.dimensions.width * DETAIL_SCALE / 2}
                  y={-20}
                  textAnchor="middle"
                  fill={colors.dimension}
                  fontSize="10"
                >
                  {room.dimensions.width.toFixed(2)}m
                </text>
              </g>
              <g className="dimension">
                <line
                  x1={-15}
                  y1="0"
                  x2={-15}
                  y2={room.dimensions.depth * DETAIL_SCALE}
                  stroke={colors.dimension}
                  strokeWidth="1"
                />
                <text
                  x={-20}
                  y={room.dimensions.depth * DETAIL_SCALE / 2}
                  textAnchor="middle"
                  fill={colors.dimension}
                  fontSize="10"
                  transform={`rotate(-90, -20, ${room.dimensions.depth * DETAIL_SCALE / 2})`}
                >
                  {room.dimensions.depth.toFixed(2)}m
                </text>
              </g>
            </>
          )}
        </g>

        {/* Arrow markers */}
        <defs>
          <marker id="arrowStart" markerWidth="6" markerHeight="6" refX="0" refY="3" orient="auto">
            <path d="M6,0 L0,3 L6,6" fill="none" stroke={colors.dimension} strokeWidth="1" />
          </marker>
          <marker id="arrowEnd" markerWidth="6" markerHeight="6" refX="6" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6" fill="none" stroke={colors.dimension} strokeWidth="1" />
          </marker>
        </defs>

        {/* Legend */}
        <g className="legend" transform={`translate(10, ${height - 40})`}>
          <rect x="0" y="-5" width="8" height="8" fill={colors.annotation} />
          <text x="14" y="2" fill={colors.text} fontSize="8">Front of rack</text>
          <rect x="80" y="-5" width="15" height="10" fill={colors.rackFill} stroke={colors.rack} strokeWidth="1" />
          <text x="100" y="2" fill={colors.text} fontSize="8">Rack position</text>
        </g>
      </svg>
    )
  }, [selectedRoomId, racksInRoom, sceneConfig, colors, zoom, showGrid, showDimensions, showLabels])

  // Export functions
  const exportSVG = useCallback(() => {
    if (!svgRef.current) return
    
    const svgData = new XMLSerializer().serializeToString(svgRef.current)
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
    const svgUrl = URL.createObjectURL(svgBlob)
    
    const downloadLink = document.createElement('a')
    downloadLink.href = svgUrl
    downloadLink.download = `${siteName}-${drawingType}-${Date.now()}.svg`
    document.body.appendChild(downloadLink)
    downloadLink.click()
    document.body.removeChild(downloadLink)
    URL.revokeObjectURL(svgUrl)
  }, [siteName, drawingType])

  const exportPNG = useCallback(() => {
    if (!svgRef.current) return
    
    const svgData = new XMLSerializer().serializeToString(svgRef.current)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()
    
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(svgBlob)
    
    img.onload = () => {
      canvas.width = img.width * 2 // Higher resolution
      canvas.height = img.height * 2
      ctx?.scale(2, 2)
      ctx?.drawImage(img, 0, 0)
      
      const pngUrl = canvas.toDataURL('image/png')
      const downloadLink = document.createElement('a')
      downloadLink.href = pngUrl
      downloadLink.download = `${siteName}-${drawingType}-${Date.now()}.png`
      document.body.appendChild(downloadLink)
      downloadLink.click()
      document.body.removeChild(downloadLink)
      URL.revokeObjectURL(url)
    }
    
    img.src = url
  }, [siteName, drawingType])

  const printDrawing = useCallback(() => {
    if (!svgRef.current) return
    
    const printWindow = window.open('', '_blank')
    if (!printWindow) return
    
    const svgData = new XMLSerializer().serializeToString(svgRef.current)
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${siteName} - ${drawingType}</title>
          <style>
            body { margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
            svg { max-width: 100%; height: auto; }
            @media print { body { margin: 0; } }
          </style>
        </head>
        <body>${svgData}</body>
      </html>
    `)
    printWindow.document.close()
    printWindow.print()
  }, [siteName, drawingType])

  // Render current drawing
  const renderDrawing = useCallback(() => {
    switch (drawingType) {
      case 'floor-plan':
        return renderFloorPlan()
      case 'rack-elevation':
        return renderRackElevation()
      case 'room-layout':
        return renderRoomLayout()
      default:
        return null
    }
  }, [drawingType, renderFloorPlan, renderRackElevation, renderRoomLayout])

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4 p-3 border-b border-border/50 bg-card/50">
        <div className="flex items-center gap-3">
          {/* Drawing type selector */}
          <Select value={drawingType} onValueChange={(v) => setDrawingType(v as DrawingType)}>
            <SelectTrigger className="w-[180px] h-9">
              <SelectValue placeholder="Drawing Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="floor-plan">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4" />
                  Floor Plan
                </div>
              </SelectItem>
              <SelectItem value="rack-elevation">
                <div className="flex items-center gap-2">
                  <Server className="w-4 h-4" />
                  Rack Elevation
                </div>
              </SelectItem>
              <SelectItem value="room-layout">
                <div className="flex items-center gap-2">
                  <Grid3X3 className="w-4 h-4" />
                  Room Layout
                </div>
              </SelectItem>
            </SelectContent>
          </Select>

          {/* Floor selector (for floor plan) */}
          {drawingType === 'floor-plan' && (
            <Select value={selectedFloorId || ''} onValueChange={setSelectedFloorId}>
              <SelectTrigger className="w-[160px] h-9">
                <SelectValue placeholder="Select Floor" />
              </SelectTrigger>
              <SelectContent>
                {floors.map(floor => (
                  <SelectItem key={floor.id} value={floor.id}>{floor.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Room selector (for room layout) */}
          {drawingType === 'room-layout' && (
            <Select value={selectedRoomId || ''} onValueChange={setSelectedRoomId}>
              <SelectTrigger className="w-[180px] h-9">
                <SelectValue placeholder="Select Room" />
              </SelectTrigger>
              <SelectContent>
                {sceneConfig.rooms.map(room => (
                  <SelectItem key={room.id} value={room.id}>{room.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Rack selector (for rack elevation) */}
          {drawingType === 'rack-elevation' && (
            <Select value={selectedRackId || ''} onValueChange={setSelectedRackId}>
              <SelectTrigger className="w-[160px] h-9">
                <SelectValue placeholder="Select Rack" />
              </SelectTrigger>
              <SelectContent>
                {sceneConfig.racks.map(rack => (
                  <SelectItem key={rack.id} value={rack.id}>{rack.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <div className="w-px h-6 bg-border" />

          {/* View controls */}
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setZoom(z => Math.min(z + 0.25, 3))}>
            <ZoomIn className="w-4 h-4" />
          </Button>
          <span className="text-xs text-muted-foreground w-12 text-center">{(zoom * 100).toFixed(0)}%</span>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setZoom(z => Math.max(z - 0.25, 0.25))}>
            <ZoomOut className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setZoom(1)}>
            <Maximize2 className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {/* Display toggles */}
          <Button
            variant={showGrid ? "secondary" : "ghost"}
            size="sm"
            className="h-8 gap-1.5"
            onClick={() => setShowGrid(!showGrid)}
          >
            <Grid3X3 className="w-3 h-3" />
            Grid
          </Button>
          <Button
            variant={showDimensions ? "secondary" : "ghost"}
            size="sm"
            className="h-8 gap-1.5"
            onClick={() => setShowDimensions(!showDimensions)}
          >
            <FileText className="w-3 h-3" />
            Dims
          </Button>
          <Button
            variant={showLabels ? "secondary" : "ghost"}
            size="sm"
            className="h-8 gap-1.5"
            onClick={() => setShowLabels(!showLabels)}
          >
            Labels
          </Button>

          <div className="w-px h-6 bg-border" />

          {/* Export buttons */}
          <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={exportSVG}>
            <Download className="w-3 h-3" />
            SVG
          </Button>
          <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={exportPNG}>
            <Download className="w-3 h-3" />
            PNG
          </Button>
          <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={printDrawing}>
            <Printer className="w-3 h-3" />
            Print
          </Button>
        </div>
      </div>

      {/* Drawing canvas */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-auto p-4 bg-muted/30"
        style={{ 
          backgroundImage: `radial-gradient(circle, ${colors.grid} 1px, transparent 1px)`,
          backgroundSize: '20px 20px'
        }}
      >
        <Card className="inline-block shadow-lg">
          {renderDrawing()}
        </Card>
      </div>
    </div>
  )
}

