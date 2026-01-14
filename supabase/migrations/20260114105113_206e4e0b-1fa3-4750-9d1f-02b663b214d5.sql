-- إضافة جدول تقييمات الاجتماعات
CREATE TABLE public.meeting_ratings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_id UUID NOT NULL REFERENCES public.meeting_requests(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.client_organizations(id) ON DELETE CASCADE,
  rated_by UUID REFERENCES auth.users(id),
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- تفعيل RLS
ALTER TABLE public.meeting_ratings ENABLE ROW LEVEL SECURITY;

-- سياسات الأمان لتقييمات الاجتماعات
CREATE POLICY "Admins can view all ratings"
  ON public.meeting_ratings FOR SELECT
  USING (is_admin_or_editor(auth.uid()));

CREATE POLICY "Clients can insert rating for their meetings"
  ON public.meeting_ratings FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM client_accounts
      WHERE client_accounts.organization_id = meeting_ratings.organization_id
      AND client_accounts.user_id = auth.uid()
    )
  );

CREATE POLICY "Clients can view their organization ratings"
  ON public.meeting_ratings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM client_accounts
      WHERE client_accounts.organization_id = meeting_ratings.organization_id
      AND client_accounts.user_id = auth.uid()
    )
  );

-- إضافة index للبحث السريع
CREATE INDEX idx_meeting_ratings_meeting_id ON public.meeting_ratings(meeting_id);
CREATE INDEX idx_meeting_ratings_organization_id ON public.meeting_ratings(organization_id);