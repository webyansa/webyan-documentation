import React, { useState, useRef, useEffect } from 'react';
import { useChat, Conversation } from '@/hooks/useChat';
import { useAgentStatus } from '@/hooks/useAgentStatus';
import { useTypingIndicator } from '@/hooks/useTypingIndicator';
import { useNotificationSound } from '@/hooks/useNotificationSound';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { 
  MessageCircle, Send, User, Building2, CheckCheck, Check,
  UserPlus, X, RotateCcw, Ticket, Circle, Search, Users, Inbox,
  Phone, Mail, ExternalLink, Loader2, Plus, ChevronLeft, Tag,
  MoreHorizontal, ArrowUpRight, StickyNote, AlertTriangle, Clock,
  Paperclip, Smile, Volume2, VolumeX, Image as ImageIcon, Trash2, Archive, RefreshCw, Info, Star
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { TypingIndicator } from '../messenger/TypingIndicator';
import ImagePreviewModal from '../ImagePreviewModal';
import ClientDetailPanel from './ClientDetailPanel';

// Helper function to extract image URL from message body
const extractImageUrl = (body: string): string | null => {
  const urlMatch = body.match(/https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|webp)/i);
  return urlMatch ? urlMatch[0] : null;
};

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

type ConversationTab = 'customers' | 'internal' | 'archived';
type ConversationFilter = 'all' | 'unassigned' | 'assigned' | 'mine' | 'closed';
type ViewMode = 'grouped' | 'list'; // New: grouped by client or flat list

// Interface for grouped client data
interface GroupedClient {
  id: string; // organization_id or embed_token_id or sender_email hash
  name: string;
  email?: string;
  logoUrl?: string;
  conversations: Conversation[];
  totalConversations: number;
  activeConversations: number;
  unreadCount: number;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
}

interface StaffMember {
  id: string;
  full_name: string;
  email: string;
  agent_status: 'available' | 'busy' | 'offline';
}

interface QuickReply {
  id: string;
  title: string;
  body: string;
  shortcut: string | null;
}

interface ProfessionalAgentInboxProps {
  isAdmin?: boolean;
}

export default function ProfessionalAgentInbox({ isAdmin = false }: ProfessionalAgentInboxProps) {
  const { toast } = useToast();
  const {
    conversations,
    currentConversation,
    messages,
    loading,
    sending,
    fetchConversations,
    sendMessage,
    startConversation,
    assignConversation,
    closeConversation,
    reopenConversation,
    convertToTicket,
    selectConversation,
    setCurrentConversation,
    archiveConversation,
    restoreConversation,
    deleteConversation,
    toggleStarConversation
  } = useChat({ autoFetch: true });

  const { currentStatus, staffId, updateStatus, availableAgents } = useAgentStatus();
  const { playNotificationSound } = useNotificationSound();
  
  const [messageText, setMessageText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<ConversationTab>('customers');
  const [filter, setFilter] = useState<ConversationFilter>('all');
  const [showConvertDialog, setShowConvertDialog] = useState(false);
  const [showNewInternalChat, setShowNewInternalChat] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [showNoteDialog, setShowNoteDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketCategory, setTicketCategory] = useState('technical');
  const [ticketPriority, setTicketPriority] = useState('medium');
  const [internalNote, setInternalNote] = useState('');
  const [showCustomerPanel, setShowCustomerPanel] = useState(true);
  const [showClientDetailPanel, setShowClientDetailPanel] = useState(false);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<string>('');
  const [internalMessage, setInternalMessage] = useState('');
  const [staffName, setStaffName] = useState('');
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [lastMessageCount, setLastMessageCount] = useState(0);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('grouped');
  const [selectedClient, setSelectedClient] = useState<GroupedClient | null>(null);
  const [archivedConversations, setArchivedConversations] = useState<Conversation[]>([]);
  const [loadingArchived, setLoadingArchived] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Typing indicator hook
  const { typingUsers, handleTyping, stopTyping } = useTypingIndicator({
    conversationId: currentConversation?.id || null,
    userId: staffId || 'agent',
    userName: staffName || 'الموظف',
    userType: 'agent'
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUsers]);

  // Play notification sound for new client messages
  useEffect(() => {
    if (messages.length > lastMessageCount && lastMessageCount > 0) {
      const newMessages = messages.slice(lastMessageCount);
      const hasNewClientMessage = newMessages.some(msg => msg.sender_type !== 'agent' && msg.sender_type !== 'system');
      
      if (hasNewClientMessage && soundEnabled) {
        playNotificationSound();
      }
    }
    setLastMessageCount(messages.length);
  }, [messages.length, soundEnabled, playNotificationSound, lastMessageCount]);

  useEffect(() => {
    fetchStaffMembers();
    fetchStaffName();
    fetchQuickReplies();
  }, []);

  // Fetch archived conversations when tab changes
  useEffect(() => {
    if (activeTab === 'archived') {
      fetchArchivedConversations();
    }
  }, [activeTab]);

  const fetchArchivedConversations = async () => {
    setLoadingArchived(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const response = await supabase.functions.invoke('chat-api', {
        body: { action: 'get_archived' },
        headers: { Authorization: `Bearer ${session.access_token}` }
      });

      if (response.data?.conversations) {
        setArchivedConversations(response.data.conversations);
      }
    } catch (error) {
      console.error('Error fetching archived:', error);
    } finally {
      setLoadingArchived(false);
    }
  };

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

  const fetchQuickReplies = async () => {
    const { data } = await supabase
      .from('quick_replies')
      .select('*')
      .or(`is_global.eq.true,staff_id.eq.${staffId}`)
      .order('title');
    
    if (data) {
      setQuickReplies(data as QuickReply[]);
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
        conv.last_message_preview?.toLowerCase().includes(query) ||
        (conv.metadata as any)?.sender_name?.toLowerCase().includes(query) ||
        (conv.metadata as any)?.sender_email?.toLowerCase().includes(query)
      );
    }
    return true;
  });

  // Group conversations by client/organization
  const groupedClients = React.useMemo(() => {
    const clientMap = new Map<string, GroupedClient>();
    
    // Only group customer conversations (not internal)
    const customerConversations = filteredConversations.filter(c => c.source !== 'internal');
    
    customerConversations.forEach(conv => {
      // Generate a unique client ID based on organization or metadata
      const clientId = conv.organization_id || 
                       conv.embed_token_id || 
                       (conv.metadata as any)?.sender_email || 
                       `unknown-${conv.id}`;
      
      const clientName = conv.organization?.name || 
                        (conv.metadata as any)?.sender_name || 
                        (conv.metadata as any)?.organization_name ||
                        'زائر';
      
      const clientEmail = conv.organization?.contact_email || 
                         (conv.metadata as any)?.sender_email;
      
      const logoUrl = conv.organization?.logo_url;

      if (clientMap.has(clientId)) {
        const existing = clientMap.get(clientId)!;
        existing.conversations.push(conv);
        existing.totalConversations++;
        if (conv.status !== 'closed') existing.activeConversations++;
        existing.unreadCount += conv.unread_count || 0;
        
        // Update last message if this one is newer
        if (conv.last_message_at && (!existing.lastMessageAt || conv.last_message_at > existing.lastMessageAt)) {
          existing.lastMessageAt = conv.last_message_at;
          existing.lastMessagePreview = conv.last_message_preview;
        }
      } else {
        clientMap.set(clientId, {
          id: clientId,
          name: clientName,
          email: clientEmail,
          logoUrl: logoUrl || undefined,
          conversations: [conv],
          totalConversations: 1,
          activeConversations: conv.status !== 'closed' ? 1 : 0,
          unreadCount: conv.unread_count || 0,
          lastMessageAt: conv.last_message_at,
          lastMessagePreview: conv.last_message_preview
        });
      }
    });

    // Sort by last message time (newest first)
    return Array.from(clientMap.values()).sort((a, b) => {
      if (!a.lastMessageAt && !b.lastMessageAt) return 0;
      if (!a.lastMessageAt) return 1;
      if (!b.lastMessageAt) return -1;
      return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
    });
  }, [filteredConversations]);

  // Get conversations for selected client
  const clientConversations = selectedClient?.conversations || [];

  // Count badges
  const unassignedCount = conversations.filter(c => c.status === 'unassigned' && c.source !== 'internal').length;
  const customersUnread = conversations.filter(c => c.source !== 'internal' && c.unread_count > 0).length;
  const internalUnread = conversations.filter(c => c.source === 'internal' && c.unread_count > 0).length;
  const mineCount = conversations.filter(c => c.assigned_agent_id === staffId && c.status !== 'closed').length;
  const clientsCount = groupedClients.length;

  const handleSendMessage = async () => {
    if (!messageText.trim() || !currentConversation) return;
    const text = messageText;
    setMessageText('');
    stopTyping();
    await sendMessage(currentConversation.id, text, undefined, staffName);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleQuickReply = (reply: QuickReply) => {
    setMessageText(reply.body);
    setShowQuickReplies(false);
    inputRef.current?.focus();
  };

  const handleStartInternalChat = async () => {
    if (!selectedStaff || !internalMessage.trim()) return;
    
    const selectedStaffMember = staffMembers.find(s => s.id === selectedStaff);
    if (!selectedStaffMember) return;

    try {
      const { data: convData, error: convError } = await supabase
        .from('conversations')
        .insert({
          subject: `محادثة مع ${selectedStaffMember.full_name}`,
          source: 'internal',
          status: 'assigned',
          assigned_agent_id: selectedStaff,
          metadata: { sender_name: staffName, sender_id: staffId }
        })
        .select()
        .single();

      if (convError) throw convError;

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
      
      toast({
        title: 'تم',
        description: 'تم إنشاء المحادثة الداخلية بنجاح'
      });
      
      await fetchConversations();
    } catch (error) {
      console.error('Error starting internal chat:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في إنشاء المحادثة',
        variant: 'destructive'
      });
    }
  };

  const handleAssignToStaff = async () => {
    if (!currentConversation || !selectedStaff) return;
    await assignConversation(currentConversation.id, selectedStaff);
    setShowAssignDialog(false);
    setSelectedStaff('');
  };

  const handleClaimConversation = async () => {
    if (!currentConversation || !staffId) return;
    await assignConversation(currentConversation.id, staffId);
  };

  const handleEscalate = async () => {
    if (!currentConversation) return;
    // Send escalation system message
    await sendMessage(
      currentConversation.id, 
      '⚠️ تم تصعيد هذه المحادثة للإدارة', 
      undefined, 
      'النظام'
    );
    
    toast({
      title: 'تم التصعيد',
      description: 'تم تصعيد المحادثة للإدارة'
    });
  };

  const handleAddInternalNote = async () => {
    if (!currentConversation || !internalNote.trim()) return;
    
    await supabase.from('conversation_events').insert({
      conversation_id: currentConversation.id,
      event_type: 'internal_note',
      performed_by: staffId,
      performer_name: staffName,
      data: { note: internalNote }
    });

    setShowNoteDialog(false);
    setInternalNote('');
    
    toast({
      title: 'تم',
      description: 'تمت إضافة الملاحظة الداخلية'
    });
  };

  const handleConvertToTicket = async () => {
    if (!currentConversation || !ticketSubject) return;
    await convertToTicket(currentConversation.id, {
      subject: ticketSubject,
      category: ticketCategory,
      priority: ticketPriority
    });
    setShowConvertDialog(false);
    setTicketSubject('');
  };

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;

  return (
    <>
      {/* Image Preview Modal */}
      {selectedImage && (
        <ImagePreviewModal
          imageUrl={selectedImage}
          onClose={() => setSelectedImage(null)}
        />
      )}
      
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
              <h2 className="font-bold text-sm">صندوق الوارد</h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                title={soundEnabled ? 'كتم الصوت' : 'تفعيل الصوت'}
              >
                {soundEnabled ? (
                  <Volume2 className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <VolumeX className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
              <Select value={currentStatus} onValueChange={(v) => updateStatus(v as 'available' | 'busy' | 'offline')}>
                <SelectTrigger className="w-auto h-8 gap-1.5 text-xs border-0 bg-muted/50 px-2">
                  <Circle className={cn("h-2 w-2 fill-current", statusColors[currentStatus])} />
                  <span>{statusLabels[currentStatus]}</span>
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(statusLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      <div className="flex items-center gap-2">
                        <Circle className={cn("h-2 w-2 fill-current", statusColors[value as keyof typeof statusColors])} />
                        {label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ConversationTab)}>
            <TabsList className="w-full grid grid-cols-3 h-9">
              <TabsTrigger value="customers" className="text-xs gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Users className="h-3.5 w-3.5" />
                العملاء
                {customersUnread > 0 && (
                  <Badge variant="destructive" className="h-4 min-w-4 text-[10px] p-0 px-1">
                    {customersUnread}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="internal" className="text-xs gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <MessageCircle className="h-3.5 w-3.5" />
                داخلية
                {internalUnread > 0 && (
                  <Badge variant="destructive" className="h-4 min-w-4 text-[10px] p-0 px-1">
                    {internalUnread}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="archived" className="text-xs gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Trash2 className="h-3.5 w-3.5" />
                المهملات
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* New internal chat button */}
          {activeTab === 'internal' && (
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full gap-2 text-xs"
              onClick={() => setShowNewInternalChat(true)}
            >
              <Plus className="h-3.5 w-3.5" />
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
                { key: 'mine', label: 'محادثاتي', count: mineCount },
                { key: 'closed', label: 'مغلقة' }
              ].map(({ key, label, count }) => (
                <Button
                  key={key}
                  variant={filter === key ? 'default' : 'ghost'}
                  size="sm"
                  className="h-7 text-[11px] whitespace-nowrap flex-shrink-0 rounded-full px-3"
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

          {/* View Mode Toggle */}
          {activeTab === 'customers' && (
            <div className="flex gap-1 border rounded-lg p-0.5">
              <Button
                variant={viewMode === 'grouped' ? 'default' : 'ghost'}
                size="sm"
                className="h-6 text-[10px] px-2"
                onClick={() => { setViewMode('grouped'); setSelectedClient(null); }}
              >
                <Users className="h-3 w-3 ml-1" />
                عملاء ({clientsCount})
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                className="h-6 text-[10px] px-2"
                onClick={() => setViewMode('list')}
              >
                <MessageCircle className="h-3 w-3 ml-1" />
                محادثات
              </Button>
            </div>
          )}
        </div>

        {/* Conversations/Clients list */}
        <ScrollArea className="flex-1">
          {loading && conversations.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : activeTab === 'archived' ? (
            /* Archived Conversations */
            loadingArchived ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : archivedConversations.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <Trash2 className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p className="text-sm">سلة المهملات فارغة</p>
              </div>
            ) : (
              <div className="divide-y">
                {archivedConversations.map((conv) => (
                  <div
                    key={conv.id}
                    className="px-3 py-3 hover:bg-muted/50"
                  >
                    <div className="flex items-start gap-3">
                      <Avatar className="h-10 w-10">
                        {conv.organization?.logo_url && <AvatarImage src={conv.organization.logo_url} />}
                        <AvatarFallback className="bg-muted text-muted-foreground text-sm">
                          {conv.organization?.name?.charAt(0) || (conv.metadata as any)?.sender_name?.charAt(0) || <Building2 className="h-4 w-4" />}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm truncate">
                            {conv.organization?.name || (conv.metadata as any)?.sender_name || 'زائر'}
                          </p>
                          {(conv as any).is_starred && (
                            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {(conv.metadata as any)?.sender_email || conv.organization?.contact_email || 'بدون بريد'}
                        </p>
                        <p className="text-xs text-muted-foreground/70 truncate mt-0.5">{conv.last_message_preview}</p>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          حُذفت: {conv.archived_at && formatDistanceToNow(new Date(conv.archived_at), { addSuffix: true, locale: ar })}
                        </p>
                      </div>
                      <div className="flex flex-col gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-green-600 hover:text-green-700"
                          onClick={async () => { 
                            await restoreConversation(conv.id); 
                            fetchArchivedConversations(); 
                          }}
                          title="استعادة"
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                        </Button>
                        {isAdmin && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => setDeleteConfirmId(conv.id)}
                            title="حذف نهائي"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : activeTab === 'customers' && viewMode === 'grouped' && !selectedClient ? (
            /* Grouped Client View */
            groupedClients.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p className="text-sm">لا يوجد عملاء</p>
              </div>
            ) : (
              <div className="divide-y">
                {groupedClients.map((client) => (
                  <div
                    key={client.id}
                    onClick={() => {
                      // If client has only one conversation, select it directly
                      if (client.conversations.length === 1) {
                        selectConversation(client.conversations[0]);
                      } else {
                        setSelectedClient(client);
                      }
                    }}
                    className="px-3 py-3 cursor-pointer transition-all hover:bg-muted/50"
                  >
                    <div className="flex items-start gap-3">
                      <div className="relative flex-shrink-0">
                        <Avatar className="h-11 w-11">
                          {client.logoUrl && <AvatarImage src={client.logoUrl} />}
                          <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                            {client.name?.charAt(0) || <Building2 className="h-4 w-4" />}
                          </AvatarFallback>
                        </Avatar>
                        {client.activeConversations > 0 && (
                          <span className="absolute -bottom-0.5 -left-0.5 h-3 w-3 rounded-full border-2 border-card bg-green-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <span className="font-medium text-sm truncate">{client.name}</span>
                          <span className="text-[10px] text-muted-foreground flex-shrink-0">
                            {client.lastMessageAt && formatDistanceToNow(new Date(client.lastMessageAt), { 
                              addSuffix: false, 
                              locale: ar 
                            })}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {client.lastMessagePreview || client.email || 'لا توجد رسائل'}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <Badge variant="outline" className="h-5 text-[10px] px-1.5 bg-muted/50">
                            <MessageCircle className="h-2.5 w-2.5 ml-0.5" />
                            {client.totalConversations} محادثة
                          </Badge>
                          {client.activeConversations > 0 && (
                            <Badge variant="outline" className="h-5 text-[10px] px-1.5 bg-green-50 text-green-600 border-green-200">
                              {client.activeConversations} نشطة
                            </Badge>
                          )}
                        </div>
                      </div>
                      {client.unreadCount > 0 && (
                        <Badge variant="destructive" className="h-5 min-w-5 text-xs p-0 px-1.5">
                          {client.unreadCount}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : activeTab === 'customers' && viewMode === 'grouped' && selectedClient ? (
            /* Client's Conversations View */
            <div>
              {/* Back to clients header */}
              <div className="sticky top-0 z-10 bg-card border-b px-3 py-2.5">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setSelectedClient(null)}
                  >
                    <ChevronLeft className="h-4 w-4 rotate-180" />
                  </Button>
                  <Avatar className="h-8 w-8">
                    {selectedClient.logoUrl && <AvatarImage src={selectedClient.logoUrl} />}
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                      {selectedClient.name?.charAt(0) || <Building2 className="h-3 w-3" />}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{selectedClient.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {selectedClient.totalConversations} محادثة
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="divide-y">
                {clientConversations.map((conv) => (
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
                        <div className={cn(
                          "h-9 w-9 rounded-full flex items-center justify-center",
                          conversationStatusConfig[conv.status].bgLight
                        )}>
                          <MessageCircle className={cn("h-4 w-4", conversationStatusConfig[conv.status].textColor)} />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-0.5">
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
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <Badge 
                            variant="outline" 
                            className={cn(
                              "h-5 text-[10px] px-1.5",
                              conversationStatusConfig[conv.status].bgLight,
                              conversationStatusConfig[conv.status].textColor
                            )}
                          >
                            {conversationStatusConfig[conv.status].label}
                          </Badge>
                          {conv.assigned_agent && (
                            <span className="text-[10px] text-muted-foreground truncate">
                              {conv.assigned_agent.full_name}
                            </span>
                          )}
                        </div>
                      </div>
                      {conv.unread_count > 0 && (
                        <Badge variant="destructive" className="h-5 min-w-5 text-xs p-0 px-1.5">
                          {conv.unread_count}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p className="text-sm">لا توجد محادثات</p>
            </div>
          ) : (
            /* Standard list view */
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
                            ? (conv.metadata as any)?.sender_name?.charAt(0) || 'M'
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
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium text-sm truncate">
                            {conv.source === 'internal'
                              ? (conv.metadata as any)?.sender_name || 'موظف'
                              : conv.organization?.name || (conv.metadata as any)?.sender_name || 'زائر'
                            }
                          </span>
                          {(conv as any).is_starred && (
                            <Star className="h-3 w-3 fill-amber-400 text-amber-400 flex-shrink-0" />
                          )}
                        </div>
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
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <Badge 
                          variant="outline" 
                          className={cn(
                            "h-5 text-[10px] px-1.5",
                            conversationStatusConfig[conv.status].bgLight,
                            conversationStatusConfig[conv.status].textColor
                          )}
                        >
                          {conversationStatusConfig[conv.status].label}
                        </Badge>
                        {conv.assigned_agent && conv.source !== 'internal' && (
                          <span className="text-[10px] text-muted-foreground truncate">
                            {conv.assigned_agent.full_name}
                          </span>
                        )}
                      </div>
                    </div>
                    {conv.unread_count > 0 && (
                      <Badge variant="destructive" className="h-5 min-w-5 text-xs p-0 px-1.5">
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
            <div className="h-14 px-4 border-b flex items-center justify-between bg-card flex-shrink-0">
              <div className="flex items-center gap-3">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="lg:hidden h-8 w-8"
                  onClick={() => setCurrentConversation(null)}
                >
                  <ChevronLeft className="h-5 w-5 rotate-180" />
                </Button>
                <Avatar className="h-9 w-9">
                  {currentConversation.organization?.logo_url && (
                    <AvatarImage src={currentConversation.organization.logo_url} />
                  )}
                  <AvatarFallback className="bg-primary/10 text-primary text-xs">
                    {currentConversation.source === 'internal'
                      ? (currentConversation.metadata as any)?.sender_name?.charAt(0) || 'M'
                      : currentConversation.organization?.name?.charAt(0) || <Building2 className="h-4 w-4" />
                    }
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold text-sm">
                    {currentConversation.source === 'internal'
                      ? (currentConversation.metadata as any)?.sender_name || 'محادثة داخلية'
                      : currentConversation.organization?.name || (currentConversation.metadata as any)?.sender_name || 'محادثة'
                    }
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    {currentConversation.subject}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-1">
                {/* Star button - always visible */}
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8"
                  onClick={() => toggleStarConversation(currentConversation.id, (currentConversation as any).is_starred || false)}
                  title={(currentConversation as any).is_starred ? 'إزالة التمييز' : 'تمييز كمهم'}
                >
                  <Star className={cn(
                    "h-4 w-4",
                    (currentConversation as any).is_starred ? "fill-amber-400 text-amber-400" : "text-muted-foreground"
                  )} />
                </Button>

                {currentConversation.status === 'unassigned' && (
                  <Button size="sm" onClick={handleClaimConversation} className="h-8 text-xs gap-1.5">
                    <UserPlus className="h-3.5 w-3.5" />
                    استلام
                  </Button>
                )}
                
                {currentConversation.status !== 'closed' && (
                  <>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={() => setShowAssignDialog(true)}
                      title="تحويل لموظف"
                    >
                      <Users className="h-4 w-4" />
                    </Button>
                    
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={() => setShowConvertDialog(true)}
                      title="تحويل لتذكرة"
                    >
                      <Ticket className="h-4 w-4" />
                    </Button>
                    
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={() => setShowNoteDialog(true)}
                      title="ملاحظة داخلية"
                    >
                      <StickyNote className="h-4 w-4" />
                    </Button>

                    {isAdmin && (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-orange-500 hover:text-orange-600"
                        onClick={handleEscalate}
                        title="تصعيد للإدارة"
                      >
                        <AlertTriangle className="h-4 w-4" />
                      </Button>
                    )}
                    
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-amber-500 hover:text-amber-600"
                      onClick={async () => {
                        await archiveConversation(currentConversation.id);
                        setCurrentConversation(null);
                      }}
                      title="نقل إلى المهملات"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-red-500 hover:text-red-600"
                      onClick={() => closeConversation(currentConversation.id)}
                      title="إغلاق"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </>
                )}
                
                {currentConversation.status === 'closed' && (
                  <>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="h-8 text-xs gap-1.5"
                      onClick={() => reopenConversation(currentConversation.id)}
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      إعادة فتح
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-amber-500 hover:text-amber-600"
                      onClick={async () => {
                        await archiveConversation(currentConversation.id);
                        setCurrentConversation(null);
                      }}
                      title="نقل إلى المهملات"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                )}

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 hidden lg:flex"
                  onClick={() => setShowCustomerPanel(!showCustomerPanel)}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 bg-muted/10">
              <div className="p-4 space-y-3 max-w-3xl mx-auto">
                {messages.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-20" />
                    <p className="text-sm">لا توجد رسائل بعد</p>
                  </div>
                ) : (
                  messages.map((msg, idx) => {
                    const isOwn = msg.sender_type === 'agent';
                    const isSystem = msg.sender_type === 'system';
                    const showAvatar = !isOwn && (idx === 0 || messages[idx - 1]?.sender_type !== msg.sender_type);
                    
                    // Extract image URL from message body
                    const imageUrl = extractImageUrl(msg.body);
                    const hasImage = !!imageUrl;
                    const textContent = hasImage ? msg.body.replace(imageUrl, '').replace('📷 صورة مرفقة', '').trim() : msg.body;

                    if (isSystem) {
                      return (
                        <div key={msg.id} className="flex justify-center my-2">
                          <span className="text-[11px] text-muted-foreground bg-muted/60 px-3 py-1 rounded-full">
                            {msg.body}
                          </span>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={msg.id}
                        className={cn("flex gap-2", isOwn ? "flex-row" : "flex-row-reverse")}
                      >
                        {!isOwn && showAvatar && (
                          <Avatar className="h-8 w-8 flex-shrink-0 mt-auto">
                            <AvatarFallback className="bg-primary/10 text-primary text-xs">
                              {msg.sender_name?.charAt(0) || 'C'}
                            </AvatarFallback>
                          </Avatar>
                        )}
                        {!isOwn && !showAvatar && <div className="w-8" />}

                        <div className={cn("max-w-[70%] flex flex-col", isOwn ? "items-start" : "items-end")}>
                          {!isOwn && showAvatar && (
                            <span className="text-[10px] text-muted-foreground mb-0.5 px-1">
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
                            {/* Display image if present */}
                            {hasImage && (
                              <div 
                                className="mb-2 cursor-pointer rounded-lg overflow-hidden"
                                onClick={() => setSelectedImage(imageUrl)}
                              >
                                <img 
                                  src={imageUrl} 
                                  alt="صورة مرفقة" 
                                  className="max-w-full h-auto max-h-48 object-cover rounded-lg hover:opacity-90 transition-opacity"
                                />
                              </div>
                            )}
                            
                            {/* Display text content */}
                            {textContent && (
                              <p className="whitespace-pre-wrap">{textContent}</p>
                            )}
                            
                            {msg.attachments && msg.attachments.length > 0 && (
                              <div className="mt-2 space-y-1">
                                {msg.attachments.map((url, i) => {
                                  const isImageAttachment = /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
                                  if (isImageAttachment) {
                                    return (
                                      <div 
                                        key={i}
                                        className="cursor-pointer rounded-lg overflow-hidden"
                                        onClick={() => setSelectedImage(url)}
                                      >
                                        <img 
                                          src={url} 
                                          alt={`مرفق ${i + 1}`}
                                          className="max-w-full h-auto max-h-48 object-cover rounded-lg hover:opacity-90 transition-opacity"
                                        />
                                      </div>
                                    );
                                  }
                                  return (
                                    <a 
                                      key={i} 
                                      href={url} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="text-xs underline opacity-80 hover:opacity-100 flex items-center gap-1"
                                    >
                                      <Paperclip className="h-3 w-3" />
                                      مرفق {i + 1}
                                    </a>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                          <div className={cn(
                            "flex items-center gap-1 mt-0.5 text-[10px] text-muted-foreground px-1",
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
                  })
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Input */}
            {currentConversation.status !== 'closed' ? (
              <div className="p-3 border-t bg-card flex-shrink-0">
                {/* Quick Replies */}
                {showQuickReplies && quickReplies.length > 0 && (
                  <div className="mb-2 p-2 bg-muted/50 rounded-lg max-h-40 overflow-y-auto">
                    {quickReplies.map((reply) => (
                      <button
                        key={reply.id}
                        onClick={() => handleQuickReply(reply)}
                        className="w-full text-right p-2 hover:bg-muted rounded text-sm"
                      >
                        <span className="font-medium">{reply.title}</span>
                        {reply.shortcut && (
                          <span className="text-xs text-muted-foreground mr-2">/{reply.shortcut}</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
                
                <div className="flex items-end gap-2 max-w-3xl mx-auto">
                  <div className="flex-1 relative">
                    <Textarea
                      ref={inputRef}
                      placeholder="اكتب رسالتك..."
                      value={messageText}
                      onChange={(e) => {
                        setMessageText(e.target.value);
                        // Check for quick reply shortcut
                        if (e.target.value.startsWith('/')) {
                          setShowQuickReplies(true);
                        } else {
                          setShowQuickReplies(false);
                        }
                      }}
                      onKeyDown={handleKeyPress}
                      disabled={sending}
                      rows={1}
                      className="min-h-[40px] max-h-32 resize-none pr-3"
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9"
                      onClick={() => setShowQuickReplies(!showQuickReplies)}
                      title="ردود سريعة"
                    >
                      <Tag className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      className="h-9 w-9"
                      onClick={handleSendMessage}
                      disabled={!messageText.trim() || sending}
                    >
                      {sending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-3 border-t bg-muted/30 text-center text-sm text-muted-foreground">
                هذه المحادثة مغلقة
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
            <div className="w-20 h-20 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
              <MessageCircle className="h-10 w-10 opacity-30" />
            </div>
            <p className="text-sm">اختر محادثة للبدء</p>
          </div>
        )}
      </div>

      {/* Column 3: Customer Info Panel */}
      {currentConversation && showCustomerPanel && currentConversation.source !== 'internal' && (
        <div className="w-72 border-r flex-col bg-card hidden lg:flex">
          <div className="p-4 border-b">
            <h3 className="font-semibold text-sm mb-3">معلومات العميل</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  {currentConversation.organization?.logo_url && (
                    <AvatarImage src={currentConversation.organization.logo_url} />
                  )}
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {currentConversation.organization?.name?.charAt(0) || 'C'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-sm">
                    {currentConversation.organization?.name || (currentConversation.metadata as any)?.sender_name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {(currentConversation.metadata as any)?.sender_email || currentConversation.organization?.contact_email}
                  </p>
                </div>
              </div>

              <Separator />

              <div className="space-y-2 text-sm">
                {currentConversation.organization?.contact_email && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    <span className="truncate">{currentConversation.organization.contact_email}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>
                    منذ {formatDistanceToNow(new Date(currentConversation.created_at), { locale: ar })}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Tag className="h-4 w-4" />
                  <span>المصدر: {currentConversation.source === 'embed' ? 'ودجت خارجي' : 'البوابة'}</span>
                </div>
                {currentConversation.source_domain && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <ExternalLink className="h-4 w-4" />
                    <span className="truncate text-xs">{currentConversation.source_domain}</span>
                  </div>
                )}
              </div>

              <Separator />

              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">الموظف المسند</p>
                {currentConversation.assigned_agent ? (
                  <div className="flex items-center gap-2">
                    <Avatar className="h-7 w-7">
                      <AvatarFallback className="text-xs bg-green-100 text-green-700">
                        {currentConversation.assigned_agent.full_name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{currentConversation.assigned_agent.full_name}</span>
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">غير مسندة</span>
                )}
              </div>
            </div>
          </div>

          <div className="p-4 space-y-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full justify-start gap-2 text-xs"
              onClick={() => setShowConvertDialog(true)}
            >
              <Ticket className="h-4 w-4" />
              تحويل لتذكرة
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full justify-start gap-2 text-xs"
              onClick={() => setShowAssignDialog(true)}
            >
              <Users className="h-4 w-4" />
              تحويل لموظف
            </Button>
          </div>
        </div>
      )}

      {/* Dialogs */}
      {/* New Internal Chat Dialog */}
      <Dialog open={showNewInternalChat} onOpenChange={setShowNewInternalChat}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>محادثة داخلية جديدة</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>اختر الموظف</Label>
              <Select value={selectedStaff} onValueChange={setSelectedStaff}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر موظف..." />
                </SelectTrigger>
                <SelectContent>
                  {staffMembers.filter(s => s.id !== staffId).map((staff) => (
                    <SelectItem key={staff.id} value={staff.id}>
                      <div className="flex items-center gap-2">
                        <Circle className={cn("h-2 w-2", statusColors[staff.agent_status])} />
                        {staff.full_name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>الرسالة</Label>
              <Textarea
                value={internalMessage}
                onChange={(e) => setInternalMessage(e.target.value)}
                placeholder="اكتب رسالتك..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewInternalChat(false)}>إلغاء</Button>
            <Button onClick={handleStartInternalChat} disabled={!selectedStaff || !internalMessage.trim()}>
              إرسال
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>تحويل المحادثة لموظف</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>اختر الموظف</Label>
              <Select value={selectedStaff} onValueChange={setSelectedStaff}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر موظف..." />
                </SelectTrigger>
                <SelectContent>
                  {staffMembers.map((staff) => (
                    <SelectItem key={staff.id} value={staff.id}>
                      <div className="flex items-center gap-2">
                        <Circle className={cn("h-2 w-2", statusColors[staff.agent_status])} />
                        {staff.full_name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignDialog(false)}>إلغاء</Button>
            <Button onClick={handleAssignToStaff} disabled={!selectedStaff}>تحويل</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Convert to Ticket Dialog */}
      <Dialog open={showConvertDialog} onOpenChange={setShowConvertDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>تحويل لتذكرة دعم</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>عنوان التذكرة</Label>
              <Input
                value={ticketSubject}
                onChange={(e) => setTicketSubject(e.target.value)}
                placeholder={currentConversation?.subject || 'عنوان التذكرة'}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>التصنيف</Label>
                <Select value={ticketCategory} onValueChange={setTicketCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="technical">تقني</SelectItem>
                    <SelectItem value="billing">فواتير</SelectItem>
                    <SelectItem value="feature">ميزة جديدة</SelectItem>
                    <SelectItem value="other">أخرى</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>الأولوية</Label>
                <Select value={ticketPriority} onValueChange={setTicketPriority}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">منخفضة</SelectItem>
                    <SelectItem value="medium">متوسطة</SelectItem>
                    <SelectItem value="high">عالية</SelectItem>
                    <SelectItem value="urgent">عاجلة</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConvertDialog(false)}>إلغاء</Button>
            <Button onClick={handleConvertToTicket} disabled={!ticketSubject.trim()}>تحويل</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Internal Note Dialog */}
      <Dialog open={showNoteDialog} onOpenChange={setShowNoteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>ملاحظة داخلية</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <Textarea
              value={internalNote}
              onChange={(e) => setInternalNote(e.target.value)}
              placeholder="اكتب ملاحظتك الداخلية (لا يراها العميل)..."
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNoteDialog(false)}>إلغاء</Button>
            <Button onClick={handleAddInternalNote} disabled={!internalNote.trim()}>إضافة</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              تأكيد الحذف النهائي
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">
              هل أنت متأكد من حذف هذه المحادثة نهائياً؟ لا يمكن استرجاع المحادثة بعد الحذف.
            </p>
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
              <p className="text-sm text-destructive font-medium">
                ⚠️ سيتم حذف جميع الرسائل والمرفقات المرتبطة بهذه المحادثة.
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>إلغاء</Button>
            <Button 
              variant="destructive" 
              onClick={async () => {
                if (deleteConfirmId) {
                  await deleteConversation(deleteConfirmId);
                  fetchArchivedConversations();
                  setDeleteConfirmId(null);
                }
              }}
            >
              حذف نهائياً
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </>
  );
}
