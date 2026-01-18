import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import {
  LayoutDashboard,
  Ticket,
  Calendar,
  CreditCard,
  MessageSquare,
  Settings,
  LogOut,
  Menu,
  Building2,
  Bell,
  Loader2,
} from 'lucide-react';
import { ChatNotificationDropdown } from '@/components/layout/ChatNotificationDropdown';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { toast } from 'sonner';

interface ClientInfo {
  full_name: string;
  email: string;
  job_title: string | null;
  organization_id: string;
  organization: {
    name: string;
    logo_url: string | null;
    subscription_status: string;
    subscription_plan: string | null;
  };
}

const menuItems = [
  { path: '/portal', label: 'لوحة التحكم', icon: LayoutDashboard, exact: true },
  { path: '/portal/tickets', label: 'تذاكر الدعم', icon: Ticket },
  { path: '/portal/chat', label: 'المحادثات', icon: MessageSquare },
  { path: '/portal/meetings', label: 'طلب اجتماع', icon: Calendar },
  { path: '/portal/subscription', label: 'الاشتراك', icon: CreditCard },
  { path: '/portal/settings', label: 'الإعدادات', icon: Settings },
];

const subscriptionStatusLabels: Record<
  string,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  trial: { label: 'تجريبي', variant: 'secondary' },
  active: { label: 'نشط', variant: 'default' },
  pending_renewal: { label: 'في انتظار التجديد', variant: 'outline' },
  expired: { label: 'منتهي', variant: 'destructive' },
  cancelled: { label: 'ملغي', variant: 'destructive' },
};

const PORTAL_GUARD_TIMEOUT_MS = 5000;

const PortalLayout = () => {
  const { user, signOut, authStatus, authError } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [clientInfo, setClientInfo] = useState<ClientInfo | null>(null);
  const [clientResolvedForUserId, setClientResolvedForUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadNotifications] = useState(0);

  // Route guard: unauthenticated -> portal login (with returnUrl)
  useEffect(() => {
    if (authStatus !== 'unauthenticated') return;
    const returnUrl = encodeURIComponent(location.pathname + location.search);
    navigate(`/portal/login?returnUrl=${returnUrl}`, { replace: true });
  }, [authStatus, location.pathname, location.search, navigate]);

  useEffect(() => {
    const uid = user?.id;
    if (authStatus === 'authenticated' && uid) {
      // Fetch client info only ONCE per authenticated user to avoid reload-like behavior
      // on token refresh / tab switching.
      if (clientResolvedForUserId !== uid) {
        fetchClientInfo();
      }
    }
  }, [authStatus, user?.id, clientResolvedForUserId]);

  const redirectNonClient = async () => {
    try {
      if (!user) {
        navigate('/portal/login', { replace: true });
        return;
      }

      const { data, error } = await supabase.rpc('get_user_type', { _user_id: user.id });
      if (error) throw error;

      const userType = (data?.[0]?.user_type || null) as string | null;
      if (userType === 'staff') {
        // Redirect staff to unauthorized page with link to their portal
        navigate('/unauthorized?portal=client&returnUrl=/support', { replace: true });
      } else if (userType === 'admin' || userType === 'editor') {
        // Redirect admin/editor to unauthorized page with link to their portal
        navigate('/unauthorized?portal=client&returnUrl=/admin', { replace: true });
      } else {
        // Unknown user type - show unauthorized
        navigate('/unauthorized?portal=client&returnUrl=/', { replace: true });
      }
    } catch {
      navigate('/portal/login', { replace: true });
    }
  };

  const fetchClientInfo = async (opts?: { silent?: boolean }) => {
    if (!user) return;

    const silent = opts?.silent ?? false;
    if (!silent) setLoading(true);

    const withTimeout = async <T,>(thenable: PromiseLike<T>, ms: number): Promise<T> => {
      return (await Promise.race([
        Promise.resolve(thenable),
        new Promise<never>((_, reject) => window.setTimeout(() => reject(new Error('timeout')), ms)),
      ])) as T;
    };

    try {
      const query = supabase
        .from('client_accounts')
        .select(
          `
          full_name,
          email,
          job_title,
          organization_id,
          organization:client_organizations (
            name,
            logo_url,
            subscription_status,
            subscription_plan
          )
        `
        )
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      const { data, error } = (await withTimeout(query, PORTAL_GUARD_TIMEOUT_MS)) as any;
      if (error) throw error;

      if (data && data.organization) {
        const org = Array.isArray(data.organization) ? data.organization[0] : data.organization;
        setClientInfo({
          full_name: data.full_name,
          email: data.email,
          job_title: data.job_title,
          organization_id: data.organization_id,
          organization: org,
        });
        setClientResolvedForUserId(user.id);
      } else {
        if (!silent) {
          toast.error('ليس لديك صلاحية الوصول لبوابة العملاء');
          await redirectNonClient();
        }
      }
    } catch (error: any) {
      // Silent refresh failures should NOT bounce the user out or show blocking loaders.
      if (silent) {
        console.warn('Silent client info refresh failed:', error);
        return;
      }

      if (error?.message === 'timeout') {
        toast.error('تعذر التحقق من الحساب، أعد المحاولة');
        navigate('/portal/login?reason=timeout', { replace: true });
      } else {
        console.error('Error fetching client info:', error);
        toast.error('ليس لديك صلاحية الوصول لبوابة العملاء');
        await redirectNonClient();
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/portal/login', { replace: true });
  };

  const isActive = (path: string, exact?: boolean) => {
    if (exact) return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  if (authStatus === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background" dir="rtl">
        <div className="flex flex-col items-center gap-4 text-center p-6">
          <Loader2 className="h-10 w-10 text-destructive" />
          <div className="space-y-1">
            <p className="font-medium text-foreground">تعذر التحقق من الجلسة</p>
            <p className="text-sm text-muted-foreground">
              {authError === 'timeout'
                ? 'انتهت مهلة التحقق. أعد المحاولة مرة أخرى.'
                : 'حدث خطأ أثناء التحقق. أعد تحميل الصفحة أو سجّل الدخول من جديد.'}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <Button onClick={() => window.location.reload()} className="w-full sm:w-auto">
              إعادة المحاولة
            </Button>
            <Button variant="outline" onClick={handleSignOut} className="w-full sm:w-auto">
              تسجيل الخروج
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Protected routes: show loader only while truly checking
  if (authStatus === 'unknown') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background" dir="rtl">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">جاري التحقق من الحساب...</p>
        </div>
      </div>
    );
  }

  // Redirect is handled by effect
  if (authStatus !== 'authenticated') return null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background" dir="rtl">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (!clientInfo) return null;

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Organization Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-3 mb-4">
          {clientInfo.organization.logo_url ? (
            <img
              src={clientInfo.organization.logo_url}
              alt={clientInfo.organization.name}
              className="w-12 h-12 rounded-lg object-cover"
              loading="lazy"
            />
          ) : (
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Building2 className="w-6 h-6 text-primary" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-foreground truncate">{clientInfo.organization.name}</h2>
            <Badge
              variant={
                subscriptionStatusLabels[clientInfo.organization.subscription_status]?.variant ||
                'secondary'
              }
              className="mt-1"
            >
              {subscriptionStatusLabels[clientInfo.organization.subscription_status]?.label ||
                clientInfo.organization.subscription_status}
            </Badge>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path, item.exact);
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                active
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User Info */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-3 mb-4">
          <Avatar>
            <AvatarFallback className="bg-primary/10 text-primary">
              {clientInfo.full_name.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-foreground truncate">{clientInfo.full_name}</p>
            <p className="text-sm text-muted-foreground truncate">
              {clientInfo.job_title || 'عميل'}
            </p>
          </div>
        </div>
        <Button variant="outline" className="w-full justify-start gap-2" onClick={handleSignOut}>
          <LogOut className="w-4 h-4" />
          تسجيل الخروج
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 inset-x-0 h-16 bg-background border-b border-border z-40 px-4 flex items-center justify-between">
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="فتح القائمة">
              <Menu className="w-6 h-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-80 p-0">
            <SidebarContent />
          </SheetContent>
        </Sheet>

        <h1 className="font-bold text-lg">بوابة العملاء</h1>

        <div className="flex items-center gap-2">
          {clientInfo?.organization_id && (
            <ChatNotificationDropdown
              userType="client"
              organizationId={clientInfo.organization_id}
              linkTo="/portal/chat"
            />
          )}

          <Button variant="ghost" size="icon" className="relative" aria-label="الإشعارات">
            <Bell className="w-5 h-5" />
            {unreadNotifications > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center">
                {unreadNotifications}
              </span>
            )}
          </Button>
        </div>
      </header>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:right-0 lg:flex lg:w-72 lg:flex-col bg-card border-l border-border shadow-sm z-40">
        <SidebarContent />
      </aside>

      {/* Main Content */}
      <main className="lg:pr-72 pt-16 lg:pt-0">
        <div className="min-h-screen">
          <Outlet context={{ clientInfo }} />
        </div>
      </main>
    </div>
  );
};

export default PortalLayout;
