-- Add source tracking fields to support_tickets
ALTER TABLE public.support_tickets 
ADD COLUMN IF NOT EXISTS source text DEFAULT 'direct',
ADD COLUMN IF NOT EXISTS source_domain text;

-- Create index for better filtering by organization and source
CREATE INDEX IF NOT EXISTS idx_support_tickets_source ON public.support_tickets(source);

-- Add comment to describe source values
COMMENT ON COLUMN public.support_tickets.source IS 'Source of ticket: direct, embed, portal, api';
COMMENT ON COLUMN public.support_tickets.source_domain IS 'Domain from which embed ticket was submitted';