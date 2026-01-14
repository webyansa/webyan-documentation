import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { 
  Ticket, 
  Send,
  CheckCircle2,
  AlertCircle,
  Loader2,
  HelpCircle,
  Monitor,
  CreditCard,
  Sparkles,
  GraduationCap,
  MoreHorizontal,
  AlertTriangle,
  Clock,
  Zap,
  Flame
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Organization {
  id: string;
  name: string;
  logo_url?: string;
  contact_email?: string;
}

const categories = [
  { value: 'technical', label: 'مشكلة تقنية', icon: Monitor, color: 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100' },
  { value: 'billing', label: 'الفواتير', icon: CreditCard, color: 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100' },
  { value: 'feature', label: 'طلب ميزة', icon: Sparkles, color: 'bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100' },
  { value: 'training', label: 'التدريب', icon: GraduationCap, color: 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100' },
  { value: 'other', label: 'أخرى', icon: MoreHorizontal, color: 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100' },
];

const priorities = [
  { value: 'low', label: 'منخفضة', icon: Clock, color: 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100', description: 'يمكن الانتظار' },
  { value: 'medium', label: 'متوسطة', icon: AlertTriangle, color: 'bg-yellow-50 border-yellow-200 text-yellow-700 hover:bg-yellow-100', description: 'يحتاج حل قريب' },
  { value: 'high', label: 'عالية', icon: Zap, color: 'bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100', description: 'يؤثر على العمل' },
  { value: 'urgent', label: 'عاجلة', icon: Flame, color: 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100', description: 'توقف كامل' },
];

const EmbedTicketPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [ticketNumber, setTicketNumber] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  
  const [formData, setFormData] = useState({
    subject: '',
    description: '',
    category: 'technical',
    priority: 'medium',
    contactName: '',
    contactEmail: '',
    websiteUrl: ''
  });

  useEffect(() => {
    verifyToken();
  }, [token]);

  const verifyToken = async () => {
    if (!token) {
      setError('رمز التضمين مفقود');
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('verify-embed-token', {
        body: { token },
        headers: {
          'x-embed-origin': window.location.origin
        }
      });

      if (error || !data?.valid) {
        setError(data?.error || 'رمز التضمين غير صالح أو منتهي الصلاحية');
        setLoading(false);
        return;
      }

      setOrganization(data.organization);
      setLoading(false);
    } catch (err) {
      console.error('Token verification error:', err);
      setError('حدث خطأ في التحقق من الرمز');
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.subject.trim() || !formData.description.trim()) {
      toast.error('يرجى ملء الحقول المطلوبة');
      return;
    }

    setSubmitting(true);

    try {
      const { data, error } = await supabase.functions.invoke('create-embed-ticket', {
        body: {
          token,
          ...formData
        },
        headers: {
          'x-embed-origin': window.location.origin
        }
      });

      if (error || !data?.success) {
        throw new Error(data?.error || 'فشل في إنشاء التذكرة');
      }

      setTicketNumber(data.ticketNumber);
      setSubmitted(true);
    } catch (err: any) {
      console.error('Submit error:', err);
      toast.error(err.message || 'حدث خطأ أثناء إرسال التذكرة');
    } finally {
      setSubmitting(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4" dir="rtl">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">جاري التحقق...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 p-4" dir="rtl">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center border border-red-100">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">رمز غير صالح</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="p-4 bg-gray-50 rounded-xl text-sm text-gray-500">
            <p>إذا كنت تعتقد أن هذا خطأ، يرجى التواصل مع مسؤول النظام.</p>
          </div>
        </div>
      </div>
    );
  }

  // Success state
  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-50 p-4" dir="rtl">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center border border-green-100">
          <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
            <CheckCircle2 className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">تم إرسال التذكرة بنجاح!</h2>
          <p className="text-gray-600 mb-6">سيتم التواصل معك في أقرب وقت ممكن</p>
          
          <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl p-6 mb-6 border border-primary/20">
            <p className="text-sm text-gray-500 mb-2">رقم التذكرة</p>
            <p className="text-2xl font-bold font-mono text-primary">{ticketNumber}</p>
          </div>

          <p className="text-sm text-gray-500">
            احتفظ برقم التذكرة للمتابعة
          </p>
        </div>
      </div>
    );
  }

  // Form state
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 p-4 md:p-6" dir="rtl">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
          <div className="flex items-center gap-4">
            {organization?.logo_url ? (
              <img src={organization.logo_url} alt={organization.name} className="w-14 h-14 rounded-xl object-cover" />
            ) : (
              <div className="w-14 h-14 bg-gradient-to-br from-primary to-primary/80 rounded-xl flex items-center justify-center">
                <Ticket className="w-7 h-7 text-white" />
              </div>
            )}
            <div>
              <h1 className="text-xl font-bold text-gray-900">فتح تذكرة دعم</h1>
              <p className="text-sm text-gray-500">{organization?.name || 'مركز الدعم'}</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 space-y-6">
            {/* Contact Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contactName" className="text-gray-700 font-medium">الاسم</Label>
                <Input
                  id="contactName"
                  placeholder="اسمك الكريم"
                  value={formData.contactName}
                  onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                  className="h-12 rounded-xl border-slate-200 focus:border-primary focus:ring-primary"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactEmail" className="text-gray-700 font-medium">البريد الإلكتروني</Label>
                <Input
                  id="contactEmail"
                  type="email"
                  placeholder="example@domain.com"
                  value={formData.contactEmail}
                  onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                  className="h-12 rounded-xl border-slate-200 focus:border-primary focus:ring-primary"
                  dir="ltr"
                />
              </div>
            </div>

            {/* Subject */}
            <div className="space-y-2">
              <Label htmlFor="subject" className="text-gray-700 font-medium">
                عنوان المشكلة <span className="text-red-500">*</span>
              </Label>
              <Input
                id="subject"
                placeholder="اكتب عنواناً مختصراً يصف المشكلة"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                required
                className="h-12 rounded-xl border-slate-200 focus:border-primary focus:ring-primary"
              />
            </div>

            {/* Category */}
            <div className="space-y-3">
              <Label className="text-gray-700 font-medium">نوع المشكلة</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, category: cat.value })}
                    className={cn(
                      "flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all duration-200",
                      formData.category === cat.value
                        ? cat.color + " border-current ring-2 ring-current/20"
                        : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                    )}
                  >
                    <cat.icon className="w-5 h-5" />
                    <span className="text-xs font-medium">{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Priority */}
            <div className="space-y-3">
              <Label className="text-gray-700 font-medium">الأولوية</Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {priorities.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, priority: p.value })}
                    className={cn(
                      "flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all duration-200",
                      formData.priority === p.value
                        ? p.color + " border-current ring-2 ring-current/20"
                        : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                    )}
                  >
                    <p.icon className="w-5 h-5" />
                    <span className="text-xs font-medium">{p.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Website URL */}
            <div className="space-y-2">
              <Label htmlFor="websiteUrl" className="text-gray-700 font-medium">رابط الصفحة (اختياري)</Label>
              <Input
                id="websiteUrl"
                type="url"
                placeholder="https://example.com/page"
                value={formData.websiteUrl}
                onChange={(e) => setFormData({ ...formData, websiteUrl: e.target.value })}
                className="h-12 rounded-xl border-slate-200 focus:border-primary focus:ring-primary"
                dir="ltr"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-gray-700 font-medium">
                وصف المشكلة <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="description"
                placeholder="اشرح المشكلة بالتفصيل... ما الذي حدث؟ ما الخطوات التي قمت بها؟"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={5}
                required
                className="rounded-xl border-slate-200 focus:border-primary focus:ring-primary resize-none"
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="bg-slate-50 border-t border-slate-200 p-6">
            <Button 
              type="submit" 
              disabled={submitting}
              className="w-full h-14 text-lg font-semibold rounded-xl bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg shadow-primary/25 transition-all duration-200"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 ml-2 animate-spin" />
                  جاري الإرسال...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5 ml-2" />
                  إرسال التذكرة
                </>
              )}
            </Button>
          </div>
        </form>

        {/* Footer */}
        <div className="text-center mt-6 text-sm text-gray-500">
          <p>مركز دعم ويبيان - نحن هنا لمساعدتك</p>
        </div>
      </div>
    </div>
  );
};

export default EmbedTicketPage;
