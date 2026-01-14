import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useStaffAuth } from '@/hooks/useStaffAuth';
import { format, parseISO } from 'date-fns';
import { ar } from 'date-fns/locale';
import {
  FileText,
  Send,
  Loader2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  CalendarX,
  Clock,
  MessageSquare,
  ClipboardList
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

interface MeetingData {
  id: string;
  subject: string;
  description: string | null;
  meeting_type: string;
  preferred_date: string;
  confirmed_date: string | null;
  status: string;
  closure_report: string | null;
  staff_recommendation: string | null;
  staff_notes: string | null;
  meeting_outcome: string | null;
  organization?: {
    name: string;
    contact_email: string;
  };
}

interface StaffMeetingReportDialogProps {
  meeting: MeetingData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const outcomeOptions = [
  {
    value: 'successful',
    label: 'تم بنجاح',
    description: 'تم إتمام الاجتماع بنجاح وحققنا الهدف المطلوب',
    icon: CheckCircle,
    color: 'text-green-600 border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-900/20',
  },
  {
    value: 'no_show',
    label: 'لم يحضر العميل',
    description: 'لم يحضر العميل في الموعد المحدد',
    icon: AlertTriangle,
    color: 'text-orange-600 border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-900/20',
  },
  {
    value: 'rescheduled_by_client',
    label: 'أجله العميل',
    description: 'طلب العميل تأجيل الاجتماع لموعد آخر',
    icon: CalendarX,
    color: 'text-blue-600 border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-900/20',
  },
  {
    value: 'failed',
    label: 'تعذر الإتمام',
    description: 'تعذر إتمام الاجتماع لأسباب تقنية أو أخرى',
    icon: XCircle,
    color: 'text-red-600 border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-900/20',
  },
];

const meetingTypes: Record<string, string> = {
  general: 'اجتماع عام',
  training: 'جلسة تدريبية',
  support: 'دعم فني',
  demo: 'عرض توضيحي',
  consultation: 'استشارة',
};

export default function StaffMeetingReportDialog({
  meeting,
  open,
  onOpenChange,
  onSuccess,
}: StaffMeetingReportDialogProps) {
  const { permissions, user } = useStaffAuth();
  const [outcome, setOutcome] = useState<string>('');
  const [closureReport, setClosureReport] = useState('');
  const [recommendation, setRecommendation] = useState('');
  const [staffNotes, setStaffNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [viewMode, setViewMode] = useState(false);

  useEffect(() => {
    if (meeting) {
      setOutcome(meeting.meeting_outcome || '');
      setClosureReport(meeting.closure_report || '');
      setRecommendation(meeting.staff_recommendation || '');
      setStaffNotes(meeting.staff_notes || '');
      setViewMode(meeting.status === 'completed' && !!meeting.closure_report);
    }
  }, [meeting]);

  const handleSubmit = async () => {
    if (!meeting) return;
    
    if (!outcome) {
      toast.error('يرجى تحديد حالة تنفيذ الاجتماع');
      return;
    }

    if (!closureReport.trim()) {
      toast.error('يرجى كتابة تقرير الاجتماع');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('meeting_requests')
        .update({
          status: 'completed',
          meeting_outcome: outcome,
          closure_report: closureReport,
          staff_recommendation: recommendation.trim() || null,
          staff_notes: staffNotes.trim() || null,
          report_submitted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', meeting.id);

      if (error) throw error;

      // Log activity
      const { data: staffData } = await supabase
        .from('staff_members')
        .select('full_name')
        .eq('id', permissions.staffId)
        .single();

      await supabase.from('meeting_activity_log').insert({
        meeting_id: meeting.id,
        action_type: 'report_submitted',
        performed_by: user?.id,
        performed_by_name: staffData?.full_name || 'موظف',
        is_staff_action: true,
        new_value: outcome,
        note: closureReport.substring(0, 200),
        recommendation: recommendation || null,
      });

      // Send notification to client
      if (meeting.organization?.contact_email) {
        await supabase.functions.invoke('send-client-notification', {
          body: {
            type: 'meeting_completed',
            client_email: meeting.organization.contact_email,
            client_name: meeting.organization.name,
            data: {
              meeting_subject: meeting.subject,
              meeting_date: meeting.confirmed_date || meeting.preferred_date,
              outcome: outcomeOptions.find(o => o.value === outcome)?.label,
            },
          },
        });
      }

      toast.success('تم رفع التقرير بنجاح');
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error('Error submitting report:', error);
      toast.error(error.message || 'حدث خطأ في رفع التقرير');
    } finally {
      setSubmitting(false);
    }
  };

  if (!meeting) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            {viewMode ? 'تقرير الاجتماع' : 'إكمال الاجتماع ورفع التقرير'}
          </DialogTitle>
          <DialogDescription className="space-y-1">
            <span className="block font-medium">{meeting.subject}</span>
            <span className="block text-xs">
              {meeting.organization?.name} • {meetingTypes[meeting.meeting_type] || meeting.meeting_type}
              {' • '}
              {format(parseISO(meeting.confirmed_date || meeting.preferred_date), 'EEEE d MMMM yyyy - HH:mm', { locale: ar })}
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Meeting Outcome */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />
              حالة تنفيذ الاجتماع *
            </Label>
            <RadioGroup
              value={outcome}
              onValueChange={setOutcome}
              disabled={viewMode}
              className="grid grid-cols-1 sm:grid-cols-2 gap-3"
            >
              {outcomeOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <Card
                    key={option.value}
                    className={`cursor-pointer transition-all ${
                      outcome === option.value
                        ? option.color + ' ring-2 ring-offset-2 ring-current'
                        : 'hover:bg-accent/50'
                    } ${viewMode ? 'cursor-default' : ''}`}
                    onClick={() => !viewMode && setOutcome(option.value)}
                  >
                    <CardContent className="p-4 flex items-start gap-3">
                      <RadioGroupItem
                        value={option.value}
                        id={option.value}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Icon className={`h-4 w-4 ${option.color.split(' ')[0]}`} />
                          <Label
                            htmlFor={option.value}
                            className="font-medium cursor-pointer"
                          >
                            {option.label}
                          </Label>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {option.description}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </RadioGroup>
          </div>

          <Separator />

          {/* Closure Report */}
          <div className="space-y-2">
            <Label htmlFor="closureReport" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              تقرير الاجتماع *
            </Label>
            <Textarea
              id="closureReport"
              placeholder="اكتب ملخص الاجتماع والنقاط المهمة التي تمت مناقشتها والإجراءات المتفق عليها..."
              value={closureReport}
              onChange={(e) => setClosureReport(e.target.value)}
              className="min-h-[120px] resize-none"
              readOnly={viewMode}
            />
          </div>

          {/* Recommendation */}
          <div className="space-y-2">
            <Label htmlFor="recommendation" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              التوصيات (اختياري)
            </Label>
            <Textarea
              id="recommendation"
              placeholder="أي توصيات أو اقتراحات للعميل أو للفريق..."
              value={recommendation}
              onChange={(e) => setRecommendation(e.target.value)}
              className="min-h-[80px] resize-none"
              readOnly={viewMode}
            />
          </div>

          {/* Internal Staff Notes */}
          <div className="space-y-2">
            <Label htmlFor="staffNotes" className="flex items-center gap-2 text-yellow-600">
              <MessageSquare className="h-4 w-4" />
              ملاحظات داخلية (للإدارة فقط)
            </Label>
            <Textarea
              id="staffNotes"
              placeholder="ملاحظات داخلية لن تظهر للعميل..."
              value={staffNotes}
              onChange={(e) => setStaffNotes(e.target.value)}
              className="min-h-[60px] resize-none border-yellow-200 bg-yellow-50/50 dark:border-yellow-900 dark:bg-yellow-900/10"
              readOnly={viewMode}
            />
          </div>
        </div>

        {!viewMode && (
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              إلغاء
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting || !outcome || !closureReport.trim()}
              className="gap-2"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              رفع التقرير وإكمال الاجتماع
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
