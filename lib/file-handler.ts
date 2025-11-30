export interface UploadedFile {
  id: string
  name: string
  type: string
  size: number
  uploadedAt: Date
  category: "drawing" | "document" | "geometry" | "model" | "other"
  data: string // base64 or blob URL
  metadata?: {
    siteId?: string
    rackId?: string
    associatedWith?: string
  }
}

export interface GeometryFile extends UploadedFile {
  category: "geometry"
  format: "glb" | "gltf" | "obj"
}

export interface ModelFile extends UploadedFile {
  category: "model"
  deviceTypeId?: string
}

// Storage keys
const STORAGE_KEYS = {
  DOCUMENTS: "dt_documents",
  GEOMETRY: "dt_geometry",
  MODELS: "dt_models",
}

/**
 * Check available storage space
 */
export function getStorageInfo(): { used: number; available: number; percentage: number } {
  let used = 0
  for (const key in localStorage) {
    if (localStorage.hasOwnProperty(key)) {
      used += localStorage[key].length + key.length
    }
  }
  const available = 5 * 1024 * 1024 // 5MB typical limit
  return {
    used,
    available,
    percentage: (used / available) * 100,
  }
}

/**
 * Convert file to base64
 */
export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/**
 * Save document file
 */
export async function saveDocument(
  file: File,
  category: UploadedFile["category"],
  metadata?: UploadedFile["metadata"],
): Promise<UploadedFile> {
  const data = await fileToBase64(file)

  const uploadedFile: UploadedFile = {
    id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name: file.name,
    type: file.type,
    size: file.size,
    uploadedAt: new Date(),
    category,
    data,
    metadata,
  }

  // Get existing files
  const existing = getDocuments()
  existing.push(uploadedFile)

  // Save to localStorage
  try {
    localStorage.setItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(existing))
  } catch (e) {
    throw new Error("Storage quota exceeded. Please delete some files.")
  }

  return uploadedFile
}

/**
 * Get all documents
 */
export function getDocuments(): UploadedFile[] {
  const data = localStorage.getItem(STORAGE_KEYS.DOCUMENTS)
  if (!data) return []
  return JSON.parse(data)
}

/**
 * Delete document
 */
export function deleteDocument(id: string): void {
  const existing = getDocuments()
  const filtered = existing.filter((f) => f.id !== id)
  localStorage.setItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(filtered))
}

/**
 * Save geometry file
 */
export async function saveGeometry(file: File, siteId?: string): Promise<GeometryFile> {
  const data = await fileToBase64(file)

  const format = file.name.endsWith(".glb") ? "glb" : file.name.endsWith(".gltf") ? "gltf" : "obj"

  const geometryFile: GeometryFile = {
    id: `geo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name: file.name,
    type: file.type,
    size: file.size,
    uploadedAt: new Date(),
    category: "geometry",
    format,
    data,
    metadata: { siteId },
  }

  const existing = getGeometryFiles()
  existing.push(geometryFile)

  try {
    localStorage.setItem(STORAGE_KEYS.GEOMETRY, JSON.stringify(existing))
  } catch (e) {
    throw new Error("Storage quota exceeded. Geometry files are large - consider deleting unused files.")
  }

  return geometryFile
}

/**
 * Get all geometry files
 */
export function getGeometryFiles(): GeometryFile[] {
  const data = localStorage.getItem(STORAGE_KEYS.GEOMETRY)
  if (!data) return []
  return JSON.parse(data)
}

/**
 * Delete geometry file
 */
export function deleteGeometry(id: string): void {
  const existing = getGeometryFiles()
  const filtered = existing.filter((f) => f.id !== id)
  localStorage.setItem(STORAGE_KEYS.GEOMETRY, JSON.stringify(filtered))
}

/**
 * Save equipment model file
 */
export async function saveModel(file: File, deviceTypeId?: string): Promise<ModelFile> {
  const data = await fileToBase64(file)

  const modelFile: ModelFile = {
    id: `model_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name: file.name,
    type: file.type,
    size: file.size,
    uploadedAt: new Date(),
    category: "model",
    deviceTypeId,
    data,
  }

  const existing = getModelFiles()
  existing.push(modelFile)

  try {
    localStorage.setItem(STORAGE_KEYS.MODELS, JSON.stringify(existing))
  } catch (e) {
    throw new Error("Storage quota exceeded. Please delete some files.")
  }

  return modelFile
}

/**
 * Get all model files
 */
export function getModelFiles(): ModelFile[] {
  const data = localStorage.getItem(STORAGE_KEYS.MODELS)
  if (!data) return []
  return JSON.parse(data)
}

/**
 * Delete model file
 */
export function deleteModel(id: string): void {
  const existing = getModelFiles()
  const filtered = existing.filter((f) => f.id !== id)
  localStorage.setItem(STORAGE_KEYS.MODELS, JSON.stringify(filtered))
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes"
  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i]
}
