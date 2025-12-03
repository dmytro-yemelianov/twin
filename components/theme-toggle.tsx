"use client"

import { Moon, Sun, Monitor } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface ThemeToggleProps {
  variant?: "icon" | "full" | "buttons"
  className?: string
}

export function ThemeToggle({ variant = "buttons", className }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme()

  if (variant === "buttons") {
    return (
      <div className={cn("flex items-center gap-1 bg-background/50 rounded-lg p-1 border border-border/30", className)}>
        <Button
          variant={theme === "light" ? "default" : "ghost"}
          size="sm"
          onClick={() => setTheme("light")}
          className="h-7 px-3"
        >
          <Sun className="h-3.5 w-3.5 mr-1.5" />
          <span className="text-xs">Light</span>
        </Button>
        <Button
          variant={theme === "system" ? "default" : "ghost"}
          size="sm"
          onClick={() => setTheme("system")}
          className="h-7 px-3"
        >
          <Monitor className="h-3.5 w-3.5 mr-1.5" />
          <span className="text-xs">System</span>
        </Button>
        <Button
          variant={theme === "dark" ? "default" : "ghost"}
          size="sm"
          onClick={() => setTheme("dark")}
          className="h-7 px-3"
        >
          <Moon className="h-3.5 w-3.5 mr-1.5" />
          <span className="text-xs">Dark</span>
        </Button>
      </div>
    )
  }

  // Legacy variants for backwards compatibility
  return (
    <Button
      variant="ghost"
      size={variant === "icon" ? "icon" : "default"}
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className={className}
    >
      <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}
