ALTER TABLE public.demands
  ADD COLUMN IF NOT EXISTS scheduled_start timestamptz,
  ADD COLUMN IF NOT EXISTS scheduled_end timestamptz,
  ADD COLUMN IF NOT EXISTS schedule_type text;