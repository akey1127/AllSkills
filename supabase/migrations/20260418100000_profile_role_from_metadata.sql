-- Set profiles.role from signup metadata (viewer -> fan, creator -> creator)

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.user_role;
begin
  if coalesce(trim(new.raw_user_meta_data->>'account_type'), '') = 'creator' then
    r := 'creator'::public.user_role;
  else
    r := 'fan'::public.user_role;
  end if;

  insert into public.profiles (id, display_name, handle, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(coalesce(new.email, 'user'), '@', 1)),
    coalesce(
      nullif(trim(new.raw_user_meta_data->>'handle'), ''),
      'u' || replace(new.id::text, '-', '')
    ),
    r
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
