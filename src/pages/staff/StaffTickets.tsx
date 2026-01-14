import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useStaffAuth } from '@/hooks/useStaffAuth';
import { format, parseISO } from 'date-fns';
import { ar } from 'date-fns/locale';
import {
  Ticket,
  Clock,
  CheckCircle,
  AlertCircle,
  Search,
  Filter,
  Eye,
  MessageSquare,
  Send,
  FileText,
  Loader2,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';

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
}

interface TicketReply {
  id: string;
  message: string;
  is_staff_reply: boolean;
  created_at: string;
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  open: { label: 'مفتوحة', color: 'bg-blue-100 text-blue-700', icon: AlertCircle },
  in_progress: { label: 'قيد المعالجة', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  resolved: { label: 'تم الحل', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  closed: { label: 'مغلقة', color: 'bg-gray-100 text-gray-700', icon: CheckCircle },
};

const priorityConfig: Record<string, { label: string; color: string }> = {
  low: { label: 'منخفضة', color: 'bg-green-50 text-green-600' },
  medium: { label: 'متوسطة', color: 'bg-yellow-50 text-yellow-600' },
  high: { label: 'عالية', color: 'bg-red-50 text-red-600' },
};

const categoryLabels: Record<string, string> = {
  technical: 'مشكلة تقنية',
  question: 'استفسار عام',
  suggestion: 'اقتراح تحسين',
  complaint: 'شكوى',
  general: 'عام',
};

export default function StaffTickets() {
  const { permissions, user } = useStaffAuth();
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
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
    setupRealtimeSubscription();
  }, [permissions.staffId]);

  const fetchTickets = async () => {
    if (!permissions.staffId) return;

    try {
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('assigned_to_staff', permissions.staffId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTickets((data as SupportTicket[]) || []);
    } catch (error) {
      console.error('Error fetching tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('staff-tickets')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'support_tickets',
        },
        () => {
          fetchTickets();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const fetchReplies = async (ticketId: string) => {
    const { data, error } = await supabase
      .from('ticket_replies')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching replies:', error);
      return;
    }
    setReplies(data || []);
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

      // Update ticket status to in_progress if open
      if (selectedTicket.status === 'open') {
        await supabase
          .from('support_tickets')
          .update({ status: 'in_progress' })
          .eq('id', selectedTicket.id);
      }

      setNewReply('');
      await fetchReplies(selectedTicket.id);
      toast.success('تم إرسال الرد بنجاح');
    } catch (error: any) {
      console.error('Error sending reply:', error);
      toast.error(error.message);
    } finally {
      setSending(false);
    }
  };

  const handleOpenCloseDialog = (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    setClosureReport(ticket.closure_report || '');
    setCloseDialogOpen(true);
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

      // Send notification to client
      if (selectedTicket.user_id) {
        await supabase.from('user_notifications').insert({
          user_id: selectedTicket.user_id,
          title: '✅ تم حل تذكرتك',
          message: `تم حل التذكرة "${selectedTicket.subject}" بنجاح`,
          type: 'ticket_resolved',
        });
      }

      // Send email notification to client
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

      toast.success('تم إغلاق التذكرة بنجاح وإرسال إشعار للعميل');
      setCloseDialogOpen(false);
      setClosureReport('');
      fetchTickets();
    } catch (error: any) {
      console.error('Error closing ticket:', error);
      toast.error(error.message);
    } finally {
      setClosing(false);
    }
  };

  const filteredTickets = tickets.filter((ticket) => {
    const matchesSearch = ticket.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.ticket_number.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: tickets.length,
    open: tickets.filter(t => t.status === 'open').length,
    inProgress: tickets.filter(t => t.status === 'in_progress').length,
    resolved: tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Ticket className="h-6 w-6" />
          التذاكر الموجهة إليك
        </h1>
        <p className="text-muted-foreground">إدارة ومتابعة التذاكر المخصصة لك</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-primary/10">
                <Ticket className="h-6 w-6 text-primary" />
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.total}</div>
                <div className="text-sm text-muted-foreground">إجمالي التذاكر</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-blue-100">
                <AlertCircle className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.open}</div>
                <div className="text-sm text-muted-foreground">مفتوحة</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-yellow-100">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.inProgress}</div>
                <div className="text-sm text-muted-foreground">قيد المعالجة</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-green-100">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.resolved}</div>
                <div className="text-sm text-muted-foreground">تم الحل</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="بحث برقم التذكرة أو الموضوع..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <Filter className="h-4 w-4 ml-2" />
                <SelectValue placeholder="جميع الحالات" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الحالات</SelectItem>
                {Object.entries(statusConfig).map(([key, config]) => (
                  <SelectItem key={key} value={key}>{config.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tickets Table */}
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>رقم التذكرة</TableHead>
                <TableHead>الموضوع</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>الأولوية</TableHead>
                <TableHead>التصنيف</TableHead>
                <TableHead>التاريخ</TableHead>
                <TableHead>الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTickets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    لا توجد تذاكر
                  </TableCell>
                </TableRow>
              ) : (
                filteredTickets.map((ticket) => (
                  <TableRow key={ticket.id}>
                    <TableCell className="font-mono text-sm">{ticket.ticket_number}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{ticket.subject}</div>
                        {ticket.admin_note && (
                          <div className="text-xs text-orange-600 mt-1 flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            ملاحظة الإدارة: {ticket.admin_note}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusConfig[ticket.status]?.color || ''}>
                        {statusConfig[ticket.status]?.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={priorityConfig[ticket.priority]?.color || ''}>
                        {priorityConfig[ticket.priority]?.label}
                      </Badge>
                    </TableCell>
                    <TableCell>{categoryLabels[ticket.category] || ticket.category}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(parseISO(ticket.created_at), 'd MMM yyyy', { locale: ar })}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleViewTicket(ticket)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {(ticket.status === 'open' || ticket.status === 'in_progress') && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenCloseDialog(ticket)}
                            className="text-green-600 hover:text-green-700"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* View/Reply Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ticket className="h-5 w-5" />
              {selectedTicket?.ticket_number} - {selectedTicket?.subject}
            </DialogTitle>
            <DialogDescription>
              {selectedTicket && (
                <div className="flex items-center gap-2 mt-2">
                  <Badge className={statusConfig[selectedTicket.status]?.color || ''}>
                    {statusConfig[selectedTicket.status]?.label}
                  </Badge>
                  <Badge variant="outline" className={priorityConfig[selectedTicket.priority]?.color || ''}>
                    {priorityConfig[selectedTicket.priority]?.label}
                  </Badge>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
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
            <div className="p-3 rounded-lg bg-muted">
              <Label className="text-sm font-medium">وصف المشكلة</Label>
              <p className="text-sm mt-1">{selectedTicket?.description}</p>
            </div>

            {/* Replies */}
            <div>
              <Label className="text-sm font-medium mb-2 block">المحادثة</Label>
              <ScrollArea className="h-[200px] border rounded-lg p-3">
                {replies.length === 0 ? (
                  <div className="text-center text-muted-foreground py-4">
                    لا توجد ردود حتى الآن
                  </div>
                ) : (
                  <div className="space-y-3">
                    {replies.map((reply) => (
                      <div
                        key={reply.id}
                        className={`p-3 rounded-lg ${
                          reply.is_staff_reply
                            ? 'bg-primary/10 mr-4'
                            : 'bg-muted ml-4'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-xs">
                              {reply.is_staff_reply ? 'م' : 'ع'}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs font-medium">
                            {reply.is_staff_reply ? 'فريق الدعم' : 'العميل'}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {format(parseISO(reply.created_at), 'd MMM yyyy HH:mm', { locale: ar })}
                          </span>
                        </div>
                        <p className="text-sm">{reply.message}</p>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>

            {/* Reply Form */}
            {selectedTicket && (selectedTicket.status === 'open' || selectedTicket.status === 'in_progress') && (
              <div className="flex gap-2">
                <Textarea
                  placeholder="اكتب ردك هنا..."
                  value={newReply}
                  onChange={(e) => setNewReply(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={handleSendReply} disabled={sending || !newReply.trim()}>
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Close Ticket Dialog */}
      <Dialog open={closeDialogOpen} onOpenChange={setCloseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              إغلاق التذكرة - {selectedTicket?.ticket_number}
            </DialogTitle>
            <DialogDescription>
              يرجى كتابة تقرير الإغلاق قبل إغلاق التذكرة
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>تقرير الإغلاق *</Label>
              <Textarea
                placeholder="اكتب ملخص الحل والإجراءات التي تمت..."
                value={closureReport}
                onChange={(e) => setClosureReport(e.target.value)}
                className="mt-2 min-h-[150px]"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCloseDialogOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={handleCloseTicket} disabled={closing || !closureReport.trim()}>
              {closing ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : null}
              إغلاق التذكرة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
