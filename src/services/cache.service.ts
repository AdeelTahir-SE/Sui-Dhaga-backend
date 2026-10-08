interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

class CacheService {
  private cache = new Map<string, CacheEntry<unknown>>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Run cleanup every 2 minutes
    this.cleanupInterval = setInterval(() => {
      this.evictExpired();
    }, 2 * 60 * 1000);

    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }

  /**
   * Retrieve an item from cache if not expired.
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.value as T;
  }

  /**
   * Set an item in cache with a TTL (default 60 seconds).
   */
  set<T>(key: string, value: T, ttlSeconds = 60): void {
    const expiresAt = Date.now() + Math.max(1, ttlSeconds) * 1000;
    this.cache.set(key, { value, expiresAt });
  }

  /**
   * Delete a specific key.
   */
  del(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Invalidate all keys matching a prefix or pattern.
   * Example: delByPattern('tailors:*') or delByPattern(/^tailor:123/)
   */
  delByPattern(pattern: string | RegExp): number {
    let deletedCount = 0;
    const regex =
      typeof pattern === "string"
        ? new RegExp("^" + pattern.replace(/\*/g, ".*") + "$")
        : pattern;

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        deletedCount++;
      }
    }

    return deletedCount;
  }

  /**
   * Clear the entire cache.
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Evict all expired entries.
   */
  private evictExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }
}

export const cacheService = new CacheService();
