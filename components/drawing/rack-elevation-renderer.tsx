import { useMemo, forwardRef } from "react"
import { Server } from "lucide-react"
import { DrawingRendererProps, equipmentColors, statusColors } from "./types"
import { DeviceType } from "@/lib/types"

interface RackElevationRendererProps extends DrawingRendererProps {
    selectedRackId: string | null
}

export const RackElevationRenderer = forwardRef<SVGSVGElement, RackElevationRendererProps>(
    ({ sceneConfig, deviceTypes, colors, zoom, showGrid, showDimensions, showLabels, selectedRackId }, ref) => {

        // Drawing dimensions
        const PADDING = 60
        const U_HEIGHT = 8 // pixels per U
        const RACK_WIDTH = 200

        // Get devices for selected rack
        const devicesInRack = useMemo(() => {
            if (!selectedRackId) return []
            return sceneConfig.devices.filter(d => d.rackId === selectedRackId)
        }, [sceneConfig.devices, selectedRackId])

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
                ref={ref}
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
                        const deviceType = deviceTypes?.find(dt => dt.id === device.deviceTypeId)
                        const category = deviceType?.category || 'other'
                        const color = equipmentColors[category] || equipmentColors.other
                        const statusColor = statusColors[device.status4D] || statusColors.AS_IS

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
                            <text x="16" y="7" fill={colors.text} fontSize="7">{cat.charAt(0).toUpperCase() + cat.slice(1)}</text>
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
            </svg >
        )
    })

RackElevationRenderer.displayName = "RackElevationRenderer"
