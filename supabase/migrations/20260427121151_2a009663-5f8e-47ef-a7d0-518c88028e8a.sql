CREATE TABLE public.usage_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  category TEXT NOT NULL,
  bytes BIGINT DEFAULT 0,
  units NUMERIC DEFAULT 1,
  estimated_cost_usd NUMERIC DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.usage_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own usage" ON public.usage_events
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own usage" ON public.usage_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own usage" ON public.usage_events
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own usage" ON public.usage_events
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_usage_events_user_created ON public.usage_events(user_id, created_at DESC);
CREATE INDEX idx_usage_events_category ON public.usage_events(category);