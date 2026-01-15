import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

type AgentStatus = 'available' | 'busy' | 'offline';

interface StaffMember {
  id: string;
  full_name: string;
  email: string;
  agent_status: AgentStatus;
  active_conversations_count: number;
  last_activity_at: string;
  can_reply_tickets: boolean;
}

export function useAgentStatus() {
  const { toast } = useToast();
  const [currentStatus, setCurrentStatus] = useState<AgentStatus>('offline');
  const [staffId, setStaffId] = useState<string | null>(null);
  const [availableAgents, setAvailableAgents] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCurrentStatus = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: staff } = await supabase
        .from('staff_members')
        .select('id, agent_status')
        .eq('user_id', user.id)
        .single();

      if (staff) {
        setStaffId(staff.id);
        setCurrentStatus((staff.agent_status as AgentStatus) || 'offline');
      }
    } catch (error) {
      console.error('Error fetching agent status:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAvailableAgents = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('staff_members')
        .select('id, full_name, email, agent_status, active_conversations_count, last_activity_at, can_reply_tickets')
        .eq('is_active', true)
        .eq('can_reply_tickets', true)
        .order('full_name');

      setAvailableAgents((data as StaffMember[]) || []);
    } catch (error) {
      console.error('Error fetching available agents:', error);
    }
  }, []);

  const updateStatus = useCallback(async (newStatus: AgentStatus) => {
    if (!staffId) return;

    try {
      const { error } = await supabase
        .from('staff_members')
        .update({ 
          agent_status: newStatus,
          last_activity_at: new Date().toISOString()
        })
        .eq('id', staffId);

      if (error) throw error;

      setCurrentStatus(newStatus);
      
      const statusLabels: Record<AgentStatus, string> = {
        available: 'متاح',
        busy: 'مشغول',
        offline: 'غير متصل'
      };

      toast({
        title: 'تم تحديث الحالة',
        description: `حالتك الآن: ${statusLabels[newStatus]}`
      });
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في تحديث الحالة',
        variant: 'destructive'
      });
    }
  }, [staffId, toast]);

  useEffect(() => {
    fetchCurrentStatus();
    fetchAvailableAgents();

    // Subscribe to agent status changes
    const channel = supabase
      .channel('agent-status-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'staff_members'
        },
        () => {
          fetchAvailableAgents();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchCurrentStatus, fetchAvailableAgents]);

  return {
    currentStatus,
    staffId,
    availableAgents,
    loading,
    updateStatus,
    fetchAvailableAgents
  };
}
