"use client"

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'

export interface VirtualListItem {
  id: string | number
  data: any
  height?: number
}

interface VirtualListProps<T extends VirtualListItem> {
  items: T[]
  itemHeight: number
  containerHeight: number
  renderItem: (item: T, index: number) => React.ReactNode
  overscan?: number
  className?: string
  gap?: number
}

export function VirtualList<T extends VirtualListItem>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  overscan = 5,
  className = '',
  gap = 0
}: VirtualListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0)
  const scrollElementRef = useRef<HTMLDivElement>(null)

  const totalHeight = items.length * (itemHeight + gap)

  const startIndex = Math.max(0, Math.floor(scrollTop / (itemHeight + gap)) - overscan)
  const endIndex = Math.min(
    items.length - 1,
    Math.ceil((scrollTop + containerHeight) / (itemHeight + gap)) + overscan
  )

  const visibleItems = useMemo(() => {
    return items.slice(startIndex, endIndex + 1).map((item, index) => ({
      ...item,
      index: startIndex + index
    }))
  }, [items, startIndex, endIndex])

  const offsetY = startIndex * (itemHeight + gap)

  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(event.currentTarget.scrollTop)
  }, [])

  return (
    <div
      className={`relative ${className}`}
      style={{ height: containerHeight }}
      ref={scrollElementRef}
      onScroll={handleScroll}
    >
      {/* Total height placeholder */}
      <div style={{ height: totalHeight, width: '100%' }} />
      
      {/* Visible items */}
      <div
        className="absolute top-0 left-0 w-full"
        style={{ transform: `translateY(${offsetY}px)` }}
      >
        {visibleItems.map((item) => (
          <div
            key={item.id}
            style={{ 
              height: itemHeight,
              marginBottom: gap > 0 ? gap : undefined
            }}
          >
            {renderItem(item as T, item.index)}
          </div>
        ))}
      </div>
    </div>
  )
}

// Hook for calculating dynamic item heights
export function useVirtualList<T extends VirtualListItem>(
  items: T[],
  estimatedItemHeight: number,
  containerHeight: number,
  dependencies: React.DependencyList = []
) {
  const [itemHeights, setItemHeights] = useState<Map<string | number, number>>(new Map())
  const [scrollTop, setScrollTop] = useState(0)

  const totalHeight = useMemo(() => {
    return items.reduce((total, item) => {
      const height = itemHeights.get(item.id) || estimatedItemHeight
      return total + height
    }, 0)
  }, [items, itemHeights, estimatedItemHeight])

  const visibleRange = useMemo(() => {
    let accumulatedHeight = 0
    let startIndex = -1
    let endIndex = -1

    for (let i = 0; i < items.length; i++) {
      const itemHeight = itemHeights.get(items[i].id) || estimatedItemHeight
      
      if (startIndex === -1 && accumulatedHeight + itemHeight >= scrollTop) {
        startIndex = Math.max(0, i - 2) // Add some overscan
      }
      
      if (startIndex !== -1 && accumulatedHeight > scrollTop + containerHeight) {
        endIndex = Math.min(items.length - 1, i + 2) // Add some overscan
        break
      }
      
      accumulatedHeight += itemHeight
    }

    if (endIndex === -1) {
      endIndex = items.length - 1
    }

    return { startIndex: startIndex === -1 ? 0 : startIndex, endIndex }
  }, [items, itemHeights, estimatedItemHeight, scrollTop, containerHeight])

  const setItemHeight = useCallback((id: string | number, height: number) => {
    setItemHeights(prev => {
      const next = new Map(prev)
      next.set(id, height)
      return next
    })
  }, [])

  const getOffsetTop = useCallback((index: number) => {
    let offset = 0
    for (let i = 0; i < index; i++) {
      offset += itemHeights.get(items[i].id) || estimatedItemHeight
    }
    return offset
  }, [items, itemHeights, estimatedItemHeight])

  return {
    totalHeight,
    visibleRange,
    setScrollTop,
    setItemHeight,
    getOffsetTop
  }
}

// Optimized inventory panel with virtual scrolling
export function VirtualInventoryPanel({
  items,
  selectedId,
  onSelect,
  renderItem,
  className
}: {
  items: any[]
  selectedId?: string | null
  onSelect: (item: any) => void
  renderItem: (item: any, index: number, isSelected: boolean) => React.ReactNode
  className?: string
}) {
  const containerHeight = 400
  const itemHeight = 60

  return (
    <ScrollArea className={className} style={{ height: containerHeight }}>
      <VirtualList
        items={items}
        itemHeight={itemHeight}
        containerHeight={containerHeight}
        renderItem={(item, index) => (
          <div
            className={`cursor-pointer transition-colors ${
              selectedId === item.id ? 'bg-accent' : 'hover:bg-muted/50'
            }`}
            onClick={() => onSelect(item)}
          >
            {renderItem(item, index, selectedId === item.id)}
          </div>
        )}
      />
    </ScrollArea>
  )
}