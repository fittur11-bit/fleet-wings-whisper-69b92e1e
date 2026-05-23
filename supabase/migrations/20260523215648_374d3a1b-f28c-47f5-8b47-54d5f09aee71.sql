
-- ============================================================
-- 1. Move security answer hash to a dedicated, locked-down table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_security (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  security_question text,
  security_answer_hash text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_security ENABLE ROW LEVEL SECURITY;

-- Deny ALL direct access from anon/authenticated. Only SECURITY DEFINER
-- functions (running as table owner) and service_role may touch this table.
REVOKE ALL ON public.user_security FROM anon, authenticated;

-- Backfill from profiles (if any existing rows)
INSERT INTO public.user_security (user_id, security_question, security_answer_hash, updated_at)
SELECT id, security_question, security_answer_hash, COALESCE(updated_at, now())
FROM public.profiles
WHERE security_answer_hash IS NOT NULL OR security_question IS NOT NULL
ON CONFLICT (user_id) DO NOTHING;

-- Drop sensitive columns from profiles
ALTER TABLE public.profiles DROP COLUMN IF EXISTS security_question;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS security_answer_hash;

-- ============================================================
-- 2. Recreate security functions against user_security with locked grants
-- ============================================================
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
  INSERT INTO public.user_security (user_id, security_question, security_answer_hash, updated_at)
  VALUES (
    auth.uid(),
    _question,
    extensions.crypt(lower(trim(_answer)), extensions.gen_salt('bf', 10)),
    now()
  )
  ON CONFLICT (user_id) DO UPDATE
    SET security_question = EXCLUDED.security_question,
        security_answer_hash = EXCLUDED.security_answer_hash,
        updated_at = now();
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
  SELECT s.security_question INTO _q
  FROM auth.users u
  JOIN public.user_security s ON s.user_id = u.id
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
  SELECT u.id, s.security_answer_hash, s.security_question
    INTO _user_id, _stored_hash, _question
  FROM auth.users u
  JOIN public.user_security s ON s.user_id = u.id
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

-- ============================================================
-- 3. Lock down EXECUTE grants on SECURITY DEFINER functions
-- ============================================================
REVOKE EXECUTE ON FUNCTION public.set_security_question(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_security_question(text, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.verify_security_answer(text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_security_question(text) FROM PUBLIC, anon, authenticated;

-- ============================================================
-- 4. Fix mutable search_path on update_aircraft_totals
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_aircraft_totals()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE public.aircraft
        SET total_hours = COALESCE(total_hours, 0) + NEW.flight_time
        WHERE id = NEW.aircraft_id;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE public.aircraft
        SET total_hours = GREATEST(0, COALESCE(total_hours, 0) - OLD.flight_time)
        WHERE id = OLD.aircraft_id;
    ELSIF (TG_OP = 'UPDATE') THEN
        UPDATE public.aircraft
        SET total_hours = GREATEST(0, COALESCE(total_hours, 0) - OLD.flight_time + NEW.flight_time)
        WHERE id = NEW.aircraft_id;
    END IF;
    RETURN NULL;
END;
$$;

-- ============================================================
-- 5. Multi-tenant SELECT for aircraft, crew_members, flight_logs
-- ============================================================

-- aircraft: replace open SELECT with owner-only
DROP POLICY IF EXISTS "Allow authenticated users to view all aircraft" ON public.aircraft;
DROP POLICY IF EXISTS "Allow authenticated users to insert aircraft" ON public.aircraft;
DROP POLICY IF EXISTS "Allow authenticated users to update their own aircraft" ON public.aircraft;
DROP POLICY IF EXISTS "Allow authenticated users to delete their own aircraft" ON public.aircraft;

CREATE POLICY "Users view own aircraft" ON public.aircraft
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own aircraft" ON public.aircraft
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own aircraft" ON public.aircraft
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own aircraft" ON public.aircraft
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- crew_members: make user_id NOT NULL and restrict policies
ALTER TABLE public.crew_members ALTER COLUMN user_id SET NOT NULL;

DROP POLICY IF EXISTS "Users can view all crew members" ON public.crew_members;
DROP POLICY IF EXISTS "Users can manage crew members" ON public.crew_members;

CREATE POLICY "Users view own crew" ON public.crew_members
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own crew" ON public.crew_members
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own crew" ON public.crew_members
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own crew" ON public.crew_members
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- flight_logs: NOT NULL + owner-scoped policies
ALTER TABLE public.flight_logs ALTER COLUMN user_id SET NOT NULL;

DROP POLICY IF EXISTS "Users can view all flight logs" ON public.flight_logs;
DROP POLICY IF EXISTS "Users can manage flight logs" ON public.flight_logs;

CREATE POLICY "Users view own flight logs" ON public.flight_logs
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own flight logs" ON public.flight_logs
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own flight logs" ON public.flight_logs
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own flight logs" ON public.flight_logs
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- 6. Restrict 'public' role policies to 'authenticated' on user-scoped tables
-- ============================================================

-- demands
DROP POLICY IF EXISTS "Users view own demands" ON public.demands;
DROP POLICY IF EXISTS "Users insert own demands" ON public.demands;
DROP POLICY IF EXISTS "Users update own demands" ON public.demands;
DROP POLICY IF EXISTS "Users delete own demands" ON public.demands;
CREATE POLICY "Users view own demands" ON public.demands
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own demands" ON public.demands
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own demands" ON public.demands
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own demands" ON public.demands
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- documents
DROP POLICY IF EXISTS "Users view own documents" ON public.documents;
DROP POLICY IF EXISTS "Users insert own documents" ON public.documents;
DROP POLICY IF EXISTS "Users update own documents" ON public.documents;
DROP POLICY IF EXISTS "Users delete own documents" ON public.documents;
CREATE POLICY "Users view own documents" ON public.documents
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own documents" ON public.documents
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own documents" ON public.documents
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own documents" ON public.documents
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- maintenance_items
DROP POLICY IF EXISTS "Users view own mx" ON public.maintenance_items;
DROP POLICY IF EXISTS "Users insert own mx" ON public.maintenance_items;
DROP POLICY IF EXISTS "Users update own mx" ON public.maintenance_items;
DROP POLICY IF EXISTS "Users delete own mx" ON public.maintenance_items;
CREATE POLICY "Users view own mx" ON public.maintenance_items
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own mx" ON public.maintenance_items
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own mx" ON public.maintenance_items
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own mx" ON public.maintenance_items
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- parts
DROP POLICY IF EXISTS "Users view own parts" ON public.parts;
DROP POLICY IF EXISTS "Users insert own parts" ON public.parts;
DROP POLICY IF EXISTS "Users update own parts" ON public.parts;
DROP POLICY IF EXISTS "Users delete own parts" ON public.parts;
CREATE POLICY "Users view own parts" ON public.parts
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own parts" ON public.parts
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own parts" ON public.parts
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own parts" ON public.parts
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- part_shipments
DROP POLICY IF EXISTS "Users can view their own part shipments" ON public.part_shipments;
DROP POLICY IF EXISTS "Users can create their own part shipments" ON public.part_shipments;
DROP POLICY IF EXISTS "Users can update their own part shipments" ON public.part_shipments;
DROP POLICY IF EXISTS "Users can delete their own part shipments" ON public.part_shipments;
CREATE POLICY "Users view own shipments" ON public.part_shipments
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own shipments" ON public.part_shipments
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own shipments" ON public.part_shipments
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own shipments" ON public.part_shipments
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- services
DROP POLICY IF EXISTS "Users view own services" ON public.services;
DROP POLICY IF EXISTS "Users insert own services" ON public.services;
DROP POLICY IF EXISTS "Users update own services" ON public.services;
DROP POLICY IF EXISTS "Users delete own services" ON public.services;
CREATE POLICY "Users view own services" ON public.services
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own services" ON public.services
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own services" ON public.services
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own services" ON public.services
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- service_prices
DROP POLICY IF EXISTS "Users view own service prices" ON public.service_prices;
DROP POLICY IF EXISTS "Users insert own service prices" ON public.service_prices;
DROP POLICY IF EXISTS "Users update own service prices" ON public.service_prices;
DROP POLICY IF EXISTS "Users delete own service prices" ON public.service_prices;
CREATE POLICY "Users view own service prices" ON public.service_prices
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own service prices" ON public.service_prices
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own service prices" ON public.service_prices
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own service prices" ON public.service_prices
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- suppliers
DROP POLICY IF EXISTS "Users view own suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Users insert own suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Users update own suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Users delete own suppliers" ON public.suppliers;
CREATE POLICY "Users view own suppliers" ON public.suppliers
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own suppliers" ON public.suppliers
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own suppliers" ON public.suppliers
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own suppliers" ON public.suppliers
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- usage_events
DROP POLICY IF EXISTS "Users view own usage" ON public.usage_events;
DROP POLICY IF EXISTS "Users insert own usage" ON public.usage_events;
DROP POLICY IF EXISTS "Users update own usage" ON public.usage_events;
DROP POLICY IF EXISTS "Users delete own usage" ON public.usage_events;
CREATE POLICY "Users view own usage" ON public.usage_events
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own usage" ON public.usage_events
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own usage" ON public.usage_events
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own usage" ON public.usage_events
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- profiles (scope to authenticated)
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users view own profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);

-- ============================================================
-- 7. Storage: owner-scoped write/delete. Read stays public to avoid
-- breaking already-stored public image URLs.
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can update objects" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete objects" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload objects" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload to own folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own files" ON storage.objects;

CREATE POLICY "Users can upload to own folder"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id IN ('aircraft-photos','service-photos','part-photos','documents','reports')
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can update own files"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id IN ('aircraft-photos','service-photos','part-photos','documents','reports')
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete own files"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id IN ('aircraft-photos','service-photos','part-photos','documents','reports')
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
