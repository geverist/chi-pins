-- Create storage bucket for logo
INSERT INTO storage.buckets (id, name, public)
VALUES ('logo', 'logo', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to logo
CREATE POLICY "Allow public read access to logo"
ON storage.objects FOR SELECT
USING (bucket_id = 'logo');

-- Allow public upload to logo bucket (for admin panel)
-- In production, you'd want to add authentication checks here
CREATE POLICY "Allow public upload to logo"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'logo');

-- Allow public delete from logo bucket (for admin panel)
CREATE POLICY "Allow public delete from logo"
ON storage.objects FOR DELETE
USING (bucket_id = 'logo');
