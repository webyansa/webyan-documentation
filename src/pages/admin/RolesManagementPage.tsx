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
  Search,
  CheckCircle2,
  XCircle,
  Info,
  AlertTriangle,
} from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { 
  AppRole, 
  rolesInfo, 
  rolePermissions, 
  allRoles,
  RolePermissions,
} from '@/lib/permissions';

interface UserWithRole {
  id: string;
  email: string | null;
  full_name: string | null;
  created_at: string;
  role: AppRole | null;
}

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
    oldRole: AppRole | null;
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
          role: (roleData?.role as AppRole) || null,
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

      // Insert new role (only if not null/removing)
      if (newRole) {
        const { error } = await supabase
          .from('user_roles')
          .insert({ user_id: userId, role: newRole } as any);

        if (error) throw error;
      }

      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
      );
      
      const oldRoleName = oldRole ? rolesInfo[oldRole].name : 'بدون دور';
      const newRoleName = rolesInfo[newRole].name;
      toast.success(`تم تغيير الصلاحية من "${oldRoleName}" إلى "${newRoleName}"`);
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

  const getRoleBadge = (role: AppRole | null) => {
    if (!role) {
      return (
        <Badge variant="outline" className="gap-1 text-muted-foreground">
          <XCircle className="h-3 w-3" />
          بدون دور
        </Badge>
      );
    }
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

  const roleStats: Record<AppRole | 'none', number> = {
    admin: users.filter(u => u.role === 'admin').length,
    editor: users.filter(u => u.role === 'editor').length,
    support_agent: users.filter(u => u.role === 'support_agent').length,
    client: users.filter(u => u.role === 'client').length,
    none: users.filter(u => !u.role).length,
  };

  // Permission labels for matrix
  const permissionLabels: { key: keyof RolePermissions; label: string; category: string }[] = [
    // Admin Dashboard
    { key: 'canAccessAdminDashboard', label: 'الوصول للوحة التحكم', category: 'لوحة التحكم' },
    { key: 'canViewReports', label: 'عرض التقارير والإحصائيات', category: 'لوحة التحكم' },
    // User Management
    { key: 'canManageUsers', label: 'إدارة المستخدمين', category: 'إدارة المستخدمين' },
    { key: 'canManageRoles', label: 'إدارة الأدوار والصلاحيات', category: 'إدارة المستخدمين' },
    // Content Management
    { key: 'canManageArticles', label: 'إدارة المقالات', category: 'إدارة المحتوى' },
    { key: 'canManageContentTree', label: 'إدارة شجرة المحتوى', category: 'إدارة المحتوى' },
    { key: 'canManageMedia', label: 'إدارة الوسائط', category: 'إدارة المحتوى' },
    { key: 'canManageTags', label: 'إدارة الوسوم', category: 'إدارة المحتوى' },
    // Support (Admin)
    { key: 'canViewAllTickets', label: 'عرض جميع التذاكر', category: 'الدعم الفني' },
    { key: 'canViewAllChats', label: 'عرض جميع المحادثات', category: 'الدعم الفني' },
    { key: 'canViewAllMeetings', label: 'عرض جميع الاجتماعات', category: 'الدعم الفني' },
    { key: 'canManageEscalation', label: 'إدارة التصعيد', category: 'الدعم الفني' },
    // Client Management
    { key: 'canManageClients', label: 'إدارة العملاء', category: 'العملاء' },
    { key: 'canManageStaff', label: 'إدارة الموظفين', category: 'الموظفين' },
    // System
    { key: 'canManageSystemSettings', label: 'الإعدادات العامة', category: 'النظام' },
    { key: 'canViewActivityLogs', label: 'سجل النشاط', category: 'النظام' },
    // Support Portal
    { key: 'canAccessSupportPortal', label: 'الوصول لبوابة الدعم', category: 'بوابة الدعم' },
    { key: 'canReplyToAssignedTickets', label: 'الرد على التذاكر الموجهة', category: 'بوابة الدعم' },
    { key: 'canManageAssignedChats', label: 'إدارة المحادثات الموجهة', category: 'بوابة الدعم' },
    { key: 'canAttendAssignedMeetings', label: 'حضور الاجتماعات الموجهة', category: 'بوابة الدعم' },
    // Client Portal
    { key: 'canAccessClientPortal', label: 'الوصول لبوابة العملاء', category: 'بوابة العملاء' },
    { key: 'canCreateTickets', label: 'فتح تذاكر الدعم', category: 'بوابة العملاء' },
    { key: 'canCreateChats', label: 'بدء محادثات', category: 'بوابة العملاء' },
    { key: 'canRequestMeetings', label: 'طلب اجتماعات', category: 'بوابة العملاء' },
  ];

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
          <div className="grid gap-4 md:grid-cols-5">
            {allRoles.map((role) => {
              const info = rolesInfo[role];
              const Icon = info.icon;
              const count = roleStats[role];
              return (
                <Card 
                  key={role} 
                  className="cursor-pointer hover:bg-muted/50 transition-colors" 
                  onClick={() => setFilterRole(filterRole === role ? 'all' : role)}
                >
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
            <Card 
              className="cursor-pointer hover:bg-muted/50 transition-colors border-dashed" 
              onClick={() => setFilterRole('all')}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-muted-foreground" />
                  بدون دور
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{roleStats.none}</div>
              </CardContent>
            </Card>
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
                <SelectItem value="support_agent">الدعم الفني</SelectItem>
                <SelectItem value="client">العملاء</SelectItem>
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
                              value={user.role || 'none'}
                              onValueChange={(v) => {
                                if (v !== 'none') {
                                  openConfirmDialog(user, v as AppRole);
                                }
                              }}
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
                                <SelectItem value="support_agent">دعم فني</SelectItem>
                                <SelectItem value="client">عميل</SelectItem>
                                <SelectItem value="none" disabled>بدون دور</SelectItem>
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
          {/* Role Cards */}
          <div className="grid gap-6 md:grid-cols-2">
            {allRoles.map((role) => {
              const info = rolesInfo[role];
              const Icon = info.icon;
              const permissions = rolePermissions[role];
              const enabledCount = Object.values(permissions).filter(Boolean).length;
              
              return (
                <Card key={role}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${info.badgeColor}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        {info.name}
                        <span className="text-sm font-normal text-muted-foreground mr-2">
                          ({info.nameEnglish})
                        </span>
                      </div>
                    </CardTitle>
                    <CardDescription>{info.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">البوابة:</span>
                        <Badge variant="outline">{info.dashboardPath}</Badge>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">صلاحيات مفعّلة:</span>
                        <span className="font-bold">{enabledCount} صلاحية</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">عدد المستخدمين:</span>
                        <span className="font-bold">{roleStats[role]}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Permission Matrix */}
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
                    <TableHead className="text-center">دعم فني</TableHead>
                    <TableHead className="text-center">عميل</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {permissionLabels.map((perm, idx) => {
                    const prevCategory = idx > 0 ? permissionLabels[idx - 1].category : null;
                    const showCategoryRow = perm.category !== prevCategory;
                    
                    return (
                      <>
                        {showCategoryRow && (
                          <TableRow key={`cat-${perm.category}`} className="bg-muted/50">
                            <TableCell colSpan={5} className="font-semibold text-sm">
                              {perm.category}
                            </TableCell>
                          </TableRow>
                        )}
                        <TableRow key={perm.key}>
                          <TableCell className="text-sm">{perm.label}</TableCell>
                          {allRoles.map((role) => (
                            <TableCell key={role} className="text-center">
                              {rolePermissions[role][perm.key] ? (
                                <CheckCircle2 className="h-5 w-5 text-green-500 mx-auto" />
                              ) : (
                                <XCircle className="h-5 w-5 text-muted-foreground/30 mx-auto" />
                              )}
                            </TableCell>
                          ))}
                        </TableRow>
                      </>
                    );
                  })}
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
            <DialogDescription>
              هل أنت متأكد من تغيير صلاحية "{confirmDialog?.userName}"؟
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">الدور الحالي:</span>
              {confirmDialog && getRoleBadge(confirmDialog.oldRole)}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">الدور الجديد:</span>
              {confirmDialog && getRoleBadge(confirmDialog.newRole)}
            </div>
            
            {confirmDialog?.newRole && (
              <div className="mt-4 p-3 bg-muted/50 rounded-lg text-sm">
                <p className="font-medium mb-1">ملاحظة:</p>
                <p className="text-muted-foreground">
                  {rolesInfo[confirmDialog.newRole].description}
                </p>
                <p className="mt-2 text-muted-foreground">
                  سيتم توجيه المستخدم إلى: <code className="bg-background px-1 rounded">{rolesInfo[confirmDialog.newRole].dashboardPath}</code>
                </p>
              </div>
            )}
          </div>

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
