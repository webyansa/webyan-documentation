import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useStaffAuth } from './useStaffAuth';
import { toast } from 'sonner';

// Notification sound URL (built-in web audio)
const NOTIFICATION_SOUND_URL = 'data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU' + 
  'tvT19' + 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
  'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

export function useStaffNotifications() {
  const { permissions, isStaff } = useStaffAuth();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hasPermission = useRef(false);

  // Request notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then((permission) => {
        hasPermission.current = permission === 'granted';
      });
    } else if ('Notification' in window) {
      hasPermission.current = Notification.permission === 'granted';
    }
  }, []);

  // Play notification sound
  const playNotificationSound = useCallback(() => {
    try {
      // Create audio context for a simple beep sound
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800; // Frequency in hertz
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
      
      // Play a second beep
      setTimeout(() => {
        const oscillator2 = audioContext.createOscillator();
        const gainNode2 = audioContext.createGain();
        
        oscillator2.connect(gainNode2);
        gainNode2.connect(audioContext.destination);
        
        oscillator2.frequency.value = 1000;
        oscillator2.type = 'sine';
        
        gainNode2.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        
        oscillator2.start(audioContext.currentTime);
        oscillator2.stop(audioContext.currentTime + 0.5);
      }, 200);
    } catch (error) {
      console.log('Could not play notification sound:', error);
    }
  }, []);

  // Show browser notification
  const showBrowserNotification = useCallback((title: string, body: string) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: '/favicon.svg',
        tag: 'staff-notification',
        requireInteraction: true,
      });
    }
  }, []);

  // Handle new assignment notification
  const handleNewAssignment = useCallback((type: 'ticket' | 'meeting', title: string, note?: string) => {
    const notificationTitle = type === 'ticket' ? '🎫 تذكرة جديدة موجهة إليك' : '📅 اجتماع جديد موجه إليك';
    const notificationBody = note ? `${title}\n\nملاحظة: ${note}` : title;

    // Play sound
    playNotificationSound();

    // Show toast
    toast.info(notificationTitle, {
      description: notificationBody,
      duration: 10000,
    });

    // Show browser notification
    showBrowserNotification(notificationTitle, notificationBody);
  }, [playNotificationSound, showBrowserNotification]);

  // Subscribe to ticket assignments
  useEffect(() => {
    if (!isStaff || !permissions.staffId || !permissions.canReplyTickets) return;

    const channel = supabase
      .channel('staff-ticket-assignments')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'support_tickets',
          filter: `assigned_to_staff=eq.${permissions.staffId}`,
        },
        (payload) => {
          const newData = payload.new as any;
          const oldData = payload.old as any;
          
          // Check if this is a new assignment (assigned_to_staff changed to current staff)
          if (oldData.assigned_to_staff !== permissions.staffId && 
              newData.assigned_to_staff === permissions.staffId) {
            handleNewAssignment('ticket', newData.subject, newData.admin_note);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isStaff, permissions.staffId, permissions.canReplyTickets, handleNewAssignment]);

  // Subscribe to meeting assignments
  useEffect(() => {
    if (!isStaff || !permissions.staffId || !permissions.canAttendMeetings) return;

    const channel = supabase
      .channel('staff-meeting-assignments')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'meeting_requests',
          filter: `assigned_staff=eq.${permissions.staffId}`,
        },
        (payload) => {
          const newData = payload.new as any;
          const oldData = payload.old as any;
          
          // Check if this is a new assignment
          if (oldData.assigned_staff !== permissions.staffId && 
              newData.assigned_staff === permissions.staffId) {
            handleNewAssignment('meeting', newData.subject, newData.admin_notes);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isStaff, permissions.staffId, permissions.canAttendMeetings, handleNewAssignment]);

  return {
    playNotificationSound,
    showBrowserNotification,
    handleNewAssignment,
  };
}
