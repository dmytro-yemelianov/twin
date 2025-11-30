"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { AICapacitySuggestion } from "@/lib/types"
import { Database, Zap, X } from "lucide-react"
import { Button } from "@/components/ui/button"

interface AICapacityPanelProps {
  suggestion: AICapacitySuggestion
  onClose: () => void
}

export function AICapacityPanel({ suggestion, onClose }: AICapacityPanelProps) {
  return (
    <Card className="border-green-500/50 bg-card/95 backdrop-blur">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <CardTitle className="text-lg">AI-Ready Capacity Found</CardTitle>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{suggestion.summary}</p>

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Selected Racks</div>
            <div className="text-2xl font-bold text-green-500">{suggestion.rackIds.length}</div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Database className="w-3 h-3" />
              <span>Free Space</span>
            </div>
            <div className="text-2xl font-bold">{suggestion.totalFreeU}U</div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Zap className="w-3 h-3" />
              <span>Power Headroom</span>
            </div>
            <div className="text-2xl font-bold">{suggestion.totalPowerHeadroomKw.toFixed(1)}kW</div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-xs font-medium text-muted-foreground">Selected Racks:</div>
          <div className="flex flex-wrap gap-2">
            {suggestion.rackIds.map((rackId) => (
              <Badge key={rackId} variant="outline" className="border-green-500/50">
                {rackId}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
