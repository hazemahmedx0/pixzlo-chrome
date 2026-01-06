/**
 * Generic cache utility for background service operations.
 * Supports TTL-based expiration and in-flight request deduplication.
 */

interface CacheEntry<T> {
  data: T
  expiresAt: number
}

/**
 * Simple TTL-based cache implementation
 */
export class Cache<T> {
  private readonly cache = new Map<string, CacheEntry<T>>()
  private readonly defaultTtl: number

  constructor(defaultTtlMs: number = 5 * 60 * 1000) {
    this.defaultTtl = defaultTtlMs
  }

  /**
   * Gets a cached value if it exists and hasn't expired
   */
  get(key: string): T | undefined {
    const entry = this.cache.get(key)

    if (!entry) {
      return undefined
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      return undefined
    }

    return entry.data
  }

  /**
   * Sets a value in the cache with optional custom TTL
   */
  set(key: string, data: T, ttlMs?: number): void {
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + (ttlMs ?? this.defaultTtl)
    })
  }

  /**
   * Removes a value from the cache
   */
  delete(key: string): void {
    this.cache.delete(key)
  }

  /**
   * Clears all cached values
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * Checks if a key exists and hasn't expired
   */
  has(key: string): boolean {
    return this.get(key) !== undefined
  }
}

/**
 * Request deduplication utility to prevent duplicate in-flight requests.
 * Ensures only one request is made at a time for the same key.
 */
export class RequestDeduplicator<T> {
  private readonly inFlight = new Map<string, Promise<T>>()

  /**
   * Executes a request, deduplicating if one is already in flight for the same key
   */
  async execute(key: string, requestFn: () => Promise<T>): Promise<T> {
    // Return existing in-flight request if one exists
    const existing = this.inFlight.get(key)
    if (existing) {
      console.log(`📡 Reusing in-flight request for: ${key}`)
      return existing
    }

    // Create and track new request
    const request = requestFn()
    this.inFlight.set(key, request)

    try {
      const result = await request
      return result
    } finally {
      this.inFlight.delete(key)
    }
  }

  /**
   * Checks if a request is currently in flight
   */
  isInFlight(key: string): boolean {
    return this.inFlight.has(key)
  }
}

/**
 * Combined cache with request deduplication for optimal API performance
 */
export class CachedRequestHandler<T> {
  private readonly cache: Cache<T>
  private readonly deduplicator: RequestDeduplicator<T>

  constructor(cacheTtlMs: number = 5 * 60 * 1000) {
    this.cache = new Cache<T>(cacheTtlMs)
    this.deduplicator = new RequestDeduplicator<T>()
  }

  /**
   * Gets data from cache or fetches it, with request deduplication
   */
  async getOrFetch(key: string, fetchFn: () => Promise<T>): Promise<T> {
    // Check cache first
    const cached = this.cache.get(key)
    if (cached !== undefined) {
      console.log(`📋 Using cached data for: ${key}`)
      return cached
    }

    // Fetch with deduplication
    const result = await this.deduplicator.execute(key, async () => {
      const data = await fetchFn()
      this.cache.set(key, data)
      return data
    })

    return result
  }

  /**
   * Invalidates cache for a key
   */
  invalidate(key: string): void {
    this.cache.delete(key)
  }

  /**
   * Clears all cache entries
   */
  clear(): void {
    this.cache.clear()
  }
}
