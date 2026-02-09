import { getRedis } from "@/lib/redis";
import { weekKeyNow } from "@/lib/weekKey";

export const WEEKLY_POINTS_BUDGET = 20;

const WEEK_KEY_TTL_SECONDS = 60 * 60 * 24 * 60; // 60 days
const ACTION_LOG_TTL_SECONDS = 60 * 60 * 24 * 60; // 60 days
const ACTION_LOG_TRIM = 500;

function pointsSpentKey(userId: string, weekKey: string) {
  return `user:${userId}:week:${weekKey}:points_spent_abs`;
}

function pointsActionKey(userId: string, weekKey: string) {
  return `actions:points:user:${userId}:week:${weekKey}`;
}

export type WeeklyPointsStatus = {
  weekKey: string;
  budget: number;
  spentAbs: number;
  remaining: number;
};

export async function getWeeklyPointsStatus(userId: string, weekKey = weekKeyNow()): Promise<WeeklyPointsStatus> {
  const redis = getRedis();
  const raw = await redis.get<number | string | null>(pointsSpentKey(userId, weekKey));
  const spentAbs = Math.max(0, Number(raw ?? 0) || 0);
  const remaining = Math.max(0, WEEKLY_POINTS_BUDGET - spentAbs);
  return { weekKey, budget: WEEKLY_POINTS_BUDGET, spentAbs, remaining };
}

type ApplyPointsResultOk = {
  ok: true;
  weekKey: string;
  budget: number;
  remaining: number;
};

type ApplyPointsResultErr = {
  ok: false;
  error: "BUDGET_EXCEEDED";
  weekKey: string;
  budget: number;
  remaining: number;
};

export type ApplyPointsResult = ApplyPointsResultOk | ApplyPointsResultErr;

const APPLY_POINTS_LUA = `
local spentKey = KEYS[1]
local leaderboardKey = KEYS[2]
local actionKey = KEYS[3]

local girlId = ARGV[1]
local delta = tonumber(ARGV[2])
local absDelta = tonumber(ARGV[3])
local maxBudget = tonumber(ARGV[4])
local actionJson = ARGV[5]
local spentTtl = tonumber(ARGV[6])
local logTtl = tonumber(ARGV[7])
local trim = tonumber(ARGV[8])

local spent = tonumber(redis.call('GET', spentKey) or '0')
local remaining = maxBudget - spent

if absDelta > remaining then
  return {0, remaining}
end

redis.call('INCRBY', spentKey, absDelta)
redis.call('EXPIRE', spentKey, spentTtl)
redis.call('ZINCRBY', leaderboardKey, delta, girlId)
redis.call('RPUSH', actionKey, actionJson)
redis.call('LTRIM', actionKey, -trim, -1)
redis.call('EXPIRE', actionKey, logTtl)

local newRemaining = remaining - absDelta
return {1, newRemaining}
`;

function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);
  return Number(value);
}

export async function applyWeeklyPointsDelta(params: {
  userId: string;
  girlId: string;
  delta: number;
  now?: Date;
}): Promise<ApplyPointsResult> {
  const { userId, girlId } = params;
  const delta = params.delta;
  const weekKey = weekKeyNow(params.now);

  const absDelta = Math.abs(delta);
  if (!Number.isFinite(delta) || !Number.isInteger(delta) || absDelta === 0) {
    throw new Error("Invalid delta");
  }

  const redis = getRedis();

  const action = {
    type: "points" as const,
    girlId,
    delta,
    weekKey,
    at: Date.now(),
  };

  const keys = [pointsSpentKey(userId, weekKey), "girls:leaderboard", pointsActionKey(userId, weekKey)];
  const args: string[] = [
    girlId,
    String(delta),
    String(absDelta),
    String(WEEKLY_POINTS_BUDGET),
    JSON.stringify(action),
    String(WEEK_KEY_TTL_SECONDS),
    String(ACTION_LOG_TTL_SECONDS),
    String(ACTION_LOG_TRIM),
  ];

  const result = await redis.eval<string[], [number | string, number | string]>(APPLY_POINTS_LUA, keys, args);
  const allowed = toNumber(result?.[0]) === 1;
  const remaining = Math.max(0, toNumber(result?.[1]));

  if (!allowed) {
    return { ok: false, error: "BUDGET_EXCEEDED", weekKey, budget: WEEKLY_POINTS_BUDGET, remaining };
  }

  return { ok: true, weekKey, budget: WEEKLY_POINTS_BUDGET, remaining };
}
