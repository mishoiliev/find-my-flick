// Simple in-memory cache for client-side API responses
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

class SimpleCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private defaultTTL: number = 5 * 60 * 1000; // 5 minutes default

  set<T>(key: string, data: T, ttl?: number): void {
    const now = Date.now();
    const expiresAt = now + (ttl || this.defaultTTL);
    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt,
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) {
      return false;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  clear(): void {
    this.cache.clear();
  }

  // Clean up expired entries
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }
}

// Export singleton instance
export const cache = new SimpleCache();

// Cleanup expired entries every 10 minutes
if (typeof window !== 'undefined') {
  setInterval(() => {
    cache.cleanup();
  }, 10 * 60 * 1000);
}

// Cache key generators
export function getSearchCacheKey(query: string, page: number = 1): string {
  return `search:${query.toLowerCase().trim()}:${page}`;
}

export function getShowDetailsCacheKey(
  id: number,
  mediaType: 'movie' | 'tv'
): string {
  return `show:${mediaType}:${id}`;
}

export function getWatchProvidersCacheKey(
  id: number,
  mediaType: 'movie' | 'tv',
  countryCode: string
): string {
  return `providers:${mediaType}:${id}:${countryCode}`;
}

export function getPopularShowsCacheKey(): string {
  return 'popular:shows';
}

export function getPopularActorsCacheKey(): string {
  return 'popular:actors';
}
