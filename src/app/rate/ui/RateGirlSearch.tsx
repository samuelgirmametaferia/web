"use client";

import { useMemo, useState } from "react";

type GirlSeed = {
  id: string;
  name: string;
  active?: boolean;
};

export default function RateGirlSearch() {
  const girls = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const data = require("../../../../data/girls.json") as GirlSeed[];
    return data.filter((g) => g.active !== false);
  }, []);

  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedGirlId, setSelectedGirlId] = useState<string | null>(null);
  const [delta, setDelta] = useState<string>("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return girls;
    return girls.filter((g) => g.name.toLowerCase().includes(q));
  }, [girls, query]);

  const selected = useMemo(() => {
    if (!selectedGirlId) return null;
    return girls.find((g) => g.id === selectedGirlId) ?? null;
  }, [girls, selectedGirlId]);

  async function submitPoints() {
    setError(null);

    if (!selectedGirlId) {
      setError("Select a girl");
      return;
    }

    const parsed = Number(delta);
    if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) {
      setError("Enter an integer delta");
      return;
    }
    if (parsed === 0) {
      setError("Delta must not be 0");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/points", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ girlId: selectedGirlId, delta: parsed }),
      });
      const json = (await res.json()) as { ok: boolean; error?: string; remaining?: number };
      if (!json.ok) {
        if (typeof json.remaining === "number") {
          setError(`${json.error ?? "Submission failed"}. Remaining this week: ${json.remaining}`);
        } else {
          setError(json.error ?? "Submission failed");
        }
        return;
      }

      setDelta("");
    } catch {
      setError("Submission failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium">Search</label>
        <input
          className="mt-1 w-full rounded-md border px-3 py-2"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Type a name..."
        />
      </div>

      {error ? <div className="text-sm text-red-600">{error}</div> : null}

      <div className="rounded-lg border p-4">
        <div className="text-sm font-medium">Selected</div>
        <div className="mt-1 text-sm text-muted-foreground">
          {selected ? selected.name : "None"}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <div>
            <label className="text-sm font-medium">Points (delta)</label>
            <input
              className="mt-1 w-full rounded-md border px-3 py-2"
              value={delta}
              onChange={(e) => setDelta(e.target.value)}
              placeholder="e.g. 5 or -3"
              inputMode="numeric"
            />
          </div>
          <button
            type="button"
            disabled={loading}
            onClick={submitPoints}
            className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            Submit
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr className="text-left">
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Select</th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 50).map((g) => (
              <tr key={g.id} className="border-t">
                <td className="px-4 py-3">{g.name}</td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => setSelectedGirlId(g.id)}
                    className="rounded-md border px-3 py-1 disabled:opacity-50"
                  >
                    Select
                  </button>
                </td>
              </tr>
            ))}

            {filtered.length === 0 ? (
              <tr>
                <td className="px-4 py-3 text-muted-foreground" colSpan={2}>
                  No matches.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="text-xs text-muted-foreground">
        Showing up to 50 results.
      </div>
    </div>
  );
}

