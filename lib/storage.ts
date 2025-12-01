const isBrowser = typeof window !== "undefined"

export class StorageUnavailableError extends Error {
  constructor(message = "Local storage is not available in this environment.") {
    super(message)
    this.name = "StorageUnavailableError"
  }
}

export class StorageQuotaExceededError extends Error {
  constructor(message = "Storage quota exceeded") {
    super(message)
    this.name = "StorageQuotaExceededError"
  }
}

export function getClientStorage(): Storage | null {
  if (!isBrowser) {
    return null
  }

  try {
    return window.localStorage
  } catch (error) {
    console.warn("[storage] localStorage is not accessible.", error)
    return null
  }
}

export function requireClientStorage(): Storage {
  const storage = getClientStorage()
  if (!storage) {
    throw new StorageUnavailableError()
  }
  return storage
}

export function readJSON<T>(key: string, fallback: T): T {
  const storage = getClientStorage()
  if (!storage) {
    return fallback
  }

  const rawValue = storage.getItem(key)
  if (!rawValue) {
    return fallback
  }

  try {
    return JSON.parse(rawValue) as T
  } catch (error) {
    console.warn(`[storage] Failed to parse key "${key}", clearing corrupted value.`, error)
    storage.removeItem(key)
    return fallback
  }
}

export function writeJSON<T>(key: string, value: T) {
  const storage = requireClientStorage()

  try {
    storage.setItem(key, JSON.stringify(value))
  } catch (error: any) {
    if (
      error instanceof DOMException &&
      (error.name === "QuotaExceededError" || error.code === 22 || error.code === 1014)
    ) {
      throw new StorageQuotaExceededError()
    }
    if (error instanceof Error) {
      throw error
    }
    throw new Error("Failed to persist data to local storage.")
  }
}

export function removeKey(key: string) {
  const storage = getClientStorage()
  if (!storage) return
  storage.removeItem(key)
}

export function estimateStoredBytes(): number {
  const storage = getClientStorage()
  if (!storage) return 0

  let total = 0
  for (let i = 0; i < storage.length; i += 1) {
    const key = storage.key(i)
    if (!key) continue
    const value = storage.getItem(key) ?? ""
    total += key.length + value.length
  }
  return total
}

export function generateId(prefix: string): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}_${crypto.randomUUID()}`
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

