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
  X,
  Building2,
  Bell
} from 'lucide-react';
import { ChatNotificationDropdown } from '@/components/layout/ChatNotificationDropdown';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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

const subscriptionStatusLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  trial: { label: 'تجريبي', variant: 'secondary' },
  active: { label: 'نشط', variant: 'default' },
  pending_renewal: { label: 'في انتظار التجديد', variant: 'outline' },
  expired: { label: 'منتهي', variant: 'destructive' },
  cancelled: { label: 'ملغي', variant: 'destructive' },
};

const PortalLayout = () => {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [clientInfo, setClientInfo] = useState<ClientInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  useEffect(() => {
    if (user) {
      fetchClientInfo();
    }
  }, [user]);

  const fetchClientInfo = async () => {
    try {
      const { data, error } = await supabase
        .from('client_accounts')
        .select(`
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
        `)
        .eq('user_id', user?.id)
        .eq('is_active', true)
        .single();

      if (error) throw error;

      if (data && data.organization) {
        // Handle the case where organization might be an array
        const org = Array.isArray(data.organization) ? data.organization[0] : data.organization;
        setClientInfo({
          full_name: data.full_name,
          email: data.email,
          job_title: data.job_title,
          organization_id: data.organization_id,
          organization: org
        });
      } else {
        // User is not a client, redirect to home
        toast.error('ليس لديك صلاحية الوصول لبوابة العملاء');
        navigate('/');
      }
    } catch (error) {
      console.error('Error fetching client info:', error);
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const isActive = (path: string, exact?: boolean) => {
    if (exact) return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
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
            />
          ) : (
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Building2 className="w-6 h-6 text-primary" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-foreground truncate">{clientInfo.organization.name}</h2>
            <Badge 
              variant={subscriptionStatusLabels[clientInfo.organization.subscription_status]?.variant || 'secondary'}
              className="mt-1"
            >
              {subscriptionStatusLabels[clientInfo.organization.subscription_status]?.label || clientInfo.organization.subscription_status}
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
            <p className="text-sm text-muted-foreground truncate">{clientInfo.job_title || 'عميل'}</p>
          </div>
        </div>
        <Button 
          variant="outline" 
          className="w-full justify-start gap-2"
          onClick={handleSignOut}
        >
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
            <Button variant="ghost" size="icon">
              <Menu className="w-6 h-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-80 p-0">
            <SidebarContent />
          </SheetContent>
        </Sheet>
        
        <h1 className="font-bold text-lg">بوابة عملاء ويبيان</h1>

        <div className="flex items-center gap-2">
          {clientInfo?.organization_id && (
            <ChatNotificationDropdown
              userType="client"
              organizationId={clientInfo.organization_id}
              linkTo="/portal/chat"
            />
          )}

          <Button variant="ghost" size="icon" className="relative">
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
