import { useState, useEffect, createContext, useContext, ReactNode, useRef, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type AppRole = 'admin' | 'editor' | 'viewer';

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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);
  const initializedRef = useRef(false);
  const roleCache = useRef<Map<string, AppRole | null>>(new Map());

  const fetchUserRole = useCallback(async (userId: string): Promise<AppRole | null> => {
    // Check cache first
    if (roleCache.current.has(userId)) {
      return roleCache.current.get(userId) || null;
    }

    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching user role:', error);
        return null;
      }

      const userRole = data?.role as AppRole | null;
      roleCache.current.set(userId, userRole);
      return userRole;
    } catch (error) {
      console.error('Error fetching user role:', error);
      return null;
    }
  }, []);

  useEffect(() => {
    // Prevent double initialization
    if (initializedRef.current) return;
    initializedRef.current = true;

    let mounted = true;

    const initializeAuth = async () => {
      try {
        // Get initial session
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        
        if (!mounted) return;
        
        setSession(initialSession);
        setUser(initialSession?.user ?? null);
        
        if (initialSession?.user) {
          const userRole = await fetchUserRole(initialSession.user.id);
          if (mounted) {
            setRole(userRole);
          }
        }
        
        if (mounted) {
          setLoading(false);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        if (mounted) {
          setLoading(false);
        }
      }
    };

    // Initialize auth first
    initializeAuth();

    // Then set up listener for future changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!mounted) return;
        
        // Only process actual changes
        if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
          setRole(null);
          roleCache.current.clear();
        } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          setSession(newSession);
          setUser(newSession?.user ?? null);
          
          if (newSession?.user) {
            const userRole = await fetchUserRole(newSession.user.id);
            if (mounted) {
              setRole(userRole);
            }
          }
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchUserRole]);

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
    roleCache.current.clear();
    await supabase.auth.signOut();
    setRole(null);
  };

  const isAdmin = role === 'admin';
  const isEditor = role === 'editor';
  const isAdminOrEditor = isAdmin || isEditor;

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        role,
        loading,
        signIn,
        signUp,
        signOut,
        isAdmin,
        isEditor,
        isAdminOrEditor,
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
