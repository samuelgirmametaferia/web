"use client";

import { useMemo, useState } from "react";

type GuySeed = {
  id: string;
  firstName: string;
  lastName?: string;
  active?: boolean;
};

export default function LoginForm() {
  const guys = useMemo(() => {
    // Loaded from a static file bundled with the app.
    // This avoids needing DB reads just to render the login form.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const data = require("../../../../data/guys.json") as GuySeed[];
    return data.filter((g) => g.active !== false);
  }, []);

  const [userId, setUserId] = useState(guys[0]?.id ?? "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId, password }),
      });

      const json = (await res.json()) as { ok: boolean; error?: string; needsOnboarding?: boolean };
      if (!json.ok) {
        setError(json.error ?? "Login failed");
        return;
      }

      window.location.href = json.needsOnboarding ? "/onboarding" : "/";
    } catch {
      setError("Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium">Name</label>
        <select
          className="mt-1 w-full rounded-md border px-3 py-2"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
        >
          {guys.map((g) => (
            <option key={g.id} value={g.id}>
              {g.firstName} {g.lastName ?? ""}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-sm font-medium">Password (8 digits)</label>
        <input
          className="mt-1 w-full rounded-md border px-3 py-2"
          type="text"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="00000000"
        />
      </div>

      {error ? <div className="text-sm text-red-600">{error}</div> : null}

      <button
        type="submit"
        disabled={loading || !userId || password.length !== 8}
        className="w-full rounded-md bg-black px-4 py-2 text-white disabled:opacity-50"
      >
        {loading ? "Signing in..." : "Sign in"}
      </button>

      <div className="text-xs text-muted-foreground">
        If you haven’t run the seed yet, ask an admin.
      </div>
    </form>
  );
}
