-- All-Skills initial schema (profiles, creators, monetization, posts, forums, live)

-- Extensions
create extension if not exists "pgcrypto";
create extension if not exists "citext";

-- Enums
do $$ begin
  create type public.user_role as enum ('fan', 'creator');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.post_visibility as enum ('public', 'subscribers', 'ppv');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.live_access as enum ('public', 'subscribers');
exception when duplicate_object then null;
end $$;

-- Profiles (1:1 auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  handle citext not null unique,
  bio text default '',
  trade_tags text[] default '{}',
  avatar_url text,
  role public.user_role not null default 'fan',
  is_moderator boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_handle_idx on public.profiles (handle);

-- Stripe customer on platform (for Checkout when needed)
create table if not exists public.stripe_customers (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  stripe_customer_id text not null unique,
  created_at timestamptz not null default now()
);

-- Creator Stripe Connect account
create table if not exists public.creator_accounts (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  stripe_account_id text not null unique,
  charges_enabled boolean not null default false,
  payouts_enabled boolean not null default false,
  details_submitted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Subscription tiers (prices created on connected account in Stripe)
create table if not exists public.subscription_tiers (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  description text default '',
  amount_cents integer not null check (amount_cents > 0),
  stripe_price_id text,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists subscription_tiers_creator_idx on public.subscription_tiers (creator_id);

-- Fan subscriptions to a creator
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  fan_id uuid not null references public.profiles (id) on delete cascade,
  creator_id uuid not null references public.profiles (id) on delete cascade,
  tier_id uuid references public.subscription_tiers (id) on delete set null,
  stripe_subscription_id text unique,
  status text not null default 'incomplete',
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  unique (fan_id, creator_id)
);

create index if not exists subscriptions_fan_idx on public.subscriptions (fan_id);
create index if not exists subscriptions_creator_idx on public.subscriptions (creator_id);

-- Posts
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  body text not null default '',
  preview_text text,
  visibility public.post_visibility not null default 'public',
  price_cents integer check (price_cents is null or price_cents > 0),
  mux_asset_id text,
  mux_playback_id text,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint posts_ppv_price check (
    visibility <> 'ppv' or price_cents is not null
  )
);

create index if not exists posts_creator_idx on public.posts (creator_id, created_at desc);

-- One-time PPV purchases
create table if not exists public.purchases (
  id uuid primary key default gen_random_uuid(),
  fan_id uuid not null references public.profiles (id) on delete cascade,
  post_id uuid not null references public.posts (id) on delete cascade,
  stripe_checkout_session_id text,
  amount_cents integer not null,
  created_at timestamptz not null default now(),
  unique (fan_id, post_id)
);

create index if not exists purchases_post_idx on public.purchases (post_id);

-- Tips
create table if not exists public.tips (
  id uuid primary key default gen_random_uuid(),
  fan_id uuid not null references public.profiles (id) on delete cascade,
  creator_id uuid not null references public.profiles (id) on delete cascade,
  amount_cents integer not null,
  stripe_checkout_session_id text,
  created_at timestamptz not null default now()
);

-- Reports / blocks
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  target_user_id uuid references public.profiles (id) on delete set null,
  target_post_id uuid references public.posts (id) on delete set null,
  reason text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id)
);

-- Forums
create table if not exists public.forum_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text default '',
  sort_order integer not null default 0
);

create table if not exists public.forum_threads (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.forum_categories (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists forum_threads_cat_idx on public.forum_threads (category_id, created_at desc);

create table if not exists public.forum_posts (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.forum_threads (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists forum_posts_thread_idx on public.forum_posts (thread_id, created_at);

-- Live sessions (LiveKit)
create table if not exists public.live_sessions (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.profiles (id) on delete cascade,
  room_name text not null unique,
  title text not null,
  access public.live_access not null default 'subscribers',
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now()
);

-- Entitlement helpers
create or replace function public.has_active_subscription(_fan uuid, _creator uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.subscriptions s
    where s.fan_id = _fan
      and s.creator_id = _creator
      and s.status in ('active', 'trialing', 'past_due')
      and (s.current_period_end is null or s.current_period_end > now())
  );
$$;

create or replace function public.has_purchased_post(_fan uuid, _post uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.purchases p
    where p.fan_id = _fan and p.post_id = _post
  );
$$;

create or replace function public.can_view_post(_viewer uuid, _post_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.posts po
    join public.profiles pr on pr.id = po.creator_id
    where po.id = _post_id
      and po.published = true
      and (
        po.visibility = 'public'
        or po.creator_id = _viewer
        or (
          po.visibility = 'subscribers'
          and public.has_active_subscription(_viewer, po.creator_id)
        )
        or (
          po.visibility = 'ppv'
          and (
            po.creator_id = _viewer
            or public.has_purchased_post(_viewer, po.id)
          )
        )
      )
  );
$$;

-- updated_at trigger
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_updated on public.profiles;
create trigger profiles_updated before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists posts_updated on public.posts;
create trigger posts_updated before update on public.posts
for each row execute function public.set_updated_at();

drop trigger if exists creator_accounts_updated on public.creator_accounts;
create trigger creator_accounts_updated before update on public.creator_accounts
for each row execute function public.set_updated_at();

-- RLS
alter table public.profiles enable row level security;
alter table public.stripe_customers enable row level security;
alter table public.creator_accounts enable row level security;
alter table public.subscription_tiers enable row level security;
alter table public.subscriptions enable row level security;
alter table public.posts enable row level security;
alter table public.purchases enable row level security;
alter table public.tips enable row level security;
alter table public.reports enable row level security;
alter table public.blocks enable row level security;
alter table public.forum_categories enable row level security;
alter table public.forum_threads enable row level security;
alter table public.forum_posts enable row level security;
alter table public.live_sessions enable row level security;

-- Profiles: public read (minimal), self write
create policy profiles_select_public on public.profiles
  for select using (true);

create policy profiles_update_self on public.profiles
  for update using (auth.uid() = id);

create policy profiles_insert_self on public.profiles
  for insert with check (auth.uid() = id);

-- Stripe customers: self only
create policy stripe_customers_self on public.stripe_customers
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Creator accounts: owner read, no direct client write (service role / API)
create policy creator_accounts_owner_select on public.creator_accounts
  for select using (auth.uid() = user_id);

-- Tiers: public read active tiers
create policy subscription_tiers_select on public.subscription_tiers
  for select using (active = true or auth.uid() = creator_id);

create policy subscription_tiers_creator_manage on public.subscription_tiers
  for all using (auth.uid() = creator_id) with check (auth.uid() = creator_id);

-- Subscriptions: fan and creator can see their rows
create policy subscriptions_select_parties on public.subscriptions
  for select using (auth.uid() = fan_id or auth.uid() = creator_id);

-- Posts: use can_view_post for select
create policy posts_select_entitled on public.posts
  for select using (
    published = false and auth.uid() = creator_id
    or published = true and (
      public.can_view_post(auth.uid(), id)
    )
  );

create policy posts_creator_write on public.posts
  for all using (auth.uid() = creator_id) with check (auth.uid() = creator_id);

-- Purchases: buyer sees own
create policy purchases_select_own on public.purchases
  for select using (auth.uid() = fan_id);

-- Tips: tipper or creator
create policy tips_select_parties on public.tips
  for select using (auth.uid() = fan_id or auth.uid() = creator_id);

-- Reports: insert own
create policy reports_insert on public.reports
  for insert with check (auth.uid() = reporter_id);

create policy reports_mod_select on public.reports
  for select using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_moderator = true)
  );

-- Blocks
create policy blocks_own on public.blocks
  for all using (auth.uid() = blocker_id) with check (auth.uid() = blocker_id);

-- Forum categories: public read
create policy forum_categories_read on public.forum_categories
  for select using (true);

-- Forum threads: authenticated read
create policy forum_threads_read on public.forum_threads
  for select using (auth.uid() is not null);

create policy forum_threads_insert on public.forum_threads
  for insert with check (auth.uid() = author_id);

-- Forum posts
create policy forum_posts_read on public.forum_posts
  for select using (auth.uid() is not null);

create policy forum_posts_insert on public.forum_posts
  for insert with check (auth.uid() = author_id);

-- Live sessions: public read when active; creator manages
create policy live_sessions_read on public.live_sessions
  for select using (
    auth.uid() is not null
    and (ended_at is null or ended_at > now())
  );

create policy live_sessions_creator on public.live_sessions
  for all using (auth.uid() = creator_id) with check (auth.uid() = creator_id);

-- Seed forum categories
insert into public.forum_categories (slug, name, description, sort_order)
values
  ('general', 'General', 'Shop talk and introductions', 0),
  ('tools', 'Tools & gear', 'What to buy, maintenance, safety', 1),
  ('apprentices', 'Apprentices', 'Getting started in the trades', 2),
  ('jobs', 'Jobs & gigs', 'Hiring, side work, referrals', 3)
on conflict (slug) do nothing;

-- Handle new user: create profile via trigger (optional — we can insert from app instead)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, handle)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(coalesce(new.email, 'user'), '@', 1)),
    coalesce(
      nullif(trim(new.raw_user_meta_data->>'handle'), ''),
      'u' || replace(new.id::text, '-', '')
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Grant usage
grant usage on schema public to postgres, anon, authenticated, service_role;
grant all on all tables in schema public to postgres, service_role;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant select on all tables in schema public to anon;
