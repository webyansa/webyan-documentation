import React, { useState, useCallback, useEffect } from 'react';
import { useChat, Conversation, Message } from '@/hooks/useChat';
import { ChatLauncher } from './ChatLauncher';
import { ChatPopupWindow } from './ChatPopupWindow';
import { ChatBranding, defaultBranding } from './types';

interface MessengerWidgetProps {
  embedToken?: string;
  branding?: Partial<ChatBranding>;
  contactEmail?: string;
}

interface OpenWindow {
  conversation: Conversation;
  messages: Message[];
  isMinimized: boolean;
}

const MAX_OPEN_WINDOWS = 3;

export function MessengerWidget({ 
  embedToken, 
  branding: brandingOverrides = {},
  contactEmail 
}: MessengerWidgetProps) {
  const [isLauncherOpen, setIsLauncherOpen] = useState(false);
  const [openWindows, setOpenWindows] = useState<OpenWindow[]>([]);
  const [activeWindowId, setActiveWindowId] = useState<string | null>(null);

  const branding: ChatBranding = { ...defaultBranding, ...brandingOverrides };

  const {
    conversations,
    messages,
    loading,
    sending,
    startConversation,
    sendMessage,
    fetchMessages,
    fetchConversations,
    setCurrentConversation
  } = useChat({ embedToken, autoFetch: false });

  // Fetch conversations when launcher opens
  useEffect(() => {
    if (isLauncherOpen) {
      fetchConversations();
    }
  }, [isLauncherOpen, fetchConversations]);

  // Calculate total unread
  const unreadTotal = conversations.reduce((sum, c) => sum + (c.unread_count || 0), 0);

  const handleSelectConversation = useCallback(async (conv: Conversation) => {
    // Check if already open
    const existingIndex = openWindows.findIndex(w => w.conversation.id === conv.id);
    
    if (existingIndex !== -1) {
      // Bring to front / unminimize
      setOpenWindows(prev => prev.map((w, i) => 
        i === existingIndex ? { ...w, isMinimized: false } : w
      ));
      setActiveWindowId(conv.id);
      setIsLauncherOpen(false);
      return;
    }

    // Open new window
    setCurrentConversation(conv);
    await fetchMessages(conv.id);
    
    setOpenWindows(prev => {
      const newWindows = [
        ...prev.slice(-(MAX_OPEN_WINDOWS - 1)),
        { conversation: conv, messages: [], isMinimized: false }
      ];
      return newWindows;
    });
    
    setActiveWindowId(conv.id);
    setIsLauncherOpen(false);
  }, [openWindows, fetchMessages, setCurrentConversation]);

  const handleStartNewChat = useCallback(async (name: string, email: string, message: string) => {
    const newConv = await startConversation('محادثة جديدة', message, name, email || contactEmail);
    if (newConv) {
      setOpenWindows(prev => [
        ...prev.slice(-(MAX_OPEN_WINDOWS - 1)),
        { conversation: newConv, messages: [], isMinimized: false }
      ]);
      setActiveWindowId(newConv.id);
      setIsLauncherOpen(false);
    }
  }, [startConversation, contactEmail]);

  const handleSendMessage = useCallback(async (conversationId: string, message: string) => {
    await sendMessage(conversationId, message);
  }, [sendMessage]);

  const handleCloseWindow = useCallback((conversationId: string) => {
    setOpenWindows(prev => prev.filter(w => w.conversation.id !== conversationId));
    if (activeWindowId === conversationId) {
      setActiveWindowId(null);
    }
  }, [activeWindowId]);

  const handleMinimizeWindow = useCallback((conversationId: string) => {
    setOpenWindows(prev => prev.map(w => 
      w.conversation.id === conversationId 
        ? { ...w, isMinimized: !w.isMinimized }
        : w
    ));
  }, []);

  // Update window messages when messages change
  useEffect(() => {
    if (messages.length > 0 && activeWindowId) {
      setOpenWindows(prev => prev.map(w => 
        w.conversation.id === activeWindowId
          ? { ...w, messages }
          : w
      ));
    }
  }, [messages, activeWindowId]);

  return (
    <>
      {/* Chat Launcher */}
      <ChatLauncher
        isOpen={isLauncherOpen}
        onToggle={() => setIsLauncherOpen(!isLauncherOpen)}
        conversations={conversations}
        unreadTotal={unreadTotal}
        onSelectConversation={handleSelectConversation}
        onStartNewChat={handleStartNewChat}
        branding={branding}
        starting={sending}
        loading={loading}
      />

      {/* Open Chat Windows */}
      {openWindows.map((window, index) => (
        <ChatPopupWindow
          key={window.conversation.id}
          conversation={window.conversation}
          messages={window.messages}
          onClose={() => handleCloseWindow(window.conversation.id)}
          onMinimize={() => handleMinimizeWindow(window.conversation.id)}
          onSend={(msg) => handleSendMessage(window.conversation.id, msg)}
          isMinimized={window.isMinimized}
          primaryColor={branding.primaryColor}
          agentAvatar={branding.agentAvatarUrl}
          sending={sending && activeWindowId === window.conversation.id}
          position={index}
        />
      ))}
    </>
  );
}
