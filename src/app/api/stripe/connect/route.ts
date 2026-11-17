import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const origin = new URL(request.url).origin;
  const returnUrl =
    typeof body.returnUrl === "string" ? body.returnUrl : `${origin}/dashboard`;
  const refreshUrl =
    typeof body.refreshUrl === "string" ? body.refreshUrl : `${origin}/dashboard`;

  const stripe = getStripe();
  const admin = createServiceClient();

  const { data: existing } = await admin
    .from("creator_accounts")
    .select("stripe_account_id")
    .eq("user_id", user.id)
    .maybeSingle();

  let accountId = existing?.stripe_account_id;

  if (!accountId) {
    const account = await stripe.accounts.create({
      type: "express",
      country: process.env.STRIPE_DEFAULT_COUNTRY ?? "US",
      email: user.email ?? undefined,
      metadata: { user_id: user.id },
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
    });
    accountId = account.id;
    await admin.from("creator_accounts").upsert({
      user_id: user.id,
      stripe_account_id: accountId,
    });
  }

  const link = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: refreshUrl,
    return_url: returnUrl,
    type: "account_onboarding",
  });

  return NextResponse.json({ url: link.url });
}
