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

  const { postId } = await request.json();
  if (!postId || typeof postId !== "string") {
    return NextResponse.json({ error: "postId required" }, { status: 400 });
  }

  const { data: post, error: postErr } = await supabase
    .from("posts")
    .select("id, creator_id, price_cents, title, visibility, published")
    .eq("id", postId)
    .single();

  if (postErr || !post || post.visibility !== "ppv" || !post.published) {
    return NextResponse.json({ error: "Invalid post" }, { status: 400 });
  }

  if (!post.price_cents) {
    return NextResponse.json({ error: "Post not priced" }, { status: 400 });
  }

  const { data: acct } = await supabase
    .from("creator_accounts")
    .select("stripe_account_id, charges_enabled")
    .eq("user_id", post.creator_id)
    .single();

  if (!acct?.charges_enabled || !acct.stripe_account_id) {
    return NextResponse.json({ error: "Creator not ready for payments" }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("handle")
    .eq("id", post.creator_id)
    .single();

  const origin = new URL(request.url).origin;
  const stripe = getStripe();
  const fee = Math.round((post.price_cents * PLATFORM_FEE_PERCENT) / 100);

  const session = await stripe.checkout.sessions.create(
    {
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: post.price_cents,
            product_data: {
              name: `Unlock: ${post.title}`,
            },
          },
          quantity: 1,
        },
      ],
      payment_intent_data: {
        application_fee_amount: fee,
        metadata: {
          type: "ppv",
          post_id: post.id,
          fan_user_id: user.id,
          creator_id: post.creator_id,
        },
      },
      metadata: {
        type: "ppv",
        post_id: post.id,
        fan_user_id: user.id,
        creator_id: post.creator_id,
      },
      success_url: `${origin}/c/${profile?.handle ?? "unknown"}?ppv=success`,
      cancel_url: `${origin}/c/${profile?.handle ?? "unknown"}?ppv=cancel`,
    },
    { stripeAccount: acct.stripe_account_id },
  );

  return NextResponse.json({ url: session.url });
}
