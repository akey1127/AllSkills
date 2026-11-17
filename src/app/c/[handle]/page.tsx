import { notFound } from "next/navigation";
import { CreatorSupport } from "@/components/CreatorSupport";
import { PostCard, type FeedRow } from "@/components/PostCard";
import { createClient } from "@/lib/supabase/server";

type PageProps = { params: Promise<{ handle: string }> };

export default async function CreatorPage({ params }: PageProps) {
  const { handle } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile, error: pErr } = await supabase
    .from("profiles")
    .select("id, display_name, handle, bio, trade_tags, role")
    .eq("handle", handle)
    .single();

  if (pErr || !profile) notFound();

  const { data: feed, error: fErr } = await supabase.rpc("creator_feed", {
    p_handle: handle,
    p_viewer: user?.id ?? null,
  });

  if (fErr) {
    console.error(fErr);
  }

  const rows = (feed ?? []) as FeedRow[];

  const { data: tierRows } = await supabase
    .from("subscription_tiers")
    .select("id, name, amount_cents")
    .eq("creator_id", profile.id)
    .eq("active", true)
    .order("sort_order", { ascending: true });

  const { data: ca } = await supabase
    .from("creator_accounts")
    .select("charges_enabled")
    .eq("user_id", profile.id)
    .maybeSingle();

  const showMonetization = ca?.charges_enabled && (tierRows?.length ?? 0) > 0;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <header className="border-b border-zinc-200 pb-8">
        <p className="text-sm font-medium uppercase tracking-wide text-amber-800">
          Creator
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-zinc-900">
          {profile.display_name}
        </h1>
        <p className="text-zinc-600">@{profile.handle}</p>
        {profile.bio ? (
          <p className="mt-4 text-zinc-700">{profile.bio}</p>
        ) : null}
        {profile.trade_tags && profile.trade_tags.length > 0 ? (
          <ul className="mt-4 flex flex-wrap gap-2">
            {profile.trade_tags.map((t: string) => (
              <li
                key={t}
                className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs text-zinc-700"
              >
                {t}
              </li>
            ))}
          </ul>
        ) : null}

        {user && user.id !== profile.id && showMonetization && tierRows && (
          <div className="mt-8">
            <CreatorSupport creatorId={profile.id} tiers={tierRows} />
          </div>
        )}
      </header>

      <section className="mt-10 flex flex-col gap-8">
        <h2 className="text-lg font-semibold text-zinc-900">Posts</h2>
        {rows.length === 0 ? (
          <p className="text-zinc-600">No posts yet.</p>
        ) : (
          rows.map((row) => <PostCard key={row.post_id} row={row} />)
        )}
      </section>
    </div>
  );
}
