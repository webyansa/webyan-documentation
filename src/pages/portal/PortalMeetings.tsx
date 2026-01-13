import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { 
  Calendar, 
  Plus, 
  Clock,
  CheckCircle2,
  XCircle,
  Video,
  CalendarClock,
  ArrowLeft
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format, formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';

interface MeetingRequest {
  id: string;
  meeting_type: string;
  subject: string;
  description: string | null;
  preferred_date: string;
  alternative_date: string | null;
  duration_minutes: number;
  status: string;
  meeting_link: string | null;
  confirmed_date: string | null;
  created_at: string;
}

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: any }> = {
  pending: { label: 'في الانتظار', variant: 'secondary', icon: Clock },
  confirmed: { label: 'مؤكد', variant: 'default', icon: CheckCircle2 },
  completed: { label: 'مكتمل', variant: 'outline', icon: CheckCircle2 },
  cancelled: { label: 'ملغي', variant: 'destructive', icon: XCircle },
  rescheduled: { label: 'تم تغيير الموعد', variant: 'secondary', icon: CalendarClock },
};

const meetingTypeLabels: Record<string, string> = {
  general: 'اجتماع عام',
  training: 'جلسة تدريبية',
  support: 'دعم فني',
  demo: 'عرض توضيحي',
  consultation: 'استشارة',
};

const PortalMeetings = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [meetings, setMeetings] = useState<MeetingRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchMeetings();
    }
  }, [user]);

  const fetchMeetings = async () => {
    try {
      // Get organization ID first
      const { data: clientData } = await supabase
        .from('client_accounts')
        .select('organization_id')
        .eq('user_id', user?.id)
        .single();

      if (!clientData) return;

      const { data, error } = await supabase
        .from('meeting_requests')
        .select('*')
        .eq('organization_id', clientData.organization_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMeetings(data || []);
    } catch (error) {
      console.error('Error fetching meetings:', error);
    } finally {
      setLoading(false);
    }
  };

  const upcomingMeetings = meetings.filter(m => m.status === 'confirmed');
  const pendingMeetings = meetings.filter(m => m.status === 'pending');

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground flex items-center gap-3">
            <Calendar className="w-8 h-8 text-primary" />
            الاجتماعات
          </h1>
          <p className="text-muted-foreground mt-1">جدولة ومتابعة اجتماعاتك مع فريق ويبيان</p>
        </div>
        <Button asChild size="lg" className="gap-2">
          <Link to="/portal/meetings/new">
            <Plus className="w-5 h-5" />
            طلب اجتماع
          </Link>
        </Button>
      </div>

      {/* Upcoming Meetings */}
      {upcomingMeetings.length > 0 && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              <Video className="w-5 h-5" />
              اجتماعات قادمة
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {upcomingMeetings.map((meeting) => (
              <div 
                key={meeting.id}
                className="flex items-center justify-between p-4 bg-background rounded-lg border border-border"
              >
                <div>
                  <h3 className="font-semibold text-foreground">{meeting.subject}</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {format(new Date(meeting.confirmed_date || meeting.preferred_date), 'EEEE dd MMM yyyy - HH:mm', { locale: ar })}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    المدة: {meeting.duration_minutes} دقيقة
                  </p>
                </div>
                {meeting.meeting_link && (
                  <Button asChild variant="default" size="sm" className="gap-2">
                    <a href={meeting.meeting_link} target="_blank" rel="noopener noreferrer">
                      <Video className="w-4 h-4" />
                      انضمام
                    </a>
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* All Meetings */}
      <Card>
        <CardHeader>
          <CardTitle>جميع طلبات الاجتماعات</CardTitle>
          <CardDescription>
            {meetings.length === 0 ? 'لم تقم بطلب أي اجتماعات بعد' : `${meetings.length} طلب اجتماع`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {meetings.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="text-lg font-semibold text-foreground mb-2">لا توجد اجتماعات</h3>
              <p className="text-muted-foreground mb-6">
                يمكنك طلب اجتماع مع فريق ويبيان للتدريب أو الدعم
              </p>
              <Button asChild>
                <Link to="/portal/meetings/new" className="gap-2">
                  <Plus className="w-4 h-4" />
                  طلب اجتماع جديد
                </Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {meetings.map((meeting) => {
                const status = statusConfig[meeting.status];
                const StatusIcon = status?.icon || Clock;

                return (
                  <div 
                    key={meeting.id}
                    className="flex items-start gap-4 p-4 rounded-lg border border-border hover:bg-accent/50 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <StatusIcon className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant={status?.variant}>{status?.label}</Badge>
                            <span className="text-sm text-muted-foreground">
                              {meetingTypeLabels[meeting.meeting_type] || meeting.meeting_type}
                            </span>
                          </div>
                          <h3 className="font-semibold text-foreground">{meeting.subject}</h3>
                          {meeting.description && (
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                              {meeting.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {format(new Date(meeting.confirmed_date || meeting.preferred_date), 'dd MMM yyyy - HH:mm', { locale: ar })}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {meeting.duration_minutes} دقيقة
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PortalMeetings;
