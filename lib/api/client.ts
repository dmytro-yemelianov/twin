/**
 * API Client for Digital Twin Application
 * Provides a unified interface for all API operations
 */

export interface ApiResponse<T = any> {
  data: T
  success: boolean
  message?: string
  error?: string
  timestamp: string
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface ApiError extends Error {
  status?: number
  code?: string
  details?: any
}

class ApiClientError extends Error implements ApiError {
  constructor(
    message: string, 
    public status?: number, 
    public code?: string, 
    public details?: any
  ) {
    super(message)
    this.name = 'ApiClientError'
  }
}

export interface RequestConfig {
  timeout?: number
  retries?: number
  retryDelay?: number
  signal?: AbortSignal
  headers?: Record<string, string>
}

export class ApiClient {
  private baseUrl: string
  private defaultHeaders: Record<string, string>
  private defaultTimeout = 30000
  private defaultRetries = 3

  constructor(baseUrl: string = '', defaultHeaders: Record<string, string> = {}) {
    this.baseUrl = baseUrl
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      ...defaultHeaders
    }
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit & RequestConfig = {}
  ): Promise<ApiResponse<T>> {
    const {
      timeout = this.defaultTimeout,
      retries = this.defaultRetries,
      retryDelay = 1000,
      signal,
      headers = {},
      ...fetchOptions
    } = options

    const url = this.baseUrl + endpoint
    const requestHeaders = {
      ...this.defaultHeaders,
      ...headers
    }

    let lastError: Error

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), timeout)
        
        // Combine signals if provided
        const abortSignal = signal
          ? this.combineAbortSignals([signal, controller.signal])
          : controller.signal

        const response = await fetch(url, {
          ...fetchOptions,
          headers: requestHeaders,
          signal: abortSignal
        })

        clearTimeout(timeoutId)

        if (!response.ok) {
          throw new ApiClientError(
            `HTTP ${response.status}: ${response.statusText}`,
            response.status
          )
        }

        const data: ApiResponse<T> = await response.json()
        
        if (!data.success && data.error) {
          throw new ApiClientError(
            data.error,
            response.status,
            data.code || 'API_ERROR',
            data
          )
        }

        return data

      } catch (error) {
        lastError = error as Error

        // Don't retry on abort or certain errors
        if (
          error instanceof DOMException && error.name === 'AbortError' ||
          (error as ApiClientError).status === 401 ||
          (error as ApiClientError).status === 403 ||
          attempt === retries
        ) {
          break
        }

        // Wait before retry
        if (attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, attempt)))
        }
      }
    }

    throw lastError!
  }

  private combineAbortSignals(signals: AbortSignal[]): AbortSignal {
    const controller = new AbortController()
    
    for (const signal of signals) {
      if (signal.aborted) {
        controller.abort()
        break
      }
      signal.addEventListener('abort', () => controller.abort())
    }
    
    return controller.signal
  }

  // HTTP Methods
  async get<T>(endpoint: string, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, { ...config, method: 'GET' })
  }

  async post<T>(endpoint: string, data?: any, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, {
      ...config,
      method: 'POST',
      body: JSON.stringify(data)
    })
  }

  async put<T>(endpoint: string, data?: any, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, {
      ...config,
      method: 'PUT',
      body: JSON.stringify(data)
    })
  }

  async patch<T>(endpoint: string, data?: any, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, {
      ...config,
      method: 'PATCH',
      body: JSON.stringify(data)
    })
  }

  async delete<T>(endpoint: string, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, { ...config, method: 'DELETE' })
  }

  // Paginated requests
  async getPaginated<T>(
    endpoint: string, 
    params: { page?: number; limit?: number; [key: string]: any } = {},
    config?: RequestConfig
  ): Promise<PaginatedResponse<T>> {
    const searchParams = new URLSearchParams()
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value))
      }
    })

    const url = searchParams.toString() 
      ? `${endpoint}?${searchParams.toString()}` 
      : endpoint

    return this.makeRequest<T[]>(url, { ...config, method: 'GET' }) as Promise<PaginatedResponse<T>>
  }

  // File upload
  async uploadFile<T>(
    endpoint: string,
    file: File,
    additionalData?: Record<string, any>,
    config?: RequestConfig & { onProgress?: (progress: number) => void }
  ): Promise<ApiResponse<T>> {
    const formData = new FormData()
    formData.append('file', file)
    
    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        formData.append(key, JSON.stringify(value))
      })
    }

    return this.makeRequest<T>(endpoint, {
      ...config,
      method: 'POST',
      body: formData,
      headers: {
        // Remove Content-Type to let browser set it with boundary
        ...Object.fromEntries(
          Object.entries(config?.headers || {}).filter(([key]) => 
            key.toLowerCase() !== 'content-type'
          )
        )
      }
    })
  }
}

// Default API client instance
export const apiClient = new ApiClient(
  process.env.NEXT_PUBLIC_API_BASE_URL || '/api'
)

// Environment-specific configurations
export function createApiClient(environment: 'development' | 'staging' | 'production') {
  const configs = {
    development: {
      baseUrl: process.env.NEXT_PUBLIC_DEV_API_URL || 'http://localhost:3001/api',
      headers: { 'X-Environment': 'development' }
    },
    staging: {
      baseUrl: process.env.NEXT_PUBLIC_STAGING_API_URL || 'https://api-staging.example.com',
      headers: { 'X-Environment': 'staging' }
    },
    production: {
      baseUrl: process.env.NEXT_PUBLIC_PROD_API_URL || 'https://api.example.com',
      headers: { 'X-Environment': 'production' }
    }
  }

  const config = configs[environment]
  return new ApiClient(config.baseUrl, config.headers)
}