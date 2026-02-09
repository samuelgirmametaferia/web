import { getRedis } from "@/lib/redis";

export type SwipeAction = {
  type: "swipe";
  userId: string;
  girlId: string;
  direction: "right" | "left";
  delta: number;
  weekKey: string;
  ts: number;
};

export async function logSwipeAction(action: SwipeAction) {
  const redis = getRedis();

  // Per-user weekly log (easy to query for budgets / analytics)
  const weekListKey = `actions:swipe:user:${action.userId}:week:${action.weekKey}`;

  // Keep newest at the end (chronological)
  await redis.rpush(weekListKey, JSON.stringify(action));

  // Retain only a reasonable amount of history
  await redis.ltrim(weekListKey, -500, -1);

  // Auto-expire logs after ~6 months
  await redis.expire(weekListKey, 60 * 60 * 24 * 180);
}
