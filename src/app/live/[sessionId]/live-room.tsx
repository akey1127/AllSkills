"use client";

import { Room, RoomEvent, Track } from "livekit-client";
import { useEffect, useRef, useState } from "react";

export function LiveRoom({
  sessionId,
  isCreator,
}: {
  sessionId: string;
  isCreator: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState("connecting");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let room: Room | undefined;

    async function run() {
      try {
        const res = await fetch("/api/livekit/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        });
        const data = (await res.json()) as {
          token?: string;
          url?: string;
          error?: string;
        };
        if (!res.ok || !data.token || !data.url) {
          setError(data.error ?? "Could not join");
          setStatus("error");
          return;
        }

        room = new Room();
        await room.connect(data.url, data.token);
        setStatus("connected");

        if (isCreator) {
          await room.localParticipant.setCameraEnabled(true);
          await room.localParticipant.setMicrophoneEnabled(true);
        }

        room.on(RoomEvent.TrackSubscribed, (track) => {
          if (track.kind === Track.Kind.Video || track.kind === Track.Kind.Audio) {
            const el = track.attach();
            el.style.width = "100%";
            el.style.maxHeight = "480px";
            containerRef.current?.appendChild(el);
          }
        });
      } catch (e) {
        console.error(e);
        setError(e instanceof Error ? e.message : "Connection failed");
        setStatus("error");
      }
    }

    run();

    return () => {
      room?.disconnect();
    };
  }, [sessionId, isCreator]);

  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-700">
        Status: {status}
        {isCreator ? " (you are broadcasting)" : ""}
      </p>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div
        ref={containerRef}
        className="min-h-[200px] rounded-lg border border-zinc-200 bg-black/90"
      />
    </div>
  );
}
