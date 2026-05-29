
DROP POLICY IF EXISTS "Owner list aircraft photos" ON storage.objects;
DROP POLICY IF EXISTS "Owner list documents" ON storage.objects;
DROP POLICY IF EXISTS "Owner list part photos" ON storage.objects;
DROP POLICY IF EXISTS "Owner list reports" ON storage.objects;
DROP POLICY IF EXISTS "Owner list service photos" ON storage.objects;

CREATE POLICY "Owner list aircraft photos" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'aircraft-photos' AND (storage.foldername(name))[1] = (auth.uid())::text);

CREATE POLICY "Owner list documents" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = (auth.uid())::text);

CREATE POLICY "Owner list part photos" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'part-photos' AND (storage.foldername(name))[1] = (auth.uid())::text);

CREATE POLICY "Owner list reports" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'reports' AND (storage.foldername(name))[1] = (auth.uid())::text);

CREATE POLICY "Owner list service photos" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'service-photos' AND (storage.foldername(name))[1] = (auth.uid())::text);
