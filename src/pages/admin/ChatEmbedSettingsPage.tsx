import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  Code2, Copy, Check, Plus, Trash2, RefreshCw, Globe, Calendar, 
  Eye, EyeOff, AlertCircle, ExternalLink, FileCode, Loader2, 
  Shield, Clock, Activity, HelpCircle, Building2, MessageCircle,
  Palette, MessageSquare, Sparkles
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface EmbedToken {
  id: string;
  organization_id: string;
  token: string;
  name: string;
  allowed_domains: string[];
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
  usage_count: number;
  last_used_at: string | null;
  welcome_message?: string;
  default_message?: string;
  primary_color?: string;
  secondary_color?: string;
  organization?: { id: string; name: string };
}

interface Organization {
  id: string;
  name: string;
}

// Professional preset welcome messages
const welcomePresets = [
  { label: 'ترحيب ودي', text: 'مرحباً بك! 👋 يسعدنا التواصل معك. فريق الدعم الفني جاهز لمساعدتك.' },
  { label: 'ترحيب رسمي', text: 'أهلاً وسهلاً بك في خدمة الدعم الفني. نحن هنا لمساعدتك في أي استفسار.' },
  { label: 'ترحيب حماسي', text: '🌟 مرحباً! نحن متحمسون لمساعدتك. فريقنا المتميز جاهز للإجابة على جميع استفساراتك!' },
  { label: 'ترحيب مختصر', text: 'مرحباً! كيف يمكننا مساعدتك اليوم؟' },
];

const defaultMessagePresets = [
  { label: 'استفسار عام', text: 'مرحباً، أحتاج المساعدة بخصوص...' },
  { label: 'مشكلة تقنية', text: 'مرحباً، أواجه مشكلة تقنية وأحتاج مساعدتكم في حلها.' },
  { label: 'استفسار حول الخدمات', text: 'مرحباً، أريد الاستفسار عن الخدمات المتاحة والأسعار.' },
  { label: 'متابعة طلب', text: 'مرحباً، أريد متابعة طلب سابق رقم...' },
  { label: 'اقتراح أو شكوى', text: 'مرحباً، لدي اقتراح/ملاحظة أود مشاركتها معكم.' },
];

export default function ChatEmbedSettingsPage() {
  const [tokens, setTokens] = useState<EmbedToken[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [selectedToken, setSelectedToken] = useState<EmbedToken | null>(null);
  const [activeTab, setActiveTab] = useState('codes');
  
  const [newToken, setNewToken] = useState({
    name: '',
    organization_id: '',
    allowed_domains: '',
    expires_days: '0',
    allow_any_domain: true,
    welcome_message: welcomePresets[0].text,
    default_message: defaultMessagePresets[0].text,
    primary_color: '#263c84',
    secondary_color: '#24c2ec'
  });

  // Edit state for selected token
  const [editSettings, setEditSettings] = useState({
    welcome_message: '',
    default_message: '',
    primary_color: '#263c84',
    secondary_color: '#24c2ec'
  });

  const baseUrl = window.location.origin;

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedToken) {
      setEditSettings({
        welcome_message: selectedToken.welcome_message || welcomePresets[0].text,
        default_message: selectedToken.default_message || defaultMessagePresets[0].text,
        primary_color: selectedToken.primary_color || '#263c84',
        secondary_color: selectedToken.secondary_color || '#24c2ec'
      });
    }
  }, [selectedToken]);

  const fetchData = async () => {
    try {
      const [tokensRes, orgsRes] = await Promise.all([
        supabase
          .from('embed_tokens')
          .select('*, organization:client_organizations(id, name)')
          .order('created_at', { ascending: false }),
        supabase
          .from('client_organizations')
          .select('id, name')
          .eq('is_active', true)
          .order('name')
      ]);

      if (tokensRes.data) setTokens(tokensRes.data);
      if (orgsRes.data) setOrganizations(orgsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('فشل في تحميل البيانات');
    } finally {
      setLoading(false);
    }
  };

  const generateToken = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = 'chat_';
    for (let i = 0; i < 32; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
  };

  const handleCreateToken = async () => {
    if (!newToken.name || !newToken.organization_id) {
      toast.error('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    setCreating(true);
    try {
      const token = generateToken();
      const domains = newToken.allowed_domains
        .split(',')
        .map(d => d.trim())
        .filter(d => d);
      
      const expiresAt = newToken.expires_days !== '0' 
        ? new Date(Date.now() + parseInt(newToken.expires_days) * 24 * 60 * 60 * 1000).toISOString()
        : null;

      const { error } = await supabase
        .from('embed_tokens')
        .insert({
          token,
          name: newToken.name,
          organization_id: newToken.organization_id,
          allowed_domains: domains,
          expires_at: expiresAt,
          is_active: true,
          welcome_message: newToken.welcome_message,
          default_message: newToken.default_message,
          primary_color: newToken.primary_color,
          secondary_color: newToken.secondary_color
        });

      if (error) throw error;

      toast.success('تم إنشاء رمز تضمين الدردشة بنجاح');
      setShowCreateDialog(false);
      setNewToken({ 
        name: '', 
        organization_id: '', 
        allowed_domains: '', 
        expires_days: '0', 
        allow_any_domain: true,
        welcome_message: welcomePresets[0].text,
        default_message: defaultMessagePresets[0].text,
        primary_color: '#263c84',
        secondary_color: '#24c2ec'
      });
      fetchData();
    } catch (error) {
      console.error('Error creating token:', error);
      toast.error('فشل في إنشاء الرمز');
    } finally {
      setCreating(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!selectedToken) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('embed_tokens')
        .update({
          welcome_message: editSettings.welcome_message,
          default_message: editSettings.default_message,
          primary_color: editSettings.primary_color,
          secondary_color: editSettings.secondary_color
        })
        .eq('id', selectedToken.id);

      if (error) throw error;

      toast.success('تم حفظ الإعدادات بنجاح');
      
      // Update local state
      setSelectedToken({
        ...selectedToken,
        welcome_message: editSettings.welcome_message,
        default_message: editSettings.default_message,
        primary_color: editSettings.primary_color,
        secondary_color: editSettings.secondary_color
      });
      fetchData();
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('فشل في حفظ الإعدادات');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (token: EmbedToken) => {
    try {
      const { error } = await supabase
        .from('embed_tokens')
        .update({ is_active: !token.is_active })
        .eq('id', token.id);

      if (error) throw error;
      toast.success(token.is_active ? 'تم تعطيل الرمز' : 'تم تفعيل الرمز');
      fetchData();
    } catch (error) {
      toast.error('فشل في تحديث الرمز');
    }
  };

  const handleDeleteToken = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الرمز؟')) return;

    try {
      const { error } = await supabase.from('embed_tokens').delete().eq('id', id);
      if (error) throw error;

      toast.success('تم حذف الرمز بنجاح');
      setSelectedToken(null);
      fetchData();
    } catch (error) {
      toast.error('فشل في حذف الرمز');
    }
  };

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
      toast.success('تم النسخ');
    } catch (err) {
      toast.error('فشل في النسخ');
    }
  };

  const getChatEmbedUrl = (token: string) => `${baseUrl}/embed/chat?token=${token}`;

  const getFloatingButtonCode = (token: string) => 
`<!-- Webyan Chat Widget - Floating Button (مثل Intercom) -->
<style>
#webyan-chat-btn{position:fixed;bottom:24px;right:24px;z-index:999999;width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,#10b981 0%,#059669 100%);color:#fff;border:none;cursor:pointer;box-shadow:0 8px 32px rgba(16,185,129,0.4);display:flex;align-items:center;justify-content:center;transition:all .3s cubic-bezier(.4,0,.2,1);animation:webyan-chat-pulse 2s infinite}
#webyan-chat-btn:hover{transform:scale(1.1) translateY(-2px);box-shadow:0 12px 40px rgba(16,185,129,0.5)}
#webyan-chat-btn svg{width:28px;height:28px;transition:transform .3s}
#webyan-chat-btn.open svg{transform:rotate(90deg)}
@keyframes webyan-chat-pulse{0%,100%{box-shadow:0 8px 32px rgba(16,185,129,0.4)}50%{box-shadow:0 8px 48px rgba(16,185,129,0.6)}}
#webyan-chat-popup{position:fixed;bottom:100px;right:24px;z-index:999998;width:400px;max-width:calc(100vw - 48px);height:600px;max-height:calc(100vh - 140px);background:#fff;border-radius:20px;box-shadow:0 25px 80px rgba(0,0,0,0.2);opacity:0;visibility:hidden;transform:translateY(20px) scale(0.95);transition:all .3s cubic-bezier(.4,0,.2,1);overflow:hidden}
#webyan-chat-popup.open{opacity:1;visibility:visible;transform:translateY(0) scale(1)}
#webyan-chat-popup iframe{width:100%;height:100%;border:none}
@media(max-width:480px){#webyan-chat-popup{width:100%;height:100%;max-height:100vh;bottom:0;right:0;left:0;border-radius:0}#webyan-chat-btn{bottom:16px;right:16px}}
</style>
<button id="webyan-chat-btn" onclick="webyanChatToggle()">
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
  </svg>
</button>
<div id="webyan-chat-popup">
  <iframe src="${getChatEmbedUrl(token)}" allow="clipboard-write"></iframe>
</div>
<script>
var webyanChatOpen=false;
function webyanChatToggle(){
  webyanChatOpen=!webyanChatOpen;
  var btn=document.getElementById('webyan-chat-btn');
  var popup=document.getElementById('webyan-chat-popup');
  popup.classList.toggle('open',webyanChatOpen);
  btn.classList.toggle('open',webyanChatOpen);
  btn.innerHTML=webyanChatOpen?'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>':'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>';
}
document.addEventListener('click',function(e){if(!e.target.closest('#webyan-chat-btn')&&!e.target.closest('#webyan-chat-popup')&&webyanChatOpen){webyanChatToggle();}});
window.addEventListener('message',function(e){
  if(e.data.type==='WEBYAN_CHAT_OPENED'){webyanChatOpen=true;}
  if(e.data.type==='WEBYAN_CHAT_CLOSED'){webyanChatOpen=false;}
});
</script>`;

  const getInlineCode = (token: string) => 
`<!-- Webyan Chat Widget - Inline Embed -->
<div id="webyan-chat-widget"></div>
<script>
(function() {
  var container = document.getElementById('webyan-chat-widget');
  var iframe = document.createElement('iframe');
  iframe.src = '${getChatEmbedUrl(token)}';
  iframe.style.cssText = 'width:100%;height:600px;border:none;border-radius:16px;box-shadow:0 4px 20px rgba(0,0,0,0.08);';
  iframe.allow = 'clipboard-write';
  container.appendChild(iframe);
})();
</script>`;

  const getIframeCode = (token: string) => 
`<iframe
  src="${getChatEmbedUrl(token)}"
  width="100%"
  height="600"
  frameborder="0"
  style="border: none; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);"
  allow="clipboard-write"
></iframe>`;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <MessageCircle className="w-7 h-7 text-green-600" />
            تضمين الدردشة المباشرة
          </h1>
          <p className="text-muted-foreground mt-1">
            أنشئ رموز تضمين لإضافة نافذة الدردشة المباشرة في مواقع العملاء الخارجية
          </p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              إنشاء رمز جديد
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>إنشاء رمز تضمين دردشة جديد</DialogTitle>
            </DialogHeader>
            <div className="space-y-6 py-4">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>اسم الرمز *</Label>
                  <Input
                    placeholder="مثال: موقع الجمعية الرئيسي"
                    value={newToken.name}
                    onChange={(e) => setNewToken({ ...newToken, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>المنظمة *</Label>
                  <Select 
                    value={newToken.organization_id}
                    onValueChange={(value) => setNewToken({ ...newToken, organization_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر المنظمة" />
                    </SelectTrigger>
                    <SelectContent>
                      {organizations.map(org => (
                        <SelectItem key={org.id} value={org.id}>
                          {org.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              {/* Welcome Message */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-cyan-500" />
                  رسالة الترحيب
                </Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {welcomePresets.map((preset, idx) => (
                    <Badge
                      key={idx}
                      variant={newToken.welcome_message === preset.text ? 'default' : 'outline'}
                      className="cursor-pointer hover:bg-primary/10"
                      onClick={() => setNewToken({ ...newToken, welcome_message: preset.text })}
                    >
                      {preset.label}
                    </Badge>
                  ))}
                </div>
                <Textarea
                  value={newToken.welcome_message}
                  onChange={(e) => setNewToken({ ...newToken, welcome_message: e.target.value })}
                  rows={2}
                  className="resize-none"
                />
              </div>

              {/* Default Message */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-cyan-500" />
                  رسالة البدء الافتراضية
                </Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {defaultMessagePresets.map((preset, idx) => (
                    <Badge
                      key={idx}
                      variant={newToken.default_message === preset.text ? 'default' : 'outline'}
                      className="cursor-pointer hover:bg-primary/10"
                      onClick={() => setNewToken({ ...newToken, default_message: preset.text })}
                    >
                      {preset.label}
                    </Badge>
                  ))}
                </div>
                <Textarea
                  value={newToken.default_message}
                  onChange={(e) => setNewToken({ ...newToken, default_message: e.target.value })}
                  rows={2}
                  className="resize-none"
                />
              </div>

              <Separator />

              {/* Colors */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <Palette className="w-4 h-4 text-cyan-500" />
                  ألوان العلامة التجارية
                </Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">اللون الأساسي</Label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={newToken.primary_color}
                        onChange={(e) => setNewToken({ ...newToken, primary_color: e.target.value })}
                        className="h-10 w-14 rounded border cursor-pointer"
                      />
                      <Input
                        value={newToken.primary_color}
                        onChange={(e) => setNewToken({ ...newToken, primary_color: e.target.value })}
                        className="flex-1"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">اللون الثانوي</Label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={newToken.secondary_color}
                        onChange={(e) => setNewToken({ ...newToken, secondary_color: e.target.value })}
                        className="h-10 w-14 rounded border cursor-pointer"
                      />
                      <Input
                        value={newToken.secondary_color}
                        onChange={(e) => setNewToken({ ...newToken, secondary_color: e.target.value })}
                        className="flex-1"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Domain Settings */}
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Globe className="w-5 h-5 text-primary" />
                    <div>
                      <Label className="text-sm font-medium">السماح من أي نطاق</Label>
                      <p className="text-xs text-muted-foreground">تمكين التضمين من أي موقع</p>
                    </div>
                  </div>
                  <Switch
                    checked={newToken.allow_any_domain}
                    onCheckedChange={(checked) => setNewToken({ 
                      ...newToken, 
                      allow_any_domain: checked,
                      allowed_domains: checked ? '' : newToken.allowed_domains 
                    })}
                  />
                </div>
                
                {!newToken.allow_any_domain && (
                  <div className="space-y-2">
                    <Label>النطاقات المسموحة</Label>
                    <Input
                      placeholder="example.com, *.example.org"
                      value={newToken.allowed_domains}
                      onChange={(e) => setNewToken({ ...newToken, allowed_domains: e.target.value })}
                    />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>مدة الصلاحية</Label>
                <Select 
                  value={newToken.expires_days}
                  onValueChange={(value) => setNewToken({ ...newToken, expires_days: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">بدون انتهاء</SelectItem>
                    <SelectItem value="30">شهر</SelectItem>
                    <SelectItem value="90">3 أشهر</SelectItem>
                    <SelectItem value="365">سنة</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>إلغاء</Button>
              <Button onClick={handleCreateToken} disabled={creating}>
                {creating && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
                إنشاء الرمز
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tokens List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">رموز التضمين</CardTitle>
              <CardDescription>اختر رمزاً لعرض الإعدادات والأكواد</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[500px]">
                {tokens.length === 0 ? (
                  <div className="p-6 text-center text-muted-foreground">
                    <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-20" />
                    <p>لا توجد رموز تضمين</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {tokens.filter(t => t.token.startsWith('chat_')).map((token) => (
                      <div
                        key={token.id}
                        onClick={() => setSelectedToken(token)}
                        className={`p-4 cursor-pointer hover:bg-muted/50 transition-colors ${
                          selectedToken?.id === token.id ? 'bg-primary/5 border-r-2 border-r-primary' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-sm">{token.name}</span>
                          <Badge variant={token.is_active ? 'default' : 'secondary'} className="text-[10px]">
                            {token.is_active ? 'مفعّل' : 'معطّل'}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {token.organization?.name}
                        </p>
                        <div className="flex items-center gap-2 mt-2 text-[10px] text-muted-foreground">
                          <Activity className="h-3 w-3" />
                          <span>{token.usage_count} استخدام</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Settings & Code Display */}
        <div className="lg:col-span-2">
          {selectedToken ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">{selectedToken.name}</CardTitle>
                    <CardDescription>{selectedToken.organization?.name}</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={selectedToken.is_active}
                      onCheckedChange={() => handleToggleActive(selectedToken)}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      onClick={() => handleDeleteToken(selectedToken.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                  <TabsList className="grid grid-cols-4">
                    <TabsTrigger value="codes">أكواد التضمين</TabsTrigger>
                    <TabsTrigger value="messages">الرسائل</TabsTrigger>
                    <TabsTrigger value="colors">الألوان</TabsTrigger>
                    <TabsTrigger value="preview">معاينة</TabsTrigger>
                  </TabsList>

                  {/* Embed Codes Tab */}
                  <TabsContent value="codes" className="space-y-4">
                    <Tabs defaultValue="floating">
                      <TabsList className="grid grid-cols-3 w-full">
                        <TabsTrigger value="floating">زر عائم</TabsTrigger>
                        <TabsTrigger value="inline">تضمين مباشر</TabsTrigger>
                        <TabsTrigger value="iframe">iFrame</TabsTrigger>
                      </TabsList>

                      <TabsContent value="floating" className="space-y-4 mt-4">
                        <Alert>
                          <MessageCircle className="h-4 w-4" />
                          <AlertDescription>
                            زر دردشة عائم مثل Intercom - يظهر في زاوية الشاشة
                          </AlertDescription>
                        </Alert>
                        <div className="relative">
                          <pre className="bg-muted p-4 rounded-lg text-xs overflow-auto max-h-60 text-left" dir="ltr">
                            {getFloatingButtonCode(selectedToken.token)}
                          </pre>
                          <Button
                            variant="secondary"
                            size="sm"
                            className="absolute top-2 left-2"
                            onClick={() => copyToClipboard(getFloatingButtonCode(selectedToken.token), 'floating')}
                          >
                            {copiedField === 'floating' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                          </Button>
                        </div>
                      </TabsContent>

                      <TabsContent value="inline" className="space-y-4 mt-4">
                        <Alert>
                          <Code2 className="h-4 w-4" />
                          <AlertDescription>
                            تضمين نافذة الدردشة داخل صفحة معينة
                          </AlertDescription>
                        </Alert>
                        <div className="relative">
                          <pre className="bg-muted p-4 rounded-lg text-xs overflow-auto max-h-40 text-left" dir="ltr">
                            {getInlineCode(selectedToken.token)}
                          </pre>
                          <Button
                            variant="secondary"
                            size="sm"
                            className="absolute top-2 left-2"
                            onClick={() => copyToClipboard(getInlineCode(selectedToken.token), 'inline')}
                          >
                            {copiedField === 'inline' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                          </Button>
                        </div>
                      </TabsContent>

                      <TabsContent value="iframe" className="space-y-4 mt-4">
                        <div className="relative">
                          <pre className="bg-muted p-4 rounded-lg text-xs overflow-auto max-h-32 text-left" dir="ltr">
                            {getIframeCode(selectedToken.token)}
                          </pre>
                          <Button
                            variant="secondary"
                            size="sm"
                            className="absolute top-2 left-2"
                            onClick={() => copyToClipboard(getIframeCode(selectedToken.token), 'iframe')}
                          >
                            {copiedField === 'iframe' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                          </Button>
                        </div>
                      </TabsContent>
                    </Tabs>

                    <Separator className="my-4" />

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">رابط التضمين المباشر:</span>
                      <div className="flex items-center gap-2">
                        <code className="bg-muted px-2 py-1 rounded text-xs max-w-48 truncate">
                          {getChatEmbedUrl(selectedToken.token)}
                        </code>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => copyToClipboard(getChatEmbedUrl(selectedToken.token), 'url')}
                        >
                          {copiedField === 'url' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => window.open(getChatEmbedUrl(selectedToken.token), '_blank')}
                        >
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </TabsContent>

                  {/* Messages Tab */}
                  <TabsContent value="messages" className="space-y-6">
                    <div className="space-y-3">
                      <Label className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-cyan-500" />
                        رسالة الترحيب
                      </Label>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {welcomePresets.map((preset, idx) => (
                          <Badge
                            key={idx}
                            variant={editSettings.welcome_message === preset.text ? 'default' : 'outline'}
                            className="cursor-pointer hover:bg-primary/10"
                            onClick={() => setEditSettings({ ...editSettings, welcome_message: preset.text })}
                          >
                            {preset.label}
                          </Badge>
                        ))}
                      </div>
                      <Textarea
                        value={editSettings.welcome_message}
                        onChange={(e) => setEditSettings({ ...editSettings, welcome_message: e.target.value })}
                        rows={3}
                        className="resize-none"
                      />
                    </div>

                    <div className="space-y-3">
                      <Label className="flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-cyan-500" />
                        رسالة البدء الافتراضية
                      </Label>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {defaultMessagePresets.map((preset, idx) => (
                          <Badge
                            key={idx}
                            variant={editSettings.default_message === preset.text ? 'default' : 'outline'}
                            className="cursor-pointer hover:bg-primary/10"
                            onClick={() => setEditSettings({ ...editSettings, default_message: preset.text })}
                          >
                            {preset.label}
                          </Badge>
                        ))}
                      </div>
                      <Textarea
                        value={editSettings.default_message}
                        onChange={(e) => setEditSettings({ ...editSettings, default_message: e.target.value })}
                        rows={2}
                        className="resize-none"
                      />
                    </div>

                    <Button onClick={handleSaveSettings} disabled={saving} className="w-full">
                      {saving && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
                      حفظ الرسائل
                    </Button>
                  </TabsContent>

                  {/* Colors Tab */}
                  <TabsContent value="colors" className="space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <Label>اللون الأساسي</Label>
                        <div className="flex gap-2">
                          <input
                            type="color"
                            value={editSettings.primary_color}
                            onChange={(e) => setEditSettings({ ...editSettings, primary_color: e.target.value })}
                            className="h-12 w-16 rounded border cursor-pointer"
                          />
                          <Input
                            value={editSettings.primary_color}
                            onChange={(e) => setEditSettings({ ...editSettings, primary_color: e.target.value })}
                            className="flex-1"
                          />
                        </div>
                      </div>
                      <div className="space-y-3">
                        <Label>اللون الثانوي</Label>
                        <div className="flex gap-2">
                          <input
                            type="color"
                            value={editSettings.secondary_color}
                            onChange={(e) => setEditSettings({ ...editSettings, secondary_color: e.target.value })}
                            className="h-12 w-16 rounded border cursor-pointer"
                          />
                          <Input
                            value={editSettings.secondary_color}
                            onChange={(e) => setEditSettings({ ...editSettings, secondary_color: e.target.value })}
                            className="flex-1"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Color Preview */}
                    <div 
                      className="p-6 rounded-xl text-white"
                      style={{ background: `linear-gradient(135deg, ${editSettings.primary_color} 0%, ${editSettings.secondary_color} 100%)` }}
                    >
                      <p className="font-bold text-lg mb-1">معاينة الألوان</p>
                      <p className="text-sm opacity-90">هكذا ستظهر ألوان نافذة الدردشة</p>
                    </div>

                    <Button onClick={handleSaveSettings} disabled={saving} className="w-full">
                      {saving && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
                      حفظ الألوان
                    </Button>
                  </TabsContent>

                  {/* Preview Tab */}
                  <TabsContent value="preview" className="space-y-4">
                    <Alert>
                      <Eye className="h-4 w-4" />
                      <AlertDescription>
                        معاينة مباشرة لنافذة الدردشة كما ستظهر للعملاء
                      </AlertDescription>
                    </Alert>
                    <div className="border rounded-xl overflow-hidden h-[500px]">
                      <iframe
                        src={getChatEmbedUrl(selectedToken.token)}
                        className="w-full h-full"
                        title="Chat Preview"
                      />
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          ) : (
            <Card className="h-full flex items-center justify-center min-h-[400px]">
              <div className="text-center p-6">
                <MessageCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-30" />
                <p className="text-muted-foreground">اختر رمزاً من القائمة لعرض الإعدادات والأكواد</p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
