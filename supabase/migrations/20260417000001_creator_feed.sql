-- Public creator feed with redaction for paywalled posts

create or replace function public.creator_feed(p_handle citext, p_viewer uuid)
returns table (
  post_id uuid,
  title text,
  body text,
  preview_text text,
  visibility public.post_visibility,
  price_cents integer,
  mux_playback_id text,
  is_unlocked boolean,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  cid uuid;
begin
  select id into cid from public.profiles where handle = p_handle limit 1;
  if cid is null then
    return;
  end if;

  return query
  select
    p.id,
    p.title,
    case
      when p.creator_id is not distinct from p_viewer then p.body
      when p.visibility = 'public' then p.body
      when p.visibility = 'subscribers'
        and public.has_active_subscription(p_viewer, p.creator_id) then p.body
      when p.visibility = 'ppv'
        and (
          p.creator_id is not distinct from p_viewer
          or public.has_purchased_post(p_viewer, p.id)
        ) then p.body
      else coalesce(nullif(trim(p.preview_text), ''), left(p.body, 200))
    end as body,
    p.preview_text,
    p.visibility,
    p.price_cents,
    case
      when p.creator_id is not distinct from p_viewer then p.mux_playback_id
      when p.visibility = 'public' then p.mux_playback_id
      when p.visibility = 'subscribers'
        and public.has_active_subscription(p_viewer, p.creator_id) then p.mux_playback_id
      when p.visibility = 'ppv'
        and (
          p.creator_id is not distinct from p_viewer
          or public.has_purchased_post(p_viewer, p.id)
        ) then p.mux_playback_id
      else null
    end as mux_playback_id,
    case
      when p.creator_id is not distinct from p_viewer then true
      when p.visibility = 'public' then true
      when p.visibility = 'subscribers'
        and public.has_active_subscription(p_viewer, p.creator_id) then true
      when p.visibility = 'ppv'
        and public.has_purchased_post(p_viewer, p.id) then true
      else false
    end as is_unlocked,
    p.created_at
  from public.posts p
  where p.creator_id = cid
    and p.published = true
  order by p.created_at desc;
end;
$$;

grant execute on function public.creator_feed(citext, uuid) to anon, authenticated;
