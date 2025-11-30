"use client"

import { useEffect, useRef, useState } from "react"
import type { Site, SiteStatus } from "@/lib/types"
import { Card } from "@/components/ui/card"

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
}

const statusColors: Record<SiteStatus, string> = {
  AI_READY: "#22c55e",
  IN_PROGRESS: "#eab308",
  LEGACY: "#71717a",
}

export function MapView({ sites, selectedSite, onSiteSelect }: MapViewProps) {
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

  return (
    <Card className="relative w-full h-full overflow-hidden border-border/50">
      <div ref={mapContainerRef} className="relative w-full h-full z-0" style={{ background: "#09090b" }} />
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
          <div className="text-sm text-muted-foreground">Loading map...</div>
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
