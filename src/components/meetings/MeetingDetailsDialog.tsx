import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { ar } from 'date-fns/locale';
import {
  Calendar,
  Clock,
  Building2,
  User,
  Video,
  FileText,
  Star,
  MessageSquare,
  CheckCircle,
  XCircle,
  AlertTriangle,
  CalendarX,
  ExternalLink,
  UserCheck,
  ClipboardList
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface MeetingRating {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

interface MeetingDetails {
  id: string;
  subject: string;
  description: string | null;
  meeting_type: string;
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
  staff?: {
    full_name: string;
    email: string;
  };
  rating?: MeetingRating;
}

interface MeetingDetailsDialogProps {
  meeting: MeetingDetails | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userType: 'admin' | 'staff' | 'client';
}

const meetingTypes: Record<string, { label: string; color: string }> = {
  general: { label: 'اجتماع عام', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' },
  training: { label: 'جلسة تدريبية', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
  support: { label: 'دعم فني', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' },
  demo: { label: 'عرض توضيحي', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' },
  consultation: { label: 'استشارة', color: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300' },
};

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: 'قيد الانتظار', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300', icon: Clock },
  confirmed: { label: 'مؤكد', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300', icon: CheckCircle },
  cancelled: { label: 'ملغي', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300', icon: XCircle },
  completed: { label: 'منتهي', color: 'bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-300', icon: CheckCircle },
  rescheduled: { label: 'معاد جدولته', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300', icon: Calendar },
};

const outcomeConfig: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: 'في الانتظار', color: 'text-yellow-600', icon: Clock },
  successful: { label: 'تم بنجاح', color: 'text-green-600', icon: CheckCircle },
  failed: { label: 'تعذر الإتمام', color: 'text-red-600', icon: XCircle },
  rescheduled_by_client: { label: 'أجله العميل', color: 'text-blue-600', icon: CalendarX },
  no_show: { label: 'لم يحضر العميل', color: 'text-orange-600', icon: AlertTriangle },
};

const StarRating = ({ rating }: { rating: number }) => {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-5 w-5 ${
            star <= rating
              ? 'fill-yellow-400 text-yellow-400'
              : 'fill-muted text-muted-foreground'
          }`}
        />
      ))}
    </div>
  );
};

export default function MeetingDetailsDialog({
  meeting,
  open,
  onOpenChange,
  userType,
}: MeetingDetailsDialogProps) {
  if (!meeting) return null;

  const status = statusConfig[meeting.status] || statusConfig.pending;
  const StatusIcon = status.icon;
  const outcome = meeting.meeting_outcome ? outcomeConfig[meeting.meeting_outcome] : null;
  const OutcomeIcon = outcome?.icon || Clock;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] p-0 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-l from-primary/10 via-primary/5 to-transparent p-6 border-b">
          <DialogHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className={meetingTypes[meeting.meeting_type]?.color}>
                    {meetingTypes[meeting.meeting_type]?.label || meeting.meeting_type}
                  </Badge>
                  <Badge className={status.color}>
                    <StatusIcon className="h-3 w-3 ml-1" />
                    {status.label}
                  </Badge>
                </div>
                <DialogTitle className="text-xl font-bold">{meeting.subject}</DialogTitle>
                {meeting.description && (
                  <p className="text-muted-foreground mt-2 text-sm">{meeting.description}</p>
                )}
              </div>
            </div>
          </DialogHeader>
        </div>

        <ScrollArea className="max-h-[calc(90vh-180px)]">
          <div className="p-6 space-y-6">
            {/* Meeting Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Date & Time */}
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Calendar className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">الموعد</p>
                      <p className="font-medium">
                        {format(
                          parseISO(meeting.confirmed_date || meeting.preferred_date),
                          'EEEE d MMMM yyyy',
                          { locale: ar }
                        )}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {format(parseISO(meeting.confirmed_date || meeting.preferred_date), 'HH:mm')}
                        {' - '}
                        {meeting.duration_minutes} دقيقة
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Organization */}
              {meeting.organization && (
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                        <Building2 className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">المؤسسة</p>
                        <p className="font-medium">{meeting.organization.name}</p>
                        <p className="text-sm text-muted-foreground">{meeting.organization.contact_email}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Requester */}
              {meeting.requester && (
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-secondary">
                          {meeting.requester.full_name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm text-muted-foreground">مقدم الطلب</p>
                        <p className="font-medium">{meeting.requester.full_name}</p>
                        <p className="text-sm text-muted-foreground">{meeting.requester.email}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Assigned Staff */}
              {meeting.staff && (
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                        <UserCheck className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">الموظف المسؤول</p>
                        <p className="font-medium">{meeting.staff.full_name}</p>
                        <p className="text-sm text-muted-foreground">{meeting.staff.email}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Meeting Link */}
            {meeting.meeting_link && (
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/20">
                        <Video className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">رابط الاجتماع</p>
                        <a
                          href={meeting.meeting_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-primary hover:underline flex items-center gap-1"
                        >
                          {meeting.meeting_link}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </div>
                    <Button asChild>
                      <a href={meeting.meeting_link} target="_blank" rel="noopener noreferrer">
                        <Video className="h-4 w-4 ml-2" />
                        انضمام
                      </a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Tabs for Reports & Rating */}
            <Tabs defaultValue="report" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="report" className="gap-2">
                  <FileText className="h-4 w-4" />
                  تقرير الاجتماع
                </TabsTrigger>
                <TabsTrigger value="outcome" className="gap-2">
                  <ClipboardList className="h-4 w-4" />
                  حالة التنفيذ
                </TabsTrigger>
                <TabsTrigger value="rating" className="gap-2">
                  <Star className="h-4 w-4" />
                  تقييم العميل
                </TabsTrigger>
              </TabsList>

              {/* Staff Report Tab */}
              <TabsContent value="report" className="mt-4 space-y-4">
                {meeting.closure_report ? (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        تقرير الموظف بعد الاجتماع
                      </CardTitle>
                      {meeting.report_submitted_at && (
                        <p className="text-xs text-muted-foreground">
                          تم الرفع: {format(parseISO(meeting.report_submitted_at), 'dd MMM yyyy - HH:mm', { locale: ar })}
                        </p>
                      )}
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm whitespace-pre-wrap bg-muted/50 p-4 rounded-lg">
                        {meeting.closure_report}
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>لم يتم رفع تقرير بعد</p>
                  </div>
                )}

                {meeting.staff_recommendation && (
                  <Card className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-900/20">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2 text-green-700 dark:text-green-400">
                        <MessageSquare className="h-4 w-4" />
                        توصية الموظف
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm whitespace-pre-wrap">{meeting.staff_recommendation}</p>
                    </CardContent>
                  </Card>
                )}

                {meeting.staff_notes && (userType === 'admin' || userType === 'staff') && (
                  <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-900/20">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2 text-yellow-700 dark:text-yellow-400">
                        <MessageSquare className="h-4 w-4" />
                        ملاحظات الموظف الداخلية
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm whitespace-pre-wrap">{meeting.staff_notes}</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Outcome Tab */}
              <TabsContent value="outcome" className="mt-4">
                <Card>
                  <CardContent className="pt-6">
                    {outcome ? (
                      <div className="flex flex-col items-center text-center py-4">
                        <div className={`p-4 rounded-full ${outcome.color} bg-opacity-10 mb-4`}>
                          <OutcomeIcon className={`h-10 w-10 ${outcome.color}`} />
                        </div>
                        <h3 className={`text-xl font-bold ${outcome.color}`}>{outcome.label}</h3>
                        {meeting.meeting_outcome === 'successful' && (
                          <p className="text-muted-foreground mt-2">تم إتمام الاجتماع بنجاح</p>
                        )}
                        {meeting.meeting_outcome === 'no_show' && (
                          <p className="text-muted-foreground mt-2">لم يحضر العميل للاجتماع المحدد</p>
                        )}
                        {meeting.meeting_outcome === 'failed' && (
                          <p className="text-muted-foreground mt-2">تعذر إتمام الاجتماع لأسباب تقنية أو أخرى</p>
                        )}
                        {meeting.meeting_outcome === 'rescheduled_by_client' && (
                          <p className="text-muted-foreground mt-2">طلب العميل تأجيل الاجتماع لموعد آخر</p>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p>لم يتم تحديد حالة التنفيذ بعد</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Rating Tab */}
              <TabsContent value="rating" className="mt-4">
                <Card>
                  <CardContent className="pt-6">
                    {meeting.rating ? (
                      <div className="space-y-4">
                        <div className="flex flex-col items-center text-center">
                          <StarRating rating={meeting.rating.rating} />
                          <p className="text-2xl font-bold mt-2">{meeting.rating.rating}/5</p>
                          <p className="text-sm text-muted-foreground">
                            {format(parseISO(meeting.rating.created_at), 'dd MMM yyyy - HH:mm', { locale: ar })}
                          </p>
                        </div>
                        {meeting.rating.comment && (
                          <div className="bg-muted/50 p-4 rounded-lg">
                            <p className="text-sm font-medium mb-2">ملاحظة العميل:</p>
                            <p className="text-sm text-muted-foreground">{meeting.rating.comment}</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Star className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p>لم يقم العميل بتقييم الاجتماع بعد</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* Admin Notes */}
            {meeting.admin_notes && userType === 'admin' && (
              <Card className="border-purple-200 bg-purple-50 dark:border-purple-900 dark:bg-purple-900/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2 text-purple-700 dark:text-purple-400">
                    <MessageSquare className="h-4 w-4" />
                    ملاحظات الإدارة
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-wrap">{meeting.admin_notes}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
