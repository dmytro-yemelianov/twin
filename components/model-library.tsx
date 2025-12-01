"use client"

import type React from "react"

import { useEffect, useRef, useState } from "react"
import { Button } from "./ui/button"
import { Card } from "./ui/card"
import { Label } from "./ui/label"
import { saveModel, getModelFiles, deleteModel, formatFileSize, type ModelFile } from "@/lib/file-handler"
import { loadDeviceTypes } from "@/lib/data-loader"
import { Upload, Trash2, Cable as Cube, Edit2, Save, X, AlertCircle } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import type { DeviceType } from "@/lib/types"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export function ModelLibrary() {
  const [models, setModels] = useState<ModelFile[]>(() => getModelFiles())
  const [deviceTypes, setDeviceTypes] = useState<DeviceType[]>([])
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editingModel, setEditingModel] = useState<ModelFile | null>(null)
  const [selectedDeviceType, setSelectedDeviceType] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ModelFile | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let isCancelled = false
    const controller = new AbortController()

    loadDeviceTypes(controller.signal)
      .then((types) => {
        if (isCancelled) return
        setDeviceTypes(types)
      })
      .catch((error) => {
        if (isCancelled) return
        console.error("[v0] Failed to load device types:", error)
      })

    return () => {
      isCancelled = true
      controller.abort()
    }
  }, [])

  const handleDeviceTypeSelect = (value: string) => {
    setSelectedDeviceType(value === "unassigned" ? null : value)
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploading(true)
    setError(null)

    try {
      for (const file of Array.from(files)) {
        // Validate file type
        if (!file.name.match(/\.(glb|gltf)$/i)) {
          throw new Error("Only GLB and GLTF files are supported for equipment models")
        }

        // Check file size (limit to 5MB for equipment models)
        if (file.size > 5 * 1024 * 1024) {
          throw new Error("Model file size must be less than 5MB")
        }

        await saveModel(file, selectedDeviceType || undefined)
      }

      setModels(getModelFiles())
      setSelectedDeviceType(null)

      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    } catch (err: any) {
      setError(err.message || "Failed to upload model file")
    } finally {
      setUploading(false)
    }
  }

  const handleDeleteConfirmed = () => {
    if (!deleteTarget) return
    deleteModel(deleteTarget.id)
    setModels(getModelFiles())
    setDeleteTarget(null)
  }

  const handleEdit = (model: ModelFile) => {
    setEditingModel(model)
    setSelectedDeviceType(model.deviceTypeId || null)
  }

  const handleSaveEdit = () => {
    if (!editingModel) return

    const updatedModel = { ...editingModel, deviceTypeId: selectedDeviceType || undefined }
    const allModels = getModelFiles().map((model) => (model.id === editingModel.id ? updatedModel : model))
    localStorage.setItem("dt_models", JSON.stringify(allModels))

    setModels(allModels)
    setEditingModel(null)
    setSelectedDeviceType(null)
  }

  const handleCancelEdit = () => {
    setEditingModel(null)
    setSelectedDeviceType(null)
  }

  const getDeviceTypeName = (typeId?: string) => {
    if (!typeId) return "Unassigned"
    const deviceType = deviceTypes.find((dt) => dt.id === typeId)
    return deviceType?.name || deviceType?.description || typeId
  }

  const getCategoryColor = (typeId?: string) => {
    if (!typeId) return "text-gray-400"
    const deviceType = deviceTypes.find((dt) => dt.id === typeId)
    if (!deviceType) return "text-gray-400"

    const category = deviceType.category
    switch (category) {
      case "GPU_SERVER":
      case "SERVER":
        return "text-blue-400"
      case "STORAGE":
        return "text-amber-400"
      case "NETWORK":
        return "text-green-400"
      case "PDU":
      case "UPS":
        return "text-red-400"
      case "SWITCH":
        return "text-emerald-400"
      default:
        return "text-gray-400"
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Equipment Model Library</h3>
          <p className="text-xs text-muted-foreground">Manage custom 3D models for device types</p>
        </div>
      </div>

      {/* Upload Section */}
      <Card className="p-4 space-y-3">
        <Label className="text-sm">Upload Equipment Model</Label>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1">
            <Select value={selectedDeviceType ?? "unassigned"} onValueChange={handleDeviceTypeSelect}>
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="Select device type (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {deviceTypes.map((dt) => (
                  <SelectItem key={dt.id} value={dt.id}>
                    {(dt.name || dt.description || dt.id) ?? dt.id} ({dt.category})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => fileInputRef.current?.click()} disabled={uploading} size="sm">
            <Upload className="w-4 h-4 mr-2" />
            {uploading ? "Uploading..." : "Upload GLB/GLTF"}
          </Button>
          <input ref={fileInputRef} type="file" accept=".glb,.gltf" onChange={handleFileSelect} className="hidden" />
        </div>
        <p className="text-xs text-muted-foreground">
          Upload custom 3D models to replace procedural equipment geometry
        </p>
      </Card>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-950/20 border border-red-800 rounded text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Models List */}
      <div className="space-y-2">
        <Label className="text-sm">Uploaded Models ({models.length})</Label>

        {models.length === 0 ? (
          <Card className="p-6 text-center">
            <Cube className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm text-muted-foreground">No custom models uploaded</p>
            <p className="text-xs text-muted-foreground mt-1">Using procedural geometry for all equipment</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {models.map((model) => (
              <Card key={model.id} className="p-3">
                {editingModel?.id === model.id ? (
                  // Edit Mode
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Cube className="w-4 h-4 text-orange-400 shrink-0" />
                      <span className="text-sm font-medium">{model.name}</span>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <div className="flex-1">
                        <Select value={selectedDeviceType ?? "unassigned"} onValueChange={handleDeviceTypeSelect}>
                          <SelectTrigger className="text-sm">
                            <SelectValue placeholder="Select device type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unassigned">Unassigned</SelectItem>
                            {deviceTypes.map((dt) => (
                              <SelectItem key={dt.id} value={dt.id}>
                                {(dt.name || dt.description || dt.id) ?? dt.id} ({dt.category})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="default" size="sm" onClick={handleSaveEdit}>
                          <Save className="w-4 h-4 mr-1" />
                          Save
                        </Button>
                        <Button variant="ghost" size="sm" onClick={handleCancelEdit}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  // View Mode
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Cube className={`w-4 h-4 shrink-0 ${getCategoryColor(model.deviceTypeId)}`} />
                        <span className="text-sm font-medium truncate">{model.name}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{getDeviceTypeName(model.deviceTypeId)}</span>
                        <span>{formatFileSize(model.size)}</span>
                        <span>{new Date(model.uploadedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(model)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setDeleteTarget(model)
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>

      <div className="text-xs text-muted-foreground space-y-1 p-3 bg-muted/20 rounded">
        <p className="font-medium">Model Guidelines:</p>
        <ul className="list-disc list-inside space-y-0.5">
          <li>Use GLB format for best performance (GLTF also supported)</li>
          <li>Keep models under 5MB for optimal loading</li>
          <li>Models should be properly scaled (1U = ~44mm height)</li>
          <li>Assign models to device types to use in 3D scene</li>
        </ul>
      </div>

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete equipment model?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes <span className="font-medium">{deleteTarget?.name ?? "this model"}</span> from the library.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={handleDeleteConfirmed}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
