"use client"

import { useEffect, useState } from "react"
import { MapView } from "@/components/map-view"
import { SitePanel } from "@/components/site-panel"
import { TwinViewer } from "@/components/twin-viewer"
import { HamburgerMenu } from "@/components/hamburger-menu"
import { SitesDatatable } from "@/components/sites-datatable"
import { DocumentManager } from "@/components/document-manager"
import { ModelLibrary } from "@/components/model-library"
import { loadSites } from "@/lib/data-loader"
import type { Site } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Building2 } from "lucide-react"

export default function Home() {
  const [sites, setSites] = useState<Site[]>([])
  const [selectedSite, setSelectedSite] = useState<Site | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [currentView, setCurrentView] = useState<"map" | "documents" | "models" | "twin">("twin")
  const [showSitesDrawer, setShowSitesDrawer] = useState(false)
  const [showDetailsDrawer, setShowDetailsDrawer] = useState(false)

  useEffect(() => {
    loadSites()
      .then((data) => {
        setSites(data)
        if (data.length > 0) {
          setSelectedSite(data[0])
        }
        setIsLoading(false)
      })
      .catch((error) => {
        console.error("[v0] Failed to load sites:", error)
        setIsLoading(false)
      })
  }, [])

  const handleViewTwin = (site: Site) => {
    setSelectedSite(site)
    setCurrentView("twin")
    setShowSitesDrawer(false)
  }

  const handleSiteSelect = (site: Site) => {
    setSelectedSite(site)
    setShowDetailsDrawer(true)
  }

  const handleNavigate = (view: "map" | "documents" | "models") => {
    setCurrentView(view)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center space-y-4">
          <div className="text-lg font-medium">Loading Digital Twin...</div>
          <div className="text-sm text-muted-foreground">Initializing data centers</div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      <header className="border-b border-border/50 bg-card/50 backdrop-blur shrink-0 z-10">
        <div className="flex items-center justify-between gap-3 px-3 md:px-6 py-3">
          <div className="flex items-center gap-2 md:gap-3">
            <HamburgerMenu onNavigate={handleNavigate} currentView={currentView} />

            {/* Site Selector Drawer Trigger */}
            <Sheet open={showSitesDrawer} onOpenChange={setShowSitesDrawer}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                  <Building2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Sites</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-full sm:w-[600px] overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>Data Center Sites</SheetTitle>
                </SheetHeader>
                <div className="mt-6">
                  <SitesDatatable
                    sites={sites}
                    selectedSite={selectedSite}
                    onSiteSelect={setSelectedSite}
                    onViewTwin={handleViewTwin}
                  />
                </div>
              </SheetContent>
            </Sheet>

            {/* Site Details Drawer (only show when site selected) */}
            {selectedSite && (
              <Sheet open={showDetailsDrawer} onOpenChange={setShowDetailsDrawer}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2 hidden md:flex bg-transparent">
                    <span className="text-sm truncate max-w-[200px]">{selectedSite.name}</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-full sm:w-96">
                  <SheetHeader>
                    <SheetTitle>Site Details</SheetTitle>
                  </SheetHeader>
                  <div className="mt-6">
                    <SitePanel
                      site={selectedSite}
                      onOpenTwin={() => {
                        setCurrentView("twin")
                        setShowDetailsDrawer(false)
                      }}
                    />
                  </div>
                </SheetContent>
              </Sheet>
            )}
          </div>

          <div className="flex-1 min-w-0 text-right">
            <h1 className="text-sm md:text-base font-semibold truncate">
              {selectedSite ? `${selectedSite.name} Digital Twin` : "Data Center Digital Twin"}
            </h1>
            {selectedSite && <p className="text-xs text-muted-foreground truncate">{selectedSite.region}</p>}
          </div>
        </div>
      </header>

      <div className="flex-1 min-h-0 overflow-hidden">
        {currentView === "twin" && selectedSite ? (
          <TwinViewer site={selectedSite} />
        ) : currentView === "map" ? (
          <div className="h-full w-full p-4">
            <div className="h-full w-full">
              <MapView sites={sites} selectedSite={selectedSite} onSiteSelect={handleSiteSelect} />
            </div>
          </div>
        ) : currentView === "documents" ? (
          <div className="h-full p-4 overflow-auto">
            <DocumentManager siteId={selectedSite?.id} />
          </div>
        ) : currentView === "models" ? (
          <div className="h-full p-4 overflow-auto">
            <ModelLibrary />
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-4">
              <Building2 className="w-16 h-16 mx-auto text-muted-foreground" />
              <p className="text-lg font-medium">Select a site to view the digital twin</p>
              <Button onClick={() => setShowSitesDrawer(true)}>
                <Building2 className="w-4 h-4 mr-2" />
                View Sites
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
