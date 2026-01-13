import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { 
  Settings, 
  User,
  Building2,
  Lock,
  Save,
  Loader2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

interface ClientAccount {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  job_title: string | null;
}

interface OrganizationInfo {
  name: string;
  contact_email: string;
  contact_phone: string | null;
  website_url: string | null;
  address: string | null;
  city: string | null;
}

const PortalSettings = () => {
  const { user } = useAuth();
  const { clientInfo } = useOutletContext<{ clientInfo: any }>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [account, setAccount] = useState<ClientAccount | null>(null);
  const [organization, setOrganization] = useState<OrganizationInfo | null>(null);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      const { data: accountData } = await supabase
        .from('client_accounts')
        .select('id, full_name, email, phone, job_title, organization_id')
        .eq('user_id', user?.id)
        .single();

      if (accountData) {
        setAccount({
          id: accountData.id,
          full_name: accountData.full_name,
          email: accountData.email,
          phone: accountData.phone,
          job_title: accountData.job_title
        });

        const { data: orgData } = await supabase
          .from('client_organizations')
          .select('name, contact_email, contact_phone, website_url, address, city')
          .eq('id', accountData.organization_id)
          .single();

        if (orgData) {
          setOrganization(orgData);
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async () => {
    if (!account) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('client_accounts')
        .update({
          full_name: account.full_name,
          phone: account.phone,
          job_title: account.job_title
        })
        .eq('id', account.id);

      if (error) throw error;
      toast.success('تم حفظ التغييرات بنجاح');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('حدث خطأ أثناء حفظ التغييرات');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('كلمة المرور الجديدة غير متطابقة');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      });

      if (error) throw error;

      toast.success('تم تغيير كلمة المرور بنجاح');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      console.error('Error changing password:', error);
      toast.error('حدث خطأ أثناء تغيير كلمة المرور');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-foreground flex items-center gap-3">
          <Settings className="w-8 h-8 text-primary" />
          الإعدادات
        </h1>
        <p className="text-muted-foreground mt-1">إدارة حسابك ومعلوماتك الشخصية</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="profile" className="gap-2">
            <User className="w-4 h-4" />
            الملف الشخصي
          </TabsTrigger>
          <TabsTrigger value="organization" className="gap-2">
            <Building2 className="w-4 h-4" />
            المؤسسة
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Lock className="w-4 h-4" />
            الأمان
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>الملف الشخصي</CardTitle>
              <CardDescription>تعديل معلوماتك الشخصية</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">الاسم الكامل</Label>
                <Input
                  id="fullName"
                  value={account?.full_name || ''}
                  onChange={(e) => setAccount(prev => prev ? { ...prev, full_name: e.target.value } : null)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">البريد الإلكتروني</Label>
                <Input
                  id="email"
                  value={account?.email || ''}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">لا يمكن تغيير البريد الإلكتروني</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">رقم الهاتف</Label>
                <Input
                  id="phone"
                  value={account?.phone || ''}
                  onChange={(e) => setAccount(prev => prev ? { ...prev, phone: e.target.value } : null)}
                  placeholder="05xxxxxxxx"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="jobTitle">المسمى الوظيفي</Label>
                <Input
                  id="jobTitle"
                  value={account?.job_title || ''}
                  onChange={(e) => setAccount(prev => prev ? { ...prev, job_title: e.target.value } : null)}
                  placeholder="مثال: مدير المشاريع"
                />
              </div>
              <Button onClick={handleUpdateProfile} disabled={saving} className="gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                حفظ التغييرات
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Organization Tab */}
        <TabsContent value="organization">
          <Card>
            <CardHeader>
              <CardTitle>معلومات المؤسسة</CardTitle>
              <CardDescription>بيانات المؤسسة المسجلة (للعرض فقط)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>اسم المؤسسة</Label>
                <Input value={organization?.name || ''} disabled className="bg-muted" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>البريد الإلكتروني</Label>
                  <Input value={organization?.contact_email || ''} disabled className="bg-muted" />
                </div>
                <div className="space-y-2">
                  <Label>رقم الهاتف</Label>
                  <Input value={organization?.contact_phone || '-'} disabled className="bg-muted" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>الموقع الإلكتروني</Label>
                <Input value={organization?.website_url || '-'} disabled className="bg-muted" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>المدينة</Label>
                  <Input value={organization?.city || '-'} disabled className="bg-muted" />
                </div>
                <div className="space-y-2">
                  <Label>العنوان</Label>
                  <Input value={organization?.address || '-'} disabled className="bg-muted" />
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                لتحديث بيانات المؤسسة، يرجى التواصل مع الدعم الفني
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>تغيير كلمة المرور</CardTitle>
              <CardDescription>تأكد من استخدام كلمة مرور قوية</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">كلمة المرور الجديدة</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  placeholder="••••••••"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">تأكيد كلمة المرور</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  placeholder="••••••••"
                />
              </div>
              <Button onClick={handleChangePassword} disabled={saving} className="gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                تغيير كلمة المرور
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PortalSettings;
