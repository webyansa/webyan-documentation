import React, { useState } from 'react';
import { MessageCircle, X, ChevronLeft, Home, Loader2, Phone, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Conversation } from '@/hooks/useChat';
import { ChatBranding } from './types';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface ChatLauncherProps {
  isOpen: boolean;
  onToggle: () => void;
  conversations: Conversation[];
  unreadTotal: number;
  onSelectConversation: (conv: Conversation) => void;
  onStartNewChat: (name: string, email: string, message: string) => Promise<void>;
  branding: ChatBranding;
  starting?: boolean;
  loading?: boolean;
}

type LauncherView = 'home' | 'conversations' | 'new-chat';

export function ChatLauncher({
  isOpen,
  onToggle,
  conversations,
  unreadTotal,
  onSelectConversation,
  onStartNewChat,
  branding,
  starting = false,
  loading = false
}: ChatLauncherProps) {
  const [view, setView] = useState<LauncherView>('home');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  const handleStartChat = async () => {
    if (!name.trim() || !message.trim()) return;
    await onStartNewChat(name, email, message);
    setName('');
    setEmail('');
    setMessage('');
    setView('home');
  };

  const activeConversations = conversations.filter(c => c.status !== 'closed');

  // Floating button
  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className={cn(
          "fixed bottom-5 z-[9999] h-14 w-14 rounded-full shadow-2xl flex items-center justify-center text-white transition-all hover:scale-110 active:scale-95",
          branding.widgetPosition === 'left' ? 'left-5' : 'right-5'
        )}
        style={{ backgroundColor: branding.primaryColor }}
      >
        <MessageCircle className="h-6 w-6" />
        {unreadTotal > 0 && (
          <span className="absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center rounded-full bg-red-500 text-white text-xs font-bold px-1 animate-pulse">
            {unreadTotal > 9 ? '9+' : unreadTotal}
          </span>
        )}
      </button>
    );
  }

  return (
    <div 
      className={cn(
        "fixed bottom-5 z-[9999] w-[380px] max-w-[calc(100vw-40px)] rounded-2xl shadow-2xl overflow-hidden bg-background border flex flex-col animate-in slide-in-from-bottom-5 duration-300",
        branding.widgetPosition === 'left' ? 'left-5' : 'right-5'
      )}
      style={{ height: 'min(600px, calc(100vh - 100px))' }}
    >
      {/* Header */}
      <div 
        className="relative px-5 pt-5 pb-20 text-white overflow-hidden"
        style={{ backgroundColor: branding.primaryColor }}
      >
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/20 -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full bg-white/20 translate-y-1/2 -translate-x-1/2" />
        </div>
        
        <div className="relative flex items-start justify-between">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-white hover:bg-white/20 rounded-full -mr-2"
            onClick={onToggle}
          >
            <X className="h-5 w-5" />
          </Button>
          
          <div className="flex items-center gap-3 flex-row-reverse">
            {branding.logoUrl ? (
              <img 
                src={branding.logoUrl} 
                alt="Logo" 
                className="h-12 w-12 rounded-full object-cover bg-white/20 border-2 border-white/30" 
              />
            ) : (
              <Avatar className="h-12 w-12 border-2 border-white/30">
                <AvatarFallback className="bg-white/20 text-white text-lg font-bold">
                  {branding.organizationName.charAt(0)}
                </AvatarFallback>
              </Avatar>
            )}
            <div className="text-right">
              <h3 className="font-bold text-lg">{branding.organizationName}</h3>
              <p className="text-sm text-white/80">{branding.welcomeText}</p>
            </div>
          </div>
        </div>

        {/* Curved bottom */}
        <div 
          className="absolute bottom-0 left-0 right-0 h-8 bg-background"
          style={{ 
            borderTopLeftRadius: '50% 100%',
            borderTopRightRadius: '50% 100%',
          }}
        />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden px-4 -mt-4">
        <ScrollArea className="h-full">
          {view === 'home' && (
            <div className="space-y-3 pb-4">
              {/* Start new chat button */}
              <button
                onClick={() => setView('new-chat')}
                className="w-full bg-card rounded-xl p-4 flex items-center gap-3 shadow-lg hover:shadow-xl transition-all border hover:-translate-y-0.5"
              >
                <div 
                  className="h-11 w-11 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${branding.primaryColor}15` }}
                >
                  <MessageCircle className="h-5 w-5" style={{ color: branding.primaryColor }} />
                </div>
                <div className="flex-1 text-right">
                  <h4 className="font-semibold text-sm">دردش معنا الآن</h4>
                  <p className="text-xs text-muted-foreground">نحن متصلون ومستعدون للمساعدة</p>
                </div>
                <ChevronLeft className="h-5 w-5 text-muted-foreground" />
              </button>

              {/* Contact option */}
              <button
                className="w-full bg-card rounded-xl p-4 flex items-center gap-3 shadow-md hover:shadow-lg transition-all border"
              >
                <div className="h-11 w-11 rounded-full flex items-center justify-center flex-shrink-0 bg-green-50">
                  <Phone className="h-5 w-5 text-green-600" />
                </div>
                <div className="flex-1 text-right">
                  <h4 className="font-semibold text-sm">اتصل بنا الآن</h4>
                  <p className="text-xs text-muted-foreground">تحدث مع فريق الدعم مباشرة</p>
                </div>
                <ChevronLeft className="h-5 w-5 text-muted-foreground" />
              </button>

              {/* Active conversations */}
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : activeConversations.length > 0 && (
                <div className="bg-card rounded-xl shadow-md border overflow-hidden">
                  <div className="px-4 py-2.5 border-b bg-muted/30">
                    <h4 className="font-medium text-sm">محادثاتك النشطة</h4>
                  </div>
                  <div className="max-h-[200px] overflow-y-auto">
                    {activeConversations.map((conv) => (
                      <button
                        key={conv.id}
                        onClick={() => onSelectConversation(conv)}
                        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-muted/50 transition-colors border-b last:border-b-0"
                      >
                        <Avatar className="h-10 w-10">
                          {branding.agentAvatarUrl && <AvatarImage src={branding.agentAvatarUrl} />}
                          <AvatarFallback 
                            style={{ backgroundColor: `${branding.primaryColor}20`, color: branding.primaryColor }}
                          >
                            {conv.assigned_agent?.full_name?.charAt(0) || 'D'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0 text-right">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] text-muted-foreground">
                              {conv.last_message_at && format(new Date(conv.last_message_at), 'p', { locale: ar })}
                            </span>
                            <span className="font-medium text-sm truncate">
                              {conv.assigned_agent?.full_name || 'فريق الدعم'}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {conv.last_message_preview || conv.subject}
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
                </div>
              )}
            </div>
          )}

          {view === 'new-chat' && (
            <div className="bg-card rounded-xl shadow-lg border overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b bg-muted/30">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setView('home')}
                >
                  <ChevronLeft className="h-4 w-4 rotate-180" />
                </Button>
                <h4 className="font-semibold text-sm">بدء محادثة جديدة</h4>
              </div>
              
              <div className="p-4 space-y-3">
                <Input
                  placeholder="الاسم *"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-11"
                />
                <Input
                  placeholder="البريد الإلكتروني (اختياري)"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11"
                />
                <Textarea
                  placeholder="كيف يمكننا مساعدتك؟ *"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  className="resize-none"
                />
                <Button
                  className="w-full h-11 gap-2"
                  style={{ backgroundColor: branding.primaryColor }}
                  onClick={handleStartChat}
                  disabled={!name.trim() || !message.trim() || starting}
                >
                  {starting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      جارٍ الإرسال...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      إرسال
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Bottom Navigation */}
      <div className="border-t px-4 py-2 flex items-center justify-around bg-card/80 backdrop-blur">
        <button 
          onClick={() => setView('home')}
          className={cn(
            "flex flex-col items-center gap-1 py-2 px-4 rounded-lg transition-colors",
            view === 'home' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <Home className="h-5 w-5" />
          <span className="text-[10px] font-medium">الرئيسية</span>
          {view === 'home' && (
            <div className="w-4 h-0.5 rounded-full" style={{ backgroundColor: branding.primaryColor }} />
          )}
        </button>
        <button 
          onClick={() => setView('new-chat')}
          className={cn(
            "flex flex-col items-center gap-1 py-2 px-4 rounded-lg transition-colors relative",
            view === 'new-chat' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <MessageCircle className="h-5 w-5" />
          <span className="text-[10px] font-medium">محادثة</span>
          {view === 'new-chat' && (
            <div className="w-4 h-0.5 rounded-full" style={{ backgroundColor: branding.primaryColor }} />
          )}
          {unreadTotal > 0 && (
            <span className="absolute -top-1 right-2 h-4 min-w-4 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1">
              {unreadTotal}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
