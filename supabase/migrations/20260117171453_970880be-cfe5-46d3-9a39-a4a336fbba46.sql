-- Add is_starred column to conversations table for marking important conversations
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS is_starred BOOLEAN DEFAULT false;

-- Create index for faster queries on starred conversations
CREATE INDEX IF NOT EXISTS idx_conversations_is_starred ON public.conversations(is_starred) WHERE is_starred = true;