import type { Site, DeviceType, SceneConfig } from "./types"

export async function loadSites(): Promise<Site[]> {
  const response = await fetch("/data/sites.json")
  if (!response.ok) {
    throw new Error("Failed to load sites data")
  }
  const data = await response.json()
  return data.sites
}

export async function loadDeviceTypes(): Promise<DeviceType[]> {
  const response = await fetch("/data/device-types.json")
  if (!response.ok) {
    throw new Error("Failed to load device types")
  }
  const data = await response.json()
  return data.deviceTypes
}

export async function loadSceneConfig(uri: string): Promise<SceneConfig> {
  const response = await fetch(uri)
  if (!response.ok) {
    throw new Error(`Failed to load scene config from ${uri}`)
  }
  return response.json()
}
