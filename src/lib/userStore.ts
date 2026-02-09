import { getRedis } from "@/lib/redis";

export type UserRecord = {
  id: string;
  firstName: string;
  lastName: string;
  active: boolean;
  hasCompletedOnboarding: boolean;
};

function parseBool01(value: unknown): boolean {
  return value === "1" || value === 1 || value === true;
}

export async function getUserById(userId: string): Promise<UserRecord | null> {
  let redis;
  try {
    redis = getRedis();
  } catch {
    return null;
  }
  const data = await redis.hgetall<Record<string, string>>(`user:${userId}`);
  if (!data || Object.keys(data).length === 0) return null;

  return {
    id: data.id ?? userId,
    firstName: data.firstName ?? "",
    lastName: data.lastName ?? "",
    active: parseBool01(data.active),
    hasCompletedOnboarding: parseBool01(data.hasCompletedOnboarding),
  };
}

export async function listUserIds(): Promise<string[]> {
  let redis;
  try {
    redis = getRedis();
  } catch {
    return [];
  }
  const ids = await redis.smembers<string[]>("users:ids");
  return Array.isArray(ids) ? ids : [];
}

export async function setUserOnboardingComplete(userId: string): Promise<void> {
  const redis = getRedis();
  await redis.hset(`user:${userId}`, { hasCompletedOnboarding: "1" });
}
