
-- 1. Aircraft: restrict SELECT to owner
DROP POLICY IF EXISTS "Allow authenticated users to view all aircraft" ON public.aircraft;
CREATE POLICY "Users view own aircraft" ON public.aircraft
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- 2. Crew members: per-owner policies
ALTER TABLE public.crew_members ALTER COLUMN user_id SET NOT NULL;
DROP POLICY IF EXISTS "Users can view all crew members" ON public.crew_members;
DROP POLICY IF EXISTS "Users can manage crew members" ON public.crew_members;
CREATE POLICY "Users view own crew" ON public.crew_members
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own crew" ON public.crew_members
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own crew" ON public.crew_members
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own crew" ON public.crew_members
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 3. Flight logs: per-owner policies
ALTER TABLE public.flight_logs ALTER COLUMN user_id SET NOT NULL;
DROP POLICY IF EXISTS "Users can view all flight logs" ON public.flight_logs;
DROP POLICY IF EXISTS "Users can manage flight logs" ON public.flight_logs;
CREATE POLICY "Users view own flight logs" ON public.flight_logs
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own flight logs" ON public.flight_logs
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own flight logs" ON public.flight_logs
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own flight logs" ON public.flight_logs
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 4. Storage objects: drop broad policies; require folder ownership
DROP POLICY IF EXISTS "Authenticated users can upload objects" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update objects" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete objects" ON storage.objects;
DROP POLICY IF EXISTS "Auth delete documents" ON storage.objects;
DROP POLICY IF EXISTS "Auth delete part photos" ON storage.objects;
DROP POLICY IF EXISTS "Auth delete service photos" ON storage.objects;
DROP POLICY IF EXISTS "Auth update part photos" ON storage.objects;
DROP POLICY IF EXISTS "Auth update service photos" ON storage.objects;
DROP POLICY IF EXISTS "Auth upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Auth upload part photos" ON storage.objects;
DROP POLICY IF EXISTS "Auth upload reports" ON storage.objects;
DROP POLICY IF EXISTS "Auth upload service photos" ON storage.objects;

CREATE POLICY "Owner upload to own folder" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = ANY (ARRAY['aircraft-photos','service-photos','part-photos','documents','reports'])
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
CREATE POLICY "Owner update own files" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = ANY (ARRAY['aircraft-photos','service-photos','part-photos','documents','reports'])
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
CREATE POLICY "Owner delete own files" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = ANY (ARRAY['aircraft-photos','service-photos','part-photos','documents','reports'])
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 5. Lock down SECURITY DEFINER helper functions
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_aircraft_totals() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_security_question(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.verify_security_answer(text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_security_question(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_security_question(text, text) TO authenticated;
