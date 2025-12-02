"use client"

import { useEffect, useRef, useState } from "react"
import type { Site, SiteStatus } from "@/lib/types"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { X, Building2, Database, Zap, ExternalLink } from "lucide-react"

// Leaflet types
declare global {
  interface Window {
    L: any
  }
}

interface MapViewProps {
  sites: Site[]
  selectedSite: Site | null
  onSiteSelect: (site: Site) => void
  onOpenTwin?: (site: Site) => void
}

const statusLabels: Record<SiteStatus, string> = {
  AI_READY: "AI Ready",
  IN_PROGRESS: "In Progress",
  LEGACY: "Legacy",
}

const statusVariants: Record<SiteStatus, "default" | "secondary" | "outline"> = {
  AI_READY: "default",
  IN_PROGRESS: "secondary",
  LEGACY: "outline",
}

const statusColors: Record<SiteStatus, string> = {
  AI_READY: "#22c55e",
  IN_PROGRESS: "#eab308",
  LEGACY: "#71717a",
}

export function MapView({ sites, selectedSite, onSiteSelect, onOpenTwin }: MapViewProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  const markersRef = useRef<Map<string, any>>(new Map())
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (typeof window === "undefined" || !mapContainerRef.current) return

    // Dynamically load Leaflet
    const loadLeaflet = async () => {
      if (!window.L) {
        // Load Leaflet CSS
        const link = document.createElement("link")
        link.rel = "stylesheet"
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        document.head.appendChild(link)

        // Load Leaflet JS
        const script = document.createElement("script")
        script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
        await new Promise((resolve) => {
          script.onload = resolve
          document.head.appendChild(script)
        })
      }

      // Initialize map
      if (!mapRef.current && mapContainerRef.current) {
        const L = window.L

        mapRef.current = L.map(mapContainerRef.current).setView([39.8283, -98.5795], 4)

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          maxZoom: 19,
        }).addTo(mapRef.current)

        setIsLoading(false)
      }
    }

    loadLeaflet()

    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [])

  // Update markers when sites change
  useEffect(() => {
    if (!mapRef.current || !window.L || isLoading) return

    const L = window.L

    // Clear existing markers
    markersRef.current.forEach((marker) => marker.remove())
    markersRef.current.clear()

    // Add markers for each site
    sites.forEach((site) => {
      const color = statusColors[site.status]
      const isSelected = selectedSite?.id === site.id

      const icon = L.divIcon({
        className: "custom-marker",
        html: `
          <div style="
            width: ${isSelected ? "24px" : "16px"};
            height: ${isSelected ? "24px" : "16px"};
            background-color: ${color};
            border: ${isSelected ? "3px solid white" : "2px solid white"};
            border-radius: 50%;
            box-shadow: 0 2px 6px rgba(0,0,0,0.4);
            transition: all 0.2s;
          "></div>
        `,
        iconSize: [isSelected ? 24 : 16, isSelected ? 24 : 16],
        iconAnchor: [isSelected ? 12 : 8, isSelected ? 12 : 8],
      })

      const marker = L.marker([site.lat, site.lon], { icon })
        .addTo(mapRef.current)
        .bindTooltip(
          `<div style="font-family: system-ui; font-size: 12px;">
            <strong>${site.name}</strong><br/>
            ${site.region}<br/>
            Racks: ${site.rackCount} | AI-Ready: ${site.aiReadyRacks}
          </div>`,
          { offset: [0, -10] },
        )

      marker.on("click", () => {
        onSiteSelect(site)
      })

      markersRef.current.set(site.id, marker)
    })

    if (selectedSite) {
      mapRef.current.setView([selectedSite.lat, selectedSite.lon], 8, { animate: true })
    }
  }, [sites, selectedSite, onSiteSelect, isLoading])

  const capacityPercent = selectedSite && selectedSite.rackCount > 0 
    ? Math.round((selectedSite.aiReadyRacks / selectedSite.rackCount) * 100) 
    : 0

  return (
    <Card className="relative w-full h-full overflow-hidden border-border/50">
      <div ref={mapContainerRef} className="relative w-full h-full z-0" style={{ background: "#09090b" }} />
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
          <div className="text-sm text-muted-foreground">Loading map...</div>
        </div>
      )}

      {/* Selected Site Details Panel */}
      {selectedSite && (
        <div className="absolute top-4 left-4 w-80 bg-card/95 backdrop-blur border border-border/50 rounded-lg shadow-lg z-20 overflow-hidden">
          {/* Header */}
          <div className="flex items-start justify-between p-4 border-b border-border/30">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold truncate">{selectedSite.name}</h3>
                <Badge variant={statusVariants[selectedSite.status]} className="shrink-0 text-[10px]">
                  {statusLabels[selectedSite.status]}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{selectedSite.region}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 shrink-0"
              onClick={() => onSiteSelect(null as any)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Stats */}
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-muted-foreground text-[10px] mb-1">
                  <Database className="w-3 h-3" />
                  <span>Racks</span>
                </div>
                <div className="text-lg font-semibold">{selectedSite.rackCount}</div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-muted-foreground text-[10px] mb-1">
                  <Zap className="w-3 h-3" />
                  <span>AI-Ready</span>
                </div>
                <div className="text-lg font-semibold text-green-500">{selectedSite.aiReadyRacks}</div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-muted-foreground text-[10px] mb-1">
                  <Building2 className="w-3 h-3" />
                  <span>Capacity</span>
                </div>
                <div className="text-lg font-semibold">{capacityPercent}%</div>
              </div>
            </div>

            {/* Capacity Bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>AI-Ready Capacity</span>
                <span>{capacityPercent}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                <div 
                  className="h-full bg-green-500 transition-all" 
                  style={{ width: `${capacityPercent}%` }} 
                />
              </div>
            </div>

            {/* Open Twin Button */}
            {onOpenTwin && (
              <Button 
                onClick={() => onOpenTwin(selectedSite)} 
                className="w-full gap-2" 
                size="sm"
              >
                <ExternalLink className="w-4 h-4" />
                Open Digital Twin
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Map Legend */}
      <div className="absolute bottom-4 right-4 bg-card/95 backdrop-blur border border-border/50 rounded-lg p-3 shadow-lg z-20">
        <div className="text-xs font-medium mb-2">Site Status</div>
        <div className="flex flex-col gap-2 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: statusColors.AI_READY }} />
            <span>AI Ready</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: statusColors.IN_PROGRESS }} />
            <span>In Progress</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: statusColors.LEGACY }} />
            <span>Legacy</span>
          </div>
        </div>
      </div>
    </Card>
  )
}
