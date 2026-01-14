-- Create storage bucket for ticket attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'ticket-attachments', 
  'ticket-attachments', 
  true, 
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Allow public uploads to ticket-attachments bucket (for embed forms)
CREATE POLICY "Allow public uploads to ticket-attachments"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'ticket-attachments');

-- Allow public read access to ticket attachments
CREATE POLICY "Allow public read access to ticket-attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'ticket-attachments');