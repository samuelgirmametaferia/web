import { getRedis } from "@/lib/redis";
import { weekKeyNow } from "@/lib/weekKey";

export const runtime = "nodejs";

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;

  // If no secret is configured, allow only if Vercel Cron header is present.
  // (Safer default in production is to set CRON_SECRET.)
  const vercelCronHeader = request.headers.get("x-vercel-cron");

  if (!secret) {
    return vercelCronHeader === "1";
  }

  const auth = request.headers.get("authorization") ?? "";
  if (auth.toLowerCase() === `bearer ${secret}`.toLowerCase()) return true;
  return vercelCronHeader === "1";
}

type ZRangeWithScores = Array<string | number>;

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const redis = getRedis();
  const weekKey = weekKeyNow();

  const lockKey = `decay:week:${weekKey}:lock`;
  const lock = await redis.set(lockKey, "in_progress", { nx: true, ex: 60 * 60 });
  if (!lock) {
    return Response.json({ ok: true, skipped: true, reason: "Already ran (lock exists)", weekKey });
  }

  // Percent decay model: score = round(score * 0.90)
  const decayFactor = 0.9;

  const items = await redis.zrange<ZRangeWithScores>("girls:leaderboard", 0, -1, {
    withScores: true,
  });

  let updated = 0;
  for (let i = 0; i < items.length; i += 2) {
    const member = String(items[i]);
    const scoreRaw = items[i + 1];
    const score = typeof scoreRaw === "number" ? scoreRaw : Number(scoreRaw);
    if (!Number.isFinite(score)) continue;

    const newScore = Math.round(score * decayFactor);
    const delta = newScore - score;
    if (delta === 0) continue;

    await redis.zincrby("girls:leaderboard", delta, member);
    updated++;
  }

  // Mark completed (long TTL) so it won't re-run this week.
  await redis.set(lockKey, "done", { ex: 60 * 60 * 24 * 60 });

  return Response.json({ ok: true, weekKey, decayFactor, updated });
}
