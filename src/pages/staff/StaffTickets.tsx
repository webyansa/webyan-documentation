import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useStaffAuth } from '@/hooks/useStaffAuth';
import { format, isToday, isYesterday } from 'date-fns';
import { ar } from 'date-fns/locale';
import {
  Ticket,
  Clock,
  CheckCircle,
  AlertCircle,
  Search,
  Eye,
  Send,
  FileText,
  RefreshCw,
  Inbox,
  Hash,
  Calendar,
  MoreVertical,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface SupportTicket {
  id: string;
  ticket_number: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  category: string;
  created_at: string;
  admin_note: string | null;
  closure_report: string | null;
  guest_name: string | null;
  guest_email: string | null;
  user_id: string | null;
  organization?: {
    name: string;
  } | null;
}

interface TicketReply {
  id: string;
  message: string;
  is_staff_reply: boolean;
  created_at: string;
}

// Status configuration with vibrant colors
const statusConfig: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  open: { label: 'جديدة', bg: 'bg-sky-50', text: 'text-sky-700', dot: 'bg-sky-500' },
  in_progress: { label: 'قيد المعالجة', bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  resolved: { label: 'تم الحل', bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  closed: { label: 'مغلقة', bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400' },
};

// Priority configuration
const priorityConfig: Record<string, { label: string; color: string; bg: string }> = {
  high: { label: 'عاجلة', color: 'text-rose-600', bg: 'bg-rose-50 border-rose-200' },
  medium: { label: 'متوسطة', color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
  low: { label: 'عادية', color: 'text-slate-600', bg: 'bg-slate-50 border-slate-200' },
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
  return format(date, 'dd/MM/yyyy', { locale: ar });
}

export default function StaffTickets() {
  const { permissions, user } = useStaffAuth();
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  
  // View/Reply dialog
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [replies, setReplies] = useState<TicketReply[]>([]);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [newReply, setNewReply] = useState('');
  const [sending, setSending] = useState(false);

  // Close dialog
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [closureReport, setClosureReport] = useState('');
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (!permissions.canReplyTickets) {
      navigate('/staff');
      return;
    }
    fetchTickets();
    const cleanup = setupRealtimeSubscription();
    return cleanup;
  }, [permissions.staffId]);

  const fetchTickets = async (silent = false) => {
    if (!permissions.staffId) return;

    try {
      if (!silent) setLoading(true);
      else setRefreshing(true);

      const { data, error } = await supabase
        .from('support_tickets')
        .select('*, organization:client_organizations(name)')
        .eq('assigned_to_staff', permissions.staffId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTickets((data as unknown as SupportTicket[]) || []);
    } catch (error) {
      console.error('Error fetching tickets:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('staff-tickets')
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

  const handleViewTicket = async (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    await fetchReplies(ticket.id);
    setViewDialogOpen(true);
  };

  const handleSendReply = async () => {
    if (!newReply.trim() || !selectedTicket) return;

    setSending(true);
    try {
      const { error } = await supabase
        .from('ticket_replies')
        .insert({
          ticket_id: selectedTicket.id,
          user_id: user?.id,
          message: newReply,
          is_staff_reply: true,
        });

      if (error) throw error;

      if (selectedTicket.status === 'open') {
        await supabase
          .from('support_tickets')
          .update({ status: 'in_progress' })
          .eq('id', selectedTicket.id);
        setSelectedTicket({ ...selectedTicket, status: 'in_progress' });
      }

      setNewReply('');
      await fetchReplies(selectedTicket.id);
      toast.success('تم إرسال الرد بنجاح');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSending(false);
    }
  };

  const handleOpenCloseDialog = (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    setClosureReport(ticket.closure_report || '');
    setCloseDialogOpen(true);
    setViewDialogOpen(false);
  };

  const handleCloseTicket = async () => {
    if (!selectedTicket || !closureReport.trim()) {
      toast.error('يرجى كتابة تقرير الإغلاق');
      return;
    }

    setClosing(true);
    try {
      const { error } = await supabase
        .from('support_tickets')
        .update({
          status: 'resolved',
          closure_report: closureReport,
          resolved_at: new Date().toISOString(),
          resolved_by: user?.id,
        })
        .eq('id', selectedTicket.id);

      if (error) throw error;

      if (selectedTicket.user_id) {
        await supabase.from('user_notifications').insert({
          user_id: selectedTicket.user_id,
          title: '✅ تم حل تذكرتك',
          message: `تم حل التذكرة "${selectedTicket.subject}" بنجاح`,
          type: 'ticket_resolved',
        });
      }

      const clientEmail = selectedTicket.guest_email || null;
      if (clientEmail || selectedTicket.user_id) {
        let emailToSend = clientEmail;
        if (!emailToSend && selectedTicket.user_id) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('email')
            .eq('id', selectedTicket.user_id)
            .single();
          emailToSend = profile?.email || null;
        }

        if (emailToSend) {
          await supabase.functions.invoke('send-ticket-notification', {
            body: {
              email: emailToSend,
              ticketNumber: selectedTicket.ticket_number,
              subject: selectedTicket.subject,
              type: 'resolved',
              message: closureReport,
              siteUrl: window.location.origin,
            },
          });
        }
      }

      toast.success('تم إغلاق التذكرة بنجاح');
      setCloseDialogOpen(false);
      setClosureReport('');
      fetchTickets(true);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setClosing(false);
    }
  };

  const filteredTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      const matchesSearch = !searchQuery || 
        ticket.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ticket.ticket_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (ticket.guest_name || '').toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
      const matchesPriority = priorityFilter === 'all' || ticket.priority === priorityFilter;
      
      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [tickets, searchQuery, statusFilter, priorityFilter]);

  const stats = useMemo(() => ({
    total: tickets.length,
    open: tickets.filter(t => t.status === 'open').length,
    inProgress: tickets.filter(t => t.status === 'in_progress').length,
    resolved: tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length,
  }), [tickets]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center space-y-4">
          <div className="relative mx-auto w-12 h-12">
            <div className="absolute inset-0 rounded-full border-4 border-muted" />
            <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          </div>
          <p className="text-muted-foreground text-sm">جاري تحميل التذاكر...</p>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Ticket className="h-6 w-6" />
              التذاكر الموجهة إليك
            </h1>
            <p className="text-muted-foreground text-sm mt-1">إدارة ومتابعة التذاكر المخصصة لك</p>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => fetchTickets(true)} 
            disabled={refreshing}
            className="gap-2"
          >
            <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
            تحديث
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card 
            className={cn(
              "cursor-pointer transition-all hover:shadow-md border-2",
              statusFilter === 'all' ? "border-primary bg-primary/5" : "border-transparent hover:border-muted"
            )}
            onClick={() => setStatusFilter('all')}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">الإجمالي</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <div className="p-2.5 rounded-full bg-slate-100">
                  <Ticket className="h-5 w-5 text-slate-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card 
            className={cn(
              "cursor-pointer transition-all hover:shadow-md border-2",
              statusFilter === 'open' ? "border-sky-500 bg-sky-50" : "border-transparent hover:border-muted"
            )}
            onClick={() => setStatusFilter('open')}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">جديدة</p>
                  <p className="text-2xl font-bold text-sky-600">{stats.open}</p>
                </div>
                <div className="p-2.5 rounded-full bg-sky-100">
                  <AlertCircle className="h-5 w-5 text-sky-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card 
            className={cn(
              "cursor-pointer transition-all hover:shadow-md border-2",
              statusFilter === 'in_progress' ? "border-amber-500 bg-amber-50" : "border-transparent hover:border-muted"
            )}
            onClick={() => setStatusFilter('in_progress')}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">قيد المعالجة</p>
                  <p className="text-2xl font-bold text-amber-600">{stats.inProgress}</p>
                </div>
                <div className="p-2.5 rounded-full bg-amber-100">
                  <Clock className="h-5 w-5 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card 
            className={cn(
              "cursor-pointer transition-all hover:shadow-md border-2",
              statusFilter === 'resolved' ? "border-emerald-500 bg-emerald-50" : "border-transparent hover:border-muted"
            )}
            onClick={() => { setStatusFilter('resolved'); }}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">تم الحل</p>
                  <p className="text-2xl font-bold text-emerald-600">{stats.resolved}</p>
                </div>
                <div className="p-2.5 rounded-full bg-emerald-100">
                  <CheckCircle className="h-5 w-5 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3 items-center">
              <div className="relative flex-1 w-full">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="بحث برقم التذكرة أو الموضوع..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-10"
                />
              </div>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-full sm:w-[140px]">
                  <SelectValue placeholder="الأولوية" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الأولويات</SelectItem>
                  <SelectItem value="high">عاجلة</SelectItem>
                  <SelectItem value="medium">متوسطة</SelectItem>
                  <SelectItem value="low">عادية</SelectItem>
                </SelectContent>
              </Select>
              {(statusFilter !== 'all' || priorityFilter !== 'all') && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => { setStatusFilter('all'); setPriorityFilter('all'); }}
                  className="gap-1"
                >
                  <X className="h-4 w-4" />
                  مسح الفلاتر
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tickets List */}
        {filteredTickets.length === 0 ? (
          <Card>
            <CardContent className="py-16">
              <div className="text-center">
                <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Inbox className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="font-semibold mb-1">لا توجد تذاكر</h3>
                <p className="text-sm text-muted-foreground">لم يتم العثور على تذاكر تطابق معايير البحث</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              {/* Table Header */}
              <div className="hidden md:grid grid-cols-[80px_1fr_100px_100px_100px_60px] gap-3 p-4 bg-muted/50 text-xs font-medium text-muted-foreground border-b">
                <div>الرقم</div>
                <div>الموضوع والعميل</div>
                <div>الأولوية</div>
                <div>الحالة</div>
                <div>التاريخ</div>
                <div>إجراءات</div>
              </div>

              {/* Table Body */}
              <div className="divide-y">
                {filteredTickets.map((ticket) => {
                  const status = statusConfig[ticket.status] || statusConfig.open;
                  const priority = priorityConfig[ticket.priority] || priorityConfig.medium;

                  return (
                    <div
                      key={ticket.id}
                      className="grid grid-cols-1 md:grid-cols-[80px_1fr_100px_100px_100px_60px] gap-3 p-4 hover:bg-muted/30 transition-colors items-center"
                    >
                      {/* Ticket Number */}
                      <div>
                        <span className="inline-flex items-center gap-1 text-xs font-mono bg-muted px-2 py-1 rounded">
                          <Hash className="h-3 w-3 text-muted-foreground" />
                          {ticket.ticket_number.slice(-6)}
                        </span>
                      </div>

                      {/* Subject & Client Combined */}
                      <div>
                        <button
                          onClick={() => handleViewTicket(ticket)}
                          className="text-right hover:text-primary transition-colors w-full"
                        >
                          <p className="font-medium text-sm line-clamp-1">{ticket.subject}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Avatar className="h-5 w-5">
                              <AvatarFallback className="text-[8px] bg-primary/10 text-primary">
                                {(ticket.organization?.name || ticket.guest_name || 'م')[0]}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-xs text-muted-foreground truncate">
                              {ticket.organization?.name || ticket.guest_name || 'مستخدم'} • {categoryLabels[ticket.category] || ticket.category}
                            </span>
                          </div>
                          {ticket.admin_note && (
                            <div className="text-xs text-orange-600 mt-1 flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" />
                              ملاحظة: {ticket.admin_note}
                            </div>
                          )}
                        </button>
                      </div>

                      {/* Priority */}
                      <div>
                        <Badge 
                          variant="outline" 
                          className={cn("text-xs font-medium border px-3 py-1", priority.bg, priority.color)}
                        >
                          {priority.label}
                        </Badge>
                      </div>

                      {/* Status */}
                      <div>
                        <div className={cn(
                          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium",
                          status.bg, status.text
                        )}>
                          <span className={cn("w-2 h-2 rounded-full", status.dot)} />
                          {status.label}
                        </div>
                      </div>

                      {/* Date */}
                      <div>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Calendar className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{formatSmartDate(ticket.created_at)}</span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-background">
                            <DropdownMenuItem onClick={() => handleViewTicket(ticket)}>
                              <Eye className="h-4 w-4 ml-2" />
                              عرض والرد
                            </DropdownMenuItem>
                            {(ticket.status === 'open' || ticket.status === 'in_progress') && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={() => handleOpenCloseDialog(ticket)}
                                  className="text-emerald-600"
                                >
                                  <CheckCircle className="h-4 w-4 ml-2" />
                                  إغلاق التذكرة
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* View/Reply Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader className="pb-4 border-b">
            <div className="flex items-start justify-between">
              <div>
                <DialogTitle className="flex items-center gap-2 text-lg">
                  <Ticket className="h-5 w-5 text-primary" />
                  {selectedTicket?.subject}
                </DialogTitle>
                <DialogDescription className="mt-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs bg-muted px-2 py-1 rounded">
                      #{selectedTicket?.ticket_number}
                    </span>
                    {selectedTicket && (
                      <>
                        <Badge 
                          variant="outline" 
                          className={cn(
                            "text-xs",
                            statusConfig[selectedTicket.status]?.bg,
                            statusConfig[selectedTicket.status]?.text
                          )}
                        >
                          {statusConfig[selectedTicket.status]?.label}
                        </Badge>
                        <Badge 
                          variant="outline" 
                          className={cn(
                            "text-xs",
                            priorityConfig[selectedTicket.priority]?.bg,
                            priorityConfig[selectedTicket.priority]?.color
                          )}
                        >
                          {priorityConfig[selectedTicket.priority]?.label}
                        </Badge>
                      </>
                    )}
                  </div>
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          <div className="flex-1 overflow-auto space-y-4 py-4">
            {/* Admin Note */}
            {selectedTicket?.admin_note && (
              <div className="p-3 rounded-lg bg-orange-50 border border-orange-200">
                <div className="flex items-center gap-2 text-orange-700 font-medium mb-1">
                  <AlertCircle className="h-4 w-4" />
                  ملاحظة من الإدارة
                </div>
                <p className="text-sm text-orange-600">{selectedTicket.admin_note}</p>
              </div>
            )}

            {/* Description */}
            <div className="p-4 rounded-lg bg-muted/50 border">
              <Label className="text-sm font-medium text-muted-foreground">وصف المشكلة</Label>
              <p className="text-sm mt-2">{selectedTicket?.description}</p>
            </div>

            {/* Replies */}
            <div>
              <Label className="text-sm font-medium mb-2 block">المحادثة</Label>
              <ScrollArea className="h-[200px] border rounded-lg p-3">
                {replies.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    <Send className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">لا توجد ردود حتى الآن</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {replies.map((reply) => (
                      <div
                        key={reply.id}
                        className={cn(
                          "p-3 rounded-lg",
                          reply.is_staff_reply
                            ? 'bg-primary/10 mr-4 border-r-2 border-primary'
                            : 'bg-muted ml-4 border-r-2 border-muted-foreground/30'
                        )}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className={cn(
                              "text-xs",
                              reply.is_staff_reply ? "bg-primary/20 text-primary" : "bg-muted-foreground/20"
                            )}>
                              {reply.is_staff_reply ? 'م' : 'ع'}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs font-medium">
                            {reply.is_staff_reply ? 'أنت' : 'العميل'}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatSmartDate(reply.created_at)}
                          </span>
                        </div>
                        <p className="text-sm">{reply.message}</p>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>

          {/* Reply Form */}
          {selectedTicket && (selectedTicket.status === 'open' || selectedTicket.status === 'in_progress') && (
            <div className="pt-4 border-t space-y-3">
              <Textarea
                placeholder="اكتب ردك هنا... (Ctrl+Enter للإرسال)"
                value={newReply}
                onChange={(e) => setNewReply(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.ctrlKey) {
                    handleSendReply();
                  }
                }}
                className="min-h-[80px]"
              />
              <div className="flex justify-between items-center">
                <Button 
                  variant="outline" 
                  onClick={() => handleOpenCloseDialog(selectedTicket)}
                  className="gap-2 text-emerald-600 hover:text-emerald-700"
                >
                  <CheckCircle className="h-4 w-4" />
                  إغلاق التذكرة
                </Button>
                <Button onClick={handleSendReply} disabled={sending || !newReply.trim()} className="gap-2">
                  <Send className="h-4 w-4" />
                  إرسال الرد
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Close Ticket Dialog */}
      <Dialog open={closeDialogOpen} onOpenChange={setCloseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-emerald-600" />
              إغلاق التذكرة
            </DialogTitle>
            <DialogDescription>
              <span className="font-mono text-xs bg-muted px-2 py-1 rounded">
                #{selectedTicket?.ticket_number}
              </span>
              <span className="mx-2">-</span>
              {selectedTicket?.subject}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-sm font-medium">تقرير الإغلاق *</Label>
              <Textarea
                placeholder="اكتب ملخص الحل والإجراءات التي تمت..."
                value={closureReport}
                onChange={(e) => setClosureReport(e.target.value)}
                className="mt-2 min-h-[150px]"
              />
              <p className="text-xs text-muted-foreground mt-1">
                سيتم إرسال هذا التقرير للعميل كملخص للحل
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCloseDialogOpen(false)}>
              إلغاء
            </Button>
            <Button 
              onClick={handleCloseTicket} 
              disabled={closing || !closureReport.trim()}
              className="gap-2 bg-emerald-600 hover:bg-emerald-700"
            >
              {closing && <RefreshCw className="h-4 w-4 animate-spin" />}
              إغلاق التذكرة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
