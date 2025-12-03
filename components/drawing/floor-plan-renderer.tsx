import { useMemo, forwardRef } from "react"
import { Room } from "@/lib/types"
import { DrawingRendererProps } from "./types"

interface FloorPlanRendererProps extends DrawingRendererProps {
    selectedFloorId: string | null
}

export const FloorPlanRenderer = forwardRef<SVGSVGElement, FloorPlanRendererProps>(
    ({ sceneConfig, colors, zoom, showGrid, showDimensions, showLabels, siteName, selectedFloorId }, ref) => {

        // Drawing dimensions
        const SCALE = 50 // pixels per meter
        const PADDING = 60

        // Get floors
        const floors = useMemo(() => {
            return sceneConfig.floors || [{ id: 'default', name: 'Ground Floor', buildingId: 'default', elevation: 0 }]
        }, [sceneConfig.floors])

        // Get rooms for selected floor
        const roomsInFloor = useMemo(() => {
            if (!selectedFloorId) return sceneConfig.rooms
            return sceneConfig.rooms.filter(r => r.floorId === selectedFloorId)
        }, [sceneConfig.rooms, selectedFloorId])

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

        const rooms = roomsInFloor
        if (rooms.length === 0) return null

        // Calculate bounds using transformed positions
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
        rooms.forEach(room => {
            const geo = getRoomGeometry(room)
            minX = Math.min(minX, geo.x)
            minY = Math.min(minY, geo.z)
            maxX = Math.max(maxX, geo.x + geo.width)
            maxY = Math.max(maxY, geo.z + geo.depth)
        })

        const width = (maxX - minX) * SCALE + PADDING * 2
        const height = (maxY - minY) * SCALE + PADDING * 2

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
                    const geo = getRoomGeometry(room)
                    const x = (geo.x - minX) * SCALE + PADDING
                    const y = (geo.z - minY) * SCALE + PADDING
                    const w = geo.width * SCALE
                    const h = geo.depth * SCALE

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
                                            {geo.width.toFixed(1)}m
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
                                            {geo.depth.toFixed(1)}m
                                        </text>
                                    </g>
                                </>
                            )}

                            {/* Racks */}
                            {racksInThisRoom.map(rack => {
                                const rackPos = rack.positionInRoom?.position || [0, 0, 0]
                                const rackX = x + (rackPos[0] - geo.x + geo.width / 2) * SCALE
                                const rackY = y + (rackPos[2] - geo.z + geo.depth / 2) * SCALE
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
    })

FloorPlanRenderer.displayName = "FloorPlanRenderer"
