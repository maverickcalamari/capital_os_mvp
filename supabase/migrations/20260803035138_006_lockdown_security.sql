/*
# Security Lockdown — Revoke Anon Access, Lock Down Storage

## Summary
This migration closes two critical security gaps:
1. The `anon` role has full CRUD grants on all 11 public tables. While RLS
   policies currently block anon from reading rows (because `auth.uid()` returns
   NULL for unauthenticated requests), the underlying grants are over-permissive.
   If any policy is ever misconfigured or RLS is accidentally disabled, anon
   would have full access. This is a defense-in-depth failure.
2. The `receipts` storage bucket is public with zero storage policies. Anyone
   with a URL can view any receipt, and anyone can upload, update, or delete
   objects in the bucket.

## Changes

### 1. Revoke anon privileges on all public tables
Revokes ALL privileges (SELECT, INSERT, UPDATE, DELETE) from the `anon` role
on every table in the public schema. The app requires authentication for
database access (guest mode uses local state, not the database), so anon
does not need any table access.

### 2. Confirm authenticated privileges
Re-grants CRUD to `authenticated` on all public tables to ensure legitimate
users retain access after the anon revocation.

### 3. Make receipts bucket private
Updates the `receipts` bucket to `public = false` so object URLs are no longer
accessible without authorization.

### 4. Add owner-scoped storage policies for receipts
Creates 4 storage policies on `storage.objects` that scope all access to the
owner's folder prefix (`auth.uid()::text/...`):
- INSERT: authenticated users can upload to their own folder
- SELECT: authenticated users can read from their own folder
- UPDATE: authenticated users can update objects in their own folder
- DELETE: authenticated users can delete objects in their own folder

### 5. Verify handle_new_user EXECUTE revoked from anon
Ensures the `handle_new_user` SECURITY DEFINER trigger function is not
callable by the anon role (defense-in-depth for the auth trigger).

## Security Impact
- Unauthenticated requests can no longer attempt CRUD on any table.
- Receipts are only accessible by their owner via signed URLs.
- The auth trigger function is not callable by anon.
- No data is lost or modified — only privileges and policies change.
*/

-- ============================================================================
-- 1. Revoke ALL privileges from anon on all public tables
-- ============================================================================
REVOKE ALL ON accounts FROM anon;
REVOKE ALL ON budget_categories FROM anon;
REVOKE ALL ON forecasts FROM anon;
REVOKE ALL ON goals FROM anon;
REVOKE ALL ON investments FROM anon;
REVOKE ALL ON notifications FROM anon;
REVOKE ALL ON opportunities FROM anon;
REVOKE ALL ON profiles FROM anon;
REVOKE ALL ON reports FROM anon;
REVOKE ALL ON settings FROM anon;
REVOKE ALL ON transactions FROM anon;

-- ============================================================================
-- 2. Re-grant CRUD to authenticated (explicit, in case of any drift)
-- ============================================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON accounts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON budget_categories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON forecasts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON goals TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON investments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON opportunities TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON reports TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON transactions TO authenticated;

-- ============================================================================
-- 3. Make the receipts bucket private (was public)
-- ============================================================================
UPDATE storage.buckets SET public = false WHERE id = 'receipts';

-- ============================================================================
-- 4. Add owner-scoped storage policies for the receipts bucket
-- ============================================================================
DROP POLICY IF EXISTS "receipts_insert_own_folder" ON storage.objects;
CREATE POLICY "receipts_insert_own_folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'receipts'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "receipts_select_own_folder" ON storage.objects;
CREATE POLICY "receipts_select_own_folder"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'receipts'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "receipts_update_own_folder" ON storage.objects;
CREATE POLICY "receipts_update_own_folder"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'receipts'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'receipts'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "receipts_delete_own_folder" ON storage.objects;
CREATE POLICY "receipts_delete_own_folder"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'receipts'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- ============================================================================
-- 5. Ensure handle_new_user EXECUTE is revoked from anon (defense-in-depth)
-- ============================================================================
REVOKE EXECUTE ON FUNCTION handle_new_user() FROM anon;
