import { getRedis } from "@/lib/redis";

export type GirlRecord = {
  id: string;
  name: string;
  active: boolean;
  score: number;
};

function parseBool01(value: unknown): boolean {
  return value === "1" || value === 1 || value === true;
}

export async function getGirlById(girlId: string): Promise<Omit<GirlRecord, "score"> | null> {
  const redis = getRedis();
  const data = await redis.hgetall<Record<string, string>>(`girl:${girlId}`);
  if (!data || Object.keys(data).length === 0) return null;

  return {
    id: data.id ?? girlId,
    name: data.name ?? "",
    active: parseBool01(data.active),
  };
}

export async function getRandomActiveGirl(tries = 10): Promise<Omit<GirlRecord, "score"> | null> {
  let redis;
  try {
    redis = getRedis();
  } catch {
    return null;
  }

  for (let i = 0; i < tries; i++) {
    const id = await redis.srandmember<string>("girls:ids");
    if (!id) return null;
    const girl = await getGirlById(id);
    if (girl?.active) return girl;
  }

  return null;
}

export async function getLeaderboard(limit = 50): Promise<GirlRecord[]> {
  let redis;
  try {
    redis = getRedis();
  } catch {
    return [];
  }

  // zrange with scores, highest first
  const items = await redis.zrange<string[]>("girls:leaderboard", 0, limit - 1, {
    rev: true,
    withScores: true,
  });

  // Upstash returns an array like: [member1, score1, member2, score2, ...]
  const result: GirlRecord[] = [];
  for (let i = 0; i < items.length; i += 2) {
    const member = items[i] as unknown as string;
    const scoreRaw = items[i + 1] as unknown as number;
    const score = typeof scoreRaw === "number" ? scoreRaw : Number(scoreRaw);

    const girl = await getGirlById(member);
    if (!girl || !girl.active) continue;

    result.push({ ...girl, score });
  }

  return result;
}
