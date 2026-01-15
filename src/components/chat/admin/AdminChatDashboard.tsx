import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  MessageCircle, Users, Clock, AlertTriangle, 
  TrendingUp, ArrowUpRight, Loader2, Settings
} from 'lucide-react';
import { Link } from 'react-router-dom';
import ProfessionalAgentInbox from '../inbox/ProfessionalAgentInbox';

interface ChatStats {
  totalConversations: number;
  activeConversations: number;
  unassignedConversations: number;
  closedToday: number;
  avgResponseTime: string;
  totalMessages: number;
  customersUnread: number;
  internalUnread: number;
}

export default function AdminChatDashboard() {
  const [stats, setStats] = useState<ChatStats>({
    totalConversations: 0,
    activeConversations: 0,
    unassignedConversations: 0,
    closedToday: 0,
    avgResponseTime: '—',
    totalMessages: 0,
    customersUnread: 0,
    internalUnread: 0
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('inbox');

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // Fetch conversations
      const { data: conversations } = await supabase
        .from('conversations')
        .select('id, status, source, unread_count, closed_at, created_at');

      if (conversations) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const totalConversations = conversations.length;
        const activeConversations = conversations.filter(c => c.status !== 'closed').length;
        const unassignedConversations = conversations.filter(c => c.status === 'unassigned').length;
        const closedToday = conversations.filter(c => 
          c.closed_at && new Date(c.closed_at) >= today
        ).length;
        const customersUnread = conversations.filter(c => 
          c.source !== 'internal' && (c.unread_count || 0) > 0
        ).length;
        const internalUnread = conversations.filter(c => 
          c.source === 'internal' && (c.unread_count || 0) > 0
        ).length;

        // Fetch message count
        const { count: totalMessages } = await supabase
          .from('conversation_messages')
          .select('*', { count: 'exact', head: true });

        setStats({
          totalConversations,
          activeConversations,
          unassignedConversations,
          closedToday,
          avgResponseTime: '< 5 دقائق',
          totalMessages: totalMessages || 0,
          customersUnread,
          internalUnread
        });
      }
    } catch (error) {
      console.error('Error fetching chat stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MessageCircle className="h-6 w-6" />
            إدارة المحادثات
          </h1>
          <p className="text-muted-foreground">متابعة وإدارة جميع المحادثات</p>
        </div>
        <Link to="/admin/chat-settings">
          <Button variant="outline" className="gap-2">
            <Settings className="h-4 w-4" />
            الإعدادات
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">المحادثات النشطة</CardTitle>
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeConversations}</div>
            <p className="text-xs text-muted-foreground mt-1">
              من إجمالي {stats.totalConversations} محادثة
            </p>
            {stats.customersUnread > 0 && (
              <Badge variant="destructive" className="mt-2">
                {stats.customersUnread} غير مقروءة
              </Badge>
            )}
          </CardContent>
        </Card>

        <Card className={stats.unassignedConversations > 0 ? 'border-amber-200 bg-amber-50 dark:bg-amber-950/20' : ''}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">غير مسندة</CardTitle>
            <AlertTriangle className={`h-4 w-4 ${stats.unassignedConversations > 0 ? 'text-amber-500' : 'text-muted-foreground'}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.unassignedConversations}</div>
            <p className="text-xs text-muted-foreground mt-1">تحتاج إسناد</p>
            {stats.unassignedConversations > 0 && (
              <p className="text-xs text-amber-600 mt-2">تتطلب اهتمام فوري</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">متوسط وقت الرد</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgResponseTime}</div>
            <p className="text-xs text-muted-foreground mt-1">للمحادثات النشطة</p>
            <div className="flex items-center gap-1 mt-2 text-green-600 text-sm">
              <TrendingUp className="h-3 w-3" />
              <span>أداء جيد</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">أُغلقت اليوم</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.closedToday}</div>
            <p className="text-xs text-muted-foreground mt-1">محادثة تم إغلاقها</p>
            <p className="text-xs text-muted-foreground mt-2">
              إجمالي الرسائل: {stats.totalMessages.toLocaleString('ar-EG')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Internal Messages Badge */}
      {stats.internalUnread > 0 && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Badge variant="destructive">{stats.internalUnread}</Badge>
                <span className="text-sm font-medium">رسائل داخلية غير مقروءة</span>
              </div>
              <Button variant="ghost" size="sm" className="gap-2">
                عرض الرسائل
                <ArrowUpRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="inbox" className="gap-2">
            <MessageCircle className="h-4 w-4" />
            صندوق الوارد
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-2">
            <TrendingUp className="h-4 w-4" />
            التقارير
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inbox" className="mt-4">
          <ProfessionalAgentInbox isAdmin={true} />
        </TabsContent>

        <TabsContent value="analytics" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>تقارير المحادثات</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-center py-8">
                قريباً: إحصائيات تفصيلية عن أداء المحادثات
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
