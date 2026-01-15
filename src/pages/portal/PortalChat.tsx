import React, { useState, useEffect, useRef } from 'react';
import { useChat, Conversation, Message } from '@/hooks/useChat';
import { supabase } from '@/integrations/supabase/client';
import { CustomerChatWidget } from '@/components/chat/messenger/CustomerChatWidget';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  MessageCircle, Send, Plus, ArrowLeft, Loader2, 
  User, Clock, CheckCheck, Check, Search, X, CheckCircle
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const statusLabels = {
  unassigned: { label: 'في الانتظار', color: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-500' },
  assigned: { label: 'قيد المعالجة', color: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
  closed: { label: 'مغلقة', color: 'bg-gray-100 text-gray-600', dot: 'bg-gray-400' }
};

const PortalChat = () => {
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const [newFirstMessage, setNewFirstMessage] = useState('');
  const [showNewChat, setShowNewChat] = useState(false);
  const [startingChat, setStartingChat] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
  } = useChat({ autoFetch: true });

  useEffect(() => {
    fetchClientInfo();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchClientInfo = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from('client_accounts')
        .select('full_name, email')
        .eq('user_id', user.id)
        .single();
      
      if (data) {
        setClientName(data.full_name);
        setClientEmail(data.email);
      }
    }
  };

  const handleStartConversation = async () => {
    if (!newSubject.trim() || !newFirstMessage.trim()) return;
    
    setStartingChat(true);
    try {
      await startConversation(newSubject, newFirstMessage, clientName, clientEmail);
      setShowNewChat(false);
      setNewSubject('');
      setNewFirstMessage('');
    } finally {
      setStartingChat(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !currentConversation) return;
    await sendMessage(currentConversation.id, newMessage, undefined, clientName);
    setNewMessage('');
  };

  const filteredConversations = conversations.filter(conv => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      conv.subject?.toLowerCase().includes(query) ||
      conv.last_message_preview?.toLowerCase().includes(query)
    );
  });

  const activeCount = conversations.filter(c => c.status !== 'closed').length;
  const closedCount = conversations.filter(c => c.status === 'closed').length;
  const unreadCount = conversations.reduce((sum, c) => sum + (c.unread_count || 0), 0);

  // Conversation List View
  if (!currentConversation) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <MessageCircle className="h-6 w-6 text-primary" />
            المحادثات
          </h1>
          <p className="text-muted-foreground">تواصل مباشر مع فريق الدعم</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-full bg-primary/10">
                <MessageCircle className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{conversations.length}</p>
                <p className="text-sm text-muted-foreground">إجمالي المحادثات</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-full bg-green-100">
                <Clock className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeCount}</p>
                <p className="text-sm text-muted-foreground">محادثات نشطة</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-full bg-gray-100">
                <CheckCircle className="h-6 w-6 text-gray-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{closedCount}</p>
                <p className="text-sm text-muted-foreground">محادثات مكتملة</p>
              </div>
            </CardContent>
          </Card>

          {unreadCount > 0 && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-3 rounded-full bg-red-100">
                  <MessageCircle className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-red-600">{unreadCount}</p>
                  <p className="text-sm text-red-600/70">رسائل غير مقروءة</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Conversations Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div>
              <CardTitle>محادثاتك</CardTitle>
              <CardDescription>جميع محادثاتك مع فريق الدعم</CardDescription>
            </div>
            <Button onClick={() => setShowNewChat(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              محادثة جديدة
            </Button>
          </CardHeader>
          <CardContent>
            {/* Search */}
            {conversations.length > 0 && (
              <div className="relative mb-4">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="البحث في المحادثات..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-10"
                />
              </div>
            )}

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-4">
                <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <MessageCircle className="h-12 w-12 text-primary/50" />
                </div>
                <h3 className="text-lg font-medium mb-2">لا توجد محادثات</h3>
                <p className="text-muted-foreground text-center mb-4">
                  ابدأ محادثة جديدة للتواصل مع فريق الدعم
                </p>
                <Button onClick={() => setShowNewChat(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  بدء محادثة
                </Button>
              </div>
            ) : (
              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {filteredConversations.map((conv) => (
                    <div
                      key={conv.id}
                      onClick={() => selectConversation(conv)}
                      className="p-4 flex items-center gap-4 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
                    >
                      <div className="relative">
                        <Avatar className="h-12 w-12">
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {conv.assigned_agent?.full_name?.charAt(0) || 'D'}
                          </AvatarFallback>
                        </Avatar>
                        <span className={cn(
                          "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background",
                          statusLabels[conv.status].dot
                        )} />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <h3 className="font-medium truncate">{conv.subject || 'محادثة'}</h3>
                          <span className="text-xs text-muted-foreground flex-shrink-0">
                            {conv.last_message_at && formatDistanceToNow(new Date(conv.last_message_at), { 
                              addSuffix: true, 
                              locale: ar 
                            })}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground truncate mb-2">
                          {conv.last_message_preview || 'لا توجد رسائل'}
                        </p>
                        <div className="flex items-center gap-2">
                          <Badge className={statusLabels[conv.status].color}>
                            {statusLabels[conv.status].label}
                          </Badge>
                          {conv.assigned_agent && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {conv.assigned_agent.full_name}
                            </span>
                          )}
                        </div>
                      </div>

                      {conv.unread_count > 0 && (
                        <Badge variant="destructive" className="h-6 min-w-6 text-sm flex items-center justify-center">
                          {conv.unread_count}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* New Chat Dialog */}
        <Dialog open={showNewChat} onOpenChange={setShowNewChat}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-primary" />
                محادثة جديدة
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">الموضوع</label>
                <Input
                  placeholder="عنوان المحادثة..."
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">الرسالة</label>
                <Textarea
                  placeholder="اكتب رسالتك هنا..."
                  value={newFirstMessage}
                  onChange={(e) => setNewFirstMessage(e.target.value)}
                  rows={4}
                />
              </div>
              <Button 
                onClick={handleStartConversation} 
                disabled={startingChat || !newSubject.trim() || !newFirstMessage.trim()}
                className="w-full gap-2"
              >
                {startingChat ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                إرسال
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Customer Chat Widget - Floating */}
        <CustomerChatWidget />
      </div>
    );
  }

  // Conversation View
  return (
    <div className="h-[calc(100vh-120px)] flex flex-col bg-background rounded-lg border shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b flex items-center justify-between bg-card">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setCurrentConversation(null)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="relative">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-primary/10 text-primary">
                {currentConversation.assigned_agent?.full_name?.charAt(0) || 'D'}
              </AvatarFallback>
            </Avatar>
            <span className={cn(
              "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-card",
              statusLabels[currentConversation.status].dot
            )} />
          </div>
          <div>
            <h2 className="font-semibold">{currentConversation.subject || 'محادثة'}</h2>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {currentConversation.assigned_agent ? (
                <span>{currentConversation.assigned_agent.full_name}</span>
              ) : (
                <span>في انتظار التعيين</span>
              )}
              <span>•</span>
              <span>{statusLabels[currentConversation.status].label}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 bg-muted/20">
        <div className="p-4 space-y-1 max-w-3xl mx-auto">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Avatar className="h-16 w-16 mb-3">
                <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                  {currentConversation.assigned_agent?.full_name?.charAt(0) || 'D'}
                </AvatarFallback>
              </Avatar>
              <p className="text-muted-foreground">ابدأ المحادثة الآن</p>
            </div>
          )}
          
          {messages.map((msg, index) => {
            const isOwn = msg.sender_type === 'client';
            const isSystem = msg.sender_type === 'system';
            const showAvatar = !isOwn && (index === 0 || messages[index - 1]?.sender_type !== msg.sender_type);

            if (isSystem) {
              return (
                <div key={msg.id} className="flex justify-center my-3">
                  <span className="text-xs text-muted-foreground bg-muted/60 px-3 py-1 rounded-full">
                    {msg.body}
                  </span>
                </div>
              );
            }

            return (
              <div
                key={msg.id}
                className={cn("flex gap-2 mb-2", isOwn ? "flex-row" : "flex-row-reverse")}
              >
                {!isOwn && showAvatar && (
                  <Avatar className="h-8 w-8 flex-shrink-0 mt-auto">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                      {msg.sender_name?.charAt(0) || 'D'}
                    </AvatarFallback>
                  </Avatar>
                )}
                {!isOwn && !showAvatar && <div className="w-8 flex-shrink-0" />}
                
                <div className={cn("max-w-[75%] flex flex-col", isOwn ? "items-start" : "items-end")}>
                  <div
                    className={cn(
                      "px-4 py-2 rounded-2xl text-sm",
                      isOwn
                        ? "bg-primary text-primary-foreground rounded-bl-sm"
                        : "bg-muted rounded-br-sm"
                    )}
                  >
                    <p className="whitespace-pre-wrap">{msg.body}</p>
                  </div>
                  <div className={cn(
                    "flex items-center gap-1 mt-1 text-[10px] text-muted-foreground px-1",
                    isOwn ? "flex-row" : "flex-row-reverse"
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
          })}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      {currentConversation.status !== 'closed' ? (
        <div className="flex-shrink-0 p-4 border-t bg-card">
          <div className="flex gap-3 max-w-3xl mx-auto">
            <Input
              placeholder="اكتب رسالتك..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
              disabled={sending}
              className="flex-1"
            />
            <Button 
              onClick={handleSendMessage} 
              disabled={sending || !newMessage.trim()}
              className="gap-2"
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              إرسال
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex-shrink-0 p-4 border-t bg-muted/50 text-center text-sm text-muted-foreground">
          هذه المحادثة مغلقة
        </div>
      )}
    </div>
  );
};

export default PortalChat;
