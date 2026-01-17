import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { 
  Building2, Mail, Phone, Globe, Calendar, MessageCircle, Ticket,
  Users, Clock, Star, ChevronLeft, ExternalLink, Loader2
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface ClientDetailPanelProps {
  organizationId?: string | null;
  clientEmail?: string | null;
  clientName?: string | null;
  onClose?: () => void;
}

interface ClientTicket {
  id: string;
  ticket_number: string;
  subject: string;
  status: string;
  priority: string;
  created_at: string;
}

interface ClientMeeting {
  id: string;
  subject: string;
  status: string;
  preferred_date: string;
  meeting_type: string;
}

interface ClientConversation {
  id: string;
  subject: string | null;
  status: string;
  last_message_at: string | null;
  created_at: string;
}

interface ClientInfo {
  id: string;
  name: string;
  contact_email: string;
  contact_phone: string | null;
  website_url: string | null;
  logo_url: string | null;
  subscription_status: string;
  subscription_plan: string | null;
  created_at: string;
}

const statusColors = {
  open: 'bg-amber-500',
  in_progress: 'bg-blue-500',
  resolved: 'bg-green-500',
  closed: 'bg-gray-400',
  pending: 'bg-amber-500',
  confirmed: 'bg-green-500',
  completed: 'bg-blue-500',
  cancelled: 'bg-red-500',
  unassigned: 'bg-amber-500',
  assigned: 'bg-green-500'
};

const statusLabels = {
  open: 'مفتوحة',
  in_progress: 'قيد المعالجة',
  resolved: 'محلولة',
  closed: 'مغلقة',
  pending: 'معلقة',
  confirmed: 'مؤكدة',
  completed: 'مكتملة',
  cancelled: 'ملغاة',
  unassigned: 'غير مسندة',
  assigned: 'مسندة'
};

export default function ClientDetailPanel({ 
  organizationId, 
  clientEmail, 
  clientName,
  onClose 
}: ClientDetailPanelProps) {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [clientInfo, setClientInfo] = useState<ClientInfo | null>(null);
  const [tickets, setTickets] = useState<ClientTicket[]>([]);
  const [meetings, setMeetings] = useState<ClientMeeting[]>([]);
  const [conversations, setConversations] = useState<ClientConversation[]>([]);
  const [stats, setStats] = useState({
    totalTickets: 0,
    openTickets: 0,
    totalMeetings: 0,
    upcomingMeetings: 0,
    totalConversations: 0,
    activeConversations: 0,
    avgRating: 0
  });

  useEffect(() => {
    if (organizationId || clientEmail) {
      fetchClientData();
    }
  }, [organizationId, clientEmail]);

  const fetchClientData = async () => {
    setLoading(true);
    try {
      // Fetch organization info if available
      if (organizationId) {
        const { data: org } = await supabase
          .from('client_organizations')
          .select('*')
          .eq('id', organizationId)
          .single();
        
        if (org) {
          setClientInfo(org);
        }

        // Fetch tickets
        const { data: ticketsData } = await supabase
          .from('support_tickets')
          .select('id, ticket_number, subject, status, priority, created_at')
          .eq('organization_id', organizationId)
          .order('created_at', { ascending: false })
          .limit(20);
        
        setTickets(ticketsData || []);

        // Fetch meetings
        const { data: meetingsData } = await supabase
          .from('meeting_requests')
          .select('id, subject, status, preferred_date, meeting_type')
          .eq('organization_id', organizationId)
          .order('preferred_date', { ascending: false })
          .limit(20);
        
        setMeetings(meetingsData || []);

        // Fetch conversations
        const { data: convData } = await supabase
          .from('conversations')
          .select('id, subject, status, last_message_at, created_at')
          .eq('organization_id', organizationId)
          .order('last_message_at', { ascending: false })
          .limit(20);
        
        setConversations(convData || []);

        // Fetch ratings
        const { data: ratingsData } = await supabase
          .from('meeting_ratings')
          .select('rating')
          .eq('organization_id', organizationId);
        
        const avgRating = ratingsData?.length 
          ? ratingsData.reduce((sum, r) => sum + r.rating, 0) / ratingsData.length 
          : 0;

        // Calculate stats
        setStats({
          totalTickets: ticketsData?.length || 0,
          openTickets: ticketsData?.filter(t => t.status !== 'resolved' && t.status !== 'closed').length || 0,
          totalMeetings: meetingsData?.length || 0,
          upcomingMeetings: meetingsData?.filter(m => m.status === 'confirmed' || m.status === 'pending').length || 0,
          totalConversations: convData?.length || 0,
          activeConversations: convData?.filter(c => c.status !== 'closed').length || 0,
          avgRating
        });
      } else if (clientEmail) {
        // For embed clients without organization
        // Fetch tickets by guest email
        const { data: ticketsData } = await supabase
          .from('support_tickets')
          .select('id, ticket_number, subject, status, priority, created_at')
          .eq('guest_email', clientEmail)
          .order('created_at', { ascending: false })
          .limit(20);
        
        setTickets(ticketsData || []);

        // Stats for non-org client
        setStats({
          totalTickets: ticketsData?.length || 0,
          openTickets: ticketsData?.filter(t => t.status !== 'resolved' && t.status !== 'closed').length || 0,
          totalMeetings: 0,
          upcomingMeetings: 0,
          totalConversations: conversations.length,
          activeConversations: conversations.filter(c => c.status !== 'closed').length,
          avgRating: 0
        });
      }
    } catch (error) {
      console.error('Error fetching client data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b flex items-center gap-3">
        {onClose && (
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
            <ChevronLeft className="h-4 w-4 rotate-180" />
          </Button>
        )}
        <Avatar className="h-12 w-12">
          {clientInfo?.logo_url && <AvatarImage src={clientInfo.logo_url} />}
          <AvatarFallback className="bg-primary/10 text-primary">
            {clientInfo?.name?.charAt(0) || clientName?.charAt(0) || <Building2 className="h-5 w-5" />}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm truncate">
            {clientInfo?.name || clientName || 'عميل'}
          </h3>
          <p className="text-xs text-muted-foreground truncate">
            {clientInfo?.contact_email || clientEmail}
          </p>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="p-4 border-b">
        <div className="grid grid-cols-3 gap-2">
          <Card className="p-2 text-center">
            <p className="text-lg font-bold text-primary">{stats.totalConversations}</p>
            <p className="text-[10px] text-muted-foreground">محادثة</p>
          </Card>
          <Card className="p-2 text-center">
            <p className="text-lg font-bold text-amber-600">{stats.totalTickets}</p>
            <p className="text-[10px] text-muted-foreground">تذكرة</p>
          </Card>
          <Card className="p-2 text-center">
            <p className="text-lg font-bold text-green-600">{stats.totalMeetings}</p>
            <p className="text-[10px] text-muted-foreground">اجتماع</p>
          </Card>
        </div>
        
        {stats.avgRating > 0 && (
          <div className="mt-2 flex items-center justify-center gap-1 text-xs text-muted-foreground">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            <span>التقييم: {stats.avgRating.toFixed(1)} / 5</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="w-full grid grid-cols-4 h-10 mx-2 mt-2">
          <TabsTrigger value="overview" className="text-[10px]">نظرة عامة</TabsTrigger>
          <TabsTrigger value="conversations" className="text-[10px]">
            المحادثات
            {stats.activeConversations > 0 && (
              <Badge variant="secondary" className="h-4 min-w-4 text-[9px] p-0 px-1 mr-1">
                {stats.activeConversations}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="tickets" className="text-[10px]">
            التذاكر
            {stats.openTickets > 0 && (
              <Badge variant="secondary" className="h-4 min-w-4 text-[9px] p-0 px-1 mr-1">
                {stats.openTickets}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="meetings" className="text-[10px]">الاجتماعات</TabsTrigger>
        </TabsList>

        <ScrollArea className="flex-1">
          <TabsContent value="overview" className="m-0 p-4 space-y-4">
            {/* Client Details */}
            {clientInfo && (
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-muted-foreground">معلومات المؤسسة</h4>
                <div className="space-y-2 text-sm">
                  {clientInfo.contact_email && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="h-4 w-4" />
                      <span className="truncate">{clientInfo.contact_email}</span>
                    </div>
                  )}
                  {clientInfo.contact_phone && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-4 w-4" />
                      <span>{clientInfo.contact_phone}</span>
                    </div>
                  )}
                  {clientInfo.website_url && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Globe className="h-4 w-4" />
                      <a href={clientInfo.website_url} target="_blank" rel="noopener noreferrer" className="truncate hover:underline">
                        {clientInfo.website_url}
                      </a>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>عميل منذ {formatDistanceToNow(new Date(clientInfo.created_at), { locale: ar })}</span>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-muted-foreground">الاشتراك</h4>
                  <div className="flex items-center gap-2">
                    <Badge variant={clientInfo.subscription_status === 'active' ? 'default' : 'secondary'}>
                      {clientInfo.subscription_status === 'active' ? 'نشط' : clientInfo.subscription_status}
                    </Badge>
                    {clientInfo.subscription_plan && (
                      <span className="text-sm text-muted-foreground">
                        {clientInfo.subscription_plan}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Quick Stats */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-muted-foreground">ملخص النشاط</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MessageCircle className="h-4 w-4" />
                    <span>المحادثات النشطة</span>
                  </div>
                  <span className="font-medium">{stats.activeConversations}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Ticket className="h-4 w-4" />
                    <span>التذاكر المفتوحة</span>
                  </div>
                  <span className="font-medium">{stats.openTickets}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>الاجتماعات القادمة</span>
                  </div>
                  <span className="font-medium">{stats.upcomingMeetings}</span>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="conversations" className="m-0 p-2">
            {conversations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-20" />
                <p className="text-sm">لا توجد محادثات</p>
              </div>
            ) : (
              <div className="space-y-2">
                {conversations.map((conv) => (
                  <Card key={conv.id} className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{conv.subject || 'محادثة'}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {conv.last_message_at 
                            ? formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: true, locale: ar })
                            : format(new Date(conv.created_at), 'dd/MM/yyyy', { locale: ar })
                          }
                        </p>
                      </div>
                      <Badge 
                        variant="outline" 
                        className={cn(
                          "text-[10px] h-5",
                          conv.status === 'closed' ? 'bg-gray-50' : 'bg-green-50 text-green-600'
                        )}
                      >
                        {statusLabels[conv.status as keyof typeof statusLabels] || conv.status}
                      </Badge>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="tickets" className="m-0 p-2">
            {tickets.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Ticket className="h-8 w-8 mx-auto mb-2 opacity-20" />
                <p className="text-sm">لا توجد تذاكر</p>
              </div>
            ) : (
              <div className="space-y-2">
                {tickets.map((ticket) => (
                  <Card key={ticket.id} className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {ticket.ticket_number}
                          </span>
                          <Badge 
                            variant="outline" 
                            className={cn(
                              "text-[10px] h-4 px-1",
                              ticket.priority === 'urgent' && 'bg-red-50 text-red-600',
                              ticket.priority === 'high' && 'bg-orange-50 text-orange-600',
                              ticket.priority === 'medium' && 'bg-amber-50 text-amber-600',
                              ticket.priority === 'low' && 'bg-green-50 text-green-600'
                            )}
                          >
                            {ticket.priority === 'urgent' ? 'عاجلة' : 
                             ticket.priority === 'high' ? 'عالية' :
                             ticket.priority === 'medium' ? 'متوسطة' : 'منخفضة'}
                          </Badge>
                        </div>
                        <p className="font-medium text-sm truncate">{ticket.subject}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {format(new Date(ticket.created_at), 'dd/MM/yyyy', { locale: ar })}
                        </p>
                      </div>
                      <Badge 
                        variant="outline" 
                        className={cn(
                          "text-[10px] h-5",
                          ticket.status === 'resolved' && 'bg-green-50 text-green-600',
                          ticket.status === 'closed' && 'bg-gray-50',
                          (ticket.status === 'open' || ticket.status === 'in_progress') && 'bg-amber-50 text-amber-600'
                        )}
                      >
                        {statusLabels[ticket.status as keyof typeof statusLabels] || ticket.status}
                      </Badge>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="meetings" className="m-0 p-2">
            {meetings.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-20" />
                <p className="text-sm">لا توجد اجتماعات</p>
              </div>
            ) : (
              <div className="space-y-2">
                {meetings.map((meeting) => (
                  <Card key={meeting.id} className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{meeting.subject}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-muted-foreground">
                            {format(new Date(meeting.preferred_date), 'dd/MM/yyyy HH:mm', { locale: ar })}
                          </span>
                          <Badge variant="outline" className="text-[10px] h-4 px-1">
                            {meeting.meeting_type}
                          </Badge>
                        </div>
                      </div>
                      <Badge 
                        variant="outline" 
                        className={cn(
                          "text-[10px] h-5",
                          meeting.status === 'confirmed' && 'bg-green-50 text-green-600',
                          meeting.status === 'completed' && 'bg-blue-50 text-blue-600',
                          meeting.status === 'cancelled' && 'bg-red-50 text-red-600',
                          meeting.status === 'pending' && 'bg-amber-50 text-amber-600'
                        )}
                      >
                        {statusLabels[meeting.status as keyof typeof statusLabels] || meeting.status}
                      </Badge>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
}
