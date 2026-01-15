import React, { useState } from 'react';
import { MessageCircle, X, Plus, ChevronLeft, Home, HelpCircle, FileText, Phone } from 'lucide-react';
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
  starting = false
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
          "fixed bottom-6 z-50 h-14 w-14 rounded-full shadow-lg flex items-center justify-center text-white transition-all hover:scale-105 active:scale-95",
          branding.widgetPosition === 'left' ? 'left-6' : 'right-6'
        )}
        style={{ backgroundColor: branding.primaryColor }}
      >
        <MessageCircle className="h-6 w-6" />
        {unreadTotal > 0 && (
          <span className="absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-xs font-bold px-1">
            {unreadTotal > 9 ? '9+' : unreadTotal}
          </span>
        )}
      </button>
    );
  }

  return (
    <div 
      className={cn(
        "fixed bottom-6 z-50 w-[360px] rounded-2xl shadow-2xl overflow-hidden bg-background border flex flex-col",
        branding.widgetPosition === 'left' ? 'left-6' : 'right-6'
      )}
      style={{ height: '560px' }}
    >
      {/* Header */}
      <div 
        className="relative px-5 pt-5 pb-16 text-white"
        style={{ 
          backgroundColor: branding.primaryColor,
          borderBottomLeftRadius: '50% 30px',
          borderBottomRightRadius: '50% 30px'
        }}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {branding.logoUrl ? (
              <img src={branding.logoUrl} alt="Logo" className="h-10 w-10 rounded-full object-cover bg-white/10" />
            ) : (
              <Avatar className="h-10 w-10 bg-white/20">
                <AvatarFallback className="bg-white/20 text-white">
                  {branding.organizationName.charAt(0)}
                </AvatarFallback>
              </Avatar>
            )}
            <div>
              <h3 className="font-bold text-lg">{branding.organizationName}</h3>
              <p className="text-sm text-white/80">{branding.welcomeText}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-white hover:bg-white/20 rounded-full"
            onClick={onToggle}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden -mt-8 px-4">
        {view === 'home' && (
          <div className="space-y-3">
            {/* Start new chat button */}
            <button
              onClick={() => setView('new-chat')}
              className="w-full bg-card rounded-xl p-4 flex items-center gap-3 shadow-md hover:shadow-lg transition-shadow border"
            >
              <div 
                className="h-10 w-10 rounded-full flex items-center justify-center"
                style={{ backgroundColor: `${branding.primaryColor}15` }}
              >
                <MessageCircle className="h-5 w-5" style={{ color: branding.primaryColor }} />
              </div>
              <div className="flex-1 text-right">
                <h4 className="font-medium">دردش معنا الآن</h4>
                <p className="text-xs text-muted-foreground">نحن متصلون ومستعدون للمساعدة</p>
              </div>
              <ChevronLeft className="h-5 w-5 text-muted-foreground" />
            </button>

            {/* Active conversations */}
            {activeConversations.length > 0 && (
              <div className="bg-card rounded-xl shadow-md border overflow-hidden">
                <div className="px-4 py-2 border-b">
                  <h4 className="font-medium text-sm text-muted-foreground">محادثاتك النشطة</h4>
                </div>
                <ScrollArea className="max-h-[200px]">
                  {activeConversations.map((conv) => (
                    <button
                      key={conv.id}
                      onClick={() => onSelectConversation(conv)}
                      className="w-full px-4 py-3 flex items-center gap-3 hover:bg-muted/50 transition-colors border-b last:border-b-0"
                    >
                      <Avatar className="h-9 w-9">
                        <AvatarFallback style={{ backgroundColor: `${branding.primaryColor}20`, color: branding.primaryColor }}>
                          {conv.assigned_agent?.full_name?.charAt(0) || 'D'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0 text-right">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs text-muted-foreground">
                            {conv.last_message_at && format(new Date(conv.last_message_at), 'p', { locale: ar })}
                          </span>
                          <span className="font-medium text-sm truncate">
                            {conv.assigned_agent?.full_name || 'فريق الدعم'}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
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
                </ScrollArea>
              </div>
            )}
          </div>
        )}

        {view === 'new-chat' && (
          <div className="bg-card rounded-xl shadow-md border p-4 space-y-4">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setView('home')}
              >
                <ChevronLeft className="h-4 w-4 rotate-180" />
              </Button>
              <h4 className="font-medium">بدء محادثة جديدة</h4>
            </div>
            
            <div className="space-y-3">
              <Input
                placeholder="الاسم *"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <Input
                placeholder="البريد الإلكتروني (اختياري)"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Textarea
                placeholder="كيف يمكننا مساعدتك؟ *"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
              />
              <Button
                className="w-full"
                style={{ backgroundColor: branding.primaryColor }}
                onClick={handleStartChat}
                disabled={!name.trim() || !message.trim() || starting}
              >
                {starting ? 'جارٍ الإرسال...' : 'إرسال'}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="border-t px-4 py-2 flex items-center justify-around bg-background">
        <button 
          onClick={() => setView('home')}
          className={cn(
            "flex flex-col items-center gap-1 py-2 px-3 rounded-lg transition-colors",
            view === 'home' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <Home className="h-5 w-5" />
          <span className="text-[10px]">الرئيسية</span>
        </button>
        <button 
          onClick={() => setView('new-chat')}
          className={cn(
            "flex flex-col items-center gap-1 py-2 px-3 rounded-lg transition-colors",
            view === 'new-chat' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <MessageCircle className="h-5 w-5" />
          <span className="text-[10px]">محادثة</span>
        </button>
      </div>
    </div>
  );
}
