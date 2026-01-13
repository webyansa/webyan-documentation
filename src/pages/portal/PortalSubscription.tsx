import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { 
  CreditCard, 
  Clock,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Star,
  Zap,
  Crown,
  Loader2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { format, differenceInDays } from 'date-fns';
import { ar } from 'date-fns/locale';

interface OrganizationInfo {
  id: string;
  subscription_status: string;
  subscription_plan: string | null;
  subscription_start_date: string | null;
  subscription_end_date: string | null;
}

interface SubscriptionRequest {
  id: string;
  request_type: string;
  current_plan: string | null;
  requested_plan: string;
  notes: string | null;
  status: string;
  admin_response: string | null;
  created_at: string;
}

const plans = [
  { 
    id: 'basic', 
    name: 'الأساسية', 
    icon: Star,
    features: ['دعم بالبريد الإلكتروني', 'الوصول للمنصة', 'تحديثات دورية']
  },
  { 
    id: 'professional', 
    name: 'الاحترافية', 
    icon: Zap,
    features: ['كل ميزات الأساسية', 'دعم فني أولوية', 'تدريب شهري', 'تخصيص محدود']
  },
  { 
    id: 'enterprise', 
    name: 'المؤسسية', 
    icon: Crown,
    features: ['كل ميزات الاحترافية', 'دعم 24/7', 'تخصيص كامل', 'مدير حساب مخصص']
  },
];

const subscriptionStatusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; color: string }> = {
  trial: { label: 'تجريبي', variant: 'secondary', color: 'text-blue-600' },
  active: { label: 'نشط', variant: 'default', color: 'text-green-600' },
  pending_renewal: { label: 'في انتظار التجديد', variant: 'outline', color: 'text-orange-600' },
  expired: { label: 'منتهي', variant: 'destructive', color: 'text-red-600' },
  cancelled: { label: 'ملغي', variant: 'destructive', color: 'text-gray-600' },
};

const PortalSubscription = () => {
  const { user } = useAuth();
  const { clientInfo } = useOutletContext<{ clientInfo: any }>();
  const [organization, setOrganization] = useState<OrganizationInfo | null>(null);
  const [requests, setRequests] = useState<SubscriptionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [renewDialogOpen, setRenewDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [renewForm, setRenewForm] = useState({
    requested_plan: '',
    notes: ''
  });

  useEffect(() => {
    if (user) {
      fetchSubscriptionData();
    }
  }, [user]);

  const fetchSubscriptionData = async () => {
    try {
      // Get organization ID
      const { data: clientData } = await supabase
        .from('client_accounts')
        .select('organization_id')
        .eq('user_id', user?.id)
        .single();

      if (!clientData) return;

      // Get organization details
      const { data: orgData } = await supabase
        .from('client_organizations')
        .select('id, subscription_status, subscription_plan, subscription_start_date, subscription_end_date')
        .eq('id', clientData.organization_id)
        .single();

      if (orgData) {
        setOrganization(orgData);
        setRenewForm(prev => ({ ...prev, requested_plan: orgData.subscription_plan || 'basic' }));
      }

      // Get subscription requests
      const { data: reqData } = await supabase
        .from('subscription_requests')
        .select('*')
        .eq('organization_id', clientData.organization_id)
        .order('created_at', { ascending: false });

      setRequests(reqData || []);
    } catch (error) {
      console.error('Error fetching subscription data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRenewalRequest = async () => {
    if (!renewForm.requested_plan) {
      toast.error('يرجى اختيار الباقة');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('subscription_requests')
        .insert({
          organization_id: organization?.id,
          requested_by: user?.id,
          request_type: 'renewal',
          current_plan: organization?.subscription_plan,
          requested_plan: renewForm.requested_plan,
          notes: renewForm.notes || null,
          status: 'pending'
        });

      if (error) throw error;

      toast.success('تم إرسال طلب التجديد بنجاح');
      setRenewDialogOpen(false);
      setRenewForm({ requested_plan: organization?.subscription_plan || 'basic', notes: '' });
      fetchSubscriptionData();
    } catch (error) {
      console.error('Error submitting renewal request:', error);
      toast.error('حدث خطأ أثناء إرسال الطلب');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const daysLeft = organization?.subscription_end_date
    ? differenceInDays(new Date(organization.subscription_end_date), new Date())
    : 0;

  const status = subscriptionStatusConfig[organization?.subscription_status || 'trial'];
  const currentPlan = plans.find(p => p.id === organization?.subscription_plan) || plans[0];
  const CurrentPlanIcon = currentPlan.icon;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-foreground flex items-center gap-3">
          <CreditCard className="w-8 h-8 text-primary" />
          الاشتراك
        </h1>
        <p className="text-muted-foreground mt-1">إدارة اشتراكك وطلب التجديد</p>
      </div>

      {/* Current Subscription */}
      <Card className="border-primary/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <CurrentPlanIcon className="w-6 h-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl">باقة {currentPlan.name}</CardTitle>
                <Badge variant={status.variant} className="mt-1">{status.label}</Badge>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {organization?.subscription_end_date && (
            <div className={`flex items-center gap-2 p-4 rounded-lg ${
              daysLeft <= 7 ? 'bg-red-50 dark:bg-red-900/20' : 
              daysLeft <= 30 ? 'bg-orange-50 dark:bg-orange-900/20' : 
              'bg-green-50 dark:bg-green-900/20'
            }`}>
              {daysLeft <= 7 ? (
                <AlertTriangle className="w-5 h-5 text-red-600" />
              ) : (
                <Clock className="w-5 h-5 text-muted-foreground" />
              )}
              <div>
                <p className={`font-medium ${
                  daysLeft <= 7 ? 'text-red-600' : 
                  daysLeft <= 30 ? 'text-orange-600' : 
                  'text-green-600'
                }`}>
                  {daysLeft <= 0 ? 'انتهى الاشتراك' : `متبقي ${daysLeft} يوم`}
                </p>
                <p className="text-sm text-muted-foreground">
                  ينتهي في {format(new Date(organization.subscription_end_date), 'dd MMMM yyyy', { locale: ar })}
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {organization?.subscription_start_date && (
              <div className="p-4 bg-accent/50 rounded-lg">
                <p className="text-sm text-muted-foreground">تاريخ البدء</p>
                <p className="font-medium text-foreground">
                  {format(new Date(organization.subscription_start_date), 'dd MMMM yyyy', { locale: ar })}
                </p>
              </div>
            )}
            <div className="p-4 bg-accent/50 rounded-lg">
              <p className="text-sm text-muted-foreground">الباقة الحالية</p>
              <p className="font-medium text-foreground">{currentPlan.name}</p>
            </div>
          </div>

          <Dialog open={renewDialogOpen} onOpenChange={setRenewDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full gap-2" size="lg">
                <RefreshCw className="w-4 h-4" />
                طلب تجديد الاشتراك
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>طلب تجديد الاشتراك</DialogTitle>
                <DialogDescription>
                  اختر الباقة التي تريد التجديد عليها وأضف أي ملاحظات
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>الباقة المطلوبة</Label>
                  <Select 
                    value={renewForm.requested_plan}
                    onValueChange={(value) => setRenewForm({ ...renewForm, requested_plan: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {plans.map(plan => {
                        const Icon = plan.icon;
                        return (
                          <SelectItem key={plan.id} value={plan.id}>
                            <div className="flex items-center gap-2">
                              <Icon className="w-4 h-4" />
                              <span>{plan.name}</span>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>ملاحظات (اختياري)</Label>
                  <Textarea
                    placeholder="أي ملاحظات أو استفسارات..."
                    value={renewForm.notes}
                    onChange={(e) => setRenewForm({ ...renewForm, notes: e.target.value })}
                    rows={3}
                  />
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <Button variant="outline" onClick={() => setRenewDialogOpen(false)}>
                    إلغاء
                  </Button>
                  <Button onClick={handleRenewalRequest} disabled={submitting} className="gap-2">
                    {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    إرسال الطلب
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      {/* Available Plans */}
      <Card>
        <CardHeader>
          <CardTitle>الباقات المتاحة</CardTitle>
          <CardDescription>اختر الباقة المناسبة لاحتياجاتك</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {plans.map(plan => {
              const Icon = plan.icon;
              const isCurrentPlan = plan.id === organization?.subscription_plan;
              return (
                <div 
                  key={plan.id}
                  className={`p-4 rounded-lg border-2 ${
                    isCurrentPlan ? 'border-primary bg-primary/5' : 'border-border'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Icon className={`w-5 h-5 ${isCurrentPlan ? 'text-primary' : 'text-muted-foreground'}`} />
                    <h3 className="font-semibold text-foreground">{plan.name}</h3>
                    {isCurrentPlan && <Badge variant="default" className="mr-auto">الحالية</Badge>}
                  </div>
                  <ul className="space-y-2">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Subscription Requests History */}
      {requests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>سجل الطلبات</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {requests.map(req => (
                <div key={req.id} className="flex items-start justify-between p-4 bg-accent/50 rounded-lg">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={req.status === 'pending' ? 'secondary' : req.status === 'approved' ? 'default' : 'destructive'}>
                        {req.status === 'pending' ? 'في الانتظار' : req.status === 'approved' ? 'موافق' : 'مرفوض'}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        طلب {req.request_type === 'renewal' ? 'تجديد' : 'ترقية'}
                      </span>
                    </div>
                    <p className="text-sm text-foreground">
                      الباقة المطلوبة: {plans.find(p => p.id === req.requested_plan)?.name || req.requested_plan}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(req.created_at), 'dd MMM yyyy - HH:mm', { locale: ar })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PortalSubscription;
