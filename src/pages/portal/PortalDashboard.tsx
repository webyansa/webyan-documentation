import { useState, useEffect } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { 
  Ticket, 
  Calendar, 
  CreditCard, 
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Plus,
  TrendingUp,
  Bell
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format, formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';

interface DashboardStats {
  totalTickets: number;
  openTickets: number;
  pendingMeetings: number;
  subscriptionDaysLeft: number;
}

interface RecentActivity {
  id: string;
  type: 'ticket' | 'meeting' | 'subscription';
  title: string;
  status: string;
  date: string;
}

const PortalDashboard = () => {
  const { user } = useAuth();
  const { clientInfo } = useOutletContext<{ clientInfo: any }>();
  const [stats, setStats] = useState<DashboardStats>({
    totalTickets: 0,
    openTickets: 0,
    pendingMeetings: 0,
    subscriptionDaysLeft: 0
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      // Get organization ID
      const { data: clientData } = await supabase
        .from('client_accounts')
        .select('organization_id')
        .eq('user_id', user?.id)
        .single();

      if (!clientData) return;

      const orgId = clientData.organization_id;

      // Fetch tickets stats
      const { data: tickets } = await supabase
        .from('support_tickets')
        .select('id, status')
        .eq('user_id', user?.id);

      const totalTickets = tickets?.length || 0;
      const openTickets = tickets?.filter(t => t.status === 'open' || t.status === 'in_progress').length || 0;

      // Fetch pending meetings
      const { data: meetings } = await supabase
        .from('meeting_requests')
        .select('id')
        .eq('organization_id', orgId)
        .eq('status', 'pending');

      const pendingMeetings = meetings?.length || 0;

      // Get organization subscription info
      const { data: org } = await supabase
        .from('client_organizations')
        .select('subscription_end_date')
        .eq('id', orgId)
        .single();

      let subscriptionDaysLeft = 0;
      if (org?.subscription_end_date) {
        const endDate = new Date(org.subscription_end_date);
        const today = new Date();
        subscriptionDaysLeft = Math.max(0, Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
      }

      setStats({
        totalTickets,
        openTickets,
        pendingMeetings,
        subscriptionDaysLeft
      });

      // Fetch recent activity
      const activities: RecentActivity[] = [];

      // Recent tickets
      const { data: recentTickets } = await supabase
        .from('support_tickets')
        .select('id, subject, status, created_at')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(3);

      recentTickets?.forEach(t => {
        activities.push({
          id: t.id,
          type: 'ticket',
          title: t.subject,
          status: t.status,
          date: t.created_at
        });
      });

      // Recent meetings
      const { data: recentMeetings } = await supabase
        .from('meeting_requests')
        .select('id, subject, status, created_at')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })
        .limit(2);

      recentMeetings?.forEach(m => {
        activities.push({
          id: m.id,
          type: 'meeting',
          title: m.subject,
          status: m.status,
          date: m.created_at
        });
      });

      // Sort by date
      activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setRecentActivity(activities.slice(0, 5));

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string, type: string) => {
    const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      open: { label: 'مفتوحة', variant: 'default' },
      in_progress: { label: 'قيد المعالجة', variant: 'secondary' },
      resolved: { label: 'تم الحل', variant: 'outline' },
      closed: { label: 'مغلقة', variant: 'outline' },
      pending: { label: 'في الانتظار', variant: 'secondary' },
      confirmed: { label: 'مؤكد', variant: 'default' },
      completed: { label: 'مكتمل', variant: 'outline' },
      cancelled: { label: 'ملغي', variant: 'destructive' },
    };

    const config = statusConfig[status] || { label: status, variant: 'secondary' as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'ticket': return <Ticket className="w-4 h-4 text-primary" />;
      case 'meeting': return <Calendar className="w-4 h-4 text-primary" />;
      case 'subscription': return <CreditCard className="w-4 h-4 text-primary" />;
      default: return <Bell className="w-4 h-4 text-primary" />;
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Welcome Section */}
      <div className="bg-gradient-to-l from-primary/10 via-primary/5 to-transparent rounded-2xl p-6 lg:p-8">
        <h1 className="text-2xl lg:text-3xl font-bold text-foreground mb-2">
          مرحباً، {clientInfo?.full_name}! 👋
        </h1>
        <p className="text-muted-foreground">
          مرحباً بك في بوابة عملاء ويبيان. يمكنك من هنا إدارة حسابك وتتبع طلباتك.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">إجمالي التذاكر</p>
                <p className="text-3xl font-bold text-foreground">{stats.totalTickets}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Ticket className="w-6 h-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">تذاكر مفتوحة</p>
                <p className="text-3xl font-bold text-foreground">{stats.openTickets}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">اجتماعات معلقة</p>
                <p className="text-3xl font-bold text-foreground">{stats.pendingMeetings}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">أيام الاشتراك المتبقية</p>
                <p className="text-3xl font-bold text-foreground">{stats.subscriptionDaysLeft}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                <Clock className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              إجراءات سريعة
            </CardTitle>
            <CardDescription>ابدأ بسرعة مع الإجراءات الأكثر شيوعاً</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button asChild className="w-full justify-start gap-3" variant="outline">
              <Link to="/portal/tickets/new">
                <Plus className="w-4 h-4" />
                فتح تذكرة دعم جديدة
                <ArrowLeft className="w-4 h-4 mr-auto" />
              </Link>
            </Button>
            <Button asChild className="w-full justify-start gap-3" variant="outline">
              <Link to="/portal/meetings/new">
                <Calendar className="w-4 h-4" />
                طلب اجتماع
                <ArrowLeft className="w-4 h-4 mr-auto" />
              </Link>
            </Button>
            <Button asChild className="w-full justify-start gap-3" variant="outline">
              <Link to="/portal/subscription">
                <CreditCard className="w-4 h-4" />
                تجديد الاشتراك
                <ArrowLeft className="w-4 h-4 mr-auto" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              النشاط الأخير
            </CardTitle>
            <CardDescription>آخر الأنشطة والتحديثات على حسابك</CardDescription>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Bell className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>لا يوجد نشاط حتى الآن</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <div 
                    key={`${activity.type}-${activity.id}`}
                    className="flex items-start gap-3 p-3 rounded-lg bg-accent/50 hover:bg-accent transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-background flex items-center justify-center flex-shrink-0">
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">{activity.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {getStatusBadge(activity.status, activity.type)}
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(activity.date), { addSuffix: true, locale: ar })}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Help Section */}
      <Card className="bg-gradient-to-l from-primary/5 to-transparent border-primary/20">
        <CardContent className="p-6 flex flex-col lg:flex-row items-center gap-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-foreground mb-1">هل تحتاج مساعدة؟</h3>
            <p className="text-muted-foreground">
              فريق دعم ويبيان متاح لمساعدتك. تواصل معنا في أي وقت!
            </p>
          </div>
          <Button asChild>
            <Link to="/portal/tickets/new" className="gap-2">
              <Ticket className="w-4 h-4" />
              تواصل مع الدعم
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default PortalDashboard;
