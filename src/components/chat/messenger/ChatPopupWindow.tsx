import React, { useState, useRef, useEffect } from 'react';
import { X, Minus, Send, Paperclip, Loader2, Smile, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ChatBubble } from './ChatBubble';
import { TypingIndicator } from './TypingIndicator';
import { Message, Conversation } from '@/hooks/useChat';
import { cn } from '@/lib/utils';

interface ChatPopupWindowProps {
  conversation: Conversation;
  messages: Message[];
  onClose: () => void;
  onMinimize: () => void;
  onSend: (message: string) => Promise<void>;
  isMinimized: boolean;
  primaryColor: string;
  agentAvatar?: string;
  sending?: boolean;
  isTyping?: boolean;
  position?: number;
}

const statusLabels = {
  unassigned: 'في الانتظار',
  assigned: 'متصل',
  closed: 'مغلقة'
};

const statusDots = {
  unassigned: 'bg-yellow-400',
  assigned: 'bg-green-500',
  closed: 'bg-gray-400'
};

export function ChatPopupWindow({
  conversation,
  messages,
  onClose,
  onMinimize,
  onSend,
  isMinimized,
  primaryColor,
  agentAvatar,
  sending = false,
  isTyping = false,
  position = 0
}: ChatPopupWindowProps) {
  const [messageText, setMessageText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isMinimized]);

  useEffect(() => {
    if (!isMinimized) {
      inputRef.current?.focus();
    }
  }, [isMinimized]);

  const handleSend = async () => {
    if (!messageText.trim() || sending) return;
    const text = messageText;
    setMessageText('');
    await onSend(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Calculate position from right edge
  const windowOffset = 100 + position * 360;

  // Minimized tab
  if (isMinimized) {
    return (
      <div
        className="fixed bottom-0 z-[9998] cursor-pointer animate-in slide-in-from-bottom-2"
        style={{ left: `${windowOffset}px` }}
        onClick={onMinimize}
      >
        <div 
          className="flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-white shadow-lg min-w-[220px] hover:translate-y-[-2px] transition-transform"
          style={{ backgroundColor: primaryColor }}
        >
          <Avatar className="h-7 w-7 ring-2 ring-white/30">
            {agentAvatar && <AvatarImage src={agentAvatar} />}
            <AvatarFallback className="text-xs bg-white/20 text-white">
              {conversation.assigned_agent?.full_name?.charAt(0) || 'D'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <span className="text-sm font-medium truncate block">
              {conversation.assigned_agent?.full_name || 'فريق الدعم'}
            </span>
          </div>
          {conversation.unread_count > 0 && (
            <Badge className="h-5 min-w-5 text-xs bg-red-500 text-white hover:bg-red-500">
              {conversation.unread_count}
            </Badge>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-white hover:bg-white/20 -ml-1"
            onClick={(e) => { e.stopPropagation(); onClose(); }}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed bottom-0 z-[9998] flex flex-col bg-background border border-border rounded-t-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4"
      style={{ 
        left: `${windowOffset}px`,
        width: '360px',
        height: '520px'
      }}
    >
      {/* Header */}
      <div 
        className="flex items-center gap-3 px-4 py-3 text-white relative overflow-hidden"
        style={{ backgroundColor: primaryColor }}
      >
        {/* Background decoration */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -top-4 -right-4 w-16 h-16 rounded-full bg-white/20" />
        </div>
        
        <div className="relative flex items-center gap-3 flex-1">
          <div className="relative">
            <Avatar className="h-10 w-10 ring-2 ring-white/30">
              {agentAvatar && <AvatarImage src={agentAvatar} />}
              <AvatarFallback className="text-sm bg-white/20 text-white font-medium">
                {conversation.assigned_agent?.full_name?.charAt(0) || 'D'}
              </AvatarFallback>
            </Avatar>
            <span className={cn(
              "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white",
              statusDots[conversation.status]
            )} />
          </div>
          
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-sm truncate">
              {conversation.assigned_agent?.full_name || 'فريق الدعم'}
            </h4>
            <span className="text-xs text-white/80">
              {statusLabels[conversation.status]}
            </span>
          </div>
        </div>

        <div className="relative flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-white hover:bg-white/20 rounded-full"
            onClick={onMinimize}
          >
            <Minus className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-white hover:bg-white/20 rounded-full"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 bg-muted/20">
        <div className="p-3 space-y-1 min-h-full">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Avatar className="h-16 w-16 mb-3">
                {agentAvatar && <AvatarImage src={agentAvatar} />}
                <AvatarFallback 
                  className="text-xl"
                  style={{ backgroundColor: `${primaryColor}20`, color: primaryColor }}
                >
                  {conversation.assigned_agent?.full_name?.charAt(0) || 'D'}
                </AvatarFallback>
              </Avatar>
              <p className="text-sm text-muted-foreground">
                ابدأ المحادثة الآن
              </p>
            </div>
          )}
          
          {messages.map((msg, index) => (
            <ChatBubble
              key={msg.id}
              message={msg}
              isOwn={msg.sender_type === 'client'}
              primaryColor={primaryColor}
              agentAvatar={agentAvatar}
              showAvatar={
                msg.sender_type !== 'client' && 
                (index === 0 || messages[index - 1]?.sender_type !== msg.sender_type)
              }
            />
          ))}
          
          {isTyping && <TypingIndicator name={conversation.assigned_agent?.full_name} />}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      {conversation.status !== 'closed' ? (
        <div className="p-3 border-t bg-background">
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <Input
                ref={inputRef}
                placeholder="اكتب رسالتك..."
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={sending}
                className="h-10 pl-10 bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary/50 rounded-full"
              />
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-1 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground hover:text-foreground"
              >
                <Smile className="h-4 w-4" />
              </Button>
            </div>
            <Button
              size="icon"
              className="h-10 w-10 rounded-full flex-shrink-0 shadow-md hover:shadow-lg transition-shadow"
              style={{ backgroundColor: primaryColor }}
              onClick={handleSend}
              disabled={sending || !messageText.trim()}
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      ) : (
        <div className="p-4 text-center text-sm text-muted-foreground bg-muted/50 border-t">
          <span className="inline-flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-gray-400" />
            تم إغلاق هذه المحادثة
          </span>
        </div>
      )}
    </div>
  );
}
