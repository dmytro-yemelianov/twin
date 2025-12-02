import type { Site, DeviceType, SceneConfig } from "./types"

const CACHE_TTL_MS = 5 * 60 * 1000

interface CacheEntry<T> {
  data: T
  expiresAt: number
}

let sitesCache: CacheEntry<Site[]> | null = null
let deviceTypeCache: CacheEntry<DeviceType[]> | null = null
const sceneConfigCache = new Map<string, CacheEntry<SceneConfig>>()

// Check if we should use the API (database) or static files
const USE_API = process.env.NEXT_PUBLIC_USE_DATABASE === 'true'

async function fetchJSON<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init)
  if (!response.ok) {
    throw new Error(`Failed to fetch ${typeof input === "string" ? input : response.url}`)
  }
  return response.json()
}

/**
 * Load sites - tries API first, falls back to static file
 */
export async function loadSites(signal?: AbortSignal): Promise<Site[]> {
  if (sitesCache && sitesCache.expiresAt > Date.now()) {
    return sitesCache.data
  }

  let data: { sites: Site[] }

  if (USE_API) {
    try {
      data = await fetchJSON<{ sites: Site[] }>("/api/sites", { signal })
    } catch {
      // Fallback to static file if API fails
      console.warn('[data-loader] API failed, falling back to static file')
      data = await fetchJSON<{ sites: Site[] }>("/data/sites.json", { signal })
    }
  } else {
    data = await fetchJSON<{ sites: Site[] }>("/data/sites.json", { signal })
  }

  sitesCache = { data: data.sites, expiresAt: Date.now() + CACHE_TTL_MS }
  return sitesCache.data
}

/**
 * Load device types - tries API first, falls back to static file
 */
export async function loadDeviceTypes(signal?: AbortSignal): Promise<DeviceType[]> {
  if (deviceTypeCache && deviceTypeCache.expiresAt > Date.now()) {
    return deviceTypeCache.data
  }

  let data: { deviceTypes: DeviceType[] }

  if (USE_API) {
    try {
      data = await fetchJSON<{ deviceTypes: DeviceType[] }>("/api/device-types", { signal })
    } catch {
      // Fallback to static file if API fails
      console.warn('[data-loader] API failed, falling back to static file')
      data = await fetchJSON<{ deviceTypes: DeviceType[] }>("/data/device-types.json", { signal })
    }
  } else {
    data = await fetchJSON<{ deviceTypes: DeviceType[] }>("/data/device-types.json", { signal })
  }

  deviceTypeCache = { data: data.deviceTypes, expiresAt: Date.now() + CACHE_TTL_MS }
  return deviceTypeCache.data
}

/**
 * Load scene config - tries API first, falls back to static file
 * @param uri - Either an API path like /api/sites/{id}/scene or a static path like /data/configs/site-nyc-01.json
 */
export async function loadSceneConfig(uri: string, signal?: AbortSignal): Promise<SceneConfig> {
  const cached = sceneConfigCache.get(uri)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data
  }

  let data: SceneConfig

  // Check if uri is already an API path or a static path
  if (uri.startsWith('/api/')) {
    data = await fetchJSON<SceneConfig>(uri, { signal })
  } else if (USE_API) {
    // Extract site ID from static path and use API
    const siteIdMatch = uri.match(/site-([a-z]+-\d+)\.json/)
    if (siteIdMatch) {
      const siteCode = `site-${siteIdMatch[1]}`
      try {
        data = await fetchJSON<SceneConfig>(`/api/sites/${siteCode}/scene`, { signal })
      } catch {
        // Fallback to static file
        console.warn('[data-loader] API failed, falling back to static file')
        data = await fetchJSON<SceneConfig>(uri, { signal })
      }
    } else {
      data = await fetchJSON<SceneConfig>(uri, { signal })
    }
  } else {
    data = await fetchJSON<SceneConfig>(uri, { signal })
  }

  sceneConfigCache.set(uri, { data, expiresAt: Date.now() + CACHE_TTL_MS })
  return data
}

/**
 * Clear all caches - useful for forcing a refresh
 */
export function clearDataCache(): void {
  sitesCache = null
  deviceTypeCache = null
  sceneConfigCache.clear()
}

/**
 * Invalidate specific cache
 */
export function invalidateSitesCache(): void {
  sitesCache = null
}

export function invalidateDeviceTypesCache(): void {
  deviceTypeCache = null
}

export function invalidateSceneConfigCache(uri?: string): void {
  if (uri) {
    sceneConfigCache.delete(uri)
  } else {
    sceneConfigCache.clear()
  }
}
