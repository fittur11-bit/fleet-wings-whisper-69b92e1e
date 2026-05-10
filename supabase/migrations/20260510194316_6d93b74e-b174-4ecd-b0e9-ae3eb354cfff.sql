-- Drop existing aircraft policies
DROP POLICY IF EXISTS "Users view own aircraft" ON public.aircraft;
DROP POLICY IF EXISTS "Users insert own aircraft" ON public.aircraft;
DROP POLICY IF EXISTS "Users update own aircraft" ON public.aircraft;
DROP POLICY IF EXISTS "Users delete own aircraft" ON public.aircraft;

-- Create more flexible policies for aircraft
CREATE POLICY "Allow authenticated users to view all aircraft"
ON public.aircraft FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to insert aircraft"
ON public.aircraft FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow authenticated users to update their own aircraft"
ON public.aircraft FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Allow authenticated users to delete their own aircraft"
ON public.aircraft FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Storage fixes for all relevant buckets
-- Ensure buckets exist and are public
UPDATE storage.buckets SET public = true WHERE id IN ('aircraft-photos', 'service-photos', 'part-photos', 'documents', 'reports');

-- Drop and recreate storage policies for all buckets to be consistent
DO $$ 
BEGIN
    -- Insert policy
    DROP POLICY IF EXISTS "Allow authenticated uploads to aircraft-photos" ON storage.objects;
    DROP POLICY IF EXISTS "Auth upload aircraft photos" ON storage.objects;
    CREATE POLICY "Authenticated users can upload objects"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id IN ('aircraft-photos', 'service-photos', 'part-photos', 'documents', 'reports'));

    -- Select policy (Public)
    DROP POLICY IF EXISTS "Public Access Aircraft Photos" ON storage.objects;
    DROP POLICY IF EXISTS "Public Access Service Photos" ON storage.objects;
    DROP POLICY IF EXISTS "Public Access Part Photos" ON storage.objects;
    DROP POLICY IF EXISTS "Public Access Documents" ON storage.objects;
    DROP POLICY IF EXISTS "Public Access Reports" ON storage.objects;
    CREATE POLICY "Public can view objects"
    ON storage.objects FOR SELECT
    TO public
    USING (bucket_id IN ('aircraft-photos', 'service-photos', 'part-photos', 'documents', 'reports'));

    -- Update policy
    DROP POLICY IF EXISTS "Allow authenticated updates to aircraft-photos" ON storage.objects;
    DROP POLICY IF EXISTS "Auth update aircraft photos" ON storage.objects;
    CREATE POLICY "Authenticated users can update objects"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (bucket_id IN ('aircraft-photos', 'service-photos', 'part-photos', 'documents', 'reports'));

    -- Delete policy
    DROP POLICY IF EXISTS "Allow authenticated deletes from aircraft-photos" ON storage.objects;
    DROP POLICY IF EXISTS "Auth delete aircraft photos" ON storage.objects;
    CREATE POLICY "Authenticated users can delete objects"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (bucket_id IN ('aircraft-photos', 'service-photos', 'part-photos', 'documents', 'reports'));
END $$;
