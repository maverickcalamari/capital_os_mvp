/*
# Receipts storage bucket

1. Storage
- Create a public `receipts` storage bucket for transaction receipt uploads.
2. Notes
- Bucket is public so receipts can be linked/viewed by URL; access is scoped
  per-user via the path prefix `<user_id>/...` enforced in the frontend upload
  helper. RLS on the `transactions` table still governs who can write the
  receipt_url column.
*/

insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', true)
on conflict (id) do nothing;
