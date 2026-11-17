import { NextResponse } from "next/server";
import { AccessToken } from "livekit-server-sdk";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const url = process.env.LIVEKIT_URL;
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  if (!url || !apiKey || !apiSecret) {
    return NextResponse.json(
      { error: "LiveKit is not configured" },
      { status: 503 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { sessionId } = await request.json();
  if (!sessionId || typeof sessionId !== "string") {
    return NextResponse.json({ error: "sessionId required" }, { status: 400 });
  }

  const { data: session, error: sErr } = await supabase
    .from("live_sessions")
    .select("id, room_name, creator_id, access, ended_at")
    .eq("id", sessionId)
    .single();

  if (sErr || !session || session.ended_at) {
    return NextResponse.json({ error: "Invalid session" }, { status: 400 });
  }

  const isCreator = session.creator_id === user.id;
  let canJoin = isCreator;

  if (!isCreator && session.access === "public") {
    canJoin = true;
  }
  if (!isCreator && session.access === "subscribers") {
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("id")
      .eq("fan_id", user.id)
      .eq("creator_id", session.creator_id)
      .in("status", ["active", "trialing", "past_due"])
      .maybeSingle();
    canJoin = !!sub;
  }

  if (!canJoin) {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }

  const at = new AccessToken(apiKey, apiSecret, {
    identity: user.id,
    name: user.email ?? user.id,
  });
  at.addGrant({
    room: session.room_name,
    roomJoin: true,
    canPublish: isCreator,
    canSubscribe: true,
  });

  const token = await at.toJwt();

  const wsUrl = url.startsWith("https://")
    ? `wss://${url.slice("https://".length)}`
    : url.startsWith("http://")
      ? `ws://${url.slice("http://".length)}`
      : url;

  return NextResponse.json({
    token,
    url: wsUrl,
    roomName: session.room_name,
  });
}
