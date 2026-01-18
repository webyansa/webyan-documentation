import { useState, useEffect, createContext, useContext, ReactNode, useCallback, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type AppRole = 'admin' | 'editor' | 'support_agent' | 'client';
export type AuthStatus = 'unknown' | 'authenticated' | 'unauthenticated' | 'error';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: AppRole | null;
  authStatus: AuthStatus;
  authError: string | null;
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

const BOOTSTRAP_TIMEOUT_MS = 4500;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);

  // bootstrap: session state (fast)
  const [authStatus, setAuthStatus] = useState<AuthStatus>('unknown');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authBootstrapLoading, setAuthBootstrapLoading] = useState(true);

  /**
   * Role resolution:
   * - We only "block" the UI the FIRST time we resolve the role for the current user.
   * - Subsequent token refreshes / tab switching should NOT bring back a full-screen loader.
   */
  const [roleLoading, setRoleLoading] = useState(false);
  const [roleResolvedForUserId, setRoleResolvedForUserId] = useState<string | null>(null);

  const lastUserRef = useRef<User | null>(null);
  const roleFetchInFlightRef = useRef<Promise<void> | null>(null);
  const roleFetchUserIdRef = useRef<string | null>(null);

  const fetchUserRole = useCallback(
    async (userId: string, opts?: { silent?: boolean }) => {
      const silent = opts?.silent ?? false;

      // Deduplicate concurrent requests for the same user.
      if (roleFetchInFlightRef.current && roleFetchUserIdRef.current === userId) {
        return roleFetchInFlightRef.current;
      }

      roleFetchUserIdRef.current = userId;

      const promise = (async () => {
        const isFirstResolveForUser = roleResolvedForUserId !== userId;
        const shouldShowLoading = !silent && isFirstResolveForUser;
        if (shouldShowLoading) setRoleLoading(true);

        try {
          const { data, error } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', userId)
            .maybeSingle();

          if (error) {
            console.error('Error fetching user role:', error);
            if (isFirstResolveForUser) setRole(null);
            return;
          }

          setRole((data?.role as AppRole | null) ?? null);
        } catch (error) {
          console.error('Error fetching user role:', error);
          if (isFirstResolveForUser) setRole(null);
        } finally {
          setRoleResolvedForUserId(userId);
          setRoleLoading(false);
        }
      })();

      roleFetchInFlightRef.current = promise;
      promise.finally(() => {
        if (roleFetchInFlightRef.current === promise) roleFetchInFlightRef.current = null;
      });

      return promise;
    },
    [roleResolvedForUserId]
  );

  const logActivity = useCallback(
    async (userId: string, email: string, actionType: string, actionDetails?: string) => {
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
          p_metadata: null,
        });
      } catch (error) {
        console.error('Error logging activity:', error);
      }
    },
    []
  );

  useEffect(() => {
    let mounted = true;

    const bootstrapTimeoutId = window.setTimeout(() => {
      if (!mounted) return;
      setAuthError('timeout');
      setAuthStatus('unauthenticated');
      setSession(null);
      setUser(null);
      setRole(null);
      setAuthBootstrapLoading(false);
      setRoleLoading(false);
    }, BOOTSTRAP_TIMEOUT_MS);

    // Set up auth state listener FIRST
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (!mounted) return;

      const prevUser = lastUserRef.current;
      lastUserRef.current = newSession?.user ?? null;

      setAuthError(null);
      setSession(newSession);
      setUser(newSession?.user ?? null);
      setAuthStatus(newSession?.user ? 'authenticated' : 'unauthenticated');

      // IMPORTANT: defer any backend calls to avoid auth deadlocks
      if (event === 'SIGNED_IN' && newSession?.user) {
        setTimeout(() => {
          logActivity(
            newSession.user.id,
            newSession.user.email || '',
            'login',
            'تسجيل دخول إلى النظام'
          );
        }, 0);
      } else if (event === 'SIGNED_OUT' && prevUser) {
        setTimeout(() => {
          logActivity(prevUser.id, prevUser.email || '', 'logout', 'تسجيل خروج من النظام');
        }, 0);
      }

      if (newSession?.user) {
        setTimeout(() => {
          if (mounted) fetchUserRole(newSession.user.id);
        }, 0);
      } else {
        setRole(null);
        setRoleLoading(false);
      }

      setAuthBootstrapLoading(false);
      window.clearTimeout(bootstrapTimeoutId);
    });

    // THEN check for existing session (bootstrap)
    supabase.auth
      .getSession()
      .then(({ data: { session: existingSession }, error }) => {
        if (!mounted) return;
        window.clearTimeout(bootstrapTimeoutId);

        if (error) {
          setAuthStatus('error');
          setAuthError(error.message || 'error');
          setSession(null);
          setUser(null);
          setRole(null);
          setAuthBootstrapLoading(false);
          setRoleLoading(false);
          return;
        }

        lastUserRef.current = existingSession?.user ?? null;
        setSession(existingSession);
        setUser(existingSession?.user ?? null);
        setAuthStatus(existingSession?.user ? 'authenticated' : 'unauthenticated');

        if (existingSession?.user) {
          // safe outside onAuthStateChange callback; still defer for UI responsiveness
          setTimeout(() => {
            if (mounted) fetchUserRole(existingSession.user.id);
          }, 0);
        } else {
          setRoleLoading(false);
        }

        setAuthBootstrapLoading(false);
      })
      .catch((err) => {
        if (!mounted) return;
        window.clearTimeout(bootstrapTimeoutId);
        setAuthStatus('error');
        setAuthError(err?.message || 'error');
        setSession(null);
        setUser(null);
        setRole(null);
        setAuthBootstrapLoading(false);
        setRoleLoading(false);
      });

    return () => {
      mounted = false;
      window.clearTimeout(bootstrapTimeoutId);
      subscription.unsubscribe();
    };
  }, [fetchUserRole, logActivity]);

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
      }
    }

    return { error: error as Error | null };
  };

  const signOut = async () => {
    // Optimistic local reset to avoid redirect loops + long loaders
    setAuthError(null);
    setAuthStatus('unauthenticated');
    setSession(null);
    setUser(null);
    lastUserRef.current = null;

    setRole(null);
    setAuthBootstrapLoading(false);
    setRoleLoading(false);

    try {
      await Promise.race([
        supabase.auth.signOut(),
        new Promise((_, reject) =>
          window.setTimeout(() => reject(new Error('timeout')), 3000)
        ),
      ]);
    } catch {
      // Even if signOut request times out, we keep the UI logged out.
    }
  };

  const isAdmin = role === 'admin';
  const isEditor = role === 'editor';
  const isSupportAgent = role === 'support_agent';
  const isAdminOrEditor = isAdmin || isEditor;

  // Combined loading (legacy behavior): wait for BOTH bootstrap + role
  const isFullyLoaded = !authBootstrapLoading && !roleLoading;

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        role,
        authStatus,
        authError,
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
