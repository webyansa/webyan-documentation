-- Create storage bucket for chat attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-attachments', 'chat-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to read chat attachments (public bucket)
CREATE POLICY "Anyone can view chat attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'chat-attachments');

-- Allow anyone to upload to chat-attachments bucket
CREATE POLICY "Anyone can upload chat attachments"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'chat-attachments');

-- Allow anyone to update their own uploads
CREATE POLICY "Anyone can update chat attachments"
ON storage.objects FOR UPDATE
USING (bucket_id = 'chat-attachments');

-- Allow anyone to delete their own uploads
CREATE POLICY "Anyone can delete chat attachments"
ON storage.objects FOR DELETE
USING (bucket_id = 'chat-attachments');

-- Create typing_indicators table for real-time typing status
CREATE TABLE IF NOT EXISTS public.typing_indicators (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  user_name TEXT,
  user_type TEXT NOT NULL CHECK (user_type IN ('agent', 'client', 'embed')),
  is_typing BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on typing_indicators
ALTER TABLE public.typing_indicators ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read typing indicators
CREATE POLICY "Anyone can view typing indicators"
ON public.typing_indicators FOR SELECT
USING (true);

-- Allow anyone to insert typing indicators
CREATE POLICY "Anyone can insert typing indicators"
ON public.typing_indicators FOR INSERT
WITH CHECK (true);

-- Allow anyone to update typing indicators
CREATE POLICY "Anyone can update typing indicators"
ON public.typing_indicators FOR UPDATE
USING (true);

-- Allow anyone to delete typing indicators
CREATE POLICY "Anyone can delete typing indicators"
ON public.typing_indicators FOR DELETE
USING (true);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_typing_indicators_conversation 
ON public.typing_indicators(conversation_id);

-- Add unique constraint to prevent duplicate entries
ALTER TABLE public.typing_indicators 
ADD CONSTRAINT unique_typing_indicator UNIQUE (conversation_id, user_id);

-- Enable realtime for typing indicators
ALTER PUBLICATION supabase_realtime ADD TABLE public.typing_indicators;