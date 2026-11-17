"use client";

import MuxPlayer from "@mux/mux-player-react";
import { PpvUnlockButton } from "@/components/CreatorSupport";

export type FeedRow = {
  post_id: string;
  title: string;
  body: string;
  preview_text: string | null;
  visibility: "public" | "subscribers" | "ppv";
  price_cents: number | null;
  mux_playback_id: string | null;
  is_unlocked: boolean;
  created_at: string;
};

export function PostCard({ row }: { row: FeedRow }) {
  return (
    <article className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <h2 className="text-lg font-semibold text-zinc-900">{row.title}</h2>
        <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-700">
          {row.visibility}
        </span>
      </div>
      <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-zinc-700">
        {row.body}
      </p>
      {row.mux_playback_id && row.is_unlocked ? (
        <div className="mt-4 overflow-hidden rounded-lg border border-zinc-200 bg-black">
          <MuxPlayer
            playbackId={row.mux_playback_id}
            streamType="on-demand"
            style={{ width: "100%", aspectRatio: "16/9" }}
          />
        </div>
      ) : row.mux_playback_id && !row.is_unlocked ? (
        <p className="mt-3 text-sm italic text-zinc-600">Video locked — unlock to watch.</p>
      ) : null}
      {!row.is_unlocked && row.visibility === "ppv" && (
        <div className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-950">
          <p>
            Pay-per-view ·{" "}
            {row.price_cents != null
              ? `$${(row.price_cents / 100).toFixed(2)}`
              : "priced"}
          </p>
          <PpvUnlockButton postId={row.post_id} />
        </div>
      )}
      {!row.is_unlocked && row.visibility === "subscribers" && (
        <p className="mt-3 text-sm text-amber-800">Subscribe to see this post.</p>
      )}
      <time className="mt-4 block text-xs text-zinc-500" dateTime={row.created_at}>
        {new Date(row.created_at).toLocaleString()}
      </time>
    </article>
  );
}
