import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
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

  const fetchStaffPermissions = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .rpc('get_staff_permissions', { _user_id: userId });

      if (error) {
        console.error('Error fetching staff permissions:', error);
        setIsStaff(false);
        setPermissions(defaultPermissions);
        return;
      }

      if (data && data.length > 0) {
        const staffData = data[0];
        setIsStaff(true);
        setPermissions({
          staffId: staffData.staff_id,
          canReplyTickets: staffData.can_reply_tickets,
          canManageContent: staffData.can_manage_content,
          canAttendMeetings: staffData.can_attend_meetings,
        });
      } else {
        setIsStaff(false);
        setPermissions(defaultPermissions);
      }
    } catch (error) {
      console.error('Error fetching staff permissions:', error);
      setIsStaff(false);
      setPermissions(defaultPermissions);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          setTimeout(() => {
            fetchStaffPermissions(session.user.id);
          }, 0);
        } else {
          setIsStaff(false);
          setPermissions(defaultPermissions);
        }
        
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchStaffPermissions(session.user.id);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
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
