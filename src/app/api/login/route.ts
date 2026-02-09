import { z } from "zod";

import { isRedisConfigured } from "@/lib/redis";
import { deterministicPassword8 } from "@/lib/password";
import { createSession } from "@/lib/session";
import { getUserById } from "@/lib/userStore";

export const runtime = "nodejs";

const bodySchema = z.object({
  userId: z.preprocess(
    (v) => (typeof v === "string" ? v.trim() : v),
    z.string().min(1),
  ),
  password: z.preprocess(
    (v) => (typeof v === "string" ? v.trim() : v),
    z.string().regex(/^\d{8}$/),
  ),
});

export async function POST(request: Request) {
  if (!isRedisConfigured()) {
    return Response.json(
      {
        ok: false,
        error: "Server is not configured (missing Redis env vars)",
      },
      { status: 500 },
    );
  }

  const body = bodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return Response.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }

  const user = await getUserById(body.data.userId);
  if (!user || !user.active) {
    return Response.json({ ok: false, error: "Invalid credentials" }, { status: 401 });
  }

  const expected = deterministicPassword8(user.firstName);
  if (body.data.password !== expected) {
    return Response.json({ ok: false, error: "Invalid credentials" }, { status: 401 });
  }

  await createSession(user.id);

  return Response.json({
    ok: true,
    needsOnboarding: !user.hasCompletedOnboarding,
  });
}
