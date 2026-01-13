import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Settings, Globe, Bell, Shield, Database, Save, Mail, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface SystemSettings {
  admin_email: string;
  company_name: string;
  support_response_time: string;
}

export default function SettingsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState<SystemSettings>({
    admin_email: '',
    company_name: '',
    support_response_time: '48',
  });

  const [generalSettings, setGeneralSettings] = useState({
    siteName: 'دليل استخدام ويبيان',
    siteDescription: 'الدليل الشامل لاستخدام لوحة تحكم ويبيان',
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('key, value');

      if (error) throw error;

      const settingsMap: SystemSettings = {
        admin_email: '',
        company_name: '',
        support_response_time: '48',
      };

      data?.forEach((item: { key: string; value: string }) => {
        if (item.key in settingsMap) {
          (settingsMap as any)[item.key] = item.value;
        }
      });

      setSettings(settingsMap);
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveEmailSettings = async () => {
    setIsSaving(true);
    try {
      const updates = [
        { key: 'admin_email', value: settings.admin_email },
        { key: 'company_name', value: settings.company_name },
        { key: 'support_response_time', value: settings.support_response_time },
      ];

      for (const update of updates) {
        const { error } = await supabase
          .from('system_settings')
          .update({ value: update.value })
          .eq('key', update.key);

        if (error) throw error;
      }

      toast.success('تم حفظ إعدادات البريد بنجاح');
    } catch (error: any) {
      console.error('Error saving settings:', error);
      toast.error('حدث خطأ أثناء حفظ الإعدادات');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = () => {
    toast.success('تم حفظ الإعدادات بنجاح');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">الإعدادات</h1>
        <p className="text-muted-foreground">
          إعدادات نظام التوثيق
        </p>
      </div>

      {/* Email Settings */}
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            إعدادات البريد الإلكتروني
          </CardTitle>
          <CardDescription>إعدادات إشعارات البريد الإلكتروني للتذاكر</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="admin-email">البريد الإلكتروني للإدارة</Label>
            <Input
              id="admin-email"
              type="email"
              value={settings.admin_email}
              onChange={(e) => setSettings({ ...settings, admin_email: e.target.value })}
              placeholder="admin@example.com"
              dir="ltr"
            />
            <p className="text-sm text-muted-foreground">
              سيتم إرسال إشعارات التذاكر الجديدة إلى هذا البريد
            </p>
          </div>
          
          <Separator />
          
          <div className="space-y-2">
            <Label htmlFor="company-name">اسم الشركة</Label>
            <Input
              id="company-name"
              value={settings.company_name}
              onChange={(e) => setSettings({ ...settings, company_name: e.target.value })}
              placeholder="اسم الشركة"
            />
            <p className="text-sm text-muted-foreground">
              يظهر في رسائل البريد الإلكتروني المرسلة للعملاء
            </p>
          </div>
          
          <Separator />
          
          <div className="space-y-2">
            <Label htmlFor="response-time">وقت الاستجابة المتوقع (ساعات)</Label>
            <Input
              id="response-time"
              type="number"
              min="1"
              max="168"
              value={settings.support_response_time}
              onChange={(e) => setSettings({ ...settings, support_response_time: e.target.value })}
              placeholder="48"
              dir="ltr"
              className="w-32"
            />
            <p className="text-sm text-muted-foreground">
              يظهر في رسالة تأكيد استلام التذكرة للعميل
            </p>
          </div>

          <div className="bg-muted/50 rounded-lg p-4 mt-4">
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <Bell className="h-4 w-4" />
              إشعارات البريد الإلكتروني
            </h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>✓ إشعار للإدارة عند وصول تذكرة جديدة</li>
              <li>✓ رسالة تأكيد للعميل عند إنشاء تذكرة</li>
              <li>✓ إشعار للعميل عند الرد على تذكرته</li>
              <li>✓ إشعار للعميل عند تحديث حالة التذكرة</li>
            </ul>
          </div>

          <Button onClick={handleSaveEmailSettings} disabled={isSaving} className="gap-2">
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            حفظ إعدادات البريد
          </Button>
        </CardContent>
      </Card>

      {/* General Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            إعدادات عامة
          </CardTitle>
          <CardDescription>إعدادات أساسية للدليل</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="site-name">اسم الدليل</Label>
            <Input
              id="site-name"
              value={generalSettings.siteName}
              onChange={(e) => setGeneralSettings({ ...generalSettings, siteName: e.target.value })}
              placeholder="اسم الدليل"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="site-description">وصف الدليل</Label>
            <Input
              id="site-description"
              value={generalSettings.siteDescription}
              onChange={(e) => setGeneralSettings({ ...generalSettings, siteDescription: e.target.value })}
              placeholder="وصف مختصر"
            />
          </div>
        </CardContent>
      </Card>

      {/* Localization */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            اللغة والتوطين
          </CardTitle>
          <CardDescription>إعدادات اللغة والمنطقة</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>اللغة الافتراضية</Label>
              <p className="text-sm text-muted-foreground">العربية</p>
            </div>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>دعم اللغة الإنجليزية</Label>
              <p className="text-sm text-muted-foreground">
                إتاحة المحتوى باللغة الإنجليزية
              </p>
            </div>
            <Switch />
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            الإشعارات
          </CardTitle>
          <CardDescription>إعدادات التنبيهات والإشعارات</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>إشعارات البلاغات الجديدة</Label>
              <p className="text-sm text-muted-foreground">
                تلقي إشعار عند وصول بلاغ جديد
              </p>
            </div>
            <Switch defaultChecked />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>تقرير أسبوعي</Label>
              <p className="text-sm text-muted-foreground">
                إرسال ملخص أسبوعي للإحصائيات
              </p>
            </div>
            <Switch />
          </div>
        </CardContent>
      </Card>

      {/* Security */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            الأمان
          </CardTitle>
          <CardDescription>إعدادات الأمان والوصول</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>السماح بالتسجيل العام</Label>
              <p className="text-sm text-muted-foreground">
                السماح لأي شخص بإنشاء حساب
              </p>
            </div>
            <Switch defaultChecked />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>التحقق بخطوتين</Label>
              <p className="text-sm text-muted-foreground">
                طلب التحقق بخطوتين للمدراء
              </p>
            </div>
            <Switch />
          </div>
        </CardContent>
      </Card>

      {/* Data */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            البيانات
          </CardTitle>
          <CardDescription>إدارة بيانات النظام</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>تصدير البيانات</Label>
              <p className="text-sm text-muted-foreground">
                تصدير جميع المقالات والإعدادات
              </p>
            </div>
            <Button variant="outline">تصدير</Button>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>استيراد البيانات</Label>
              <p className="text-sm text-muted-foreground">
                استيراد بيانات من ملف
              </p>
            </div>
            <Button variant="outline">استيراد</Button>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} className="gap-2">
          <Save className="h-4 w-4" />
          حفظ الإعدادات
        </Button>
      </div>
    </div>
  );
}
