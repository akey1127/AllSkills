import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LiveRoom } from "./live-room";

type Props = { params: Promise<{ sessionId: string }> };

export default async function LiveSessionPage({ params }: Props) {
  const { sessionId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return (
      <div className="mx-auto max-w-lg px-4 py-10">
        <p className="text-zinc-700">Sign in to watch or broadcast.</p>
        <Link href="/auth/login" className="mt-4 inline-block text-amber-800 underline">
          Sign in
        </Link>
      </div>
    );
  }

  const { data: session } = await supabase
    .from("live_sessions")
    .select("id, title, creator_id, ended_at")
    .eq("id", sessionId)
    .single();

  if (!session || session.ended_at) notFound();

  const isCreator = session.creator_id === user.id;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Link href="/dashboard/live" className="text-sm text-amber-800 underline">
        ← Live dashboard
      </Link>
      <h1 className="mt-4 text-2xl font-bold">{session.title}</h1>
      <div className="mt-8">
        <LiveRoom sessionId={sessionId} isCreator={isCreator} />
      </div>
    </div>
  );
}
