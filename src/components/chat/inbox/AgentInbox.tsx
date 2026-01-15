import React, { useState, useRef, useEffect } from 'react';
import { useChat, Conversation, Message } from '@/hooks/useChat';
import { useAgentStatus } from '@/hooks/useAgentStatus';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { 
  MessageCircle, Send, User, Building2, Clock, CheckCheck, Check,
  UserPlus, X, RotateCcw, Ticket, Circle, Search, Users, Inbox,
  ChevronDown, Phone, Mail, ExternalLink, MoreVertical, Paperclip,
  Smile, Loader2
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { cn } from '@/lib/utils';

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

const conversationStatusConfig = {
  unassigned: { label: 'غير مسندة', color: 'bg-amber-500', textColor: 'text-amber-600' },
  assigned: { label: 'مسندة', color: 'bg-green-500', textColor: 'text-green-600' },
  closed: { label: 'مغلقة', color: 'bg-gray-400', textColor: 'text-gray-500' }
};

type ConversationTab = 'all' | 'customers' | 'internal';
type ConversationFilter = 'all' | 'unassigned' | 'assigned' | 'mine' | 'closed';

export default function AgentInbox() {
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

  const { currentStatus, staffId, updateStatus, availableAgents } = useAgentStatus();
  
  const [messageText, setMessageText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<ConversationTab>('customers');
  const [filter, setFilter] = useState<ConversationFilter>('all');
  const [showConvertDialog, setShowConvertDialog] = useState(false);
  const [ticketSubject, setTicketSubject] = useState('');
  const [showCustomerPanel, setShowCustomerPanel] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Filter conversations
  const filteredConversations = conversations.filter(conv => {
    // Tab filter
    if (activeTab === 'customers' && conv.source === 'internal') return false;
    if (activeTab === 'internal' && conv.source !== 'internal') return false;
    
    // Status filter
    if (filter === 'unassigned' && conv.status !== 'unassigned') return false;
    if (filter === 'assigned' && conv.status !== 'assigned') return false;
    if (filter === 'mine' && conv.assigned_agent_id !== staffId) return false;
    if (filter === 'closed' && conv.status !== 'closed') return false;
    
    // Search
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

  // Count badges
  const unassignedCount = conversations.filter(c => c.status === 'unassigned').length;
  const customersUnread = conversations.filter(c => c.source !== 'internal' && c.unread_count > 0).length;
  const internalUnread = conversations.filter(c => c.source === 'internal' && c.unread_count > 0).length;

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

  return (
    <div className="h-[calc(100vh-120px)] flex gap-0 border rounded-xl overflow-hidden bg-background">
      {/* Column 1: Conversations List */}
      <div className="w-80 border-l flex flex-col bg-card">
        {/* Header with agent status */}
        <div className="p-3 border-b space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Inbox className="h-5 w-5 text-primary" />
              <h2 className="font-bold">صندوق الوارد</h2>
            </div>
            <Select value={currentStatus} onValueChange={(v) => updateStatus(v as 'available' | 'busy' | 'offline')}>
              <SelectTrigger className="w-auto h-8 gap-2 text-xs border-0 bg-muted/50">
                <Circle className={cn("h-2 w-2", statusColors[currentStatus])} />
                <span>{statusLabels[currentStatus]}</span>
              </SelectTrigger>
              <SelectContent>
                {Object.entries(statusLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    <div className="flex items-center gap-2">
                      <Circle className={cn("h-2 w-2", statusColors[value as keyof typeof statusColors])} />
                      {label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ConversationTab)}>
            <TabsList className="w-full grid grid-cols-2 h-9">
              <TabsTrigger value="customers" className="text-xs gap-1">
                العملاء
                {customersUnread > 0 && (
                  <Badge variant="destructive" className="h-4 min-w-4 text-[10px] p-0">
                    {customersUnread}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="internal" className="text-xs gap-1">
                داخلية
                {internalUnread > 0 && (
                  <Badge variant="destructive" className="h-4 min-w-4 text-[10px] p-0">
                    {internalUnread}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Search */}
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="بحث في المحادثات..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-9 h-9 text-sm bg-muted/50 border-0"
            />
          </div>

          {/* Filter chips */}
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {[
              { key: 'all', label: 'الكل' },
              { key: 'unassigned', label: 'غير مسندة', count: unassignedCount },
              { key: 'mine', label: 'محادثاتي' },
              { key: 'closed', label: 'مغلقة' }
            ].map(({ key, label, count }) => (
              <Button
                key={key}
                variant={filter === key ? 'default' : 'outline'}
                size="sm"
                className="h-7 text-xs whitespace-nowrap flex-shrink-0"
                onClick={() => setFilter(key as ConversationFilter)}
              >
                {label}
                {count !== undefined && count > 0 && (
                  <Badge variant={filter === key ? 'secondary' : 'destructive'} className="mr-1 h-4 min-w-4 text-[10px] p-0">
                    {count}
                  </Badge>
                )}
              </Button>
            ))}
          </div>
        </div>

        {/* Conversations list */}
        <ScrollArea className="flex-1">
          {loading && conversations.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <MessageCircle className="h-12 w-12 mx-auto mb-2 opacity-20" />
              <p className="text-sm">لا توجد محادثات</p>
            </div>
          ) : (
            filteredConversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => selectConversation(conv)}
                className={cn(
                  "px-3 py-3 border-b cursor-pointer transition-colors hover:bg-muted/50",
                  currentConversation?.id === conv.id && "bg-primary/5 border-r-2 border-r-primary"
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="relative">
                    <Avatar className="h-10 w-10">
                      {conv.organization?.logo_url && (
                        <AvatarImage src={conv.organization.logo_url} />
                      )}
                      <AvatarFallback className="bg-primary/10 text-primary text-sm">
                        {conv.organization?.name?.charAt(0) || <Building2 className="h-4 w-4" />}
                      </AvatarFallback>
                    </Avatar>
                    <span className={cn(
                      "absolute -bottom-0.5 -left-0.5 h-3 w-3 rounded-full border-2 border-background",
                      conversationStatusConfig[conv.status].color
                    )} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-sm truncate">
                        {conv.organization?.name || (conv.metadata?.sender_name as string) || 'زائر'}
                      </span>
                      <span className="text-[10px] text-muted-foreground flex-shrink-0">
                        {conv.last_message_at && formatDistanceToNow(new Date(conv.last_message_at), { 
                          addSuffix: true, 
                          locale: ar 
                        })}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {conv.last_message_preview || conv.subject}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5">
                      {conv.assigned_agent && (
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {conv.assigned_agent.full_name}
                        </span>
                      )}
                    </div>
                  </div>
                  {conv.unread_count > 0 && (
                    <Badge variant="destructive" className="h-5 min-w-5 text-xs p-0 flex items-center justify-center">
                      {conv.unread_count}
                    </Badge>
                  )}
                </div>
              </div>
            ))
          )}
        </ScrollArea>
      </div>

      {/* Column 2: Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {currentConversation ? (
          <>
            {/* Chat Header */}
            <div className="h-14 px-4 border-b flex items-center justify-between bg-card">
              <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9">
                  {currentConversation.organization?.logo_url && (
                    <AvatarImage src={currentConversation.organization.logo_url} />
                  )}
                  <AvatarFallback className="bg-primary/10 text-primary text-sm">
                    {currentConversation.organization?.name?.charAt(0) || <Building2 className="h-4 w-4" />}
                  </AvatarFallback>
                </Avatar>
                <div>
                <h3 className="font-semibold text-sm">
                    {currentConversation.organization?.name || (currentConversation.metadata?.sender_name as string) || 'محادثة'}
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "text-xs",
                      conversationStatusConfig[currentConversation.status].textColor
                    )}>
                      {conversationStatusConfig[currentConversation.status].label}
                    </span>
                    {currentConversation.assigned_agent && (
                      <>
                        <span className="text-muted-foreground">•</span>
                        <span className="text-xs text-muted-foreground">
                          {currentConversation.assigned_agent.full_name}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {currentConversation.status === 'unassigned' && (
                  <Button size="sm" onClick={() => assignConversation(currentConversation.id)} className="h-8 text-xs">
                    <UserPlus className="h-3.5 w-3.5 ml-1" />
                    استلام
                  </Button>
                )}
                {currentConversation.status === 'assigned' && (
                  <>
                    <Dialog open={showConvertDialog} onOpenChange={setShowConvertDialog}>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline" className="h-8 text-xs">
                          <Ticket className="h-3.5 w-3.5 ml-1" />
                          تذكرة
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>تحويل إلى تذكرة</DialogTitle>
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
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => closeConversation(currentConversation.id)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </>
                )}
                {currentConversation.status === 'closed' && (
                  <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => reopenConversation(currentConversation.id)}>
                    <RotateCcw className="h-3.5 w-3.5 ml-1" />
                    إعادة فتح
                  </Button>
                )}
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="h-8 w-8 p-0"
                  onClick={() => setShowCustomerPanel(!showCustomerPanel)}
                >
                  <Users className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-1 max-w-3xl mx-auto">
                {messages.map((msg, index) => {
                  const isOwn = msg.sender_type === 'agent';
                  const isSystem = msg.sender_type === 'system';
                  const showAvatar = !isOwn && (index === 0 || messages[index - 1].sender_type !== msg.sender_type);

                  if (isSystem) {
                    return (
                      <div key={msg.id} className="flex justify-center my-3">
                        <span className="text-xs text-muted-foreground bg-muted/50 px-3 py-1 rounded-full">
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
                      <div className={cn("max-w-[70%] flex flex-col", isOwn ? "items-start" : "items-end")}>
                        {!isOwn && msg.sender_name && showAvatar && (
                          <span className="text-[10px] text-muted-foreground mb-1 px-2">
                            {msg.sender_name}
                          </span>
                        )}
                        <div
                          className={cn(
                            "px-3 py-2 rounded-2xl text-sm",
                            isOwn 
                              ? "bg-primary text-primary-foreground rounded-tr-sm" 
                              : "bg-muted rounded-tl-sm"
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
              <div className="p-3 border-t bg-card">
                <div className="flex gap-2 max-w-3xl mx-auto">
                  <Button variant="ghost" size="icon" className="h-10 w-10 flex-shrink-0">
                    <Paperclip className="h-5 w-5 text-muted-foreground" />
                  </Button>
                  <Input
                    placeholder="اكتب رسالتك..."
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                    disabled={sending}
                    className="flex-1 h-10"
                  />
                  <Button 
                    onClick={handleSendMessage} 
                    disabled={sending || !messageText.trim()}
                    className="h-10 px-4"
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
              <div className="p-3 text-center text-sm text-muted-foreground bg-muted/30 border-t">
                تم إغلاق هذه المحادثة
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <MessageCircle className="h-16 w-16 mx-auto mb-4 opacity-20" />
              <p className="font-medium">اختر محادثة للبدء</p>
              <p className="text-sm mt-1">اختر محادثة من القائمة على اليمين</p>
            </div>
          </div>
        )}
      </div>

      {/* Column 3: Customer Info Panel */}
      {showCustomerPanel && currentConversation && (
        <div className="w-72 border-r flex flex-col bg-card">
          <div className="p-4 border-b">
            <h3 className="font-semibold text-sm">معلومات العميل</h3>
          </div>
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {/* Customer avatar and name */}
              <div className="text-center">
                <Avatar className="h-16 w-16 mx-auto mb-2">
                  {currentConversation.organization?.logo_url && (
                    <AvatarImage src={currentConversation.organization.logo_url} />
                  )}
                  <AvatarFallback className="text-lg bg-primary/10 text-primary">
                    {currentConversation.organization?.name?.charAt(0) || 'W'}
                  </AvatarFallback>
                </Avatar>
                <h4 className="font-semibold">
                  {currentConversation.organization?.name || (currentConversation.metadata?.sender_name as string) || 'زائر'}
                </h4>
                {currentConversation.metadata?.sender_email && (
                  <p className="text-sm text-muted-foreground">
                    {String(currentConversation.metadata.sender_email)}
                  </p>
                )}
              </div>

              <Separator />

              {/* Contact info */}
              <div className="space-y-3">
                <h5 className="text-xs font-medium text-muted-foreground">معلومات التواصل</h5>
                {currentConversation.organization?.contact_email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="truncate">{currentConversation.organization.contact_email}</span>
                  </div>
                )}
                {currentConversation.metadata?.sender_email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="truncate">{String(currentConversation.metadata.sender_email)}</span>
                  </div>
                )}
              </div>

              <Separator />

              {/* Conversation info */}
              <div className="space-y-3">
                <h5 className="text-xs font-medium text-muted-foreground">معلومات المحادثة</h5>
                <div className="text-sm space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">بدأت في:</span>
                    <span>{format(new Date(currentConversation.created_at), 'Pp', { locale: ar })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">المصدر:</span>
                    <span>{currentConversation.source === 'embed' ? 'Widget' : 'البوابة'}</span>
                  </div>
                  {currentConversation.source_domain && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">الموقع:</span>
                      <span className="truncate max-w-[120px]">{currentConversation.source_domain}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
