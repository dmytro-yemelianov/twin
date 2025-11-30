"use client"

import { Card } from "@/components/ui/card"

interface MaintenanceTask {
  id: string
  name: string
  rack: string
  startWeek: number
  duration: number
  status: "scheduled" | "in-progress" | "completed"
}

const maintenanceTasks: MaintenanceTask[] = [
  { id: "M-001", name: "Firmware Updates", rack: "R-001, R-002", startWeek: 0, duration: 2, status: "completed" },
  { id: "M-002", name: "PDU Replacement", rack: "R-003", startWeek: 2, duration: 1, status: "completed" },
  { id: "M-003", name: "Cable Management", rack: "R-004, R-005", startWeek: 3, duration: 3, status: "in-progress" },
  { id: "M-004", name: "GPU Installation", rack: "R-007-R-010", startWeek: 5, duration: 4, status: "scheduled" },
  { id: "M-005", name: "Network Switch Upgrade", rack: "R-006", startWeek: 7, duration: 2, status: "scheduled" },
  { id: "M-006", name: "Storage Decommission", rack: "R-003", startWeek: 9, duration: 2, status: "scheduled" },
]

const statusColors = {
  scheduled: "bg-blue-500/20 border-blue-500",
  "in-progress": "bg-yellow-500/20 border-yellow-500",
  completed: "bg-green-500/20 border-green-500",
}

export function MaintenanceGantt() {
  const totalWeeks = 12
  const weeks = Array.from({ length: totalWeeks }, (_, i) => i + 1)

  return (
    <Card className="border-border/50 p-4">
      <div className="space-y-4">
        <div>
          <h3 className="font-semibold text-lg">Maintenance Schedule</h3>
          <p className="text-xs text-muted-foreground mt-1">12-week rolling maintenance plan</p>
        </div>

        {/* Legend */}
        <div className="flex gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded border-2 bg-green-500/20 border-green-500" />
            <span>Completed</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded border-2 bg-yellow-500/20 border-yellow-500" />
            <span>In Progress</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded border-2 bg-blue-500/20 border-blue-500" />
            <span>Scheduled</span>
          </div>
        </div>

        {/* Gantt Chart */}
        <div className="overflow-x-auto">
          <div className="min-w-[800px]">
            {/* Header with weeks */}
            <div className="flex mb-2">
              <div className="w-48 shrink-0" />
              <div className="flex-1 flex">
                {weeks.map((week) => (
                  <div key={week} className="flex-1 text-center text-xs text-muted-foreground">
                    W{week}
                  </div>
                ))}
              </div>
            </div>

            {/* Tasks */}
            {maintenanceTasks.map((task) => (
              <div key={task.id} className="flex items-center mb-3">
                <div className="w-48 shrink-0 pr-4">
                  <div className="text-sm font-medium">{task.name}</div>
                  <div className="text-xs text-muted-foreground">{task.rack}</div>
                </div>
                <div className="flex-1 relative h-8">
                  <div
                    className={`absolute top-1 rounded border-2 ${statusColors[task.status]} h-6 flex items-center justify-center text-xs font-medium transition-all hover:scale-105`}
                    style={{
                      left: `${(task.startWeek / totalWeeks) * 100}%`,
                      width: `${(task.duration / totalWeeks) * 100}%`,
                    }}
                  >
                    {task.id}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  )
}
