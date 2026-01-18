import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  Users, 
  Plus, 
  Pencil, 
  Trash2, 
  Loader2,
  Search,
  Shield,
  Ticket,
  Calendar,
  FileText,
  CheckCircle2,
  Edit3,
  Headphones,
  Mail,
  RefreshCw
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
} from "@/components/ui/select";
import { toast } from 'sonner';
import { AppRole, rolesInfo, rolePermissions } from '@/lib/permissions';

// Staff roles available (excluding 'client')
type StaffRole = 'admin' | 'editor' | 'support_agent';
const staffRoles: StaffRole[] = ['admin', 'editor', 'support_agent'];

interface StaffMember {
  id: string;
  user_id: string | null;
  full_name: string;
  email: string;
  phone: string | null;
  job_title: string | null;
  is_active: boolean;
  can_reply_tickets: boolean;
  can_manage_content: boolean;
  can_attend_meetings: boolean;
  assigned_tickets_count: number;
  completed_meetings_count: number;
  created_at: string;
  // Role from user_roles table
  user_role?: AppRole | null;
}

interface FormData {
  full_name: string;
  email: string;
  password: string;
  phone: string;
  job_title: string;
  is_active: boolean;
  role: StaffRole;
  // Legacy permissions (auto-set based on role)
  can_reply_tickets: boolean;
  can_manage_content: boolean;
  can_attend_meetings: boolean;
}

const getDefaultFormData = (): FormData => ({
  full_name: '',
  email: '',
  password: '',
  phone: '',
  job_title: '',
  is_active: true,
  role: 'support_agent',
  can_reply_tickets: true,
  can_manage_content: false,
  can_attend_meetings: true
});

// Helper to set staff_members permissions based on role
const getPermissionsForStaffRole = (role: StaffRole) => {
  switch (role) {
    case 'admin':
      return {
        can_reply_tickets: true,
        can_manage_content: true,
        can_attend_meetings: true
      };
    case 'editor':
      return {
        can_reply_tickets: false,
        can_manage_content: true,
        can_attend_meetings: false
      };
    case 'support_agent':
      return {
        can_reply_tickets: true,
        can_manage_content: false,
        can_attend_meetings: true
      };
  }
};

export default function StaffPage() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [formData, setFormData] = useState<FormData>(getDefaultFormData());
  const [saving, setSaving] = useState(false);
  const [resendingEmail, setResendingEmail] = useState<string | null>(null);

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    try {
      // Fetch staff members with their roles
      const { data: staffData, error } = await supabase
        .from('staff_members')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch user roles for staff members
      const staffWithRoles = await Promise.all(
        (staffData || []).map(async (member: any) => {
          if (member.user_id) {
            const { data: roleData } = await supabase
              .from('user_roles')
              .select('role')
              .eq('user_id', member.user_id)
              .maybeSingle();
            return { ...member, user_role: roleData?.role || null };
          }
          return { ...member, user_role: null };
        })
      );

      setStaff(staffWithRoles as StaffMember[]);
    } catch (error) {
      console.error('Error fetching staff:', error);
      toast.error('حدث خطأ في تحميل بيانات الموظفين');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (member?: StaffMember) => {
    if (member) {
      // Determine role from user_role or infer from permissions
      let role: StaffRole = 'support_agent';
      if (member.user_role === 'admin') {
        role = 'admin';
      } else if (member.user_role === 'editor') {
        role = 'editor';
      } else if (member.user_role === 'support_agent') {
        role = 'support_agent';
      } else if (member.can_manage_content && !member.can_reply_tickets) {
        role = 'editor';
      }

      setSelectedStaff(member);
      setFormData({
        full_name: member.full_name,
        email: member.email,
        password: '',
        phone: member.phone || '',
        job_title: member.job_title || '',
        is_active: member.is_active,
        role,
        can_reply_tickets: member.can_reply_tickets,
        can_manage_content: member.can_manage_content,
        can_attend_meetings: member.can_attend_meetings
      });
    } else {
      setSelectedStaff(null);
      setFormData(getDefaultFormData());
    }
    setDialogOpen(true);
  };

  const handleRoleChange = (role: StaffRole) => {
    const permissions = getPermissionsForStaffRole(role);
    setFormData({
      ...formData,
      role,
      ...permissions
    });
  };

  const handleSave = async () => {
    if (!formData.full_name.trim()) {
      toast.error('يرجى إدخال الاسم الكامل');
      return;
    }

    if (!formData.email.trim()) {
      toast.error('يرجى إدخال البريد الإلكتروني');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast.error('يرجى إدخال بريد إلكتروني صحيح');
      return;
    }

    // Password required only for new staff
    if (!selectedStaff && !formData.password) {
      toast.error('يرجى إدخال كلمة المرور');
      return;
    }

    if (!selectedStaff && formData.password.length < 6) {
      toast.error('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }

    setSaving(true);

    try {
      const permissions = getPermissionsForStaffRole(formData.role);

      if (selectedStaff) {
        // Update existing staff
        const { error: staffError } = await supabase
          .from('staff_members')
          .update({
            full_name: formData.full_name.trim(),
            phone: formData.phone.trim() || null,
            job_title: formData.job_title.trim() || null,
            is_active: formData.is_active,
            ...permissions
          })
          .eq('id', selectedStaff.id);

        if (staffError) throw staffError;

        // Update user role if user_id exists
        if (selectedStaff.user_id) {
          const { error: roleError } = await supabase
            .from('user_roles')
            .upsert({
              user_id: selectedStaff.user_id,
              role: formData.role
            } as any, { onConflict: 'user_id' });

          if (roleError) {
            console.error('Error updating role:', roleError);
          }
        }

        toast.success('تم تحديث بيانات الموظف بنجاح');
      } else {
        // Create new staff with user account via edge function
        const { data, error } = await supabase.functions.invoke('create-staff-account', {
          body: {
            full_name: formData.full_name.trim(),
            email: formData.email.trim().toLowerCase(),
            password: formData.password,
            phone: formData.phone.trim() || null,
            job_title: formData.job_title.trim() || null,
            is_active: formData.is_active,
            role: formData.role,
            ...permissions
          }
        });

        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        
        toast.success(data?.message || 'تم إضافة الموظف بنجاح وإرسال بيانات الدخول');
      }

      setDialogOpen(false);
      fetchStaff();
    } catch (error: any) {
      console.error('Error saving staff:', error);
      toast.error(error.message || 'حدث خطأ أثناء الحفظ');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedStaff) return;

    try {
      const { error } = await supabase
        .from('staff_members')
        .delete()
        .eq('id', selectedStaff.id);

      if (error) throw error;
      toast.success('تم حذف الموظف بنجاح');
      setDeleteDialogOpen(false);
      setSelectedStaff(null);
      fetchStaff();
    } catch (error) {
      console.error('Error deleting staff:', error);
      toast.error('حدث خطأ أثناء الحذف');
    }
  };

  const handleResendWelcomeEmail = async (member: StaffMember) => {
    if (!member.email) return;
    
    setResendingEmail(member.id);
    try {
      const { data, error } = await supabase.functions.invoke('send-staff-notification', {
        body: {
          type: 'resend_welcome',
          staff_email: member.email,
          staff_name: member.full_name,
          job_title: member.job_title
        }
      });

      if (error) throw error;
      toast.success('تم إرسال بريد الترحيب بنجاح');
    } catch (error: any) {
      console.error('Error resending welcome email:', error);
      toast.error('حدث خطأ في إرسال البريد');
    } finally {
      setResendingEmail(null);
    }
  };

  const filteredStaff = staff.filter(s =>
    s.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.job_title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeCount = staff.filter(s => s.is_active).length;
  const adminCount = staff.filter(s => s.user_role === 'admin').length;
  const editorCount = staff.filter(s => s.user_role === 'editor').length;
  const supportCount = staff.filter(s => s.user_role === 'support_agent' || (!s.user_role && s.can_reply_tickets)).length;

  const getRoleBadge = (member: StaffMember) => {
    const role = member.user_role;
    if (role && rolesInfo[role]) {
      const info = rolesInfo[role];
      const Icon = info.icon;
      return (
        <Badge className={`gap-1.5 ${info.badgeColor}`}>
          <Icon className="h-3 w-3" />
          {info.name}
        </Badge>
      );
    }
    // Fallback to permissions-based display
    if (member.can_manage_content && !member.can_reply_tickets) {
      return (
        <Badge className="gap-1.5 bg-blue-100 text-blue-700">
          <Edit3 className="h-3 w-3" />
          محرر
        </Badge>
      );
    }
    if (member.can_reply_tickets) {
      return (
        <Badge className="gap-1.5 bg-orange-100 text-orange-700">
          <Headphones className="h-3 w-3" />
          دعم فني
        </Badge>
      );
    }
    return <Badge variant="secondary">غير محدد</Badge>;
  };

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
            <Users className="h-7 w-7 text-primary" />
            إدارة الموظفين
          </h1>
          <p className="text-muted-foreground mt-1">إدارة فريق العمل وتحديد أدوارهم وصلاحياتهم</p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="gap-2">
          <Plus className="h-4 w-4" />
          إضافة موظف
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <Users className="h-5 w-5 text-blue-700" />
              </div>
              <div>
                <p className="text-2xl font-bold">{staff.length}</p>
                <p className="text-xs text-muted-foreground">إجمالي الموظفين</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100">
                <CheckCircle2 className="h-5 w-5 text-green-700" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeCount}</p>
                <p className="text-xs text-muted-foreground">نشط</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100">
                <Shield className="h-5 w-5 text-red-700" />
              </div>
              <div>
                <p className="text-2xl font-bold">{adminCount}</p>
                <p className="text-xs text-muted-foreground">مدير</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <Edit3 className="h-5 w-5 text-blue-700" />
              </div>
              <div>
                <p className="text-2xl font-bold">{editorCount}</p>
                <p className="text-xs text-muted-foreground">محرر</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-100">
                <Headphones className="h-5 w-5 text-orange-700" />
              </div>
              <div>
                <p className="text-2xl font-bold">{supportCount}</p>
                <p className="text-xs text-muted-foreground">دعم فني</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="بحث بالاسم أو البريد أو المنصب..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Staff Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الموظف</TableHead>
                <TableHead>الدور</TableHead>
                <TableHead>المنصب</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>الإحصائيات</TableHead>
                <TableHead className="w-[150px]">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStaff.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12">
                    <Users className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground">لا يوجد موظفين</p>
                    <Button variant="link" onClick={() => handleOpenDialog()} className="mt-2">
                      إضافة موظف جديد
                    </Button>
                  </TableCell>
                </TableRow>
              ) : (
                filteredStaff.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-primary/10 text-primary font-medium">
                            {member.full_name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{member.full_name}</p>
                          <p className="text-sm text-muted-foreground">{member.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getRoleBadge(member)}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{member.job_title || '-'}</span>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={member.is_active ? 'default' : 'secondary'}
                        className={member.is_active ? 'bg-green-100 text-green-800 hover:bg-green-200' : ''}
                      >
                        {member.is_active ? 'نشط' : 'غير نشط'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Ticket className="h-3.5 w-3.5" />
                          {member.assigned_tickets_count || 0}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {member.completed_meetings_count || 0}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDialog(member)}
                          title="تعديل"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleResendWelcomeEmail(member)}
                          disabled={resendingEmail === member.id}
                          title="إعادة إرسال بريد الترحيب"
                        >
                          {resendingEmail === member.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Mail className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedStaff(member);
                            setDeleteDialogOpen(true);
                          }}
                          title="حذف"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedStaff ? (
                <>
                  <Pencil className="h-5 w-5" />
                  تعديل بيانات الموظف
                </>
              ) : (
                <>
                  <Plus className="h-5 w-5" />
                  إضافة موظف جديد
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {selectedStaff 
                ? 'قم بتعديل بيانات الموظف وتحديث دوره في النظام' 
                : 'أدخل بيانات الموظف الجديد وحدد دوره في النظام. سيتم إرسال بيانات الدخول عبر البريد الإلكتروني.'
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Role Selection - Most Important */}
            <div className="space-y-3 p-4 rounded-lg border-2 border-primary/20 bg-primary/5">
              <Label className="text-base font-semibold flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                دور الموظف في النظام *
              </Label>
              <Select
                value={formData.role}
                onValueChange={(value) => handleRoleChange(value as StaffRole)}
              >
                <SelectTrigger className="w-full h-12">
                  <SelectValue placeholder="اختر الدور" />
                </SelectTrigger>
                <SelectContent>
                  {staffRoles.map((role) => {
                    const info = rolesInfo[role];
                    const Icon = info.icon;
                    return (
                      <SelectItem key={role} value={role}>
                        <div className="flex items-center gap-3">
                          <div className={`p-1.5 rounded ${info.badgeColor}`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="text-right">
                            <span className="font-medium">{info.name}</span>
                            <span className="text-muted-foreground mr-2">({info.nameEnglish})</span>
                          </div>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                {rolesInfo[formData.role].description}
              </p>
            </div>

            {/* Personal Info */}
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label>الاسم الكامل *</Label>
                <Input
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="أحمد محمد علي"
                />
              </div>

              <div className="space-y-2">
                <Label>البريد الإلكتروني *</Label>
                <Input
                  type="email"
                  dir="ltr"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="ahmed@example.com"
                  disabled={!!selectedStaff}
                  className="text-left"
                />
              </div>

              {!selectedStaff && (
                <div className="space-y-2">
                  <Label>كلمة المرور *</Label>
                  <Input
                    type="password"
                    dir="ltr"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="••••••••"
                    className="text-left"
                  />
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    سيتم إرسال بيانات الدخول للموظف عبر البريد الإلكتروني
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>رقم الهاتف</Label>
                  <Input
                    dir="ltr"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="05xxxxxxxx"
                    className="text-left"
                  />
                </div>
                <div className="space-y-2">
                  <Label>المسمى الوظيفي</Label>
                  <Input
                    value={formData.job_title}
                    onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
                    placeholder="مهندس دعم فني"
                  />
                </div>
              </div>
            </div>

            {/* Role Permissions Preview */}
            <div className="space-y-3 p-4 rounded-lg bg-muted/50">
              <Label className="text-sm font-medium text-muted-foreground">
                الصلاحيات حسب الدور المحدد:
              </Label>
              <div className="grid grid-cols-3 gap-2">
                <div className={`flex items-center gap-2 p-2 rounded text-sm ${
                  formData.can_reply_tickets ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'
                }`}>
                  <Ticket className="h-4 w-4" />
                  <span>التذاكر</span>
                  {formData.can_reply_tickets && <CheckCircle2 className="h-3 w-3 mr-auto" />}
                </div>
                <div className={`flex items-center gap-2 p-2 rounded text-sm ${
                  formData.can_manage_content ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'
                }`}>
                  <FileText className="h-4 w-4" />
                  <span>المحتوى</span>
                  {formData.can_manage_content && <CheckCircle2 className="h-3 w-3 mr-auto" />}
                </div>
                <div className={`flex items-center gap-2 p-2 rounded text-sm ${
                  formData.can_attend_meetings ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'
                }`}>
                  <Calendar className="h-4 w-4" />
                  <span>الاجتماعات</span>
                  {formData.can_attend_meetings && <CheckCircle2 className="h-3 w-3 mr-auto" />}
                </div>
              </div>
            </div>

            {/* Status Toggle */}
            <div className="flex items-center justify-between p-4 rounded-lg border">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${formData.is_active ? 'bg-green-100' : 'bg-gray-100'}`}>
                  {formData.is_active ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : (
                    <Shield className="h-5 w-5 text-gray-400" />
                  )}
                </div>
                <div>
                  <p className="font-medium">حالة الحساب</p>
                  <p className="text-sm text-muted-foreground">
                    {formData.is_active ? 'الحساب نشط ويمكنه تسجيل الدخول' : 'الحساب معطل ولا يمكنه تسجيل الدخول'}
                  </p>
                </div>
              </div>
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {selectedStaff ? 'حفظ التعديلات' : 'إضافة الموظف'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              تأكيد حذف الموظف
            </AlertDialogTitle>
            <AlertDialogDescription className="text-right">
              هل أنت متأكد من حذف الموظف <strong>"{selectedStaff?.full_name}"</strong>؟
              <br />
              <span className="text-destructive">هذا الإجراء لا يمكن التراجع عنه.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              حذف الموظف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
