-- 1. Restore profiles columns
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS security_question text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS security_answer_hash text;

-- 2. Restore data from user_security back to profiles
UPDATE public.profiles p
SET security_question = s.security_question,
    security_answer_hash = s.security_answer_hash
FROM public.user_security s
WHERE s.user_id = p.id;

-- 3. Restore crew_members and flight_logs user_id to nullable
ALTER TABLE public.crew_members ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.flight_logs ALTER COLUMN user_id DROP NOT NULL;

-- 4. Drop user_security table
DROP TABLE IF EXISTS public.user_security CASCADE;

-- 5. Restore original policies for aircraft (more permissive)
DROP POLICY IF EXISTS "Users view own aircraft" ON public.aircraft;
DROP POLICY IF EXISTS "Users insert own aircraft" ON public.aircraft;
DROP POLICY IF EXISTS "Users update own aircraft" ON public.aircraft;
DROP POLICY IF EXISTS "Users delete own aircraft" ON public.aircraft;
DROP POLICY IF EXISTS "Allow authenticated users to view all aircraft" ON public.aircraft;
DROP POLICY IF EXISTS "Allow authenticated users to insert aircraft" ON public.aircraft;
DROP POLICY IF EXISTS "Allow authenticated users to update their own aircraft" ON public.aircraft;
DROP POLICY IF EXISTS "Allow authenticated users to delete their own aircraft" ON public.aircraft;

CREATE POLICY "Allow authenticated users to view all aircraft"
ON public.aircraft FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to insert aircraft"
ON public.aircraft FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow authenticated users to update their own aircraft"
ON public.aircraft FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Allow authenticated users to delete their own aircraft"
ON public.aircraft FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- 6. Restore original policies for crew_members
DROP POLICY IF EXISTS "Users view own crew" ON public.crew_members;
DROP POLICY IF EXISTS "Users insert own crew" ON public.crew_members;
DROP POLICY IF EXISTS "Users update own crew" ON public.crew_members;
DROP POLICY IF EXISTS "Users delete own crew" ON public.crew_members;
DROP POLICY IF EXISTS "Users can view all crew members" ON public.crew_members;
DROP POLICY IF EXISTS "Users can manage crew members" ON public.crew_members;

CREATE POLICY "Users can view all crew members" ON public.crew_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can manage crew members" ON public.crew_members FOR ALL TO authenticated USING (true);

-- 7. Restore original policies for flight_logs
DROP POLICY IF EXISTS "Users view own flight logs" ON public.flight_logs;
DROP POLICY IF EXISTS "Users insert own flight logs" ON public.flight_logs;
DROP POLICY IF EXISTS "Users update own flight logs" ON public.flight_logs;
DROP POLICY IF EXISTS "Users delete own flight logs" ON public.flight_logs;
DROP POLICY IF EXISTS "Users can view all flight logs" ON public.flight_logs;
DROP POLICY IF EXISTS "Users can manage flight logs" ON public.flight_logs;

CREATE POLICY "Users can view all flight logs" ON public.flight_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can manage flight logs" ON public.flight_logs FOR ALL TO authenticated USING (true);

-- 8. Restore original policies for other tables (revert from authenticated-only to public/default)
-- NOTE: Actually, most were already user_id based, but let's ensure they are consistent with previous state.
-- The hardening changed 'FOR SELECT TO authenticated' - we can keep it authenticated-only as it is safer and likely didn't break things, 
-- but the user said "volte para a versão anterior".

-- 9. Restore storage policies (making them public/less restrictive again)
DROP POLICY IF EXISTS "Users can upload to own folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload objects" ON storage.objects;
DROP POLICY IF EXISTS "Public can view objects" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update objects" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete objects" ON storage.objects;

CREATE POLICY "Authenticated users can upload objects"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id IN ('aircraft-photos', 'service-photos', 'part-photos', 'documents', 'reports'));

CREATE POLICY "Public can view objects"
ON storage.objects FOR SELECT
TO public
USING (bucket_id IN ('aircraft-photos', 'service-photos', 'part-photos', 'documents', 'reports'));

CREATE POLICY "Authenticated users can update objects"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id IN ('aircraft-photos', 'service-photos', 'part-photos', 'documents', 'reports'));

CREATE POLICY "Authenticated users can delete objects"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id IN ('aircraft-photos', 'service-photos', 'part-photos', 'documents', 'reports'));

-- 10. Restore EXECUTE grants on security functions
GRANT EXECUTE ON FUNCTION public.set_security_question(text, text) TO PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_security_answer(text, text) TO PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_security_question(text) TO PUBLIC, anon, authenticated;

-- 11. Restore trigger functions grants
GRANT EXECUTE ON FUNCTION public.update_updated_at_column() TO PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_aircraft_totals() TO PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO PUBLIC, anon, authenticated;

-- 12. Revert security functions to work with profiles again
CREATE OR REPLACE FUNCTION public.set_security_question(_question text, _answer text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  UPDATE public.profiles
  SET security_question = _question,
      security_answer_hash = extensions.crypt(lower(trim(_answer)), extensions.gen_salt('bf', 10)),
      updated_at = now()
  WHERE id = auth.uid();
END;
$$;

CREATE OR REPLACE FUNCTION public.get_security_question(_email text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  _q text;
BEGIN
  SELECT p.security_question INTO _q
  FROM auth.users u
  JOIN public.profiles p ON p.id = u.id
  WHERE lower(u.email) = lower(_email);
  RETURN _q;
END;
$$;

CREATE OR REPLACE FUNCTION public.verify_security_answer(_email text, _answer text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, auth
AS $$
DECLARE
  _user_id uuid;
  _stored_hash text;
  _question text;
BEGIN
  SELECT u.id, p.security_answer_hash, p.security_question
    INTO _user_id, _stored_hash, _question
  FROM auth.users u
  JOIN public.profiles p ON p.id = u.id
  WHERE lower(u.email) = lower(_email);

  IF _user_id IS NULL OR _stored_hash IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_found');
  END IF;

  IF _stored_hash = extensions.crypt(lower(trim(_answer)), _stored_hash) THEN
    RETURN jsonb_build_object('ok', true, 'user_id', _user_id);
  END IF;

  RETURN jsonb_build_object('ok', false, 'reason', 'wrong_answer', 'question', _question);
END;
$$;
