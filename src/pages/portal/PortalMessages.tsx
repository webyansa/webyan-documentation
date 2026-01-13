import { useState } from 'react';
import { 
  MessageSquare, 
  Send,
  Headphones
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const PortalMessages = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    subject: '',
    message: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.subject || !formData.message) {
      toast.error('يرجى ملء جميع الحقول');
      return;
    }

    setLoading(true);
    try {
      // Create as a ticket with "inquiry" category
      const ticketNumber = 'TKT-' + Math.floor(100000 + Math.random() * 900000);
      
      const { error } = await supabase
        .from('support_tickets')
        .insert({
          user_id: user?.id,
          ticket_number: ticketNumber,
          subject: formData.subject,
          description: formData.message,
          category: 'other',
          priority: 'low',
          status: 'open'
        });

      if (error) throw error;

      toast.success('تم إرسال رسالتك بنجاح! سنتواصل معك قريباً');
      setFormData({ subject: '', message: '' });
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('حدث خطأ أثناء إرسال الرسالة');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-foreground flex items-center gap-3">
          <MessageSquare className="w-8 h-8 text-primary" />
          تواصل معنا
        </h1>
        <p className="text-muted-foreground mt-1">أرسل استفساراتك وسنرد عليك في أقرب وقت</p>
      </div>

      {/* Contact Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Headphones className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">الدعم الفني</h3>
              <p className="text-sm text-muted-foreground">support@webyan.net</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <MessageSquare className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">وقت الاستجابة</h3>
              <p className="text-sm text-muted-foreground">خلال 24-48 ساعة عمل</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Message Form */}
      <Card>
        <CardHeader>
          <CardTitle>أرسل رسالة</CardTitle>
          <CardDescription>للاستفسارات العامة أو الاقتراحات</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="subject">الموضوع *</Label>
              <Input
                id="subject"
                placeholder="موضوع الرسالة"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">الرسالة *</Label>
              <Textarea
                id="message"
                placeholder="اكتب رسالتك هنا..."
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                rows={6}
                required
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full gap-2">
              {loading ? (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              إرسال الرسالة
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default PortalMessages;
