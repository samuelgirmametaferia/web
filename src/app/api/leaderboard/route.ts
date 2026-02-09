import { isRedisConfigured } from "@/lib/redis";
import { getSession } from "@/lib/session";
import { getLeaderboard } from "@/lib/girlStore";

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

  const leaderboard = await getLeaderboard(50);
  return Response.json({ ok: true, leaderboard });
}
