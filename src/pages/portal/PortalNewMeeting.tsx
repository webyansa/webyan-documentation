import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { 
  Calendar, 
  ArrowRight,
  Loader2,
  Clock
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { format } from 'date-fns';

const meetingTypes = [
  { value: 'general', label: 'اجتماع عام', description: 'مناقشة عامة أو استفسارات' },
  { value: 'training', label: 'جلسة تدريبية', description: 'تدريب على استخدام المنصة' },
  { value: 'support', label: 'دعم فني', description: 'حل مشكلة تقنية' },
  { value: 'demo', label: 'عرض توضيحي', description: 'عرض ميزات جديدة' },
  { value: 'consultation', label: 'استشارة', description: 'استشارة تقنية أو إدارية' },
];

const durations = [
  { value: 15, label: '15 دقيقة' },
  { value: 30, label: '30 دقيقة' },
  { value: 45, label: '45 دقيقة' },
  { value: 60, label: 'ساعة كاملة' },
];

const PortalNewMeeting = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    meeting_type: 'general',
    subject: '',
    description: '',
    preferred_date: '',
    preferred_time: '',
    alternative_date: '',
    alternative_time: '',
    duration_minutes: 30
  });

  useEffect(() => {
    fetchOrganizationId();
  }, [user]);

  const fetchOrganizationId = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('client_accounts')
      .select('organization_id')
      .eq('user_id', user.id)
      .single();

    if (data) {
      setOrganizationId(data.organization_id);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.subject || !formData.preferred_date || !formData.preferred_time) {
      toast.error('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    if (!organizationId) {
      toast.error('حدث خطأ. يرجى تحديث الصفحة والمحاولة مرة أخرى');
      return;
    }

    setLoading(true);

    try {
      const preferredDateTime = new Date(`${formData.preferred_date}T${formData.preferred_time}`);
      let alternativeDateTime = null;
      
      if (formData.alternative_date && formData.alternative_time) {
        alternativeDateTime = new Date(`${formData.alternative_date}T${formData.alternative_time}`);
      }

      const { error } = await supabase
        .from('meeting_requests')
        .insert({
          organization_id: organizationId,
          requested_by: user?.id,
          meeting_type: formData.meeting_type,
          subject: formData.subject,
          description: formData.description || null,
          preferred_date: preferredDateTime.toISOString(),
          alternative_date: alternativeDateTime?.toISOString() || null,
          duration_minutes: formData.duration_minutes,
          status: 'pending'
        });

      if (error) throw error;

      toast.success('تم إرسال طلب الاجتماع بنجاح');
      navigate('/portal/meetings');
    } catch (error) {
      console.error('Error creating meeting request:', error);
      toast.error('حدث خطأ أثناء إرسال الطلب');
    } finally {
      setLoading(false);
    }
  };

  // Get minimum date (tomorrow)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = format(tomorrow, 'yyyy-MM-dd');

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Button variant="ghost" asChild className="mb-4 gap-2">
          <Link to="/portal/meetings">
            <ArrowRight className="w-4 h-4" />
            العودة للاجتماعات
          </Link>
        </Button>
        <h1 className="text-2xl lg:text-3xl font-bold text-foreground flex items-center gap-3">
          <Calendar className="w-8 h-8 text-primary" />
          طلب اجتماع جديد
        </h1>
        <p className="text-muted-foreground mt-1">حدد موعداً مناسباً للاجتماع مع فريق ويبيان</p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardContent className="p-6 space-y-6">
            {/* Meeting Type */}
            <div className="space-y-2">
              <Label>نوع الاجتماع</Label>
              <Select 
                value={formData.meeting_type}
                onValueChange={(value) => setFormData({ ...formData, meeting_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {meetingTypes.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      <div>
                        <span className="font-medium">{type.label}</span>
                        <span className="text-muted-foreground text-sm mr-2">- {type.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Subject */}
            <div className="space-y-2">
              <Label htmlFor="subject">موضوع الاجتماع *</Label>
              <Input
                id="subject"
                placeholder="مثال: تدريب على لوحة التحكم"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">تفاصيل إضافية (اختياري)</Label>
              <Textarea
                id="description"
                placeholder="اكتب أي تفاصيل أو أسئلة تريد مناقشتها..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
              />
            </div>

            {/* Preferred Date & Time */}
            <div className="space-y-4">
              <Label className="text-base font-semibold">الموعد المفضل *</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="preferred_date" className="text-sm">التاريخ</Label>
                  <Input
                    id="preferred_date"
                    type="date"
                    min={minDate}
                    value={formData.preferred_date}
                    onChange={(e) => setFormData({ ...formData, preferred_date: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="preferred_time" className="text-sm">الوقت</Label>
                  <Input
                    id="preferred_time"
                    type="time"
                    value={formData.preferred_time}
                    onChange={(e) => setFormData({ ...formData, preferred_time: e.target.value })}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Alternative Date & Time */}
            <div className="space-y-4">
              <Label className="text-base font-semibold">موعد بديل (اختياري)</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="alternative_date" className="text-sm">التاريخ</Label>
                  <Input
                    id="alternative_date"
                    type="date"
                    min={minDate}
                    value={formData.alternative_date}
                    onChange={(e) => setFormData({ ...formData, alternative_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="alternative_time" className="text-sm">الوقت</Label>
                  <Input
                    id="alternative_time"
                    type="time"
                    value={formData.alternative_time}
                    onChange={(e) => setFormData({ ...formData, alternative_time: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Duration */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                مدة الاجتماع
              </Label>
              <Select 
                value={formData.duration_minutes.toString()}
                onValueChange={(value) => setFormData({ ...formData, duration_minutes: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {durations.map(d => (
                    <SelectItem key={d.value} value={d.value.toString()}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Submit */}
            <div className="flex justify-end gap-4 pt-4">
              <Button type="button" variant="outline" onClick={() => navigate('/portal/meetings')}>
                إلغاء
              </Button>
              <Button type="submit" disabled={loading} className="gap-2">
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                إرسال الطلب
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
};

export default PortalNewMeeting;
