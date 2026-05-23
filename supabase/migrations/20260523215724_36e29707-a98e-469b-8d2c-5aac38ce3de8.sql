
-- Revoke direct execution of trigger/internal functions. Triggers still
-- fire because they run as the table owner.
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_aircraft_totals() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- Add an explicit deny-by-default SELECT policy so the linter sees a policy
-- on user_security (grants are already revoked, but this silences the lint).
CREATE POLICY "No direct access to user_security"
  ON public.user_security FOR SELECT
  USING (false);
