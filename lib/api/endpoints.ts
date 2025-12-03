/**
 * API Endpoints for Digital Twin Application
 */

import { apiClient, type ApiResponse, type PaginatedResponse } from './client'
import type { Site, SceneConfig, DeviceType, Device, Rack } from '@/lib/types'

// Site Management APIs
export const sitesApi = {
  // Get all sites with optional filtering
  async getSites(filters?: {
    region?: string
    status?: string
    search?: string
  }): Promise<ApiResponse<Site[]>> {
    const params = new URLSearchParams()
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value)
      })
    }
    const endpoint = params.toString() ? `/sites?${params.toString()}` : '/sites'
    return apiClient.get<Site[]>(endpoint)
  },

  // Get single site by ID
  async getSite(siteId: string): Promise<ApiResponse<Site>> {
    return apiClient.get<Site>(`/sites/${siteId}`)
  },

  // Create new site
  async createSite(siteData: Omit<Site, 'id'>): Promise<ApiResponse<Site>> {
    return apiClient.post<Site>('/sites', siteData)
  },

  // Update existing site
  async updateSite(siteId: string, updates: Partial<Site>): Promise<ApiResponse<Site>> {
    return apiClient.patch<Site>(`/sites/${siteId}`, updates)
  },

  // Delete site
  async deleteSite(siteId: string): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`/sites/${siteId}`)
  },

  // Get site statistics
  async getSiteStats(siteId: string): Promise<ApiResponse<{
    totalRacks: number
    usedRacks: number
    totalU: number
    usedU: number
    powerCapacity: number
    powerUsage: number
    aiReadyCapacity: number
  }>> {
    return apiClient.get(`/sites/${siteId}/stats`)
  }
}

// Scene Configuration APIs
export const sceneApi = {
  // Get scene configuration for a site
  async getSceneConfig(siteId: string): Promise<ApiResponse<SceneConfig>> {
    return apiClient.get<SceneConfig>(`/sites/${siteId}/scene`)
  },

  // Update scene configuration
  async updateSceneConfig(siteId: string, config: Partial<SceneConfig>): Promise<ApiResponse<SceneConfig>> {
    return apiClient.put<SceneConfig>(`/sites/${siteId}/scene`, config)
  },

  // Validate scene configuration
  async validateSceneConfig(config: SceneConfig): Promise<ApiResponse<{
    valid: boolean
    errors: string[]
    warnings: string[]
  }>> {
    return apiClient.post('/scene/validate', config)
  }
}

// Device Management APIs
export const devicesApi = {
  // Get devices with pagination and filtering
  async getDevices(params: {
    siteId?: string
    rackId?: string
    deviceType?: string
    status?: string
    page?: number
    limit?: number
  } = {}): Promise<PaginatedResponse<Device>> {
    return apiClient.getPaginated<Device>('/devices', params)
  },

  // Get single device
  async getDevice(deviceId: string): Promise<ApiResponse<Device>> {
    return apiClient.get<Device>(`/devices/${deviceId}`)
  },

  // Create new device
  async createDevice(deviceData: Omit<Device, 'id'>): Promise<ApiResponse<Device>> {
    return apiClient.post<Device>('/devices', deviceData)
  },

  // Update device
  async updateDevice(deviceId: string, updates: Partial<Device>): Promise<ApiResponse<Device>> {
    return apiClient.patch<Device>(`/devices/${deviceId}`, updates)
  },

  // Move device to different rack/position
  async moveDevice(
    deviceId: string,
    targetRackId: string,
    targetUPosition: number,
    options?: {
      targetPhase?: 'AS_IS' | 'TO_BE' | 'FUTURE'
      moveType?: 'MODIFIED' | 'CREATE_PROPOSED'
      userId?: string
    }
  ): Promise<ApiResponse<Device>> {
    return apiClient.post<Device>(`/devices/${deviceId}/move`, {
      targetRackId,
      targetUPosition,
      targetPhase: options?.targetPhase || 'TO_BE',
      moveType: options?.moveType || 'MODIFIED',
      userId: options?.userId
    })
  },

  // Bulk operations
  async bulkUpdateDevices(deviceIds: string[], updates: Partial<Device>): Promise<ApiResponse<Device[]>> {
    return apiClient.post<Device[]>('/devices/bulk-update', {
      deviceIds,
      updates
    })
  },

  // Delete device
  async deleteDevice(deviceId: string): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`/devices/${deviceId}`)
  }
}

// Rack Management APIs
export const racksApi = {
  // Get racks for a site
  async getRacks(siteId: string, filters?: {
    roomId?: string
    status?: string
    minPowerAvailable?: number
    minSpaceAvailable?: number
  }): Promise<ApiResponse<Rack[]>> {
    const params = new URLSearchParams({ siteId })
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) params.append(key, String(value))
      })
    }
    return apiClient.get<Rack[]>(`/racks?${params.toString()}`)
  },

  // Get single rack with its devices
  async getRack(rackId: string, includeDevices = false): Promise<ApiResponse<Rack & {
    devices?: Device[]
    utilization?: {
      spaceUsed: number
      powerUsed: number
      spaceAvailable: number
      powerAvailable: number
    }
  }>> {
    const params = includeDevices ? '?include=devices,utilization' : '?include=utilization'
    return apiClient.get(`/racks/${rackId}${params}`)
  },

  // Update rack configuration
  async updateRack(rackId: string, updates: Partial<Rack>): Promise<ApiResponse<Rack>> {
    return apiClient.patch<Rack>(`/racks/${rackId}`, updates)
  },

  // Get rack elevation view data
  async getRackElevation(rackId: string): Promise<ApiResponse<{
    rack: Rack
    devices: Device[]
    conflicts: Array<{ uPosition: number; reason: string }>
  }>> {
    return apiClient.get(`/racks/${rackId}/elevation`)
  }
}

// Device Types APIs
export const deviceTypesApi = {
  // Get all device types
  async getDeviceTypes(category?: string): Promise<ApiResponse<DeviceType[]>> {
    const endpoint = category ? `/device-types?category=${category}` : '/device-types'
    return apiClient.get<DeviceType[]>(endpoint)
  },

  // Get single device type
  async getDeviceType(deviceTypeId: string): Promise<ApiResponse<DeviceType>> {
    return apiClient.get<DeviceType>(`/device-types/${deviceTypeId}`)
  },

  // Create new device type
  async createDeviceType(deviceTypeData: Omit<DeviceType, 'id'>): Promise<ApiResponse<DeviceType>> {
    return apiClient.post<DeviceType>('/device-types', deviceTypeData)
  },

  // Update device type
  async updateDeviceType(deviceTypeId: string, updates: Partial<DeviceType>): Promise<ApiResponse<DeviceType>> {
    return apiClient.patch<DeviceType>(`/device-types/${deviceTypeId}`, updates)
  }
}

// AI Capacity APIs
export const aiCapacityApi = {
  // Get AI capacity recommendations for a site
  async getCapacityRecommendations(siteId: string, requirements?: {
    minRacks?: number
    maxRacks?: number
    minPowerPerRack?: number
    minSpacePerRack?: number
  }): Promise<ApiResponse<{
    recommendations: Array<{
      rackIds: string[]
      totalCapacity: number
      estimatedCost: number
      implementationTime: string
      confidence: number
    }>
    siteAnalysis: {
      totalAvailableCapacity: number
      constrainingFactors: string[]
      recommendations: string[]
    }
  }>> {
    return apiClient.post(`/sites/${siteId}/ai-capacity`, requirements)
  },

  // Get power and cooling requirements
  async getPowerCoolingAnalysis(siteId: string, deviceConfigs: Array<{
    deviceTypeId: string
    quantity: number
  }>): Promise<ApiResponse<{
    powerRequirement: number
    coolingRequirement: number
    recommendations: string[]
    feasible: boolean
  }>> {
    return apiClient.post(`/sites/${siteId}/power-analysis`, { deviceConfigs })
  }
}

// File Management APIs
export const filesApi = {
  // Upload geometry file
  async uploadGeometry(file: File, siteId: string, metadata?: {
    name?: string
    description?: string
    tags?: string[]
  }): Promise<ApiResponse<{ fileId: string; url: string }>> {
    return apiClient.uploadFile('/files/geometry', file, { siteId, ...metadata })
  },

  // Upload document
  async uploadDocument(file: File, siteId: string, metadata?: {
    category?: string
    associatedWith?: string
  }): Promise<ApiResponse<{ fileId: string; url: string }>> {
    return apiClient.uploadFile('/files/documents', file, { siteId, ...metadata })
  },

  // Get file metadata
  async getFile(fileId: string): Promise<ApiResponse<{
    id: string
    name: string
    size: number
    type: string
    url: string
    metadata: any
  }>> {
    return apiClient.get(`/files/${fileId}`)
  },

  // Delete file
  async deleteFile(fileId: string): Promise<ApiResponse<void>> {
    return apiClient.delete(`/files/${fileId}`)
  }
}

// Analytics and Reporting APIs
export const analyticsApi = {
  // Get usage metrics
  async getUsageMetrics(siteId: string, timeRange: {
    start: string
    end: string
    granularity?: 'hour' | 'day' | 'week' | 'month'
  }): Promise<ApiResponse<{
    timestamps: string[]
    metrics: {
      powerUsage: number[]
      spaceUtilization: number[]
      deviceCount: number[]
      temperature: number[]
    }
  }>> {
    return apiClient.post(`/sites/${siteId}/metrics`, timeRange)
  },

  // Export data
  async exportData(siteId: string, format: 'csv' | 'json' | 'xlsx', filters?: any): Promise<Blob> {
    const response = await fetch(`/api/sites/${siteId}/export?format=${format}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(filters)
    })

    if (!response.ok) {
      throw new Error(`Export failed: ${response.statusText}`)
    }

    return response.blob()
  }
}