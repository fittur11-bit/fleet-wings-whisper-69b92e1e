-- Add supplier_id to services table
ALTER TABLE public.services 
ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL;

-- Add supplier_id to maintenance_items table
ALTER TABLE public.maintenance_items 
ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_services_supplier_id ON public.services(supplier_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_items_supplier_id ON public.maintenance_items(supplier_id);