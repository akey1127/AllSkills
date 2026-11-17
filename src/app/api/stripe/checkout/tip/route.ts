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

  const body = await request.json();
  const creatorId = typeof body.creatorId === "string" ? body.creatorId : null;
  const amountCents =
    typeof body.amountCents === "number" ? body.amountCents : parseInt(body.amountCents, 10);

  if (!creatorId || !amountCents || amountCents < 100) {
    return NextResponse.json(
      { error: "creatorId and amountCents (min 100) required" },
      { status: 400 },
    );
  }

  const { data: acct } = await supabase
    .from("creator_accounts")
    .select("stripe_account_id, charges_enabled")
    .eq("user_id", creatorId)
    .single();

  if (!acct?.charges_enabled || !acct.stripe_account_id) {
    return NextResponse.json({ error: "Creator not ready for payments" }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("handle")
    .eq("id", creatorId)
    .single();

  const origin = new URL(request.url).origin;
  const stripe = getStripe();
  const fee = Math.round((amountCents * PLATFORM_FEE_PERCENT) / 100);

  const session = await stripe.checkout.sessions.create(
    {
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: amountCents,
            product_data: {
              name: "Tip",
            },
          },
          quantity: 1,
        },
      ],
      payment_intent_data: {
        application_fee_amount: fee,
        metadata: {
          type: "tip",
          fan_user_id: user.id,
          creator_id: creatorId,
        },
      },
      metadata: {
        type: "tip",
        fan_user_id: user.id,
        creator_id: creatorId,
      },
      success_url: `${origin}/c/${profile?.handle ?? "unknown"}?tip=success`,
      cancel_url: `${origin}/c/${profile?.handle ?? "unknown"}?tip=cancel`,
    },
    { stripeAccount: acct.stripe_account_id },
  );

  return NextResponse.json({ url: session.url });
}
