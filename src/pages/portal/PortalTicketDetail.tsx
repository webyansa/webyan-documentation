import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { 
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  Send,
  Paperclip,
  User,
  Headphones,
  ExternalLink
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { format, formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';

interface TicketReply {
  id: string;
  message: string;
  is_staff_reply: boolean;
  created_at: string;
  user_id: string | null;
  attachments: string[] | null;
}

interface TicketDetail {
  id: string;
  ticket_number: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  category: string;
  website_url: string | null;
  screenshot_url: string | null;
  created_at: string;
  updated_at: string;
}

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: any; color: string }> = {
  open: { label: 'مفتوحة', variant: 'default', icon: AlertCircle, color: 'text-blue-600' },
  in_progress: { label: 'قيد المعالجة', variant: 'secondary', icon: Clock, color: 'text-orange-600' },
  resolved: { label: 'تم الحل', variant: 'outline', icon: CheckCircle2, color: 'text-green-600' },
  closed: { label: 'مغلقة', variant: 'outline', icon: CheckCircle2, color: 'text-gray-600' },
};

const priorityConfig: Record<string, { label: string; color: string }> = {
  low: { label: 'منخفضة', color: 'bg-gray-100 text-gray-700' },
  medium: { label: 'متوسطة', color: 'bg-yellow-100 text-yellow-700' },
  high: { label: 'عالية', color: 'bg-orange-100 text-orange-700' },
  urgent: { label: 'عاجلة', color: 'bg-red-100 text-red-700' },
};

const categoryLabels: Record<string, string> = {
  technical: 'مشكلة تقنية',
  billing: 'الفواتير والمدفوعات',
  feature: 'طلب ميزة',
  training: 'التدريب والدعم',
  other: 'أخرى',
};

const PortalTicketDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [replies, setReplies] = useState<TicketReply[]>([]);
  const [loading, setLoading] = useState(true);
  const [newReply, setNewReply] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (id && user) {
      fetchTicketDetails();
      setupRealtimeSubscription();
    }
  }, [id, user]);

  const fetchTicketDetails = async () => {
    try {
      // Fetch ticket
      const { data: ticketData, error: ticketError } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('id', id)
        .eq('user_id', user?.id)
        .single();

      if (ticketError) throw ticketError;
      setTicket(ticketData);

      // Fetch replies
      const { data: repliesData, error: repliesError } = await supabase
        .from('ticket_replies')
        .select('*')
        .eq('ticket_id', id)
        .order('created_at', { ascending: true });

      if (repliesError) throw repliesError;
      setReplies(repliesData || []);
    } catch (error) {
      console.error('Error fetching ticket:', error);
      toast.error('حدث خطأ أثناء تحميل التذكرة');
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel(`ticket-${id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ticket_replies',
          filter: `ticket_id=eq.${id}`
        },
        () => {
          fetchTicketDetails();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'support_tickets',
          filter: `id=eq.${id}`
        },
        () => {
          fetchTicketDetails();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleSendReply = async () => {
    if (!newReply.trim()) {
      toast.error('يرجى كتابة رسالة');
      return;
    }

    setSending(true);
    try {
      const { error } = await supabase
        .from('ticket_replies')
        .insert({
          ticket_id: id,
          user_id: user?.id,
          message: newReply.trim(),
          is_staff_reply: false
        });

      if (error) throw error;

      setNewReply('');
      toast.success('تم إرسال الرد');
    } catch (error) {
      console.error('Error sending reply:', error);
      toast.error('حدث خطأ أثناء إرسال الرد');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="p-6 text-center">
        <AlertCircle className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
        <h2 className="text-xl font-semibold mb-2">التذكرة غير موجودة</h2>
        <Button asChild>
          <Link to="/portal/tickets">العودة للتذاكر</Link>
        </Button>
      </div>
    );
  }

  const status = statusConfig[ticket.status];
  const StatusIcon = status?.icon || AlertCircle;
  const priority = priorityConfig[ticket.priority];

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" asChild className="gap-2">
          <Link to="/portal/tickets">
            <ArrowRight className="w-4 h-4" />
            العودة
          </Link>
        </Button>
      </div>

      {/* Ticket Info */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-mono text-muted-foreground">{ticket.ticket_number}</span>
                <Badge variant={status?.variant}>{status?.label}</Badge>
                <span className={`text-xs px-2 py-0.5 rounded-full ${priority?.color}`}>
                  {priority?.label}
                </span>
              </div>
              <CardTitle className="text-xl">{ticket.subject}</CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-accent/50 rounded-lg p-4">
            <p className="text-foreground whitespace-pre-wrap">{ticket.description}</p>
          </div>

          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {format(new Date(ticket.created_at), 'dd MMM yyyy - HH:mm', { locale: ar })}
            </span>
            <span>التصنيف: {categoryLabels[ticket.category]}</span>
          </div>

          {ticket.website_url && (
            <a 
              href={ticket.website_url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-primary hover:underline"
            >
              <ExternalLink className="w-4 h-4" />
              رابط الموقع
            </a>
          )}

          {ticket.screenshot_url && (
            <div className="mt-4">
              <p className="text-sm text-muted-foreground mb-2">صورة مرفقة:</p>
              <a href={ticket.screenshot_url} target="_blank" rel="noopener noreferrer">
                <img 
                  src={ticket.screenshot_url} 
                  alt="Screenshot" 
                  className="max-h-64 rounded-lg border border-border hover:opacity-90 transition-opacity"
                />
              </a>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Conversation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="w-5 h-5 text-primary" />
            المحادثة
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {replies.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>لا توجد ردود بعد. سيتم الرد على تذكرتك قريباً.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {replies.map((reply) => (
                <div 
                  key={reply.id}
                  className={`flex gap-3 ${reply.is_staff_reply ? '' : 'flex-row-reverse'}`}
                >
                  <Avatar className="flex-shrink-0">
                    <AvatarFallback className={reply.is_staff_reply ? 'bg-primary/10 text-primary' : 'bg-accent'}>
                      {reply.is_staff_reply ? <Headphones className="w-4 h-4" /> : <User className="w-4 h-4" />}
                    </AvatarFallback>
                  </Avatar>
                  <div className={`flex-1 ${reply.is_staff_reply ? '' : 'text-left'}`}>
                    <div 
                      className={`inline-block p-4 rounded-lg max-w-[85%] ${
                        reply.is_staff_reply 
                          ? 'bg-primary/10 text-foreground' 
                          : 'bg-accent text-foreground'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{reply.message}</p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(reply.created_at), { addSuffix: true, locale: ar })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Reply Input */}
          {ticket.status !== 'closed' && (
            <div className="pt-4 border-t border-border">
              <Textarea
                placeholder="اكتب ردك هنا..."
                value={newReply}
                onChange={(e) => setNewReply(e.target.value)}
                rows={3}
                className="mb-3"
              />
              <div className="flex justify-end">
                <Button onClick={handleSendReply} disabled={sending} className="gap-2">
                  {sending ? (
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  إرسال الرد
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PortalTicketDetail;
