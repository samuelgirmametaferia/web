import { redirect } from "next/navigation";

import { getSession } from "@/lib/session";
import { getRandomActiveGirl } from "@/lib/girlStore";
import { getUserById } from "@/lib/userStore";
import OnboardingSwipe from "./ui/OnboardingSwipe";

export const runtime = "nodejs";

export default async function OnboardingPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = await getUserById(session.userId);
  if (!user || !user.active) redirect("/login");
  if (user.hasCompletedOnboarding) redirect("/");

  const girl = await getRandomActiveGirl();
  if (!girl) {
    return (
      <div className="mx-auto max-w-md">
        <h1 className="text-2xl font-semibold">Onboarding</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          No girls available yet. Ask an admin to seed.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-2xl font-semibold">Onboarding</h1>
      <p className="mt-2 text-sm text-muted-foreground">Swipe right or left to continue.</p>

      <div className="mt-6">
        <OnboardingSwipe girlId={girl.id} girlName={girl.name} />
      </div>
    </div>
  );
}
