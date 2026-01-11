
-- Create app_role enum for roles
CREATE TYPE public.app_role AS ENUM ('admin', 'editor', 'viewer');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'viewer',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Create docs_modules table
CREATE TABLE public.docs_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT 'BookOpen',
  color TEXT DEFAULT 'primary',
  sort_order INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create docs_submodules table
CREATE TABLE public.docs_submodules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID REFERENCES public.docs_modules(id) ON DELETE CASCADE NOT NULL,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT 'FileText',
  sort_order INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (module_id, slug)
);

-- Create article_status enum
CREATE TYPE public.article_status AS ENUM ('draft', 'published', 'archived');

-- Create difficulty_level enum
CREATE TYPE public.difficulty_level AS ENUM ('beginner', 'intermediate', 'advanced');

-- Create docs_articles table
CREATE TABLE public.docs_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submodule_id UUID REFERENCES public.docs_submodules(id) ON DELETE CASCADE NOT NULL,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  objective TEXT,
  target_roles TEXT[],
  prerequisites TEXT[],
  content TEXT,
  steps JSONB DEFAULT '[]'::jsonb,
  notes TEXT[],
  warnings TEXT[],
  common_errors JSONB DEFAULT '[]'::jsonb,
  faqs JSONB DEFAULT '[]'::jsonb,
  related_articles UUID[],
  difficulty difficulty_level DEFAULT 'beginner',
  status article_status DEFAULT 'draft',
  version INTEGER DEFAULT 1,
  author_id UUID REFERENCES auth.users(id),
  reviewer_id UUID REFERENCES auth.users(id),
  views_count INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_at TIMESTAMPTZ,
  UNIQUE (submodule_id, slug)
);

-- Create docs_article_versions table for versioning
CREATE TABLE public.docs_article_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID REFERENCES public.docs_articles(id) ON DELETE CASCADE NOT NULL,
  version INTEGER NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  steps JSONB,
  changed_by UUID REFERENCES auth.users(id),
  change_summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create docs_media table
CREATE TABLE public.docs_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename TEXT NOT NULL,
  original_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER,
  url TEXT NOT NULL,
  alt_text TEXT,
  article_id UUID REFERENCES public.docs_articles(id) ON DELETE SET NULL,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create docs_feedback table
CREATE TABLE public.docs_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID REFERENCES public.docs_articles(id) ON DELETE CASCADE NOT NULL,
  is_helpful BOOLEAN NOT NULL,
  reason TEXT,
  comment TEXT,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create docs_search_logs table
CREATE TABLE public.docs_search_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query TEXT NOT NULL,
  results_count INTEGER DEFAULT 0,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create docs_issue_reports table
CREATE TABLE public.docs_issue_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID REFERENCES public.docs_articles(id) ON DELETE CASCADE,
  issue_type TEXT NOT NULL,
  description TEXT NOT NULL,
  reporter_email TEXT,
  user_id UUID REFERENCES auth.users(id),
  status TEXT DEFAULT 'open',
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create docs_tags table
CREATE TABLE public.docs_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  color TEXT DEFAULT 'gray',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create docs_article_tags junction table
CREATE TABLE public.docs_article_tags (
  article_id UUID REFERENCES public.docs_articles(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES public.docs_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (article_id, tag_id)
);

-- Create docs_changelog table
CREATE TABLE public.docs_changelog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  changes JSONB DEFAULT '[]'::jsonb,
  impact TEXT,
  author_id UUID REFERENCES auth.users(id),
  published_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.docs_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.docs_submodules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.docs_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.docs_article_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.docs_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.docs_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.docs_search_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.docs_issue_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.docs_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.docs_article_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.docs_changelog ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to check if user is admin or editor
CREATE OR REPLACE FUNCTION public.is_admin_or_editor(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'editor')
  )
$$;

-- Create function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'admin'
  )
$$;

-- Profiles policies
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- User roles policies (only admins can manage)
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT USING (public.is_admin(auth.uid()));
CREATE POLICY "Users can view own role" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can insert roles" ON public.user_roles FOR INSERT WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins can update roles" ON public.user_roles FOR UPDATE USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can delete roles" ON public.user_roles FOR DELETE USING (public.is_admin(auth.uid()));

-- Docs modules policies (public read, admin/editor write)
CREATE POLICY "Anyone can view published modules" ON public.docs_modules FOR SELECT USING (is_published = true OR public.is_admin_or_editor(auth.uid()));
CREATE POLICY "Admins and editors can insert modules" ON public.docs_modules FOR INSERT WITH CHECK (public.is_admin_or_editor(auth.uid()));
CREATE POLICY "Admins and editors can update modules" ON public.docs_modules FOR UPDATE USING (public.is_admin_or_editor(auth.uid()));
CREATE POLICY "Admins can delete modules" ON public.docs_modules FOR DELETE USING (public.is_admin(auth.uid()));

-- Docs submodules policies
CREATE POLICY "Anyone can view published submodules" ON public.docs_submodules FOR SELECT USING (is_published = true OR public.is_admin_or_editor(auth.uid()));
CREATE POLICY "Admins and editors can insert submodules" ON public.docs_submodules FOR INSERT WITH CHECK (public.is_admin_or_editor(auth.uid()));
CREATE POLICY "Admins and editors can update submodules" ON public.docs_submodules FOR UPDATE USING (public.is_admin_or_editor(auth.uid()));
CREATE POLICY "Admins can delete submodules" ON public.docs_submodules FOR DELETE USING (public.is_admin(auth.uid()));

-- Docs articles policies
CREATE POLICY "Anyone can view published articles" ON public.docs_articles FOR SELECT USING (status = 'published' OR public.is_admin_or_editor(auth.uid()));
CREATE POLICY "Admins and editors can insert articles" ON public.docs_articles FOR INSERT WITH CHECK (public.is_admin_or_editor(auth.uid()));
CREATE POLICY "Admins and editors can update articles" ON public.docs_articles FOR UPDATE USING (public.is_admin_or_editor(auth.uid()));
CREATE POLICY "Admins can delete articles" ON public.docs_articles FOR DELETE USING (public.is_admin(auth.uid()));

-- Article versions policies
CREATE POLICY "Admins and editors can view versions" ON public.docs_article_versions FOR SELECT USING (public.is_admin_or_editor(auth.uid()));
CREATE POLICY "Admins and editors can insert versions" ON public.docs_article_versions FOR INSERT WITH CHECK (public.is_admin_or_editor(auth.uid()));

-- Media policies
CREATE POLICY "Anyone can view media" ON public.docs_media FOR SELECT USING (true);
CREATE POLICY "Admins and editors can insert media" ON public.docs_media FOR INSERT WITH CHECK (public.is_admin_or_editor(auth.uid()));
CREATE POLICY "Admins and editors can update media" ON public.docs_media FOR UPDATE USING (public.is_admin_or_editor(auth.uid()));
CREATE POLICY "Admins can delete media" ON public.docs_media FOR DELETE USING (public.is_admin(auth.uid()));

-- Feedback policies (anyone can submit, admins can view all)
CREATE POLICY "Anyone can insert feedback" ON public.docs_feedback FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can view all feedback" ON public.docs_feedback FOR SELECT USING (public.is_admin(auth.uid()));
CREATE POLICY "Users can view own feedback" ON public.docs_feedback FOR SELECT USING (auth.uid() = user_id);

-- Search logs policies
CREATE POLICY "Anyone can insert search logs" ON public.docs_search_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can view search logs" ON public.docs_search_logs FOR SELECT USING (public.is_admin(auth.uid()));

-- Issue reports policies
CREATE POLICY "Anyone can insert issue reports" ON public.docs_issue_reports FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can view all issue reports" ON public.docs_issue_reports FOR SELECT USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can update issue reports" ON public.docs_issue_reports FOR UPDATE USING (public.is_admin(auth.uid()));

-- Tags policies
CREATE POLICY "Anyone can view tags" ON public.docs_tags FOR SELECT USING (true);
CREATE POLICY "Admins and editors can manage tags" ON public.docs_tags FOR ALL USING (public.is_admin_or_editor(auth.uid()));

-- Article tags policies
CREATE POLICY "Anyone can view article tags" ON public.docs_article_tags FOR SELECT USING (true);
CREATE POLICY "Admins and editors can manage article tags" ON public.docs_article_tags FOR ALL USING (public.is_admin_or_editor(auth.uid()));

-- Changelog policies
CREATE POLICY "Anyone can view changelog" ON public.docs_changelog FOR SELECT USING (true);
CREATE POLICY "Admins can manage changelog" ON public.docs_changelog FOR ALL USING (public.is_admin(auth.uid()));

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data ->> 'full_name');
  
  -- Assign default viewer role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'viewer');
  
  RETURN NEW;
END;
$$;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_docs_modules_updated_at BEFORE UPDATE ON public.docs_modules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_docs_submodules_updated_at BEFORE UPDATE ON public.docs_submodules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_docs_articles_updated_at BEFORE UPDATE ON public.docs_articles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
