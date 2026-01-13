-- Create system settings table for email configuration
CREATE TABLE public.system_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can view settings
CREATE POLICY "Admins can view settings"
ON public.system_settings
FOR SELECT
USING (public.is_admin(auth.uid()));

-- Only admins can manage settings
CREATE POLICY "Admins can manage settings"
ON public.system_settings
FOR ALL
USING (public.is_admin(auth.uid()));

-- Insert default email settings
INSERT INTO public.system_settings (key, value, description) VALUES
('admin_email', 'support@webyan.net', 'البريد الإلكتروني لاستقبال إشعارات التذاكر'),
('company_name', 'ويبيان', 'اسم الشركة'),
('support_response_time', '48', 'وقت الاستجابة المتوقع بالساعات');

-- Add trigger for updated_at
CREATE TRIGGER update_system_settings_updated_at
BEFORE UPDATE ON public.system_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();