import { estimateStoredBytes, generateId, readJSON, requireClientStorage, writeJSON, StorageQuotaExceededError } from "./storage"

type FileCategory = "drawing" | "document" | "geometry" | "model" | "other"
type GeometryFormat = "glb" | "gltf" | "obj"

export interface UploadedFile {
  id: string
  name: string
  type: string
  size: number
  uploadedAt: string
  category: FileCategory
  data: string // base64 or blob URL
  metadata?: {
    siteId?: string
    rackId?: string
    associatedWith?: string
  }
}

export interface GeometryFile extends UploadedFile {
  category: "geometry"
  format: GeometryFormat
}

export interface ModelFile extends UploadedFile {
  category: "model"
  deviceTypeId?: string
}

const STORAGE_KEYS = {
  DOCUMENTS: "dt_documents",
  GEOMETRY: "dt_geometry",
  MODELS: "dt_models",
} as const

const STORAGE_LIMIT_BYTES = 5 * 1024 * 1024
const FILE_CATEGORIES = new Set<UploadedFile["category"]>(["drawing", "document", "geometry", "model", "other"])
const GEOMETRY_FORMATS = new Set<GeometryFile["format"]>(["glb", "gltf", "obj"])

type Metadata = NonNullable<UploadedFile["metadata"]>

function sanitizeMetadata(metadata: unknown): Metadata | undefined {
  if (!metadata || typeof metadata !== "object") {
    return undefined
  }

  const raw = metadata as Record<string, unknown>
  const sanitized: Metadata = {
    siteId: typeof raw.siteId === "string" ? raw.siteId : undefined,
    rackId: typeof raw.rackId === "string" ? raw.rackId : undefined,
    associatedWith: typeof raw.associatedWith === "string" ? raw.associatedWith : undefined,
  }

  if (sanitized.siteId || sanitized.rackId || sanitized.associatedWith) {
    return sanitized
  }

  return undefined
}

function sanitizeUploadedFile(record: unknown): UploadedFile | null {
  if (!record || typeof record !== "object") {
    return null
  }

  const raw = record as Record<string, any>

  if (
    typeof raw.id !== "string" ||
    typeof raw.name !== "string" ||
    typeof raw.category !== "string" ||
    typeof raw.data !== "string"
  ) {
    return null
  }

  if (!FILE_CATEGORIES.has(raw.category as FileCategory)) {
    return null
  }

  return {
    id: raw.id,
    name: raw.name,
    type: typeof raw.type === "string" ? raw.type : "application/octet-stream",
    size: typeof raw.size === "number" ? raw.size : Number(raw.size) || 0,
    uploadedAt: typeof raw.uploadedAt === "string" ? raw.uploadedAt : new Date().toISOString(),
    category: raw.category as FileCategory,
    data: raw.data,
    metadata: sanitizeMetadata(raw.metadata),
  }
}

function sanitizeGeometryFile(record: unknown): GeometryFile | null {
  const base = sanitizeUploadedFile(record)
  if (!base || base.category !== "geometry") {
    return null
  }

  const raw = record as Record<string, any>
  if (typeof raw.format !== "string" || !GEOMETRY_FORMATS.has(raw.format as GeometryFormat)) {
    return null
  }

  return {
    ...base,
    category: "geometry",
    format: raw.format as GeometryFormat,
  }
}

function sanitizeModelFile(record: unknown): ModelFile | null {
  const base = sanitizeUploadedFile(record)
  if (!base || base.category !== "model") {
    return null
  }

  const raw = record as Record<string, any>
  return {
    ...base,
    category: "model",
    deviceTypeId: typeof raw.deviceTypeId === "string" ? raw.deviceTypeId : undefined,
  }
}

function readRecords<T>(key: string, sanitizer: (record: unknown) => T | null): T[] {
  const records = readJSON<unknown[]>(key, [])
  if (!Array.isArray(records)) {
    return []
  }

  return records.map((record) => sanitizer(record)).filter((value): value is T => Boolean(value))
}

function persistRecords<T>(key: string, data: T[], quotaMessage: string) {
  try {
    writeJSON(key, data)
  } catch (error) {
    if (error instanceof StorageQuotaExceededError) {
      throw new Error(quotaMessage)
    }
    throw error
  }
}

export function getStorageInfo(): { used: number; available: number; percentage: number } {
  const used = estimateStoredBytes()
  const percentage = STORAGE_LIMIT_BYTES === 0 ? 0 : Math.min((used / STORAGE_LIMIT_BYTES) * 100, 100)

  return {
    used,
    available: STORAGE_LIMIT_BYTES,
    percentage,
  }
}

export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export async function saveDocument(
  file: File,
  category: UploadedFile["category"],
  metadata?: UploadedFile["metadata"],
): Promise<UploadedFile> {
  if (!FILE_CATEGORIES.has(category)) {
    throw new Error(`Unsupported document category "${category}"`)
  }

  requireClientStorage()

  const data = await fileToBase64(file)
  const uploadedFile: UploadedFile = {
    id: generateId("doc"),
    name: file.name,
    type: file.type || "application/octet-stream",
    size: file.size,
    uploadedAt: new Date().toISOString(),
    category,
    data,
    metadata,
  }

  const updated = [...getDocuments(), uploadedFile]
  persistRecords(STORAGE_KEYS.DOCUMENTS, updated, "Storage quota exceeded. Please delete some files.")

  return uploadedFile
}

export function getDocuments(): UploadedFile[] {
  return readRecords(STORAGE_KEYS.DOCUMENTS, sanitizeUploadedFile)
}

export function deleteDocument(id: string): void {
  const updated = getDocuments().filter((file) => file.id !== id)
  persistRecords(STORAGE_KEYS.DOCUMENTS, updated, "Storage quota exceeded. Please delete some files.")
}

export async function saveGeometry(file: File, siteId?: string): Promise<GeometryFile> {
  requireClientStorage()

  const data = await fileToBase64(file)
  const extension = file.name.toLowerCase().endsWith(".glb")
    ? "glb"
    : file.name.toLowerCase().endsWith(".gltf")
      ? "gltf"
      : "obj"

  if (!GEOMETRY_FORMATS.has(extension as GeometryFile["format"])) {
    throw new Error("Unsupported geometry format.")
  }

  const geometryFile: GeometryFile = {
    id: generateId("geo"),
    name: file.name,
    type: file.type || "model/gltf-binary",
    size: file.size,
    uploadedAt: new Date().toISOString(),
    category: "geometry",
    format: extension as GeometryFile["format"],
    data,
    metadata: siteId ? { siteId } : undefined,
  }

  const updated = [...getGeometryFiles(), geometryFile]
  persistRecords(
    STORAGE_KEYS.GEOMETRY,
    updated,
    "Storage quota exceeded. Geometry files are large - delete unused files.",
  )

  return geometryFile
}

export function getGeometryFiles(): GeometryFile[] {
  return readRecords(STORAGE_KEYS.GEOMETRY, sanitizeGeometryFile)
}

export function deleteGeometry(id: string): void {
  const updated = getGeometryFiles().filter((file) => file.id !== id)
  persistRecords(
    STORAGE_KEYS.GEOMETRY,
    updated,
    "Storage quota exceeded. Geometry files are large - delete unused files.",
  )
}

export async function saveModel(file: File, deviceTypeId?: string): Promise<ModelFile> {
  requireClientStorage()

  const data = await fileToBase64(file)

  const modelFile: ModelFile = {
    id: generateId("model"),
    name: file.name,
    type: file.type || "model/gltf-binary",
    size: file.size,
    uploadedAt: new Date().toISOString(),
    category: "model",
    deviceTypeId,
    data,
  }

  const updated = [...getModelFiles(), modelFile]
  persistRecords(STORAGE_KEYS.MODELS, updated, "Storage quota exceeded. Please delete some files.")

  return modelFile
}

export function getModelFiles(): ModelFile[] {
  return readRecords(STORAGE_KEYS.MODELS, sanitizeModelFile)
}

export function updateModelDeviceType(modelId: string, deviceTypeId?: string): ModelFile | null {
  const models = getModelFiles()
  const index = models.findIndex((model) => model.id === modelId)
  if (index === -1) {
    return null
  }

  const updatedModel: ModelFile = { ...models[index], deviceTypeId }
  const updated = [...models]
  updated[index] = updatedModel

  persistRecords(STORAGE_KEYS.MODELS, updated, "Storage quota exceeded. Please delete some files.")

  return updatedModel
}

export function deleteModel(id: string): void {
  const updated = getModelFiles().filter((file) => file.id !== id)
  persistRecords(STORAGE_KEYS.MODELS, updated, "Storage quota exceeded. Please delete some files.")
}

export function formatFileSize(bytes: number): string {
  if (!bytes) return "0 Bytes"
  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  const value = bytes / Math.pow(k, i)
  return `${Math.round(value * 100) / 100} ${sizes[i]}`
}
