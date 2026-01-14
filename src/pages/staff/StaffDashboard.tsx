import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useStaffAuth } from '@/hooks/useStaffAuth';
import { format, parseISO } from 'date-fns';
import { ar } from 'date-fns/locale';
import {
  Ticket,
  Calendar,
  FileText,
  Clock,
  AlertCircle,
  CheckCircle,
  ArrowLeft,
  User,
  Building2,
  Loader2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

interface AssignedTicket {
  id: string;
  ticket_number: string;
  subject: string;
  status: string;
  priority: string;
  created_at: string;
  admin_note: string | null;
}

interface AssignedMeeting {
  id: string;
  subject: string;
  status: string;
  meeting_type: string;
  confirmed_date: string | null;
  preferred_date: string;
  organization?: {
    name: string;
  };
}

const statusConfig: Record<string, { label: string; color: string }> = {
  open: { label: 'مفتوحة', color: 'bg-blue-100 text-blue-700' },
  in_progress: { label: 'قيد المعالجة', color: 'bg-yellow-100 text-yellow-700' },
  resolved: { label: 'تم الحل', color: 'bg-green-100 text-green-700' },
  closed: { label: 'مغلقة', color: 'bg-gray-100 text-gray-700' },
  pending: { label: 'قيد الانتظار', color: 'bg-yellow-100 text-yellow-700' },
  confirmed: { label: 'مؤكد', color: 'bg-green-100 text-green-700' },
  completed: { label: 'منتهي', color: 'bg-gray-100 text-gray-700' },
  cancelled: { label: 'ملغي', color: 'bg-red-100 text-red-700' },
};

const priorityConfig: Record<string, { label: string; color: string }> = {
  low: { label: 'منخفضة', color: 'bg-green-50 text-green-600' },
  medium: { label: 'متوسطة', color: 'bg-yellow-50 text-yellow-600' },
  high: { label: 'عالية', color: 'bg-red-50 text-red-600' },
};

const meetingTypes: Record<string, string> = {
  general: 'اجتماع عام',
  training: 'جلسة تدريبية',
  support: 'دعم فني',
  demo: 'عرض توضيحي',
  consultation: 'استشارة',
};

export default function StaffDashboard() {
  const { permissions, user } = useStaffAuth();
  const [tickets, setTickets] = useState<AssignedTicket[]>([]);
  const [meetings, setMeetings] = useState<AssignedMeeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [staffName, setStaffName] = useState('');

  useEffect(() => {
    fetchData();
  }, [permissions.staffId]);

  const fetchData = async () => {
    if (!permissions.staffId) return;

    setLoading(true);
    try {
      // Fetch staff name
      const { data: staffData } = await supabase
        .from('staff_members')
        .select('full_name')
        .eq('id', permissions.staffId)
        .single();
      
      if (staffData) {
        setStaffName(staffData.full_name);
      }

      // Fetch assigned tickets
      if (permissions.canReplyTickets) {
        const { data: ticketsData } = await supabase
          .from('support_tickets')
          .select('id, ticket_number, subject, status, priority, created_at, admin_note')
          .eq('assigned_to_staff', permissions.staffId)
          .in('status', ['open', 'in_progress'])
          .order('created_at', { ascending: false })
          .limit(5);
        
        setTickets((ticketsData as AssignedTicket[]) || []);
      }

      // Fetch assigned meetings
      if (permissions.canAttendMeetings) {
        const { data: meetingsData } = await supabase
          .from('meeting_requests')
          .select('id, subject, status, meeting_type, confirmed_date, preferred_date, organization_id')
          .eq('assigned_staff', permissions.staffId)
          .in('status', ['pending', 'confirmed'])
          .order('preferred_date', { ascending: true })
          .limit(5);

        // Fetch organization names
        if (meetingsData) {
          const meetingsWithOrg = await Promise.all(
            meetingsData.map(async (meeting: any) => {
              const { data: orgData } = await supabase
                .from('client_organizations')
                .select('name')
                .eq('id', meeting.organization_id)
                .single();
              
              return {
                ...meeting,
                organization: orgData || undefined,
              };
            })
          );
          setMeetings(meetingsWithOrg);
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const openTickets = tickets.filter(t => t.status === 'open' || t.status === 'in_progress').length;
  const upcomingMeetings = meetings.filter(m => m.status === 'pending' || m.status === 'confirmed').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">مرحباً، {staffName}</h1>
        <p className="text-muted-foreground">هذه لوحة التحكم الخاصة بك لإدارة المهام الموجهة إليك</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {permissions.canReplyTickets && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-blue-100">
                  <Ticket className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{openTickets}</div>
                  <div className="text-sm text-muted-foreground">تذاكر نشطة</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        
        {permissions.canAttendMeetings && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-green-100">
                  <Calendar className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{upcomingMeetings}</div>
                  <div className="text-sm text-muted-foreground">اجتماعات قادمة</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {permissions.canManageContent && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-purple-100">
                  <FileText className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold">
                    <Link to="/staff/content" className="hover:underline">إدارة</Link>
                  </div>
                  <div className="text-sm text-muted-foreground">المحتوى</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Assigned Tickets */}
        {permissions.canReplyTickets && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Ticket className="h-5 w-5" />
                  التذاكر الموجهة إليك
                </CardTitle>
                <CardDescription>آخر التذاكر التي تحتاج متابعتك</CardDescription>
              </div>
              <Link to="/staff/tickets">
                <Button variant="ghost" size="sm" className="gap-1">
                  عرض الكل
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {tickets.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Ticket className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>لا توجد تذاكر موجهة إليك حالياً</p>
                </div>
              ) : (
                <ScrollArea className="h-[300px]">
                  <div className="space-y-3">
                    {tickets.map((ticket) => (
                      <Link key={ticket.id} to={`/staff/tickets/${ticket.id}`}>
                        <div className="p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-mono text-xs text-muted-foreground">
                                  {ticket.ticket_number}
                                </span>
                                <Badge className={priorityConfig[ticket.priority]?.color || ''}>
                                  {priorityConfig[ticket.priority]?.label}
                                </Badge>
                              </div>
                              <h4 className="font-medium truncate">{ticket.subject}</h4>
                              {ticket.admin_note && (
                                <p className="text-xs text-orange-600 mt-1 flex items-center gap-1">
                                  <AlertCircle className="h-3 w-3" />
                                  ملاحظة: {ticket.admin_note}
                                </p>
                              )}
                            </div>
                            <Badge className={statusConfig[ticket.status]?.color || ''}>
                              {statusConfig[ticket.status]?.label}
                            </Badge>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        )}

        {/* Assigned Meetings */}
        {permissions.canAttendMeetings && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  الاجتماعات الموجهة إليك
                </CardTitle>
                <CardDescription>الاجتماعات القادمة المطلوب حضورها</CardDescription>
              </div>
              <Link to="/staff/meetings">
                <Button variant="ghost" size="sm" className="gap-1">
                  عرض الكل
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {meetings.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>لا توجد اجتماعات موجهة إليك حالياً</p>
                </div>
              ) : (
                <ScrollArea className="h-[300px]">
                  <div className="space-y-3">
                    {meetings.map((meeting) => (
                      <Link key={meeting.id} to={`/staff/meetings/${meeting.id}`}>
                        <div className="p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="outline">
                                  {meetingTypes[meeting.meeting_type] || meeting.meeting_type}
                                </Badge>
                                <Badge className={statusConfig[meeting.status]?.color || ''}>
                                  {statusConfig[meeting.status]?.label}
                                </Badge>
                              </div>
                              <h4 className="font-medium truncate">{meeting.subject}</h4>
                              {meeting.organization && (
                                <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                                  <Building2 className="h-3 w-3" />
                                  {meeting.organization.name}
                                </p>
                              )}
                              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                <Clock className="h-3 w-3" />
                                {format(
                                  parseISO(meeting.confirmed_date || meeting.preferred_date),
                                  'EEEE d MMMM yyyy - HH:mm',
                                  { locale: ar }
                                )}
                              </p>
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
