"use client"

import { Building2, Layers, DoorOpen, Server, Cpu } from "lucide-react"
import { cn } from "@/lib/utils"

interface BreadcrumbItem {
    label: string
    type: 'building' | 'floor' | 'room' | 'rack' | 'device'
    id?: string
}

interface VerticalBreadcrumbsProps {
    items: BreadcrumbItem[]
    onItemClick?: (item: BreadcrumbItem) => void
    className?: string
}

const iconMap = {
    building: Building2,
    floor: Layers,
    room: DoorOpen,
    rack: Server,
    device: Cpu,
}

export function VerticalBreadcrumbs({ items, onItemClick, className }: VerticalBreadcrumbsProps) {
    if (items.length === 0) return null

    return (
        <div className={cn(
            "fixed left-4 top-20 z-10 flex flex-col",
            "bg-background/40 backdrop-blur-sm border border-border/30 rounded-lg p-2",
            "transition-all duration-200 hover:bg-background/90 hover:backdrop-blur-md",
            "shadow-lg min-w-[200px] max-w-[280px]",
            className
        )}>
            {items.map((item, index) => {
                const Icon = iconMap[item.type]
                const isLast = index === items.length - 1
                const indentLevel = index // Indent based on hierarchy depth

                return (
                    <button
                        key={`${item.type}-${item.id || index}`}
                        onClick={() => onItemClick?.(item)}
                        className={cn(
                            "flex items-center gap-2 py-1.5 rounded transition-colors text-left w-full",
                            onItemClick ? "hover:bg-accent cursor-pointer" : "cursor-default",
                            isLast ? "bg-accent/50 font-medium" : "opacity-75 hover:opacity-100"
                        )}
                        style={{
                            paddingLeft: `${8 + indentLevel * 12}px`,
                            paddingRight: '8px'
                        }}
                    >
                        <Icon className={cn(
                            "w-3.5 h-3.5 shrink-0",
                            isLast ? "text-primary" : "text-muted-foreground"
                        )} />
                        <span className={cn(
                            "text-xs whitespace-nowrap truncate",
                            isLast ? "text-foreground font-medium" : "text-muted-foreground"
                        )}>
                            {item.label}
                        </span>
                    </button>
                )
            })}
        </div>
    )
}
