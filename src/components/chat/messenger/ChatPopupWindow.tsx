import React, { useState, useRef, useEffect } from 'react';
import { X, Minus, Send, Paperclip, Loader2, ChevronDown } from 'lucide-react';
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

  // Calculate position from left/right edge
  const windowOffset = position * 340;

  if (isMinimized) {
    return (
      <div
        className="fixed bottom-0 z-50 cursor-pointer"
        style={{ 
          left: `${80 + windowOffset}px`,
          marginBottom: '0'
        }}
        onClick={onMinimize}
      >
        <div 
          className="flex items-center gap-2 px-4 py-2 rounded-t-xl text-white shadow-lg min-w-[200px]"
          style={{ backgroundColor: primaryColor }}
        >
          <Avatar className="h-6 w-6">
            {agentAvatar && <AvatarImage src={agentAvatar} />}
            <AvatarFallback className="text-xs bg-white/20">
              {conversation.assigned_agent?.full_name?.charAt(0) || 'D'}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium flex-1 truncate">
            {conversation.subject || conversation.organization?.name || 'محادثة'}
          </span>
          {conversation.unread_count > 0 && (
            <Badge variant="destructive" className="h-5 min-w-5 text-xs">
              {conversation.unread_count}
            </Badge>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 text-white hover:bg-white/20"
            onClick={(e) => { e.stopPropagation(); onClose(); }}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed bottom-0 z-50 flex flex-col bg-background border border-border rounded-t-xl shadow-2xl overflow-hidden"
      style={{ 
        left: `${80 + windowOffset}px`,
        width: '340px',
        height: '480px'
      }}
    >
      {/* Header */}
      <div 
        className="flex items-center gap-3 px-3 py-2.5 text-white"
        style={{ backgroundColor: primaryColor }}
      >
        <Avatar className="h-9 w-9 ring-2 ring-white/20">
          {agentAvatar && <AvatarImage src={agentAvatar} />}
          <AvatarFallback className="text-sm bg-white/20">
            {conversation.assigned_agent?.full_name?.charAt(0) || 'D'}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm truncate">
            {conversation.assigned_agent?.full_name || 'فريق الدعم'}
          </h4>
          <div className="flex items-center gap-1.5">
            <span className={cn(
              "w-2 h-2 rounded-full",
              conversation.status === 'assigned' ? "bg-green-400" : 
              conversation.status === 'closed' ? "bg-gray-400" : "bg-yellow-400"
            )} />
            <span className="text-xs text-white/80">
              {statusLabels[conversation.status]}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-white hover:bg-white/20"
            onClick={onMinimize}
          >
            <Minus className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-white hover:bg-white/20"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 px-3 py-2">
        <div className="space-y-1">
          {messages.map((msg) => (
            <ChatBubble
              key={msg.id}
              message={msg}
              isOwn={msg.sender_type === 'client'}
              primaryColor={primaryColor}
              agentAvatar={agentAvatar}
              showAvatar={msg.sender_type !== 'client'}
            />
          ))}
          {isTyping && <TypingIndicator />}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      {conversation.status !== 'closed' ? (
        <div className="p-2 border-t bg-background">
          <div className="flex items-center gap-2">
            <Input
              ref={inputRef}
              placeholder="اكتب رسالتك..."
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={sending}
              className="flex-1 h-9 text-sm bg-muted/50 border-0 focus-visible:ring-1"
            />
            <Button
              size="icon"
              className="h-9 w-9 rounded-full flex-shrink-0"
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
        <div className="p-3 text-center text-sm text-muted-foreground bg-muted/50 border-t">
          تم إغلاق هذه المحادثة
        </div>
      )}
    </div>
  );
}
