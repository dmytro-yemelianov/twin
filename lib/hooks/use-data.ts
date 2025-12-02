import { useQuery } from '@tanstack/react-query'
import { loadSites, loadDeviceTypes, loadSceneConfig } from '@/lib/data-loader'
import type { Site, DeviceType, SceneConfig } from '@/lib/types'

// Query keys
export const queryKeys = {
  sites: ['sites'] as const,
  deviceTypes: ['deviceTypes'] as const,
  sceneConfig: (uri: string) => ['sceneConfig', uri] as const,
}

// Custom hooks for data fetching
export function useSites() {
  return useQuery<Site[], Error>({
    queryKey: queryKeys.sites,
    queryFn: () => loadSites(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  })
}

export function useDeviceTypes() {
  return useQuery<DeviceType[], Error>({
    queryKey: queryKeys.deviceTypes,
    queryFn: () => loadDeviceTypes(),
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 20 * 60 * 1000, // 20 minutes
    retry: 3,
  })
}

export function useSceneConfig(uri: string | null) {
  return useQuery<SceneConfig, Error>({
    queryKey: queryKeys.sceneConfig(uri || ''),
    queryFn: () => loadSceneConfig(uri!),
    enabled: !!uri,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 3,
  })
}

// Prefetch functions for better UX
export async function prefetchSites(queryClient: any) {
  await queryClient.prefetchQuery({
    queryKey: queryKeys.sites,
    queryFn: () => loadSites(),
  })
}

export async function prefetchDeviceTypes(queryClient: any) {
  await queryClient.prefetchQuery({
    queryKey: queryKeys.deviceTypes,
    queryFn: () => loadDeviceTypes(),
  })
}

export async function prefetchSceneConfig(queryClient: any, uri: string) {
  await queryClient.prefetchQuery({
    queryKey: queryKeys.sceneConfig(uri),
    queryFn: () => loadSceneConfig(uri),
  })
}