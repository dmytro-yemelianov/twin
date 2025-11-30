"use client"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { Phase } from "@/lib/types"
import { CheckCircle2, Circle, PlayCircle } from "lucide-react"

interface PhaseDemoPanelProps {
  currentPhase: Phase
  onPhaseChange: (phase: Phase) => void
}

const phaseInfo = {
  AS_IS: {
    label: "Phase 1: As-Is (Today)",
    description: "Current state with no planned work. Shows existing retained and items marked for removal.",
    color: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    scenario: "No Network Request yet - baseline inventory",
  },
  TO_BE: {
    label: "Phase 2: To-Be (Design)",
    description: "Future design state. Shows retained equipment, proposed additions, and modifications.",
    color: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    scenario: "Network Request received: 2 removals, 3 additions planned",
  },
  FUTURE: {
    label: "Phase 3: As-Is (Future)",
    description: "State after works completed. Shows all retained, proposed, future, and modified equipment.",
    color: "bg-green-500/10 text-green-500 border-green-500/20",
    scenario: "Works completed - Digital Twin updated to new baseline",
  },
}

const phases: Phase[] = ["AS_IS", "TO_BE", "FUTURE"]

export function PhaseDemoPanel({ currentPhase, onPhaseChange }: PhaseDemoPanelProps) {
  const currentInfo = phaseInfo[currentPhase]
  const currentIndex = phases.indexOf(currentPhase)

  return (
    <Card className="border-border/50 p-4 space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg">Demo Scenario</h3>
          <Badge variant="outline" className={currentInfo.color}>
            {currentInfo.label}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">{currentInfo.description}</p>
        <div className="text-xs text-amber-400 bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20">
          Scenario: {currentInfo.scenario}
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-xs font-medium text-muted-foreground mb-2">Navigate Demo Phases:</div>
        <div className="flex gap-2">
          {phases.map((phase, index) => {
            const info = phaseInfo[phase]
            const isActive = phase === currentPhase
            const isPast = index < currentIndex
            return (
              <Button
                key={phase}
                variant={isActive ? "default" : "outline"}
                size="sm"
                className="flex-1"
                onClick={() => onPhaseChange(phase)}
              >
                {isPast ? (
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                ) : isActive ? (
                  <PlayCircle className="w-3 h-3 mr-1" />
                ) : (
                  <Circle className="w-3 h-3 mr-1" />
                )}
                <span className="text-xs">{info.label.split(":")[0]}</span>
              </Button>
            )
          })}
        </div>
      </div>

      <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
        <strong>Demo Workflow:</strong> Toggle through phases to see equipment lifecycle. Use 4D Status checkboxes to
        show/hide specific layers (Existing, Proposed, Future, etc.)
      </div>
    </Card>
  )
}
