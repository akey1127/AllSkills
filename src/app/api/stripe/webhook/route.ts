import { headers } from "next/headers";
import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { createServiceClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.text();
  const sig = (await headers()).get("stripe-signature");
  const whSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!sig || !whSecret) {
    return NextResponse.json({ error: "Missing webhook secret" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, sig, whSecret);
  } catch (err) {
    console.error("Stripe webhook signature failed", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = createServiceClient();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const meta = session.metadata ?? {};
        const mode = session.mode;

        if (mode === "subscription") {
          const fanId = meta.fan_user_id;
          const creatorId = meta.creator_id;
          const tierId = meta.tier_id;
          const subId =
            typeof session.subscription === "string"
              ? session.subscription
              : session.subscription?.id;

          if (!fanId || !creatorId || !tierId || !subId) {
            console.warn("checkout.session.completed subscription missing metadata", meta);
            break;
          }

          const stripe = getStripe();
          const acct = meta.stripe_account_id;
          const subRaw = acct
            ? await stripe.subscriptions.retrieve(
                subId,
                { expand: ["items.data"] },
                { stripeAccount: acct },
              )
            : await stripe.subscriptions.retrieve(subId, { expand: ["items.data"] });
          const sub = subRaw as Stripe.Subscription;
          const periodEnd =
            sub.items?.data?.[0]?.current_period_end ?? null;

          await supabase.from("subscriptions").upsert(
            {
              fan_id: fanId,
              creator_id: creatorId,
              tier_id: tierId,
              stripe_subscription_id: sub.id,
              status: sub.status,
              current_period_end: periodEnd
                ? new Date(periodEnd * 1000).toISOString()
                : null,
            },
            { onConflict: "fan_id,creator_id" },
          );
        }

        if (mode === "payment") {
          const kind = meta.type;
          if (kind === "ppv") {
            const fanId = meta.fan_user_id;
            const postId = meta.post_id;
            const amount = session.amount_total ?? 0;
            if (!fanId || !postId) break;

            await supabase.from("purchases").upsert(
              {
                fan_id: fanId,
                post_id: postId,
                stripe_checkout_session_id: session.id,
                amount_cents: amount,
              },
              { onConflict: "fan_id,post_id" },
            );
          }
          if (kind === "tip") {
            const fanId = meta.fan_user_id;
            const creatorId = meta.creator_id;
            const amount = session.amount_total ?? 0;
            if (!fanId || !creatorId) break;

            const { data: existingTip } = await supabase
              .from("tips")
              .select("id")
              .eq("stripe_checkout_session_id", session.id)
              .maybeSingle();
            if (!existingTip) {
              await supabase.from("tips").insert({
                fan_id: fanId,
                creator_id: creatorId,
                amount_cents: amount,
                stripe_checkout_session_id: session.id,
              });
            }
          }
        }
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const periodEnd =
          subscription.items?.data?.[0]?.current_period_end ?? null;
        const stripeAccount =
          typeof event.account === "string" ? event.account : undefined;

        const subRow = await supabase
          .from("subscriptions")
          .select("id")
          .eq("stripe_subscription_id", subscription.id)
          .maybeSingle();

        if (!subRow.data?.id) {
          break;
        }

        const status =
          subscription.status === "canceled" || subscription.status === "unpaid"
            ? "canceled"
            : subscription.status;

        await supabase
          .from("subscriptions")
          .update({
            status,
            current_period_end: periodEnd
              ? new Date(periodEnd * 1000).toISOString()
              : null,
          })
          .eq("stripe_subscription_id", subscription.id);

        if (stripeAccount) {
          /* Connected account events include account id */
        }
        break;
      }
      case "account.updated": {
        const account = event.data.object as Stripe.Account;
        const userId = account.metadata?.user_id;
        if (!userId) break;

        await supabase.from("creator_accounts").upsert(
          {
            user_id: userId,
            stripe_account_id: account.id,
            charges_enabled: account.charges_enabled ?? false,
            payouts_enabled: account.payouts_enabled ?? false,
            details_submitted: account.details_submitted ?? false,
          },
          { onConflict: "user_id" },
        );

        if (account.charges_enabled) {
          await supabase
            .from("profiles")
            .update({ role: "creator" })
            .eq("id", userId);
        }
        break;
      }
      default:
        break;
    }
  } catch (e) {
    console.error("Webhook handler error", e);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
