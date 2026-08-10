DROP POLICY IF EXISTS "Authenticated can manage module visibility" ON public.module_visibility;
CREATE POLICY "Owner email can manage module visibility"
ON public.module_visibility FOR ALL TO authenticated
USING (lower(coalesce(auth.jwt() ->> 'email', '')) = 'geandersonsanttos@gmail.com')
WITH CHECK (lower(coalesce(auth.jwt() ->> 'email', '')) = 'geandersonsanttos@gmail.com');