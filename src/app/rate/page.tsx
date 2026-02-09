import { redirect } from "next/navigation";

import { getSession } from "@/lib/session";
import { getUserById } from "@/lib/userStore";
import RateGirlSearch from "./ui/RateGirlSearch";

export const runtime = "nodejs";

export default async function RatePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = await getUserById(session.userId);
  if (!user || !user.active) redirect("/login");
  if (!user.hasCompletedOnboarding) redirect("/onboarding");

  return (
    <div>
      <h1 className="text-2xl font-semibold">Rate Her</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Select a girl and allocate weekly points (positive or negative).
      </p>
      <div className="mt-6">
        <RateGirlSearch />
      </div>
    </div>
  );
}
