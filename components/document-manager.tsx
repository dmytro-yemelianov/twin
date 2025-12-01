"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "./ui/button"
import { Card } from "./ui/card"
import {
  saveDocument,
  getDocuments,
  deleteDocument,
  formatFileSize,
  getStorageInfo,
  type UploadedFile,
} from "@/lib/file-handler"
import { FileText, Upload, Trash2, Eye, Download, AlertCircle } from "lucide-react"
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

interface DocumentManagerProps {
  siteId?: string
  rackId?: string
}

export function DocumentManager({ siteId, rackId }: DocumentManagerProps) {
  const [documents, setDocuments] = useState<UploadedFile[]>(() => getDocuments())
  const [selectedDoc, setSelectedDoc] = useState<UploadedFile | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<UploadedFile | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const storageInfo = getStorageInfo()
  const filteredDocs = documents.filter((doc) => {
    if (siteId && doc.metadata?.siteId !== siteId) return false
    if (rackId && doc.metadata?.rackId !== rackId) return false
    return true
  })

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploading(true)
    setError(null)

    try {
      for (const file of Array.from(files)) {
        // Determine category based on file type
        let category: UploadedFile["category"] = "other"
        if (file.type.includes("image") || file.name.match(/\.(png|jpg|jpeg|pdf|dwg)$/i)) {
          category = "drawing"
        } else if (file.type.includes("sheet") || file.name.match(/\.(xlsx|xls|csv)$/i)) {
          category = "document"
        }

        await saveDocument(file, category, { siteId, rackId })
      }

      setDocuments(getDocuments())

      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    } catch (err: any) {
      setError(err.message || "Failed to upload file")
    } finally {
      setUploading(false)
    }
  }

  const confirmDelete = () => {
    if (!deleteTarget) return
    deleteDocument(deleteTarget.id)
    setDocuments(getDocuments())
    if (selectedDoc?.id === deleteTarget.id) {
      setSelectedDoc(null)
    }
    setDeleteTarget(null)
  }

  const handleView = (doc: UploadedFile) => {
    setSelectedDoc(doc)
  }

  const handleDownload = (doc: UploadedFile) => {
    const link = document.createElement("a")
    link.href = doc.data
    link.download = doc.name
    link.click()
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "drawing":
        return "text-blue-400"
      case "document":
        return "text-green-400"
      case "geometry":
        return "text-purple-400"
      case "model":
        return "text-orange-400"
      default:
        return "text-gray-400"
    }
  }

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-full">
      {/* Document List */}
      <div className="flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Documents & Drawings</h3>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Storage: {storageInfo.percentage.toFixed(1)}% used</span>
            <Button onClick={() => fileInputRef.current?.click()} disabled={uploading} size="sm">
              <Upload className="w-4 h-4 mr-2" />
              {uploading ? "Uploading..." : "Upload"}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".png,.jpg,.jpeg,.pdf,.dwg,.xlsx,.xls,.csv,.txt"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 mb-4 bg-red-950/20 border border-red-800 rounded text-red-400 text-sm">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        <div className="flex-1 overflow-auto space-y-2">
          {filteredDocs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <FileText className="w-12 h-12 mb-2 opacity-50" />
              <p className="text-sm">No documents uploaded</p>
              <p className="text-xs">Upload 2D drawings, Excel files, or PDFs</p>
            </div>
          ) : (
            filteredDocs.map((doc) => (
              <Card
                key={doc.id}
                className={`p-3 cursor-pointer transition-colors ${
                  selectedDoc?.id === doc.id ? "bg-accent border-accent-foreground/20" : ""
                }`}
                onClick={() => handleView(doc)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <FileText className={`w-4 h-4 flex-shrink-0 ${getCategoryColor(doc.category)}`} />
                      <span className="text-sm font-medium truncate">{doc.name}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="capitalize">{doc.category}</span>
                      <span>{formatFileSize(doc.size)}</span>
                      <span>{new Date(doc.uploadedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDownload(doc)
                      }}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          setDeleteTarget(doc)
                        }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Document Viewer */}
      {selectedDoc && (
        <div className="flex-1 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Preview: {selectedDoc.name}</h3>
            <Button variant="ghost" size="sm" onClick={() => setSelectedDoc(null)}>
              Close
            </Button>
          </div>
          <Card className="flex-1 p-4 overflow-auto">
            {selectedDoc.type.startsWith("image/") ? (
              <img src={selectedDoc.data || "/placeholder.svg"} alt={selectedDoc.name} className="max-w-full h-auto" />
            ) : selectedDoc.type === "application/pdf" ? (
              <iframe
                src={selectedDoc.data}
                className="w-full h-full min-h-[500px] border-0"
                title={selectedDoc.name}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <Eye className="w-12 h-12 mb-2 opacity-50" />
                <p className="text-sm">Preview not available for this file type</p>
                <Button onClick={() => handleDownload(selectedDoc)} className="mt-4" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Download to view
                </Button>
              </div>
            )}
          </Card>
        </div>
      )}
      </div>

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete document?</AlertDialogTitle>
            <AlertDialogDescription>
              This action permanently removes{" "}
              <span className="font-medium">{deleteTarget?.name ?? "this file"}</span> from local storage.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={confirmDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
