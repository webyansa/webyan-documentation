-- Create storage bucket for media files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'docs-media',
  'docs-media',
  true,
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for docs-media bucket
CREATE POLICY "Anyone can view docs media"
ON storage.objects FOR SELECT
USING (bucket_id = 'docs-media');

CREATE POLICY "Admins and editors can upload docs media"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'docs-media' 
  AND public.is_admin_or_editor(auth.uid())
);

CREATE POLICY "Admins and editors can update docs media"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'docs-media' 
  AND public.is_admin_or_editor(auth.uid())
);

CREATE POLICY "Admins can delete docs media"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'docs-media' 
  AND public.is_admin(auth.uid())
);