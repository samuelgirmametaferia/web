import { redirect } from "next/navigation";

import { getSession } from "@/lib/session";
import { getLeaderboard } from "@/lib/girlStore";
import { getUserById } from "@/lib/userStore";

export const runtime = "nodejs";

export default async function Home() {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = await getUserById(session.userId);
  if (!user || !user.active) redirect("/login");
  if (!user.hasCompletedOnboarding) redirect("/onboarding");

  const leaderboard = await getLeaderboard(50);

  return (
    <div>
      <h1 className="text-2xl font-semibold">Leaderboard</h1>
      <div className="mt-4 overflow-hidden rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr className="text-left">
              <th className="px-4 py-2">#</th>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Points</th>
            </tr>
          </thead>
          <tbody>
            {leaderboard.length === 0 ? (
              <tr>
                <td className="px-4 py-3 text-muted-foreground" colSpan={3}>
                  No girls found. Ask an admin to seed.
                </td>
              </tr>
            ) : (
              leaderboard.map((g, idx) => (
                <tr key={g.id} className="border-t">
                  <td className="px-4 py-3">{idx + 1}</td>
                  <td className="px-4 py-3">{g.name}</td>
                  <td className="px-4 py-3">{g.score}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
