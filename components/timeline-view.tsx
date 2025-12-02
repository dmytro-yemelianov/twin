"use client"

import { useMemo } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { 
  Calendar, 
  CheckCircle2, 
  Circle, 
  Clock, 
  AlertTriangle,
  Truck,
  Wrench,
  Power,
  Server,
  HardDrive,
  Cpu,
  Network,
  Zap
} from "lucide-react"
import type { Device, Phase, Status4D } from "@/lib/types"

interface TimelineViewProps {
  devices: Device[]
  currentPhase: Phase
}

const status4DColors: Record<Status4D, string> = {
  EXISTING_RETAINED: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  EXISTING_REMOVED: "bg-red-500/10 text-red-500 border-red-500/20",
  PROPOSED: "bg-green-500/10 text-green-500 border-green-500/20",
  FUTURE: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  MODIFIED: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
}

const status4DLabels: Record<Status4D, string> = {
  EXISTING_RETAINED: "Retained",
  EXISTING_REMOVED: "Decommissioned",
  PROPOSED: "New Deployment",
  FUTURE: "Future Phase",
  MODIFIED: "Relocated/Upgraded",
}

// Current date context: December 2025
const CURRENT_DATE = new Date("2025-12-01")

interface PhaseInfo {
  phase: Phase
  label: string
  dateRange: string
  description: string
  status: "completed" | "in-progress" | "upcoming"
  progress: number
}

const phaseTimeline: PhaseInfo[] = [
  { 
    phase: "AS_IS", 
    label: "Baseline Assessment", 
    dateRange: "Jan - Mar 2025",
    description: "Document current infrastructure state",
    status: "completed",
    progress: 100
  },
  { 
    phase: "TO_BE", 
    label: "Active Migration", 
    dateRange: "Apr 2025 - Feb 2026",
    description: "Equipment upgrades and relocations",
    status: "in-progress",
    progress: 72
  },
  { 
    phase: "FUTURE", 
    label: "Expansion Phase", 
    dateRange: "Mar 2026 - Dec 2026",
    description: "New capacity deployment",
    status: "upcoming",
    progress: 0
  },
]

interface MilestoneEvent {
  date: string
  title: string
  description: string
  type: "decommission" | "install" | "relocate" | "upgrade" | "maintenance"
  status: "completed" | "in-progress" | "scheduled" | "delayed"
  impact?: string
  icon: React.ReactNode
}

const milestoneEvents: MilestoneEvent[] = [
  // Past events (completed)
  {
    date: "Jan 15, 2025",
    title: "Legacy SAN Decommission",
    description: "Removed NetApp FAS8200 arrays from Data Hall Alpha",
    type: "decommission",
    status: "completed",
    impact: "Freed 16U rack space",
    icon: <HardDrive className="w-4 h-4" />
  },
  {
    date: "Feb 28, 2025",
    title: "Network Core Upgrade",
    description: "Upgraded spine switches to 400GbE Arista 7800R3",
    type: "upgrade",
    status: "completed",
    impact: "4x bandwidth increase",
    icon: <Network className="w-4 h-4" />
  },
  {
    date: "Apr 12, 2025",
    title: "GPU Cluster Phase 1",
    description: "Deployed 8x NVIDIA H100 servers in A-02-01",
    type: "install",
    status: "completed",
    impact: "Added 640 TFLOPS compute",
    icon: <Cpu className="w-4 h-4" />
  },
  {
    date: "Jun 30, 2025",
    title: "Power Infrastructure Upgrade",
    description: "Installed additional 500kW UPS capacity",
    type: "upgrade",
    status: "completed",
    impact: "N+1 redundancy achieved",
    icon: <Zap className="w-4 h-4" />
  },
  {
    date: "Aug 22, 2025",
    title: "Server Migration - Batch 1",
    description: "Relocated 12 compute nodes from A-01-01 to A-01-03",
    type: "relocate",
    status: "completed",
    impact: "Consolidated workloads",
    icon: <Server className="w-4 h-4" />
  },
  {
    date: "Oct 15, 2025",
    title: "PostgreSQL Cluster Upgrade",
    description: "Upgraded primary database servers to Gen5 hardware",
    type: "upgrade",
    status: "completed",
    impact: "2x query performance",
    icon: <HardDrive className="w-4 h-4" />
  },
  // Current/In-progress events
  {
    date: "Nov 18, 2025",
    title: "AI Training Infrastructure",
    description: "Installing AI Training Node 01 in A-01-03",
    type: "install",
    status: "in-progress",
    impact: "Adding 8x A100 GPUs",
    icon: <Cpu className="w-4 h-4" />
  },
  {
    date: "Dec 1, 2025",
    title: "Storage Tier Consolidation",
    description: "Migrating SAN storage to all-flash arrays",
    type: "relocate",
    status: "in-progress",
    impact: "10x IOPS improvement",
    icon: <HardDrive className="w-4 h-4" />
  },
  // Upcoming scheduled events
  {
    date: "Dec 15, 2025",
    title: "Cooling System Maintenance",
    description: "Annual CRAC unit maintenance window",
    type: "maintenance",
    status: "scheduled",
    impact: "4-hour maintenance window",
    icon: <Wrench className="w-4 h-4" />
  },
  {
    date: "Jan 8, 2026",
    title: "GPU Cluster Phase 2",
    description: "Deploy additional 8x H100 servers in A-02-02",
    type: "install",
    status: "scheduled",
    impact: "Double AI compute capacity",
    icon: <Cpu className="w-4 h-4" />
  },
  {
    date: "Feb 15, 2026",
    title: "Legacy Server Decommission",
    description: "Remove Gen3 compute servers from A-01-01",
    type: "decommission",
    status: "scheduled",
    impact: "Retire 24U equipment",
    icon: <Server className="w-4 h-4" />
  },
  {
    date: "Mar 2026",
    title: "Building B Expansion",
    description: "Commission new data hall with 20 racks",
    type: "install",
    status: "scheduled",
    impact: "50% capacity increase",
    icon: <Power className="w-4 h-4" />
  },
]

const statusIcons = {
  completed: <CheckCircle2 className="w-4 h-4 text-green-500" />,
  "in-progress": <Clock className="w-4 h-4 text-yellow-500 animate-pulse" />,
  scheduled: <Circle className="w-4 h-4 text-blue-500" />,
  delayed: <AlertTriangle className="w-4 h-4 text-red-500" />,
}

const typeColors = {
  decommission: "border-l-red-500 bg-red-500/5",
  install: "border-l-green-500 bg-green-500/5",
  relocate: "border-l-yellow-500 bg-yellow-500/5",
  upgrade: "border-l-blue-500 bg-blue-500/5",
  maintenance: "border-l-orange-500 bg-orange-500/5",
}

export function TimelineView({ devices, currentPhase }: TimelineViewProps) {
  // Group devices by status
  const devicesByStatus = useMemo(() => {
    return devices.reduce(
      (acc, device) => {
        if (!acc[device.status4D]) acc[device.status4D] = []
        acc[device.status4D].push(device)
        return acc
      },
      {} as Record<Status4D, Device[]>,
    )
  }, [devices])

  // Calculate summary stats
  const stats = useMemo(() => {
    const totalDevices = devices.length
    const totalU = devices.reduce((sum, d) => sum + d.uHeight, 0)
    const retainedCount = devicesByStatus.EXISTING_RETAINED?.length || 0
    const removedCount = devicesByStatus.EXISTING_REMOVED?.length || 0
    const proposedCount = devicesByStatus.PROPOSED?.length || 0
    const futureCount = devicesByStatus.FUTURE?.length || 0
    const modifiedCount = devicesByStatus.MODIFIED?.length || 0
    
    return {
      totalDevices,
      totalU,
      retainedCount,
      removedCount,
      proposedCount,
      futureCount,
      modifiedCount,
      migrationProgress: Math.round(((retainedCount + proposedCount + modifiedCount) / totalDevices) * 100)
    }
  }, [devices, devicesByStatus])

  // Get current phase info
  const currentPhaseInfo = phaseTimeline.find(p => p.phase === currentPhase) || phaseTimeline[1]

  return (
    <div className="space-y-6">
      {/* Header with current status */}
      <Card className="border-border/50 p-4 bg-gradient-to-r from-primary/5 to-transparent">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Equipment Lifecycle Timeline
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Data Center Modernization Project • FY2025-2026
            </p>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground">Current Date</div>
            <div className="font-mono text-sm font-semibold">December 1, 2025</div>
          </div>
        </div>
      </Card>

      {/* Phase Progress */}
      <Card className="border-border/50 p-4">
        <h4 className="text-sm font-semibold mb-4 flex items-center gap-2">
          <Truck className="w-4 h-4" />
          Project Phases
        </h4>
        <div className="flex items-stretch gap-3">
          {phaseTimeline.map((item, idx) => (
            <div key={item.phase} className="flex items-stretch flex-1">
              <div
                className={`flex-1 rounded-lg p-3 border-2 transition-all ${
                  item.phase === currentPhase
                    ? "border-primary bg-primary/10 shadow-lg shadow-primary/20"
                    : item.status === "completed"
                      ? "border-green-500/50 bg-green-500/5"
                      : "border-border/50 bg-card/50 opacity-70"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  {item.status === "completed" && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                  {item.status === "in-progress" && <Clock className="w-4 h-4 text-yellow-500 animate-pulse" />}
                  {item.status === "upcoming" && <Circle className="w-4 h-4 text-muted-foreground" />}
                  <span className="font-semibold text-sm">{item.label}</span>
                </div>
                <div className="text-xs text-muted-foreground mb-2">{item.dateRange}</div>
                <div className="text-xs opacity-80 mb-2">{item.description}</div>
                {item.status !== "upcoming" && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-medium">{item.progress}%</span>
                    </div>
                    <Progress value={item.progress} className="h-1.5" />
                  </div>
                )}
              </div>
              {idx < phaseTimeline.length - 1 && (
                <div className="flex items-center px-2">
                  <div className="w-6 h-0.5 bg-border" />
                  <div className="w-0 h-0 border-t-4 border-b-4 border-l-4 border-transparent border-l-border" />
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Equipment Summary */}
      <Card className="border-border/50 p-4">
        <h4 className="text-sm font-semibold mb-4">Equipment Status Summary</h4>
        <div className="grid grid-cols-5 gap-3">
          {Object.entries(status4DLabels).map(([status, label]) => {
            const devs = devicesByStatus[status as Status4D] || []
            const totalU = devs.reduce((sum, d) => sum + d.uHeight, 0)
            return (
              <div key={status} className="text-center p-3 rounded-lg bg-accent/10">
                <Badge variant="outline" className={`${status4DColors[status as Status4D]} mb-2`}>
                  {label}
                </Badge>
                <div className="text-2xl font-bold">{devs.length}</div>
                <div className="text-xs text-muted-foreground">{totalU}U capacity</div>
              </div>
            )
          })}
        </div>
        
        {/* Overall migration progress */}
        <div className="mt-4 p-3 rounded-lg bg-primary/5 border border-primary/20">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium">Overall Migration Progress</span>
            <span className="text-sm font-bold text-primary">{stats.migrationProgress}%</span>
          </div>
          <Progress value={stats.migrationProgress} className="h-2" />
          <div className="flex justify-between mt-2 text-xs text-muted-foreground">
            <span>{stats.retainedCount + stats.proposedCount + stats.modifiedCount} devices migrated</span>
            <span>{stats.removedCount + stats.futureCount} pending</span>
          </div>
        </div>
      </Card>

      {/* Timeline Events */}
      <Card className="border-border/50 p-4">
        <h4 className="text-sm font-semibold mb-4 flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Milestone Events
        </h4>
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-[7px] top-0 bottom-0 w-0.5 bg-gradient-to-b from-green-500 via-yellow-500 to-blue-500/30" />
          
          <div className="space-y-3">
            {milestoneEvents.map((event, index) => {
              const isCurrentOrPast = event.status === "completed" || event.status === "in-progress"
              return (
                <div 
                  key={index}
                  className={`relative pl-6 ${!isCurrentOrPast ? "opacity-70" : ""}`}
                >
                  {/* Timeline dot */}
                  <div className="absolute left-0 top-1">
                    {statusIcons[event.status]}
                  </div>
                  
                  <div className={`p-3 rounded-lg border-l-4 ${typeColors[event.type]}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {event.icon}
                          <span className="font-medium text-sm">{event.title}</span>
                          {event.status === "in-progress" && (
                            <Badge variant="outline" className="text-xs bg-yellow-500/10 text-yellow-500 border-yellow-500/30">
                              In Progress
                            </Badge>
                          )}
                          {event.status === "delayed" && (
                            <Badge variant="outline" className="text-xs bg-red-500/10 text-red-500 border-red-500/30">
                              Delayed
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">{event.description}</div>
                        {event.impact && (
                          <div className="text-xs mt-1 text-primary/80">
                            Impact: {event.impact}
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground whitespace-nowrap">
                        {event.date}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-border/50 p-4 text-center">
          <div className="text-3xl font-bold text-green-500">{stats.totalDevices}</div>
          <div className="text-xs text-muted-foreground mt-1">Total Devices Tracked</div>
        </Card>
        <Card className="border-border/50 p-4 text-center">
          <div className="text-3xl font-bold text-blue-500">{stats.totalU}U</div>
          <div className="text-xs text-muted-foreground mt-1">Total Rack Space</div>
        </Card>
        <Card className="border-border/50 p-4 text-center">
          <div className="text-3xl font-bold text-purple-500">
            {milestoneEvents.filter(e => e.status === "scheduled").length}
          </div>
          <div className="text-xs text-muted-foreground mt-1">Upcoming Milestones</div>
        </Card>
      </div>
    </div>
  )
}
