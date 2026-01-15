import React, { useState, useRef, useEffect } from 'react';
import { useChat, Conversation, Message } from '@/hooks/useChat';
import { useAgentStatus } from '@/hooks/useAgentStatus';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  MessageCircle, Send, User, Building2, Clock, CheckCheck, 
  UserPlus, X, RotateCcw, Ticket, Circle, Search
} from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

const statusColors = {
  available: 'bg-green-500',
  busy: 'bg-yellow-500',
  offline: 'bg-gray-400'
};

const statusLabels = {
  available: 'متاح',
  busy: 'مشغول',
  offline: 'غير متصل'
};

const conversationStatusLabels = {
  unassigned: 'غير مسندة',
  assigned: 'مسندة',
  closed: 'مغلقة'
};

export default function StaffChatPage() {
  const {
    conversations,
    currentConversation,
    messages,
    loading,
    sending,
    sendMessage,
    assignConversation,
    closeConversation,
    reopenConversation,
    convertToTicket,
    selectConversation
  } = useChat({ autoFetch: true });

  const { currentStatus, updateStatus, availableAgents } = useAgentStatus();
  
  const [messageText, setMessageText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showConvertDialog, setShowConvertDialog] = useState(false);
  const [ticketSubject, setTicketSubject] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const filteredConversations = conversations.filter(conv => {
    if (statusFilter !== 'all' && conv.status !== statusFilter) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        conv.subject?.toLowerCase().includes(query) ||
        conv.organization?.name?.toLowerCase().includes(query) ||
        conv.last_message_preview?.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const handleSendMessage = async () => {
    if (!messageText.trim() || !currentConversation) return;
    await sendMessage(currentConversation.id, messageText);
    setMessageText('');
  };

  const handleConvertToTicket = async () => {
    if (!currentConversation || !ticketSubject) return;
    await convertToTicket(currentConversation.id, {
      subject: ticketSubject,
      category: 'technical',
      priority: 'medium'
    });
    setShowConvertDialog(false);
    setTicketSubject('');
  };

  const unassignedCount = conversations.filter(c => c.status === 'unassigned').length;

  return (
    <div className="h-[calc(100vh-120px)] flex gap-4">
      {/* Conversations List */}
      <Card className="w-80 flex flex-col">
        <div className="p-4 border-b space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              المحادثات
            </h2>
            <Select value={currentStatus} onValueChange={(v) => updateStatus(v as 'available' | 'busy' | 'offline')}>
              <SelectTrigger className="w-28">
                <div className="flex items-center gap-2">
                  <Circle className={`h-2 w-2 ${statusColors[currentStatus]}`} />
                  <span className="text-xs">{statusLabels[currentStatus]}</span>
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="available">
                  <div className="flex items-center gap-2">
                    <Circle className="h-2 w-2 bg-green-500" />
                    متاح
                  </div>
                </SelectItem>
                <SelectItem value="busy">
                  <div className="flex items-center gap-2">
                    <Circle className="h-2 w-2 bg-yellow-500" />
                    مشغول
                  </div>
                </SelectItem>
                <SelectItem value="offline">
                  <div className="flex items-center gap-2">
                    <Circle className="h-2 w-2 bg-gray-400" />
                    غير متصل
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="بحث..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-9"
            />
          </div>

          <Tabs value={statusFilter} onValueChange={setStatusFilter}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="all" className="text-xs">الكل</TabsTrigger>
              <TabsTrigger value="unassigned" className="text-xs">
                غير مسندة
                {unassignedCount > 0 && (
                  <Badge variant="destructive" className="mr-1 h-5 w-5 p-0 text-xs">
                    {unassignedCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="assigned" className="text-xs">مسندة</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <ScrollArea className="flex-1">
          {filteredConversations.map((conv) => (
            <div
              key={conv.id}
              onClick={() => selectConversation(conv)}
              className={`p-3 border-b cursor-pointer hover:bg-muted/50 transition-colors ${
                currentConversation?.id === conv.id ? 'bg-muted' : ''
              }`}
            >
              <div className="flex items-start gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback>
                    <Building2 className="h-5 w-5" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-sm truncate">
                      {conv.organization?.name || 'محادثة جديدة'}
                    </span>
                    {conv.unread_count > 0 && (
                      <Badge variant="default" className="h-5 min-w-5 p-0 text-xs flex items-center justify-center">
                        {conv.unread_count}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-1">
                    {conv.last_message_preview || conv.subject}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant={conv.status === 'unassigned' ? 'destructive' : 'secondary'} className="text-[10px]">
                      {conversationStatusLabels[conv.status]}
                    </Badge>
                    {conv.last_message_at && (
                      <span className="text-[10px] text-muted-foreground">
                        {format(new Date(conv.last_message_at), 'p', { locale: ar })}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
          {filteredConversations.length === 0 && (
            <div className="p-8 text-center text-muted-foreground">
              <MessageCircle className="h-12 w-12 mx-auto mb-2 opacity-20" />
              <p>لا توجد محادثات</p>
            </div>
          )}
        </ScrollArea>
      </Card>

      {/* Chat Area */}
      <Card className="flex-1 flex flex-col">
        {currentConversation ? (
          <>
            {/* Header */}
            <div className="p-4 border-b flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarFallback>
                    <Building2 className="h-5 w-5" />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold">{currentConversation.organization?.name || 'محادثة'}</h3>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Badge variant="outline" className="text-xs">
                      {conversationStatusLabels[currentConversation.status]}
                    </Badge>
                    {currentConversation.assigned_agent && (
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {currentConversation.assigned_agent.full_name}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {currentConversation.status === 'unassigned' && (
                  <Button size="sm" onClick={() => assignConversation(currentConversation.id)}>
                    <UserPlus className="h-4 w-4 ml-1" />
                    استلام
                  </Button>
                )}
                {currentConversation.status !== 'closed' && (
                  <>
                    <Dialog open={showConvertDialog} onOpenChange={setShowConvertDialog}>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline">
                          <Ticket className="h-4 w-4 ml-1" />
                          تحويل لتذكرة
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>تحويل المحادثة إلى تذكرة</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 mt-4">
                          <Input
                            placeholder="عنوان التذكرة"
                            value={ticketSubject}
                            onChange={(e) => setTicketSubject(e.target.value)}
                          />
                          <Button onClick={handleConvertToTicket} className="w-full">
                            تحويل
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                    <Button size="sm" variant="ghost" onClick={() => closeConversation(currentConversation.id)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </>
                )}
                {currentConversation.status === 'closed' && (
                  <Button size="sm" variant="outline" onClick={() => reopenConversation(currentConversation.id)}>
                    <RotateCcw className="h-4 w-4 ml-1" />
                    إعادة فتح
                  </Button>
                )}
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.sender_type === 'agent' ? 'justify-start' : 'justify-end'}`}
                  >
                    {msg.sender_type === 'system' ? (
                      <div className="text-center text-xs text-muted-foreground bg-muted/50 rounded-full px-4 py-1">
                        {msg.body}
                      </div>
                    ) : (
                      <div className={`max-w-[70%] ${msg.sender_type === 'agent' ? 'order-1' : 'order-2'}`}>
                        <div
                          className={`rounded-2xl px-4 py-2 ${
                            msg.sender_type === 'agent'
                              ? 'bg-primary text-primary-foreground rounded-tr-none'
                              : 'bg-muted rounded-tl-none'
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap">{msg.body}</p>
                        </div>
                        <div className={`flex items-center gap-1 mt-1 text-[10px] text-muted-foreground ${
                          msg.sender_type === 'agent' ? 'justify-start' : 'justify-end'
                        }`}>
                          <span>{msg.sender_name}</span>
                          <span>•</span>
                          <span>{format(new Date(msg.created_at), 'p', { locale: ar })}</span>
                          {msg.is_read && <CheckCheck className="h-3 w-3 text-blue-500" />}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Input */}
            {currentConversation.status !== 'closed' && (
              <div className="p-4 border-t">
                <div className="flex gap-2">
                  <Input
                    placeholder="اكتب رسالتك..."
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                    disabled={sending}
                  />
                  <Button onClick={handleSendMessage} disabled={sending || !messageText.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <MessageCircle className="h-16 w-16 mx-auto mb-4 opacity-20" />
              <p>اختر محادثة للبدء</p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
