/*
# Harden function security

## Overview
Fixes three flagged security issues on the trigger functions created in
migration 002:
1. `public.touch_updated_at` had a role-mutable `search_path`.
2. `public.handle_new_user()` (SECURITY DEFINER) was executable by `anon`
   via the REST RPC endpoint.
3. `public.handle_new_user()` was executable by `authenticated` via the REST
   RPC endpoint.

## Changes
1. Re-create both functions with an explicit, fixed `search_path = public`
   so a hostile role cannot shadow `public` objects by prepending a schema.
2. `REVOKE EXECUTE ON public.handle_new_user FROM anon, authenticated;`
   The function is a trigger fired by INSERT on `auth.users` (run with the
   owner/invoker privileges of the trigger context), so it does not need to
   be callable directly by any client role. Revoking EXECUTE closes the
   `/rest/v1/rpc/handle_new_user` exposure for both anon and authenticated.
3. `touch_updated_at` is a plain (non-SECURITY DEFINER) trigger function but
   still gets a pinned search_path for defense in depth.

## Notes
- Both functions are re-created `OR REPLACE` with the same bodies; existing
  triggers continue to fire unchanged.
- No data is touched.
*/

-- ---------------------------------------------------------------------------
-- touch_updated_at: pin search_path
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- handle_new_user: pin search_path + revoke direct execution
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  insert into public.settings (user_id) values (new.id) on conflict (user_id) do nothing;
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from anon;
revoke execute on function public.handle_new_user() from authenticated;
