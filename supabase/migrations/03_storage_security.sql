-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Public Read Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Uploads" ON storage.objects;
DROP POLICY IF EXISTS "Owner Update" ON storage.objects;
DROP POLICY IF EXISTS "Owner Delete" ON storage.objects;

-- 1. READ: Allow public read for any environment's avatar bucket
CREATE POLICY "Public Read Access" 
ON storage.objects FOR SELECT 
USING ( bucket_id LIKE '%-avatars' );

-- 2. INSERT: Allow uploads for any environment's avatar bucket
CREATE POLICY "Authenticated Uploads" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK ( bucket_id LIKE '%-avatars' );

-- 3. UPDATE: Allow users to modify ONLY their own uploaded images
CREATE POLICY "Owner Update" 
ON storage.objects FOR UPDATE 
TO authenticated 
USING ( bucket_id LIKE '%-avatars' AND auth.uid() = owner );

-- 4. DELETE: Allow users to delete ONLY their own uploaded images
CREATE POLICY "Owner Delete" 
ON storage.objects FOR DELETE 
TO authenticated 
USING ( bucket_id LIKE '%-avatars' AND auth.uid() = owner );