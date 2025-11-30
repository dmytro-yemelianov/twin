"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { Device, Phase, Status4D } from "@/lib/types"

interface TimelineViewProps {
  devices: Device[]
  currentPhase: Phase
}

const status4DColors = {
  EXISTING_RETAINED: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  EXISTING_REMOVED: "bg-red-500/10 text-red-500 border-red-500/20",
  PROPOSED: "bg-green-500/10 text-green-500 border-green-500/20",
  FUTURE: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  MODIFIED: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
}

const phaseTimeline = [
  { phase: "AS_IS" as Phase, label: "As-Is", date: "Q1 2024" },
  { phase: "TO_BE" as Phase, label: "To-Be", date: "Q2-Q3 2024" },
  { phase: "FUTURE" as Phase, label: "Future", date: "Q4 2024+" },
]

export function TimelineView({ devices, currentPhase }: TimelineViewProps) {
  // Group devices by status
  const devicesByStatus = devices.reduce(
    (acc, device) => {
      if (!acc[device.status4D]) acc[device.status4D] = []
      acc[device.status4D].push(device)
      return acc
    },
    {} as Record<Status4D, Device[]>,
  )

  return (
    <Card className="border-border/50 p-4">
      <div className="space-y-4">
        <div>
          <h3 className="font-semibold text-lg">Equipment Lifecycle Timeline</h3>
          <p className="text-xs text-muted-foreground mt-1">Phased equipment modifications and deployments</p>
        </div>

        {/* Phase Timeline */}
        <div className="flex items-center gap-2">
          {phaseTimeline.map((item, idx) => (
            <div key={item.phase} className="flex items-center flex-1">
              <div
                className={`flex-1 rounded-lg p-3 border-2 transition-all ${
                  item.phase === currentPhase
                    ? "border-primary bg-primary/10"
                    : "border-border/50 bg-card/50 opacity-60"
                }`}
              >
                <div className="font-semibold">{item.label}</div>
                <div className="text-xs text-muted-foreground">{item.date}</div>
              </div>
              {idx < phaseTimeline.length - 1 && <div className="w-8 h-0.5 bg-border mx-1" />}
            </div>
          ))}
        </div>

        {/* Status Breakdown */}
        <div className="grid grid-cols-2 gap-3 mt-6">
          {Object.entries(devicesByStatus).map(([status, devs]) => (
            <div key={status} className="space-y-2">
              <Badge variant="outline" className={status4DColors[status as Status4D]}>
                {status.replace(/_/g, " ")}
              </Badge>
              <div className="text-2xl font-bold">{devs.length}</div>
              <div className="text-xs text-muted-foreground">{devs.reduce((sum, d) => sum + d.uHeight, 0)}U total</div>
            </div>
          ))}
        </div>

        {/* Example Modifications */}
        <div className="mt-6 space-y-3">
          <h4 className="text-sm font-semibold">Example Modifications</h4>
          <div className="space-y-2 text-sm">
            <div className="flex items-start gap-2 p-2 rounded bg-accent/10">
              <div className="w-20 text-xs text-muted-foreground">Q1 2024</div>
              <div className="flex-1">
                <div className="font-medium">Decommission legacy storage arrays</div>
                <div className="text-xs text-muted-foreground">Remove 8U NetApp FAS8200 systems from Rack R-003</div>
              </div>
            </div>
            <div className="flex items-start gap-2 p-2 rounded bg-accent/10">
              <div className="w-20 text-xs text-muted-foreground">Q2 2024</div>
              <div className="flex-1">
                <div className="font-medium">Deploy AI GPU cluster</div>
                <div className="text-xs text-muted-foreground">
                  Install 16x NVIDIA H100 servers in Racks R-007 to R-010
                </div>
              </div>
            </div>
            <div className="flex items-start gap-2 p-2 rounded bg-accent/10">
              <div className="w-20 text-xs text-muted-foreground">Q3 2024</div>
              <div className="flex-1">
                <div className="font-medium">Upgrade cooling infrastructure</div>
                <div className="text-xs text-muted-foreground">Enhanced CRAC units for high-density GPU cooling</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}
