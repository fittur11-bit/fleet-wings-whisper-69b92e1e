-- Create part_shipments table
CREATE TABLE public.part_shipments (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    aircraft_id UUID NOT NULL REFERENCES public.aircraft(id) ON DELETE CASCADE,
    part_name TEXT NOT NULL,
    serial_number TEXT,
    shipping_date DATE NOT NULL DEFAULT CURRENT_DATE,
    estimated_return_date DATE,
    actual_return_date DATE,
    destination_workshop TEXT,
    budget_amount NUMERIC(12, 2) DEFAULT 0,
    overhaul_type TEXT CHECK (overhaul_type IN ('time', 'hours', 'other')),
    overhaul_threshold TEXT,
    status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'in_repair', 'received', 'cancelled')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.part_shipments ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own part shipments"
ON public.part_shipments FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own part shipments"
ON public.part_shipments FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own part shipments"
ON public.part_shipments FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own part shipments"
ON public.part_shipments FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_part_shipments_updated_at
BEFORE UPDATE ON public.part_shipments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
