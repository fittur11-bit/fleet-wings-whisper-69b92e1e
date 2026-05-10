-- Tabela de Tripulação
CREATE TABLE public.crew_members (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    full_name TEXT NOT NULL,
    license_number TEXT,
    cma_expiration DATE,
    ifr_expiration DATE,
    type_ratings TEXT[], -- Habilitações de tipo
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.crew_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all crew members" ON public.crew_members FOR SELECT USING (true);
CREATE POLICY "Users can manage crew members" ON public.crew_members FOR ALL USING (auth.uid() IS NOT NULL);

-- Tabela de Diários de Bordo (Flight Logs)
CREATE TABLE public.flight_logs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    aircraft_id UUID NOT NULL REFERENCES public.aircraft(id) ON DELETE CASCADE,
    pilot_id UUID REFERENCES public.crew_members(id),
    copilot_id UUID REFERENCES public.crew_members(id),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    departure_airport TEXT,
    arrival_airport TEXT,
    off_block_time TIME,
    on_block_time TIME,
    takeoff_time TIME,
    landing_time TIME,
    flight_time NUMERIC(10, 2) NOT NULL DEFAULT 0, -- Em horas decimais
    cycles INTEGER NOT NULL DEFAULT 1,
    fuel_loaded NUMERIC(10, 2) DEFAULT 0,
    fuel_burned NUMERIC(10, 2) DEFAULT 0,
    nature_of_flight TEXT, -- Comercial, Instrução, Privado, etc.
    notes TEXT,
    user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.flight_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all flight logs" ON public.flight_logs FOR SELECT USING (true);
CREATE POLICY "Users can manage flight logs" ON public.flight_logs FOR ALL USING (auth.uid() = user_id);

-- Função para atualizar horas e ciclos da aeronave
CREATE OR REPLACE FUNCTION public.update_aircraft_totals()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE public.aircraft 
        SET total_hours = COALESCE(total_hours, 0) + NEW.flight_time
        WHERE id = NEW.aircraft_id;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE public.aircraft 
        SET total_hours = GREATEST(0, COALESCE(total_hours, 0) - OLD.flight_time)
        WHERE id = OLD.aircraft_id;
    ELSIF (TG_OP = 'UPDATE') THEN
        UPDATE public.aircraft 
        SET total_hours = GREATEST(0, COALESCE(total_hours, 0) - OLD.flight_time + NEW.flight_time)
        WHERE id = NEW.aircraft_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_update_aircraft_totals
AFTER INSERT OR UPDATE OR DELETE ON public.flight_logs
FOR EACH ROW EXECUTE FUNCTION public.update_aircraft_totals();
