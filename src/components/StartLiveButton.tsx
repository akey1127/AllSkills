"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function StartLiveButton() {
  const router = useRouter();
  const [title, setTitle] = useState("Live stream");
  const [access, setAccess] = useState<"public" | "subscribers">("subscribers");
  const [loading, setLoading] = useState(false);

  async function start() {
    setLoading(true);
    const res = await fetch("/api/livekit/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, access }),
    });
    const data = (await res.json()) as {
      session?: { id: string };
      error?: string;
    };
    setLoading(false);
    if (data.session?.id) {
      router.push(`/live/${data.session.id}`);
      return;
    }
    alert(data.error ?? "Could not start live session");
  }

  return (
    <div className="space-y-4">
      <label className="block text-sm">
        Title
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5"
        />
      </label>
      <label className="block text-sm">
        Access
        <select
          value={access}
          onChange={(e) =>
            setAccess(e.target.value as "public" | "subscribers")
          }
          className="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5"
        >
          <option value="subscribers">Subscribers only</option>
          <option value="public">Public</option>
        </select>
      </label>
      <button
        type="button"
        disabled={loading}
        onClick={start}
        className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-50"
      >
        {loading ? "Starting…" : "Start live room"}
      </button>
    </div>
  );
}
