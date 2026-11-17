"use client";

import { useState } from "react";

export function ConnectStripeButton() {
  const [loading, setLoading] = useState(false);
  return (
    <button
      type="button"
      disabled={loading}
      onClick={async () => {
        setLoading(true);
        const res = await fetch("/api/stripe/connect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
        const data = (await res.json()) as { url?: string; error?: string };
        setLoading(false);
        if (data.url) window.location.href = data.url;
        else alert(data.error ?? "Could not start Stripe");
      }}
      className="mt-4 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
    >
      {loading ? "Opening Stripe…" : "Connect Stripe payouts"}
    </button>
  );
}
