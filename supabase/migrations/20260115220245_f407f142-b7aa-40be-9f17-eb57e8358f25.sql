-- Add custom message fields to embed_tokens table
ALTER TABLE public.embed_tokens
ADD COLUMN IF NOT EXISTS welcome_message TEXT DEFAULT 'مرحباً بك! 👋 يسعدنا التواصل معك. فريق الدعم الفني جاهز لمساعدتك.',
ADD COLUMN IF NOT EXISTS default_message TEXT DEFAULT 'مرحباً، أحتاج المساعدة بخصوص...',
ADD COLUMN IF NOT EXISTS primary_color TEXT DEFAULT '#263c84',
ADD COLUMN IF NOT EXISTS secondary_color TEXT DEFAULT '#24c2ec';

-- Add comment for documentation
COMMENT ON COLUMN public.embed_tokens.welcome_message IS 'Custom welcome message shown to clients';
COMMENT ON COLUMN public.embed_tokens.default_message IS 'Default message pre-filled in chat input';
COMMENT ON COLUMN public.embed_tokens.primary_color IS 'Primary brand color for the widget';
COMMENT ON COLUMN public.embed_tokens.secondary_color IS 'Secondary/accent color for the widget';