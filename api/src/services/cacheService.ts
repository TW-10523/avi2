/**
 * Cache Service - In-memory and optional Redis caching
 */

export interface CacheOptions {
  ttlSeconds?: number;
  namespace?: string;
}

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

class CacheService {
  private memoryCache: Map<string, CacheEntry<any>> = new Map();
  private defaultTTL = 300; // 5 minutes

  /**
   * Get value from cache
   */
  async get<T>(key: string, namespace?: string): Promise<T | null> {
    const fullKey = this.buildKey(key, namespace);
    
    // Check memory cache
    const entry = this.memoryCache.get(fullKey);
    if (entry) {
      if (Date.now() < entry.expiresAt) {
        return entry.value as T;
      }
      this.memoryCache.delete(fullKey);
    }

    return null;
  }

  /**
   * Set value in cache
   */
  async set<T>(key: string, value: T, options: CacheOptions = {}): Promise<void> {
    const { ttlSeconds = this.defaultTTL, namespace } = options;
    const fullKey = this.buildKey(key, namespace);
    
    this.memoryCache.set(fullKey, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  /**
   * Get or set with callback
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    const cached = await this.get<T>(key, options.namespace);
    if (cached !== null) {
      return cached;
    }

    const value = await factory();
    await this.set(key, value, options);
    return value;
  }

  /**
   * Delete from cache
   */
  async delete(key: string, namespace?: string): Promise<void> {
    const fullKey = this.buildKey(key, namespace);
    this.memoryCache.delete(fullKey);
  }

  /**
   * Clear all cache or by namespace
   */
  async clear(namespace?: string): Promise<void> {
    if (namespace) {
      const prefix = `${namespace}:`;
      for (const key of this.memoryCache.keys()) {
        if (key.startsWith(prefix)) {
          this.memoryCache.delete(key);
        }
      }
    } else {
      this.memoryCache.clear();
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; namespaces: string[] } {
    const namespaces = new Set<string>();
    for (const key of this.memoryCache.keys()) {
      const parts = key.split(':');
      if (parts.length > 1) {
        namespaces.add(parts[0]);
      }
    }
    return {
      size: this.memoryCache.size,
      namespaces: Array.from(namespaces),
    };
  }

  /**
   * Clean expired entries
   */
  cleanup(): number {
    let cleaned = 0;
    const now = Date.now();
    for (const [key, entry] of this.memoryCache.entries()) {
      if (now >= entry.expiresAt) {
        this.memoryCache.delete(key);
        cleaned++;
      }
    }
    return cleaned;
  }

  private buildKey(key: string, namespace?: string): string {
    return namespace ? `${namespace}:${key}` : key;
  }
}

// Export singleton
export const cacheService = new CacheService();

// Start cleanup interval
setInterval(() => {
  const cleaned = cacheService.cleanup();
  if (cleaned > 0) {
    console.log(`[Cache] Cleaned ${cleaned} expired entries`);
  }
}, 60000);

export default CacheService;
