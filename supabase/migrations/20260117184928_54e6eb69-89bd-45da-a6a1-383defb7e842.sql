-- Create user activity log table
CREATE TABLE public.user_activity_log (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user_email TEXT,
    user_name TEXT,
    action_type TEXT NOT NULL,
    action_details TEXT,
    ip_address TEXT,
    user_agent TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_activity_log ENABLE ROW LEVEL SECURITY;

-- Create index for faster queries
CREATE INDEX idx_user_activity_log_user_id ON public.user_activity_log(user_id);
CREATE INDEX idx_user_activity_log_action_type ON public.user_activity_log(action_type);
CREATE INDEX idx_user_activity_log_created_at ON public.user_activity_log(created_at DESC);

-- RLS policy: Only admins can view activity logs
CREATE POLICY "Admins can view all activity logs"
ON public.user_activity_log
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

-- RLS policy: System can insert activity logs
CREATE POLICY "System can insert activity logs"
ON public.user_activity_log
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Function to log user activity
CREATE OR REPLACE FUNCTION public.log_user_activity(
    p_user_id UUID,
    p_user_email TEXT,
    p_user_name TEXT,
    p_action_type TEXT,
    p_action_details TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_log_id UUID;
BEGIN
    INSERT INTO public.user_activity_log (
        user_id,
        user_email,
        user_name,
        action_type,
        action_details,
        metadata
    ) VALUES (
        p_user_id,
        p_user_email,
        p_user_name,
        p_action_type,
        p_action_details,
        p_metadata
    )
    RETURNING id INTO v_log_id;
    
    RETURN v_log_id;
END;
$$;

-- Function to log role changes
CREATE OR REPLACE FUNCTION public.log_role_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_email TEXT;
    v_user_name TEXT;
    v_actor_email TEXT;
    v_actor_name TEXT;
BEGIN
    -- Get the affected user's info
    SELECT email, full_name INTO v_user_email, v_user_name
    FROM public.profiles
    WHERE id = COALESCE(NEW.user_id, OLD.user_id);

    -- Get the actor's info (current user making the change)
    SELECT email, full_name INTO v_actor_email, v_actor_name
    FROM public.profiles
    WHERE id = auth.uid();

    IF TG_OP = 'INSERT' THEN
        PERFORM public.log_user_activity(
            NEW.user_id,
            v_user_email,
            v_user_name,
            'role_assigned',
            'تم تعيين صلاحية ' || NEW.role::text,
            jsonb_build_object(
                'new_role', NEW.role,
                'assigned_by', v_actor_email,
                'assigned_by_name', v_actor_name
            )
        );
    ELSIF TG_OP = 'UPDATE' THEN
        PERFORM public.log_user_activity(
            NEW.user_id,
            v_user_email,
            v_user_name,
            'role_changed',
            'تم تغيير الصلاحية من ' || OLD.role::text || ' إلى ' || NEW.role::text,
            jsonb_build_object(
                'old_role', OLD.role,
                'new_role', NEW.role,
                'changed_by', v_actor_email,
                'changed_by_name', v_actor_name
            )
        );
    ELSIF TG_OP = 'DELETE' THEN
        PERFORM public.log_user_activity(
            OLD.user_id,
            v_user_email,
            v_user_name,
            'role_removed',
            'تم إزالة صلاحية ' || OLD.role::text,
            jsonb_build_object(
                'removed_role', OLD.role,
                'removed_by', v_actor_email,
                'removed_by_name', v_actor_name
            )
        );
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger for role changes
CREATE TRIGGER on_role_change
AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.log_role_change();