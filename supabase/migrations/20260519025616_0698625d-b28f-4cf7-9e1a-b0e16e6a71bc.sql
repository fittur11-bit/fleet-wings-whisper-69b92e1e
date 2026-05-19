-- Add applicability columns to parts table
ALTER TABLE public.parts 
ADD COLUMN IF NOT EXISTS applicable_models JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS cross_reference_pns TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS is_pma BOOLEAN DEFAULT false;

-- Create index for faster P/N searches
CREATE INDEX IF NOT EXISTS idx_parts_part_number ON public.parts(part_number);
CREATE INDEX IF NOT EXISTS idx_parts_cross_reference ON public.parts USING GIN(cross_reference_pns);