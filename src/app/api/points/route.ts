import { z } from "zod";

import { isRedisConfigured } from "@/lib/redis";
import { getSession } from "@/lib/session";
import { getGirlById } from "@/lib/girlStore";
import { applyWeeklyPointsDelta, getWeeklyPointsStatus } from "@/lib/pointsBudget";

export const runtime = "nodejs";

const bodySchema = z.object({
  girlId: z.string().min(1),
  delta: z
    .number()
    .int()
    .refine((n) => n !== 0, { message: "Delta must not be 0" })
    .refine((n) => Math.abs(n) <= 20, { message: "Delta out of bounds" }),
});

export async function GET() {
  if (!isRedisConfigured()) {
    return Response.json(
      {
        ok: false,
        error: "Server is not configured (missing Redis env vars)",
      },
      { status: 500 },
    );
  }

  const session = await getSession();
  if (!session) {
    return Response.json({ ok: false, error: "Not logged in" }, { status: 401 });
  }

  const status = await getWeeklyPointsStatus(session.userId);
  return Response.json({ ok: true, ...status });
}

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

  const session = await getSession();
  if (!session) {
    return Response.json({ ok: false, error: "Not logged in" }, { status: 401 });
  }

  const body = bodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return Response.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }

  const { girlId, delta } = body.data;
  // Note: Weekly budget enforcement also caps abs(delta) by remaining,
  // but we validate bounds here to keep inputs sensible.

  const girl = await getGirlById(girlId);
  if (!girl || !girl.active) {
    return Response.json({ ok: false, error: "Girl not found" }, { status: 404 });
  }

  const result = await applyWeeklyPointsDelta({ userId: session.userId, girlId, delta });
  if (!result.ok) {
    return Response.json(
      {
        ok: false,
        error: "Weekly budget exceeded",
        remaining: result.remaining,
        budget: result.budget,
        weekKey: result.weekKey,
      },
      { status: 400 },
    );
  }

  return Response.json({ ok: true, delta, remaining: result.remaining, budget: result.budget, weekKey: result.weekKey });
}
