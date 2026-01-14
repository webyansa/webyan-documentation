import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format, parseISO, startOfMonth, endOfMonth, subMonths, differenceInHours } from 'date-fns';
import { ar } from 'date-fns/locale';
import {
  BarChart3,
  Users,
  Ticket,
  Calendar,
  Clock,
  TrendingUp,
  TrendingDown,
  Award,
  Target,
  Loader2,
  Filter,
  Download,
  ChevronDown
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';

interface StaffPerformance {
  id: string;
  full_name: string;
  email: string;
  job_title: string | null;
  is_active: boolean;
  can_reply_tickets: boolean;
  can_attend_meetings: boolean;
  ticketsAssigned: number;
  ticketsResolved: number;
  meetingsAssigned: number;
  meetingsCompleted: number;
  averageResponseTime: number; // in hours
  escalatedTickets: number;
  satisfactionScore: number;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export default function StaffPerformancePage() {
  const [staffPerformance, setStaffPerformance] = useState<StaffPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('this_month');
  const [selectedStaff, setSelectedStaff] = useState<string>('all');

  useEffect(() => {
    fetchPerformanceData();
  }, [selectedPeriod]);

  const getDateRange = () => {
    const now = new Date();
    switch (selectedPeriod) {
      case 'this_month':
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'last_month':
        const lastMonth = subMonths(now, 1);
        return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
      case 'last_3_months':
        return { start: startOfMonth(subMonths(now, 2)), end: endOfMonth(now) };
      case 'last_6_months':
        return { start: startOfMonth(subMonths(now, 5)), end: endOfMonth(now) };
      default:
        return { start: startOfMonth(now), end: endOfMonth(now) };
    }
  };

  const fetchPerformanceData = async () => {
    setLoading(true);
    try {
      const { start, end } = getDateRange();
      
      // Fetch all staff members
      const { data: staffMembers, error: staffError } = await supabase
        .from('staff_members')
        .select('*');

      if (staffError) throw staffError;

      // Fetch tickets for the period
      const { data: tickets, error: ticketsError } = await supabase
        .from('support_tickets')
        .select('*')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString());

      if (ticketsError) throw ticketsError;

      // Fetch meetings for the period
      const { data: meetings, error: meetingsError } = await supabase
        .from('meeting_requests')
        .select('*')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString());

      if (meetingsError) throw meetingsError;

      // Fetch ticket replies to calculate response time
      const { data: replies, error: repliesError } = await supabase
        .from('ticket_replies')
        .select('*')
        .eq('is_staff_reply', true)
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString());

      if (repliesError) throw repliesError;

      // Calculate performance metrics for each staff
      const performanceData: StaffPerformance[] = (staffMembers || []).map((staff: any) => {
        const staffTickets = (tickets || []).filter((t: any) => t.assigned_to_staff === staff.id);
        const resolvedTickets = staffTickets.filter((t: any) => t.status === 'resolved' || t.status === 'closed');
        const escalatedTickets = staffTickets.filter((t: any) => t.is_escalated);

        const staffMeetings = (meetings || []).filter((m: any) => m.assigned_staff === staff.id);
        const completedMeetings = staffMeetings.filter((m: any) => m.status === 'completed');

        // Calculate average response time
        let totalResponseTime = 0;
        let responseCount = 0;
        staffTickets.forEach((ticket: any) => {
          const firstReply = (replies || []).find((r: any) => 
            r.ticket_id === ticket.id && r.is_staff_reply
          );
          if (firstReply) {
            const responseTime = differenceInHours(
              parseISO(firstReply.created_at),
              parseISO(ticket.created_at)
            );
            totalResponseTime += responseTime;
            responseCount++;
          }
        });

        const averageResponseTime = responseCount > 0 ? totalResponseTime / responseCount : 0;

        return {
          id: staff.id,
          full_name: staff.full_name,
          email: staff.email,
          job_title: staff.job_title,
          is_active: staff.is_active,
          can_reply_tickets: staff.can_reply_tickets,
          can_attend_meetings: staff.can_attend_meetings,
          ticketsAssigned: staffTickets.length,
          ticketsResolved: resolvedTickets.length,
          meetingsAssigned: staffMeetings.length,
          meetingsCompleted: completedMeetings.length,
          averageResponseTime: Math.round(averageResponseTime * 10) / 10,
          escalatedTickets: escalatedTickets.length,
          satisfactionScore: resolvedTickets.length > 0 
            ? Math.round((resolvedTickets.length / (staffTickets.length || 1)) * 100) 
            : 0
        };
      });

      setStaffPerformance(performanceData);
    } catch (error) {
      console.error('Error fetching performance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalStats = {
    totalTickets: staffPerformance.reduce((sum, s) => sum + s.ticketsAssigned, 0),
    resolvedTickets: staffPerformance.reduce((sum, s) => sum + s.ticketsResolved, 0),
    totalMeetings: staffPerformance.reduce((sum, s) => sum + s.meetingsAssigned, 0),
    completedMeetings: staffPerformance.reduce((sum, s) => sum + s.meetingsCompleted, 0),
    escalatedTickets: staffPerformance.reduce((sum, s) => sum + s.escalatedTickets, 0),
    avgResponseTime: staffPerformance.length > 0 
      ? Math.round(staffPerformance.reduce((sum, s) => sum + s.averageResponseTime, 0) / staffPerformance.length * 10) / 10
      : 0
  };

  const ticketResolutionRate = totalStats.totalTickets > 0 
    ? Math.round((totalStats.resolvedTickets / totalStats.totalTickets) * 100) 
    : 0;

  const meetingCompletionRate = totalStats.totalMeetings > 0 
    ? Math.round((totalStats.completedMeetings / totalStats.totalMeetings) * 100) 
    : 0;

  // Chart data
  const staffChartData = staffPerformance
    .filter(s => s.is_active)
    .map(s => ({
      name: s.full_name.split(' ')[0],
      تذاكر_محلولة: s.ticketsResolved,
      اجتماعات_منجزة: s.meetingsCompleted,
      تذاكر_مصعدة: s.escalatedTickets
    }));

  const pieChartData = [
    { name: 'تذاكر محلولة', value: totalStats.resolvedTickets },
    { name: 'تذاكر معلقة', value: totalStats.totalTickets - totalStats.resolvedTickets },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <BarChart3 className="h-7 w-7 text-primary" />
            تقارير أداء الموظفين
          </h1>
          <p className="text-muted-foreground mt-1">متابعة وتحليل أداء فريق العمل</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-[180px]">
              <Filter className="h-4 w-4 ml-2" />
              <SelectValue placeholder="الفترة الزمنية" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="this_month">هذا الشهر</SelectItem>
              <SelectItem value="last_month">الشهر الماضي</SelectItem>
              <SelectItem value="last_3_months">آخر 3 أشهر</SelectItem>
              <SelectItem value="last_6_months">آخر 6 أشهر</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            تصدير التقرير
          </Button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <Ticket className="h-5 w-5 text-blue-700" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalStats.totalTickets}</p>
                <p className="text-xs text-muted-foreground">إجمالي التذاكر</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100">
                <TrendingUp className="h-5 w-5 text-green-700" />
              </div>
              <div>
                <p className="text-2xl font-bold">{ticketResolutionRate}%</p>
                <p className="text-xs text-muted-foreground">معدل الحل</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100">
                <Calendar className="h-5 w-5 text-purple-700" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalStats.completedMeetings}</p>
                <p className="text-xs text-muted-foreground">اجتماعات منجزة</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-100">
                <Clock className="h-5 w-5 text-orange-700" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalStats.avgResponseTime}h</p>
                <p className="text-xs text-muted-foreground">متوسط الاستجابة</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100">
                <TrendingDown className="h-5 w-5 text-red-700" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalStats.escalatedTickets}</p>
                <p className="text-xs text-muted-foreground">تذاكر مصعدة</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-cyan-100">
                <Award className="h-5 w-5 text-cyan-700" />
              </div>
              <div>
                <p className="text-2xl font-bold">{meetingCompletionRate}%</p>
                <p className="text-xs text-muted-foreground">إنجاز الاجتماعات</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>أداء الموظفين</CardTitle>
            <CardDescription>مقارنة بين أداء الموظفين</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={staffChartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={80} />
                <Tooltip />
                <Legend />
                <Bar dataKey="تذاكر_محلولة" fill="#10b981" name="تذاكر محلولة" />
                <Bar dataKey="اجتماعات_منجزة" fill="#3b82f6" name="اجتماعات منجزة" />
                <Bar dataKey="تذاكر_مصعدة" fill="#ef4444" name="تذاكر مصعدة" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>نسبة حل التذاكر</CardTitle>
            <CardDescription>توزيع حالات التذاكر</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Staff Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle>تفاصيل أداء الموظفين</CardTitle>
          <CardDescription>جدول شامل لأداء كل موظف</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الموظف</TableHead>
                <TableHead>المنصب</TableHead>
                <TableHead className="text-center">التذاكر</TableHead>
                <TableHead className="text-center">الاجتماعات</TableHead>
                <TableHead className="text-center">وقت الاستجابة</TableHead>
                <TableHead className="text-center">التصعيدات</TableHead>
                <TableHead className="text-center">معدل الإنجاز</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staffPerformance.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    لا توجد بيانات
                  </TableCell>
                </TableRow>
              ) : (
                staffPerformance.map((staff) => (
                  <TableRow key={staff.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {staff.full_name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{staff.full_name}</p>
                          <p className="text-sm text-muted-foreground">{staff.email}</p>
                        </div>
                        {!staff.is_active && (
                          <Badge variant="secondary">غير نشط</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{staff.job_title || '-'}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-lg font-bold">{staff.ticketsResolved}/{staff.ticketsAssigned}</span>
                        <Progress 
                          value={staff.ticketsAssigned > 0 ? (staff.ticketsResolved / staff.ticketsAssigned) * 100 : 0} 
                          className="w-20 h-2"
                        />
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-lg font-bold">{staff.meetingsCompleted}/{staff.meetingsAssigned}</span>
                        <Progress 
                          value={staff.meetingsAssigned > 0 ? (staff.meetingsCompleted / staff.meetingsAssigned) * 100 : 0} 
                          className="w-20 h-2"
                        />
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge 
                        variant={staff.averageResponseTime <= 4 ? 'default' : staff.averageResponseTime <= 12 ? 'secondary' : 'destructive'}
                        className={staff.averageResponseTime <= 4 ? 'bg-green-100 text-green-800' : ''}
                      >
                        {staff.averageResponseTime}h
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge 
                        variant={staff.escalatedTickets === 0 ? 'default' : 'destructive'}
                        className={staff.escalatedTickets === 0 ? 'bg-green-100 text-green-800' : ''}
                      >
                        {staff.escalatedTickets}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        <span className="font-bold">{staff.satisfactionScore}%</span>
                        {staff.satisfactionScore >= 80 ? (
                          <TrendingUp className="h-4 w-4 text-green-600" />
                        ) : staff.satisfactionScore >= 50 ? (
                          <Target className="h-4 w-4 text-yellow-600" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-red-600" />
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Top Performers */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-yellow-600" />
              أفضل موظف - التذاكر
            </CardTitle>
          </CardHeader>
          <CardContent>
            {staffPerformance.length > 0 ? (
              <div className="flex items-center gap-4">
                <Avatar className="h-14 w-14">
                  <AvatarFallback className="bg-yellow-200 text-yellow-800 text-lg">
                    {staffPerformance.sort((a, b) => b.ticketsResolved - a.ticketsResolved)[0].full_name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-bold text-lg">
                    {staffPerformance.sort((a, b) => b.ticketsResolved - a.ticketsResolved)[0].full_name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {staffPerformance.sort((a, b) => b.ticketsResolved - a.ticketsResolved)[0].ticketsResolved} تذكرة محلولة
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground">لا توجد بيانات</p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              أفضل موظف - الاجتماعات
            </CardTitle>
          </CardHeader>
          <CardContent>
            {staffPerformance.length > 0 ? (
              <div className="flex items-center gap-4">
                <Avatar className="h-14 w-14">
                  <AvatarFallback className="bg-blue-200 text-blue-800 text-lg">
                    {staffPerformance.sort((a, b) => b.meetingsCompleted - a.meetingsCompleted)[0].full_name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-bold text-lg">
                    {staffPerformance.sort((a, b) => b.meetingsCompleted - a.meetingsCompleted)[0].full_name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {staffPerformance.sort((a, b) => b.meetingsCompleted - a.meetingsCompleted)[0].meetingsCompleted} اجتماع منجز
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground">لا توجد بيانات</p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-green-600" />
              أسرع استجابة
            </CardTitle>
          </CardHeader>
          <CardContent>
            {staffPerformance.filter(s => s.averageResponseTime > 0).length > 0 ? (
              <div className="flex items-center gap-4">
                <Avatar className="h-14 w-14">
                  <AvatarFallback className="bg-green-200 text-green-800 text-lg">
                    {staffPerformance.filter(s => s.averageResponseTime > 0).sort((a, b) => a.averageResponseTime - b.averageResponseTime)[0].full_name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-bold text-lg">
                    {staffPerformance.filter(s => s.averageResponseTime > 0).sort((a, b) => a.averageResponseTime - b.averageResponseTime)[0].full_name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {staffPerformance.filter(s => s.averageResponseTime > 0).sort((a, b) => a.averageResponseTime - b.averageResponseTime)[0].averageResponseTime} ساعة متوسط
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground">لا توجد بيانات</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
