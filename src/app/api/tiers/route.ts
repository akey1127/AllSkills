import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const creatorId = searchParams.get("creatorId");
  if (!creatorId) {
    return NextResponse.json({ error: "creatorId required" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("subscription_tiers")
    .select("id, name, description, amount_cents, active, sort_order")
    .eq("creator_id", creatorId)
    .eq("active", true)
    .order("sort_order", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ tiers: data ?? [] });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const description =
    typeof body.description === "string" ? body.description.trim() : "";
  const amountCents =
    typeof body.amountCents === "number"
      ? body.amountCents
      : parseInt(body.amountCents, 10);

  if (!name || !amountCents || amountCents < 100) {
    return NextResponse.json(
      { error: "name and amountCents (min 100) required" },
      { status: 400 },
    );
  }

  const { data: acct, error: acctErr } = await supabase
    .from("creator_accounts")
    .select("stripe_account_id, charges_enabled")
    .eq("user_id", user.id)
    .single();

  if (acctErr || !acct?.stripe_account_id || !acct.charges_enabled) {
    return NextResponse.json(
      { error: "Finish Stripe Connect onboarding first" },
      { status: 400 },
    );
  }

  const stripe = getStripe();
  const product = await stripe.products.create(
    { name: `${name} (All-Skills)`, description: description || undefined },
    { stripeAccount: acct.stripe_account_id },
  );

  const price = await stripe.prices.create(
    {
      currency: "usd",
      unit_amount: amountCents,
      recurring: { interval: "month" },
      product: product.id,
    },
    { stripeAccount: acct.stripe_account_id },
  );

  const { data: tier, error: insertErr } = await supabase
    .from("subscription_tiers")
    .insert({
      creator_id: user.id,
      name,
      description,
      amount_cents: amountCents,
      stripe_price_id: price.id,
    })
    .select("id, name, description, amount_cents, stripe_price_id")
    .single();

  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  return NextResponse.json({ tier });
}
