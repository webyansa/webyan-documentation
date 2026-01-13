import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  Settings, 
  Clock, 
  Calendar,
  Plus,
  Trash2,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface WorkingDay {
  day: number; // 0 = Sunday, 1 = Monday, etc.
  name: string;
  isActive: boolean;
}

interface Holiday {
  id: string;
  date: string;
  name: string;
}

interface MeetingSettings {
  workStartHour: number;
  workEndHour: number;
  breakStartHour: number;
  breakEndHour: number;
  slotDuration: number;
  workingDays: WorkingDay[];
  holidays: Holiday[];
}

const DEFAULT_DAYS: WorkingDay[] = [
  { day: 0, name: 'الأحد', isActive: true },
  { day: 1, name: 'الإثنين', isActive: true },
  { day: 2, name: 'الثلاثاء', isActive: true },
  { day: 3, name: 'الأربعاء', isActive: true },
  { day: 4, name: 'الخميس', isActive: true },
  { day: 5, name: 'الجمعة', isActive: false },
  { day: 6, name: 'السبت', isActive: false },
];

export default function MeetingSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<MeetingSettings>({
    workStartHour: 9,
    workEndHour: 17,
    breakStartHour: 12,
    breakEndHour: 13,
    slotDuration: 30,
    workingDays: DEFAULT_DAYS,
    holidays: []
  });

  const [newHoliday, setNewHoliday] = useState({ date: '', name: '' });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .eq('key', 'meeting_settings')
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        const parsed = JSON.parse(data.value);
        setSettings({
          ...settings,
          ...parsed,
          workingDays: parsed.workingDays || DEFAULT_DAYS,
          holidays: parsed.holidays || []
        });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      toast.error('حدث خطأ في تحميل الإعدادات');
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const { data: existing } = await supabase
        .from('system_settings')
        .select('id')
        .eq('key', 'meeting_settings')
        .maybeSingle();

      const settingsData = {
        key: 'meeting_settings',
        value: JSON.stringify(settings),
        description: 'إعدادات نظام حجز الاجتماعات'
      };

      if (existing) {
        const { error } = await supabase
          .from('system_settings')
          .update(settingsData)
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('system_settings')
          .insert(settingsData);
        if (error) throw error;
      }

      toast.success('تم حفظ الإعدادات بنجاح');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('حدث خطأ في حفظ الإعدادات');
    } finally {
      setSaving(false);
    }
  };

  const toggleDay = (dayIndex: number) => {
    setSettings(prev => ({
      ...prev,
      workingDays: prev.workingDays.map(d => 
        d.day === dayIndex ? { ...d, isActive: !d.isActive } : d
      )
    }));
  };

  const addHoliday = () => {
    if (!newHoliday.date || !newHoliday.name) {
      toast.error('يرجى إدخال التاريخ واسم الإجازة');
      return;
    }

    const holiday: Holiday = {
      id: Date.now().toString(),
      date: newHoliday.date,
      name: newHoliday.name
    };

    setSettings(prev => ({
      ...prev,
      holidays: [...prev.holidays, holiday].sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      )
    }));

    setNewHoliday({ date: '', name: '' });
    toast.success('تمت إضافة الإجازة');
  };

  const removeHoliday = (id: string) => {
    setSettings(prev => ({
      ...prev,
      holidays: prev.holidays.filter(h => h.id !== id)
    }));
  };

  const activeWorkDays = settings.workingDays.filter(d => d.isActive).length;
  const upcomingHolidays = settings.holidays.filter(h => new Date(h.date) >= new Date()).length;

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
            <Settings className="h-7 w-7 text-primary" />
            إعدادات المواعيد
          </h1>
          <p className="text-muted-foreground mt-1">
            التحكم في أيام وأوقات العمل المتاحة لحجز الاجتماعات
          </p>
        </div>
        <Button onClick={saveSettings} disabled={saving} className="gap-2">
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          حفظ الإعدادات
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100">
                <Calendar className="h-5 w-5 text-green-700" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeWorkDays}</p>
                <p className="text-xs text-muted-foreground">أيام عمل في الأسبوع</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <Clock className="h-5 w-5 text-blue-700" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {settings.workEndHour - settings.workStartHour - (settings.breakEndHour - settings.breakStartHour)}
                </p>
                <p className="text-xs text-muted-foreground">ساعات عمل يومياً</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-100">
                <AlertCircle className="h-5 w-5 text-orange-700" />
              </div>
              <div>
                <p className="text-2xl font-bold">{upcomingHolidays}</p>
                <p className="text-xs text-muted-foreground">إجازات قادمة</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Working Hours */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              ساعات العمل
            </CardTitle>
            <CardDescription>تحديد أوقات العمل اليومية</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>بداية الدوام</Label>
                <Input
                  type="number"
                  min={6}
                  max={12}
                  value={settings.workStartHour}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    workStartHour: parseInt(e.target.value) || 9
                  }))}
                />
                <p className="text-xs text-muted-foreground">
                  {settings.workStartHour}:00 صباحاً
                </p>
              </div>
              <div className="space-y-2">
                <Label>نهاية الدوام</Label>
                <Input
                  type="number"
                  min={14}
                  max={22}
                  value={settings.workEndHour}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    workEndHour: parseInt(e.target.value) || 17
                  }))}
                />
                <p className="text-xs text-muted-foreground">
                  {settings.workEndHour}:00 مساءً
                </p>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <Label className="text-base">فترة الاستراحة</Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">من</Label>
                  <Input
                    type="number"
                    min={settings.workStartHour}
                    max={settings.workEndHour}
                    value={settings.breakStartHour}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      breakStartHour: parseInt(e.target.value) || 12
                    }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">إلى</Label>
                  <Input
                    type="number"
                    min={settings.breakStartHour}
                    max={settings.workEndHour}
                    value={settings.breakEndHour}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      breakEndHour: parseInt(e.target.value) || 13
                    }))}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                الاستراحة من {settings.breakStartHour}:00 إلى {settings.breakEndHour}:00
              </p>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>مدة كل موعد (دقيقة)</Label>
              <Input
                type="number"
                min={15}
                max={120}
                step={15}
                value={settings.slotDuration}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  slotDuration: parseInt(e.target.value) || 30
                }))}
              />
            </div>
          </CardContent>
        </Card>

        {/* Working Days */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              أيام العمل
            </CardTitle>
            <CardDescription>تحديد أيام العمل الأسبوعية</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {settings.workingDays.map((day) => (
                <div
                  key={day.day}
                  className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${
                    day.isActive 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-muted/50 border-border'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {day.isActive ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-muted-foreground" />
                    )}
                    <span className="font-medium">{day.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={day.isActive ? 'default' : 'secondary'}>
                      {day.isActive ? 'يوم عمل' : 'إجازة'}
                    </Badge>
                    <Switch
                      checked={day.isActive}
                      onCheckedChange={() => toggleDay(day.day)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Holidays */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            الإجازات والأيام المستثناة
          </CardTitle>
          <CardDescription>
            إضافة الإجازات الرسمية أو أيام محددة غير متاحة للحجز
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Add Holiday Form */}
          <div className="flex flex-col sm:flex-row gap-4 p-4 bg-muted/50 rounded-lg">
            <div className="flex-1 space-y-2">
              <Label>تاريخ الإجازة</Label>
              <Input
                type="date"
                value={newHoliday.date}
                onChange={(e) => setNewHoliday(prev => ({ ...prev, date: e.target.value }))}
                min={format(new Date(), 'yyyy-MM-dd')}
              />
            </div>
            <div className="flex-1 space-y-2">
              <Label>اسم الإجازة</Label>
              <Input
                placeholder="مثال: عيد الفطر"
                value={newHoliday.name}
                onChange={(e) => setNewHoliday(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={addHoliday} className="gap-2">
                <Plus className="h-4 w-4" />
                إضافة
              </Button>
            </div>
          </div>

          {/* Holidays List */}
          {settings.holidays.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>لم تتم إضافة أي إجازات بعد</p>
            </div>
          ) : (
            <div className="space-y-2">
              {settings.holidays.map((holiday) => {
                const isPast = new Date(holiday.date) < new Date();
                return (
                  <div
                    key={holiday.id}
                    className={`flex items-center justify-between p-4 rounded-lg border ${
                      isPast ? 'bg-muted/30 opacity-60' : 'bg-orange-50 border-orange-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <AlertCircle className={`h-5 w-5 ${isPast ? 'text-muted-foreground' : 'text-orange-600'}`} />
                      <div>
                        <p className="font-medium">{holiday.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(holiday.date), 'EEEE d MMMM yyyy', { locale: ar })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isPast && <Badge variant="secondary">منتهية</Badge>}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeHoliday(holiday.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
