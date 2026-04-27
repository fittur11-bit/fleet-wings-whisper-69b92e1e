-- 1. Add security question fields to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS security_question text,
  ADD COLUMN IF NOT EXISTS security_answer_hash text;

-- 2. Enable pgcrypto for hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- 3. Function: verify security answer (returns true/false)
CREATE OR REPLACE FUNCTION public.verify_security_answer(
  _email text,
  _answer text
)
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

-- 4. Function: get security question by email (public, for reset flow)
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

-- 5. Function: hash an answer (helper for setting it)
CREATE OR REPLACE FUNCTION public.set_security_question(
  _question text,
  _answer text
)
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

GRANT EXECUTE ON FUNCTION public.get_security_question(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_security_answer(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_security_question(text, text) TO authenticated;