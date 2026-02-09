import { Redis } from "@upstash/redis";

let redisSingleton: Redis | null = null;

export function isRedisConfigured(): boolean {
	return Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

export function getRedis(): Redis {
	if (!isRedisConfigured()) {
		throw new Error("Redis is not configured. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.");
	}
	if (!redisSingleton) {
		redisSingleton = Redis.fromEnv();
	}
	return redisSingleton;
}
