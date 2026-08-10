-- Update the policy to allow multiple admin emails
DROP POLICY IF EXISTS "Only owner can manage visibility" ON public.module_visibility;

CREATE POLICY "Admins can manage visibility"
ON public.module_visibility
FOR ALL
TO authenticated
USING (
  (auth.jwt() ->> 'email') IN ('geandersonsanttos@gmail.com', 'geanderson_jt@hormail.com')
)
WITH CHECK (
  (auth.jwt() ->> 'email') IN ('geandersonsanttos@gmail.com', 'geanderson_jt@hormail.com')
);