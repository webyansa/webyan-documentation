import { useState, useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import {
  LayoutDashboard,
  FileText,
  FolderTree,
  Image,
  Tags,
  History,
  ThumbsUp,
  AlertTriangle,
  Search,
  BarChart3,
  Users,
  Settings,
  Menu,
  X,
  LogOut,
  ChevronDown,
  ChevronLeft,
  Ticket,
  Building2,
  Calendar,
  Clock,
  UserCog,
  CalendarDays,
  Zap,
  Code2,
  MessageSquare,
  BookOpen,
  Home,
  Loader2,
  Archive,
  Headphones,
  FileEdit,
  Shield
} from 'lucide-react';
import { ChatNotificationDropdown } from '@/components/layout/ChatNotificationDropdown';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
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
  badge?: number;
  requiredRole?: 'admin' | 'editor';
}

interface NavSection {
  title: string;
  items: NavItem[];
  adminOnly?: boolean;
}

// Dashboard Section
const dashboardSection: NavSection = {
  title: 'الرئيسية',
  items: [
    { title: 'لوحة التحكم', href: '/admin', icon: LayoutDashboard },
    { title: 'التقارير والإحصائيات', href: '/admin/reports', icon: BarChart3, requiredRole: 'admin' },
  ]
};

// Content Section - Documentation related
const contentSection: NavSection = {
  title: 'إدارة المحتوى',
  items: [
    { title: 'المقالات', href: '/admin/articles', icon: FileText },
    { title: 'شجرة المحتوى', href: '/admin/content-tree', icon: FolderTree },
    { title: 'الوسائط', href: '/admin/media', icon: Image },
    { title: 'الوسوم', href: '/admin/tags', icon: Tags },
    { title: 'سجل التحديثات', href: '/admin/changelog', icon: History },
  ]
};

// Chat & Conversations Section
const chatSection: NavSection = {
  title: 'المحادثات',
  adminOnly: true,
  items: [
    { title: 'صندوق الوارد', href: '/admin/chat', icon: MessageSquare, requiredRole: 'admin' },
    { title: 'المحادثات المؤرشفة', href: '/admin/archived-chats', icon: Archive, requiredRole: 'admin' },
    { title: 'الردود السريعة', href: '/admin/quick-replies', icon: Zap, requiredRole: 'admin' },
    { title: 'إعدادات الشات', href: '/admin/chat-settings', icon: Settings, requiredRole: 'admin' },
    { title: 'تضمين الدردشة', href: '/admin/chat-embed', icon: Code2, requiredRole: 'admin' },
  ]
};

// Support Tickets Section
const ticketsSection: NavSection = {
  title: 'تذاكر الدعم',
  adminOnly: true,
  items: [
    { title: 'جميع التذاكر', href: '/admin/tickets', icon: Ticket, requiredRole: 'admin' },
    { title: 'إعدادات التصعيد', href: '/admin/escalation-settings', icon: AlertTriangle, requiredRole: 'admin' },
    { title: 'البلاغات', href: '/admin/issues', icon: AlertTriangle, requiredRole: 'admin' },
  ]
};

// Meetings Section
const meetingsSection: NavSection = {
  title: 'الاجتماعات',
  adminOnly: true,
  items: [
    { title: 'طلبات الاجتماعات', href: '/admin/meetings', icon: CalendarDays, requiredRole: 'admin' },
    { title: 'إعدادات المواعيد', href: '/admin/meeting-settings', icon: Calendar, requiredRole: 'admin' },
  ]
};

// Clients Section
const clientsSection: NavSection = {
  title: 'العملاء',
  adminOnly: true,
  items: [
    { title: 'إدارة العملاء', href: '/admin/clients', icon: Building2, requiredRole: 'admin' },
    { title: 'التقييمات', href: '/admin/feedback', icon: ThumbsUp, requiredRole: 'admin' },
    { title: 'إعدادات التضمين', href: '/admin/embed-settings', icon: Code2, requiredRole: 'admin' },
  ]
};

// Staff Management Section
const staffSection: NavSection = {
  title: 'فريق العمل',
  adminOnly: true,
  items: [
    { title: 'الموظفين', href: '/admin/staff', icon: UserCog, requiredRole: 'admin' },
    { title: 'أداء الموظفين', href: '/admin/staff-performance', icon: BarChart3, requiredRole: 'admin' },
  ]
};

// System Settings Section
const settingsSection: NavSection = {
  title: 'النظام',
  adminOnly: true,
  items: [
    { title: 'المستخدمين', href: '/admin/users', icon: Users, requiredRole: 'admin' },
    { title: 'الأدوار والصلاحيات', href: '/admin/roles', icon: Shield, requiredRole: 'admin' },
    { title: 'سجل النشاط', href: '/admin/activity-log', icon: History, requiredRole: 'admin' },
    { title: 'سجل البحث', href: '/admin/search-logs', icon: Search, requiredRole: 'admin' },
    { title: 'الإعدادات العامة', href: '/admin/settings', icon: Settings, requiredRole: 'admin' },
  ]
};

export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, role, loading, signOut, isAdmin, isAdminOrEditor, isSupportAgent } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    // Only redirect when loading is complete
    if (!loading) {
      if (!user) {
        navigate('/auth');
      } else if (!isAdminOrEditor) {
        // User is logged in but not admin/editor - redirect to appropriate portal
        navigate('/');
      }
    }
  }, [user, loading, isAdminOrEditor, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
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
  if (!user || !isAdminOrEditor) {
    return null;
  }

  const getRoleLabel = () => {
    switch (role) {
      case 'admin':
        return 'مدير';
      case 'editor':
        return 'محرر';
      case 'support_agent':
        return 'موظف دعم فني';
      default:
        return 'زائر';
    }
  };

  const getRoleBadgeColor = () => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-700';
      case 'editor':
        return 'bg-blue-100 text-blue-700';
      case 'support_agent':
        return 'bg-orange-100 text-orange-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const allSections = [
    dashboardSection,
    contentSection,
    chatSection,
    ticketsSection,
    meetingsSection,
    clientsSection,
    staffSection,
    settingsSection
  ];
  
  const getFilteredSections = () => {
    return allSections.map(section => ({
      ...section,
      items: section.items.filter(item => 
        !item.requiredRole || (item.requiredRole === 'admin' && isAdmin)
      )
    })).filter(section => !section.adminOnly || isAdmin);
  };
  
  const filteredSections = getFilteredSections();

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
            <Link to="/admin" className="flex items-center gap-2">
              <img src={webyanLogo} alt="ويبيان" className="h-8 w-auto" />
              <span className="font-bold text-lg hidden sm:inline">لوحة تحكم الدليل</span>
            </Link>
          </div>

          <div className="flex items-center gap-4">
            {/* Chat notifications (داخل لوحة التحكم فقط) */}
            <ChatNotificationDropdown userType="admin" linkTo="/admin/chat" />

            <Link to="/">
              <Button variant="outline" size="sm" className="gap-2">
                <BookOpen className="h-4 w-4" />
                <span className="hidden sm:inline">عرض الدليل</span>
              </Button>
            </Link>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2 px-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                      {user?.email?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden md:flex flex-col items-start">
                    <span className="text-sm font-medium">{user?.email}</span>
                    <span className={cn("text-xs px-2 py-0.5 rounded-full", getRoleBadgeColor())}>
                      {getRoleLabel()}
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
          {filteredSections.map((section, index) => (
            <div key={section.title}>
              {index > 0 && <Separator className="my-4" />}
              <div className="px-3 py-2">
                <h3 className="mb-2 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {section.title}
                </h3>
                <nav className="space-y-1">
                  {section.items.map((item) => (
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
                      {item.badge && (
                        <span className="mr-auto bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  ))}
                </nav>
              </div>
            </div>
          ))}
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
