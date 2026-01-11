-- Create notifications table for users
CREATE TABLE public.user_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  article_id UUID REFERENCES public.docs_articles(id) ON DELETE CASCADE,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see their own notifications
CREATE POLICY "Users can view their own notifications" 
ON public.user_notifications 
FOR SELECT 
USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications" 
ON public.user_notifications 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Users can delete their own notifications
CREATE POLICY "Users can delete their own notifications" 
ON public.user_notifications 
FOR DELETE 
USING (auth.uid() = user_id);

-- Admins/editors can create notifications for all users
CREATE POLICY "Admins can create notifications" 
ON public.user_notifications 
FOR INSERT 
WITH CHECK (public.is_admin_or_editor(auth.uid()));

-- Create function to notify all users when an article is published
CREATE OR REPLACE FUNCTION public.notify_users_on_article_publish()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger when status changes to 'published'
  IF (TG_OP = 'UPDATE' AND OLD.status != 'published' AND NEW.status = 'published') 
     OR (TG_OP = 'INSERT' AND NEW.status = 'published') THEN
    INSERT INTO public.user_notifications (user_id, title, message, type, article_id)
    SELECT 
      ur.user_id,
      'مقال جديد: ' || NEW.title,
      'تم نشر مقال جديد في مركز المساعدة',
      'new_article',
      NEW.id
    FROM public.user_roles ur
    WHERE ur.role = 'viewer';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for article publish notifications
CREATE TRIGGER on_article_publish
AFTER INSERT OR UPDATE ON public.docs_articles
FOR EACH ROW
EXECUTE FUNCTION public.notify_users_on_article_publish();

-- Enable realtime for modules, submodules tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.docs_modules;
ALTER PUBLICATION supabase_realtime ADD TABLE public.docs_submodules;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_notifications;