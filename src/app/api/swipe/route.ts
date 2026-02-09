import { z } from "zod";

import { isRedisConfigured } from "@/lib/redis";
import { getSession } from "@/lib/session";
import { getGirlById } from "@/lib/girlStore";
import { applySwipe } from "@/lib/swipeScore";
import { setUserOnboardingComplete } from "@/lib/userStore";

export const runtime = "nodejs";

const bodySchema = z.object({
  girlId: z.string().min(1),
  direction: z.enum(["right", "left"]),
  source: z.enum(["onboarding"]).optional(),
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

  const session = await getSession();
  if (!session) {
    return Response.json({ ok: false, error: "Not logged in" }, { status: 401 });
  }

  const body = bodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return Response.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }

  const girl = await getGirlById(body.data.girlId);
  if (!girl || !girl.active) {
    return Response.json({ ok: false, error: "Girl not found" }, { status: 404 });
  }

  const result = await applySwipe({
    userId: session.userId,
    girlId: body.data.girlId,
    direction: body.data.direction,
  });

  if (body.data.source === "onboarding") {
    await setUserOnboardingComplete(session.userId);
  }

  return Response.json({ ok: true, delta: result.delta });
}
