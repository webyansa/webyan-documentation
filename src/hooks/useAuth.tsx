import { useState, useEffect, createContext, useContext, ReactNode, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type AppRole = 'admin' | 'editor' | 'support_agent' | 'viewer';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: AppRole | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  isEditor: boolean;
  isAdminOrEditor: boolean;
  isSupportAgent: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [roleLoading, setRoleLoading] = useState(true);

  const fetchUserRole = useCallback(async (userId: string) => {
    try {
      setRoleLoading(true);
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching user role:', error);
        setRole(null);
      } else {
        setRole(data?.role as AppRole | null);
      }
    } catch (error) {
      console.error('Error fetching user role:', error);
      setRole(null);
    } finally {
      setRoleLoading(false);
    }
  }, []);

  const logActivity = useCallback(async (
    userId: string, 
    email: string, 
    actionType: string, 
    actionDetails?: string
  ) => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', userId)
        .maybeSingle();

      await supabase.rpc('log_user_activity', {
        p_user_id: userId,
        p_user_email: email,
        p_user_name: profile?.full_name || email,
        p_action_type: actionType,
        p_action_details: actionDetails || null,
        p_metadata: null
      });
    } catch (error) {
      console.error('Error logging activity:', error);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        if (!mounted) return;
        
        setSession(newSession);
        setUser(newSession?.user ?? null);
        
        // Log login/logout events
        if (event === 'SIGNED_IN' && newSession?.user) {
          logActivity(
            newSession.user.id,
            newSession.user.email || '',
            'login',
            'تسجيل دخول إلى النظام'
          );
        } else if (event === 'SIGNED_OUT' && session?.user) {
          logActivity(
            session.user.id,
            session.user.email || '',
            'logout',
            'تسجيل خروج من النظام'
          );
        }
        
        // Defer role fetching to avoid deadlock
        if (newSession?.user) {
          setTimeout(() => {
            if (mounted) {
              fetchUserRole(newSession.user.id);
            }
          }, 0);
        } else {
          setRole(null);
          setRoleLoading(false);
        }
        
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      if (!mounted) return;
      
      setSession(existingSession);
      setUser(existingSession?.user ?? null);
      
      if (existingSession?.user) {
        fetchUserRole(existingSession.user.id);
      } else {
        setRoleLoading(false);
      }
      
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchUserRole, logActivity, session]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error: error as Error | null };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
        },
      },
    });

    // Send welcome email if signup was successful
    if (!error && data.user) {
      try {
        await supabase.functions.invoke('send-welcome-email', {
          body: {
            email: email,
            name: fullName,
          },
        });
      } catch (emailError) {
        console.error('Failed to send welcome email:', emailError);
        // Don't fail the signup if welcome email fails
      }
    }

    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setRole(null);
  };

  const isAdmin = role === 'admin';
  const isEditor = role === 'editor';
  const isSupportAgent = role === 'support_agent';
  const isAdminOrEditor = isAdmin || isEditor;

  // Combined loading - wait for both auth and role to be loaded
  const isFullyLoaded = !loading && !roleLoading;

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        role,
        loading: !isFullyLoaded,
        signIn,
        signUp,
        signOut,
        isAdmin,
        isEditor,
        isAdminOrEditor,
        isSupportAgent,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
