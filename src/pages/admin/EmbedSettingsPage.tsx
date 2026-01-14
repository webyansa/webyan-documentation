import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  Code2, 
  Copy, 
  Check, 
  Plus, 
  Trash2, 
  RefreshCw,
  Globe,
  Calendar,
  Eye,
  EyeOff,
  AlertCircle,
  ExternalLink,
  FileCode,
  Loader2,
  Shield,
  Clock,
  Activity,
  HelpCircle,
  Building2
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
  organization?: {
    id: string;
    name: string;
  };
}

interface Organization {
  id: string;
  name: string;
}

const EmbedSettingsPage = () => {
  const [tokens, setTokens] = useState<EmbedToken[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [selectedToken, setSelectedToken] = useState<EmbedToken | null>(null);
  
  const [newToken, setNewToken] = useState({
    name: '',
    organization_id: '',
    allowed_domains: '',
    expires_days: '0'
  });

  const baseUrl = window.location.origin;

  useEffect(() => {
    fetchData();
  }, []);

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
    let token = 'emb_';
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
          is_active: true
        });

      if (error) throw error;

      toast.success('تم إنشاء رمز التضمين بنجاح');
      setShowCreateDialog(false);
      setNewToken({ name: '', organization_id: '', allowed_domains: '', expires_days: '0' });
      fetchData();
    } catch (error) {
      console.error('Error creating token:', error);
      toast.error('فشل في إنشاء الرمز');
    } finally {
      setCreating(false);
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
      const { error } = await supabase
        .from('embed_tokens')
        .delete()
        .eq('id', id);

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

  const getEmbedUrl = (token: string) => `${baseUrl}/embed/ticket?token=${token}`;

  const getIframeCode = (token: string) => 
`<iframe
  src="${getEmbedUrl(token)}"
  width="100%"
  height="700"
  frameborder="0"
  style="border: none; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);"
  allow="clipboard-write"
></iframe>`;

  const getWidgetCode = (token: string) => 
`<!-- Webyan Support Widget -->
<div id="webyan-support-widget"></div>
<script>
(function() {
  var container = document.getElementById('webyan-support-widget');
  var iframe = document.createElement('iframe');
  iframe.src = '${getEmbedUrl(token)}';
  iframe.style.cssText = 'width:100%;height:700px;border:none;border-radius:12px;box-shadow:0 4px 6px -1px rgba(0,0,0,0.1);';
  iframe.allow = 'clipboard-write';
  container.appendChild(iframe);
})();
</script>`;

  const getPopupCode = (token: string) =>
`<!-- Webyan Support Button -->
<style>
.webyan-btn{position:fixed;bottom:20px;right:20px;z-index:9999;width:60px;height:60px;border-radius:50%;background:linear-gradient(135deg,#3b82f6,#1d4ed8);color:#fff;border:none;cursor:pointer;box-shadow:0 4px 15px rgba(59,130,246,0.4);display:flex;align-items:center;justify-content:center;transition:transform .2s}
.webyan-btn:hover{transform:scale(1.1)}
.webyan-btn svg{width:28px;height:28px}
.webyan-modal{display:none;position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,0.5);align-items:center;justify-content:center;padding:20px}
.webyan-modal.open{display:flex}
.webyan-modal-content{background:#fff;border-radius:16px;width:100%;max-width:600px;max-height:90vh;overflow:hidden;position:relative}
.webyan-close{position:absolute;top:10px;left:10px;z-index:1;background:#f1f5f9;border:none;width:36px;height:36px;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center}
.webyan-modal iframe{width:100%;height:700px;border:none}
</style>
<button class="webyan-btn" onclick="document.getElementById('webyanModal').classList.add('open')">
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
</button>
<div id="webyanModal" class="webyan-modal" onclick="if(event.target===this)this.classList.remove('open')">
  <div class="webyan-modal-content">
    <button class="webyan-close" onclick="document.getElementById('webyanModal').classList.remove('open')">✕</button>
    <iframe src="${getEmbedUrl(token)}"></iframe>
  </div>
</div>`;

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
            <Code2 className="w-7 h-7 text-primary" />
            إعدادات التضمين
          </h1>
          <p className="text-muted-foreground mt-1">
            أنشئ رموز تضمين آمنة لإضافة نموذج فتح التذاكر في المواقع الخارجية
          </p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              إنشاء رمز جديد
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>إنشاء رمز تضمين جديد</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
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

              <div className="space-y-2">
                <Label>النطاقات المسموحة</Label>
                <Input
                  placeholder="example.com, *.example.org (افصل بفاصلة)"
                  value={newToken.allowed_domains}
                  onChange={(e) => setNewToken({ ...newToken, allowed_domains: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  اتركه فارغاً للسماح من أي نطاق، أو حدد نطاقات معينة. استخدم * للنطاقات الفرعية.
                </p>
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
                    <SelectItem value="7">أسبوع</SelectItem>
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
                إنشاء
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-blue-500 rounded-xl text-white">
              <Code2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-blue-600">إجمالي الرموز</p>
              <p className="text-2xl font-bold text-blue-700">{tokens.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-50 to-green-100/50 border-green-200">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-green-500 rounded-xl text-white">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-green-600">رموز نشطة</p>
              <p className="text-2xl font-bold text-green-700">{tokens.filter(t => t.is_active).length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100/50 border-purple-200">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-purple-500 rounded-xl text-white">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-purple-600">إجمالي الاستخدام</p>
              <p className="text-2xl font-bold text-purple-700">{tokens.reduce((sum, t) => sum + (t.usage_count || 0), 0)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tokens List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tokens List */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">رموز التضمين</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[500px]">
                {tokens.length === 0 ? (
                  <div className="p-6 text-center text-muted-foreground">
                    <Code2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>لا توجد رموز تضمين</p>
                    <p className="text-sm">أنشئ رمزاً جديداً للبدء</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {tokens.map((token) => (
                      <button
                        key={token.id}
                        onClick={() => setSelectedToken(token)}
                        className={`w-full p-4 text-right hover:bg-muted/50 transition-colors ${
                          selectedToken?.id === token.id ? 'bg-primary/5 border-r-2 border-primary' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium truncate">{token.name}</p>
                              <Badge variant={token.is_active ? 'default' : 'secondary'} className="text-xs">
                                {token.is_active ? 'نشط' : 'معطل'}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground truncate mt-1">
                              {token.organization?.name || 'غير محدد'}
                            </p>
                            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Activity className="w-3 h-3" />
                                {token.usage_count || 0}
                              </span>
                              {token.expires_at && (
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {format(new Date(token.expires_at), 'yyyy/MM/dd', { locale: ar })}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Token Details */}
        <div className="lg:col-span-2">
          {selectedToken ? (
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {selectedToken.name}
                      <Badge variant={selectedToken.is_active ? 'default' : 'secondary'}>
                        {selectedToken.is_active ? 'نشط' : 'معطل'}
                      </Badge>
                    </CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-1">
                      <Building2 className="w-4 h-4" />
                      {selectedToken.organization?.name}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={selectedToken.is_active}
                      onCheckedChange={() => handleToggleActive(selectedToken)}
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      className="text-red-500 hover:text-red-600 hover:bg-red-50"
                      onClick={() => handleDeleteToken(selectedToken.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="embed" className="space-y-4">
                  <TabsList className="grid grid-cols-4 w-full">
                    <TabsTrigger value="embed">أكواد التضمين</TabsTrigger>
                    <TabsTrigger value="info">المعلومات</TabsTrigger>
                    <TabsTrigger value="domains">النطاقات</TabsTrigger>
                    <TabsTrigger value="help">المساعدة</TabsTrigger>
                  </TabsList>

                  <TabsContent value="embed" className="space-y-4">
                    {/* Direct URL */}
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Globe className="w-4 h-4" />
                        رابط التضمين المباشر
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          value={getEmbedUrl(selectedToken.token)}
                          readOnly
                          className="font-mono text-sm"
                          dir="ltr"
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => copyToClipboard(getEmbedUrl(selectedToken.token), 'url')}
                        >
                          {copiedField === 'url' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => window.open(getEmbedUrl(selectedToken.token), '_blank')}
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    <Separator />

                    {/* iFrame Code */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="flex items-center gap-2">
                          <FileCode className="w-4 h-4" />
                          كود iFrame (الأبسط)
                        </Label>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(getIframeCode(selectedToken.token), 'iframe')}
                        >
                          {copiedField === 'iframe' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                          نسخ
                        </Button>
                      </div>
                      <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg text-xs overflow-x-auto" dir="ltr">
                        {getIframeCode(selectedToken.token)}
                      </pre>
                    </div>

                    {/* Widget Code */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="flex items-center gap-2">
                          <Code2 className="w-4 h-4" />
                          كود Widget JS (أكثر مرونة)
                        </Label>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(getWidgetCode(selectedToken.token), 'widget')}
                        >
                          {copiedField === 'widget' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                          نسخ
                        </Button>
                      </div>
                      <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg text-xs overflow-x-auto max-h-48" dir="ltr">
                        {getWidgetCode(selectedToken.token)}
                      </pre>
                    </div>

                    {/* Popup Button */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="flex items-center gap-2">
                          <FileCode className="w-4 h-4" />
                          زر الدعم العائم (Popup)
                        </Label>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(getPopupCode(selectedToken.token), 'popup')}
                        >
                          {copiedField === 'popup' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                          نسخ
                        </Button>
                      </div>
                      <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg text-xs overflow-x-auto max-h-48" dir="ltr">
                        {getPopupCode(selectedToken.token)}
                      </pre>
                    </div>
                  </TabsContent>

                  <TabsContent value="info" className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-muted/50 rounded-lg">
                        <p className="text-sm text-muted-foreground">تاريخ الإنشاء</p>
                        <p className="font-medium">{format(new Date(selectedToken.created_at), 'PPP', { locale: ar })}</p>
                      </div>
                      <div className="p-4 bg-muted/50 rounded-lg">
                        <p className="text-sm text-muted-foreground">تاريخ الانتهاء</p>
                        <p className="font-medium">
                          {selectedToken.expires_at 
                            ? format(new Date(selectedToken.expires_at), 'PPP', { locale: ar })
                            : 'بدون انتهاء'}
                        </p>
                      </div>
                      <div className="p-4 bg-muted/50 rounded-lg">
                        <p className="text-sm text-muted-foreground">عدد الاستخدامات</p>
                        <p className="font-medium">{selectedToken.usage_count || 0} مرة</p>
                      </div>
                      <div className="p-4 bg-muted/50 rounded-lg">
                        <p className="text-sm text-muted-foreground">آخر استخدام</p>
                        <p className="font-medium">
                          {selectedToken.last_used_at
                            ? format(new Date(selectedToken.last_used_at), 'PPP', { locale: ar })
                            : 'لم يستخدم بعد'}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>رمز التضمين</Label>
                      <div className="flex gap-2">
                        <Input
                          value={selectedToken.token}
                          readOnly
                          className="font-mono text-sm"
                          dir="ltr"
                          type="password"
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => copyToClipboard(selectedToken.token, 'token')}
                        >
                          {copiedField === 'token' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="domains" className="space-y-4">
                    {selectedToken.allowed_domains && selectedToken.allowed_domains.length > 0 ? (
                      <div className="space-y-2">
                        <Label>النطاقات المسموحة</Label>
                        <div className="flex flex-wrap gap-2">
                          {selectedToken.allowed_domains.map((domain, i) => (
                            <Badge key={i} variant="outline" className="text-sm py-1">
                              <Globe className="w-3 h-3 ml-1" />
                              {domain}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          لم يتم تحديد نطاقات. هذا الرمز يعمل من أي نطاق.
                        </AlertDescription>
                      </Alert>
                    )}
                  </TabsContent>

                  <TabsContent value="help" className="space-y-4">
                    <div className="space-y-4">
                      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <h4 className="font-medium text-blue-900 mb-2">كيفية الاستخدام</h4>
                        <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800">
                          <li>انسخ أحد أكواد التضمين أعلاه</li>
                          <li>الصقه في كود HTML لموقعك في المكان المناسب</li>
                          <li>احفظ التغييرات وسيظهر النموذج تلقائياً</li>
                        </ol>
                      </div>

                      <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                        <h4 className="font-medium text-amber-900 mb-2">استكشاف الأخطاء</h4>
                        <ul className="list-disc list-inside space-y-2 text-sm text-amber-800">
                          <li>تأكد من أن الرمز نشط ولم تنته صلاحيته</li>
                          <li>إذا حددت نطاقات معينة، تأكد من إضافة نطاق موقعك</li>
                          <li>تأكد من استخدام HTTPS في موقعك</li>
                          <li>جرب فتح رابط التضمين مباشرة للتحقق</li>
                        </ul>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          ) : (
            <Card className="h-full flex items-center justify-center">
              <CardContent className="text-center py-12">
                <Code2 className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
                <h3 className="text-lg font-medium mb-2">اختر رمز تضمين</h3>
                <p className="text-muted-foreground">
                  اختر رمزاً من القائمة لعرض تفاصيله وأكواد التضمين
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmbedSettingsPage;
