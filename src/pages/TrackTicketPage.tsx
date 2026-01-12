import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Ticket, Clock, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { DocsLayout } from '@/components/layout/DocsLayout';

interface TicketInfo {
  id: string;
  ticket_number: string;
  subject: string;
  status: string;
  priority: string;
  category: string;
  created_at: string;
  updated_at: string;
  description: string;
}

export default function TrackTicketPage() {
  const navigate = useNavigate();
  const [ticketNumber, setTicketNumber] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [ticketInfo, setTicketInfo] = useState<TicketInfo | null>(null);
  const [notFound, setNotFound] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!ticketNumber.trim() || !email.trim()) {
      toast.error('الرجاء إدخال رقم التذكرة والبريد الإلكتروني');
      return;
    }

    setLoading(true);
    setNotFound(false);
    setTicketInfo(null);

    try {
      // Use edge function to track guest tickets (bypasses RLS)
      const { data, error } = await supabase.functions.invoke('track-guest-ticket', {
        body: {
          ticketNumber: ticketNumber.trim(),
          email: email.trim(),
        },
      });

      if (error || !data?.ticket) {
        setNotFound(true);
        return;
      }

      setTicketInfo(data.ticket);
    } catch (error) {
      console.error('Error searching ticket:', error);
      toast.error('حدث خطأ أثناء البحث');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ReactNode }> = {
      open: { label: 'مفتوحة', variant: 'default', icon: <AlertCircle className="h-3 w-3" /> },
      in_progress: { label: 'قيد المعالجة', variant: 'secondary', icon: <Clock className="h-3 w-3" /> },
      resolved: { label: 'تم الحل', variant: 'outline', icon: <CheckCircle className="h-3 w-3" /> },
      closed: { label: 'مغلقة', variant: 'outline', icon: <CheckCircle className="h-3 w-3" /> },
    };
    const config = statusMap[status] || statusMap.open;
    return (
      <Badge variant={config.variant} className="gap-1">
        {config.icon}
        {config.label}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const priorityMap: Record<string, { label: string; className: string }> = {
      low: { label: 'منخفضة', className: 'bg-green-100 text-green-700' },
      medium: { label: 'متوسطة', className: 'bg-yellow-100 text-yellow-700' },
      high: { label: 'عالية', className: 'bg-orange-100 text-orange-700' },
      urgent: { label: 'عاجلة', className: 'bg-red-100 text-red-700' },
    };
    const config = priorityMap[priority] || priorityMap.medium;
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  return (
    <DocsLayout>
      <div className="max-w-2xl mx-auto py-8 px-4">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <Search className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">تتبع تذكرتك</h1>
          <p className="text-muted-foreground">
            أدخل رقم التذكرة والبريد الإلكتروني المستخدم عند إنشاء التذكرة لمعرفة حالتها
          </p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ticket className="h-5 w-5" />
              البحث عن تذكرة
            </CardTitle>
            <CardDescription>
              أدخل بيانات التذكرة للبحث عنها
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearch} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ticketNumber">رقم التذكرة</Label>
                <Input
                  id="ticketNumber"
                  placeholder="مثال: TKT-123456"
                  value={ticketNumber}
                  onChange={(e) => setTicketNumber(e.target.value)}
                  className="text-left"
                  dir="ltr"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">البريد الإلكتروني</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="example@domain.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="text-left"
                  dir="ltr"
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin ml-2" />
                    جاري البحث...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4 ml-2" />
                    بحث
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {notFound && (
          <Card className="border-destructive/50 bg-destructive/5">
            <CardContent className="pt-6">
              <div className="text-center">
                <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-destructive mb-2">لم يتم العثور على التذكرة</h3>
                <p className="text-muted-foreground">
                  تأكد من صحة رقم التذكرة والبريد الإلكتروني المستخدم عند إنشاء التذكرة
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {ticketInfo && (
          <Card className="border-primary/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{ticketInfo.subject}</CardTitle>
                {getStatusBadge(ticketInfo.status)}
              </div>
              <CardDescription className="flex items-center gap-2 mt-2">
                <span className="font-mono text-xs bg-muted px-2 py-1 rounded">
                  {ticketInfo.ticket_number}
                </span>
                {getPriorityBadge(ticketInfo.priority)}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">وصف المشكلة</h4>
                <p className="text-sm whitespace-pre-wrap">{ticketInfo.description}</p>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">تاريخ الإنشاء</h4>
                  <p className="text-sm">
                    {new Date(ticketInfo.created_at).toLocaleDateString('ar-SA', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">آخر تحديث</h4>
                  <p className="text-sm">
                    {new Date(ticketInfo.updated_at).toLocaleDateString('ar-SA', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
              
              <div className="pt-4 border-t">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>
                    {ticketInfo.status === 'resolved' || ticketInfo.status === 'closed'
                      ? 'تم حل هذه التذكرة'
                      : 'فريق الدعم يعمل على حل مشكلتك'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground mb-4">
            هل لديك مشكلة جديدة؟
          </p>
          <Button variant="outline" onClick={() => navigate('/submit-ticket')}>
            إنشاء تذكرة جديدة
          </Button>
        </div>
      </div>
    </DocsLayout>
  );
}
