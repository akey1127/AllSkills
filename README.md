# All-Skills (web MVP)

Trades-first creator platform: **subscriptions**, **PPV posts**, **tips**, **forums** (Supabase Realtime), **Mux** video, and **LiveKit** live rooms.

## Setup

1. **Install**: `npm install`

2. **Supabase**: Create a project, run SQL from `supabase/migrations/` in order (SQL editor or CLI).

3. **Environment**: `.env.local` is in the repo with placeholders—paste **Project URL**, **anon** (or **publishable**) key, and **service_role** from Supabase **Project Settings → API**. You can use either `NEXT_PUBLIC_SUPABASE_ANON_KEY` or `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (see `.env.example`). Restart `npm run dev` after edits.

4. **Auth**: In Supabase Auth settings, add redirect URL `http://localhost:3000/auth/callback` (and production URL).

5. **Stripe Connect**: Use test mode; create a Connect webhook endpoint pointing to `/api/stripe/webhook`. Enable events for `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, and `account.updated`. For Connect, ensure your endpoint receives events from connected accounts (Stripe Dashboard → Webhooks → Add endpoint → Listen to events on Connected accounts).

6. **Mux**: Configure a webhook URL to `/api/mux/webhook` with signing secret matching `MUX_WEBHOOK_SECRET`.

7. **Forums realtime**: In Supabase → Database → Replication, enable `forum_posts` for Realtime if you want live thread updates.

8. **Run**: `npm run dev`

## Product spec

See `docs/product-spec.md` for user journeys, entitlements, and refund notes.

## Stack

- Next.js App Router, TypeScript, Tailwind
- Supabase (Auth, Postgres, RLS, Realtime)
- Stripe Connect (Express accounts, Checkout)
- Mux (direct upload, playback)
- LiveKit (rooms + tokens)
