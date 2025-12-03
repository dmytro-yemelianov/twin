"use client"

import { useEffect } from "react"
import dynamic from "next/dynamic"
import { useAppStore } from "@/lib/stores/app-store"
import { useSites } from "@/lib/hooks/use-data"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from "@/components/ui/sheet"
import { Building2, AlertCircle } from "lucide-react"
import { HamburgerMenu } from "@/components/hamburger-menu"
import { SitePanel } from "@/components/site-panel"
import { SitesDatatable } from "@/components/sites-datatable"
import { MapSkeleton, SceneSkeleton } from "@/components/loading-states"
import { Alert, AlertDescription } from "@/components/ui/alert"

// Lazy load heavy components
const MapView = dynamic(() => import("@/components/map-view").then(mod => ({ default: mod.MapView })), {
  loading: () => <MapSkeleton />,
  ssr: false
})

const TwinViewer = dynamic(() => import("@/components/twin-viewer/twin-viewer").then(mod => ({ default: mod.TwinViewer })), {
  loading: () => <SceneSkeleton />,
  ssr: false
})

const DocumentManager = dynamic(() => import("@/components/document-manager").then(mod => ({ default: mod.DocumentManager })), {
  ssr: false
})

const ModelLibrary = dynamic(() => import("@/components/model-library").then(mod => ({ default: mod.ModelLibrary })), {
  ssr: false
})

export default function PageClient() {
  // Zustand store
  const {
    selectedSite,
    selectSite,
    currentView,
    setCurrentView,
    showSitesDrawer,
    setShowSitesDrawer,
    showDetailsDrawer,
    setShowDetailsDrawer,
    setSites,
    setIsLoading
  } = useAppStore()

  // React Query for data fetching
  const { data: sites = [], isLoading, error } = useSites()

  // Update store when sites are loaded (don't auto-select any site)
  useEffect(() => {
    if (sites.length > 0) {
      setSites(sites)
    }
    setIsLoading(isLoading)
  }, [sites, setSites, setIsLoading, isLoading])

  const handleViewTwin = (site: typeof sites[0]) => {
    selectSite(site)
    setCurrentView("twin")
    setShowSitesDrawer(false)
  }

  const handleSiteSelect = (site: typeof sites[0] | null) => {
    selectSite(site)
    // Don't show details drawer or switch views - just highlight on map
  }

  const handleNavigate = (view: typeof currentView) => {
    if (view === "twin") {
      if (!selectedSite) {
        setShowSitesDrawer(true)
      }
      setShowDetailsDrawer(Boolean(selectedSite))
    }
    setCurrentView(view)
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background p-4">
        <Alert className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load site data. Please refresh the page to try again.
          </AlertDescription>
        </Alert>
      </div>
    )
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

            {/* Site Selector Drawer Trigger - only show when not on map view */}
            {currentView !== "map" && (
              <Sheet open={showSitesDrawer} onOpenChange={setShowSitesDrawer}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                    <Building2 className="w-4 h-4" />
                    <span className="hidden sm:inline">Sites</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-full sm:w-[500px] flex flex-col">
                  <SheetHeader className="shrink-0">
                    <SheetTitle>Data Center Sites</SheetTitle>
                    <SheetDescription>Browse and select data center sites by region</SheetDescription>
                  </SheetHeader>
                  <div className="mt-4 flex-1 min-h-0 flex flex-col">
                    <SitesDatatable
                      sites={sites}
                      selectedSite={selectedSite}
                      onSiteSelect={(site) => {
                        selectSite(site)
                        setShowSitesDrawer(false)
                      }}
                      onViewTwin={handleViewTwin}
                    />
                  </div>
                </SheetContent>
              </Sheet>
            )}

            {/* Site Details Drawer (only show when site selected and not on map view) */}
            {selectedSite && currentView !== "map" && (
              <Sheet open={showDetailsDrawer} onOpenChange={setShowDetailsDrawer}>
                <SheetTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 bg-transparent max-w-[200px]"
                    onClick={() => setShowDetailsDrawer(true)}
                  >
                    <span className="text-sm truncate max-w-[200px]">{selectedSite.name}</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-full sm:w-96">
                  <SheetHeader>
                    <SheetTitle>Site Details</SheetTitle>
                    <SheetDescription>View site information and statistics</SheetDescription>
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
          <TwinViewer site={selectedSite} sites={sites} onSiteChange={selectSite} />
        ) : currentView === "map" ? (
          <div className="h-full w-full flex">
            {/* Persistent Sites Panel - Left Side */}
            <div className="w-80 shrink-0 border-r border-border/50 h-full overflow-hidden flex flex-col bg-card/30">
              <SitesDatatable
                sites={sites}
                selectedSite={selectedSite}
                onSiteSelect={handleSiteSelect}
                onViewTwin={handleViewTwin}
              />
            </div>
            {/* Map Area */}
            <div className="flex-1 h-full p-4">
              <MapView
                sites={sites}
                selectedSite={selectedSite}
                onSiteSelect={handleSiteSelect}
                onOpenTwin={handleViewTwin}
              />
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
              <Button onClick={() => setCurrentView("map")}>
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