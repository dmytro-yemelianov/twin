"use client"

import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { Sun, Moon, Monitor } from "lucide-react"
import { useEffect, useState } from "react"

interface ThemeToggleProps {
  variant?: "icon" | "full"
  className?: string
}

export function ThemeToggle({ variant = "icon", className }: ThemeToggleProps) {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <Button variant="ghost" size="sm" className={className} disabled>
        <Sun className="w-4 h-4" />
        {variant === "full" && <span className="ml-2">Theme</span>}
      </Button>
    )
  }

  const cycleTheme = () => {
    if (theme === "light") {
      setTheme("dark")
    } else if (theme === "dark") {
      setTheme("system")
    } else {
      setTheme("light")
    }
  }

  const getIcon = () => {
    if (theme === "system") {
      return <Monitor className="w-4 h-4" />
    }
    return resolvedTheme === "dark" ? (
      <Moon className="w-4 h-4" />
    ) : (
      <Sun className="w-4 h-4" />
    )
  }

  const getLabel = () => {
    if (theme === "system") return "System"
    return theme === "dark" ? "Dark" : "Light"
  }

  if (variant === "icon") {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={cycleTheme}
        className={className}
        title={`Theme: ${getLabel()}`}
      >
        {getIcon()}
      </Button>
    )
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={cycleTheme}
      className={`justify-start gap-3 ${className ?? ""}`}
    >
      {getIcon()}
      <span>Theme: {getLabel()}</span>
    </Button>
  )
}

