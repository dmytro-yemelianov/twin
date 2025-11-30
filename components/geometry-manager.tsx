"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "./ui/button"
import { Card } from "./ui/card"
import { saveGeometry, getGeometryFiles, deleteGeometry, formatFileSize, type GeometryFile } from "@/lib/file-handler"
import { Upload, Trash2, Box, CheckCircle2, AlertCircle } from "lucide-react"

interface GeometryManagerProps {
  siteId: string
  onGeometrySelect?: (geometry: GeometryFile | null) => void
  selectedGeometryId?: string | null
}

export function GeometryManager({ siteId, onGeometrySelect, selectedGeometryId }: GeometryManagerProps) {
  const [geometries, setGeometries] = useState<GeometryFile[]>(() =>
    getGeometryFiles().filter((g) => !g.metadata?.siteId || g.metadata.siteId === siteId),
  )
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploading(true)
    setError(null)

    try {
      for (const file of Array.from(files)) {
        // Validate file type
        if (!file.name.match(/\.(glb|gltf|obj)$/i)) {
          throw new Error("Only GLB, GLTF, and OBJ files are supported")
        }

        // Check file size (limit to 10MB for demo)
        if (file.size > 10 * 1024 * 1024) {
          throw new Error("File size must be less than 10MB")
        }

        await saveGeometry(file, siteId)
      }

      const updated = getGeometryFiles().filter((g) => !g.metadata?.siteId || g.metadata.siteId === siteId)
      setGeometries(updated)

      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    } catch (err: any) {
      setError(err.message || "Failed to upload geometry file")
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this geometry file? This will reset to procedural building.")) {
      deleteGeometry(id)
      const updated = getGeometryFiles().filter((g) => !g.metadata?.siteId || g.metadata.siteId === siteId)
      setGeometries(updated)

      if (selectedGeometryId === id) {
        onGeometrySelect?.(null)
      }
    }
  }

  const handleSelect = (geometry: GeometryFile) => {
    onGeometrySelect?.(geometry)
  }

  const handleClearSelection = () => {
    onGeometrySelect?.(null)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold">Building Geometry</h4>
          <p className="text-xs text-muted-foreground">Upload GLB/GLTF/OBJ files</p>
        </div>
        <Button onClick={() => fileInputRef.current?.click()} disabled={uploading} size="sm">
          <Upload className="w-4 h-4 mr-2" />
          {uploading ? "Uploading..." : "Upload"}
        </Button>
        <input ref={fileInputRef} type="file" accept=".glb,.gltf,.obj" onChange={handleFileSelect} className="hidden" />
      </div>

      {error && (
        <div className="flex items-center gap-2 p-2 bg-red-950/20 border border-red-800 rounded text-red-400 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {geometries.length === 0 ? (
        <Card className="p-6 text-center">
          <Box className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm text-muted-foreground">No custom geometry uploaded</p>
          <p className="text-xs text-muted-foreground mt-1">Using procedural building shell</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {geometries.map((geo) => (
            <Card
              key={geo.id}
              className={`p-3 cursor-pointer transition-colors ${
                selectedGeometryId === geo.id ? "bg-accent border-accent-foreground/20" : "hover:bg-accent/50"
              }`}
              onClick={() => handleSelect(geo)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Box className="w-4 h-4 text-purple-400 shrink-0" />
                    <span className="text-sm font-medium truncate">{geo.name}</span>
                    {selectedGeometryId === geo.id && <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="uppercase">{geo.format}</span>
                    <span>{formatFileSize(geo.size)}</span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDelete(geo.id)
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          ))}

          {selectedGeometryId && (
            <Button variant="outline" size="sm" className="w-full bg-transparent" onClick={handleClearSelection}>
              Use Procedural Building
            </Button>
          )}
        </div>
      )}

      <div className="text-xs text-muted-foreground space-y-1 p-3 bg-muted/20 rounded">
        <p className="font-medium">Supported Formats:</p>
        <ul className="list-disc list-inside space-y-0.5">
          <li>GLB/GLTF - Preferred format (best compatibility)</li>
          <li>OBJ - Basic support</li>
          <li>IFC/Revit - Coming soon (convert to GLB first)</li>
        </ul>
      </div>
    </div>
  )
}
