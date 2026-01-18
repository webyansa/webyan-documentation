import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Ticket, Clock, CheckCircle, AlertCircle, Search, Eye, 
  MessageSquare, User, UserPlus, Send, Building2, Globe, ExternalLink,
  MoreHorizontal, RefreshCw, Calendar, Inbox, Star, StarOff,
  ChevronDown, Filter, X, ArrowRight, Zap, Timer, Hash
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format, formatDistanceToNow, isToday, isYesterday } from "date-fns";
import { ar } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface SupportTicket {
  id: string;
  ticket_number: string;
  user_id: string | null;
  guest_name: string | null;
  guest_email: string | null;
  subject: string;
  description: string;
  website_url: string | null;
  screenshot_url: string | null;
  category: string;
  priority: string;
  status: string;
  assigned_to: string | null;
  assigned_to_staff: string | null;
  admin_note: string | null;
  closure_report: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  organization_id: string | null;
  source: string | null;
  source_domain: string | null;
  staff?: {
    full_name: string;
    email: string;
  } | null;
  organization?: {
    id: string;
    name: string;
    contact_email: string | null;
  } | null;
}

interface TicketReply {
  id: string;
  message: string;
  is_staff_reply: boolean;
  created_at: string;
}

interface StaffMember {
  id: string;
  full_name: string;
  job_title: string | null;
  can_reply_tickets: boolean;
  is_active: boolean;
}

interface Organization {
  id: string;
  name: string;
}

const statusConfig: Record<string, { label: string; color: string; bgColor: string; borderColor: string; icon: React.ElementType }> = {
  open: { label: 'جديدة', color: 'text-blue-600', bgColor: 'bg-blue-500', borderColor: 'border-blue-500', icon: Inbox },
  in_progress: { label: 'قيد العمل', color: 'text-amber-600', bgColor: 'bg-amber-500', borderColor: 'border-amber-500', icon: Clock },
  resolved: { label: 'محلولة', color: 'text-emerald-600', bgColor: 'bg-emerald-500', borderColor: 'border-emerald-500', icon: CheckCircle },
  closed: { label: 'مغلقة', color: 'text-slate-500', bgColor: 'bg-slate-400', borderColor: 'border-slate-400', icon: CheckCircle },
};

const priorityConfig: Record<string, { label: string; color: string; bgColor: string; icon: string }> = {
  high: { label: 'عاجلة', color: 'text-red-600', bgColor: 'bg-red-500', icon: '🔴' },
  medium: { label: 'متوسطة', color: 'text-amber-600', bgColor: 'bg-amber-500', icon: '🟡' },
  low: { label: 'عادية', color: 'text-emerald-600', bgColor: 'bg-emerald-500', icon: '🟢' },
};

const categoryLabels: Record<string, string> = {
  technical: 'تقنية',
  question: 'استفسار',
  suggestion: 'اقتراح',
  complaint: 'شكوى',
  general: 'عام',
};

function formatSmartDate(dateString: string): string {
  const date = new Date(dateString);
  if (isToday(date)) {
    return `اليوم ${format(date, 'HH:mm')}`;
  }
  if (isYesterday(date)) {
    return `أمس ${format(date, 'HH:mm')}`;
  }
  return format(date, 'dd MMM', { locale: ar });
}

export default function AdminTicketsPage() {
  const { user, isAdminOrEditor } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  
  // Selected ticket for detail view
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [replies, setReplies] = useState<TicketReply[]>([]);
  const [newReply, setNewReply] = useState('');
  const [sending, setSending] = useState(false);

  // Assign dialog
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [ticketToAssign, setTicketToAssign] = useState<SupportTicket | null>(null);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');
  const [adminNote, setAdminNote] = useState('');
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    if (!isAdminOrEditor) {
      navigate('/');
      return;
    }
    fetchTickets();
    fetchStaffMembers();
    fetchOrganizations();
    const cleanup = setupRealtimeSubscription();
    return cleanup;
  }, [isAdminOrEditor, navigate]);

  const fetchTickets = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      else setRefreshing(true);
      
      const { data: ticketsData, error } = await supabase
        .from('support_tickets')
        .select(`*, organization:client_organizations(id, name, contact_email)`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const ticketsWithStaff = await Promise.all(
        (ticketsData || []).map(async (ticket: any) => {
          if (ticket.assigned_to_staff) {
            const { data: staffData } = await supabase
              .from('staff_members')
              .select('full_name, email')
              .eq('id', ticket.assigned_to_staff)
              .single();
            return { ...ticket, staff: staffData };
          }
          return { ...ticket, staff: null };
        })
      );
      
      setTickets(ticketsWithStaff as unknown as SupportTicket[]);
      
      // Auto-select first ticket if none selected
      if (!selectedTicket && ticketsWithStaff.length > 0) {
        const firstTicket = ticketsWithStaff[0] as unknown as SupportTicket;
        setSelectedTicket(firstTicket);
        fetchReplies(firstTicket.id);
      }
    } catch (error) {
      console.error('Error fetching tickets:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchOrganizations = async () => {
    try {
      const { data, error } = await supabase
        .from('client_organizations')
        .select('id, name')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setOrganizations(data || []);
    } catch (error) {
      console.error('Error fetching organizations:', error);
    }
  };

  const fetchStaffMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('staff_members' as any)
        .select('id, full_name, job_title, can_reply_tickets, is_active')
        .eq('is_active', true)
        .eq('can_reply_tickets', true);

      if (error) throw error;
      setStaffMembers((data as unknown as StaffMember[]) || []);
    } catch (error) {
      console.error('Error fetching staff:', error);
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('admin-tickets')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_tickets' }, () => {
        fetchTickets(true);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  };

  const fetchReplies = async (ticketId: string) => {
    const { data, error } = await supabase
      .from('ticket_replies')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true });

    if (!error) setReplies(data || []);
  };

  const handleSelectTicket = async (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    await fetchReplies(ticket.id);
  };

  const getTicketEmail = async (ticket: SupportTicket): Promise<string | null> => {
    if (ticket.guest_email) return ticket.guest_email;
    if (ticket.user_id) {
      const { data: profile } = await supabase.from('profiles').select('email').eq('id', ticket.user_id).single();
      return profile?.email || null;
    }
    return null;
  };

  const handleStatusChange = async (ticketId: string, newStatus: string) => {
    try {
      const ticket = tickets.find(t => t.id === ticketId);
      if (!ticket) return;

      const updateData: any = { status: newStatus };
      if (newStatus === 'resolved') {
        updateData.resolved_at = new Date().toISOString();
        updateData.resolved_by = user?.id;
      }

      const { error } = await supabase.from('support_tickets').update(updateData).eq('id', ticketId);
      if (error) throw error;

      const statusLabels: Record<string, string> = { open: 'مفتوحة', in_progress: 'قيد المعالجة', resolved: 'تم الحل', closed: 'مغلقة' };

      if (ticket.user_id) {
        await supabase.from('user_notifications').insert({
          user_id: ticket.user_id,
          title: 'تحديث حالة التذكرة',
          message: `تم تغيير حالة تذكرتك "${ticket.subject}" إلى ${statusLabels[newStatus] || newStatus}`,
          type: 'ticket_update',
        });
      }

      const email = await getTicketEmail(ticket);
      if (email) {
        await supabase.functions.invoke('send-ticket-notification', {
          body: { email, ticketNumber: ticket.ticket_number, subject: ticket.subject, type: newStatus === 'resolved' ? 'resolved' : 'status_update', newStatus, siteUrl: window.location.origin },
        });
      }

      toast({ title: "تم التحديث", description: "تم تغيير حالة التذكرة" });
      
      // Update selected ticket
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket({ ...selectedTicket, status: newStatus });
      }
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    }
  };

  const handleSendReply = async () => {
    if (!newReply.trim() || !selectedTicket) return;
    setSending(true);
    try {
      const { error } = await supabase.from('ticket_replies').insert({
        ticket_id: selectedTicket.id,
        user_id: user?.id,
        message: newReply,
        is_staff_reply: true,
      });
      if (error) throw error;

      if (selectedTicket.status === 'open') {
        await supabase.from('support_tickets').update({ status: 'in_progress' }).eq('id', selectedTicket.id);
        setSelectedTicket({ ...selectedTicket, status: 'in_progress' });
      }

      if (selectedTicket.user_id) {
        await supabase.from('user_notifications').insert({
          user_id: selectedTicket.user_id,
          title: 'رد جديد على تذكرتك',
          message: `تم إضافة رد جديد على تذكرتك "${selectedTicket.subject}"`,
          type: 'ticket_reply',
        });
      }

      const email = await getTicketEmail(selectedTicket);
      if (email) {
        await supabase.functions.invoke('send-ticket-notification', {
          body: { email, ticketNumber: selectedTicket.ticket_number, subject: selectedTicket.subject, type: 'reply', message: newReply, siteUrl: window.location.origin },
        });
      }

      setNewReply('');
      await fetchReplies(selectedTicket.id);
      toast({ title: "تم الإرسال", description: "تم إرسال الرد بنجاح" });
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const handleOpenAssignDialog = (ticket: SupportTicket) => {
    setTicketToAssign(ticket);
    setSelectedStaffId(ticket.assigned_to_staff || '');
    setAdminNote(ticket.admin_note || '');
    setAssignDialogOpen(true);
  };

  const handleAssignTicket = async () => {
    if (!ticketToAssign || !selectedStaffId) {
      toast({ title: "خطأ", description: "يرجى اختيار موظف", variant: "destructive" });
      return;
    }
    setAssigning(true);
    try {
      const { error } = await supabase.from('support_tickets').update({
        assigned_to_staff: selectedStaffId,
        admin_note: adminNote || null,
        status: ticketToAssign.status === 'open' ? 'in_progress' : ticketToAssign.status
      } as any).eq('id', ticketToAssign.id);

      if (error) throw error;

      const staff = staffMembers.find(s => s.id === selectedStaffId);
      if (staff) {
        const { data: staffData } = await supabase.from('staff_members' as any).select('user_id, email').eq('id', selectedStaffId).single();
        const staffRecord = staffData as any;
        if (staffRecord?.user_id) {
          await supabase.from('user_notifications').insert({
            user_id: staffRecord.user_id,
            title: '🎫 تذكرة جديدة موجهة إليك',
            message: `تم توجيه التذكرة "${ticketToAssign.subject}" إليك${adminNote ? ` - ملاحظة: ${adminNote}` : ''}`,
            type: 'ticket_assigned',
          });
        }
        if (staffRecord?.email) {
          await supabase.functions.invoke('send-staff-notification', {
            body: { type: 'ticket_assigned', staff_email: staffRecord.email, staff_name: staff.full_name, data: { ticket_number: ticketToAssign.ticket_number, ticket_subject: ticketToAssign.subject, admin_note: adminNote } },
          });
        }
      }

      toast({ title: "تم التوجيه", description: "تم توجيه التذكرة للموظف" });
      setAssignDialogOpen(false);
      fetchTickets(true);
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } finally {
      setAssigning(false);
    }
  };

  const filteredTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      const matchesSearch = !searchQuery || 
        ticket.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ticket.ticket_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (ticket.guest_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (ticket.organization?.name || '').toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = activeFilter === 'all' || 
        (activeFilter === 'active' && (ticket.status === 'open' || ticket.status === 'in_progress')) ||
        (activeFilter === 'unassigned' && !ticket.assigned_to_staff && ticket.status !== 'resolved' && ticket.status !== 'closed') ||
        ticket.status === activeFilter;
      
      const matchesPriority = priorityFilter === 'all' || ticket.priority === priorityFilter;
      
      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [tickets, searchQuery, activeFilter, priorityFilter]);

  const stats = useMemo(() => ({
    total: tickets.length,
    open: tickets.filter(t => t.status === 'open').length,
    inProgress: tickets.filter(t => t.status === 'in_progress').length,
    resolved: tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length,
    unassigned: tickets.filter(t => !t.assigned_to_staff && t.status !== 'resolved' && t.status !== 'closed').length,
    highPriority: tickets.filter(t => t.priority === 'high' && t.status !== 'resolved' && t.status !== 'closed').length,
  }), [tickets]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <div className="text-center space-y-4">
          <div className="relative mx-auto w-16 h-16">
            <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
            <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          </div>
          <p className="text-muted-foreground">جاري تحميل التذاكر...</p>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="h-[calc(100vh-120px)] flex flex-col">
        {/* Compact Header */}
        <div className="flex items-center justify-between px-1 py-3 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <Ticket className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-lg font-semibold">التذاكر</h1>
                <p className="text-xs text-muted-foreground">{stats.total} تذكرة</p>
              </div>
            </div>
            
            {/* Quick Stats Pills */}
            <div className="hidden md:flex items-center gap-2">
              {stats.highPriority > 0 && (
                <Badge variant="destructive" className="gap-1 animate-pulse">
                  <Zap className="h-3 w-3" />
                  {stats.highPriority} عاجلة
                </Badge>
              )}
              {stats.unassigned > 0 && (
                <Badge variant="secondary" className="gap-1 bg-amber-100 text-amber-700 hover:bg-amber-200">
                  <AlertCircle className="h-3 w-3" />
                  {stats.unassigned} بانتظار التوجيه
                </Badge>
              )}
            </div>
          </div>
          
          <Button variant="ghost" size="sm" onClick={() => fetchTickets(true)} disabled={refreshing} className="gap-2">
            <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
            <span className="hidden sm:inline">تحديث</span>
          </Button>
        </div>

        {/* Main Content - Split View */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel - Ticket List */}
          <div className="w-full md:w-[380px] lg:w-[420px] border-l flex flex-col bg-muted/20">
            {/* Search & Filters */}
            <div className="p-3 space-y-3 border-b bg-background">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="بحث..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-9 h-9 text-sm"
                />
                {searchQuery && (
                  <Button variant="ghost" size="icon" className="absolute left-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setSearchQuery('')}>
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>

              {/* Filter Tabs */}
              <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
                {[
                  { key: 'all', label: 'الكل', count: stats.total },
                  { key: 'open', label: 'جديدة', count: stats.open, color: 'bg-blue-500' },
                  { key: 'in_progress', label: 'قيد العمل', count: stats.inProgress, color: 'bg-amber-500' },
                  { key: 'unassigned', label: 'غير موجهة', count: stats.unassigned, color: 'bg-rose-500' },
                  { key: 'resolved', label: 'محلولة', count: stats.resolved, color: 'bg-emerald-500' },
                ].map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveFilter(tab.key)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all",
                      activeFilter === tab.key 
                        ? "bg-primary text-primary-foreground shadow-sm" 
                        : "bg-muted hover:bg-muted/80 text-muted-foreground"
                    )}
                  >
                    {tab.color && <span className={cn("w-2 h-2 rounded-full", tab.color)} />}
                    {tab.label}
                    <span className={cn(
                      "px-1.5 py-0.5 rounded-full text-[10px]",
                      activeFilter === tab.key ? "bg-white/20" : "bg-background"
                    )}>
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>

              {/* Priority Filter */}
              <Collapsible open={showFilters} onOpenChange={setShowFilters}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-full justify-between h-8 text-xs">
                    <span className="flex items-center gap-1.5">
                      <Filter className="h-3 w-3" />
                      فلاتر إضافية
                    </span>
                    <ChevronDown className={cn("h-3 w-3 transition-transform", showFilters && "rotate-180")} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-2">
                  <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="الأولوية" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">جميع الأولويات</SelectItem>
                      <SelectItem value="high">🔴 عاجلة</SelectItem>
                      <SelectItem value="medium">🟡 متوسطة</SelectItem>
                      <SelectItem value="low">🟢 عادية</SelectItem>
                    </SelectContent>
                  </Select>
                </CollapsibleContent>
              </Collapsible>
            </div>

            {/* Ticket List */}
            <ScrollArea className="flex-1">
              {filteredTickets.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center px-4">
                  <div className="p-4 rounded-full bg-muted mb-4">
                    <Inbox className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="font-medium mb-1">لا توجد تذاكر</p>
                  <p className="text-sm text-muted-foreground">لم يتم العثور على تذاكر تطابق البحث</p>
                </div>
              ) : (
                <div className="divide-y">
                  {filteredTickets.map((ticket) => {
                    const status = statusConfig[ticket.status] || statusConfig.open;
                    const priority = priorityConfig[ticket.priority] || priorityConfig.medium;
                    const isSelected = selectedTicket?.id === ticket.id;

                    return (
                      <div
                        key={ticket.id}
                        onClick={() => handleSelectTicket(ticket)}
                        className={cn(
                          "p-3 cursor-pointer transition-all hover:bg-accent/50 relative",
                          isSelected && "bg-accent border-r-2 border-r-primary"
                        )}
                      >
                        {/* Priority Indicator Line */}
                        <div className={cn("absolute top-0 right-0 w-1 h-full", priority.bgColor)} />
                        
                        <div className="pr-2">
                          {/* Header Row */}
                          <div className="flex items-start justify-between gap-2 mb-1.5">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0">
                                {ticket.ticket_number}
                              </span>
                              <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 h-5 shrink-0", status.color, `border-${status.borderColor}`)}>
                                {status.label}
                              </Badge>
                            </div>
                            <span className="text-[10px] text-muted-foreground shrink-0">
                              {formatSmartDate(ticket.created_at)}
                            </span>
                          </div>

                          {/* Subject */}
                          <h4 className={cn(
                            "text-sm font-medium truncate mb-1",
                            isSelected ? "text-primary" : "text-foreground"
                          )}>
                            {ticket.subject}
                          </h4>

                          {/* Description Preview */}
                          <p className="text-xs text-muted-foreground line-clamp-1 mb-2">
                            {ticket.description}
                          </p>

                          {/* Footer */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {/* Sender */}
                              <div className="flex items-center gap-1">
                                <Avatar className="h-5 w-5">
                                  <AvatarFallback className="text-[9px] bg-muted">
                                    {(ticket.guest_name || ticket.organization?.name || 'م')[0]}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-[11px] text-muted-foreground truncate max-w-[100px]">
                                  {ticket.organization?.name || ticket.guest_name || 'مستخدم'}
                                </span>
                              </div>
                              
                              {/* Category Tag */}
                              <span className="text-[10px] text-muted-foreground/60 hidden sm:inline">
                                {categoryLabels[ticket.category] || ticket.category}
                              </span>
                            </div>

                            {/* Assigned Staff */}
                            {ticket.staff ? (
                              <Tooltip>
                                <TooltipTrigger>
                                  <Avatar className="h-5 w-5 border border-primary/30">
                                    <AvatarFallback className="text-[9px] bg-primary/10 text-primary">
                                      {ticket.staff.full_name[0]}
                                    </AvatarFallback>
                                  </Avatar>
                                </TooltipTrigger>
                                <TooltipContent>{ticket.staff.full_name}</TooltipContent>
                              </Tooltip>
                            ) : (
                              <span className="text-[10px] text-muted-foreground/50">غير موجهة</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Right Panel - Ticket Detail */}
          <div className="hidden md:flex flex-1 flex-col bg-background">
            {selectedTicket ? (
              <>
                {/* Detail Header */}
                <div className="p-4 border-b bg-gradient-to-l from-muted/30 to-transparent">
                  <div className="flex items-start justify-between mb-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                          {selectedTicket.ticket_number}
                        </span>
                        <Badge className={cn(
                          "text-xs",
                          statusConfig[selectedTicket.status]?.bgColor,
                          "text-white"
                        )}>
                          {statusConfig[selectedTicket.status]?.label}
                        </Badge>
                        <Badge variant="outline" className={cn("text-xs gap-1", priorityConfig[selectedTicket.priority]?.color)}>
                          {priorityConfig[selectedTicket.priority]?.icon}
                          {priorityConfig[selectedTicket.priority]?.label}
                        </Badge>
                      </div>
                      <h2 className="text-lg font-semibold">{selectedTicket.subject}</h2>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Select value={selectedTicket.status} onValueChange={(v) => handleStatusChange(selectedTicket.id, v)}>
                        <SelectTrigger className="w-32 h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="open">جديدة</SelectItem>
                          <SelectItem value="in_progress">قيد العمل</SelectItem>
                          <SelectItem value="resolved">محلولة</SelectItem>
                          <SelectItem value="closed">مغلقة</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-popover">
                          <DropdownMenuItem onClick={() => handleOpenAssignDialog(selectedTicket)}>
                            <UserPlus className="h-4 w-4 ml-2" />
                            توجيه لموظف
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleStatusChange(selectedTicket.id, 'closed')}>
                            إغلاق التذكرة
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {/* Meta Info Cards */}
                  <div className="grid grid-cols-3 gap-3">
                    {/* Sender Card */}
                    <div className="bg-muted/50 rounded-lg p-2.5">
                      <div className="text-[10px] text-muted-foreground mb-1">المرسل</div>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs">{(selectedTicket.guest_name || 'م')[0]}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="text-xs font-medium truncate">{selectedTicket.guest_name || 'مستخدم مسجل'}</div>
                          {selectedTicket.guest_email && (
                            <div className="text-[10px] text-muted-foreground truncate">{selectedTicket.guest_email}</div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Organization Card */}
                    <div className="bg-muted/50 rounded-lg p-2.5">
                      <div className="text-[10px] text-muted-foreground mb-1">العميل</div>
                      {selectedTicket.organization ? (
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded bg-primary/10">
                            <Building2 className="h-4 w-4 text-primary" />
                          </div>
                          <span className="text-xs font-medium truncate">{selectedTicket.organization.name}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">غير محدد</span>
                      )}
                    </div>

                    {/* Assigned Staff Card */}
                    <div className="bg-muted/50 rounded-lg p-2.5">
                      <div className="text-[10px] text-muted-foreground mb-1">الموظف المسؤول</div>
                      {selectedTicket.staff ? (
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6 border border-primary/30">
                            <AvatarFallback className="text-xs bg-primary/10 text-primary">
                              {selectedTicket.staff.full_name[0]}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs font-medium truncate">{selectedTicket.staff.full_name}</span>
                        </div>
                      ) : (
                        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 p-0" onClick={() => handleOpenAssignDialog(selectedTicket)}>
                          <UserPlus className="h-3 w-3" />
                          توجيه
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Conversation Area */}
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-4 max-w-2xl">
                    {/* Original Ticket */}
                    <div className="bg-muted/30 rounded-xl p-4 border">
                      <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
                        <Timer className="h-3 w-3" />
                        {format(new Date(selectedTicket.created_at), 'dd MMMM yyyy - HH:mm', { locale: ar })}
                      </div>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{selectedTicket.description}</p>
                      {(selectedTicket.website_url || selectedTicket.screenshot_url) && (
                        <div className="flex gap-3 mt-3 pt-3 border-t border-border/50">
                          {selectedTicket.website_url && (
                            <a href={selectedTicket.website_url} target="_blank" rel="noopener noreferrer" 
                               className="text-xs text-primary hover:underline flex items-center gap-1">
                              <ExternalLink className="h-3 w-3" />
                              رابط مرفق
                            </a>
                          )}
                          {selectedTicket.screenshot_url && (
                            <a href={selectedTicket.screenshot_url} target="_blank" rel="noopener noreferrer"
                               className="text-xs text-primary hover:underline flex items-center gap-1">
                              <Eye className="h-3 w-3" />
                              صورة مرفقة
                            </a>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Replies */}
                    {replies.map((reply) => (
                      <div
                        key={reply.id}
                        className={cn(
                          "rounded-xl p-4 max-w-[85%]",
                          reply.is_staff_reply 
                            ? "bg-primary/5 border border-primary/10 mr-auto" 
                            : "bg-muted/50 ml-auto"
                        )}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Avatar className="h-5 w-5">
                            <AvatarFallback className={cn(
                              "text-[10px]",
                              reply.is_staff_reply ? "bg-primary/20 text-primary" : "bg-muted"
                            )}>
                              {reply.is_staff_reply ? 'د' : 'ع'}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs font-medium">
                            {reply.is_staff_reply ? 'فريق الدعم' : 'العميل'}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {formatSmartDate(reply.created_at)}
                          </span>
                        </div>
                        <p className="text-sm leading-relaxed">{reply.message}</p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                {/* Reply Input */}
                {selectedTicket.status !== 'closed' && (
                  <div className="p-4 border-t bg-muted/20">
                    <div className="flex gap-3">
                      <Textarea
                        placeholder="اكتب ردك هنا..."
                        value={newReply}
                        onChange={(e) => setNewReply(e.target.value)}
                        className="min-h-[80px] resize-none text-sm"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                            handleSendReply();
                          }
                        }}
                      />
                      <div className="flex flex-col gap-2">
                        <Button onClick={handleSendReply} disabled={!newReply.trim() || sending} className="gap-2">
                          <Send className="h-4 w-4" />
                          إرسال
                        </Button>
                        <span className="text-[10px] text-muted-foreground text-center">Ctrl+Enter</span>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center space-y-3">
                  <div className="p-4 rounded-full bg-muted/50 mx-auto w-fit">
                    <MessageSquare className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground">اختر تذكرة لعرض تفاصيلها</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Detail View Dialog */}
        <Dialog open={!!selectedTicket && window.innerWidth < 768} onOpenChange={() => setSelectedTicket(null)}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col p-0">
            {selectedTicket && (
              <>
                <DialogHeader className="p-4 border-b">
                  <div className="flex items-center gap-2">
                    <Badge className={cn("text-xs", statusConfig[selectedTicket.status]?.bgColor, "text-white")}>
                      {statusConfig[selectedTicket.status]?.label}
                    </Badge>
                    <span className="font-mono text-xs text-muted-foreground">{selectedTicket.ticket_number}</span>
                  </div>
                  <DialogTitle className="text-lg">{selectedTicket.subject}</DialogTitle>
                </DialogHeader>
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-4">
                    <div className="bg-muted/30 rounded-lg p-3">
                      <p className="text-sm whitespace-pre-wrap">{selectedTicket.description}</p>
                    </div>
                    {replies.map((reply) => (
                      <div key={reply.id} className={cn("rounded-lg p-3", reply.is_staff_reply ? "bg-primary/5 border border-primary/10" : "bg-muted/50")}>
                        <div className="flex items-center gap-2 mb-2 text-xs">
                          <span className="font-medium">{reply.is_staff_reply ? 'فريق الدعم' : 'العميل'}</span>
                          <span className="text-muted-foreground">{formatSmartDate(reply.created_at)}</span>
                        </div>
                        <p className="text-sm">{reply.message}</p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                {selectedTicket.status !== 'closed' && (
                  <div className="p-4 border-t">
                    <div className="flex gap-2">
                      <Textarea placeholder="اكتب ردك..." value={newReply} onChange={(e) => setNewReply(e.target.value)} className="min-h-[60px]" />
                      <Button onClick={handleSendReply} disabled={!newReply.trim() || sending} size="icon">
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Assign Staff Dialog */}
        <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-primary" />
                توجيه التذكرة
              </DialogTitle>
              <DialogDescription>اختر الموظف المسؤول</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>الموظف</Label>
                <Select value={selectedStaffId} onValueChange={setSelectedStaffId}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر موظف..." />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    {staffMembers.map((staff) => (
                      <SelectItem key={staff.id} value={staff.id}>
                        {staff.full_name} {staff.job_title && `(${staff.job_title})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>ملاحظة (اختياري)</Label>
                <Textarea value={adminNote} onChange={(e) => setAdminNote(e.target.value)} placeholder="تعليمات للموظف..." className="min-h-[80px]" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>إلغاء</Button>
              <Button onClick={handleAssignTicket} disabled={!selectedStaffId || assigning}>
                {assigning ? 'جاري التوجيه...' : 'توجيه'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
