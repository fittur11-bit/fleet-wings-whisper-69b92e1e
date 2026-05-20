CREATE TABLE public.demands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  priority text NOT NULL DEFAULT 'normal',
  status text NOT NULL DEFAULT 'open',
  deadline timestamptz,
  aircraft_id uuid,
  aircraft_prefix text,
  assigned_to text,
  location text,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.demands ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own demands" ON public.demands FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own demands" ON public.demands FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own demands" ON public.demands FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own demands" ON public.demands FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER demands_set_updated_at
BEFORE UPDATE ON public.demands
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_demands_user_status ON public.demands(user_id, status);
CREATE INDEX idx_demands_deadline ON public.demands(deadline);