import type { Phase, Status4D } from "@/lib/types"

// Status icons and tooltips configuration
export const STATUS_CONFIG: Record<Status4D, { tooltip: string }> = {
  EXISTING_RETAINED: { tooltip: "Equipment that exists today and will remain in place" },
  EXISTING_REMOVED: { tooltip: "Equipment scheduled for decommissioning or removal" },
  PROPOSED: { tooltip: "New equipment proposed for installation" },
  FUTURE: { tooltip: "Equipment planned for future phases" },
  MODIFIED: { tooltip: "Equipment being relocated or upgraded" },
}

// Phase configuration
export const PHASE_CONFIG: Record<Phase, { label: string; tooltip: string }> = {
  AS_IS: { label: "As-Is", tooltip: "Current state - shows existing equipment" },
  TO_BE: { label: "To-Be", tooltip: "Target state - shows planned changes" },
  FUTURE: { label: "Future", tooltip: "Long-term vision - includes future expansion" },
}
