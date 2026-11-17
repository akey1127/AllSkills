import Link from "next/link";
import { redirect } from "next/navigation";
import { ConnectStripeButton } from "@/components/ConnectStripeButton";
import { createClient } from "@/lib/supabase/server";
import { becomeCreatorAction } from "./actions";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, handle, role, trade_tags")
    .eq("id", user.id)
    .single();

  const { data: ca } = await supabase
    .from("creator_accounts")
    .select("charges_enabled, stripe_account_id, payouts_enabled")
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: tiers } = await supabase
    .from("subscription_tiers")
    .select("id, name, amount_cents, active")
    .eq("creator_id", user.id);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-bold text-zinc-900">Dashboard</h1>
      <p className="mt-1 text-zinc-700">
        Signed in as {profile?.display_name ?? user.email} (@{profile?.handle})
      </p>

      <section className="mt-10 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Creator profile</h2>
        <p className="mt-2 text-sm text-zinc-700">
          Switch to creator to publish posts and set up payouts.
        </p>
        {profile?.role !== "creator" ? (
          <form action={becomeCreatorAction} className="mt-4">
            <button
              type="submit"
              className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-500"
            >
              Become a creator
            </button>
          </form>
        ) : (
          <p className="mt-3 text-sm text-emerald-700">You are on a creator account.</p>
        )}
        <p className="mt-4 text-sm">
          <Link href={`/c/${profile?.handle}`} className="text-amber-800 underline">
            View public page
          </Link>
        </p>
      </section>

      <section className="mt-8 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Stripe Connect</h2>
        {ca?.charges_enabled ? (
          <p className="mt-2 text-sm text-emerald-700">
            Payouts enabled. Account {ca.stripe_account_id}
          </p>
        ) : (
          <ConnectStripeButton />
        )}
      </section>

      <section className="mt-8 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Subscription tiers</h2>
        <ul className="mt-3 list-inside list-disc text-sm text-zinc-700">
          {(tiers ?? []).map((t) => (
            <li key={t.id}>
              {t.name} — ${(t.amount_cents / 100).toFixed(2)}/mo
              {!t.active ? " (inactive)" : ""}
            </li>
          ))}
        </ul>
        {profile?.role === "creator" && ca?.charges_enabled ? (
          <Link
            href="/dashboard/tiers"
            className="mt-4 inline-block text-sm font-medium text-amber-800 underline"
          >
            Add or manage tiers
          </Link>
        ) : (
          <p className="mt-3 text-sm text-zinc-600">Complete Stripe to add paid tiers.</p>
        )}
      </section>

      <section className="mt-8 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Content</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/dashboard/posts/new"
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
          >
            New post
          </Link>
          <Link
            href="/dashboard/live"
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800"
          >
            Go live
          </Link>
        </div>
      </section>
    </div>
  );
}
