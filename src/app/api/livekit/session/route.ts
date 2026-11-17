import { NextResponse } from "next/server";
import { RoomServiceClient } from "livekit-server-sdk";
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

  const body = await request.json();
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const access = body.access === "public" ? "public" : "subscribers";

  if (!title) {
    return NextResponse.json({ error: "title required" }, { status: 400 });
  }

  const roomName = `live_${user.id.replace(/-/g, "").slice(0, 12)}_${Date.now()}`;

  const roomService = new RoomServiceClient(url, apiKey, apiSecret);
  await roomService.createRoom({ name: roomName, emptyTimeout: 60 * 30 });

  const { data: row, error } = await supabase
    .from("live_sessions")
    .insert({
      creator_id: user.id,
      room_name: roomName,
      title,
      access,
      started_at: new Date().toISOString(),
    })
    .select("id, room_name")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ session: row });
}
