import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { 
  Ticket, 
  Plus, 
  Search,
  Filter,
  Clock,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  ArrowLeft,
  Building2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format, formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';

interface SupportTicket {
  id: string;
  ticket_number: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  category: string;
  source: string | null;
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
  low: { label: 'منخفضة', color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
  medium: { label: 'متوسطة', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
  high: { label: 'عالية', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
  urgent: { label: 'عاجلة', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
};

const categoryLabels: Record<string, string> = {
  technical: 'مشكلة تقنية',
  billing: 'الفواتير والمدفوعات',
  feature: 'طلب ميزة',
  training: 'التدريب والدعم',
  other: 'أخرى',
};

const PortalTickets = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [organizationId, setOrganizationId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchClientOrganization();
    }
  }, [user]);

  useEffect(() => {
    if (organizationId) {
      fetchTickets();
      setupRealtimeSubscription();
    }
  }, [organizationId]);

  const fetchClientOrganization = async () => {
    try {
      // Get client account to find organization_id
      const { data: clientAccount, error } = await supabase
        .from('client_accounts')
        .select('organization_id')
        .eq('user_id', user?.id)
        .single();

      if (error) {
        console.error('Error fetching client account:', error);
        setLoading(false);
        return;
      }

      setOrganizationId(clientAccount?.organization_id || null);
    } catch (error) {
      console.error('Error:', error);
      setLoading(false);
    }
  };

  const fetchTickets = async () => {
    if (!organizationId) {
      setLoading(false);
      return;
    }

    try {
      // Fetch tickets by organization_id (includes both direct and embed tickets)
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTickets(data || []);
    } catch (error) {
      console.error('Error fetching tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    if (!organizationId) return;
    
    const channel = supabase
      .channel('portal-tickets')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'support_tickets',
          filter: `organization_id=eq.${organizationId}`
        },
        () => {
          fetchTickets();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = ticket.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         ticket.ticket_number.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (activeTab === 'all') return matchesSearch;
    if (activeTab === 'open') return matchesSearch && (ticket.status === 'open' || ticket.status === 'in_progress');
    if (activeTab === 'resolved') return matchesSearch && (ticket.status === 'resolved' || ticket.status === 'closed');
    return matchesSearch;
  });

  const stats = {
    total: tickets.length,
    open: tickets.filter(t => t.status === 'open' || t.status === 'in_progress').length,
    resolved: tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length
  };

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
            <Ticket className="w-8 h-8 text-primary" />
            تذاكر الدعم
          </h1>
          <p className="text-muted-foreground mt-1">تتبع وإدارة جميع طلبات الدعم الخاصة بك</p>
        </div>
        <Button asChild size="lg" className="gap-2">
          <Link to="/portal/tickets/new">
            <Plus className="w-5 h-5" />
            تذكرة جديدة
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{stats.total}</p>
            <p className="text-sm text-muted-foreground">إجمالي التذاكر</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-orange-600">{stats.open}</p>
            <p className="text-sm text-muted-foreground">مفتوحة</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{stats.resolved}</p>
            <p className="text-sm text-muted-foreground">تم حلها</p>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="البحث في التذاكر..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-10"
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all">الكل ({stats.total})</TabsTrigger>
          <TabsTrigger value="open">مفتوحة ({stats.open})</TabsTrigger>
          <TabsTrigger value="resolved">تم حلها ({stats.resolved})</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {filteredTickets.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <Ticket className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
                <h3 className="text-lg font-semibold text-foreground mb-2">لا توجد تذاكر</h3>
                <p className="text-muted-foreground mb-6">
                  {activeTab === 'all' ? 'لم تقم بإنشاء أي تذاكر دعم بعد' : 'لا توجد تذاكر في هذا التصنيف'}
                </p>
                <Button asChild>
                  <Link to="/portal/tickets/new" className="gap-2">
                    <Plus className="w-4 h-4" />
                    إنشاء تذكرة جديدة
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredTickets.map((ticket) => {
                const status = statusConfig[ticket.status];
                const StatusIcon = status?.icon || AlertCircle;
                const priority = priorityConfig[ticket.priority];

                return (
                  <Card 
                    key={ticket.id}
                    className="hover:shadow-md transition-all cursor-pointer group"
                    onClick={() => navigate(`/portal/tickets/${ticket.id}`)}
                  >
                    <CardContent className="p-4 lg:p-6">
                      <div className="flex items-start gap-4">
                        <div className={`w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 ${status?.color}`}>
                          <StatusIcon className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-mono text-muted-foreground">
                                  {ticket.ticket_number}
                                </span>
                                <Badge variant={status?.variant}>{status?.label}</Badge>
                                <span className={`text-xs px-2 py-0.5 rounded-full ${priority?.color}`}>
                                  {priority?.label}
                                </span>
                              </div>
                              <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                                {ticket.subject}
                              </h3>
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                {ticket.description}
                              </p>
                            </div>
                            <ArrowLeft className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                          </div>
                          <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true, locale: ar })}
                            </span>
                            <span>
                              {categoryLabels[ticket.category] || ticket.category}
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PortalTickets;
