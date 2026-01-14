import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Ticket, Clock, CheckCircle, AlertCircle, Search, Filter, Eye, MessageSquare, User, UserPlus, Send, Building2, Globe, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

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

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  open: { label: 'مفتوحة', color: 'bg-blue-100 text-blue-700', icon: AlertCircle },
  in_progress: { label: 'قيد المعالجة', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  resolved: { label: 'تم الحل', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  closed: { label: 'مغلقة', color: 'bg-gray-100 text-gray-700', icon: CheckCircle },
};

const priorityConfig: Record<string, { label: string; color: string }> = {
  low: { label: 'منخفضة', color: 'bg-green-50 text-green-600 border-green-200' },
  medium: { label: 'متوسطة', color: 'bg-yellow-50 text-yellow-600 border-yellow-200' },
  high: { label: 'عالية', color: 'bg-red-50 text-red-600 border-red-200' },
};

const sourceConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  direct: { label: 'مباشر', color: 'bg-gray-100 text-gray-600', icon: User },
  embed: { label: 'نموذج مضمن', color: 'bg-purple-100 text-purple-700', icon: ExternalLink },
  portal: { label: 'بوابة العملاء', color: 'bg-blue-100 text-blue-700', icon: Building2 },
  api: { label: 'API', color: 'bg-orange-100 text-orange-700', icon: Globe },
};

const categoryLabels: Record<string, string> = {
  technical: 'مشكلة تقنية',
  question: 'استفسار عام',
  suggestion: 'اقتراح تحسين',
  complaint: 'شكوى',
  general: 'عام',
};

export default function AdminTicketsPage() {
  const { user, isAdminOrEditor } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [organizationFilter, setOrganizationFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  
  // View/Reply dialog
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [replies, setReplies] = useState<TicketReply[]>([]);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
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
    setupRealtimeSubscription();
  }, [isAdminOrEditor, navigate]);

  const fetchTickets = async () => {
    try {
      const { data: ticketsData, error } = await supabase
        .from('support_tickets')
        .select(`
          *,
          organization:client_organizations(id, name, contact_email)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Fetch staff names for assigned tickets
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
    } catch (error) {
      console.error('Error fetching tickets:', error);
    } finally {
      setLoading(false);
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

  const getTicketEmail = async (ticket: SupportTicket): Promise<string | null> => {
    if (ticket.guest_email) {
      return ticket.guest_email;
    }
    
    if (ticket.user_id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', ticket.user_id)
        .single();
      
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

      const { error } = await supabase
        .from('support_tickets')
        .update(updateData)
        .eq('id', ticketId);

      if (error) throw error;

      const statusLabels: Record<string, string> = {
        open: 'مفتوحة',
        in_progress: 'قيد المعالجة',
        resolved: 'تم الحل',
        closed: 'مغلقة',
      };

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
        const siteUrl = window.location.origin;
        await supabase.functions.invoke('send-ticket-notification', {
          body: {
            email,
            ticketNumber: ticket.ticket_number,
            subject: ticket.subject,
            type: newStatus === 'resolved' ? 'resolved' : 'status_update',
            newStatus,
            siteUrl,
          },
        });
      }

      toast({
        title: "تم التحديث",
        description: "تم تغيير حالة التذكرة بنجاح",
      });
    } catch (error: any) {
      console.error('Error updating status:', error);
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive",
      });
    }
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
        const siteUrl = window.location.origin;
        await supabase.functions.invoke('send-ticket-notification', {
          body: {
            email,
            ticketNumber: selectedTicket.ticket_number,
            subject: selectedTicket.subject,
            type: 'reply',
            message: newReply,
            siteUrl,
          },
        });
      }

      setNewReply('');
      await fetchReplies(selectedTicket.id);
      
      toast({
        title: "تم الإرسال",
        description: "تم إرسال الرد بنجاح",
      });
    } catch (error: any) {
      console.error('Error sending reply:', error);
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive",
      });
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
      toast({
        title: "خطأ",
        description: "يرجى اختيار موظف",
        variant: "destructive",
      });
      return;
    }

    setAssigning(true);
    try {
      const { error } = await supabase
        .from('support_tickets')
        .update({
          assigned_to_staff: selectedStaffId,
          admin_note: adminNote || null,
          status: ticketToAssign.status === 'open' ? 'in_progress' : ticketToAssign.status
        } as any)
        .eq('id', ticketToAssign.id);

      if (error) throw error;

      const staff = staffMembers.find(s => s.id === selectedStaffId);
      if (staff) {
        const { data: staffData } = await supabase
          .from('staff_members' as any)
          .select('user_id, email')
          .eq('id', selectedStaffId)
          .single();

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
            body: {
              type: 'ticket_assigned',
              staff_email: staffRecord.email,
              staff_name: staff.full_name,
              data: {
                ticket_number: ticketToAssign.ticket_number,
                ticket_subject: ticketToAssign.subject,
                admin_note: adminNote,
              },
            },
          });
        }
      }

      toast({
        title: "تم التوجيه",
        description: "تم توجيه التذكرة للموظف بنجاح وإرسال إشعار له",
      });

      setAssignDialogOpen(false);
      fetchTickets();
    } catch (error: any) {
      console.error('Error assigning ticket:', error);
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setAssigning(false);
    }
  };

  const filteredTickets = tickets.filter((ticket) => {
    const matchesSearch = ticket.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.ticket_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (ticket.guest_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (ticket.guest_email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (ticket.organization?.name || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || ticket.priority === priorityFilter;
    const matchesOrganization = organizationFilter === 'all' || ticket.organization_id === organizationFilter;
    const matchesSource = sourceFilter === 'all' || ticket.source === sourceFilter;
    
    return matchesSearch && matchesStatus && matchesPriority && matchesOrganization && matchesSource;
  });

  const stats = {
    total: tickets.length,
    open: tickets.filter(t => t.status === 'open').length,
    inProgress: tickets.filter(t => t.status === 'in_progress').length,
    resolved: tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length,
    embed: tickets.filter(t => t.source === 'embed').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">إدارة التذاكر</h1>
            <p className="text-muted-foreground">إدارة ومتابعة تذاكر الدعم الفني</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-5 gap-4">
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
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-purple-100">
                  <ExternalLink className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{stats.embed}</div>
                  <div className="text-sm text-muted-foreground">من التضمين</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="ابحث برقم التذكرة أو الموضوع أو العميل..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-10"
            />
          </div>
          <Select value={organizationFilter} onValueChange={setOrganizationFilter}>
            <SelectTrigger className="w-48">
              <Building2 className="h-4 w-4 ml-2" />
              <SelectValue placeholder="العميل" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع العملاء</SelectItem>
              {organizations.map((org) => (
                <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="w-40">
              <Globe className="h-4 w-4 ml-2" />
              <SelectValue placeholder="المصدر" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع المصادر</SelectItem>
              <SelectItem value="direct">مباشر</SelectItem>
              <SelectItem value="embed">نموذج مضمن</SelectItem>
              <SelectItem value="portal">بوابة العملاء</SelectItem>
              <SelectItem value="api">API</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="الحالة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع الحالات</SelectItem>
              <SelectItem value="open">مفتوحة</SelectItem>
              <SelectItem value="in_progress">قيد المعالجة</SelectItem>
              <SelectItem value="resolved">تم الحل</SelectItem>
              <SelectItem value="closed">مغلقة</SelectItem>
            </SelectContent>
          </Select>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="الأولوية" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع الأولويات</SelectItem>
              <SelectItem value="high">عالية</SelectItem>
              <SelectItem value="medium">متوسطة</SelectItem>
              <SelectItem value="low">منخفضة</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Tickets Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>رقم التذكرة</TableHead>
                  <TableHead>العميل</TableHead>
                  <TableHead>المرسل</TableHead>
                  <TableHead>الموضوع</TableHead>
                  <TableHead>المصدر</TableHead>
                  <TableHead>الموظف المسؤول</TableHead>
                  <TableHead>الأولوية</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>التاريخ</TableHead>
                  <TableHead>الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTickets.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                      لا توجد تذاكر
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTickets.map((ticket) => {
                    const status = statusConfig[ticket.status] || statusConfig.open;
                    const priority = priorityConfig[ticket.priority] || priorityConfig.medium;
                    const source = sourceConfig[ticket.source || 'direct'] || sourceConfig.direct;
                    const StatusIcon = status.icon;
                    const SourceIcon = source.icon;

                    return (
                      <TableRow key={ticket.id}>
                        <TableCell className="font-mono text-sm">{ticket.ticket_number}</TableCell>
                        <TableCell>
                          {ticket.organization ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                    <Building2 className="h-4 w-4 text-primary" />
                                  </div>
                                  <span className="text-sm font-medium truncate max-w-[120px]">
                                    {ticket.organization.name}
                                  </span>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{ticket.organization.name}</p>
                                {ticket.organization.contact_email && (
                                  <p className="text-xs text-muted-foreground">{ticket.organization.contact_email}</p>
                                )}
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback>
                                {ticket.user_id ? 'م' : 'ض'}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="text-sm font-medium">
                                {ticket.guest_name || 'مستخدم مسجل'}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {ticket.guest_email || ''}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[180px] truncate">{ticket.subject}</TableCell>
                        <TableCell>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge variant="outline" className={`${source.color} cursor-help`}>
                                <SourceIcon className="h-3 w-3 ml-1" />
                                {source.label}
                              </Badge>
                            </TooltipTrigger>
                            {ticket.source_domain && (
                              <TooltipContent>
                                <p>النطاق: {ticket.source_domain}</p>
                              </TooltipContent>
                            )}
                          </Tooltip>
                        </TableCell>
                        <TableCell>
                          {ticket.staff ? (
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                                <User className="h-3 w-3 text-primary" />
                              </div>
                              <span className="text-sm">{ticket.staff.full_name}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">غير موجه</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={priority.color}>
                            {priority.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={ticket.status}
                            onValueChange={(value) => handleStatusChange(ticket.id, value)}
                          >
                            <SelectTrigger className={`w-32 ${status.color}`}>
                              <StatusIcon className="h-3 w-3 ml-1" />
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="open">مفتوحة</SelectItem>
                              <SelectItem value="in_progress">قيد المعالجة</SelectItem>
                              <SelectItem value="resolved">تم الحل</SelectItem>
                              <SelectItem value="closed">مغلقة</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(ticket.created_at), 'dd/MM/yyyy', { locale: ar })}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewTicket(ticket)}
                            >
                              <Eye className="h-4 w-4 ml-1" />
                              عرض
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenAssignDialog(ticket)}
                            >
                              <UserPlus className="h-4 w-4 ml-1" />
                              توجيه
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* View/Reply Dialog */}
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            {selectedTicket && (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-3">
                    <span className="font-mono text-muted-foreground">
                      {selectedTicket.ticket_number}
                    </span>
                    <Badge className={statusConfig[selectedTicket.status]?.color}>
                      {statusConfig[selectedTicket.status]?.label}
                    </Badge>
                    {selectedTicket.source === 'embed' && (
                      <Badge variant="outline" className="bg-purple-100 text-purple-700">
                        <ExternalLink className="h-3 w-3 ml-1" />
                        نموذج مضمن
                      </Badge>
                    )}
                  </DialogTitle>
                </DialogHeader>

                <div className="space-y-6">
                  {/* Client & Sender Info */}
                  {selectedTicket.organization && (
                    <div className="bg-primary/5 rounded-lg p-4 border border-primary/20">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                          <Building2 className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <div className="font-semibold text-lg">{selectedTicket.organization.name}</div>
                          {selectedTicket.organization.contact_email && (
                            <div className="text-sm text-muted-foreground">{selectedTicket.organization.contact_email}</div>
                          )}
                        </div>
                      </div>
                      {selectedTicket.source_domain && (
                        <div className="mt-3 text-sm text-muted-foreground flex items-center gap-2">
                          <Globe className="h-4 w-4" />
                          <span>النطاق المصدر: {selectedTicket.source_domain}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Ticket Info */}
                  <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4" />
                      <span className="font-medium">المرسل:</span>
                      <span>{selectedTicket.guest_name || 'مستخدم مسجل'}</span>
                      {selectedTicket.guest_email && (
                        <span className="text-muted-foreground">({selectedTicket.guest_email})</span>
                      )}
                    </div>
                    <h3 className="text-lg font-semibold">{selectedTicket.subject}</h3>
                    <p className="text-muted-foreground whitespace-pre-wrap">
                      {selectedTicket.description}
                    </p>
                    {(selectedTicket.website_url || selectedTicket.screenshot_url) && (
                      <div className="flex gap-4 pt-2">
                        {selectedTicket.website_url && (
                          <a
                            href={selectedTicket.website_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline"
                          >
                            🔗 الرابط المرفق
                          </a>
                        )}
                        {selectedTicket.screenshot_url && (
                          <a
                            href={selectedTicket.screenshot_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline"
                          >
                            🖼️ الصورة المرفقة
                          </a>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Replies */}
                  <div>
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      الردود ({replies.length})
                    </h4>
                    <div className="space-y-3 max-h-60 overflow-y-auto">
                      {replies.map((reply) => (
                        <div
                          key={reply.id}
                          className={`p-3 rounded-lg ${
                            reply.is_staff_reply ? 'bg-primary/5 border border-primary/20' : 'bg-muted'
                          }`}
                        >
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium">
                              {reply.is_staff_reply ? '👤 فريق الدعم' : '📧 العميل'}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(reply.created_at), 'dd/MM/yyyy HH:mm')}
                            </span>
                          </div>
                          <p className="text-sm">{reply.message}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Reply Form */}
                  {selectedTicket.status !== 'closed' && (
                    <div className="space-y-3">
                      <Label>إرسال رد</Label>
                      <Textarea
                        placeholder="اكتب ردك هنا..."
                        value={newReply}
                        onChange={(e) => setNewReply(e.target.value)}
                        className="min-h-[100px]"
                      />
                    </div>
                  )}
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
                    إغلاق
                  </Button>
                  {selectedTicket.status !== 'closed' && (
                    <Button onClick={handleSendReply} disabled={!newReply.trim() || sending}>
                      {sending ? 'جاري الإرسال...' : 'إرسال الرد'}
                    </Button>
                  )}
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Assign Staff Dialog */}
        <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                توجيه التذكرة لموظف
              </DialogTitle>
              <DialogDescription>
                اختر الموظف المسؤول عن هذه التذكرة
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>اختر الموظف *</Label>
                <Select value={selectedStaffId} onValueChange={setSelectedStaffId}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر موظف..." />
                  </SelectTrigger>
                  <SelectContent>
                    {staffMembers.map((staff) => (
                      <SelectItem key={staff.id} value={staff.id}>
                        {staff.full_name} {staff.job_title ? `(${staff.job_title})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>ملاحظة للموظف (اختياري)</Label>
                <Textarea
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  placeholder="أضف ملاحظة أو تعليمات للموظف..."
                  className="min-h-[80px]"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>
                إلغاء
              </Button>
              <Button onClick={handleAssignTicket} disabled={!selectedStaffId || assigning}>
                <Send className="h-4 w-4 ml-2" />
                {assigning ? 'جاري التوجيه...' : 'توجيه التذكرة'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
