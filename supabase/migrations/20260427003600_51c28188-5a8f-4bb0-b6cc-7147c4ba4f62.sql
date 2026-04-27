
-- Fix function search_path
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Restrict bucket listing: only owner can list, but anyone with URL can read individual file
DROP POLICY IF EXISTS "Public read aircraft photos" ON storage.objects;
DROP POLICY IF EXISTS "Public read service photos" ON storage.objects;
DROP POLICY IF EXISTS "Public read part photos" ON storage.objects;
DROP POLICY IF EXISTS "Public read documents" ON storage.objects;
DROP POLICY IF EXISTS "Public read reports" ON storage.objects;

-- Authenticated users can list their own files (owner-based)
CREATE POLICY "Owner list aircraft photos" ON storage.objects FOR SELECT
  USING (bucket_id = 'aircraft-photos' AND (auth.uid() = owner OR owner IS NULL));
CREATE POLICY "Owner list service photos" ON storage.objects FOR SELECT
  USING (bucket_id = 'service-photos' AND (auth.uid() = owner OR owner IS NULL));
CREATE POLICY "Owner list part photos" ON storage.objects FOR SELECT
  USING (bucket_id = 'part-photos' AND (auth.uid() = owner OR owner IS NULL));
CREATE POLICY "Owner list documents" ON storage.objects FOR SELECT
  USING (bucket_id = 'documents' AND (auth.uid() = owner OR owner IS NULL));
CREATE POLICY "Owner list reports" ON storage.objects FOR SELECT
  USING (bucket_id = 'reports' AND (auth.uid() = owner OR owner IS NULL));
