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
  CheckCircle2
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
import { toast } from 'sonner';

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
}

const defaultFormData = {
  full_name: '',
  email: '',
  phone: '',
  job_title: '',
  is_active: true,
  can_reply_tickets: false,
  can_manage_content: false,
  can_attend_meetings: false
};

export default function StaffPage() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [formData, setFormData] = useState(defaultFormData);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    try {
      const { data, error } = await supabase
        .from('staff_members' as any)
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setStaff((data as unknown as StaffMember[]) || []);
    } catch (error) {
      console.error('Error fetching staff:', error);
      toast.error('حدث خطأ في تحميل بيانات الموظفين');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (member?: StaffMember) => {
    if (member) {
      setSelectedStaff(member);
      setFormData({
        full_name: member.full_name,
        email: member.email,
        phone: member.phone || '',
        job_title: member.job_title || '',
        is_active: member.is_active,
        can_reply_tickets: member.can_reply_tickets,
        can_manage_content: member.can_manage_content,
        can_attend_meetings: member.can_attend_meetings
      });
    } else {
      setSelectedStaff(null);
      setFormData(defaultFormData);
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.full_name || !formData.email) {
      toast.error('يرجى ملء الحقول المطلوبة');
      return;
    }

    setSaving(true);

    try {
      if (selectedStaff) {
        // Update
        const { error } = await supabase
          .from('staff_members' as any)
          .update({
            full_name: formData.full_name,
            email: formData.email,
            phone: formData.phone || null,
            job_title: formData.job_title || null,
            is_active: formData.is_active,
            can_reply_tickets: formData.can_reply_tickets,
            can_manage_content: formData.can_manage_content,
            can_attend_meetings: formData.can_attend_meetings
          } as any)
          .eq('id', selectedStaff.id);

        if (error) throw error;
        toast.success('تم تحديث بيانات الموظف');
      } else {
        // Create
        const { error } = await supabase
          .from('staff_members' as any)
          .insert({
            full_name: formData.full_name,
            email: formData.email,
            phone: formData.phone || null,
            job_title: formData.job_title || null,
            is_active: formData.is_active,
            can_reply_tickets: formData.can_reply_tickets,
            can_manage_content: formData.can_manage_content,
            can_attend_meetings: formData.can_attend_meetings
          } as any);

        if (error) throw error;
        toast.success('تم إضافة الموظف بنجاح');
      }

      setDialogOpen(false);
      fetchStaff();
    } catch (error: any) {
      console.error('Error saving staff:', error);
      if (error.code === '23505') {
        toast.error('البريد الإلكتروني مسجل مسبقاً');
      } else {
        toast.error('حدث خطأ أثناء الحفظ');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedStaff) return;

    try {
      const { error } = await supabase
        .from('staff_members' as any)
        .delete()
        .eq('id', selectedStaff.id);

      if (error) throw error;
      toast.success('تم حذف الموظف');
      setDeleteDialogOpen(false);
      fetchStaff();
    } catch (error) {
      console.error('Error deleting staff:', error);
      toast.error('حدث خطأ أثناء الحذف');
    }
  };

  const filteredStaff = staff.filter(s =>
    s.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.job_title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeCount = staff.filter(s => s.is_active).length;

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
          <p className="text-muted-foreground mt-1">إدارة فريق العمل وتحديد صلاحياتهم</p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="gap-2">
          <Plus className="h-4 w-4" />
          إضافة موظف
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                <p className="text-xs text-muted-foreground">موظف نشط</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-100">
                <Ticket className="h-5 w-5 text-orange-700" />
              </div>
              <div>
                <p className="text-2xl font-bold">{staff.filter(s => s.can_reply_tickets).length}</p>
                <p className="text-xs text-muted-foreground">دعم فني</p>
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
                <p className="text-2xl font-bold">{staff.filter(s => s.can_attend_meetings).length}</p>
                <p className="text-xs text-muted-foreground">اجتماعات</p>
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
              placeholder="بحث بالاسم أو البريد..."
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
                <TableHead>المنصب</TableHead>
                <TableHead>الصلاحيات</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>الإحصائيات</TableHead>
                <TableHead className="w-[120px]">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStaff.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12">
                    <Users className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground">لا يوجد موظفين</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredStaff.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {member.full_name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{member.full_name}</p>
                          <p className="text-sm text-muted-foreground">{member.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{member.job_title || '-'}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {member.can_reply_tickets && (
                          <Badge variant="outline" className="gap-1 text-xs">
                            <Ticket className="h-3 w-3" />
                            تذاكر
                          </Badge>
                        )}
                        {member.can_manage_content && (
                          <Badge variant="outline" className="gap-1 text-xs">
                            <FileText className="h-3 w-3" />
                            محتوى
                          </Badge>
                        )}
                        {member.can_attend_meetings && (
                          <Badge variant="outline" className="gap-1 text-xs">
                            <Calendar className="h-3 w-3" />
                            اجتماعات
                          </Badge>
                        )}
                        {!member.can_reply_tickets && !member.can_manage_content && !member.can_attend_meetings && (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </div>
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
                      <div className="text-sm">
                        <span className="text-muted-foreground">{member.assigned_tickets_count} تذكرة</span>
                        <span className="mx-2">•</span>
                        <span className="text-muted-foreground">{member.completed_meetings_count} اجتماع</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDialog(member)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedStaff(member);
                            setDeleteDialogOpen(true);
                          }}
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedStaff ? 'تعديل بيانات الموظف' : 'إضافة موظف جديد'}
            </DialogTitle>
            <DialogDescription>
              {selectedStaff ? 'قم بتعديل بيانات الموظف' : 'أدخل بيانات الموظف الجديد'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>الاسم الكامل *</Label>
              <Input
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                placeholder="أحمد محمد"
              />
            </div>

            <div className="space-y-2">
              <Label>البريد الإلكتروني *</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="ahmed@example.com"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>رقم الهاتف</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="05xxxxxxxx"
                />
              </div>
              <div className="space-y-2">
                <Label>المنصب</Label>
                <Input
                  value={formData.job_title}
                  onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
                  placeholder="مهندس دعم فني"
                />
              </div>
            </div>

            <div className="pt-4 border-t">
              <Label className="text-base font-semibold mb-4 block">الصلاحيات</Label>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <Ticket className="h-5 w-5 text-orange-600" />
                    <div>
                      <p className="font-medium">الرد على التذاكر</p>
                      <p className="text-sm text-muted-foreground">يمكنه معالجة تذاكر الدعم الفني</p>
                    </div>
                  </div>
                  <Switch
                    checked={formData.can_reply_tickets}
                    onCheckedChange={(checked) => setFormData({ ...formData, can_reply_tickets: checked })}
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="font-medium">إدارة المحتوى</p>
                      <p className="text-sm text-muted-foreground">يمكنه إضافة وتعديل المقالات</p>
                    </div>
                  </div>
                  <Switch
                    checked={formData.can_manage_content}
                    onCheckedChange={(checked) => setFormData({ ...formData, can_manage_content: checked })}
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-purple-600" />
                    <div>
                      <p className="font-medium">حضور الاجتماعات</p>
                      <p className="text-sm text-muted-foreground">يمكنه حضور اجتماعات العملاء</p>
                    </div>
                  </div>
                  <Switch
                    checked={formData.can_attend_meetings}
                    onCheckedChange={(checked) => setFormData({ ...formData, can_attend_meetings: checked })}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t">
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-medium">حالة الموظف</p>
                  <p className="text-sm text-muted-foreground">تفعيل أو تعطيل الحساب</p>
                </div>
              </div>
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>إلغاء</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 ml-2 animate-spin" />}
              {selectedStaff ? 'حفظ التعديلات' : 'إضافة الموظف'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف الموظف "{selectedStaff?.full_name}"؟ هذا الإجراء لا يمكن التراجع عنه.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
