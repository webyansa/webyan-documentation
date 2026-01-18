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
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, 
  Loader2, 
  Shield, 
  Edit3, 
  Headphones, 
  Building2,
  Plus, 
  Pencil, 
  Key, 
  Trash2,
  Search,
  UserCircle,
  AlertTriangle
} from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { AppRole, rolesInfo, allRoles } from '@/lib/permissions';

// Extended user type with source info
interface ExtendedUser {
  id: string;
  email: string | null;
  full_name: string | null;
  created_at: string;
  role: AppRole | null;
  userType: 'staff' | 'client' | 'system';
  staffId?: string;
  clientId?: string;
  organizationName?: string;
}

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<ExtendedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'staff' | 'client' | 'system'>('all');
  const [filterRole, setFilterRole] = useState<AppRole | 'all'>('all');
  
  // Add User Dialog
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserRole, setNewUserRole] = useState<AppRole>('client');

  // Edit User Dialog
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editingUser, setEditingUser] = useState<ExtendedUser | null>(null);
  const [editUserName, setEditUserName] = useState('');
  const [editUserEmail, setEditUserEmail] = useState('');

  // Change Password Dialog
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordUserId, setPasswordUserId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Delete User Dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deletingUser, setDeletingUser] = useState<ExtendedUser | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      // Fetch profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, full_name, created_at')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch staff members
      const { data: staffMembers } = await supabase
        .from('staff_members')
        .select('id, user_id, full_name');

      // Fetch client accounts with organizations
      const { data: clientAccounts } = await supabase
        .from('client_accounts')
        .select('id, user_id, full_name, organization_id, client_organizations(name)');

      const usersWithDetails: ExtendedUser[] = [];
      
      for (const profile of profiles || []) {
        // Get role
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', profile.id)
          .maybeSingle();

        // Check if staff
        const staffRecord = staffMembers?.find(s => s.user_id === profile.id);
        
        // Check if client
        const clientRecord = clientAccounts?.find(c => c.user_id === profile.id);

        let userType: 'staff' | 'client' | 'system' = 'system';
        let staffId: string | undefined;
        let clientId: string | undefined;
        let organizationName: string | undefined;

        if (staffRecord) {
          userType = 'staff';
          staffId = staffRecord.id;
        } else if (clientRecord) {
          userType = 'client';
          clientId = clientRecord.id;
          organizationName = (clientRecord.client_organizations as any)?.name;
        }

        usersWithDetails.push({
          ...profile,
          role: (roleData?.role as AppRole) || null,
          userType,
          staffId,
          clientId,
          organizationName,
        });
      }

      setUsers(usersWithDetails);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('حدث خطأ أثناء تحميل المستخدمين');
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async () => {
    if (!newUserEmail || !newUserPassword || !newUserName) {
      toast.error('يرجى ملء جميع الحقول');
      return;
    }

    if (newUserPassword.length < 6) {
      toast.error('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }

    setAddLoading(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newUserEmail,
        password: newUserPassword,
        options: {
          data: {
            full_name: newUserName,
            role: newUserRole,
          },
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (authError) throw authError;

      if (authData.user) {
        await supabase
          .from('profiles')
          .update({ full_name: newUserName, email: newUserEmail })
          .eq('id', authData.user.id);

        toast.success('تم إضافة المستخدم بنجاح');
        setAddDialogOpen(false);
        setNewUserEmail('');
        setNewUserPassword('');
        setNewUserName('');
        setNewUserRole('client');
        fetchUsers();
      }
    } catch (error: any) {
      console.error('Error adding user:', error);
      if (error.message?.includes('already registered')) {
        toast.error('البريد الإلكتروني مسجل مسبقاً');
      } else {
        toast.error('حدث خطأ أثناء إضافة المستخدم');
      }
    } finally {
      setAddLoading(false);
    }
  };

  const handleEditUser = async () => {
    if (!editingUser || !editUserName) {
      toast.error('يرجى ملء جميع الحقول');
      return;
    }

    setEditLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: editUserName })
        .eq('id', editingUser.id);

      if (error) throw error;

      setUsers((prev) =>
        prev.map((u) => (u.id === editingUser.id ? { ...u, full_name: editUserName } : u))
      );
      toast.success('تم تحديث بيانات المستخدم بنجاح');
      setEditDialogOpen(false);
      setEditingUser(null);
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error('حدث خطأ أثناء تحديث البيانات');
    } finally {
      setEditLoading(false);
    }
  };

  const openEditDialog = (user: ExtendedUser) => {
    setEditingUser(user);
    setEditUserName(user.full_name || '');
    setEditUserEmail(user.email || '');
    setEditDialogOpen(true);
  };

  const openPasswordDialog = (userId: string) => {
    setPasswordUserId(userId);
    setNewPassword('');
    setConfirmPassword('');
    setPasswordDialogOpen(true);
  };

  const handleChangePassword = async () => {
    if (!passwordUserId || !newPassword) {
      toast.error('يرجى إدخال كلمة المرور الجديدة');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('كلمات المرور غير متطابقة');
      return;
    }

    setPasswordLoading(true);
    try {
      toast.info('تغيير كلمة المرور لمستخدم آخر يتطلب صلاحيات إدارية متقدمة');
      setPasswordDialogOpen(false);
    } catch (error) {
      console.error('Error changing password:', error);
      toast.error('حدث خطأ أثناء تغيير كلمة المرور');
    } finally {
      setPasswordLoading(false);
    }
  };

  const openDeleteDialog = (user: ExtendedUser) => {
    setDeletingUser(user);
    setDeleteDialogOpen(true);
  };

  const handleDeleteUser = async () => {
    if (!deletingUser) return;

    if (deletingUser.id === currentUser?.id) {
      toast.error('لا يمكنك حذف حسابك الخاص');
      return;
    }

    setDeleteLoading(true);
    try {
      await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', deletingUser.id);

      await supabase
        .from('profiles')
        .delete()
        .eq('id', deletingUser.id);

      setUsers((prev) => prev.filter((u) => u.id !== deletingUser.id));
      toast.success('تم حذف المستخدم بنجاح');
      setDeleteDialogOpen(false);
      setDeletingUser(null);
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('حدث خطأ أثناء حذف المستخدم');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: AppRole) => {
    if (userId === currentUser?.id) {
      toast.error('لا يمكنك تغيير صلاحياتك الخاصة');
      return;
    }

    setUpdating(userId);
    try {
      await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role: newRole } as any);

      if (error) throw error;

      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
      );
      toast.success('تم تحديث الصلاحية بنجاح');
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error('حدث خطأ أثناء تحديث الصلاحية');
    } finally {
      setUpdating(null);
    }
  };

  const getRoleBadge = (role: AppRole | null) => {
    if (!role) {
      return (
        <Badge variant="outline" className="gap-1 text-muted-foreground">
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

  const getUserTypeBadge = (user: ExtendedUser) => {
    switch (user.userType) {
      case 'staff':
        return (
          <Badge variant="outline" className="gap-1 bg-orange-50 text-orange-700 border-orange-200">
            <Headphones className="h-3 w-3" />
            موظف
          </Badge>
        );
      case 'client':
        return (
          <Badge variant="outline" className="gap-1 bg-green-50 text-green-700 border-green-200">
            <Building2 className="h-3 w-3" />
            عميل
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="gap-1 bg-gray-50 text-gray-600 border-gray-200">
            <UserCircle className="h-3 w-3" />
            نظام
          </Badge>
        );
    }
  };

  const hasRoleMismatch = (user: ExtendedUser): boolean => {
    // Check if user type doesn't match role
    if (user.userType === 'staff' && user.role !== 'support_agent' && user.role !== 'admin' && user.role !== 'editor') {
      return true;
    }
    if (user.userType === 'client' && user.role !== 'client') {
      return true;
    }
    return false;
  };

  // Filter users
  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      (user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
      (user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    
    const matchesType = filterType === 'all' || user.userType === filterType;
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    
    return matchesSearch && matchesType && matchesRole;
  });

  // Stats
  const stats = {
    total: users.length,
    staff: users.filter(u => u.userType === 'staff').length,
    client: users.filter(u => u.userType === 'client').length,
    system: users.filter(u => u.userType === 'system').length,
    admins: users.filter(u => u.role === 'admin').length,
    editors: users.filter(u => u.role === 'editor').length,
    supportAgents: users.filter(u => u.role === 'support_agent').length,
    clients: users.filter(u => u.role === 'client').length,
    mismatches: users.filter(hasRoleMismatch).length,
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
          <h1 className="text-2xl font-bold">المستخدمين</h1>
          <p className="text-muted-foreground">
            إدارة المستخدمين وصلاحياتهم - {stats.total} مستخدم مسجل
          </p>
        </div>
        
        {/* Add User Button */}
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              إضافة مستخدم
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>إضافة مستخدم جديد</DialogTitle>
              <DialogDescription>
                أدخل بيانات المستخدم الجديد
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="new-name">الاسم الكامل</Label>
                  <Input
                    id="new-name"
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    placeholder="أحمد محمد"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-role">الصلاحية</Label>
                  <Select value={newUserRole} onValueChange={(v) => setNewUserRole(v as AppRole)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {allRoles.map(role => (
                        <SelectItem key={role} value={role}>
                          {rolesInfo[role].name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-email">البريد الإلكتروني</Label>
                <Input
                  id="new-email"
                  type="email"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="user@example.com"
                  dir="ltr"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password">كلمة المرور</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  placeholder="••••••••"
                  dir="ltr"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
                إلغاء
              </Button>
              <Button onClick={handleAddUser} disabled={addLoading}>
                {addLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'إضافة'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabs for different views */}
      <Tabs defaultValue="byType" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 max-w-xs">
          <TabsTrigger value="byType">حسب النوع</TabsTrigger>
          <TabsTrigger value="byRole">حسب الدور</TabsTrigger>
        </TabsList>

        <TabsContent value="byType" className="space-y-4">
          {/* Stats by User Type */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card 
              className={`cursor-pointer transition-colors ${filterType === 'all' ? 'ring-2 ring-primary' : 'hover:bg-muted/50'}`}
              onClick={() => setFilterType('all')}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  الكل
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total}</div>
              </CardContent>
            </Card>
            <Card 
              className={`cursor-pointer transition-colors ${filterType === 'staff' ? 'ring-2 ring-orange-500' : 'hover:bg-muted/50'}`}
              onClick={() => setFilterType('staff')}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Headphones className="h-4 w-4 text-orange-500" />
                  الموظفين
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.staff}</div>
              </CardContent>
            </Card>
            <Card 
              className={`cursor-pointer transition-colors ${filterType === 'client' ? 'ring-2 ring-green-500' : 'hover:bg-muted/50'}`}
              onClick={() => setFilterType('client')}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-green-500" />
                  العملاء
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.client}</div>
              </CardContent>
            </Card>
            <Card 
              className={`cursor-pointer transition-colors ${filterType === 'system' ? 'ring-2 ring-gray-500' : 'hover:bg-muted/50'}`}
              onClick={() => setFilterType('system')}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <UserCircle className="h-4 w-4 text-gray-500" />
                  النظام
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.system}</div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="byRole" className="space-y-4">
          {/* Stats by Role */}
          <div className="grid gap-4 md:grid-cols-5">
            <Card 
              className={`cursor-pointer transition-colors ${filterRole === 'all' ? 'ring-2 ring-primary' : 'hover:bg-muted/50'}`}
              onClick={() => setFilterRole('all')}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  الكل
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total}</div>
              </CardContent>
            </Card>
            <Card 
              className={`cursor-pointer transition-colors ${filterRole === 'admin' ? 'ring-2 ring-red-500' : 'hover:bg-muted/50'}`}
              onClick={() => setFilterRole('admin')}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Shield className="h-4 w-4 text-red-500" />
                  المدراء
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.admins}</div>
              </CardContent>
            </Card>
            <Card 
              className={`cursor-pointer transition-colors ${filterRole === 'editor' ? 'ring-2 ring-blue-500' : 'hover:bg-muted/50'}`}
              onClick={() => setFilterRole('editor')}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Edit3 className="h-4 w-4 text-blue-500" />
                  المحررين
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.editors}</div>
              </CardContent>
            </Card>
            <Card 
              className={`cursor-pointer transition-colors ${filterRole === 'support_agent' ? 'ring-2 ring-orange-500' : 'hover:bg-muted/50'}`}
              onClick={() => setFilterRole('support_agent')}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Headphones className="h-4 w-4 text-orange-500" />
                  الدعم الفني
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.supportAgents}</div>
              </CardContent>
            </Card>
            <Card 
              className={`cursor-pointer transition-colors ${filterRole === 'client' ? 'ring-2 ring-green-500' : 'hover:bg-muted/50'}`}
              onClick={() => setFilterRole('client')}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-green-500" />
                  العملاء
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.clients}</div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Mismatches Warning */}
      {stats.mismatches > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="flex items-center gap-3 py-4">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <div>
              <p className="font-medium text-amber-800">
                تنبيه: يوجد {stats.mismatches} مستخدمين لديهم تعارض بين نوع الحساب والدور المسند
              </p>
              <p className="text-sm text-amber-700">
                مثلاً: موظف بدور "عميل" أو عميل بدور "دعم فني"
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="البحث بالاسم أو البريد..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pr-10"
        />
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>جميع المستخدمين</CardTitle>
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
                  <TableHead>النوع</TableHead>
                  <TableHead>الدور</TableHead>
                  <TableHead>تاريخ التسجيل</TableHead>
                  <TableHead>الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id} className={hasRoleMismatch(user) ? 'bg-amber-50' : ''}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback className="bg-primary/10 text-primary text-sm">
                            {user.full_name?.charAt(0) || user.email?.charAt(0) || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium flex items-center gap-2">
                            {user.full_name || 'بدون اسم'}
                            {hasRoleMismatch(user) && (
                              <AlertTriangle className="h-4 w-4 text-amber-500" />
                            )}
                          </p>
                          {user.organizationName && (
                            <p className="text-xs text-muted-foreground">{user.organizationName}</p>
                          )}
                          {user.id === currentUser?.id && (
                            <Badge variant="outline" className="text-xs">أنت</Badge>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground" dir="ltr">
                      {user.email}
                    </TableCell>
                    <TableCell>
                      {getUserTypeBadge(user)}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={user.role || 'none'}
                        onValueChange={(value) => {
                          if (value !== 'none') {
                            handleRoleChange(user.id, value as AppRole);
                          }
                        }}
                        disabled={updating === user.id || user.id === currentUser?.id}
                      >
                        <SelectTrigger className="w-32">
                          {updating === user.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <SelectValue placeholder="اختر الدور" />
                          )}
                        </SelectTrigger>
                        <SelectContent>
                          {allRoles.map(role => {
                            const info = rolesInfo[role];
                            const Icon = info.icon;
                            return (
                              <SelectItem key={role} value={role}>
                                <span className="flex items-center gap-2">
                                  <Icon className={`h-3 w-3 ${info.color}`} />
                                  {info.name}
                                </span>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {format(new Date(user.created_at), 'dd MMM yyyy', { locale: ar })}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openEditDialog(user)}
                          title="تعديل البيانات"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openPasswordDialog(user.id)}
                          title="تغيير كلمة المرور"
                          disabled={user.id === currentUser?.id}
                        >
                          <Key className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => openDeleteDialog(user)}
                          title="حذف المستخدم"
                          disabled={user.id === currentUser?.id}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>تعديل بيانات المستخدم</DialogTitle>
            <DialogDescription>
              تعديل بيانات {editingUser?.full_name || editingUser?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">الاسم الكامل</Label>
              <Input
                id="edit-name"
                value={editUserName}
                onChange={(e) => setEditUserName(e.target.value)}
                placeholder="الاسم الكامل"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">البريد الإلكتروني</Label>
              <Input
                id="edit-email"
                type="email"
                value={editUserEmail}
                disabled
                className="text-muted-foreground"
                dir="ltr"
              />
              <p className="text-xs text-muted-foreground">
                لا يمكن تغيير البريد الإلكتروني
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={handleEditUser} disabled={editLoading}>
              {editLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'حفظ'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Password Dialog */}
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>تغيير كلمة المرور</DialogTitle>
            <DialogDescription>
              أدخل كلمة المرور الجديدة
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-pwd">كلمة المرور الجديدة</Label>
              <Input
                id="new-pwd"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                dir="ltr"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-pwd">تأكيد كلمة المرور</Label>
              <Input
                id="confirm-pwd"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                dir="ltr"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPasswordDialogOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={handleChangePassword} disabled={passwordLoading}>
              {passwordLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'تغيير'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>حذف المستخدم</DialogTitle>
            <DialogDescription>
              هل أنت متأكد من حذف المستخدم "{deletingUser?.full_name || deletingUser?.email}"؟
              <br />
              <span className="text-destructive">هذا الإجراء لا يمكن التراجع عنه.</span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              إلغاء
            </Button>
            <Button variant="destructive" onClick={handleDeleteUser} disabled={deleteLoading}>
              {deleteLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'حذف'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
