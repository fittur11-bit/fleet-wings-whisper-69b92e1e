
CREATE TABLE public.service_prices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  service_name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  unit TEXT NOT NULL DEFAULT 'service',
  price NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'BRL',
  supplier_id UUID,
  supplier_name TEXT,
  aircraft_model TEXT,
  min_price NUMERIC,
  max_price NUMERIC,
  validity_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.service_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own service prices" ON public.service_prices FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own service prices" ON public.service_prices FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own service prices" ON public.service_prices FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own service prices" ON public.service_prices FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_service_prices_updated_at
BEFORE UPDATE ON public.service_prices
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_service_prices_user ON public.service_prices(user_id);
CREATE INDEX idx_service_prices_category ON public.service_prices(category);
