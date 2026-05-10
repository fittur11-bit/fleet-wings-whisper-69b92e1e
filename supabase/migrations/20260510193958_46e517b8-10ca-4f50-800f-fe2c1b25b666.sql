-- Drop existing insert policy if it exists to recreate it correctly
DROP POLICY IF EXISTS "Auth upload aircraft photos" ON storage.objects;

-- Create a robust policy for uploading aircraft photos
CREATE POLICY "Allow authenticated uploads to aircraft-photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'aircraft-photos');

-- Ensure update and delete are also available for authenticated users
DROP POLICY IF EXISTS "Auth update aircraft photos" ON storage.objects;
CREATE POLICY "Allow authenticated updates to aircraft-photos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'aircraft-photos');

DROP POLICY IF EXISTS "Auth delete aircraft photos" ON storage.objects;
CREATE POLICY "Allow authenticated deletes from aircraft-photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'aircraft-photos');
