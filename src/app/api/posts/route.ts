import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "creator") {
    return NextResponse.json({ error: "Creator role required" }, { status: 403 });
  }

  const body = await request.json();
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const textBody = typeof body.body === "string" ? body.body : "";
  const previewText =
    typeof body.previewText === "string" ? body.previewText.trim() : null;
  const visibility = body.visibility as "public" | "subscribers" | "ppv";
  const priceCents =
    visibility === "ppv"
      ? typeof body.priceCents === "number"
        ? body.priceCents
        : parseInt(body.priceCents, 10)
      : null;

  if (!title) {
    return NextResponse.json({ error: "title required" }, { status: 400 });
  }
  if (!["public", "subscribers", "ppv"].includes(visibility)) {
    return NextResponse.json({ error: "invalid visibility" }, { status: 400 });
  }
  if (visibility === "ppv" && (!priceCents || priceCents < 50)) {
    return NextResponse.json(
      { error: "PPV posts need priceCents (min 50)" },
      { status: 400 },
    );
  }

  const { data: post, error } = await supabase
    .from("posts")
    .insert({
      creator_id: user.id,
      title,
      body: textBody,
      preview_text: previewText,
      visibility,
      price_cents: priceCents,
      published: body.published === true,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ post });
}
