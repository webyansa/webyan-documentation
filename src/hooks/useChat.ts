import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Conversation {
  id: string;
  organization_id: string | null;
  client_account_id: string | null;
  embed_token_id: string | null;
  subject: string | null;
  status: 'unassigned' | 'assigned' | 'closed';
  assigned_agent_id: string | null;
  source: string | null;
  source_domain: string | null;
  metadata: Record<string, unknown>;
  unread_count: number;
  last_message_at: string | null;
  last_message_preview: string | null;
  created_at: string;
  closed_at: string | null;
  archived_at: string | null;
  is_starred: boolean;
  organization?: {
    id: string;
    name: string;
    contact_email: string;
    logo_url: string | null;
  };
  assigned_agent?: {
    id: string;
    full_name: string;
    agent_status: 'available' | 'busy' | 'offline';
  };
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_type: 'client' | 'agent' | 'system';
  sender_id: string | null;
  sender_name: string | null;
  body: string;
  attachments: string[];
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

interface UseChatOptions {
  embedToken?: string;
  autoFetch?: boolean;
}

export function useChat(options: UseChatOptions = {}) {
  const { embedToken, autoFetch = true } = options;
  const { toast } = useToast();
  
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const getHeaders = useCallback(async () => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (embedToken) {
      headers['x-embed-token'] = embedToken;
      headers['x-embed-origin'] = window.location.origin;
    } else {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }
    }

    return headers;
  }, [embedToken]);

  const callChatAPI = useCallback(async (action: string, data: Record<string, unknown> = {}) => {
    const headers = await getHeaders();
    
    const response = await supabase.functions.invoke('chat-api', {
      body: { action, ...data },
      headers
    });

    if (response.error) {
      throw new Error(response.error.message || 'API call failed');
    }

    return response.data;
  }, [getHeaders]);

  const fetchConversations = useCallback(async () => {
    try {
      setLoading(true);
      const data = await callChatAPI('get_conversations');
      setConversations(data.conversations || []);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  }, [callChatAPI]);

  const fetchMessages = useCallback(async (conversationId: string) => {
    try {
      setLoading(true);
      const data = await callChatAPI('get_messages', { conversationId });
      setMessages(data.messages || []);
      
      // Mark as read
      await callChatAPI('mark_read', { conversationId });
      
      return data.messages || [];
    } catch (error) {
      console.error('Error fetching messages:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [callChatAPI]);

  // Fetch a single conversation by ID
  const fetchConversation = useCallback(async (conversationId: string) => {
    try {
      const data = await callChatAPI('get_conversation', { conversationId });
      return data.conversation;
    } catch (error) {
      console.error('Error fetching conversation:', error);
      return null;
    }
  }, [callChatAPI]);

  const startConversation = useCallback(async (
    subject?: string,
    message?: string,
    senderName?: string,
    senderEmail?: string
  ) => {
    try {
      setSending(true);
      const data = await callChatAPI('start_conversation', {
        subject,
        message,
        senderName,
        senderEmail
      });
      
      setCurrentConversation(data.conversation);
      if (data.conversation) {
        await fetchMessages(data.conversation.id);
      }
      
      return data.conversation;
    } catch (error) {
      console.error('Error starting conversation:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في بدء المحادثة',
        variant: 'destructive'
      });
      throw error;
    } finally {
      setSending(false);
    }
  }, [callChatAPI, fetchMessages, toast]);

  const sendMessage = useCallback(async (
    conversationId: string,
    message: string,
    attachments?: string[],
    senderName?: string
  ) => {
    try {
      setSending(true);
      const data = await callChatAPI('send_message', {
        conversationId,
        message,
        attachments,
        senderName
      });
      
      // Add message optimistically
      if (data.message) {
        setMessages(prev => [...prev, data.message]);
      }
      
      return data.message;
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في إرسال الرسالة',
        variant: 'destructive'
      });
      throw error;
    } finally {
      setSending(false);
    }
  }, [callChatAPI, toast]);

  const assignConversation = useCallback(async (conversationId: string, agentId?: string) => {
    try {
      await callChatAPI('assign', { conversationId, agentId });
      toast({
        title: 'تم',
        description: 'تم إسناد المحادثة بنجاح'
      });
      await fetchConversations();
    } catch (error) {
      console.error('Error assigning conversation:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في إسناد المحادثة',
        variant: 'destructive'
      });
    }
  }, [callChatAPI, fetchConversations, toast]);

  const archiveConversation = useCallback(async (conversationId: string) => {
    try {
      await callChatAPI('archive', { conversationId });
      toast({
        title: 'تم',
        description: 'تم نقل المحادثة إلى المهملات'
      });
      await fetchConversations();
    } catch (error) {
      console.error('Error archiving conversation:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في أرشفة المحادثة',
        variant: 'destructive'
      });
    }
  }, [callChatAPI, fetchConversations, toast]);

  const restoreConversation = useCallback(async (conversationId: string) => {
    try {
      await callChatAPI('restore', { conversationId });
      toast({
        title: 'تم',
        description: 'تم استعادة المحادثة'
      });
      await fetchConversations();
    } catch (error) {
      console.error('Error restoring conversation:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في استعادة المحادثة',
        variant: 'destructive'
      });
    }
  }, [callChatAPI, fetchConversations, toast]);

  const deleteConversation = useCallback(async (conversationId: string) => {
    try {
      await callChatAPI('delete_permanently', { conversationId });
      toast({
        title: 'تم',
        description: 'تم حذف المحادثة نهائياً'
      });
      await fetchConversations();
      setCurrentConversation(null);
      setMessages([]);
    } catch (error) {
      console.error('Error deleting conversation:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في حذف المحادثة',
        variant: 'destructive'
      });
    }
  }, [callChatAPI, fetchConversations, toast]);

  const deleteConversationsBulk = useCallback(async (conversationIds: string[]) => {
    try {
      await callChatAPI('delete_bulk', { conversationIds });
      toast({
        title: 'تم',
        description: `تم حذف ${conversationIds.length} محادثة نهائياً`
      });
      await fetchConversations();
      setCurrentConversation(null);
      setMessages([]);
      return true;
    } catch (error) {
      console.error('Error bulk deleting conversations:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في حذف المحادثات',
        variant: 'destructive'
      });
      return false;
    }
  }, [callChatAPI, fetchConversations, toast]);

  const toggleStarConversation = useCallback(async (conversationId: string, isStarred: boolean) => {
    try {
      await callChatAPI('toggle_star', { conversationId, isStarred: !isStarred });
      toast({
        title: 'تم',
        description: isStarred ? 'تم إزالة التمييز' : 'تم تمييز المحادثة'
      });
      await fetchConversations();
    } catch (error) {
      console.error('Error toggling star:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في تعديل حالة المحادثة',
        variant: 'destructive'
      });
    }
  }, [callChatAPI, fetchConversations, toast]);

  const closeConversation = useCallback(async (conversationId: string) => {
    try {
      await callChatAPI('close', { conversationId });
      toast({
        title: 'تم',
        description: 'تم إغلاق المحادثة'
      });
      await fetchConversations();
    } catch (error) {
      console.error('Error closing conversation:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في إغلاق المحادثة',
        variant: 'destructive'
      });
    }
  }, [callChatAPI, fetchConversations, toast]);

  const reopenConversation = useCallback(async (conversationId: string) => {
    try {
      await callChatAPI('reopen', { conversationId });
      toast({
        title: 'تم',
        description: 'تم إعادة فتح المحادثة'
      });
      await fetchConversations();
    } catch (error) {
      console.error('Error reopening conversation:', error);
    }
  }, [callChatAPI, fetchConversations, toast]);

  const convertToTicket = useCallback(async (
    conversationId: string,
    ticketData: { subject: string; category: string; priority: string }
  ) => {
    try {
      const data = await callChatAPI('convert_to_ticket', { conversationId, ticketData });
      toast({
        title: 'تم',
        description: `تم تحويل المحادثة إلى تذكرة رقم: ${data.ticket?.ticket_number}`
      });
      await fetchMessages(conversationId);
      return data.ticket;
    } catch (error) {
      console.error('Error converting to ticket:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في تحويل المحادثة إلى تذكرة',
        variant: 'destructive'
      });
    }
  }, [callChatAPI, fetchMessages, toast]);

  const selectConversation = useCallback(async (conversation: Conversation) => {
    setCurrentConversation(conversation);
    await fetchMessages(conversation.id);
  }, [fetchMessages]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!currentConversation?.id) return;

    const channel = supabase
      .channel(`conversation-${currentConversation.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'conversation_messages',
          filter: `conversation_id=eq.${currentConversation.id}`
        },
        (payload) => {
          const newMessage = payload.new as Message;
          setMessages(prev => {
            // Avoid duplicates
            if (prev.some(m => m.id === newMessage.id)) return prev;
            return [...prev, newMessage];
          });
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [currentConversation?.id]);

  // Subscribe to conversations list updates
  useEffect(() => {
    if (!autoFetch) return;

    const channel = supabase
      .channel('conversations-list')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations'
        },
        () => {
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [autoFetch, fetchConversations]);

  // Initial fetch
  useEffect(() => {
    if (autoFetch && !embedToken) {
      fetchConversations();
    }
  }, [autoFetch, embedToken, fetchConversations]);

  return {
    conversations,
    currentConversation,
    messages,
    loading,
    sending,
    fetchConversations,
    fetchMessages,
    fetchConversation,
    startConversation,
    sendMessage,
    assignConversation,
    closeConversation,
    reopenConversation,
    convertToTicket,
    selectConversation,
    setCurrentConversation,
    archiveConversation,
    restoreConversation,
    deleteConversation,
    deleteConversationsBulk,
    toggleStarConversation
  };
}
