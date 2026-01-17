import { useState, useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useStaffAuth } from '@/hooks/useStaffAuth';
import { useStaffNotifications } from '@/hooks/useStaffNotifications';
import {
  LayoutDashboard,
  FileText,
  Ticket,
  Calendar,
  Menu,
  LogOut,
  Home,
  Loader2,
  UserCog,
  MessageCircle
} from 'lucide-react';
import { ChatNotificationDropdown } from '@/components/layout/ChatNotificationDropdown';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import webyanLogo from '@/assets/webyan-logo.svg';

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: 'canReplyTickets' | 'canManageContent' | 'canAttendMeetings';
}

export default function StaffLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading, isStaff, permissions, signOut } = useStaffAuth();
  // Initialize staff notifications with sound
  useStaffNotifications();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [staffName, setStaffName] = useState<string>('');

  useEffect(() => {
    // Only redirect when loading is complete
    if (!loading) {
      if (!user) {
        navigate('/support/login');
      } else if (!isStaff) {
        // User is logged in but not staff - redirect to home
        navigate('/');
      }
    }
  }, [user, loading, isStaff, navigate]);

  useEffect(() => {
    const fetchStaffName = async () => {
      if (permissions.staffId) {
        const { data } = await supabase
          .from('staff_members')
          .select('full_name')
          .eq('id', permissions.staffId)
          .single();
        
        if (data) {
          setStaffName(data.full_name);
        }
      }
    };
    fetchStaffName();
  }, [permissions.staffId]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/support/login');
  };

  // Show loading while auth is being checked
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground text-sm">جاري التحقق من الصلاحيات...</p>
        </div>
      </div>
    );
  }

  // Don't render until we confirm user has access
  if (!user || !isStaff) {
    return null;
  }

  const navItems: NavItem[] = [
    { title: 'لوحة التحكم', href: '/support', icon: LayoutDashboard },
    { title: 'التذاكر الموجهة', href: '/support/tickets', icon: Ticket, permission: 'canReplyTickets' },
    { title: 'المحادثات', href: '/support/chat', icon: MessageCircle, permission: 'canReplyTickets' },
    { title: 'الاجتماعات الموجهة', href: '/support/meetings', icon: Calendar, permission: 'canAttendMeetings' },
    { title: 'إدارة المحتوى', href: '/support/content', icon: FileText, permission: 'canManageContent' },
  ];

  const filteredNavItems = navItems.filter(item => {
    if (!item.permission) return true;
    return permissions[item.permission];
  });

  return (
    <div className="min-h-screen bg-muted/30" dir="rtl">
      {/* Top Header */}
      <header className="fixed top-0 right-0 left-0 z-50 h-16 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-full items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <Link to="/support" className="flex items-center gap-2">
              <img src={webyanLogo} alt="ويبيان" className="h-8 w-auto" />
              <span className="font-bold text-lg hidden sm:inline">لوحة الموظف</span>
            </Link>
          </div>

          <div className="flex items-center gap-4">
            {/* Chat notifications (داخل لوحة الموظف) */}
            {permissions.staffId && (
              <ChatNotificationDropdown userType="staff" staffId={permissions.staffId} linkTo="/support/chat" />
            )}

            <Link to="/">
              <Button variant="outline" size="sm" className="gap-2">
                <Home className="h-4 w-4" />
                <span className="hidden sm:inline">الصفحة الرئيسية</span>
              </Button>
            </Link>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2 px-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                      {staffName?.charAt(0) || user?.email?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden md:flex flex-col items-start">
                    <span className="text-sm font-medium">{staffName || user?.email}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                      موظف
                    </span>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuLabel>حسابي</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/" className="flex items-center gap-2">
                    <Home className="h-4 w-4" />
                    الصفحة الرئيسية
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-red-600">
                  <LogOut className="h-4 w-4 ml-2" />
                  تسجيل الخروج
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-16 right-0 z-40 h-[calc(100vh-4rem)] w-64 border-l bg-background transition-transform duration-300",
          sidebarOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"
        )}
      >
        <ScrollArea className="h-full py-4">
          <div className="px-3 py-2">
            <h3 className="mb-2 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              القائمة الرئيسية
            </h3>
            <nav className="space-y-1">
              {filteredNavItems.map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    location.pathname === item.href
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.title}
                </Link>
              ))}
            </nav>
          </div>

          <Separator className="my-4" />

          {/* Permissions Summary */}
          <div className="px-6 py-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              صلاحياتي
            </h3>
            <div className="space-y-2">
              {permissions.canReplyTickets && (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <Ticket className="h-4 w-4" />
                  <span>الرد على التذاكر</span>
                </div>
              )}
              {permissions.canManageContent && (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <FileText className="h-4 w-4" />
                  <span>إدارة المحتوى</span>
                </div>
              )}
              {permissions.canAttendMeetings && (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <Calendar className="h-4 w-4" />
                  <span>حضور الاجتماعات</span>
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main
        className={cn(
          "min-h-screen pt-16 transition-all duration-300",
          "lg:pr-64"
        )}
      >
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
