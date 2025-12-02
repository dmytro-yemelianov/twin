'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { Site, SceneConfig, DeviceType } from '@/lib/types'

// Query keys
export const queryKeys = {
  sites: ['sites'] as const,
  site: (id: string) => ['sites', id] as const,
  sceneConfig: (id: string) => ['sites', id, 'scene'] as const,
  deviceTypes: ['deviceTypes'] as const,
  regions: ['regions'] as const,
  history: (filters?: { deviceId?: string; from?: string; to?: string }) => 
    ['history', filters] as const,
}

// Fetch all sites
async function fetchSites(): Promise<Site[]> {
  const res = await fetch('/api/sites')
  if (!res.ok) {
    // Fallback to static file
    const fallbackRes = await fetch('/data/sites.json')
    if (!fallbackRes.ok) throw new Error('Failed to fetch sites')
    const data = await fallbackRes.json()
    return data.sites
  }
  const data = await res.json()
  return data.sites
}

// Fetch single site
async function fetchSite(id: string): Promise<Site> {
  const res = await fetch(`/api/sites/${id}`)
  if (!res.ok) throw new Error('Failed to fetch site')
  return res.json()
}

// Fetch scene config for a site
async function fetchSceneConfig(siteId: string): Promise<SceneConfig> {
  const res = await fetch(`/api/sites/${siteId}/scene`)
  if (!res.ok) {
    // Fallback to static file based on site code
    const fallbackRes = await fetch(`/data/configs/${siteId}.json`)
    if (!fallbackRes.ok) throw new Error('Failed to fetch scene config')
    return fallbackRes.json()
  }
  return res.json()
}

// Fetch device types
async function fetchDeviceTypes(): Promise<DeviceType[]> {
  const res = await fetch('/api/device-types')
  if (!res.ok) {
    // Fallback to static file
    const fallbackRes = await fetch('/data/device-types.json')
    if (!fallbackRes.ok) throw new Error('Failed to fetch device types')
    const data = await fallbackRes.json()
    return data.deviceTypes
  }
  const data = await res.json()
  return data.deviceTypes
}

// Fetch regions
async function fetchRegions() {
  const res = await fetch('/api/regions')
  if (!res.ok) throw new Error('Failed to fetch regions')
  const data = await res.json()
  return data.regions
}

// ============== HOOKS ==============

/**
 * Hook to fetch all sites
 */
export function useSites() {
  return useQuery({
    queryKey: queryKeys.sites,
    queryFn: fetchSites,
  })
}

/**
 * Hook to fetch a single site
 */
export function useSite(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.site(id ?? ''),
    queryFn: () => fetchSite(id!),
    enabled: !!id,
  })
}

/**
 * Hook to fetch scene config for a site
 */
export function useSceneConfig(siteId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.sceneConfig(siteId ?? ''),
    queryFn: () => fetchSceneConfig(siteId!),
    enabled: !!siteId,
  })
}

/**
 * Hook to fetch device types
 */
export function useDeviceTypes() {
  return useQuery({
    queryKey: queryKeys.deviceTypes,
    queryFn: fetchDeviceTypes,
  })
}

/**
 * Hook to fetch regions
 */
export function useRegions() {
  return useQuery({
    queryKey: queryKeys.regions,
    queryFn: fetchRegions,
  })
}

// ============== MUTATIONS ==============

/**
 * Hook to create a new site
 */
export function useCreateSite() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (site: Omit<Site, 'id'> & { regionId: string }) => {
      const res = await fetch('/api/sites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(site),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to create site')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sites })
    },
  })
}

/**
 * Hook to update a site
 */
export function useUpdateSite() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<Site>) => {
      const res = await fetch(`/api/sites/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to update site')
      }
      return res.json()
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sites })
      queryClient.invalidateQueries({ queryKey: queryKeys.site(variables.id) })
    },
  })
}

/**
 * Hook to delete a site
 */
export function useDeleteSite() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/sites/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to delete site')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sites })
    },
  })
}

