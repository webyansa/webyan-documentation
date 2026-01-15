import React, { useState, useRef, useEffect } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useChat, Conversation, Message } from '@/hooks/useChat';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  MessageCircle, X, Minus, Maximize2, Send, Paperclip, Smile,
  Headphones, HelpCircle, GraduationCap, Wrench, ChevronLeft,
  Check, CheckCheck, Loader2, Circle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ChatBranding, defaultBranding } from './types';
import { TypingIndicator } from './TypingIndicator';

interface QuickAction {
  id: string;
  label: string;
  icon: React.ElementType;
  subject: string;
}

const quickActions: QuickAction[] = [
  { id: 'technical', label: 'مشكلة تقنية', icon: Wrench, subject: 'مشكلة تقنية' },
  { id: 'inquiry', label: 'استفسار', icon: HelpCircle, subject: 'استفسار عام' },
  { id: 'training', label: 'طلب تدريب', icon: GraduationCap, subject: 'طلب تدريب' },
];

interface CustomerChatWidgetProps {
  branding?: Partial<ChatBranding>;
  clientName?: string;
  clientEmail?: string;
  embedToken?: string;
  onClose?: () => void;
}

export function CustomerChatWidget({
  branding: brandingOverride,
  clientName = '',
  clientEmail = '',
  embedToken,
  onClose
}: CustomerChatWidgetProps) {
  const branding = { ...defaultBranding, ...brandingOverride };
  
  const {
    conversations,
    currentConversation,
    messages,
    loading,
    sending,
    fetchConversations,
    startConversation,
    sendMessage,
    selectConversation,
    setCurrentConversation
  } = useChat({ autoFetch: true, embedToken });

  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [view, setView] = useState<'launcher' | 'welcome' | 'chat'>('launcher');
  const [openWindows, setOpenWindows] = useState<string[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && !currentConversation && conversations.length === 0) {
      setView('welcome');
    } else if (isOpen && conversations.length > 0 && !currentConversation) {
      setView('launcher');
    }
  }, [isOpen, currentConversation, conversations]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (view === 'chat' && inputRef.current) {
      inputRef.current.focus();
    }
  }, [view, currentConversation]);

  const totalUnread = conversations.reduce((sum, c) => sum + (c.unread_count || 0), 0);

  const handleOpen = () => {
    setIsOpen(true);
    setIsMinimized(false);
    if (conversations.length > 0) {
      setView('launcher');
    } else {
      setView('welcome');
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setCurrentConversation(null);
    onClose?.();
  };

  const handleMinimize = () => {
    setIsMinimized(true);
  };

  const handleQuickAction = async (action: QuickAction) => {
    try {
      await startConversation(action.subject, `بدء محادثة - ${action.label}`, clientName, clientEmail);
      setView('chat');
    } catch (error) {
      console.error('Error starting conversation:', error);
    }
  };

  const handleStartNewChat = async () => {
    try {
      await startConversation('محادثة جديدة', branding.welcomeText, clientName, clientEmail);
      setView('chat');
    } catch (error) {
      console.error('Error starting conversation:', error);
    }
  };

  const handleSelectConversation = (conv: Conversation) => {
    selectConversation(conv);
    setView('chat');
  };

  const handleSendMessage = async () => {
    if (!messageText.trim() || !currentConversation) return;
    
    const text = messageText;
    setMessageText('');
    await sendMessage(currentConversation.id, text, undefined, clientName);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Floating Button
  if (!isOpen || isMinimized) {
    return (
      <div 
        className={cn(
          "fixed z-50 bottom-5",
          branding.widgetPosition === 'left' ? 'left-5' : 'right-5'
        )}
      >
        <button
          onClick={handleOpen}
          className="group relative w-14 h-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center transform hover:scale-105"
          style={{ backgroundColor: branding.primaryColor }}
          title="تواصل مع الدعم"
        >
          <MessageCircle className="h-6 w-6 text-white" />
          
          {totalUnread > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
              {totalUnread > 9 ? '9+' : totalUnread}
            </span>
          )}
          
          {/* Tooltip */}
          <span className="absolute bottom-full mb-2 px-3 py-1.5 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
            {branding.welcomeText}
          </span>
        </button>
      </div>
    );
  }

  // Chat Window
  return (
    <div 
      className={cn(
        "fixed z-50 bottom-5 flex flex-col bg-background rounded-2xl shadow-2xl overflow-hidden border animate-in slide-in-from-bottom-4 duration-300",
        branding.widgetPosition === 'left' ? 'left-5' : 'right-5',
        "w-[360px] h-[520px]"
      )}
      dir="rtl"
    >
      {/* Header */}
      <div 
        className="flex items-center justify-between px-4 py-3 text-white flex-shrink-0"
        style={{ backgroundColor: branding.primaryColor }}
      >
        <div className="flex items-center gap-3">
          {view === 'chat' && (
            <button
              onClick={() => {
                setCurrentConversation(null);
                setView(conversations.length > 0 ? 'launcher' : 'welcome');
              }}
              className="p-1 hover:bg-white/20 rounded-full transition-colors"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}
          {branding.logoUrl ? (
            <Avatar className="h-9 w-9 border-2 border-white/20">
              <AvatarImage src={branding.logoUrl} />
              <AvatarFallback className="bg-white/20 text-white text-sm">
                {branding.organizationName.charAt(0)}
              </AvatarFallback>
            </Avatar>
          ) : (
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
              <Headphones className="h-5 w-5" />
            </div>
          )}
          <div>
            <h3 className="font-semibold text-sm">{branding.organizationName}</h3>
            <div className="flex items-center gap-1.5 text-xs opacity-90">
              <Circle className="h-2 w-2 fill-green-400 text-green-400" />
              <span>متاح الآن</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button 
            onClick={handleMinimize}
            className="p-1.5 hover:bg-white/20 rounded-full transition-colors"
          >
            <Minus className="h-4 w-4" />
          </button>
          <button 
            onClick={handleClose}
            className="p-1.5 hover:bg-white/20 rounded-full transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      {view === 'welcome' && (
        <div className="flex-1 flex flex-col p-5">
          <div className="text-center mb-6">
            <div 
              className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
              style={{ backgroundColor: `${branding.primaryColor}15` }}
            >
              <MessageCircle 
                className="h-8 w-8" 
                style={{ color: branding.primaryColor }}
              />
            </div>
            <h2 className="text-xl font-bold mb-2">مرحباً! 👋</h2>
            <p className="text-muted-foreground text-sm">
              كيف يمكننا مساعدتك اليوم؟
            </p>
          </div>

          <div className="space-y-2 mb-6">
            {quickActions.map((action) => (
              <button
                key={action.id}
                onClick={() => handleQuickAction(action)}
                className="w-full flex items-center gap-3 p-3 rounded-xl border hover:border-primary/50 hover:bg-primary/5 transition-all text-right"
              >
                <div 
                  className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${branding.primaryColor}15` }}
                >
                  <action.icon className="h-5 w-5" style={{ color: branding.primaryColor }} />
                </div>
                <span className="font-medium text-sm">{action.label}</span>
              </button>
            ))}
          </div>

          <Button 
            onClick={handleStartNewChat}
            className="w-full gap-2"
            style={{ backgroundColor: branding.primaryColor }}
          >
            <MessageCircle className="h-4 w-4" />
            بدء محادثة جديدة
          </Button>
        </div>
      )}

      {view === 'launcher' && (
        <div className="flex-1 flex flex-col">
          <div className="p-4 border-b">
            <Button 
              onClick={handleStartNewChat}
              className="w-full gap-2"
              style={{ backgroundColor: branding.primaryColor }}
              disabled={sending}
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <MessageCircle className="h-4 w-4" />
              )}
              محادثة جديدة
            </Button>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-2">
              <p className="text-xs text-muted-foreground px-2 py-2">المحادثات السابقة</p>
              {conversations.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  لا توجد محادثات
                </p>
              ) : (
                <div className="space-y-1">
                  {conversations.map((conv) => (
                    <button
                      key={conv.id}
                      onClick={() => handleSelectConversation(conv)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors text-right"
                    >
                      <Avatar className="h-10 w-10">
                        {branding.agentAvatarUrl ? (
                          <AvatarImage src={branding.agentAvatarUrl} />
                        ) : null}
                        <AvatarFallback 
                          className="text-xs"
                          style={{ backgroundColor: `${branding.primaryColor}15`, color: branding.primaryColor }}
                        >
                          {conv.assigned_agent?.full_name?.charAt(0) || 'D'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium text-sm truncate">
                            {conv.subject || 'محادثة'}
                          </span>
                          <span className="text-[10px] text-muted-foreground flex-shrink-0">
                            {conv.last_message_at && formatDistanceToNow(new Date(conv.last_message_at), { 
                              addSuffix: false, 
                              locale: ar 
                            })}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {conv.last_message_preview || 'لا توجد رسائل'}
                        </p>
                      </div>
                      {conv.unread_count > 0 && (
                        <Badge variant="destructive" className="h-5 min-w-5 text-xs">
                          {conv.unread_count}
                        </Badge>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      )}

      {view === 'chat' && currentConversation && (
        <>
          <ScrollArea className="flex-1 bg-muted/20">
            <div className="p-4 space-y-3">
              {messages.length === 0 ? (
                <div className="text-center py-8">
                  <Avatar className="h-12 w-12 mx-auto mb-3">
                    {branding.agentAvatarUrl ? (
                      <AvatarImage src={branding.agentAvatarUrl} />
                    ) : null}
                    <AvatarFallback 
                      style={{ backgroundColor: `${branding.primaryColor}15`, color: branding.primaryColor }}
                    >
                      D
                    </AvatarFallback>
                  </Avatar>
                  <p className="text-sm text-muted-foreground">
                    ابدأ المحادثة الآن
                  </p>
                </div>
              ) : (
                messages.map((msg, idx) => {
                  const isOwn = msg.sender_type === 'client';
                  const isSystem = msg.sender_type === 'system';
                  const showAvatar = !isOwn && (idx === 0 || messages[idx - 1]?.sender_type !== 'agent');

                  if (isSystem) {
                    return (
                      <div key={msg.id} className="flex justify-center">
                        <span className="text-[11px] text-muted-foreground bg-muted/60 px-3 py-1 rounded-full">
                          {msg.body}
                        </span>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={msg.id}
                      className={cn("flex gap-2", isOwn ? "flex-row-reverse" : "flex-row")}
                    >
                      {!isOwn && showAvatar && (
                        <Avatar className="h-7 w-7 flex-shrink-0 mt-auto">
                          {branding.agentAvatarUrl ? (
                            <AvatarImage src={branding.agentAvatarUrl} />
                          ) : null}
                          <AvatarFallback 
                            className="text-[10px]"
                            style={{ backgroundColor: `${branding.primaryColor}15`, color: branding.primaryColor }}
                          >
                            {msg.sender_name?.charAt(0) || 'D'}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      {!isOwn && !showAvatar && <div className="w-7" />}

                      <div className={cn("max-w-[75%] flex flex-col", isOwn ? "items-end" : "items-start")}>
                        <div
                          className={cn(
                            "px-3 py-2 rounded-2xl text-sm",
                            isOwn 
                              ? "rounded-bl-sm text-white" 
                              : "rounded-br-sm bg-muted"
                          )}
                          style={isOwn ? { backgroundColor: branding.primaryColor } : {}}
                        >
                          <p className="whitespace-pre-wrap">{msg.body}</p>
                        </div>
                        <div className={cn(
                          "flex items-center gap-1 mt-0.5 text-[10px] text-muted-foreground px-1",
                          isOwn ? "flex-row-reverse" : "flex-row"
                        )}>
                          <span>{format(new Date(msg.created_at), 'p', { locale: ar })}</span>
                          {isOwn && (
                            msg.is_read ? (
                              <CheckCheck className="h-3 w-3 text-blue-500" />
                            ) : (
                              <Check className="h-3 w-3" />
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              
              {isTyping && <TypingIndicator name={currentConversation.assigned_agent?.full_name} />}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Input */}
          {currentConversation.status !== 'closed' ? (
            <div className="p-3 border-t bg-card flex-shrink-0">
              <div className="flex items-center gap-2">
                <Input
                  ref={inputRef}
                  placeholder="اكتب رسالتك..."
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyDown={handleKeyPress}
                  disabled={sending}
                  className="flex-1 border-0 bg-muted/50 focus-visible:ring-1"
                />
                <Button
                  size="icon"
                  onClick={handleSendMessage}
                  disabled={!messageText.trim() || sending}
                  style={{ backgroundColor: branding.primaryColor }}
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
            <div className="p-3 border-t bg-muted/30 text-center text-sm text-muted-foreground">
              هذه المحادثة مغلقة
            </div>
          )}
        </>
      )}

      {/* Powered by */}
      <div className="text-center py-1.5 text-[10px] text-muted-foreground border-t bg-muted/20">
        مدعوم بواسطة <span className="font-medium">ويبيان</span>
      </div>
    </div>
  );
}
