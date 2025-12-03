import { useMemo, forwardRef } from "react"
import { Grid3X3 } from "lucide-react"
import { Room } from "@/lib/types"
import { DrawingRendererProps } from "./types"

interface RoomLayoutRendererProps extends DrawingRendererProps {
    selectedRoomId: string | null
}

export const RoomLayoutRenderer = forwardRef<SVGSVGElement, RoomLayoutRendererProps>(
    ({ sceneConfig, colors, zoom, showGrid, showDimensions, showLabels, selectedRoomId }, ref) => {

        // Drawing dimensions
        const PADDING = 60
        const DETAIL_SCALE = 80 // More detailed scale for room layout

        // Get racks for selected room
        const racksInRoom = useMemo(() => {
            if (!selectedRoomId) return []
            return sceneConfig.racks.filter(r => r.roomId === selectedRoomId)
        }, [sceneConfig.racks, selectedRoomId])

        // Helper to get room position and calculate dimensions
        const getRoomGeometry = (room: Room) => {
            const position = room.transformInBuilding?.position || [0, 0, 0]
            const area = room.area || 100
            // Approximate dimensions from area (assume roughly square rooms)
            const side = Math.sqrt(area)
            return {
                x: position[0],
                y: position[1],
                z: position[2],
                width: side,
                depth: side,
                area
            }
        }

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

        const roomGeo = getRoomGeometry(room)
        const racks = racksInRoom

        const width = roomGeo.width * DETAIL_SCALE + PADDING * 2
        const height = roomGeo.depth * DETAIL_SCALE + PADDING * 2 + 60

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
                    {room.name} - Room Layout
                </text>

                {/* Grid */}
                {showGrid && (
                    <g className="grid" transform={`translate(${PADDING}, 60)`}>
                        {Array.from({ length: Math.ceil(roomGeo.width) + 1 }).map((_, i) => (
                            <line
                                key={`v${i}`}
                                x1={i * DETAIL_SCALE}
                                y1={0}
                                x2={i * DETAIL_SCALE}
                                y2={roomGeo.depth * DETAIL_SCALE}
                                stroke={colors.grid}
                                strokeWidth="0.5"
                            />
                        ))}
                        {Array.from({ length: Math.ceil(roomGeo.depth) + 1 }).map((_, i) => (
                            <line
                                key={`h${i}`}
                                x1={0}
                                y1={i * DETAIL_SCALE}
                                x2={roomGeo.width * DETAIL_SCALE}
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
                        width={roomGeo.width * DETAIL_SCALE}
                        height={roomGeo.depth * DETAIL_SCALE}
                        fill="none"
                        stroke={colors.wall}
                        strokeWidth="4"
                    />

                    {/* Racks with details */}
                    {racks.map(rack => {
                        const rackPos = rack.positionInRoom?.position || [0, 0, 0]
                        const rackX = (rackPos[0] - roomGeo.x + roomGeo.width / 2) * DETAIL_SCALE
                        const rackY = (rackPos[2] - roomGeo.z + roomGeo.depth / 2) * DETAIL_SCALE
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
                                    x2={roomGeo.width * DETAIL_SCALE}
                                    y2={-15}
                                    stroke={colors.dimension}
                                    strokeWidth="1"
                                    markerStart="url(#arrowStart)"
                                    markerEnd="url(#arrowEnd)"
                                />
                                <text
                                    x={roomGeo.width * DETAIL_SCALE / 2}
                                    y={-20}
                                    textAnchor="middle"
                                    fill={colors.dimension}
                                    fontSize="10"
                                >
                                    {roomGeo.width.toFixed(2)}m
                                </text>
                            </g>
                            <g className="dimension">
                                <line
                                    x1={-15}
                                    y1="0"
                                    x2={-15}
                                    y2={roomGeo.depth * DETAIL_SCALE}
                                    stroke={colors.dimension}
                                    strokeWidth="1"
                                />
                                <text
                                    x={-20}
                                    y={roomGeo.depth * DETAIL_SCALE / 2}
                                    textAnchor="middle"
                                    fill={colors.dimension}
                                    fontSize="10"
                                    transform={`rotate(-90, -20, ${roomGeo.depth * DETAIL_SCALE / 2})`}
                                >
                                    {roomGeo.depth.toFixed(2)}m
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
    })

RoomLayoutRenderer.displayName = "RoomLayoutRenderer"
