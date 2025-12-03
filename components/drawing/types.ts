import { SceneConfig, DeviceType } from "@/lib/types"

export type DrawingType = 'floor-plan' | 'rack-elevation' | 'room-layout' | 'single-line'

export interface DrawingColors {
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

export const lightColors: DrawingColors = {
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

export const darkColors: DrawingColors = {
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

export const equipmentColors: Record<string, string> = {
    server: '#3b82f6',
    storage: '#8b5cf6',
    network: '#22c55e',
    power: '#f59e0b',
    cooling: '#06b6d4',
    security: '#ef4444',
    other: '#6b7280',
}

export const statusColors: Record<string, string> = {
    AS_IS: '#22c55e',
    EXISTING_RETAINED: '#6b7280',
    EXISTING_REMOVED: '#ef4444',
    PROPOSED: '#3b82f6',
    FUTURE: '#8b5cf6',
    MODIFIED: '#a855f7',
}

export interface DrawingRendererProps {
    sceneConfig: SceneConfig
    deviceTypes?: DeviceType[]
    colors: DrawingColors
    zoom: number
    showGrid: boolean
    showDimensions: boolean
    showLabels: boolean
    siteName?: string
}
