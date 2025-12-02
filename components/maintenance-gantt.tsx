"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar, Clock, User, AlertTriangle, CheckCircle, Settings } from "lucide-react"

interface MaintenanceTask {
  id: string
  name: string
  rack: string
  startWeek: number
  duration: number
  status: "scheduled" | "in-progress" | "completed"
  description: string
  assignedTo: string
  priority: "low" | "medium" | "high" | "critical"
  dependencies: string[]
  resources: string[]
  estimatedCost: number
  riskLevel: "low" | "medium" | "high"
}

const maintenanceTasks: MaintenanceTask[] = [
  { 
    id: "M-001", 
    name: "Firmware Updates", 
    rack: "R-001, R-002", 
    startWeek: 0, 
    duration: 2, 
    status: "completed",
    description: "Update BIOS and BMC firmware across all servers in affected racks",
    assignedTo: "Sarah Johnson",
    priority: "medium",
    dependencies: [],
    resources: ["Firmware packages", "Maintenance window"],
    estimatedCost: 2500,
    riskLevel: "low"
  },
  { 
    id: "M-002", 
    name: "PDU Replacement", 
    rack: "R-003", 
    startWeek: 2, 
    duration: 1, 
    status: "completed",
    description: "Replace aging PDUs with new intelligent monitoring units",
    assignedTo: "Mike Chen",
    priority: "high",
    dependencies: ["M-001"],
    resources: ["New PDUs", "Electrical team"],
    estimatedCost: 8000,
    riskLevel: "medium"
  },
  { 
    id: "M-003", 
    name: "Cable Management", 
    rack: "R-004, R-005", 
    startWeek: 3, 
    duration: 3, 
    status: "in-progress",
    description: "Reorganize and label network cables for better airflow and maintenance access",
    assignedTo: "Alex Rivera",
    priority: "low",
    dependencies: ["M-002"],
    resources: ["Cable ties", "Labels", "Cable management tools"],
    estimatedCost: 1200,
    riskLevel: "low"
  },
  { 
    id: "M-004", 
    name: "GPU Installation", 
    rack: "R-007-R-010", 
    startWeek: 5, 
    duration: 4, 
    status: "scheduled",
    description: "Install 64x NVIDIA H100 GPUs for new AI compute cluster",
    assignedTo: "David Kim",
    priority: "critical",
    dependencies: ["M-003"],
    resources: ["H100 GPUs", "Cooling upgrades", "Power infrastructure"],
    estimatedCost: 850000,
    riskLevel: "high"
  },
  { 
    id: "M-005", 
    name: "Network Switch Upgrade", 
    rack: "R-006", 
    startWeek: 7, 
    duration: 2, 
    status: "scheduled",
    description: "Upgrade to 400G switches for AI workload bandwidth requirements",
    assignedTo: "Lisa Zhang",
    priority: "high",
    dependencies: ["M-004"],
    resources: ["400G switches", "Fiber cables", "Network team"],
    estimatedCost: 45000,
    riskLevel: "medium"
  },
  { 
    id: "M-006", 
    name: "Storage Decommission", 
    rack: "R-003", 
    startWeek: 9, 
    duration: 2, 
    status: "scheduled",
    description: "Safely decommission legacy storage arrays and migrate data",
    assignedTo: "Tom Wilson",
    priority: "medium",
    dependencies: ["M-005"],
    resources: ["Data migration tools", "Backup storage"],
    estimatedCost: 3500,
    riskLevel: "medium"
  },
]

const statusColors = {
  scheduled: "bg-blue-500/20 border-blue-500",
  "in-progress": "bg-yellow-500/20 border-yellow-500",
  completed: "bg-green-500/20 border-green-500",
}

export function MaintenanceGantt() {
  const totalWeeks = 12
  const weeks = Array.from({ length: totalWeeks }, (_, i) => i + 1)
  const [selectedTask, setSelectedTask] = useState<MaintenanceTask | null>(null)

  const handleTaskClick = (task: MaintenanceTask) => {
    setSelectedTask(task)
  }

  const priorityColors = {
    low: "border-blue-500",
    medium: "border-yellow-500",
    high: "border-orange-500",
    critical: "border-red-500",
  }

  const riskColors = {
    low: "text-green-600",
    medium: "text-yellow-600",
    high: "text-red-600",
  }

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
                    className={`absolute top-1 rounded border-2 cursor-pointer ${statusColors[task.status]} ${priorityColors[task.priority]} h-6 flex items-center justify-center text-xs font-medium transition-all hover:scale-105 hover:shadow-lg`}
                    style={{
                      left: `${(task.startWeek / totalWeeks) * 100}%`,
                      width: `${(task.duration / totalWeeks) * 100}%`,
                    }}
                    onClick={() => handleTaskClick(task)}
                  >
                    {task.id}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Task Details Dialog */}
      {selectedTask && (
        <Dialog open={!!selectedTask} onOpenChange={() => setSelectedTask(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                {selectedTask.name} ({selectedTask.id})
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Status and Priority */}
              <div className="flex items-center gap-4">
                <Badge variant="outline" className={statusColors[selectedTask.status]}>
                  {selectedTask.status === "completed" && <CheckCircle className="w-3 h-3 mr-1" />}
                  {selectedTask.status === "in-progress" && <Clock className="w-3 h-3 mr-1" />}
                  {selectedTask.status === "scheduled" && <Calendar className="w-3 h-3 mr-1" />}
                  {selectedTask.status.replace('-', ' ').toUpperCase()}
                </Badge>
                <Badge variant="outline" className={priorityColors[selectedTask.priority]}>
                  {selectedTask.priority === "critical" && <AlertTriangle className="w-3 h-3 mr-1" />}
                  {selectedTask.priority.toUpperCase()} PRIORITY
                </Badge>
                <Badge variant="outline" className={riskColors[selectedTask.riskLevel]}>
                  {selectedTask.riskLevel.toUpperCase()} RISK
                </Badge>
              </div>

              {/* Description */}
              <div>
                <h4 className="font-semibold mb-2">Description</h4>
                <p className="text-sm text-muted-foreground">{selectedTask.description}</p>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-1 flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Assigned To
                    </h4>
                    <p className="text-sm">{selectedTask.assignedTo}</p>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold mb-1 flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Timeline
                    </h4>
                    <p className="text-sm">Week {selectedTask.startWeek + 1} - {selectedTask.startWeek + selectedTask.duration}</p>
                    <p className="text-xs text-muted-foreground">{selectedTask.duration} week{selectedTask.duration > 1 ? 's' : ''} duration</p>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-1">Affected Racks</h4>
                    <p className="text-sm">{selectedTask.rack}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-1">Estimated Cost</h4>
                    <p className="text-sm font-mono">${selectedTask.estimatedCost.toLocaleString()}</p>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-1">Dependencies</h4>
                    {selectedTask.dependencies.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {selectedTask.dependencies.map((dep) => (
                          <Badge key={dep} variant="secondary" className="text-xs">{dep}</Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">None</p>
                    )}
                  </div>

                  <div>
                    <h4 className="font-semibold mb-1">Required Resources</h4>
                    <ul className="text-sm list-disc list-inside space-y-1">
                      {selectedTask.resources.map((resource, idx) => (
                        <li key={idx}>{resource}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t">
                <Button variant="outline" onClick={() => setSelectedTask(null)}>
                  Close
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Card>
  )
}
