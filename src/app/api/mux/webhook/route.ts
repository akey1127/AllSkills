import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { getMux } from "@/lib/mux";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const raw = await request.text();
  const hdrs = Object.fromEntries((await headers()).entries());
  const mux = getMux({ webhook: true });

  type MuxAsset = {
    id?: string;
    playback_ids?: { id: string }[];
    passthrough?: string | null;
  };
  type MuxEvent = {
    type: string;
    object?: MuxAsset & { type?: string };
    data?: { object?: MuxAsset };
  };

  let event: MuxEvent;
  try {
    event = mux.webhooks.unwrap(raw, hdrs) as MuxEvent;
  } catch (e) {
    console.error("Mux webhook verify failed", e);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type !== "video.asset.ready") {
    return NextResponse.json({ received: true });
  }

  const asset = event.object ?? event.data?.object;
  if (!asset?.id) {
    return NextResponse.json({ received: true });
  }

  let postId: string | undefined;
  try {
    const rawPass = asset.passthrough;
    if (rawPass) {
      const parsed = JSON.parse(rawPass) as { post_id?: string };
      postId = parsed.post_id;
    }
  } catch {
    /* ignore */
  }

  if (!postId) {
    return NextResponse.json({ received: true });
  }

  const playbackId = asset.playback_ids?.[0]?.id ?? null;
  const supabase = createServiceClient();

  await supabase
    .from("posts")
    .update({
      mux_asset_id: asset.id,
      mux_playback_id: playbackId,
    })
    .eq("id", postId);

  return NextResponse.json({ received: true });
}
