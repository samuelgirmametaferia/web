import { isRedisConfigured } from "@/lib/redis";
import { getSession } from "@/lib/session";
import { getWeeklyPointsStatus } from "@/lib/pointsBudget";
import { getUserById } from "@/lib/userStore";

export const runtime = "nodejs";

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

  const user = await getUserById(session.userId);
  if (!user || !user.active) {
    return Response.json({ ok: false, error: "Not logged in" }, { status: 401 });
  }

  const weeklyPoints = await getWeeklyPointsStatus(session.userId);

  return Response.json({
    ok: true,
    user: {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      hasCompletedOnboarding: user.hasCompletedOnboarding,
    },
    weeklyPoints,
  });
}

