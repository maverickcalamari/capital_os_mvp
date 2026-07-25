/*
# Revoke PUBLIC execute on handle_new_user

## Overview
Migration 004 revoked EXECUTE from `anon` and `authenticated` explicitly, but
PostgreSQL grants EXECUTE on functions to `PUBLIC` by default, and both roles
inherit that grant. The previous REVOKE therefore had no effect —
`has_function_privilege` still returned true for both.

## Change
1. `REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;`
   This closes the `/rest/v1/rpc/handle_new_user` endpoint to all client roles.
2. Re-grant nothing. The function is a trigger fired by INSERT on `auth.users`
   and runs with the definer's privileges in the trigger context; it does not
   need direct EXECUTE from any client role.

## Notes
- The `on_auth_user_created` trigger continues to fire unchanged — trigger
  execution does not require EXECUTE privilege on the function for the calling
  role; it uses the trigger function's definer context.
- `touch_updated_at` is not SECURITY DEFINER and is intentionally callable by
  the table owner via triggers, so its PUBLIC grant is left in place (it does
  nothing sensitive).
*/

revoke execute on function public.handle_new_user() from public;
