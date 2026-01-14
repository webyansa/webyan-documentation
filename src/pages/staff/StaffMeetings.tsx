import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useStaffAuth } from '@/hooks/useStaffAuth';
import { format, parseISO, isToday, isTomorrow, isPast, isFuture } from 'date-fns';
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
  CalendarX,
  Star,
  Eye,
  ClipboardList,
  TrendingUp,
  BarChart3,
  AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import MeetingDetailsDialog from '@/components/meetings/MeetingDetailsDialog';
import StaffMeetingReportDialog from '@/components/meetings/StaffMeetingReportDialog';

interface MeetingRating {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

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
  staff_recommendation: string | null;
  staff_notes: string | null;
  meeting_outcome: string | null;
  report_submitted_at: string | null;
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
  rating?: MeetingRating;
}

const meetingTypes: Record<string, { label: string; color: string; bgColor: string }> = {
  general: { label: 'اجتماع عام', color: 'text-blue-700', bgColor: 'bg-blue-50 border-blue-200' },
  training: { label: 'جلسة تدريبية', color: 'text-emerald-700', bgColor: 'bg-emerald-50 border-emerald-200' },
  support: { label: 'دعم فني', color: 'text-orange-700', bgColor: 'bg-orange-50 border-orange-200' },
  demo: { label: 'عرض توضيحي', color: 'text-violet-700', bgColor: 'bg-violet-50 border-violet-200' },
  consultation: { label: 'استشارة', color: 'text-pink-700', bgColor: 'bg-pink-50 border-pink-200' },
};

const statusConfig: Record<string, { label: string; color: string; bgColor: string; icon: React.ComponentType<{ className?: string }> }> = {
  pending: { label: 'قيد الانتظار', color: 'text-amber-700', bgColor: 'bg-amber-50 border-amber-200', icon: CalendarDays },
  confirmed: { label: 'مؤكد', color: 'text-emerald-700', bgColor: 'bg-emerald-50 border-emerald-200', icon: CalendarCheck },
  cancelled: { label: 'ملغي', color: 'text-red-700', bgColor: 'bg-red-50 border-red-200', icon: CalendarX },
  completed: { label: 'منتهي', color: 'text-slate-700', bgColor: 'bg-slate-50 border-slate-200', icon: CheckCircle },
  rescheduled: { label: 'معاد جدولته', color: 'text-blue-700', bgColor: 'bg-blue-50 border-blue-200', icon: Calendar },
};

const outcomeConfig: Record<string, { label: string; color: string; icon: any }> = {
  successful: { label: 'تم بنجاح', color: 'text-emerald-600', icon: CheckCircle },
  no_show: { label: 'لم يحضر العميل', color: 'text-orange-600', icon: AlertCircle },
  rescheduled_by_client: { label: 'أجله العميل', color: 'text-blue-600', icon: CalendarX },
  failed: { label: 'تعذر الإتمام', color: 'text-red-600', icon: CalendarX },
};

const StarRating = ({ rating }: { rating: number }) => (
  <div className="flex items-center gap-0.5">
    {[1, 2, 3, 4, 5].map((star) => (
      <Star
        key={star}
        className={`h-4 w-4 ${star <= rating ? 'fill-amber-400 text-amber-400' : 'fill-muted text-muted'}`}
      />
    ))}
  </div>
);

export default function StaffMeetings() {
  const { permissions, user } = useStaffAuth();
  const navigate = useNavigate();
  const [meetings, setMeetings] = useState<MeetingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('confirmed');

  // Dialogs
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<MeetingRequest | null>(null);

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

      // Fetch organization, requester, and rating details
      const meetingsWithDetails = await Promise.all(
        (data || []).map(async (meeting: any) => {
          const [orgResult, requesterResult, ratingResult] = await Promise.all([
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
            supabase
              .from('meeting_ratings')
              .select('id, rating, comment, created_at')
              .eq('meeting_id', meeting.id)
              .maybeSingle()
          ]);

          return {
            ...meeting,
            organization: orgResult.data || undefined,
            requester: requesterResult.data || undefined,
            rating: ratingResult.data || undefined
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

  const openDetailsDialog = (meeting: MeetingRequest) => {
    setSelectedMeeting(meeting);
    setDetailsDialogOpen(true);
  };

  const openReportDialog = (meeting: MeetingRequest) => {
    setSelectedMeeting(meeting);
    setReportDialogOpen(true);
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
      isPast: isPast(date),
      isFuture: isFuture(date)
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
    total: meetings.length,
    withRating: meetings.filter(m => m.rating).length,
    avgRating: meetings.filter(m => m.rating).length > 0 
      ? meetings.filter(m => m.rating).reduce((sum, m) => sum + (m.rating?.rating || 0), 0) / meetings.filter(m => m.rating).length 
      : 0,
    upcoming: meetings.filter(m => m.status === 'confirmed' && isFuture(parseISO(m.confirmed_date || m.preferred_date))).length
  };

  const completionRate = stats.total > 0 ? (stats.completed / stats.total) * 100 : 0;

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5">
              <Calendar className="h-6 w-6 text-primary" />
            </div>
            الاجتماعات الموجهة إليك
          </h1>
          <p className="text-muted-foreground mt-1">إدارة ومتابعة الاجتماعات المخصصة لك</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="bg-gradient-to-br from-amber-50 to-amber-100/50 border-amber-200/50 dark:from-amber-950/20 dark:to-amber-900/10 dark:border-amber-800/30">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-900/30 shadow-sm">
                <CalendarDays className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">{stats.pending}</p>
                <p className="text-xs text-amber-600/80 dark:text-amber-400/80">قيد الانتظار</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-emerald-200/50 dark:from-emerald-950/20 dark:to-emerald-900/10 dark:border-emerald-800/30">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 shadow-sm">
                <CalendarCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{stats.confirmed}</p>
                <p className="text-xs text-emerald-600/80 dark:text-emerald-400/80">مؤكد</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200/50 dark:from-blue-950/20 dark:to-blue-900/10 dark:border-blue-800/30">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-100 dark:bg-blue-900/30 shadow-sm">
                <CheckCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">{stats.completed}</p>
                <p className="text-xs text-blue-600/80 dark:text-blue-400/80">منتهي</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-violet-50 to-violet-100/50 border-violet-200/50 dark:from-violet-950/20 dark:to-violet-900/10 dark:border-violet-800/30">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-violet-100 dark:bg-violet-900/30 shadow-sm">
                <Star className="h-5 w-5 text-violet-600 dark:text-violet-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-violet-700 dark:text-violet-400">{stats.avgRating.toFixed(1)}</p>
                <p className="text-xs text-violet-600/80 dark:text-violet-400/80">متوسط التقييم</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-teal-50 to-teal-100/50 border-teal-200/50 dark:from-teal-950/20 dark:to-teal-900/10 dark:border-teal-800/30">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-teal-100 dark:bg-teal-900/30 shadow-sm">
                <TrendingUp className="h-5 w-5 text-teal-600 dark:text-teal-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-teal-700 dark:text-teal-400">{completionRate.toFixed(0)}%</p>
                <p className="text-xs text-teal-600/80 dark:text-teal-400/80">نسبة الإنجاز</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-slate-50 to-slate-100/50 border-slate-200/50 dark:from-slate-950/20 dark:to-slate-900/10 dark:border-slate-800/30">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/50 shadow-sm">
                <BarChart3 className="h-5 w-5 text-slate-600 dark:text-slate-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-700 dark:text-slate-300">{stats.total}</p>
                <p className="text-xs text-slate-500">الإجمالي</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Meetings Alert */}
      {stats.upcoming > 0 && (
        <Card className="border-primary/30 bg-gradient-to-l from-primary/5 via-primary/10 to-transparent">
          <CardContent className="py-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-primary/10">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-primary">لديك {stats.upcoming} اجتماع قادم</p>
                <p className="text-sm text-muted-foreground">تأكد من الاستعداد للاجتماعات القادمة</p>
              </div>
              <Button variant="outline" className="gap-2" onClick={() => setActiveTab('confirmed')}>
                <Eye className="h-4 w-4" />
                عرض الاجتماعات
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card className="shadow-sm">
        <CardContent className="pt-5 pb-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="بحث بالموضوع أو اسم المؤسسة..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-9 bg-muted/30 border-muted-foreground/10 focus:bg-background transition-colors"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px] bg-muted/30 border-muted-foreground/10">
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
        <TabsList className="w-full justify-start bg-muted/50 p-1 rounded-xl h-auto flex-wrap">
          <TabsTrigger value="confirmed" className="gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <CalendarCheck className="h-4 w-4" />
            مؤكد ({stats.confirmed})
          </TabsTrigger>
          <TabsTrigger value="pending" className="gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <CalendarDays className="h-4 w-4" />
            قيد الانتظار ({stats.pending})
          </TabsTrigger>
          <TabsTrigger value="completed" className="gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <CheckCircle className="h-4 w-4" />
            منتهي ({stats.completed})
          </TabsTrigger>
          <TabsTrigger value="all" className="gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Calendar className="h-4 w-4" />
            الكل ({stats.total})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          <Card className="shadow-sm overflow-hidden">
            <CardContent className="p-0">
              <ScrollArea className="h-[600px]">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                      <TableHead className="font-semibold">الموضوع</TableHead>
                      <TableHead className="font-semibold">المؤسسة</TableHead>
                      <TableHead className="font-semibold">النوع</TableHead>
                      <TableHead className="font-semibold">الموعد</TableHead>
                      <TableHead className="font-semibold">الحالة</TableHead>
                      <TableHead className="font-semibold">تقييم العميل</TableHead>
                      <TableHead className="font-semibold">الرابط</TableHead>
                      <TableHead className="text-center font-semibold">الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMeetings.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-16 text-muted-foreground">
                          <Calendar className="h-16 w-16 mx-auto mb-4 opacity-20" />
                          <p className="text-lg font-medium">لا توجد اجتماعات</p>
                          <p className="text-sm mt-1">ستظهر هنا الاجتماعات الموجهة إليك</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredMeetings.map((meeting) => {
                        const dateInfo = formatDateTime(meeting.confirmed_date || meeting.preferred_date);
                        const StatusIcon = statusConfig[meeting.status]?.icon || Calendar;
                        const OutcomeIcon = meeting.meeting_outcome ? outcomeConfig[meeting.meeting_outcome]?.icon : null;
                        
                        return (
                          <TableRow key={meeting.id} className="group hover:bg-muted/30 transition-colors">
                            <TableCell>
                              <div>
                                <p className="font-medium text-sm">{meeting.subject}</p>
                                {meeting.description && (
                                  <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                                    {meeting.description}
                                  </p>
                                )}
                                {meeting.closure_report && (
                                  <div className="flex items-center gap-1 mt-1">
                                    <FileText className="h-3 w-3 text-emerald-600" />
                                    <span className="text-xs text-emerald-600">تم رفع التقرير</span>
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Avatar className="h-8 w-8 bg-gradient-to-br from-blue-100 to-blue-50 border border-blue-200">
                                  <AvatarFallback className="text-blue-700 font-semibold text-xs">
                                    {meeting.organization?.name?.charAt(0) || 'م'}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <span className="text-sm font-medium">{meeting.organization?.name || '-'}</span>
                                  {meeting.requester && (
                                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                                      <User className="h-3 w-3" />
                                      {meeting.requester.full_name}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={`${meetingTypes[meeting.meeting_type]?.bgColor} ${meetingTypes[meeting.meeting_type]?.color} border`}>
                                {meetingTypes[meeting.meeting_type]?.label || meeting.meeting_type}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className={`p-2 rounded-lg ${dateInfo.isFuture && meeting.status === 'confirmed' ? 'bg-primary/10' : dateInfo.isPast ? 'bg-muted' : 'bg-muted'}`}>
                                  <Calendar className={`h-4 w-4 ${dateInfo.isFuture && meeting.status === 'confirmed' ? 'text-primary' : 'text-muted-foreground'}`} />
                                </div>
                                <div>
                                  <p className={`text-sm font-medium ${dateInfo.isFuture && meeting.status === 'confirmed' ? 'text-primary' : ''}`}>
                                    {dateInfo.day}
                                  </p>
                                  <p className="text-xs text-muted-foreground">{dateInfo.date}</p>
                                  <p className="text-xs font-medium flex items-center gap-1 text-muted-foreground">
                                    <Clock className="h-3 w-3" />
                                    {dateInfo.time}
                                  </p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <Badge variant="outline" className={`${statusConfig[meeting.status]?.bgColor} ${statusConfig[meeting.status]?.color} border`}>
                                  <StatusIcon className="h-3 w-3 ml-1" />
                                  {statusConfig[meeting.status]?.label}
                                </Badge>
                                {meeting.meeting_outcome && OutcomeIcon && (
                                  <div className={`flex items-center gap-1 text-xs ${outcomeConfig[meeting.meeting_outcome]?.color}`}>
                                    <OutcomeIcon className="h-3 w-3" />
                                    {outcomeConfig[meeting.meeting_outcome]?.label}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {meeting.rating ? (
                                <div className="flex flex-col items-center">
                                  <StarRating rating={meeting.rating.rating} />
                                  <span className="text-xs text-muted-foreground mt-0.5">{meeting.rating.rating}/5</span>
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">لم يتم التقييم</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {meeting.meeting_link ? (
                                <a
                                  href={meeting.meeting_link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-primary hover:underline text-sm font-medium"
                                >
                                  <Video className="h-4 w-4" />
                                  انضمام
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              ) : (
                                <span className="text-muted-foreground text-xs">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center justify-center gap-1.5">
                                {meeting.status === 'confirmed' && (
                                  <Button
                                    size="sm"
                                    className="gap-1 h-8 text-xs bg-emerald-600 hover:bg-emerald-700"
                                    onClick={() => openReportDialog(meeting)}
                                  >
                                    <ClipboardList className="h-3.5 w-3.5" />
                                    رفع تقرير
                                  </Button>
                                )}
                                {meeting.status === 'completed' && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="gap-1 h-8 text-xs"
                                    onClick={() => openReportDialog(meeting)}
                                  >
                                    <FileText className="h-3.5 w-3.5" />
                                    عرض التقرير
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="gap-1 h-8 text-xs"
                                  onClick={() => openDetailsDialog(meeting)}
                                >
                                  <Eye className="h-3.5 w-3.5" />
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

      {/* Meeting Details Dialog */}
      <MeetingDetailsDialog
        meeting={selectedMeeting}
        open={detailsDialogOpen}
        onOpenChange={setDetailsDialogOpen}
        userType="staff"
      />

      {/* Staff Meeting Report Dialog */}
      <StaffMeetingReportDialog
        meeting={selectedMeeting}
        open={reportDialogOpen}
        onOpenChange={setReportDialogOpen}
        onSuccess={fetchMeetings}
      />
    </div>
  );
}
