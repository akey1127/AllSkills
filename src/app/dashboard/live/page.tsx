import Link from "next/link";
import { redirect } from "next/navigation";
import { StartLiveButton } from "@/components/StartLiveButton";
import { createClient } from "@/lib/supabase/server";

export default async function LiveDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "creator") {
    return (
      <div className="mx-auto max-w-lg px-4 py-10">
        <p className="text-zinc-700">Become a creator to go live.</p>
        <Link href="/dashboard" className="mt-4 inline-block text-amber-800 underline">
          Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <Link href="/dashboard" className="text-sm text-amber-800 underline">
        ← Dashboard
      </Link>
      <h1 className="mt-4 text-2xl font-bold">Live</h1>
      <p className="mt-2 text-sm text-zinc-700">
        Opens a LiveKit room (configure LIVEKIT_* env vars). Subscribers-only streams
        require an active subscription to the creator.
      </p>
      <div className="mt-8 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <StartLiveButton />
      </div>
    </div>
  );
}
