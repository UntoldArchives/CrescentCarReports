-- ════════════════════════════════════════════════════════════════════════
-- Storage bucket for inspection photos.
--
-- The bucket is public-READ so that <img src> and the print/PDF preview load
-- without juggling expiring signed URLs (acceptable for v1 inspection photos).
-- WRITES/DELETES are restricted to authenticated inspectors, scoped to a
-- report folder:  report-photos/{report_id}/{file}.
-- ════════════════════════════════════════════════════════════════════════

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'report-photos',
  'report-photos',
  true,
  10485760, -- 10 MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Public read.
create policy "report_photos_public_read"
  on storage.objects for select
  using (bucket_id = 'report-photos');

-- Authenticated users may upload into the report-photos bucket. Finer-grained
-- ownership (this inspector owns this report) is enforced when we persist the
-- photo row in report_photos and at upload time via the server.
create policy "report_photos_auth_insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'report-photos');

create policy "report_photos_auth_update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'report-photos');

create policy "report_photos_auth_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'report-photos');
