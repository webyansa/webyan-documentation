-- Add archived status to conversations for trash functionality
-- We'll use a simple 'archived' flag since the status enum already exists

-- Add archived column to conversations if not exists
ALTER TABLE public.conversations 
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Add index for archived conversations
CREATE INDEX IF NOT EXISTS idx_conversations_archived 
ON public.conversations(archived_at) 
WHERE archived_at IS NOT NULL;