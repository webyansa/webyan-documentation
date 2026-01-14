import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format, parseISO, isToday, isTomorrow, isPast } from 'date-fns';
import { ar } from 'date-fns/locale';
import { 
  Calendar, 
  Clock, 
  Building2, 
  User, 
  CheckCircle2, 
  XCircle, 
  Video,
  Loader2,
  MessageSquare,
  CalendarDays,
  CalendarCheck,
  CalendarX,
  Filter,
  Search,
  ExternalLink,
  Send,
  UserPlus
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';

interface MeetingRequest {
  id: string;
  organization_id: string;
  requested_by: string | null;
  meeting_type: string;
  subject: string;
  description: string | null;
  preferred_date: string;
  alternative_date: string | null;
  confirmed_date: string | null;
  duration_minutes: number;
  status: string;
  meeting_link: string | null;
  admin_notes: string | null;
  assigned_staff: string | null;
  created_at: string;
  updated_at: string;
  organization?: {
    name: string;
    contact_email: string;
  };
  requester?: {
    full_name: string;
    email: string;
  };
  staff?: {
    full_name: string;
    email: string;
  };
}

const meetingTypes: Record<string, { label: string; color: string }> = {
  general: { label: 'اجتماع عام', color: 'bg-blue-100 text-blue-800' },
  training: { label: 'جلسة تدريبية', color: 'bg-green-100 text-green-800' },
  support: { label: 'دعم فني', color: 'bg-orange-100 text-orange-800' },
  demo: { label: 'عرض توضيحي', color: 'bg-purple-100 text-purple-800' },
  consultation: { label: 'استشارة', color: 'bg-pink-100 text-pink-800' },
};

const statusConfig: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  pending: { label: 'قيد الانتظار', color: 'bg-yellow-100 text-yellow-800', icon: CalendarDays },
  confirmed: { label: 'مؤكد', color: 'bg-green-100 text-green-800', icon: CalendarCheck },
  cancelled: { label: 'ملغي', color: 'bg-red-100 text-red-800', icon: CalendarX },
  completed: { label: 'منتهي', color: 'bg-gray-100 text-gray-800', icon: CheckCircle2 },
  rescheduled: { label: 'معاد جدولته', color: 'bg-blue-100 text-blue-800', icon: Calendar },
};

const allStatuses = ['pending', 'confirmed', 'completed', 'cancelled', 'rescheduled'] as const;

interface StaffMember {
  id: string;
  full_name: string;
  email: string;
  can_attend_meetings: boolean;
}
export default function AdminMeetingsPage() {
  const { user } = useAuth();
  const [meetings, setMeetings] = useState<MeetingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMeeting, setSelectedMeeting] = useState<MeetingRequest | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('pending');

  // Form state for confirmation
  const [confirmForm, setConfirmForm] = useState({
    confirmed_date: '',
    confirmed_time: '',
    meeting_link: '',
    admin_notes: ''
  });

  // Form state for rejection
  const [rejectForm, setRejectForm] = useState({
    admin_notes: ''
  });

  const [actionType, setActionType] = useState<'confirm' | 'reject' | 'view' | null>(null);

  // Staff assignment
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [meetingToAssign, setMeetingToAssign] = useState<MeetingRequest | null>(null);
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');
  const [staffNote, setStaffNote] = useState('');
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    fetchMeetings();
    fetchStaffMembers();
  }, []);

  const fetchStaffMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('staff_members')
        .select('id, full_name, email, can_attend_meetings')
        .eq('is_active', true)
        .eq('can_attend_meetings', true)
        .order('full_name');

      if (error) throw error;
      setStaffMembers((data as StaffMember[]) || []);
    } catch (error) {
      console.error('Error fetching staff members:', error);
    }
  };

  const fetchMeetings = async () => {
    try {
      const { data, error } = await supabase
        .from('meeting_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch organization, requester, and staff details separately
      const meetingsWithDetails = await Promise.all(
        (data || []).map(async (meeting) => {
          const [orgResult, requesterResult, staffResult] = await Promise.all([
            supabase
              .from('client_organizations')
              .select('name, contact_email')
              .eq('id', meeting.organization_id)
              .single(),
            meeting.requested_by
              ? supabase
                  .from('client_accounts')
                  .select('full_name, email')
                  .eq('user_id', meeting.requested_by)
                  .single()
              : Promise.resolve({ data: null }),
            meeting.assigned_staff
              ? supabase
                  .from('staff_members')
                  .select('full_name, email')
                  .eq('id', meeting.assigned_staff)
                  .single()
              : Promise.resolve({ data: null })
          ]);

          return {
            ...meeting,
            organization: orgResult.data || undefined,
            requester: requesterResult.data || undefined,
            staff: staffResult.data || undefined
          };
        })
      );

      setMeetings(meetingsWithDetails);
    } catch (error) {
      console.error('Error fetching meetings:', error);
      toast.error('حدث خطأ في تحميل الاجتماعات');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmMeeting = async () => {
    if (!selectedMeeting || !confirmForm.confirmed_date || !confirmForm.confirmed_time) {
      toast.error('يرجى تحديد التاريخ والوقت');
      return;
    }

    setActionLoading(true);

    try {
      const confirmedDateTime = new Date(`${confirmForm.confirmed_date}T${confirmForm.confirmed_time}`);

      const { error } = await supabase
        .from('meeting_requests')
        .update({
          status: 'confirmed',
          confirmed_date: confirmedDateTime.toISOString(),
          meeting_link: confirmForm.meeting_link || null,
          admin_notes: confirmForm.admin_notes || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedMeeting.id);

      if (error) throw error;

      // Send notification to client
      await sendClientNotification(selectedMeeting, 'confirmed', confirmedDateTime);

      toast.success('تم تأكيد الاجتماع وإرسال إشعار للعميل');
      setDialogOpen(false);
      resetForms();
      fetchMeetings();
    } catch (error) {
      console.error('Error confirming meeting:', error);
      toast.error('حدث خطأ أثناء تأكيد الاجتماع');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectMeeting = async () => {
    if (!selectedMeeting) return;

    setActionLoading(true);

    try {
      const { error } = await supabase
        .from('meeting_requests')
        .update({
          status: 'cancelled',
          admin_notes: rejectForm.admin_notes || 'تم رفض الطلب',
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedMeeting.id);

      if (error) throw error;

      // Send notification to client
      await sendClientNotification(selectedMeeting, 'cancelled');

      toast.success('تم إلغاء الاجتماع وإشعار العميل');
      setDialogOpen(false);
      resetForms();
      fetchMeetings();
    } catch (error) {
      console.error('Error rejecting meeting:', error);
      toast.error('حدث خطأ أثناء إلغاء الاجتماع');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCompleteMeeting = async (meeting: MeetingRequest) => {
    try {
      const { error } = await supabase
        .from('meeting_requests')
        .update({
          status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('id', meeting.id);

      if (error) throw error;

      toast.success('تم تحديد الاجتماع كمنتهي');
      fetchMeetings();
    } catch (error) {
      console.error('Error completing meeting:', error);
      toast.error('حدث خطأ');
    }
  };

  const handleStatusChange = async (meeting: MeetingRequest, newStatus: string) => {
    try {
      const updateData: any = {
        status: newStatus,
        updated_at: new Date().toISOString()
      };

      // Clear confirmed_date if changing back to pending
      if (newStatus === 'pending') {
        updateData.confirmed_date = null;
        updateData.meeting_link = null;
      }

      const { error } = await supabase
        .from('meeting_requests')
        .update(updateData)
        .eq('id', meeting.id);

      if (error) throw error;

      toast.success(`تم تغيير الحالة إلى ${statusConfig[newStatus]?.label}`);
      fetchMeetings();
    } catch (error) {
      console.error('Error changing status:', error);
      toast.error('حدث خطأ في تغيير الحالة');
    }
  };

  const sendClientNotification = async (
    meeting: MeetingRequest, 
    action: 'confirmed' | 'cancelled',
    confirmedDate?: Date
  ) => {
    try {
      const recipientEmail = meeting.requester?.email || meeting.organization?.contact_email;
      if (!recipientEmail) return;

      await supabase.functions.invoke('send-client-notification', {
        body: {
          type: action === 'confirmed' ? 'meeting_confirmed' : 'meeting_cancelled',
          recipient_email: recipientEmail,
          recipient_name: meeting.requester?.full_name || meeting.organization?.name,
          data: {
            subject: meeting.subject,
            meeting_type: meetingTypes[meeting.meeting_type]?.label || meeting.meeting_type,
            confirmed_date: confirmedDate ? format(confirmedDate, 'EEEE d MMMM yyyy', { locale: ar }) : undefined,
            confirmed_time: confirmedDate ? format(confirmedDate, 'HH:mm') : undefined,
            meeting_link: confirmForm.meeting_link,
            admin_notes: action === 'confirmed' ? confirmForm.admin_notes : rejectForm.admin_notes
          }
        }
      });
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  };

  // Assign meeting to staff
  const handleOpenAssignDialog = (meeting: MeetingRequest) => {
    setMeetingToAssign(meeting);
    setSelectedStaffId(meeting.assigned_staff || '');
    setStaffNote(meeting.admin_notes || '');
    setAssignDialogOpen(true);
  };

  const handleAssignMeeting = async () => {
    if (!meetingToAssign || !selectedStaffId) {
      toast.error('يرجى اختيار موظف');
      return;
    }

    setAssigning(true);
    try {
      const { error } = await supabase
        .from('meeting_requests')
        .update({
          assigned_staff: selectedStaffId,
          admin_notes: staffNote || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', meetingToAssign.id);

      if (error) throw error;

      // Get staff details for notification
      const staff = staffMembers.find(s => s.id === selectedStaffId);
      if (staff) {
        // Get staff user_id for in-app notification
        const { data: staffData } = await supabase
          .from('staff_members')
          .select('user_id')
          .eq('id', selectedStaffId)
          .single();

        const staffUserId = staffData?.user_id;
        if (staffUserId) {
          await supabase.from('user_notifications').insert({
            user_id: staffUserId,
            title: '📅 اجتماع جديد موجه إليك',
            message: `تم توجيه اجتماع "${meetingToAssign.subject}" إليك${staffNote ? ` - ملاحظة: ${staffNote}` : ''}`,
            type: 'meeting_assigned',
          });
        }

        // Send email notification
        await supabase.functions.invoke('send-staff-notification', {
          body: {
            type: 'meeting_assigned',
            staff_email: staff.email,
            staff_name: staff.full_name,
            data: {
              meeting_subject: meetingToAssign.subject,
              meeting_date: meetingToAssign.preferred_date ? format(parseISO(meetingToAssign.preferred_date), 'EEEE d MMMM yyyy - HH:mm', { locale: ar }) : undefined,
              organization_name: meetingToAssign.organization?.name,
              admin_note: staffNote,
            },
          },
        });
      }

      toast.success('تم توجيه الاجتماع للموظف بنجاح');
      setAssignDialogOpen(false);
      setMeetingToAssign(null);
      setSelectedStaffId('');
      setStaffNote('');
      fetchMeetings();
    } catch (error: any) {
      console.error('Error assigning meeting:', error);
      toast.error(error.message || 'حدث خطأ');
    } finally {
      setAssigning(false);
    }
  };

  const resetForms = () => {
    setConfirmForm({ confirmed_date: '', confirmed_time: '', meeting_link: '', admin_notes: '' });
    setRejectForm({ admin_notes: '' });
    setSelectedMeeting(null);
    setActionType(null);
  };

  const openActionDialog = (meeting: MeetingRequest, type: 'confirm' | 'reject' | 'view') => {
    setSelectedMeeting(meeting);
    setActionType(type);
    
    if (type === 'confirm' && meeting.preferred_date) {
      const prefDate = parseISO(meeting.preferred_date);
      setConfirmForm({
        confirmed_date: format(prefDate, 'yyyy-MM-dd'),
        confirmed_time: format(prefDate, 'HH:mm'),
        meeting_link: meeting.meeting_link || '',
        admin_notes: meeting.admin_notes || ''
      });
    }
    
    setDialogOpen(true);
  };

  const filteredMeetings = meetings.filter(meeting => {
    const matchesSearch = !searchQuery || 
      meeting.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      meeting.organization?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      meeting.requester?.full_name?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || meeting.status === statusFilter;
    const matchesTab = activeTab === 'all' || meeting.status === activeTab;

    return matchesSearch && matchesStatus && matchesTab;
  });

  const getStats = () => {
    const pending = meetings.filter(m => m.status === 'pending').length;
    const confirmed = meetings.filter(m => m.status === 'confirmed').length;
    const completed = meetings.filter(m => m.status === 'completed').length;
    const cancelled = meetings.filter(m => m.status === 'cancelled').length;
    return { pending, confirmed, completed, cancelled, total: meetings.length };
  };

  const stats = getStats();

  const formatDateTime = (dateStr: string) => {
    const date = parseISO(dateStr);
    let dayLabel = format(date, 'EEEE', { locale: ar });
    
    if (isToday(date)) dayLabel = 'اليوم';
    else if (isTomorrow(date)) dayLabel = 'غداً';

    return {
      day: dayLabel,
      date: format(date, 'd MMMM yyyy', { locale: ar }),
      time: format(date, 'HH:mm'),
      isPast: isPast(date)
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <Calendar className="h-7 w-7 text-primary" />
          إدارة طلبات الاجتماعات
        </h1>
        <p className="text-muted-foreground mt-1">إدارة ومتابعة طلبات الاجتماعات من العملاء</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-100">
                <CalendarDays className="h-5 w-5 text-yellow-700" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.pending}</p>
                <p className="text-xs text-muted-foreground">قيد الانتظار</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100">
                <CalendarCheck className="h-5 w-5 text-green-700" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.confirmed}</p>
                <p className="text-xs text-muted-foreground">مؤكد</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <CheckCircle2 className="h-5 w-5 text-blue-700" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.completed}</p>
                <p className="text-xs text-muted-foreground">منتهي</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100">
                <CalendarX className="h-5 w-5 text-red-700" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.cancelled}</p>
                <p className="text-xs text-muted-foreground">ملغي</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100">
                <Calendar className="h-5 w-5 text-purple-700" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">الإجمالي</p>
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
                placeholder="بحث بالموضوع أو اسم المؤسسة..."
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

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full justify-start">
          <TabsTrigger value="pending" className="gap-2">
            <CalendarDays className="h-4 w-4" />
            قيد الانتظار
            {stats.pending > 0 && (
              <Badge variant="destructive" className="mr-1 h-5 w-5 p-0 justify-center">
                {stats.pending}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="confirmed" className="gap-2">
            <CalendarCheck className="h-4 w-4" />
            المؤكدة
          </TabsTrigger>
          <TabsTrigger value="completed" className="gap-2">
            <CheckCircle2 className="h-4 w-4" />
            المنتهية
          </TabsTrigger>
          <TabsTrigger value="all" className="gap-2">
            <Calendar className="h-4 w-4" />
            الكل
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          <Card>
            <CardContent className="p-0">
              <ScrollArea className="h-[600px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>المؤسسة / مقدم الطلب</TableHead>
                      <TableHead>الموضوع</TableHead>
                      <TableHead>نوع الاجتماع</TableHead>
                      <TableHead>الموعد المطلوب</TableHead>
                      <TableHead>الموظف المسؤول</TableHead>
                      <TableHead>الحالة</TableHead>
                      <TableHead className="text-center">الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMeetings.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                          <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                          <p>لا توجد طلبات اجتماعات</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredMeetings.map((meeting) => {
                        const dateInfo = formatDateTime(meeting.preferred_date);
                        const StatusIcon = statusConfig[meeting.status]?.icon || Calendar;
                        
                        return (
                          <TableRow key={meeting.id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-muted">
                                  <Building2 className="h-4 w-4 text-muted-foreground" />
                                </div>
                                <div>
                                  <p className="font-medium">{meeting.organization?.name || 'غير معروف'}</p>
                                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                                    <User className="h-3 w-3" />
                                    {meeting.requester?.full_name || meeting.requester?.email || '-'}
                                  </p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <p className="font-medium line-clamp-1">{meeting.subject}</p>
                              {meeting.description && (
                                <p className="text-xs text-muted-foreground line-clamp-1">{meeting.description}</p>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge className={meetingTypes[meeting.meeting_type]?.color || 'bg-gray-100 text-gray-800'}>
                                {meetingTypes[meeting.meeting_type]?.label || meeting.meeting_type}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className={`p-1.5 rounded ${dateInfo.isPast && meeting.status === 'pending' ? 'bg-red-100' : 'bg-muted'}`}>
                                  <Calendar className={`h-4 w-4 ${dateInfo.isPast && meeting.status === 'pending' ? 'text-red-600' : 'text-muted-foreground'}`} />
                                </div>
                                <div>
                                  <p className={`text-sm font-medium ${dateInfo.isPast && meeting.status === 'pending' ? 'text-red-600' : ''}`}>
                                    {dateInfo.day}
                                  </p>
                                  <p className="text-xs text-muted-foreground">{dateInfo.date}</p>
                                  <p className="text-xs font-medium flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {dateInfo.time}
                                  </p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              {meeting.staff ? (
                                <div className="flex items-center gap-2">
                                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                                    <User className="h-3.5 w-3.5 text-primary" />
                                  </div>
                                  <span className="text-sm font-medium">{meeting.staff.full_name}</span>
                                </div>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="gap-1 text-xs"
                                  onClick={() => handleOpenAssignDialog(meeting)}
                                >
                                  <UserPlus className="h-3 w-3" />
                                  توجيه
                                </Button>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge className={statusConfig[meeting.status]?.color || 'bg-gray-100'}>
                                <StatusIcon className="h-3 w-3 ml-1" />
                                {statusConfig[meeting.status]?.label || meeting.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center justify-center gap-2">
                                {meeting.status === 'pending' && (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="default"
                                      className="gap-1"
                                      onClick={() => openActionDialog(meeting, 'confirm')}
                                    >
                                      <CheckCircle2 className="h-4 w-4" />
                                      تأكيد
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      className="gap-1"
                                      onClick={() => openActionDialog(meeting, 'reject')}
                                    >
                                      <XCircle className="h-4 w-4" />
                                      رفض
                                    </Button>
                                  </>
                                )}
                                {meeting.status === 'confirmed' && (
                                  <>
                                    {meeting.meeting_link && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="gap-1"
                                        onClick={() => window.open(meeting.meeting_link!, '_blank')}
                                      >
                                        <Video className="h-4 w-4" />
                                        انضم
                                      </Button>
                                    )}
                                    <Button
                                      size="sm"
                                      variant="secondary"
                                      onClick={() => handleCompleteMeeting(meeting)}
                                    >
                                      تم الانتهاء
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleStatusChange(meeting, 'pending')}
                                    >
                                      إرجاع للانتظار
                                    </Button>
                                  </>
                                )}
                                {meeting.status === 'completed' && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleStatusChange(meeting, 'confirmed')}
                                  >
                                    إرجاع لمؤكد
                                  </Button>
                                )}
                                {meeting.status === 'cancelled' && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleStatusChange(meeting, 'pending')}
                                  >
                                    إعادة فتح
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => openActionDialog(meeting, 'view')}
                                >
                                  التفاصيل
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Action Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) { resetForms(); setDialogOpen(false); } }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {actionType === 'confirm' && <CheckCircle2 className="h-5 w-5 text-green-600" />}
              {actionType === 'reject' && <XCircle className="h-5 w-5 text-red-600" />}
              {actionType === 'view' && <Calendar className="h-5 w-5 text-primary" />}
              {actionType === 'confirm' && 'تأكيد الاجتماع'}
              {actionType === 'reject' && 'رفض طلب الاجتماع'}
              {actionType === 'view' && 'تفاصيل الاجتماع'}
            </DialogTitle>
            <DialogDescription>
              {selectedMeeting?.subject}
            </DialogDescription>
          </DialogHeader>

          {selectedMeeting && (
            <div className="space-y-6">
              {/* Meeting Info */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                <div>
                  <p className="text-xs text-muted-foreground">المؤسسة</p>
                  <p className="font-medium">{selectedMeeting.organization?.name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">مقدم الطلب</p>
                  <p className="font-medium">{selectedMeeting.requester?.full_name || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">نوع الاجتماع</p>
                  <Badge className={meetingTypes[selectedMeeting.meeting_type]?.color}>
                    {meetingTypes[selectedMeeting.meeting_type]?.label}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">المدة</p>
                  <p className="font-medium">{selectedMeeting.duration_minutes} دقيقة</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground">الموعد المفضل</p>
                  <p className="font-medium">
                    {format(parseISO(selectedMeeting.preferred_date), 'EEEE d MMMM yyyy - HH:mm', { locale: ar })}
                  </p>
                </div>
                {selectedMeeting.alternative_date && (
                  <div className="col-span-2">
                    <p className="text-xs text-muted-foreground">الموعد البديل</p>
                    <p className="font-medium">
                      {format(parseISO(selectedMeeting.alternative_date), 'EEEE d MMMM yyyy - HH:mm', { locale: ar })}
                    </p>
                  </div>
                )}
                {selectedMeeting.description && (
                  <div className="col-span-2">
                    <p className="text-xs text-muted-foreground">الوصف</p>
                    <p className="text-sm">{selectedMeeting.description}</p>
                  </div>
                )}
              </div>

              {/* Confirm Form */}
              {actionType === 'confirm' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>تاريخ الاجتماع المؤكد *</Label>
                      <Input
                        type="date"
                        value={confirmForm.confirmed_date}
                        onChange={(e) => setConfirmForm({ ...confirmForm, confirmed_date: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>وقت الاجتماع *</Label>
                      <Input
                        type="time"
                        value={confirmForm.confirmed_time}
                        onChange={(e) => setConfirmForm({ ...confirmForm, confirmed_time: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Video className="h-4 w-4" />
                      رابط الاجتماع (Zoom, Teams, Google Meet)
                    </Label>
                    <Input
                      placeholder="https://zoom.us/j/..."
                      value={confirmForm.meeting_link}
                      onChange={(e) => setConfirmForm({ ...confirmForm, meeting_link: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>ملاحظات للعميل (اختياري)</Label>
                    <Textarea
                      placeholder="أي ملاحظات أو تعليمات للعميل..."
                      value={confirmForm.admin_notes}
                      onChange={(e) => setConfirmForm({ ...confirmForm, admin_notes: e.target.value })}
                      rows={3}
                    />
                  </div>
                </div>
              )}

              {/* Reject Form */}
              {actionType === 'reject' && (
                <div className="space-y-4">
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-800">
                      سيتم إلغاء هذا الطلب وإشعار العميل بالرفض
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>سبب الرفض (سيُرسل للعميل)</Label>
                    <Textarea
                      placeholder="مثال: عذراً، الموعد المطلوب غير متاح. يرجى اختيار موعد آخر."
                      value={rejectForm.admin_notes}
                      onChange={(e) => setRejectForm({ ...rejectForm, admin_notes: e.target.value })}
                      rows={3}
                    />
                  </div>
                </div>
              )}

              {/* View - Show confirmed details */}
              {actionType === 'view' && selectedMeeting.status === 'confirmed' && selectedMeeting.confirmed_date && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg space-y-2">
                  <p className="font-medium text-green-800">الموعد المؤكد:</p>
                  <p className="text-sm">
                    {format(parseISO(selectedMeeting.confirmed_date), 'EEEE d MMMM yyyy - HH:mm', { locale: ar })}
                  </p>
                  {selectedMeeting.meeting_link && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2 mt-2"
                      onClick={() => window.open(selectedMeeting.meeting_link!, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4" />
                      فتح رابط الاجتماع
                    </Button>
                  )}
                </div>
              )}

              {selectedMeeting.admin_notes && actionType === 'view' && (
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">ملاحظات الإدارة</p>
                  <p className="text-sm">{selectedMeeting.admin_notes}</p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => { resetForms(); setDialogOpen(false); }}>
              إغلاق
            </Button>
            {actionType === 'confirm' && (
              <Button onClick={handleConfirmMeeting} disabled={actionLoading} className="gap-2">
                {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                تأكيد وإرسال الإشعار
              </Button>
            )}
            {actionType === 'reject' && (
              <Button variant="destructive" onClick={handleRejectMeeting} disabled={actionLoading} className="gap-2">
                {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                رفض الطلب
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Staff Assignment Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              توجيه الاجتماع لموظف
            </DialogTitle>
            <DialogDescription>
              {meetingToAssign?.subject}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {meetingToAssign && (
              <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span>{meetingToAssign.organization?.name}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>{format(parseISO(meetingToAssign.preferred_date), 'dd/MM/yyyy HH:mm', { locale: ar })}</span>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>اختر الموظف *</Label>
              <Select value={selectedStaffId} onValueChange={setSelectedStaffId}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر موظف..." />
                </SelectTrigger>
                <SelectContent>
                  {staffMembers.map((staff) => (
                    <SelectItem key={staff.id} value={staff.id}>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        {staff.full_name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>ملاحظة للموظف (اختياري)</Label>
              <Textarea
                value={staffNote}
                onChange={(e) => setStaffNote(e.target.value)}
                placeholder="أضف ملاحظة أو تعليمات للموظف..."
                className="min-h-[80px]"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={handleAssignMeeting} disabled={!selectedStaffId || assigning}>
              <Send className="h-4 w-4 ml-2" />
              {assigning ? 'جاري التوجيه...' : 'توجيه الاجتماع'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
