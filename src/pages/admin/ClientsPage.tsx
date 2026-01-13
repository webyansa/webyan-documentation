import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  Building2, 
  Plus, 
  Search,
  Edit,
  Trash2,
  Users,
  Eye,
  MoreHorizontal,
  Mail,
  Phone,
  Globe,
  Calendar,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface ClientOrganization {
  id: string;
  name: string;
  organization_type: string;
  registration_number: string | null;
  website_url: string | null;
  contact_email: string;
  contact_phone: string | null;
  city: string | null;
  subscription_status: string;
  subscription_plan: string | null;
  subscription_end_date: string | null;
  is_active: boolean;
  created_at: string;
  accounts_count?: number;
}

interface ClientAccount {
  id: string;
  user_id: string | null;
  organization_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  job_title: string | null;
  is_primary_contact: boolean;
  is_active: boolean;
  created_at: string;
}

const organizationTypes = [
  { value: 'charity', label: 'جمعية خيرية' },
  { value: 'nonprofit', label: 'منظمة غير ربحية' },
  { value: 'foundation', label: 'مؤسسة' },
  { value: 'cooperative', label: 'جمعية تعاونية' },
  { value: 'other', label: 'أخرى' },
];

const subscriptionStatuses = [
  { value: 'trial', label: 'تجريبي' },
  { value: 'active', label: 'نشط' },
  { value: 'pending_renewal', label: 'في انتظار التجديد' },
  { value: 'expired', label: 'منتهي' },
  { value: 'cancelled', label: 'ملغي' },
];

const subscriptionPlans = [
  { value: 'basic', label: 'الأساسية' },
  { value: 'professional', label: 'الاحترافية' },
  { value: 'enterprise', label: 'المؤسسية' },
];

const statusConfig: Record<string, { label: string; bgColor: string; textColor: string; borderColor: string }> = {
  trial: { 
    label: 'تجريبي', 
    bgColor: 'bg-blue-50', 
    textColor: 'text-blue-700', 
    borderColor: 'border-blue-200' 
  },
  active: { 
    label: 'نشط', 
    bgColor: 'bg-green-50', 
    textColor: 'text-green-700', 
    borderColor: 'border-green-200' 
  },
  pending_renewal: { 
    label: 'في انتظار التجديد', 
    bgColor: 'bg-yellow-50', 
    textColor: 'text-yellow-700', 
    borderColor: 'border-yellow-200' 
  },
  expired: { 
    label: 'منتهي', 
    bgColor: 'bg-red-50', 
    textColor: 'text-red-700', 
    borderColor: 'border-red-200' 
  },
  cancelled: { 
    label: 'ملغي', 
    bgColor: 'bg-gray-50', 
    textColor: 'text-gray-700', 
    borderColor: 'border-gray-200' 
  },
};

const activeStatusConfig: Record<string, { label: string; bgColor: string; textColor: string }> = {
  active: { label: 'نشط', bgColor: 'bg-green-100', textColor: 'text-green-800' },
  inactive: { label: 'معطل', bgColor: 'bg-red-100', textColor: 'text-red-800' },
};

const ClientsPage = () => {
  const [organizations, setOrganizations] = useState<ClientOrganization[]>([]);
  const [accounts, setAccounts] = useState<ClientAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('organizations');
  const [orgDialogOpen, setOrgDialogOpen] = useState(false);
  const [accountDialogOpen, setAccountDialogOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState<ClientOrganization | null>(null);
  const [editingAccount, setEditingAccount] = useState<ClientAccount | null>(null);
  const [saving, setSaving] = useState(false);

  const [orgForm, setOrgForm] = useState({
    name: '',
    organization_type: 'charity',
    registration_number: '',
    website_url: '',
    contact_email: '',
    contact_phone: '',
    city: '',
    address: '',
    subscription_status: 'trial',
    subscription_plan: 'basic',
    subscription_start_date: '',
    subscription_end_date: '',
    notes: ''
  });

  const [accountForm, setAccountForm] = useState({
    organization_id: '',
    full_name: '',
    email: '',
    phone: '',
    job_title: '',
    is_primary_contact: false,
    password: '',
    useOrgEmail: false
  });

  // Get selected organization
  const selectedOrg = organizations.find(org => org.id === accountForm.organization_id);

  // Phone validation for Saudi numbers (05xxxxxxxx)
  const validateSaudiPhone = (phone: string): boolean => {
    if (!phone) return true; // Optional field
    const saudiPhoneRegex = /^05\d{8}$/;
    return saudiPhoneRegex.test(phone);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch organizations
      const { data: orgsData, error: orgsError } = await supabase
        .from('client_organizations')
        .select('*')
        .order('created_at', { ascending: false });

      if (orgsError) throw orgsError;

      // Fetch accounts
      const { data: accountsData, error: accountsError } = await supabase
        .from('client_accounts')
        .select('*')
        .order('created_at', { ascending: false });

      if (accountsError) throw accountsError;

      // Add accounts count to organizations
      const orgsWithCount = orgsData?.map(org => ({
        ...org,
        accounts_count: accountsData?.filter(a => a.organization_id === org.id).length || 0
      })) || [];

      setOrganizations(orgsWithCount);
      setAccounts(accountsData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('حدث خطأ أثناء تحميل البيانات');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveOrganization = async () => {
    if (!orgForm.name || !orgForm.contact_email) {
      toast.error('يرجى ملء الحقول المطلوبة');
      return;
    }

    setSaving(true);
    try {
      const orgData = {
        name: orgForm.name,
        organization_type: orgForm.organization_type as any,
        registration_number: orgForm.registration_number || null,
        website_url: orgForm.website_url || null,
        contact_email: orgForm.contact_email,
        contact_phone: orgForm.contact_phone || null,
        city: orgForm.city || null,
        address: orgForm.address || null,
        subscription_status: orgForm.subscription_status as any,
        subscription_plan: orgForm.subscription_plan || null,
        subscription_start_date: orgForm.subscription_start_date || null,
        subscription_end_date: orgForm.subscription_end_date || null,
        notes: orgForm.notes || null
      };

      if (editingOrg) {
        const { error } = await supabase
          .from('client_organizations')
          .update(orgData)
          .eq('id', editingOrg.id);

        if (error) throw error;
        toast.success('تم تحديث بيانات المؤسسة');
      } else {
        const { error } = await supabase
          .from('client_organizations')
          .insert(orgData);

        if (error) throw error;
        toast.success('تم إضافة المؤسسة بنجاح');
      }

      setOrgDialogOpen(false);
      resetOrgForm();
      fetchData();
    } catch (error) {
      console.error('Error saving organization:', error);
      toast.error('حدث خطأ أثناء الحفظ');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAccount = async () => {
    if (!accountForm.organization_id || !accountForm.full_name || !accountForm.email) {
      toast.error('يرجى ملء الحقول المطلوبة');
      return;
    }

    if (!editingAccount && (!accountForm.password || accountForm.password.length < 6)) {
      toast.error('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }

    // Validate Saudi phone number
    if (accountForm.phone && !validateSaudiPhone(accountForm.phone)) {
      toast.error('رقم الهاتف يجب أن يبدأ بـ 05 ويتكون من 10 أرقام');
      return;
    }

    setSaving(true);
    try {
      if (editingAccount) {
        // Update existing account
        const { error } = await supabase
          .from('client_accounts')
          .update({
            full_name: accountForm.full_name,
            phone: accountForm.phone || null,
            job_title: accountForm.job_title || null,
            is_primary_contact: accountForm.is_primary_contact
          })
          .eq('id', editingAccount.id);

        if (error) throw error;
        toast.success('تم تحديث بيانات الحساب');
      } else {
        // Create new client account using edge function
        const { data, error } = await supabase.functions.invoke('create-client-account', {
          body: {
            organization_id: accountForm.organization_id,
            full_name: accountForm.full_name,
            email: accountForm.email,
            password: accountForm.password,
            phone: accountForm.phone || null,
            job_title: accountForm.job_title || null,
            is_primary_contact: accountForm.is_primary_contact
          }
        });

        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        
        toast.success('تم إنشاء الحساب وإرسال بيانات الدخول للبريد الإلكتروني');
      }

      setAccountDialogOpen(false);
      resetAccountForm();
      fetchData();
    } catch (error: any) {
      console.error('Error saving account:', error);
      if (error.message?.includes('already registered') || error.message?.includes('already been registered')) {
        toast.error('البريد الإلكتروني مسجل مسبقاً');
      } else {
        toast.error(error.message || 'حدث خطأ أثناء الحفظ');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteOrganization = async (org: ClientOrganization) => {
    if (!confirm(`هل أنت متأكد من حذف ${org.name}؟`)) return;

    try {
      const { error } = await supabase
        .from('client_organizations')
        .delete()
        .eq('id', org.id);

      if (error) throw error;
      toast.success('تم حذف المؤسسة');
      fetchData();
    } catch (error) {
      console.error('Error deleting organization:', error);
      toast.error('حدث خطأ أثناء الحذف');
    }
  };

  const handleToggleOrgStatus = async (org: ClientOrganization) => {
    const newStatus = !org.is_active;
    const action = newStatus ? 'تفعيل' : 'تعطيل';
    
    if (!confirm(`هل أنت متأكد من ${action} ${org.name}؟`)) return;

    try {
      const { error } = await supabase
        .from('client_organizations')
        .update({ is_active: newStatus })
        .eq('id', org.id);

      if (error) throw error;
      toast.success(`تم ${action} المؤسسة بنجاح`);
      fetchData();
    } catch (error) {
      console.error('Error toggling organization status:', error);
      toast.error(`حدث خطأ أثناء ${action} المؤسسة`);
    }
  };

  const resetOrgForm = () => {
    setEditingOrg(null);
    setOrgForm({
      name: '',
      organization_type: 'charity',
      registration_number: '',
      website_url: '',
      contact_email: '',
      contact_phone: '',
      city: '',
      address: '',
      subscription_status: 'trial',
      subscription_plan: 'basic',
      subscription_start_date: '',
      subscription_end_date: '',
      notes: ''
    });
  };

  const resetAccountForm = () => {
    setEditingAccount(null);
    setAccountForm({
      organization_id: '',
      full_name: '',
      email: '',
      phone: '',
      job_title: '',
      is_primary_contact: false,
      password: '',
      useOrgEmail: false
    });
  };

  const openEditOrg = (org: ClientOrganization) => {
    setEditingOrg(org);
    setOrgForm({
      name: org.name,
      organization_type: org.organization_type,
      registration_number: org.registration_number || '',
      website_url: org.website_url || '',
      contact_email: org.contact_email,
      contact_phone: org.contact_phone || '',
      city: org.city || '',
      address: '',
      subscription_status: org.subscription_status,
      subscription_plan: org.subscription_plan || 'basic',
      subscription_start_date: org.subscription_end_date ? '' : '',
      subscription_end_date: org.subscription_end_date || '',
      notes: ''
    });
    setOrgDialogOpen(true);
  };

  const filteredOrganizations = organizations.filter(org => 
    org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    org.contact_email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredAccounts = accounts.filter(acc =>
    acc.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    acc.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
            <Building2 className="w-7 h-7 text-primary" />
            إدارة العملاء
          </h1>
          <p className="text-muted-foreground mt-1">إدارة المؤسسات وحسابات العملاء</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={orgDialogOpen} onOpenChange={(open) => { setOrgDialogOpen(open); if (!open) resetOrgForm(); }}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                إضافة مؤسسة
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingOrg ? 'تعديل المؤسسة' : 'إضافة مؤسسة جديدة'}</DialogTitle>
                <DialogDescription>أدخل بيانات المؤسسة</DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div className="space-y-2">
                  <Label>اسم المؤسسة *</Label>
                  <Input
                    value={orgForm.name}
                    onChange={(e) => setOrgForm({ ...orgForm, name: e.target.value })}
                    placeholder="اسم الجمعية أو المؤسسة"
                  />
                </div>
                <div className="space-y-2">
                  <Label>نوع المؤسسة</Label>
                  <Select value={orgForm.organization_type} onValueChange={(v) => setOrgForm({ ...orgForm, organization_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {organizationTypes.map(t => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>البريد الإلكتروني *</Label>
                  <Input
                    type="email"
                    value={orgForm.contact_email}
                    onChange={(e) => setOrgForm({ ...orgForm, contact_email: e.target.value })}
                    placeholder="email@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>رقم الهاتف</Label>
                  <Input
                    value={orgForm.contact_phone}
                    onChange={(e) => setOrgForm({ ...orgForm, contact_phone: e.target.value })}
                    placeholder="05xxxxxxxx"
                  />
                </div>
                <div className="space-y-2">
                  <Label>رقم الترخيص</Label>
                  <Input
                    value={orgForm.registration_number}
                    onChange={(e) => setOrgForm({ ...orgForm, registration_number: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>الموقع الإلكتروني</Label>
                  <Input
                    type="url"
                    value={orgForm.website_url}
                    onChange={(e) => setOrgForm({ ...orgForm, website_url: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>المدينة</Label>
                  <Input
                    value={orgForm.city}
                    onChange={(e) => setOrgForm({ ...orgForm, city: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>حالة الاشتراك</Label>
                  <Select value={orgForm.subscription_status} onValueChange={(v) => setOrgForm({ ...orgForm, subscription_status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {subscriptionStatuses.map(s => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>الباقة</Label>
                  <Select value={orgForm.subscription_plan} onValueChange={(v) => setOrgForm({ ...orgForm, subscription_plan: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {subscriptionPlans.map(p => (
                        <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>تاريخ انتهاء الاشتراك</Label>
                  <Input
                    type="date"
                    value={orgForm.subscription_end_date}
                    onChange={(e) => setOrgForm({ ...orgForm, subscription_end_date: e.target.value })}
                  />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <Label>ملاحظات</Label>
                  <Textarea
                    value={orgForm.notes}
                    onChange={(e) => setOrgForm({ ...orgForm, notes: e.target.value })}
                    rows={3}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <Button variant="outline" onClick={() => { setOrgDialogOpen(false); resetOrgForm(); }}>
                  إلغاء
                </Button>
                <Button onClick={handleSaveOrganization} disabled={saving}>
                  {saving ? 'جاري الحفظ...' : 'حفظ'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={accountDialogOpen} onOpenChange={(open) => { setAccountDialogOpen(open); if (!open) resetAccountForm(); }}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Users className="w-4 h-4" />
                إضافة حساب
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingAccount ? 'تعديل الحساب' : 'إضافة حساب جديد'}</DialogTitle>
                <DialogDescription>أدخل بيانات حساب العميل</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>المؤسسة *</Label>
                  <Select 
                    value={accountForm.organization_id} 
                    onValueChange={(v) => {
                      const org = organizations.find(o => o.id === v);
                      setAccountForm({ 
                        ...accountForm, 
                        organization_id: v,
                        email: accountForm.useOrgEmail && org ? org.contact_email : accountForm.email
                      });
                    }}
                    disabled={!!editingAccount}
                  >
                    <SelectTrigger><SelectValue placeholder="اختر المؤسسة" /></SelectTrigger>
                    <SelectContent>
                      {organizations.map(org => (
                        <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>الاسم الكامل *</Label>
                  <Input
                    value={accountForm.full_name}
                    onChange={(e) => setAccountForm({ ...accountForm, full_name: e.target.value })}
                  />
                </div>
                
                {/* Use Organization Email Option */}
                {!editingAccount && selectedOrg && (
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <input
                      type="checkbox"
                      id="useOrgEmail"
                      checked={accountForm.useOrgEmail}
                      onChange={(e) => {
                        const useOrg = e.target.checked;
                        setAccountForm({
                          ...accountForm,
                          useOrgEmail: useOrg,
                          email: useOrg ? selectedOrg.contact_email : ''
                        });
                      }}
                      className="h-4 w-4 rounded border-input"
                    />
                    <Label htmlFor="useOrgEmail" className="cursor-pointer text-sm">
                      استخدم بريد المؤسسة ({selectedOrg.contact_email})
                    </Label>
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label>البريد الإلكتروني *</Label>
                  <Input
                    type="email"
                    value={accountForm.email}
                    onChange={(e) => setAccountForm({ ...accountForm, email: e.target.value, useOrgEmail: false })}
                    disabled={!!editingAccount || accountForm.useOrgEmail}
                    placeholder="example@organization.com"
                  />
                </div>
                {!editingAccount && (
                  <div className="space-y-2">
                    <Label>كلمة المرور *</Label>
                    <Input
                      type="password"
                      value={accountForm.password}
                      onChange={(e) => setAccountForm({ ...accountForm, password: e.target.value })}
                      placeholder="6 أحرف على الأقل"
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label>رقم الهاتف (السعودية)</Label>
                  <Input
                    value={accountForm.phone}
                    onChange={(e) => {
                      // Only allow numbers
                      const value = e.target.value.replace(/[^0-9]/g, '');
                      setAccountForm({ ...accountForm, phone: value });
                    }}
                    placeholder="05xxxxxxxx"
                    maxLength={10}
                    dir="ltr"
                    className="text-left"
                  />
                  {accountForm.phone && !validateSaudiPhone(accountForm.phone) && (
                    <p className="text-xs text-destructive">رقم الهاتف يجب أن يبدأ بـ 05 ويتكون من 10 أرقام</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>المسمى الوظيفي</Label>
                  <Input
                    value={accountForm.job_title}
                    onChange={(e) => setAccountForm({ ...accountForm, job_title: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <Button variant="outline" onClick={() => { setAccountDialogOpen(false); resetAccountForm(); }}>
                  إلغاء
                </Button>
                <Button onClick={handleSaveAccount} disabled={saving}>
                  {saving ? 'جاري الحفظ...' : 'حفظ'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{organizations.length}</p>
            <p className="text-sm text-muted-foreground">إجمالي المؤسسات</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">
              {organizations.filter(o => o.subscription_status === 'active').length}
            </p>
            <p className="text-sm text-muted-foreground">اشتراكات نشطة</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{accounts.length}</p>
            <p className="text-sm text-muted-foreground">إجمالي الحسابات</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-orange-600">
              {organizations.filter(o => o.subscription_status === 'pending_renewal' || o.subscription_status === 'expired').length}
            </p>
            <p className="text-sm text-muted-foreground">تحتاج تجديد</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          placeholder="البحث..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pr-10"
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="organizations" className="gap-2">
            <Building2 className="w-4 h-4" />
            المؤسسات ({organizations.length})
          </TabsTrigger>
          <TabsTrigger value="accounts" className="gap-2">
            <Users className="w-4 h-4" />
            الحسابات ({accounts.length})
          </TabsTrigger>
        </TabsList>

        {/* Organizations Tab */}
        <TabsContent value="organizations" className="mt-6">
          <div className="grid gap-4">
            {filteredOrganizations.map(org => {
              const status = statusConfig[org.subscription_status];
              return (
                <Card key={org.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Building2 className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-foreground">{org.name}</h3>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${status?.bgColor} ${status?.textColor} ${status?.borderColor}`}>
                              {status?.label}
                            </span>
                            {!org.is_active && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border bg-red-100 text-red-800 border-red-200">
                                معطل
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Mail className="w-4 h-4" />
                              {org.contact_email}
                            </span>
                            {org.contact_phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="w-4 h-4" />
                                {org.contact_phone}
                              </span>
                            )}
                            {org.website_url && (
                              <span className="flex items-center gap-1">
                                <Globe className="w-4 h-4" />
                                {org.website_url}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Users className="w-4 h-4" />
                              {org.accounts_count} حساب
                            </span>
                          </div>
                          {org.subscription_end_date && (
                            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              ينتهي: {format(new Date(org.subscription_end_date), 'dd MMM yyyy', { locale: ar })}
                            </p>
                          )}
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditOrg(org)}>
                            <Edit className="w-4 h-4 ml-2" />
                            تعديل
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleToggleOrgStatus(org)}
                          >
                            {org.is_active ? (
                              <>
                                <XCircle className="w-4 h-4 ml-2" />
                                تعطيل المؤسسة
                              </>
                            ) : (
                              <>
                                <CheckCircle className="w-4 h-4 ml-2" />
                                تفعيل المؤسسة
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDeleteOrganization(org)}
                            className="text-destructive"
                          >
                            <Trash2 className="w-4 h-4 ml-2" />
                            حذف
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Accounts Tab */}
        <TabsContent value="accounts" className="mt-6">
          <div className="grid gap-4">
            {filteredAccounts.map(account => {
              const org = organizations.find(o => o.id === account.organization_id);
              return (
                <Card key={account.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
                          <span className="text-lg font-semibold text-foreground">
                            {account.full_name.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-foreground">{account.full_name}</h3>
                            {account.is_primary_contact && <Badge variant="secondary">جهة الاتصال الرئيسية</Badge>}
                            {!account.is_active && <Badge variant="destructive">معطل</Badge>}
                          </div>
                          <p className="text-sm text-muted-foreground">{account.email}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {org?.name} • {account.job_title || 'عميل'}
                          </p>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => {
                        setEditingAccount(account);
                        setAccountForm({
                          organization_id: account.organization_id,
                          full_name: account.full_name,
                          email: account.email,
                          phone: account.phone || '',
                          job_title: account.job_title || '',
                          is_primary_contact: account.is_primary_contact,
                          password: '',
                          useOrgEmail: false
                        });
                        setAccountDialogOpen(true);
                      }}>
                        <Edit className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ClientsPage;
