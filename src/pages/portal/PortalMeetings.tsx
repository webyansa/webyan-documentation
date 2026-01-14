import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format, parseISO } from 'date-fns';
import { ar } from 'date-fns/locale';
import { 
  Calendar, Plus, Clock, CheckCircle2, XCircle, Video, CalendarClock, Star, Eye, FileText
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import MeetingDetailsDialog from '@/components/meetings/MeetingDetailsDialog';
import MeetingRatingDialog from '@/components/meetings/MeetingRatingDialog';

interface MeetingRequest {
  id: string;
  organization_id: string;
  meeting_type: string;
  subject: string;
  description: string | null;
  preferred_date: string;
  alternative_date: string | null;
  duration_minutes: number;
  status: string;
  meeting_link: string | null;
  confirmed_date: string | null;
  admin_notes: string | null;
  closure_report: string | null;
  staff_recommendation: string | null;
  staff_notes: string | null;
  meeting_outcome: string | null;
  report_submitted_at: string | null;
  created_at: string;
  updated_at: string;
  organization?: { name: string; contact_email: string };
  staff?: { full_name: string; email: string };
  rating?: { id: string; rating: number; comment: string | null; created_at: string };
}

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: any }> = {
  pending: { label: 'في الانتظار', variant: 'secondary', icon: Clock },
  confirmed: { label: 'مؤكد', variant: 'default', icon: CheckCircle2 },
  completed: { label: 'مكتمل', variant: 'outline', icon: CheckCircle2 },
  cancelled: { label: 'ملغي', variant: 'destructive', icon: XCircle },
  rescheduled: { label: 'تم تغيير الموعد', variant: 'secondary', icon: CalendarClock },
};

const meetingTypeLabels: Record<string, string> = {
  general: 'اجتماع عام', training: 'جلسة تدريبية', support: 'دعم فني', demo: 'عرض توضيحي', consultation: 'استشارة',
};

const PortalMeetings = () => {
  const { user } = useAuth();
  const [meetings, setMeetings] = useState<MeetingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMeeting, setSelectedMeeting] = useState<MeetingRequest | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [ratingOpen, setRatingOpen] = useState(false);
  const [ratingMeeting, setRatingMeeting] = useState<MeetingRequest | null>(null);

  useEffect(() => { if (user) fetchMeetings(); }, [user]);

  const fetchMeetings = async () => {
    try {
      const { data: clientData } = await supabase.from('client_accounts').select('organization_id').eq('user_id', user?.id).single();
      if (!clientData) return;

      const { data, error } = await supabase.from('meeting_requests').select('*').eq('organization_id', clientData.organization_id).order('created_at', { ascending: false });
      if (error) throw error;

      const meetingsWithDetails = await Promise.all((data || []).map(async (meeting: any) => {
        const [staffResult, ratingResult] = await Promise.all([
          meeting.assigned_staff ? supabase.from('staff_members').select('full_name, email').eq('id', meeting.assigned_staff).single() : Promise.resolve({ data: null }),
          supabase.from('meeting_ratings').select('*').eq('meeting_id', meeting.id).single()
        ]);
        return { ...meeting, staff: staffResult.data || undefined, rating: ratingResult.data || undefined };
      }));
      setMeetings(meetingsWithDetails);
    } catch (error) { console.error('Error fetching meetings:', error); } finally { setLoading(false); }
  };

  const upcomingMeetings = meetings.filter(m => m.status === 'confirmed');

  if (loading) return <div className="p-6 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground flex items-center gap-3"><Calendar className="w-8 h-8 text-primary" />الاجتماعات</h1>
          <p className="text-muted-foreground mt-1">جدولة ومتابعة اجتماعاتك مع فريق ويبيان</p>
        </div>
        <Button asChild size="lg" className="gap-2"><Link to="/portal/meetings/new"><Plus className="w-5 h-5" />طلب اجتماع</Link></Button>
      </div>

      {upcomingMeetings.length > 0 && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader><CardTitle className="flex items-center gap-2 text-primary"><Video className="w-5 h-5" />اجتماعات قادمة</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {upcomingMeetings.map((meeting) => (
              <div key={meeting.id} className="flex items-center justify-between p-4 bg-background rounded-lg border">
                <div>
                  <h3 className="font-semibold">{meeting.subject}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{format(new Date(meeting.confirmed_date || meeting.preferred_date), 'EEEE dd MMM yyyy - HH:mm', { locale: ar })}</p>
                  {meeting.staff && <p className="text-sm text-muted-foreground">مع: {meeting.staff.full_name}</p>}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => { setSelectedMeeting(meeting); setDetailsOpen(true); }}><Eye className="w-4 h-4" /></Button>
                  {meeting.meeting_link && <Button asChild size="sm"><a href={meeting.meeting_link} target="_blank" rel="noopener noreferrer"><Video className="w-4 h-4 ml-1" />انضمام</a></Button>}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>جميع طلبات الاجتماعات</CardTitle><CardDescription>{meetings.length === 0 ? 'لم تقم بطلب أي اجتماعات بعد' : `${meetings.length} طلب اجتماع`}</CardDescription></CardHeader>
        <CardContent>
          {meetings.length === 0 ? (
            <div className="text-center py-12"><Calendar className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" /><h3 className="text-lg font-semibold mb-2">لا توجد اجتماعات</h3><Button asChild><Link to="/portal/meetings/new"><Plus className="w-4 h-4 ml-1" />طلب اجتماع جديد</Link></Button></div>
          ) : (
            <div className="space-y-4">
              {meetings.map((meeting) => {
                const status = statusConfig[meeting.status];
                const StatusIcon = status?.icon || Clock;
                const canRate = meeting.status === 'completed' && !meeting.rating;
                return (
                  <div key={meeting.id} className="flex items-start gap-4 p-4 rounded-lg border hover:bg-accent/50 transition-colors">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0"><StatusIcon className="w-5 h-5 text-primary" /></div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={status?.variant}>{status?.label}</Badge>
                        <span className="text-sm text-muted-foreground">{meetingTypeLabels[meeting.meeting_type]}</span>
                        {meeting.rating && <Badge variant="outline" className="gap-1"><Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />{meeting.rating.rating}</Badge>}
                      </div>
                      <h3 className="font-semibold">{meeting.subject}</h3>
                      {meeting.staff && <p className="text-sm text-muted-foreground">الموظف: {meeting.staff.full_name}</p>}
                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1"><Calendar className="w-4 h-4" />{format(new Date(meeting.confirmed_date || meeting.preferred_date), 'dd MMM yyyy - HH:mm', { locale: ar })}</span>
                        <span className="flex items-center gap-1"><Clock className="w-4 h-4" />{meeting.duration_minutes} دقيقة</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => { setSelectedMeeting(meeting); setDetailsOpen(true); }}><Eye className="w-4 h-4" /></Button>
                      {canRate && <Button variant="outline" size="sm" onClick={() => { setRatingMeeting(meeting); setRatingOpen(true); }} className="gap-1"><Star className="w-4 h-4" />تقييم</Button>}
                      {meeting.closure_report && <Button variant="ghost" size="sm" onClick={() => { setSelectedMeeting(meeting); setDetailsOpen(true); }}><FileText className="w-4 h-4" /></Button>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <MeetingDetailsDialog meeting={selectedMeeting} open={detailsOpen} onOpenChange={setDetailsOpen} userType="client" />
      <MeetingRatingDialog meeting={ratingMeeting ? { id: ratingMeeting.id, subject: ratingMeeting.subject, organization_id: ratingMeeting.organization_id } : null} open={ratingOpen} onOpenChange={setRatingOpen} onSuccess={fetchMeetings} />
    </div>
  );
};

export default PortalMeetings;
