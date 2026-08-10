CREATE TABLE public.module_visibility (
  module_key TEXT PRIMARY KEY,
  visible BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.module_visibility TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.module_visibility TO authenticated;
GRANT ALL ON public.module_visibility TO service_role;
ALTER TABLE public.module_visibility ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read module visibility" ON public.module_visibility FOR SELECT USING (true);
CREATE POLICY "Authenticated can manage module visibility" ON public.module_visibility FOR ALL TO authenticated USING (true) WITH CHECK (true);