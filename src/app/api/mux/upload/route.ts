import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getMux } from "@/lib/mux";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { postId } = await request.json();
  if (!postId || typeof postId !== "string") {
    return NextResponse.json({ error: "postId required" }, { status: 400 });
  }

  const { data: post, error } = await supabase
    .from("posts")
    .select("id, creator_id")
    .eq("id", postId)
    .single();

  if (error || !post || post.creator_id !== user.id) {
    return NextResponse.json({ error: "Not your post" }, { status: 403 });
  }

  const origin =
    process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin;

  const mux = getMux();
  const upload = await mux.video.uploads.create({
    cors_origin: origin,
    new_asset_settings: {
      playback_policy: ["public"],
      passthrough: JSON.stringify({ post_id: postId }),
    },
  });

  return NextResponse.json({
    uploadId: upload.id,
    url: upload.url,
  });
}
