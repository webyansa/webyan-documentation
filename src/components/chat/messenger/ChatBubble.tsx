import React from 'react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Check, CheckCheck, Clock } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Message } from '@/hooks/useChat';
import { cn } from '@/lib/utils';

interface ChatBubbleProps {
  message: Message;
  isOwn: boolean;
  primaryColor: string;
  showAvatar?: boolean;
  agentAvatar?: string;
}

export function ChatBubble({ message, isOwn, primaryColor, showAvatar = true, agentAvatar }: ChatBubbleProps) {
  const isSystem = message.sender_type === 'system';

  if (isSystem) {
    return (
      <div className="flex justify-center my-2">
        <div className="bg-muted/60 text-muted-foreground text-xs px-3 py-1 rounded-full max-w-[80%] text-center">
          {message.body}
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "flex gap-2 mb-3 group",
      isOwn ? "flex-row-reverse" : "flex-row"
    )}>
      {/* Avatar */}
      {showAvatar && !isOwn && (
        <Avatar className="h-8 w-8 flex-shrink-0">
          {agentAvatar ? (
            <AvatarImage src={agentAvatar} alt={message.sender_name || 'Agent'} />
          ) : null}
          <AvatarFallback className="text-xs" style={{ backgroundColor: `${primaryColor}20`, color: primaryColor }}>
            {message.sender_name?.charAt(0) || 'D'}
          </AvatarFallback>
        </Avatar>
      )}
      {showAvatar && isOwn && <div className="w-8" />}

      {/* Message Content */}
      <div className={cn("max-w-[75%] flex flex-col", isOwn ? "items-end" : "items-start")}>
        {/* Sender name for agent messages */}
        {!isOwn && message.sender_name && (
          <span className="text-[10px] text-muted-foreground mb-1 px-1">
            {message.sender_name}
          </span>
        )}
        
        {/* Bubble */}
        <div
          className={cn(
            "px-3 py-2 rounded-2xl text-sm leading-relaxed break-words",
            isOwn 
              ? "rounded-bl-sm text-white" 
              : "rounded-br-sm bg-muted"
          )}
          style={isOwn ? { backgroundColor: primaryColor } : {}}
        >
          <p className="whitespace-pre-wrap">{message.body}</p>
          
          {/* Attachments */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="mt-2 space-y-1">
              {message.attachments.map((url, idx) => (
                <a 
                  key={idx} 
                  href={url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-xs underline opacity-80 hover:opacity-100 block truncate"
                >
                  📎 مرفق {idx + 1}
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Time and status */}
        <div className={cn(
          "flex items-center gap-1 mt-1 text-[10px] text-muted-foreground px-1",
          isOwn ? "flex-row-reverse" : "flex-row"
        )}>
          <span>{format(new Date(message.created_at), 'p', { locale: ar })}</span>
          {isOwn && (
            <span className="flex items-center">
              {message.is_read ? (
                <CheckCheck className="h-3 w-3 text-blue-500" />
              ) : (
                <Check className="h-3 w-3" />
              )}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
