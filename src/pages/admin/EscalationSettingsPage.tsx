import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  AlertTriangle,
  Clock,
  Bell,
  Save,
  Loader2,
  Settings,
  Mail,
  Users,
  RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

interface EscalationSettings {
  id: string;
  escalation_hours: number;
  notify_admin: boolean;
  notify_staff: boolean;
  is_active: boolean;
}

export default function EscalationSettingsPage() {
  const [settings, setSettings] = useState<EscalationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('escalation_settings')
        .select('*')
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setSettings(data as EscalationSettings);
      } else {
        // Create default settings if not exists
        const { data: newSettings, error: insertError } = await supabase
          .from('escalation_settings')
          .insert({
            escalation_hours: 24,
            notify_admin: true,
            notify_staff: true,
            is_active: true
          })
          .select()
          .single();

        if (insertError) throw insertError;
        setSettings(newSettings as EscalationSettings);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('حدث خطأ في تحميل الإعدادات');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('escalation_settings')
        .update({
          escalation_hours: settings.escalation_hours,
          notify_admin: settings.notify_admin,
          notify_staff: settings.notify_staff,
          is_active: settings.is_active,
          updated_at: new Date().toISOString()
        })
        .eq('id', settings.id);

      if (error) throw error;
      toast.success('تم حفظ الإعدادات بنجاح');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('حدث خطأ أثناء الحفظ');
    } finally {
      setSaving(false);
    }
  };

  const handleCheckNow = async () => {
    setChecking(true);
    try {
      const { data, error } = await supabase.functions.invoke('check-escalations');
      
      if (error) throw error;
      
      if (data?.escalatedCount > 0) {
        toast.success(`تم تصعيد ${data.escalatedCount} تذكرة`);
      } else {
        toast.info('لا توجد تذاكر تحتاج للتصعيد');
      }
    } catch (error: any) {
      console.error('Error checking escalations:', error);
      toast.error(error.message || 'حدث خطأ أثناء الفحص');
    } finally {
      setChecking(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <AlertTriangle className="h-7 w-7 text-orange-500" />
          إعدادات التصعيد التلقائي
        </h1>
        <p className="text-muted-foreground mt-1">
          تخصيص إعدادات تصعيد التذاكر تلقائياً عند عدم الرد
        </p>
      </div>

      {/* Main Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            الإعدادات الرئيسية
          </CardTitle>
          <CardDescription>
            تحديد المدة الزمنية وخيارات الإشعارات
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Active Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base">تفعيل التصعيد التلقائي</Label>
              <p className="text-sm text-muted-foreground">
                تفعيل أو إيقاف نظام التصعيد التلقائي
              </p>
            </div>
            <Switch
              checked={settings?.is_active || false}
              onCheckedChange={(checked) => setSettings(prev => prev ? {...prev, is_active: checked} : null)}
            />
          </div>

          <Separator />

          {/* Escalation Hours */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              مدة التصعيد (بالساعات)
            </Label>
            <p className="text-sm text-muted-foreground">
              سيتم تصعيد التذكرة إذا لم يتم الرد عليها خلال هذه المدة
            </p>
            <Input
              type="number"
              min={1}
              max={168}
              value={settings?.escalation_hours || 24}
              onChange={(e) => setSettings(prev => prev ? {...prev, escalation_hours: parseInt(e.target.value) || 24} : null)}
              className="w-32"
            />
            <div className="flex flex-wrap gap-2 mt-2">
              {[6, 12, 24, 48, 72].map((hours) => (
                <Button
                  key={hours}
                  variant={settings?.escalation_hours === hours ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSettings(prev => prev ? {...prev, escalation_hours: hours} : null)}
                >
                  {hours} ساعة
                </Button>
              ))}
            </div>
          </div>

          <Separator />

          {/* Notification Settings */}
          <div className="space-y-4">
            <Label className="flex items-center gap-2 text-base">
              <Bell className="h-4 w-4" />
              إعدادات الإشعارات
            </Label>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">إشعار المدراء</p>
                  <p className="text-xs text-muted-foreground">إرسال إشعار للمدراء عند التصعيد</p>
                </div>
              </div>
              <Switch
                checked={settings?.notify_admin || false}
                onCheckedChange={(checked) => setSettings(prev => prev ? {...prev, notify_admin: checked} : null)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Users className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">إشعار الموظف المسؤول</p>
                  <p className="text-xs text-muted-foreground">إرسال إشعار للموظف المسؤول عن التذكرة</p>
                </div>
              </div>
              <Switch
                checked={settings?.notify_staff || false}
                onCheckedChange={(checked) => setSettings(prev => prev ? {...prev, notify_staff: checked} : null)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          حفظ الإعدادات
        </Button>
        <Button variant="outline" onClick={handleCheckNow} disabled={checking} className="gap-2">
          {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          فحص التصعيدات الآن
        </Button>
      </div>

      {/* Info Card */}
      <Card className="bg-orange-50 border-orange-200">
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <AlertTriangle className="h-6 w-6 text-orange-600 flex-shrink-0" />
            <div className="space-y-2">
              <p className="font-medium text-orange-800">كيف يعمل نظام التصعيد؟</p>
              <ul className="text-sm text-orange-700 list-disc list-inside space-y-1">
                <li>يتم فحص التذاكر بشكل دوري للتحقق من التذاكر التي لم يتم الرد عليها</li>
                <li>إذا مرت المدة المحددة دون رد من الموظف، يتم تصعيد التذكرة تلقائياً</li>
                <li>يتم إرسال إشعار للمدراء والموظف المسؤول حسب الإعدادات</li>
                <li>التذاكر المصعدة تظهر بعلامة خاصة في قائمة التذاكر</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
