"use client";

import { useState } from "react";

export default function OnboardingSwipe({
  girlId,
  girlName,
}: {
  girlId: string;
  girlName: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function swipe(direction: "right" | "left") {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/swipe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ girlId, direction, source: "onboarding" }),
      });

      const json = (await res.json()) as { ok: boolean; error?: string };
      if (!json.ok) {
        setError(json.error ?? "Swipe failed");
        return;
      }

      window.location.href = "/";
    } catch {
      setError("Swipe failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-lg border p-4">
      <div className="text-sm text-muted-foreground">Rate:</div>
      <div className="mt-1 text-lg font-semibold">{girlName}</div>

      {error ? <div className="mt-3 text-sm text-red-600">{error}</div> : null}

      <div className="mt-4 grid grid-cols-2 gap-3">
        <button
          type="button"
          disabled={loading}
          onClick={() => swipe("left")}
          className="rounded-md border px-4 py-2 disabled:opacity-50"
        >
          Swipe Left
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={() => swipe("right")}
          className="rounded-md bg-black px-4 py-2 text-white disabled:opacity-50"
        >
          Swipe Right
        </button>
      </div>

      <div className="mt-3 text-xs text-muted-foreground">You must swipe once to continue.</div>
    </div>
  );
}
