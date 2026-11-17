import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe, PLATFORM_FEE_PERCENT } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { tierId } = await request.json();
  if (!tierId || typeof tierId !== "string") {
    return NextResponse.json({ error: "tierId required" }, { status: 400 });
  }

  const { data: tier, error: tierErr } = await supabase
    .from("subscription_tiers")
    .select("id, creator_id, stripe_price_id, name, active")
    .eq("id", tierId)
    .single();

  if (tierErr || !tier?.stripe_price_id || !tier.active) {
    return NextResponse.json({ error: "Invalid tier" }, { status: 400 });
  }

  const { data: acct } = await supabase
    .from("creator_accounts")
    .select("stripe_account_id, charges_enabled")
    .eq("user_id", tier.creator_id)
    .single();

  if (!acct?.charges_enabled || !acct.stripe_account_id) {
    return NextResponse.json({ error: "Creator not ready for payments" }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("handle, id")
    .eq("id", tier.creator_id)
    .single();

  const origin = new URL(request.url).origin;
  const stripe = getStripe();

  const session = await stripe.checkout.sessions.create(
    {
      mode: "subscription",
      line_items: [{ price: tier.stripe_price_id, quantity: 1 }],
      success_url: `${origin}/c/${profile?.handle ?? "unknown"}?sub=success`,
      cancel_url: `${origin}/c/${profile?.handle ?? "unknown"}?sub=cancel`,
      client_reference_id: user.id,
      metadata: {
        fan_user_id: user.id,
        creator_id: tier.creator_id,
        tier_id: tier.id,
        stripe_account_id: acct.stripe_account_id,
      },
      subscription_data: {
        application_fee_percent: PLATFORM_FEE_PERCENT,
        metadata: {
          fan_user_id: user.id,
          creator_id: tier.creator_id,
          tier_id: tier.id,
        },
      },
    },
    { stripeAccount: acct.stripe_account_id },
  );

  return NextResponse.json({ url: session.url });
}
