import { readFile } from "node:fs/promises";
import path from "node:path";

import { getRedis, isRedisConfigured } from "@/lib/redis";
import { girlsSchema, guysSchema } from "@/lib/seedSchemas";

export const runtime = "nodejs";

function requireAdmin(request: Request) {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) {
    return { ok: false, error: "ADMIN_SECRET is not set" } as const;
  }

  const auth = request.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) {
    return { ok: false, error: "Missing Bearer token" } as const;
  }

  const token = auth.slice("Bearer ".length);
  if (token !== secret) {
    return { ok: false, error: "Invalid token" } as const;
  }

  return { ok: true } as const;
}

async function readSeedJson(relativePathFromWebRoot: string): Promise<unknown> {
  const absolutePath = path.join(process.cwd(), relativePathFromWebRoot);
  const raw = await readFile(absolutePath, "utf-8");
  return JSON.parse(raw) as unknown;
}

export async function POST(request: Request) {
  const admin = requireAdmin(request);
  if (!admin.ok) {
    return Response.json({ ok: false, error: admin.error }, { status: 401 });
  }

  if (!isRedisConfigured()) {
    return Response.json(
      {
        ok: false,
        error: "Redis is not configured. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.",
      },
      { status: 500 },
    );
  }

  const redis = getRedis();

  const guysRaw = await readSeedJson(path.join("data", "guys.json"));
  const girlsRaw = await readSeedJson(path.join("data", "girls.json"));

  const guys = guysSchema.parse(guysRaw);
  const girls = girlsSchema.parse(girlsRaw);

  // Users
  for (const guy of guys) {
    await redis.hset(`user:${guy.id}`, {
      id: guy.id,
      firstName: guy.firstName,
      lastName: guy.lastName ?? "",
      active: (guy.active ?? true) ? "1" : "0",
      hasCompletedOnboarding: "0",
    });
    await redis.sadd("users:ids", guy.id);
  }

  // Girls + leaderboard zset
  for (const girl of girls) {
    await redis.hset(`girl:${girl.id}`, {
      id: girl.id,
      name: girl.name,
      active: (girl.active ?? true) ? "1" : "0",
    });
    await redis.sadd("girls:ids", girl.id);

    const existingScore = await redis.zscore("girls:leaderboard", girl.id);
    if (existingScore === null) {
      await redis.zadd("girls:leaderboard", { score: 0, member: girl.id });
    }
  }

  return Response.json({ ok: true, usersSeeded: guys.length, girlsSeeded: girls.length });
}
