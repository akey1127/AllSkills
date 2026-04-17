# All-Skills — product spec (MVP)

## Roles

- **Fan**: browses public creator profiles, subscribes to tiers, purchases PPV posts, sends tips, participates in forums (where allowed).
- **Creator**: completes Stripe Connect onboarding, sets subscription tiers and prices, publishes posts (free or PPV), uploads video, moderates their space.

## User journeys

### Fan: subscribe to a creator

1. Land on `/c/[handle]` (public profile: bio, trade tags, preview of free content).
2. Click **Subscribe**, choose a tier (monthly). Stripe Checkout (Connect) collects payment.
3. Webhook `customer.subscription.*` updates `subscriptions` and entitlements; fan sees full subscriber feed.
4. Renewal: Stripe invoices; webhook keeps `current_period_end` in sync; access ends if payment fails after grace (Stripe settings).

### Fan: unlock PPV post

1. See locked post card (title/teaser/thumbnail only).
2. Click **Unlock** → Checkout Session (mode `payment`, metadata: `post_id`, `fan_user_id`).
3. Webhook `checkout.session.completed` creates `purchases` row and content entitlement.
4. Post body and playback token become available.

### Fan: send a tip

1. From creator profile or post → **Tip** → Checkout Session (one-time payment to connected account with application fee).
2. Webhook records `tips` for analytics/receipts; optional thank-you UI.

### Creator: onboarding

1. Sign up (Supabase Auth).
2. Choose **Become a creator** → collect display name, handle, trade specialties.
3. Redirect to **Stripe Connect Express** onboarding (link from API).
4. After `account.updated` (charges_enabled), creator can set paid tiers and publish paid content.

### Creator: post with optional PPV

1. Create post: title, body, visibility (`public` | `subscribers` | `ppv`).
2. Attach video via Mux direct upload; store `mux_asset_id` / `playback_id` when ready.
3. Set PPV price in cents if visibility is `ppv`.

## Entitlement rules

| Content visibility | Required access |
|-------------------|-----------------|
| `public` | Anyone |
| `subscribers` | Active subscription to that creator (`subscriptions.status = active` and `current_period_end` > now) |
| `ppv` | Purchase row for `post_id` **or** active subscription if creator enables “PPV included in tier” (MVP: **purchase OR sub** — implement as purchase OR active sub for simplicity) |

**MVP rule for `ppv`**: Fan must have `purchases` where `post_id` matches **or** valid `subscriptions` to that creator (creator may bundle: optional flag `ppv_included_in_sub` on post default false).

Actually plan says PPV is one-time purchase - I'll use: PPV requires purchase OR optional `subscribers` tier that includes all PPV - simplest MVP: **ppv** = must purchase unless `subscription_includes_ppv` on tier (complex). Simpler: **ppv** posts require explicit `purchase`; subscribers still see non-PPV subscriber posts.

So:

- `public`: all
- `subscribers`: active subscription
- `ppv`: purchase record OR (optional future) tier flag — **MVP: purchase only for ppv posts**

## Refunds and chargebacks

- **Subscriptions**: Follow Stripe subscription cancellation; access until period end unless refunded (webhook `charge.refunded` revokes if full refund).
- **PPV digital goods**: All sales final in MVP unless legally required; `charge.refunded` removes purchase entitlement.
- **Tips**: Non-refundable in policy; disputes handled case-by-case.

## Trust & safety (baseline)

- Report content/user (`reports` table).
- Block user (`blocks`).
- DMCA contact email in footer; manual takedown workflow.
