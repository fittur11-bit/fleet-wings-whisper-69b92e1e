-- Allow public read access to aircraft-photos
CREATE POLICY "Public Access Aircraft Photos" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'aircraft-photos');

-- Allow public read access to service-photos
CREATE POLICY "Public Access Service Photos" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'service-photos');

-- Allow public read access to part-photos
CREATE POLICY "Public Access Part Photos" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'part-photos');

-- Allow public read access to documents
CREATE POLICY "Public Access Documents" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'documents');

-- Allow public read access to reports
CREATE POLICY "Public Access Reports" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'reports');