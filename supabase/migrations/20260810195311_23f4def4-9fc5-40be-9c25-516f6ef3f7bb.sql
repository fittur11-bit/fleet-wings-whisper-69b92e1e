-- Update the policy to include the correct email
DROP POLICY IF EXISTS "Only owners can manage visibility" ON public.module_visibility;

CREATE POLICY "Only owners can manage visibility"
ON public.module_visibility
FOR ALL
TO authenticated
USING (
  auth.jwt() ->> 'email' IN ('geandersonsanttos@gmail.com', 'geanderson_jt@hotmail.com', 'geanderson_jt@hormail.com')
);

GRANT ALL ON public.module_visibility TO authenticated;
GRANT ALL ON public.module_visibility TO service_role;