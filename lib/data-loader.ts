import type { Site, DeviceType, SceneConfig } from "./types"

const CACHE_TTL_MS = 5 * 60 * 1000

interface CacheEntry<T> {
  data: T
  expiresAt: number
}

let sitesCache: CacheEntry<Site[]> | null = null
let deviceTypeCache: CacheEntry<DeviceType[]> | null = null
const sceneConfigCache = new Map<string, CacheEntry<SceneConfig>>()

async function fetchJSON<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init)
  if (!response.ok) {
    throw new Error(`Failed to fetch ${typeof input === "string" ? input : response.url}`)
  }
  return response.json()
}

export async function loadSites(signal?: AbortSignal): Promise<Site[]> {
  if (sitesCache && sitesCache.expiresAt > Date.now()) {
    return sitesCache.data
  }

  const data = await fetchJSON<{ sites: Site[] }>("/data/sites.json", { signal })
  sitesCache = { data: data.sites, expiresAt: Date.now() + CACHE_TTL_MS }
  return sitesCache.data
}

export async function loadDeviceTypes(signal?: AbortSignal): Promise<DeviceType[]> {
  if (deviceTypeCache && deviceTypeCache.expiresAt > Date.now()) {
    return deviceTypeCache.data
  }

  const data = await fetchJSON<{ deviceTypes: DeviceType[] }>("/data/device-types.json", { signal })
  deviceTypeCache = { data: data.deviceTypes, expiresAt: Date.now() + CACHE_TTL_MS }
  return deviceTypeCache.data
}

export async function loadSceneConfig(uri: string, signal?: AbortSignal): Promise<SceneConfig> {
  const cached = sceneConfigCache.get(uri)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data
  }

  const data = await fetchJSON<SceneConfig>(uri, { signal })
  sceneConfigCache.set(uri, { data, expiresAt: Date.now() + CACHE_TTL_MS })
  return data
}
