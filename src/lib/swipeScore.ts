import { getRedis } from "@/lib/redis";
import { logSwipeAction } from "@/lib/actionLog";
import { weekKeyNow } from "@/lib/weekKey";

export type SwipeDirection = "right" | "left";

export async function applySwipe({
  userId,
  girlId,
  direction,
}: {
  userId: string;
  girlId: string;
  direction: SwipeDirection;
}): Promise<{ delta: number; weekKey: string; firstTimeForGirl: boolean }> {
  const redis = getRedis();
  const weekKey = weekKeyNow();

  const directionMultiplier = direction === "right" ? 1 : -1;

  const ratedSetKey = `user:${userId}:ratedGirls`;
  const countKey = `user:${userId}:week:${weekKey}:ratings_count`;

  const [hasRated, currentCount] = await Promise.all([
    redis.sismember(ratedSetKey, girlId),
    redis.get<number>(countKey),
  ]);

  const completedRatingsThisWeek = typeof currentCount === "number" ? currentCount : 0;
  const firstTimeForGirl = !hasRated;

  const base = 2;
  const r = Math.min(1.5, 1.0 + completedRatingsThisWeek / 50);
  const b = firstTimeForGirl ? 1.25 : 1.0;
  const magnitude = Math.round(base * r * b);
  const delta = magnitude * directionMultiplier;

  // Apply updates
  await Promise.all([
    redis.zincrby("girls:leaderboard", delta, girlId),
    redis.sadd(ratedSetKey, girlId),
    redis.incr(countKey),
    // Keep counters from growing forever
    redis.expire(countKey, 60 * 60 * 24 * 90),
  ]);

  await logSwipeAction({
    type: "swipe",
    userId,
    girlId,
    direction,
    delta,
    weekKey,
    ts: Date.now(),
  });

  return { delta, weekKey, firstTimeForGirl };
}
