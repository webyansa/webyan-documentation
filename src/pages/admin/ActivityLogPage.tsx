import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Activity, 
  Loader2, 
  Search,
  LogIn,
  LogOut,
  Shield,
  UserPlus,
  UserMinus,
  RefreshCw,
  Calendar,
  Filter,
  Download
} from 'lucide-react';
import { format, subDays, isAfter, parseISO } from 'date-fns';
import { ar } from 'date-fns/locale';
import { toast } from 'sonner';

interface ActivityLog {
  id: string;
  user_id: string | null;
  user_email: string | null;
  user_name: string | null;
  action_type: string;
  action_details: string | null;
  metadata: any;
  created_at: string;
}

interface ActionTypeInfo {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  badgeColor: string;
}

const actionTypes: Record<string, ActionTypeInfo> = {
  login: {
    label: 'تسجيل دخول',
    icon: LogIn,
    color: 'text-green-600',
    badgeColor: 'bg-green-100 text-green-700',
  },
  logout: {
    label: 'تسجيل خروج',
    icon: LogOut,
    color: 'text-gray-600',
    badgeColor: 'bg-gray-100 text-gray-700',
  },
  role_assigned: {
    label: 'تعيين صلاحية',
    icon: Shield,
    color: 'text-blue-600',
    badgeColor: 'bg-blue-100 text-blue-700',
  },
  role_changed: {
    label: 'تغيير صلاحية',
    icon: RefreshCw,
    color: 'text-amber-600',
    badgeColor: 'bg-amber-100 text-amber-700',
  },
  role_removed: {
    label: 'إزالة صلاحية',
    icon: UserMinus,
    color: 'text-red-600',
    badgeColor: 'bg-red-100 text-red-700',
  },
  user_created: {
    label: 'إنشاء مستخدم',
    icon: UserPlus,
    color: 'text-emerald-600',
    badgeColor: 'bg-emerald-100 text-emerald-700',
  },
};

const defaultActionInfo: ActionTypeInfo = {
  label: 'نشاط',
  icon: Activity,
  color: 'text-gray-600',
  badgeColor: 'bg-gray-100 text-gray-700',
};

export default function ActivityLogPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAction, setFilterAction] = useState<string>('all');
  const [filterPeriod, setFilterPeriod] = useState<string>('7');

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_activity_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) throw error;

      setLogs(data || []);
    } catch (error) {
      console.error('Error fetching activity logs:', error);
      toast.error('حدث خطأ أثناء تحميل سجل النشاط');
    } finally {
      setLoading(false);
    }
  };

  const getActionInfo = (actionType: string): ActionTypeInfo => {
    return actionTypes[actionType] || defaultActionInfo;
  };

  const getActionBadge = (actionType: string) => {
    const info = getActionInfo(actionType);
    const Icon = info.icon;
    return (
      <Badge className={`${info.badgeColor} gap-1`}>
        <Icon className="h-3 w-3" />
        {info.label}
      </Badge>
    );
  };

  const filteredLogs = logs.filter(log => {
    // Search filter
    const matchesSearch = 
      (log.user_name?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
      (log.user_email?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
      (log.action_details?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    
    // Action type filter
    const matchesAction = filterAction === 'all' || log.action_type === filterAction;
    
    // Period filter
    let matchesPeriod = true;
    if (filterPeriod !== 'all') {
      const daysAgo = parseInt(filterPeriod);
      const cutoffDate = subDays(new Date(), daysAgo);
      matchesPeriod = isAfter(parseISO(log.created_at), cutoffDate);
    }
    
    return matchesSearch && matchesAction && matchesPeriod;
  });

  const actionStats = {
    login: logs.filter(l => l.action_type === 'login').length,
    logout: logs.filter(l => l.action_type === 'logout').length,
    role_changed: logs.filter(l => l.action_type === 'role_changed' || l.action_type === 'role_assigned').length,
    other: logs.filter(l => !['login', 'logout', 'role_changed', 'role_assigned'].includes(l.action_type)).length,
  };

  const exportLogs = () => {
    const csvContent = [
      ['التاريخ', 'المستخدم', 'البريد', 'النشاط', 'التفاصيل'].join(','),
      ...filteredLogs.map(log => [
        format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss'),
        log.user_name || '-',
        log.user_email || '-',
        getActionInfo(log.action_type).label,
        log.action_details || '-',
      ].join(','))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `activity-log-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    toast.success('تم تصدير السجل بنجاح');
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
          <h1 className="text-2xl font-bold">سجل النشاط</h1>
          <p className="text-muted-foreground">
            تتبع عمليات تسجيل الدخول والخروج وتغييرات الصلاحيات
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchLogs}>
            <RefreshCw className="h-4 w-4 ml-2" />
            تحديث
          </Button>
          <Button variant="outline" onClick={exportLogs}>
            <Download className="h-4 w-4 ml-2" />
            تصدير
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <LogIn className="h-4 w-4 text-green-500" />
              عمليات الدخول
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{actionStats.login}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <LogOut className="h-4 w-4 text-gray-500" />
              عمليات الخروج
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{actionStats.logout}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Shield className="h-4 w-4 text-blue-500" />
              تغييرات الصلاحيات
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{actionStats.role_changed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4 text-purple-500" />
              أنشطة أخرى
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{actionStats.other}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="البحث بالاسم أو البريد أو التفاصيل..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-10"
          />
        </div>
        <Select value={filterAction} onValueChange={setFilterAction}>
          <SelectTrigger className="w-[180px]">
            <Filter className="h-4 w-4 ml-2" />
            <SelectValue placeholder="نوع النشاط" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">جميع الأنشطة</SelectItem>
            <SelectItem value="login">تسجيل دخول</SelectItem>
            <SelectItem value="logout">تسجيل خروج</SelectItem>
            <SelectItem value="role_assigned">تعيين صلاحية</SelectItem>
            <SelectItem value="role_changed">تغيير صلاحية</SelectItem>
            <SelectItem value="role_removed">إزالة صلاحية</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterPeriod} onValueChange={setFilterPeriod}>
          <SelectTrigger className="w-[180px]">
            <Calendar className="h-4 w-4 ml-2" />
            <SelectValue placeholder="الفترة الزمنية" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">آخر يوم</SelectItem>
            <SelectItem value="7">آخر أسبوع</SelectItem>
            <SelectItem value="30">آخر شهر</SelectItem>
            <SelectItem value="90">آخر 3 أشهر</SelectItem>
            <SelectItem value="all">الكل</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Activity Table */}
      <Card>
        <CardHeader>
          <CardTitle>سجل الأنشطة</CardTitle>
          <CardDescription>
            {filteredLogs.length} من {logs.length} نشاط
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-12">
              <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">لا يوجد سجلات نشاط</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>التاريخ والوقت</TableHead>
                  <TableHead>المستخدم</TableHead>
                  <TableHead>النشاط</TableHead>
                  <TableHead>التفاصيل</TableHead>
                  <TableHead>معلومات إضافية</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {format(new Date(log.created_at), 'dd MMM yyyy', { locale: ar })}
                        </span>
                        <span className="text-sm text-muted-foreground" dir="ltr">
                          {format(new Date(log.created_at), 'HH:mm:ss')}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-primary/10 text-primary text-sm">
                            {(log.user_name || log.user_email || '?')?.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{log.user_name || 'مستخدم غير معروف'}</p>
                          <p className="text-sm text-muted-foreground" dir="ltr">
                            {log.user_email || '-'}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{getActionBadge(log.action_type)}</TableCell>
                    <TableCell className="max-w-[250px]">
                      <p className="text-sm truncate">{log.action_details || '-'}</p>
                    </TableCell>
                    <TableCell>
                      {log.metadata && (
                        <div className="text-sm text-muted-foreground">
                          {log.metadata.changed_by && (
                            <p>بواسطة: {log.metadata.changed_by_name || log.metadata.changed_by}</p>
                          )}
                          {log.metadata.old_role && log.metadata.new_role && (
                            <p>
                              {log.metadata.old_role} → {log.metadata.new_role}
                            </p>
                          )}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
