import React from 'react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { Status4D } from '@/lib/types'
import { status4DColors, status4DLabels } from '@/lib/types'

interface StatusBadgeProps {
  status: Status4D
  variant?: 'dot' | 'badge' | 'indicator'
  size?: 'xs' | 'sm' | 'md' | 'lg'
  showLabel?: boolean
  className?: string
}

const sizeClasses = {
  xs: 'text-[10px] px-1.5 py-0.5',
  sm: 'text-xs px-2 py-1',
  md: 'text-sm px-2.5 py-1.5',
  lg: 'text-base px-3 py-2'
}

const dotSizes = {
  xs: 'w-1.5 h-1.5',
  sm: 'w-2 h-2',
  md: 'w-2.5 h-2.5',
  lg: 'w-3 h-3'
}

export function StatusBadge({
  status,
  variant = 'badge',
  size = 'sm',
  showLabel = true,
  className
}: StatusBadgeProps) {
  const color = status4DColors[status]
  const label = status4DLabels[status]

  if (variant === 'dot') {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <div
          className={cn('rounded-full', dotSizes[size])}
          style={{ backgroundColor: color }}
        />
        {showLabel && (
          <span className={cn('text-foreground', {
            'text-[10px]': size === 'xs',
            'text-xs': size === 'sm',
            'text-sm': size === 'md',
            'text-base': size === 'lg'
          })}>
            {label}
          </span>
        )}
      </div>
    )
  }

  if (variant === 'indicator') {
    return (
      <div
        className={cn(
          'rounded-full border-2 border-background',
          dotSizes[size],
          className
        )}
        style={{ backgroundColor: color }}
        title={label}
      />
    )
  }

  return (
    <Badge
      variant="outline"
      className={cn(
        'border font-medium',
        sizeClasses[size],
        className
      )}
      style={{ 
        borderColor: color,
        color: color,
        backgroundColor: `${color}15`
      }}
    >
      {showLabel ? label : status}
    </Badge>
  )
}