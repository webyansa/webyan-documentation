import { useState, useEffect, createContext, useContext, ReactNode, useRef, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface StaffPermissions {
  staffId: string | null;
  canReplyTickets: boolean;
  canManageContent: boolean;
  canAttendMeetings: boolean;
}

interface StaffAuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isStaff: boolean;
  permissions: StaffPermissions;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const defaultPermissions: StaffPermissions = {
  staffId: null,
  canReplyTickets: false,
  canManageContent: false,
  canAttendMeetings: false,
};

const StaffAuthContext = createContext<StaffAuthContextType | undefined>(undefined);

export function StaffAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isStaff, setIsStaff] = useState(false);
  const [permissions, setPermissions] = useState<StaffPermissions>(defaultPermissions);
  const initializedRef = useRef(false);
  const permissionsCache = useRef<Map<string, { isStaff: boolean; permissions: StaffPermissions }>>(new Map());

  const fetchStaffPermissions = useCallback(async (userId: string) => {
    // Check cache first
    if (permissionsCache.current.has(userId)) {
      const cached = permissionsCache.current.get(userId)!;
      setIsStaff(cached.isStaff);
      setPermissions(cached.permissions);
      return;
    }

    try {
      const { data, error } = await supabase
        .rpc('get_staff_permissions', { _user_id: userId });

      if (error) {
        console.error('Error fetching staff permissions:', error);
        setIsStaff(false);
        setPermissions(defaultPermissions);
        permissionsCache.current.set(userId, { isStaff: false, permissions: defaultPermissions });
        return;
      }

      if (data && data.length > 0) {
        const staffData = data[0];
        const perms = {
          staffId: staffData.staff_id,
          canReplyTickets: staffData.can_reply_tickets,
          canManageContent: staffData.can_manage_content,
          canAttendMeetings: staffData.can_attend_meetings,
        };
        setIsStaff(true);
        setPermissions(perms);
        permissionsCache.current.set(userId, { isStaff: true, permissions: perms });
      } else {
        setIsStaff(false);
        setPermissions(defaultPermissions);
        permissionsCache.current.set(userId, { isStaff: false, permissions: defaultPermissions });
      }
    } catch (error) {
      console.error('Error fetching staff permissions:', error);
      setIsStaff(false);
      setPermissions(defaultPermissions);
    }
  }, []);

  useEffect(() => {
    // Prevent double initialization
    if (initializedRef.current) return;
    initializedRef.current = true;

    let mounted = true;

    const initializeAuth = async () => {
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        
        if (!mounted) return;
        
        setSession(initialSession);
        setUser(initialSession?.user ?? null);
        
        if (initialSession?.user) {
          await fetchStaffPermissions(initialSession.user.id);
        }
        
        if (mounted) {
          setLoading(false);
        }
      } catch (error) {
        console.error('Error initializing staff auth:', error);
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!mounted) return;
        
        if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
          setIsStaff(false);
          setPermissions(defaultPermissions);
          permissionsCache.current.clear();
        } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          setSession(newSession);
          setUser(newSession?.user ?? null);
          
          if (newSession?.user) {
            await fetchStaffPermissions(newSession.user.id);
          }
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchStaffPermissions]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    permissionsCache.current.clear();
    await supabase.auth.signOut();
    setIsStaff(false);
    setPermissions(defaultPermissions);
  };

  return (
    <StaffAuthContext.Provider
      value={{
        user,
        session,
        loading,
        isStaff,
        permissions,
        signIn,
        signOut,
      }}
    >
      {children}
    </StaffAuthContext.Provider>
  );
}

export function useStaffAuth() {
  const context = useContext(StaffAuthContext);
  if (context === undefined) {
    throw new Error('useStaffAuth must be used within a StaffAuthProvider');
  }
  return context;
}
