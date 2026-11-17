"use client";

import { useState } from "react";

type Tier = {
  id: string;
  name: string;
  amount_cents: number;
};

export function CreatorSupport({
  creatorId,
  tiers,
}: {
  creatorId: string;
  tiers: Tier[];
}) {
  const [tipOpen, setTipOpen] = useState(false);
  const [tipAmount, setTipAmount] = useState("500");
  const [loading, setLoading] = useState<string | null>(null);

  async function subscribe(tierId: string) {
    setLoading(`sub-${tierId}`);
    const res = await fetch("/api/stripe/checkout/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tierId }),
    });
    const data = (await res.json()) as { url?: string; error?: string };
    setLoading(null);
    if (data.url) globalThis.location.assign(data.url);
    else alert(data.error ?? "Checkout failed");
  }

  async function tip() {
    const cents = parseInt(tipAmount, 10);
    if (!Number.isFinite(cents) || cents < 100) {
      alert("Minimum tip $1.00");
      return;
    }
    setLoading("tip");
    const res = await fetch("/api/stripe/checkout/tip", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ creatorId, amountCents: cents }),
    });
    const data = (await res.json()) as { url?: string; error?: string };
    setLoading(null);
    setTipOpen(false);
    if (data.url) globalThis.location.assign(data.url);
    else alert(data.error ?? "Tip failed");
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {tiers.map((t) => (
        <button
          key={t.id}
          type="button"
          disabled={loading !== null}
          onClick={() => subscribe(t.id)}
          className="rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-500 disabled:opacity-50"
        >
          Subscribe · {t.name} (${(t.amount_cents / 100).toFixed(0)}/mo)
        </button>
      ))}
      <button
        type="button"
        onClick={() => setTipOpen(!tipOpen)}
        className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
      >
        Tip
      </button>
      {tipOpen && (
        <div className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 p-2">
          <label className="text-xs text-zinc-700">
            USD (cents)
            <input
              type="number"
              min={100}
              step={50}
              value={tipAmount}
              onChange={(e) => setTipAmount(e.target.value)}
              className="ml-1 w-24 rounded border border-zinc-300 px-2 py-1 text-sm"
            />
          </label>
          <button
            type="button"
            disabled={loading !== null}
            onClick={() => tip()}
            className="rounded bg-zinc-900 px-2 py-1 text-xs text-white"
          >
            Pay
          </button>
        </div>
      )}
    </div>
  );
}

export function PpvUnlockButton({ postId }: { postId: string }) {
  const [loading, setLoading] = useState(false);
  async function unlock() {
    setLoading(true);
    const res = await fetch("/api/stripe/checkout/ppv", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postId }),
    });
    const data = (await res.json()) as { url?: string; error?: string };
    setLoading(false);
    if (data.url) globalThis.location.assign(data.url);
    else alert(data.error ?? "Checkout failed");
  }
  return (
    <button
      type="button"
      disabled={loading}
      onClick={unlock}
      className="mt-2 rounded-lg bg-zinc-900 px-3 py-1.5 text-sm text-white hover:bg-zinc-800"
    >
      {loading ? "…" : "Unlock this post"}
    </button>
  );
}
