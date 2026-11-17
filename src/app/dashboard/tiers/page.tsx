import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TierForm } from "./tier-form";

export default async function TiersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: ca } = await supabase
    .from("creator_accounts")
    .select("charges_enabled")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!ca?.charges_enabled) {
    return (
      <div className="mx-auto max-w-lg px-4 py-10">
        <p className="text-zinc-700">Finish Stripe Connect first.</p>
        <Link href="/dashboard" className="mt-4 inline-block text-amber-800 underline">
          Back to dashboard
        </Link>
      </div>
    );
  }

  const { data: tiers } = await supabase
    .from("subscription_tiers")
    .select("id, name, amount_cents, active")
    .eq("creator_id", user.id)
    .order("sort_order", { ascending: true });

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <Link href="/dashboard" className="text-sm text-amber-800 underline">
        ← Dashboard
      </Link>
      <h1 className="mt-4 text-2xl font-bold">Subscription tiers</h1>
      <ul className="mt-6 space-y-2 text-sm text-zinc-700">
        {(tiers ?? []).map((t) => (
          <li key={t.id} className="rounded-lg border border-zinc-200 bg-white px-3 py-2">
            {t.name} — ${(t.amount_cents / 100).toFixed(2)}/mo
          </li>
        ))}
      </ul>
      <TierForm />
    </div>
  );
}
