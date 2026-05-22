import { cacheGet, cacheSet } from "@/lib/redis";

export interface CacheClient {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown, ttlSeconds?: number): Promise<void>;
}

class UnifiedCacheClient implements CacheClient {
  async get<T>(key: string): Promise<T | null> {
    return cacheGet<T>(key);
  }

  async set(key: string, value: unknown, ttlSeconds = 300): Promise<void> {
    await cacheSet(key, value, ttlSeconds);
  }
}

export const cache: CacheClient = new UnifiedCacheClient();
