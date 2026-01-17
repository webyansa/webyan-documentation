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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, 
  Loader2, 
  Shield, 
  UserCheck, 
  Eye, 
  Headphones, 
  Search,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Info
} from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

type AppRole = 'admin' | 'editor' | 'viewer' | 'support_agent';

interface UserWithRole {
  id: string;
  email: string | null;
  full_name: string | null;
  created_at: string;
  role: AppRole;
}

interface RoleInfo {
  name: string;
  description: string;
  permissions: string[];
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  badgeColor: string;
}

const rolesInfo: Record<AppRole, RoleInfo> = {
  admin: {
    name: 'مدير',
    description: 'صلاحيات كاملة للوصول إلى جميع أجزاء النظام',
    permissions: [
      'الوصول الكامل للوحة التحكم',
      'إدارة المستخدمين والصلاحيات',
      'إدارة المحتوى والمقالات',
      'إدارة تذاكر الدعم والمحادثات',
      'إدارة الاجتماعات والعملاء',
      'عرض التقارير والإحصائيات',
      'تعديل إعدادات النظام',
    ],
    icon: Shield,
    color: 'text-red-600',
    badgeColor: 'bg-red-100 text-red-700',
  },
  editor: {
    name: 'محرر',
    description: 'صلاحيات إدارة المحتوى والمقالات',
    permissions: [
      'الوصول للوحة التحكم',
      'إنشاء وتعديل المقالات',
      'إدارة شجرة المحتوى',
      'رفع الوسائط والملفات',
      'إدارة الوسوم',
    ],
    icon: UserCheck,
    color: 'text-blue-600',
    badgeColor: 'bg-blue-100 text-blue-700',
  },
  support_agent: {
    name: 'موظف دعم فني',
    description: 'صلاحيات الرد على التذاكر والمحادثات',
    permissions: [
      'الوصول لبوابة الموظفين',
      'الرد على تذاكر الدعم المُسندة',
      'المشاركة في المحادثات',
      'حضور الاجتماعات المُسندة',
      'عرض بيانات العملاء المرتبطة',
    ],
    icon: Headphones,
    color: 'text-orange-600',
    badgeColor: 'bg-orange-100 text-orange-700',
  },
  viewer: {
    name: 'زائر',
    description: 'صلاحيات محدودة للعرض فقط',
    permissions: [
      'عرض الدليل العام',
      'تصفح المقالات المنشورة',
    ],
    icon: Eye,
    color: 'text-gray-600',
    badgeColor: 'bg-gray-100 text-gray-700',
  },
};

export default function RolesManagementPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<AppRole | 'all'>('all');
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    userId: string;
    userName: string;
    oldRole: AppRole;
    newRole: AppRole;
  } | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, full_name, created_at')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      const usersWithRoles: UserWithRole[] = [];
      
      for (const profile of profiles || []) {
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', profile.id)
          .maybeSingle();

        usersWithRoles.push({
          ...profile,
          role: (roleData?.role as AppRole) || 'viewer',
        });
      }

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('حدث خطأ أثناء تحميل المستخدمين');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async () => {
    if (!confirmDialog) return;
    
    const { userId, newRole, oldRole } = confirmDialog;

    if (userId === currentUser?.id) {
      toast.error('لا يمكنك تغيير صلاحياتك الخاصة');
      setConfirmDialog(null);
      return;
    }

    setUpdating(userId);
    setConfirmDialog(null);

    try {
      // Delete existing role
      await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      // Insert new role
      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role: newRole });

      if (error) throw error;

      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
      );
      
      toast.success(`تم تغيير الصلاحية من "${rolesInfo[oldRole].name}" إلى "${rolesInfo[newRole].name}"`);
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error('حدث خطأ أثناء تحديث الصلاحية');
    } finally {
      setUpdating(null);
    }
  };

  const openConfirmDialog = (user: UserWithRole, newRole: AppRole) => {
    if (user.role === newRole) return;
    
    setConfirmDialog({
      open: true,
      userId: user.id,
      userName: user.full_name || user.email || 'المستخدم',
      oldRole: user.role,
      newRole,
    });
  };

  const getRoleBadge = (role: AppRole) => {
    const info = rolesInfo[role];
    const Icon = info.icon;
    return (
      <Badge className={`${info.badgeColor} gap-1`}>
        <Icon className="h-3 w-3" />
        {info.name}
      </Badge>
    );
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      (user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
      (user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    
    return matchesSearch && matchesRole;
  });

  const roleStats = {
    admin: users.filter(u => u.role === 'admin').length,
    editor: users.filter(u => u.role === 'editor').length,
    support_agent: users.filter(u => u.role === 'support_agent').length,
    viewer: users.filter(u => u.role === 'viewer').length,
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
      <div>
        <h1 className="text-2xl font-bold">إدارة الأدوار والصلاحيات</h1>
        <p className="text-muted-foreground">
          تحكم بصلاحيات المستخدمين وأدوارهم في النظام
        </p>
      </div>

      <Tabs defaultValue="users" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="users">المستخدمين</TabsTrigger>
          <TabsTrigger value="roles">الأدوار والصلاحيات</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-6">
          {/* Stats */}
          <div className="grid gap-4 md:grid-cols-4">
            {(Object.entries(roleStats) as [AppRole, number][]).map(([role, count]) => {
              const info = rolesInfo[role];
              const Icon = info.icon;
              return (
                <Card key={role} className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setFilterRole(filterRole === role ? 'all' : role)}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Icon className={`h-4 w-4 ${info.color}`} />
                      {info.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{count}</div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="البحث بالاسم أو البريد..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10"
              />
            </div>
            <Select value={filterRole} onValueChange={(v) => setFilterRole(v as AppRole | 'all')}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="تصفية حسب الدور" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الأدوار</SelectItem>
                <SelectItem value="admin">المدراء</SelectItem>
                <SelectItem value="editor">المحررين</SelectItem>
                <SelectItem value="support_agent">موظفي الدعم</SelectItem>
                <SelectItem value="viewer">الزوار</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Users Table */}
          <Card>
            <CardHeader>
              <CardTitle>قائمة المستخدمين</CardTitle>
              <CardDescription>
                {filteredUsers.length} من {users.length} مستخدم
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {filteredUsers.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">لا يوجد مستخدمين</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>المستخدم</TableHead>
                      <TableHead>البريد الإلكتروني</TableHead>
                      <TableHead>الدور الحالي</TableHead>
                      <TableHead>تغيير الدور</TableHead>
                      <TableHead>تاريخ التسجيل</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="bg-primary/10 text-primary text-sm">
                                {(user.full_name || user.email)?.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{user.full_name || 'بدون اسم'}</p>
                              {user.id === currentUser?.id && (
                                <Badge variant="outline" className="text-xs">أنت</Badge>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground" dir="ltr">
                          {user.email}
                        </TableCell>
                        <TableCell>{getRoleBadge(user.role)}</TableCell>
                        <TableCell>
                          {user.id === currentUser?.id ? (
                            <span className="text-muted-foreground text-sm">-</span>
                          ) : (
                            <Select
                              value={user.role}
                              onValueChange={(v) => openConfirmDialog(user, v as AppRole)}
                              disabled={updating === user.id}
                            >
                              <SelectTrigger className="w-[150px]">
                                {updating === user.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <SelectValue />
                                )}
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="admin">مدير</SelectItem>
                                <SelectItem value="editor">محرر</SelectItem>
                                <SelectItem value="support_agent">موظف دعم فني</SelectItem>
                                <SelectItem value="viewer">زائر</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(user.created_at), 'dd MMM yyyy', { locale: ar })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="roles" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {(Object.entries(rolesInfo) as [AppRole, RoleInfo][]).map(([role, info]) => {
              const Icon = info.icon;
              return (
                <Card key={role}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${info.badgeColor}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      {info.name}
                    </CardTitle>
                    <CardDescription>{info.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground mb-3">الصلاحيات:</p>
                      <ul className="space-y-2">
                        {info.permissions.map((perm, idx) => (
                          <li key={idx} className="flex items-center gap-2 text-sm">
                            <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                            {perm}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-sm text-muted-foreground">
                        عدد المستخدمين: <span className="font-bold text-foreground">{roleStats[role]}</span>
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Role Matrix */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5" />
                مصفوفة الصلاحيات
              </CardTitle>
              <CardDescription>
                مقارنة سريعة بين صلاحيات الأدوار المختلفة
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[250px]">الصلاحية</TableHead>
                    <TableHead className="text-center">مدير</TableHead>
                    <TableHead className="text-center">محرر</TableHead>
                    <TableHead className="text-center">موظف دعم</TableHead>
                    <TableHead className="text-center">زائر</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[
                    { label: 'لوحة التحكم الرئيسية', admin: true, editor: true, support_agent: false, viewer: false },
                    { label: 'بوابة الموظفين', admin: true, editor: false, support_agent: true, viewer: false },
                    { label: 'إدارة المستخدمين', admin: true, editor: false, support_agent: false, viewer: false },
                    { label: 'إدارة المحتوى', admin: true, editor: true, support_agent: false, viewer: false },
                    { label: 'تذاكر الدعم', admin: true, editor: false, support_agent: true, viewer: false },
                    { label: 'المحادثات', admin: true, editor: false, support_agent: true, viewer: false },
                    { label: 'الاجتماعات', admin: true, editor: false, support_agent: true, viewer: false },
                    { label: 'إدارة العملاء', admin: true, editor: false, support_agent: false, viewer: false },
                    { label: 'التقارير', admin: true, editor: false, support_agent: false, viewer: false },
                    { label: 'إعدادات النظام', admin: true, editor: false, support_agent: false, viewer: false },
                  ].map((row, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{row.label}</TableCell>
                      <TableCell className="text-center">
                        {row.admin ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500 mx-auto" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-300 mx-auto" />
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {row.editor ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500 mx-auto" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-300 mx-auto" />
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {row.support_agent ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500 mx-auto" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-300 mx-auto" />
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {row.viewer ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500 mx-auto" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-300 mx-auto" />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Confirm Dialog */}
      <Dialog open={!!confirmDialog} onOpenChange={() => setConfirmDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              تأكيد تغيير الصلاحية
            </DialogTitle>
            <DialogDescription className="pt-4 space-y-3">
              <p>هل أنت متأكد من تغيير صلاحية المستخدم:</p>
              <p className="font-bold text-foreground">{confirmDialog?.userName}</p>
              <div className="flex items-center gap-2 justify-center py-2">
                {confirmDialog && (
                  <>
                    {getRoleBadge(confirmDialog.oldRole)}
                    <span className="text-muted-foreground">←</span>
                    {getRoleBadge(confirmDialog.newRole)}
                  </>
                )}
              </div>
              <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg">
                سيتم تسجيل هذا التغيير في سجل النشاط
              </p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmDialog(null)}>
              إلغاء
            </Button>
            <Button onClick={handleRoleChange}>
              تأكيد التغيير
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
