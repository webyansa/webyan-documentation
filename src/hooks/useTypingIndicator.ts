import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface TypingUser {
  user_id: string;
  user_name: string;
  user_type: string;
}

interface UseTypingIndicatorProps {
  conversationId: string | null;
  userId: string;
  userName: string;
  userType: 'agent' | 'client' | 'embed';
}

export function useTypingIndicator({
  conversationId,
  userId,
  userName,
  userType
}: UseTypingIndicatorProps) {
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTypingRef = useRef<number>(0);

  // Listen for typing indicators
  useEffect(() => {
    if (!conversationId) return;

    // Initial fetch
    const fetchTypingUsers = async () => {
      const { data } = await supabase
        .from('typing_indicators')
        .select('user_id, user_name, user_type')
        .eq('conversation_id', conversationId)
        .eq('is_typing', true)
        .neq('user_id', userId);

      if (data) {
        setTypingUsers(data);
      }
    };

    fetchTypingUsers();

    // Subscribe to realtime changes
    const channel = supabase
      .channel(`typing-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'typing_indicators',
          filter: `conversation_id=eq.${conversationId}`
        },
        async (payload) => {
          // Refetch on any change
          const { data } = await supabase
            .from('typing_indicators')
            .select('user_id, user_name, user_type')
            .eq('conversation_id', conversationId)
            .eq('is_typing', true)
            .neq('user_id', userId);

          if (data) {
            setTypingUsers(data);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, userId]);

  // Set typing status
  const setTyping = useCallback(async (isTyping: boolean) => {
    if (!conversationId) return;

    const now = Date.now();
    
    // Throttle typing updates to once per second
    if (isTyping && now - lastTypingRef.current < 1000) {
      return;
    }
    lastTypingRef.current = now;

    try {
      await supabase
        .from('typing_indicators')
        .upsert({
          conversation_id: conversationId,
          user_id: userId,
          user_name: userName,
          user_type: userType,
          is_typing: isTyping,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'conversation_id,user_id'
        });
    } catch (error) {
      console.error('Error setting typing status:', error);
    }
  }, [conversationId, userId, userName, userType]);

  // Handle typing with auto-clear
  const handleTyping = useCallback(() => {
    setTyping(true);

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to clear typing after 3 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      setTyping(false);
    }, 3000);
  }, [setTyping]);

  // Stop typing
  const stopTyping = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    setTyping(false);
  }, [setTyping]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      // Clear typing status on unmount
      if (conversationId) {
        supabase
          .from('typing_indicators')
          .delete()
          .eq('conversation_id', conversationId)
          .eq('user_id', userId);
      }
    };
  }, [conversationId, userId]);

  return {
    typingUsers,
    handleTyping,
    stopTyping
  };
}
