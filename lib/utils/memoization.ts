/**
 * Advanced memoization utilities for performance optimization
 */

import { useMemo, useRef, useCallback, useEffect, useState } from 'react'

// Simple memoization with LRU cache
export class LRUCache<K, V> {
  private cache = new Map<K, V>()
  private readonly maxSize: number

  constructor(maxSize: number = 100) {
    this.maxSize = maxSize
  }

  get(key: K): V | undefined {
    if (this.cache.has(key)) {
      // Move to end (most recently used)
      const value = this.cache.get(key)!
      this.cache.delete(key)
      this.cache.set(key, value)
      return value
    }
    return undefined
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key)
    } else if (this.cache.size >= this.maxSize) {
      // Remove least recently used (first item)
      const firstKey = this.cache.keys().next().value
      this.cache.delete(firstKey)
    }
    this.cache.set(key, value)
  }

  has(key: K): boolean {
    return this.cache.has(key)
  }

  clear(): void {
    this.cache.clear()
  }

  size(): number {
    return this.cache.size
  }
}

// Memoization decorator for expensive functions
export function memoize<Args extends any[], Return>(
  fn: (...args: Args) => Return,
  keyFunction?: (...args: Args) => string,
  cacheSize = 100
): (...args: Args) => Return {
  const cache = new LRUCache<string, Return>(cacheSize)
  
  return (...args: Args): Return => {
    const key = keyFunction ? keyFunction(...args) : JSON.stringify(args)
    
    if (cache.has(key)) {
      return cache.get(key)!
    }
    
    const result = fn(...args)
    cache.set(key, result)
    return result
  }
}

// Memoization with async support
export function memoizeAsync<Args extends any[], Return>(
  fn: (...args: Args) => Promise<Return>,
  keyFunction?: (...args: Args) => string,
  cacheSize = 100,
  ttl?: number // Time to live in ms
): (...args: Args) => Promise<Return> {
  const cache = new Map<string, { value: Promise<Return>; timestamp: number }>()
  
  return async (...args: Args): Promise<Return> => {
    const key = keyFunction ? keyFunction(...args) : JSON.stringify(args)
    const now = Date.now()
    
    // Check if cached result exists and is still valid
    if (cache.has(key)) {
      const cached = cache.get(key)!
      if (!ttl || (now - cached.timestamp) < ttl) {
        return cached.value
      } else {
        cache.delete(key)
      }
    }
    
    // Clean up expired entries
    if (ttl && cache.size > 0) {
      for (const [cacheKey, entry] of cache.entries()) {
        if (now - entry.timestamp >= ttl) {
          cache.delete(cacheKey)
        }
      }
    }
    
    // Limit cache size
    if (cache.size >= cacheSize) {
      const oldestKey = cache.keys().next().value
      cache.delete(oldestKey)
    }
    
    const result = fn(...args)
    cache.set(key, { value: result, timestamp: now })
    return result
  }
}

// React hook for memoizing expensive computations
export function useExpensiveMemo<T>(
  factory: () => T,
  deps: React.DependencyList,
  isExpensive: (newValue: T, oldValue?: T) => boolean = () => true
): T {
  const lastValueRef = useRef<T>()
  const lastDepsRef = useRef<React.DependencyList>()

  return useMemo(() => {
    // Check if dependencies have actually changed
    const depsChanged = !lastDepsRef.current || 
      deps.length !== lastDepsRef.current.length ||
      deps.some((dep, index) => !Object.is(dep, lastDepsRef.current![index]))

    if (!depsChanged && lastValueRef.current !== undefined) {
      return lastValueRef.current
    }

    const newValue = factory()
    
    // Only update if the computation is actually expensive or value changed significantly
    if (lastValueRef.current === undefined || isExpensive(newValue, lastValueRef.current)) {
      lastValueRef.current = newValue
      lastDepsRef.current = deps
    }
    
    return lastValueRef.current
  }, deps)
}

// Memoized selector hook for complex state selections
export function useMemoizedSelector<T, R>(
  selector: (state: T) => R,
  state: T,
  equalityFn: (a: R, b: R) => boolean = Object.is
): R {
  const lastSelectedRef = useRef<R>()
  const lastStateRef = useRef<T>()

  return useMemo(() => {
    // Only recompute if state actually changed
    if (Object.is(state, lastStateRef.current) && lastSelectedRef.current !== undefined) {
      return lastSelectedRef.current
    }

    const newSelected = selector(state)
    
    // Only update if selected value actually changed
    if (lastSelectedRef.current === undefined || !equalityFn(newSelected, lastSelectedRef.current)) {
      lastSelectedRef.current = newSelected
      lastStateRef.current = state
    }
    
    return lastSelectedRef.current
  }, [state, selector, equalityFn])
}

// Throttled memoization for high-frequency updates
export function useThrottledMemo<T>(
  factory: () => T,
  deps: React.DependencyList,
  delay: number = 100
): T {
  const lastComputeTimeRef = useRef<number>(0)
  const lastValueRef = useRef<T>()
  const pendingTimeoutRef = useRef<NodeJS.Timeout>()

  return useMemo(() => {
    const now = Date.now()
    
    // If we have a cached value and haven't exceeded the throttle delay
    if (lastValueRef.current !== undefined && (now - lastComputeTimeRef.current) < delay) {
      // Schedule a delayed computation
      if (pendingTimeoutRef.current) {
        clearTimeout(pendingTimeoutRef.current)
      }
      
      pendingTimeoutRef.current = setTimeout(() => {
        lastValueRef.current = factory()
        lastComputeTimeRef.current = Date.now()
      }, delay)
      
      return lastValueRef.current
    }
    
    // Compute immediately if no cached value or throttle period has passed
    const newValue = factory()
    lastValueRef.current = newValue
    lastComputeTimeRef.current = now
    
    return newValue
  }, deps)
}

// Memoization with deep comparison for complex objects
export function useDeepMemo<T>(
  factory: () => T,
  deps: React.DependencyList
): T {
  const lastDepsRef = useRef<React.DependencyList>()
  const lastValueRef = useRef<T>()

  return useMemo(() => {
    // Deep comparison of dependencies
    const depsChanged = !lastDepsRef.current ||
      JSON.stringify(deps) !== JSON.stringify(lastDepsRef.current)

    if (!depsChanged && lastValueRef.current !== undefined) {
      return lastValueRef.current
    }

    const newValue = factory()
    lastValueRef.current = newValue
    lastDepsRef.current = [...deps] // Create a copy to avoid mutations
    
    return newValue
  }, [JSON.stringify(deps)]) // eslint-disable-line react-hooks/exhaustive-deps
}

// Stable callback that only updates when dependencies change
export function useStableCallback<T extends (...args: any[]) => any>(
  callback: T,
  deps: React.DependencyList
): T {
  const callbackRef = useRef<T>(callback)
  const stableCallbackRef = useRef<T>()

  // Update the callback reference when dependencies change
  useMemo(() => {
    callbackRef.current = callback
  }, deps)

  // Create stable callback only once
  if (!stableCallbackRef.current) {
    stableCallbackRef.current = ((...args: any[]) => {
      return callbackRef.current(...args)
    }) as T
  }

  return stableCallbackRef.current
}

// Memoized computation with background refresh
export function useBackgroundMemo<T>(
  factory: () => T | Promise<T>,
  deps: React.DependencyList,
  refreshInterval?: number
): { value: T | undefined; isLoading: boolean; error: Error | null } {
  const [state, setState] = useState<{
    value: T | undefined
    isLoading: boolean
    error: Error | null
  }>({ value: undefined, isLoading: true, error: null })

  const lastDepsRef = useRef<React.DependencyList>()
  const intervalRef = useRef<NodeJS.Timeout>()

  const computeValue = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }))
      const result = await Promise.resolve(factory())
      setState({ value: result, isLoading: false, error: null })
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: error instanceof Error ? error : new Error(String(error))
      }))
    }
  }, deps)

  // Compute on dependency change
  useEffect(() => {
    const depsChanged = !lastDepsRef.current ||
      deps.length !== lastDepsRef.current.length ||
      deps.some((dep, index) => !Object.is(dep, lastDepsRef.current![index]))

    if (depsChanged) {
      computeValue()
      lastDepsRef.current = [...deps]
    }
  }, deps)

  // Background refresh
  useEffect(() => {
    if (refreshInterval && refreshInterval > 0) {
      intervalRef.current = setInterval(computeValue, refreshInterval)
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
        }
      }
    }
  }, [refreshInterval, computeValue])

  return state
}