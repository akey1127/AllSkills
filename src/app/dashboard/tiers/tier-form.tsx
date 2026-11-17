"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function TierForm() {
  const router = useRouter();
  const [name, setName] = useState("Supporter");
  const [description, setDescription] = useState("");
  const [amountDollars, setAmountDollars] = useState("9");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const amountCents = Math.round(parseFloat(amountDollars) * 100);
    const res = await fetch("/api/tiers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description, amountCents }),
    });
    const data = (await res.json()) as { error?: string };
    setLoading(false);
    if (!res.ok) {
      alert(data.error ?? "Failed");
      return;
    }
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 space-y-4 rounded-xl border border-zinc-200 bg-white p-4">
      <h2 className="font-semibold">Add tier</h2>
      <label className="block text-sm">
        Name
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5"
          required
        />
      </label>
      <label className="block text-sm">
        Description
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5"
        />
      </label>
      <label className="block text-sm">
        Price (USD / month)
        <input
          type="number"
          min={1}
          step={1}
          value={amountDollars}
          onChange={(e) => setAmountDollars(e.target.value)}
          className="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5"
          required
        />
      </label>
      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-zinc-900 px-4 py-2 text-sm text-white disabled:opacity-50"
      >
        {loading ? "Saving…" : "Create tier"}
      </button>
    </form>
  );
}
