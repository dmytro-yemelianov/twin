"use client"
import { useState, useMemo } from "react"
import type { Site } from "@/lib/types"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Eye, Search, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"

interface SitesDatatableProps {
  sites: Site[]
  selectedSite: Site | null
  onSiteSelect: (site: Site) => void
  onViewTwin: (site: Site) => void
}

const statusColors = {
  AI_READY: "bg-green-500/10 text-green-500 border-green-500/20",
  IN_PROGRESS: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  LEGACY: "bg-gray-500/10 text-gray-500 border-gray-500/20",
}

const statusLabels = {
  AI_READY: "AI Ready",
  IN_PROGRESS: "In Progress",
  LEGACY: "Legacy",
}

type SortField = "id" | "name" | "region" | "status" | "rackCount" | "aiReadyRacks"
type SortDirection = "asc" | "desc" | null

export function SitesDatatable({ sites, selectedSite, onSiteSelect, onViewTwin }: SitesDatatableProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [regionGroup, setRegionGroup] = useState<string>("all")
  const [sortField, setSortField] = useState<SortField | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>(null)

  const processedSites = useMemo(() => {
    let filtered = sites

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (site) =>
          site.id.toLowerCase().includes(query) ||
          site.name.toLowerCase().includes(query) ||
          site.region.toLowerCase().includes(query),
      )
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((site) => site.status === statusFilter)
    }

    // Region filter
    if (regionGroup !== "all") {
      filtered = filtered.filter((site) => site.region === regionGroup)
    }

    // Sorting
    if (sortField && sortDirection) {
      filtered = [...filtered].sort((a, b) => {
        let aVal = a[sortField]
        let bVal = b[sortField]

        // Handle string comparison
        if (typeof aVal === "string" && typeof bVal === "string") {
          aVal = aVal.toLowerCase()
          bVal = bVal.toLowerCase()
        }

        if (aVal < bVal) return sortDirection === "asc" ? -1 : 1
        if (aVal > bVal) return sortDirection === "asc" ? 1 : -1
        return 0
      })
    }

    return filtered
  }, [sites, searchQuery, statusFilter, regionGroup, sortField, sortDirection])

  const uniqueRegions = useMemo(() => {
    return Array.from(new Set(sites.map((site) => site.region))).sort()
  }, [sites])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Cycle through: asc -> desc -> null
      if (sortDirection === "asc") {
        setSortDirection("desc")
      } else if (sortDirection === "desc") {
        setSortDirection(null)
        setSortField(null)
      }
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 ml-1 opacity-30" />
    if (sortDirection === "asc") return <ArrowUp className="w-3 h-3 ml-1" />
    if (sortDirection === "desc") return <ArrowDown className="w-3 h-3 ml-1" />
    return null
  }

  return (
    <Card className="border-border/50 h-full flex flex-col">
      <div className="p-3 md:p-4 border-b border-border/50 space-y-3 shrink-0">
        <div>
          <h3 className="font-semibold text-base md:text-lg">Data Center Sites</h3>
          <p className="text-xs text-muted-foreground mt-1">
            {processedSites.length} of {sites.length} sites
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search sites..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 text-sm"
            />
          </div>
          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[120px] text-sm">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="AI_READY">AI Ready</SelectItem>
                <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                <SelectItem value="LEGACY">Legacy</SelectItem>
              </SelectContent>
            </Select>
            <Select value={regionGroup} onValueChange={setRegionGroup}>
              <SelectTrigger className="w-full sm:w-[120px] text-sm">
                <SelectValue placeholder="Region" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Regions</SelectItem>
                {uniqueRegions.map((region) => (
                  <SelectItem key={region} value={region}>
                    {region}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="cursor-pointer text-xs md:text-sm" onClick={() => handleSort("id")}>
                <div className="flex items-center whitespace-nowrap">
                  Site ID
                  <SortIcon field="id" />
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer text-xs md:text-sm hidden sm:table-cell"
                onClick={() => handleSort("name")}
              >
                <div className="flex items-center">
                  Name
                  <SortIcon field="name" />
                </div>
              </TableHead>
              <TableHead className="cursor-pointer text-xs md:text-sm" onClick={() => handleSort("region")}>
                <div className="flex items-center">
                  Region
                  <SortIcon field="region" />
                </div>
              </TableHead>
              <TableHead className="cursor-pointer text-xs md:text-sm" onClick={() => handleSort("status")}>
                <div className="flex items-center">
                  Status
                  <SortIcon field="status" />
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer text-right text-xs md:text-sm hidden md:table-cell"
                onClick={() => handleSort("rackCount")}
              >
                <div className="flex items-center justify-end">
                  Racks
                  <SortIcon field="rackCount" />
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer text-right text-xs md:text-sm hidden lg:table-cell"
                onClick={() => handleSort("aiReadyRacks")}
              >
                <div className="flex items-center justify-end">
                  AI-Ready
                  <SortIcon field="aiReadyRacks" />
                </div>
              </TableHead>
              <TableHead className="text-xs md:text-sm">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {processedSites.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8 text-sm">
                  No sites found
                </TableCell>
              </TableRow>
            ) : (
              processedSites.map((site) => (
                <TableRow
                  key={site.id}
                  className={`cursor-pointer transition-colors ${
                    selectedSite?.id === site.id ? "bg-accent/50" : "hover:bg-accent/20"
                  }`}
                  onClick={() => onSiteSelect(site)}
                >
                  <TableCell className="font-mono text-xs md:text-sm">{site.id}</TableCell>
                  <TableCell className="font-medium text-xs md:text-sm hidden sm:table-cell">{site.name}</TableCell>
                  <TableCell className="text-xs md:text-sm">{site.region}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`${statusColors[site.status]} text-xs`}>
                      {statusLabels[site.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-xs md:text-sm hidden md:table-cell">{site.rackCount}</TableCell>
                  <TableCell className="text-right text-xs md:text-sm hidden lg:table-cell">
                    {site.aiReadyRacks}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation()
                        onViewTwin(site)
                      }}
                      className="h-8 w-8 p-0"
                    >
                      <Eye className="w-3 h-3 md:w-4 md:h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </Card>
  )
}
