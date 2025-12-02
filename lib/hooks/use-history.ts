'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from './use-sites'
import type { EquipmentModification } from '@/lib/modification-tracker'

// Fetch history with filters
async function fetchHistory(filters?: { 
  deviceId?: string
  from?: string
  to?: string
  limit?: number 
}) {
  const params = new URLSearchParams()
  if (filters?.deviceId) params.set('deviceId', filters.deviceId)
  if (filters?.from) params.set('from', filters.from)
  if (filters?.to) params.set('to', filters.to)
  if (filters?.limit) params.set('limit', filters.limit.toString())

  const res = await fetch(`/api/history?${params}`)
  if (!res.ok) throw new Error('Failed to fetch history')
  const data = await res.json()
  return data.history as EquipmentModification[]
}

/**
 * Hook to fetch equipment modification history
 */
export function useHistory(filters?: { 
  deviceId?: string
  from?: string
  to?: string
  limit?: number 
}) {
  return useQuery({
    queryKey: queryKeys.history(filters),
    queryFn: () => fetchHistory(filters),
  })
}

/**
 * Hook to fetch history for a specific device
 */
export function useDeviceHistory(deviceId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.history({ deviceId }),
    queryFn: () => fetchHistory({ deviceId }),
    enabled: !!deviceId,
  })
}

/**
 * Hook to create a history entry
 */
export function useCreateHistory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (entry: Omit<EquipmentModification, 'id' | 'timestamp'>) => {
      const res = await fetch('/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to create history entry')
      }
      return res.json()
    },
    onSuccess: () => {
      // Invalidate all history queries
      queryClient.invalidateQueries({ queryKey: ['history'] })
    },
  })
}

