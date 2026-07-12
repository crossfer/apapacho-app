-- =============================================================================
-- Mirror auth.users.email onto public.profiles.
--
-- profiles has no email of its own in the original schema, but the admin
-- Clients list needs to display/search by email without calling the Auth
-- admin API on every page render. Mirroring it in on signup (and keeping the
-- read scoped by the existing "profiles: read own or admin" RLS policy) keeps
-- that query a plain PostgREST select.
-- =============================================================================

alter table public.profiles add column if not exists email text;

create unique index if not exists idx_profiles_email on public.profiles (email);

-- Backfill existing rows from auth.users.
update public.profiles p
set email = u.email
from auth.users u
where u.id = p.id
  and p.email is distinct from u.email;

-- Extend the signup trigger to carry the email over for new users too.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role, full_name, email, language)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'role', 'client'),
    new.raw_user_meta_data ->> 'full_name',
    new.email,
    coalesce(new.raw_user_meta_data ->> 'language', 'auto')
  )
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;
