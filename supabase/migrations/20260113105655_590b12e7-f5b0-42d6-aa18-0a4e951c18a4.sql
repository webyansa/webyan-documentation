
-- Create enum for organization types
CREATE TYPE public.organization_type AS ENUM ('charity', 'nonprofit', 'foundation', 'cooperative', 'other');

-- Create enum for subscription status
CREATE TYPE public.subscription_status AS ENUM ('trial', 'active', 'pending_renewal', 'expired', 'cancelled');

-- Create enum for meeting status
CREATE TYPE public.meeting_status AS ENUM ('pending', 'confirmed', 'completed', 'cancelled', 'rescheduled');

-- Create client organizations table
CREATE TABLE public.client_organizations (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    organization_type organization_type NOT NULL DEFAULT 'charity',
    registration_number TEXT,
    website_url TEXT,
    logo_url TEXT,
    contact_email TEXT NOT NULL,
    contact_phone TEXT,
    address TEXT,
    city TEXT,
    subscription_status subscription_status NOT NULL DEFAULT 'trial',
    subscription_plan TEXT DEFAULT 'basic',
    subscription_start_date TIMESTAMP WITH TIME ZONE,
    subscription_end_date TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create client accounts table (links users to organizations)
CREATE TABLE public.client_accounts (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.client_organizations(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone TEXT,
    job_title TEXT,
    is_primary_contact BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create meeting requests table
CREATE TABLE public.meeting_requests (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES public.client_organizations(id) ON DELETE CASCADE,
    requested_by UUID REFERENCES auth.users(id),
    meeting_type TEXT NOT NULL DEFAULT 'general',
    subject TEXT NOT NULL,
    description TEXT,
    preferred_date TIMESTAMP WITH TIME ZONE NOT NULL,
    alternative_date TIMESTAMP WITH TIME ZONE,
    duration_minutes INTEGER NOT NULL DEFAULT 30,
    status meeting_status NOT NULL DEFAULT 'pending',
    meeting_link TEXT,
    admin_notes TEXT,
    confirmed_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create subscription requests table
CREATE TABLE public.subscription_requests (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES public.client_organizations(id) ON DELETE CASCADE,
    requested_by UUID REFERENCES auth.users(id),
    request_type TEXT NOT NULL DEFAULT 'renewal',
    current_plan TEXT,
    requested_plan TEXT NOT NULL,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    admin_response TEXT,
    processed_by UUID REFERENCES auth.users(id),
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.client_organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for client_organizations
CREATE POLICY "Admins can manage all organizations"
ON public.client_organizations
FOR ALL
TO authenticated
USING (public.is_admin_or_editor(auth.uid()));

CREATE POLICY "Clients can view their own organization"
ON public.client_organizations
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.client_accounts
        WHERE client_accounts.organization_id = client_organizations.id
        AND client_accounts.user_id = auth.uid()
    )
);

-- RLS Policies for client_accounts
CREATE POLICY "Admins can manage all client accounts"
ON public.client_accounts
FOR ALL
TO authenticated
USING (public.is_admin_or_editor(auth.uid()));

CREATE POLICY "Clients can view their own account"
ON public.client_accounts
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Clients can update their own account"
ON public.client_accounts
FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

-- RLS Policies for meeting_requests
CREATE POLICY "Admins can manage all meeting requests"
ON public.meeting_requests
FOR ALL
TO authenticated
USING (public.is_admin_or_editor(auth.uid()));

CREATE POLICY "Clients can view their organization meetings"
ON public.meeting_requests
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.client_accounts
        WHERE client_accounts.organization_id = meeting_requests.organization_id
        AND client_accounts.user_id = auth.uid()
    )
);

CREATE POLICY "Clients can create meeting requests"
ON public.meeting_requests
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.client_accounts
        WHERE client_accounts.organization_id = meeting_requests.organization_id
        AND client_accounts.user_id = auth.uid()
    )
);

-- RLS Policies for subscription_requests
CREATE POLICY "Admins can manage all subscription requests"
ON public.subscription_requests
FOR ALL
TO authenticated
USING (public.is_admin_or_editor(auth.uid()));

CREATE POLICY "Clients can view their organization subscriptions"
ON public.subscription_requests
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.client_accounts
        WHERE client_accounts.organization_id = subscription_requests.organization_id
        AND client_accounts.user_id = auth.uid()
    )
);

CREATE POLICY "Clients can create subscription requests"
ON public.subscription_requests
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.client_accounts
        WHERE client_accounts.organization_id = subscription_requests.organization_id
        AND client_accounts.user_id = auth.uid()
    )
);

-- Create triggers for updated_at
CREATE TRIGGER update_client_organizations_updated_at
    BEFORE UPDATE ON public.client_organizations
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_client_accounts_updated_at
    BEFORE UPDATE ON public.client_accounts
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_meeting_requests_updated_at
    BEFORE UPDATE ON public.meeting_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_subscription_requests_updated_at
    BEFORE UPDATE ON public.subscription_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for these tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.client_organizations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.client_accounts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.meeting_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.subscription_requests;

-- Function to check if user is a client
CREATE OR REPLACE FUNCTION public.is_client(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.client_accounts
        WHERE user_id = _user_id
        AND is_active = true
    )
$$;

-- Function to get client organization
CREATE OR REPLACE FUNCTION public.get_client_organization(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT organization_id
    FROM public.client_accounts
    WHERE user_id = _user_id
    AND is_active = true
    LIMIT 1
$$;
