import React, { useState, useRef, useEffect } from 'react';
import { useChat, Conversation, Message } from '@/hooks/useChat';
import { useAgentStatus } from '@/hooks/useAgentStatus';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { 
  MessageCircle, Send, User, Building2, CheckCheck, Check,
  UserPlus, X, RotateCcw, Ticket, Circle, Search, Users, Inbox,
  Phone, Mail, ExternalLink, Loader2, Plus, ChevronLeft
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
  unassigned: { label: 'غير مسندة', color: 'bg-amber-500', textColor: 'text-amber-600', bgLight: 'bg-amber-50' },
  assigned: { label: 'مسندة', color: 'bg-green-500', textColor: 'text-green-600', bgLight: 'bg-green-50' },
  closed: { label: 'مغلقة', color: 'bg-gray-400', textColor: 'text-gray-500', bgLight: 'bg-gray-50' }
};

type ConversationTab = 'customers' | 'internal';
type ConversationFilter = 'all' | 'unassigned' | 'assigned' | 'mine' | 'closed';

interface StaffMember {
  id: string;
  full_name: string;
  email: string;
  agent_status: 'available' | 'busy' | 'offline';
}

export default function AgentInbox() {
  const {
    conversations,
    currentConversation,
    messages,
    loading,
    sending,
    sendMessage,
    startConversation,
    assignConversation,
    closeConversation,
    reopenConversation,
    convertToTicket,
    selectConversation,
    setCurrentConversation
  } = useChat({ autoFetch: true });

  const { currentStatus, staffId, updateStatus, availableAgents } = useAgentStatus();
  
  const [messageText, setMessageText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<ConversationTab>('customers');
  const [filter, setFilter] = useState<ConversationFilter>('all');
  const [showConvertDialog, setShowConvertDialog] = useState(false);
  const [showNewInternalChat, setShowNewInternalChat] = useState(false);
  const [ticketSubject, setTicketSubject] = useState('');
  const [showCustomerPanel, setShowCustomerPanel] = useState(true);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<string>('');
  const [internalMessage, setInternalMessage] = useState('');
  const [staffName, setStaffName] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    fetchStaffMembers();
    fetchStaffName();
  }, []);

  const fetchStaffMembers = async () => {
    const { data } = await supabase
      .from('staff_members')
      .select('id, full_name, email, agent_status')
      .eq('is_active', true);
    
    if (data) {
      setStaffMembers(data as StaffMember[]);
    }
  };

  const fetchStaffName = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from('staff_members')
        .select('full_name')
        .eq('user_id', user.id)
        .single();
      
      if (data) {
        setStaffName(data.full_name);
      }
    }
  };

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
  const unassignedCount = conversations.filter(c => c.status === 'unassigned' && c.source !== 'internal').length;
  const customersUnread = conversations.filter(c => c.source !== 'internal' && c.unread_count > 0).length;
  const internalUnread = conversations.filter(c => c.source === 'internal' && c.unread_count > 0).length;

  const handleSendMessage = async () => {
    if (!messageText.trim() || !currentConversation) return;
    await sendMessage(currentConversation.id, messageText, undefined, staffName);
    setMessageText('');
  };

  const handleStartInternalChat = async () => {
    if (!selectedStaff || !internalMessage.trim()) return;
    
    const selectedStaffMember = staffMembers.find(s => s.id === selectedStaff);
    if (!selectedStaffMember) return;

    try {
      // Create internal conversation
      const { data: convData, error: convError } = await supabase
        .from('conversations')
        .insert({
          subject: `محادثة مع ${selectedStaffMember.full_name}`,
          source: 'internal',
          status: 'assigned',
          assigned_agent_id: selectedStaff,
          metadata: { sender_name: staffName }
        })
        .select()
        .single();

      if (convError) throw convError;

      // Send first message
      await supabase.from('conversation_messages').insert({
        conversation_id: convData.id,
        body: internalMessage,
        sender_type: 'agent',
        sender_id: staffId,
        sender_name: staffName
      });

      setShowNewInternalChat(false);
      setSelectedStaff('');
      setInternalMessage('');
    } catch (error) {
      console.error('Error starting internal chat:', error);
    }
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

  // Mobile: Show conversation list
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;

  return (
    <div className="h-[calc(100vh-120px)] flex border rounded-xl overflow-hidden bg-background shadow-sm">
      {/* Column 1: Conversations List */}
      <div className={cn(
        "w-80 border-l flex flex-col bg-card",
        currentConversation && isMobile && "hidden"
      )}>
        {/* Header with agent status */}
        <div className="p-3 border-b space-y-3 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <Inbox className="h-5 w-5 text-primary" />
              </div>
              <h2 className="font-bold">صندوق الوارد</h2>
            </div>
            <Select value={currentStatus} onValueChange={(v) => updateStatus(v as 'available' | 'busy' | 'offline')}>
              <SelectTrigger className="w-auto h-8 gap-2 text-xs border bg-muted/50 px-2">
                <Circle className={cn("h-2 w-2 fill-current", statusColors[currentStatus])} style={{ color: 'currentColor' }} />
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
              <TabsTrigger value="customers" className="text-xs gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                العملاء
                {customersUnread > 0 && (
                  <Badge variant="destructive" className="h-4 min-w-4 text-[10px] p-0 px-1">
                    {customersUnread}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="internal" className="text-xs gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                داخلية
                {internalUnread > 0 && (
                  <Badge variant="destructive" className="h-4 min-w-4 text-[10px] p-0 px-1">
                    {internalUnread}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* New internal chat button */}
          {activeTab === 'internal' && (
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full gap-2"
              onClick={() => setShowNewInternalChat(true)}
            >
              <Plus className="h-4 w-4" />
              محادثة داخلية جديدة
            </Button>
          )}

          {/* Search */}
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="بحث في المحادثات..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-9 h-9 text-sm bg-muted/30 border-0"
            />
          </div>

          {/* Filter chips */}
          {activeTab === 'customers' && (
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
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
                  className="h-7 text-xs whitespace-nowrap flex-shrink-0 rounded-full"
                  onClick={() => setFilter(key as ConversationFilter)}
                >
                  {label}
                  {count !== undefined && count > 0 && (
                    <Badge 
                      variant={filter === key ? 'secondary' : 'destructive'} 
                      className="mr-1 h-4 min-w-4 text-[10px] p-0 px-1"
                    >
                      {count}
                    </Badge>
                  )}
                </Button>
              ))}
            </div>
          )}
        </div>

        {/* Conversations list */}
        <ScrollArea className="flex-1">
          {loading && conversations.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p className="text-sm">لا توجد محادثات</p>
            </div>
          ) : (
            <div className="divide-y">
              {filteredConversations.map((conv) => (
                <div
                  key={conv.id}
                  onClick={() => selectConversation(conv)}
                  className={cn(
                    "px-3 py-3 cursor-pointer transition-all hover:bg-muted/50",
                    currentConversation?.id === conv.id && "bg-primary/5 border-r-2 border-r-primary"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className="relative flex-shrink-0">
                      <Avatar className="h-11 w-11">
                        {conv.organization?.logo_url && (
                          <AvatarImage src={conv.organization.logo_url} />
                        )}
                        <AvatarFallback className="bg-primary/10 text-primary text-sm">
                          {conv.source === 'internal' 
                            ? (conv.metadata?.sender_name as string)?.charAt(0) || 'M'
                            : conv.organization?.name?.charAt(0) || <Building2 className="h-4 w-4" />
                          }
                        </AvatarFallback>
                      </Avatar>
                      <span className={cn(
                        "absolute -bottom-0.5 -left-0.5 h-3 w-3 rounded-full border-2 border-card",
                        conversationStatusConfig[conv.status].color
                      )} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <span className="font-medium text-sm truncate">
                          {conv.source === 'internal'
                            ? (conv.metadata?.sender_name as string) || 'موظف'
                            : conv.organization?.name || (conv.metadata?.sender_name as string) || 'زائر'
                          }
                        </span>
                        <span className="text-[10px] text-muted-foreground flex-shrink-0">
                          {conv.last_message_at && formatDistanceToNow(new Date(conv.last_message_at), { 
                            addSuffix: false, 
                            locale: ar 
                          })}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {conv.last_message_preview || conv.subject}
                      </p>
                      {conv.assigned_agent && conv.source !== 'internal' && (
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1 mt-1">
                          <User className="h-3 w-3" />
                          {conv.assigned_agent.full_name}
                        </span>
                      )}
                    </div>
                    {conv.unread_count > 0 && (
                      <Badge variant="destructive" className="h-5 min-w-5 text-xs p-0 px-1.5 flex items-center justify-center">
                        {conv.unread_count}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Column 2: Chat Area */}
      <div className={cn(
        "flex-1 flex flex-col min-w-0",
        !currentConversation && "hidden lg:flex"
      )}>
        {currentConversation ? (
          <>
            {/* Chat Header */}
            <div className="h-16 px-4 border-b flex items-center justify-between bg-card flex-shrink-0">
              <div className="flex items-center gap-3">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="lg:hidden h-9 w-9"
                  onClick={() => setCurrentConversation(null)}
                >
                  <ChevronLeft className="h-5 w-5 rotate-180" />
                </Button>
                <Avatar className="h-10 w-10">
                  {currentConversation.organization?.logo_url && (
                    <AvatarImage src={currentConversation.organization.logo_url} />
                  )}
                  <AvatarFallback className="bg-primary/10 text-primary text-sm">
                    {currentConversation.source === 'internal'
                      ? (currentConversation.metadata?.sender_name as string)?.charAt(0) || 'M'
                      : currentConversation.organization?.name?.charAt(0) || <Building2 className="h-4 w-4" />
                    }
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold text-sm">
                    {currentConversation.source === 'internal'
                      ? (currentConversation.metadata?.sender_name as string) || 'محادثة داخلية'
                      : currentConversation.organization?.name || (currentConversation.metadata?.sender_name as string) || 'محادثة'
                    }
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "text-xs",
                      conversationStatusConfig[currentConversation.status].textColor
                    )}>
                      {conversationStatusConfig[currentConversation.status].label}
                    </span>
                    {currentConversation.assigned_agent && currentConversation.source !== 'internal' && (
                      <>
                        <span className="text-muted-foreground text-xs">•</span>
                        <span className="text-xs text-muted-foreground">
                          {currentConversation.assigned_agent.full_name}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {currentConversation.status === 'unassigned' && currentConversation.source !== 'internal' && (
                  <Button size="sm" onClick={() => assignConversation(currentConversation.id)} className="h-8 text-xs gap-1">
                    <UserPlus className="h-3.5 w-3.5" />
                    استلام
                  </Button>
                )}
                {currentConversation.status === 'assigned' && currentConversation.source !== 'internal' && (
                  <>
                    <Dialog open={showConvertDialog} onOpenChange={setShowConvertDialog}>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline" className="h-8 text-xs gap-1">
                          <Ticket className="h-3.5 w-3.5" />
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
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive" 
                      onClick={() => closeConversation(currentConversation.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </>
                )}
                {currentConversation.status === 'closed' && (
                  <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => reopenConversation(currentConversation.id)}>
                    <RotateCcw className="h-3.5 w-3.5" />
                    إعادة فتح
                  </Button>
                )}
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className={cn("h-8 w-8 p-0", showCustomerPanel && "bg-muted")}
                  onClick={() => setShowCustomerPanel(!showCustomerPanel)}
                >
                  <Users className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 bg-muted/20">
              <div className="p-4 space-y-1 max-w-3xl mx-auto">
                {messages.map((msg, index) => {
                  const isOwn = msg.sender_type === 'agent';
                  const isSystem = msg.sender_type === 'system';
                  const showAvatar = !isOwn && (index === 0 || messages[index - 1].sender_type !== msg.sender_type);

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
                            {msg.sender_name?.charAt(0) || 'C'}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      {!isOwn && !showAvatar && <div className="w-8 flex-shrink-0" />}
                      
                      <div className={cn("max-w-[70%] flex flex-col", isOwn ? "items-start" : "items-end")}>
                        {!isOwn && msg.sender_name && showAvatar && (
                          <span className="text-[10px] text-muted-foreground mb-1 px-1">
                            {msg.sender_name}
                          </span>
                        )}
                        <div
                          className={cn(
                            "px-3 py-2 rounded-2xl text-sm",
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
              <div className="p-3 border-t bg-card flex-shrink-0">
                <div className="flex gap-2 max-w-3xl mx-auto">
                  <Input
                    placeholder="اكتب رسالتك..."
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                    disabled={sending}
                    className="flex-1"
                  />
                  <Button 
                    onClick={handleSendMessage} 
                    disabled={sending || !messageText.trim()}
                    className="gap-2"
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
              <div className="p-4 border-t text-center text-sm text-muted-foreground bg-muted/30 flex-shrink-0">
                هذه المحادثة مغلقة
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-muted/10">
            <div className="text-center">
              <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="h-10 w-10 text-muted-foreground/30" />
              </div>
              <h3 className="font-medium text-muted-foreground">اختر محادثة للبدء</h3>
            </div>
          </div>
        )}
      </div>

      {/* Column 3: Customer Info Panel */}
      {showCustomerPanel && currentConversation && currentConversation.source !== 'internal' && (
        <div className="w-72 border-r bg-card hidden xl:flex flex-col">
          <div className="p-4 border-b flex-shrink-0">
            <h3 className="font-semibold text-sm">معلومات العميل</h3>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-4">
              {/* Organization info */}
              {currentConversation.organization && (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      {currentConversation.organization.logo_url && (
                        <AvatarImage src={currentConversation.organization.logo_url} />
                      )}
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {currentConversation.organization.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm">{currentConversation.organization.name}</p>
                      <p className="text-xs text-muted-foreground">عميل</p>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="truncate">{currentConversation.organization.contact_email}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Guest info */}
              {!currentConversation.organization && currentConversation.metadata && (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {(currentConversation.metadata.sender_name as string)?.charAt(0) || 'G'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm">{(currentConversation.metadata.sender_name as string) || 'زائر'}</p>
                      <p className="text-xs text-muted-foreground">زائر</p>
                    </div>
                  </div>
                  
                  {currentConversation.metadata.sender_email && (
                    <>
                      <Separator />
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="truncate">{currentConversation.metadata.sender_email as string}</span>
                      </div>
                    </>
                  )}
                </div>
              )}

              <Separator />

              {/* Conversation info */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">معلومات المحادثة</p>
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">بدأت</span>
                    <span>{format(new Date(currentConversation.created_at), 'Pp', { locale: ar })}</span>
                  </div>
                  {currentConversation.source_domain && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">المصدر</span>
                      <span className="truncate max-w-[120px]">{currentConversation.source_domain}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </ScrollArea>
        </div>
      )}

      {/* New Internal Chat Dialog */}
      <Dialog open={showNewInternalChat} onOpenChange={setShowNewInternalChat}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              محادثة داخلية جديدة
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">اختر الموظف</label>
              <Select value={selectedStaff} onValueChange={setSelectedStaff}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر موظف..." />
                </SelectTrigger>
                <SelectContent>
                  {staffMembers
                    .filter(s => s.id !== staffId)
                    .map(staff => (
                      <SelectItem key={staff.id} value={staff.id}>
                        <div className="flex items-center gap-2">
                          <Circle className={cn("h-2 w-2", statusColors[staff.agent_status])} />
                          {staff.full_name}
                        </div>
                      </SelectItem>
                    ))
                  }
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">الرسالة</label>
              <Textarea
                placeholder="اكتب رسالتك..."
                value={internalMessage}
                onChange={(e) => setInternalMessage(e.target.value)}
                rows={4}
              />
            </div>
            <Button 
              onClick={handleStartInternalChat} 
              disabled={!selectedStaff || !internalMessage.trim()}
              className="w-full gap-2"
            >
              <Send className="h-4 w-4" />
              إرسال
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
