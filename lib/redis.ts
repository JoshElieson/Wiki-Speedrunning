import { Redis as UpstashRedis } from "@upstash/redis";
import Redis from "ioredis";

const globalForCache = globalThis as unknown as {
  inMemoryCache?: Map<string, string>;
};

const memoryCache = globalForCache.inMemoryCache ?? new Map<string, string>();
if (!globalForCache.inMemoryCache) {
  globalForCache.inMemoryCache = memoryCache;
}

let redisClient: Redis | null = null;
let upstashClient: UpstashRedis | null = null;

if (process.env.REDIS_URL) {
  redisClient = new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: 2 });
}

if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  upstashClient = new UpstashRedis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
}

function deserializeCachedValue<T>(value: unknown): T | null {
  if (value == null) {
    return null;
  }

  if (typeof value === "string") {
    if (value === "[object Object]") {
      console.warn("[redis] Ignoring corrupted cache entry stored as [object Object].");
      return null;
    }

    try {
      return JSON.parse(value) as T;
    } catch (error) {
      console.warn("[redis] Failed to deserialize cached value.", error);
      return null;
    }
  }

  return value as T;
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  if (redisClient) {
    const value = await redisClient.get(key);
    return value ? deserializeCachedValue<T>(value) : null;
  }

  if (upstashClient) {
    const value = await upstashClient.get(key);
    return value != null ? deserializeCachedValue<T>(value) : null;
  }

  const value = memoryCache.get(key);
  return value ? deserializeCachedValue<T>(value) : null;
}

export async function cacheSet(key: string, value: unknown, ttlSeconds = 300): Promise<void> {
  const serialized = JSON.stringify(value);

  if (redisClient) {
    await redisClient.set(key, serialized, "EX", ttlSeconds);
    return;
  }

  if (upstashClient) {
    await upstashClient.set(key, serialized, { ex: ttlSeconds });
    return;
  }

  memoryCache.set(key, serialized);
  setTimeout(() => memoryCache.delete(key), ttlSeconds * 1000).unref?.();
}
