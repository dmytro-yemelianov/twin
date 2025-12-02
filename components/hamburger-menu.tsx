"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from "@/components/ui/sheet"
import { Separator } from "@/components/ui/separator"
import { Menu, Map, FileText, Package, Building2 } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"

type ViewTarget = "twin" | "map" | "documents" | "models"

interface HamburgerMenuProps {
  onNavigate: (view: ViewTarget) => void
  currentView: ViewTarget | string
}

export function HamburgerMenu({ onNavigate, currentView }: HamburgerMenuProps) {
  const [open, setOpen] = useState(false)

  const menuItems: { id: ViewTarget; label: string; icon: typeof Menu }[] = [
    { id: "twin", label: "3D Twin", icon: Building2 },
    { id: "map", label: "Map View", icon: Map },
    { id: "documents", label: "Documents", icon: FileText },
    { id: "models", label: "Equipment Models", icon: Package },
  ]

  const handleItemClick = (id: ViewTarget) => {
    onNavigate(id)
    setOpen(false)
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 bg-transparent">
          <Menu className="w-4 h-4" />
          <span className="hidden sm:inline">Menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-full sm:w-96">
        <SheetHeader>
          <SheetTitle>Navigation</SheetTitle>
          <SheetDescription>Navigate between different views</SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = currentView === item.id
            return (
              <Button
                key={item.id}
                variant={isActive ? "default" : "ghost"}
                className="w-full justify-start gap-3"
                onClick={() => handleItemClick(item.id)}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Button>
            )
          })}
        </div>
        <Separator className="my-4" />
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground px-2 mb-2">Appearance</p>
          <ThemeToggle variant="full" className="w-full" />
        </div>
      </SheetContent>
    </Sheet>
  )
}
