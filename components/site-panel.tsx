"use client"

import type { Site } from "@/lib/types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Building2, Database, Zap } from "lucide-react"

interface SitePanelProps {
  site: Site | null
  onOpenTwin: () => void
}

const statusLabels: Record<string, string> = {
  AI_READY: "AI Ready",
  IN_PROGRESS: "In Progress",
  LEGACY: "Legacy",
}

const statusVariants: Record<string, "default" | "secondary" | "outline"> = {
  AI_READY: "default",
  IN_PROGRESS: "secondary",
  LEGACY: "outline",
}

export function SitePanel({ site, onOpenTwin }: SitePanelProps) {
  if (!site) {
    return (
      <Card className="border-border/50">
        <CardContent className="flex items-center justify-center h-full min-h-[200px]">
          <p className="text-sm text-muted-foreground">Select a site on the map to view details</p>
        </CardContent>
      </Card>
    )
  }

  const capacityPercent = Math.round((site.aiReadyRacks / site.rackCount) * 100)

  return (
    <Card className="border-border/50">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-xl">{site.name}</CardTitle>
            <CardDescription>{site.region}</CardDescription>
          </div>
          <Badge variant={statusVariants[site.status]}>{statusLabels[site.status]}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Database className="w-4 h-4" />
              <span>Total Racks</span>
            </div>
            <div className="text-2xl font-semibold">{site.rackCount}</div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Zap className="w-4 h-4" />
              <span>AI-Ready</span>
            </div>
            <div className="text-2xl font-semibold text-green-500">{site.aiReadyRacks}</div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Building2 className="w-4 h-4" />
              <span>Capacity</span>
            </div>
            <div className="text-2xl font-semibold">{capacityPercent}%</div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-sm text-muted-foreground">AI-Ready Capacity</div>
          <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
            <div className="h-full bg-green-500 transition-all" style={{ width: `${capacityPercent}%` }} />
          </div>
        </div>

        <Button onClick={onOpenTwin} className="w-full" size="lg">
          Open 3D Digital Twin
        </Button>
      </CardContent>
    </Card>
  )
}
