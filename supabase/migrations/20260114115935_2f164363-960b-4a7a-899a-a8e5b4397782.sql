
-- Create embed_tokens table for secure embedding
CREATE TABLE public.embed_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.client_organizations(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  allowed_domains TEXT[] DEFAULT '{}',
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.embed_tokens ENABLE ROW LEVEL SECURITY;

-- Admin can manage embed tokens
CREATE POLICY "Admins can manage embed tokens"
  ON public.embed_tokens
  FOR ALL
  USING (public.is_admin(auth.uid()));

-- Index for fast token lookup
CREATE INDEX idx_embed_tokens_token ON public.embed_tokens(token);
CREATE INDEX idx_embed_tokens_organization ON public.embed_tokens(organization_id);

-- Add trigger for updated_at
CREATE TRIGGER update_embed_tokens_updated_at
  BEFORE UPDATE ON public.embed_tokens
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
