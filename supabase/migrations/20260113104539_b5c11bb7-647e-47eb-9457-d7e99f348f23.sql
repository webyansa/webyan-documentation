-- Add file upload settings to system_settings
INSERT INTO public.system_settings (key, value, description)
VALUES 
  ('max_upload_size_mb', '1', 'الحد الأقصى لحجم الملفات المرفوعة بالميجابايت'),
  ('allowed_file_types', 'image/jpeg,image/png,image/gif,image/webp', 'أنواع الملفات المسموح بها')
ON CONFLICT (key) DO NOTHING;