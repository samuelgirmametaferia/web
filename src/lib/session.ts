import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";

import { getRedis } from "@/lib/redis";

const SESSION_COOKIE = "rateher_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

export type SessionData = {
  userId: string;
  createdAt: number;
};

export function sessionCookieName() {
  return SESSION_COOKIE;
}

export async function createSession(userId: string) {
  const redis = getRedis();
  const token = randomBytes(32).toString("hex");
  const createdAt = Date.now();

  await redis.set(`session:${token}`, { userId, createdAt }, { ex: SESSION_TTL_SECONDS });

  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function deleteSession() {
  const redis = getRedis();
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;

  if (token) {
    await redis.del(`session:${token}`);
  }

  jar.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export async function getSession(): Promise<SessionData | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  let redis;
  try {
    redis = getRedis();
  } catch {
    return null;
  }

  const data = await redis.get<SessionData>(`session:${token}`);
  return data ?? null;
}
