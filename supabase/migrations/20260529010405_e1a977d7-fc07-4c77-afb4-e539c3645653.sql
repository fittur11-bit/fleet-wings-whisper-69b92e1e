
UPDATE storage.buckets SET public = false WHERE id IN ('documents','reports');

-- Replace the broad "Public can view objects" policy with one limited to photo buckets
DROP POLICY IF EXISTS "Public can view objects" ON storage.objects;

CREATE POLICY "Public can view photo objects" ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = ANY (ARRAY['aircraft-photos'::text, 'service-photos'::text, 'part-photos'::text]));
