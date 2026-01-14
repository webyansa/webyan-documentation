import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useStaffAuth } from '@/hooks/useStaffAuth';
import { format, parseISO, isToday, isTomorrow, isPast } from 'date-fns';
import { ar } from 'date-fns/locale';
import {
  Calendar,
  Clock,
  Building2,
  User,
  CheckCircle,
  Video,
  Loader2,
  Search,
  Filter,
  ExternalLink,
  FileText,
  CalendarDays,
  CalendarCheck,
  CalendarX
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
import { toast } from 'sonner';

interface MeetingRequest {
  id: string;
  organization_id: string;
  meeting_type: string;
  subject: string;
  description: string | null;
  preferred_date: string;
  confirmed_date: string | null;
  duration_minutes: number;
  status: string;
  meeting_link: string | null;
  admin_notes: string | null;
  closure_report: string | null;
  organization?: {
    name: string;
    contact_email: string;
  };
  requester?: {
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
  completed: { label: 'منتهي', color: 'bg-gray-100 text-gray-800', icon: CheckCircle },
  rescheduled: { label: 'معاد جدولته', color: 'bg-blue-100 text-blue-800', icon: Calendar },
};

export default function StaffMeetings() {
  const { permissions, user } = useStaffAuth();
  const navigate = useNavigate();
  const [meetings, setMeetings] = useState<MeetingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('confirmed');

  // Complete meeting dialog
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<MeetingRequest | null>(null);
  const [closureReport, setClosureReport] = useState('');
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    if (!permissions.canAttendMeetings) {
      navigate('/staff');
      return;
    }
    fetchMeetings();
  }, [permissions.staffId]);

  const fetchMeetings = async () => {
    if (!permissions.staffId) return;

    try {
      const { data, error } = await supabase
        .from('meeting_requests')
        .select('*')
        .eq('assigned_staff', permissions.staffId)
        .order('preferred_date', { ascending: true });

      if (error) throw error;

      // Fetch organization details
      const meetingsWithDetails = await Promise.all(
        (data || []).map(async (meeting: any) => {
          const [orgResult, requesterResult] = await Promise.all([
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
              : Promise.resolve({ data: null })
          ]);

          return {
            ...meeting,
            organization: orgResult.data || undefined,
            requester: requesterResult.data || undefined
          };
        })
      );

      setMeetings(meetingsWithDetails);
    } catch (error) {
      console.error('Error fetching meetings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCompleteDialog = (meeting: MeetingRequest) => {
    setSelectedMeeting(meeting);
    setClosureReport(meeting.closure_report || '');
    setCompleteDialogOpen(true);
  };

  const handleCompleteMeeting = async () => {
    if (!selectedMeeting || !closureReport.trim()) {
      toast.error('يرجى كتابة تقرير الاجتماع');
      return;
    }

    setCompleting(true);
    try {
      const { error } = await supabase
        .from('meeting_requests')
        .update({
          status: 'completed',
          closure_report: closureReport,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedMeeting.id);

      if (error) throw error;

      toast.success('تم إكمال الاجتماع بنجاح');
      setCompleteDialogOpen(false);
      setClosureReport('');
      fetchMeetings();
    } catch (error: any) {
      console.error('Error completing meeting:', error);
      toast.error(error.message);
    } finally {
      setCompleting(false);
    }
  };

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

  const filteredMeetings = meetings.filter(meeting => {
    const matchesSearch = !searchQuery || 
      meeting.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      meeting.organization?.name?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || meeting.status === statusFilter;
    const matchesTab = activeTab === 'all' || meeting.status === activeTab;

    return matchesSearch && matchesStatus && matchesTab;
  });

  const stats = {
    pending: meetings.filter(m => m.status === 'pending').length,
    confirmed: meetings.filter(m => m.status === 'confirmed').length,
    completed: meetings.filter(m => m.status === 'completed').length,
    total: meetings.length
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
          الاجتماعات الموجهة إليك
        </h1>
        <p className="text-muted-foreground mt-1">إدارة ومتابعة الاجتماعات المخصصة لك</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
                <CheckCircle className="h-5 w-5 text-blue-700" />
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
          <TabsTrigger value="confirmed" className="gap-2">
            <CalendarCheck className="h-4 w-4" />
            مؤكد ({stats.confirmed})
          </TabsTrigger>
          <TabsTrigger value="pending" className="gap-2">
            <CalendarDays className="h-4 w-4" />
            قيد الانتظار ({stats.pending})
          </TabsTrigger>
          <TabsTrigger value="completed" className="gap-2">
            <CheckCircle className="h-4 w-4" />
            منتهي ({stats.completed})
          </TabsTrigger>
          <TabsTrigger value="all" className="gap-2">
            <Calendar className="h-4 w-4" />
            الكل ({stats.total})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>الموضوع</TableHead>
                    <TableHead>المؤسسة</TableHead>
                    <TableHead>النوع</TableHead>
                    <TableHead>التاريخ والوقت</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>الرابط</TableHead>
                    <TableHead>الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMeetings.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        لا توجد اجتماعات
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredMeetings.map((meeting) => {
                      const dateInfo = formatDateTime(meeting.confirmed_date || meeting.preferred_date);
                      return (
                        <TableRow key={meeting.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{meeting.subject}</div>
                              {meeting.description && (
                                <div className="text-sm text-muted-foreground line-clamp-1">
                                  {meeting.description}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-muted-foreground" />
                              <span>{meeting.organization?.name || '-'}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={meetingTypes[meeting.meeting_type]?.color || ''}>
                              {meetingTypes[meeting.meeting_type]?.label || meeting.meeting_type}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div className="font-medium">{dateInfo.day}</div>
                              <div className="text-muted-foreground">{dateInfo.date}</div>
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                {dateInfo.time}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={statusConfig[meeting.status]?.color || ''}>
                              {statusConfig[meeting.status]?.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {meeting.meeting_link ? (
                              <a
                                href={meeting.meeting_link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-primary hover:underline"
                              >
                                <Video className="h-4 w-4" />
                                انضمام
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {meeting.status === 'confirmed' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenCompleteDialog(meeting)}
                                className="gap-1"
                              >
                                <CheckCircle className="h-4 w-4" />
                                إكمال
                              </Button>
                            )}
                            {meeting.status === 'completed' && meeting.closure_report && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedMeeting(meeting);
                                  setClosureReport(meeting.closure_report || '');
                                  setCompleteDialogOpen(true);
                                }}
                                className="gap-1"
                              >
                                <FileText className="h-4 w-4" />
                                التقرير
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Complete Meeting Dialog */}
      <Dialog open={completeDialogOpen} onOpenChange={setCompleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {selectedMeeting?.status === 'completed' ? 'تقرير الاجتماع' : 'إكمال الاجتماع'}
            </DialogTitle>
            <DialogDescription>
              {selectedMeeting?.subject}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>{selectedMeeting?.status === 'completed' ? 'التقرير' : 'تقرير الاجتماع *'}</Label>
              <Textarea
                placeholder="اكتب ملخص الاجتماع والنقاط المهمة التي تمت مناقشتها..."
                value={closureReport}
                onChange={(e) => setClosureReport(e.target.value)}
                className="mt-2 min-h-[150px]"
                readOnly={selectedMeeting?.status === 'completed'}
              />
            </div>
          </div>

          {selectedMeeting?.status !== 'completed' && (
            <DialogFooter>
              <Button variant="outline" onClick={() => setCompleteDialogOpen(false)}>
                إلغاء
              </Button>
              <Button onClick={handleCompleteMeeting} disabled={completing || !closureReport.trim()}>
                {completing ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : null}
                إكمال الاجتماع
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
