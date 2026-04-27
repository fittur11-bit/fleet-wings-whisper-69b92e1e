
-- Profiles table for user data
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Trigger to auto-create profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at helper
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- =========================
-- AIRCRAFT
-- =========================
CREATE TABLE public.aircraft (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prefix TEXT NOT NULL,
  model TEXT,
  manufacturer TEXT,
  serial_number TEXT,
  year INTEGER,
  total_hours NUMERIC DEFAULT 0,
  owner TEXT,
  photo_url TEXT,
  gallery JSONB DEFAULT '[]'::jsonb,
  cva_expiration DATE,
  cva_data JSONB DEFAULT '{}'::jsonb,
  inspection_data JSONB DEFAULT '{}'::jsonb,
  last_inspection_date DATE,
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.aircraft ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own aircraft" ON public.aircraft FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own aircraft" ON public.aircraft FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own aircraft" ON public.aircraft FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own aircraft" ON public.aircraft FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER trg_aircraft_updated BEFORE UPDATE ON public.aircraft
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_aircraft_user ON public.aircraft(user_id);
CREATE INDEX idx_aircraft_prefix ON public.aircraft(prefix);

-- =========================
-- SERVICES
-- =========================
CREATE TABLE public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  aircraft_id UUID REFERENCES public.aircraft(id) ON DELETE CASCADE,
  aircraft_prefix TEXT,
  service_type TEXT NOT NULL,
  service_types JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending',
  performed_at DATE,
  hours_at_service NUMERIC,
  technician TEXT,
  location TEXT,
  description TEXT,
  checklist JSONB DEFAULT '[]'::jsonb,
  photos JSONB DEFAULT '[]'::jsonb,
  report_url TEXT,
  cost NUMERIC,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own services" ON public.services FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own services" ON public.services FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own services" ON public.services FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own services" ON public.services FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER trg_services_updated BEFORE UPDATE ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_services_user ON public.services(user_id);
CREATE INDEX idx_services_aircraft ON public.services(aircraft_id);

-- =========================
-- PARTS
-- =========================
CREATE TABLE public.parts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  aircraft_id UUID REFERENCES public.aircraft(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  part_number TEXT,
  serial_number TEXT,
  origin TEXT,
  install_date DATE,
  removal_date DATE,
  hours_at_install NUMERIC,
  status TEXT NOT NULL DEFAULT 'stock',
  condition TEXT,
  photos JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.parts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own parts" ON public.parts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own parts" ON public.parts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own parts" ON public.parts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own parts" ON public.parts FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER trg_parts_updated BEFORE UPDATE ON public.parts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_parts_user ON public.parts(user_id);

-- =========================
-- DOCUMENTS
-- =========================
CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  aircraft_id UUID REFERENCES public.aircraft(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  doc_type TEXT NOT NULL,
  model TEXT,
  file_url TEXT,
  version TEXT,
  revision_date DATE,
  tags TEXT[] DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own documents" ON public.documents FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own documents" ON public.documents FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own documents" ON public.documents FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own documents" ON public.documents FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER trg_documents_updated BEFORE UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================
-- MAINTENANCE ITEMS
-- =========================
CREATE TABLE public.maintenance_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  aircraft_id UUID REFERENCES public.aircraft(id) ON DELETE CASCADE,
  aircraft_prefix TEXT,
  item_type TEXT NOT NULL,
  description TEXT,
  last_done_date DATE,
  last_done_hours NUMERIC,
  due_date DATE,
  due_hours NUMERIC,
  interval_months INTEGER,
  interval_hours NUMERIC,
  status TEXT NOT NULL DEFAULT 'ok',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.maintenance_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own mx" ON public.maintenance_items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own mx" ON public.maintenance_items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own mx" ON public.maintenance_items FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own mx" ON public.maintenance_items FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER trg_mx_updated BEFORE UPDATE ON public.maintenance_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_mx_aircraft ON public.maintenance_items(aircraft_id);

-- =========================
-- STORAGE BUCKETS
-- =========================
INSERT INTO storage.buckets (id, name, public) VALUES ('aircraft-photos', 'aircraft-photos', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('service-photos', 'service-photos', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('part-photos', 'part-photos', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('reports', 'reports', true);

-- Storage policies (public read, authenticated write)
CREATE POLICY "Public read aircraft photos" ON storage.objects FOR SELECT USING (bucket_id = 'aircraft-photos');
CREATE POLICY "Auth upload aircraft photos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'aircraft-photos' AND auth.role() = 'authenticated');
CREATE POLICY "Auth update aircraft photos" ON storage.objects FOR UPDATE USING (bucket_id = 'aircraft-photos' AND auth.role() = 'authenticated');
CREATE POLICY "Auth delete aircraft photos" ON storage.objects FOR DELETE USING (bucket_id = 'aircraft-photos' AND auth.role() = 'authenticated');

CREATE POLICY "Public read service photos" ON storage.objects FOR SELECT USING (bucket_id = 'service-photos');
CREATE POLICY "Auth upload service photos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'service-photos' AND auth.role() = 'authenticated');
CREATE POLICY "Auth update service photos" ON storage.objects FOR UPDATE USING (bucket_id = 'service-photos' AND auth.role() = 'authenticated');
CREATE POLICY "Auth delete service photos" ON storage.objects FOR DELETE USING (bucket_id = 'service-photos' AND auth.role() = 'authenticated');

CREATE POLICY "Public read part photos" ON storage.objects FOR SELECT USING (bucket_id = 'part-photos');
CREATE POLICY "Auth upload part photos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'part-photos' AND auth.role() = 'authenticated');
CREATE POLICY "Auth update part photos" ON storage.objects FOR UPDATE USING (bucket_id = 'part-photos' AND auth.role() = 'authenticated');
CREATE POLICY "Auth delete part photos" ON storage.objects FOR DELETE USING (bucket_id = 'part-photos' AND auth.role() = 'authenticated');

CREATE POLICY "Public read documents" ON storage.objects FOR SELECT USING (bucket_id = 'documents');
CREATE POLICY "Auth upload documents" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'documents' AND auth.role() = 'authenticated');
CREATE POLICY "Auth delete documents" ON storage.objects FOR DELETE USING (bucket_id = 'documents' AND auth.role() = 'authenticated');

CREATE POLICY "Public read reports" ON storage.objects FOR SELECT USING (bucket_id = 'reports');
CREATE POLICY "Auth upload reports" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'reports' AND auth.role() = 'authenticated');
