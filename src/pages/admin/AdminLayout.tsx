import { useState, useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
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
  LogOut,
  Ticket,
  Building2,
  Calendar,
  UserCog,
  CalendarDays,
  Zap,
  Code2,
  MessageSquare,
  BookOpen,
  Home,
  Loader2,
  Archive,
  Shield
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
import { rolePermissions, rolesInfo, type AppRole, type RolePermissions } from '@/lib/permissions';

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  permission?: keyof RolePermissions;
}

interface NavSection {
  title: string;
  items: NavItem[];
  sectionPermission?: keyof RolePermissions;
}

// Dashboard Section
const dashboardSection: NavSection = {
  title: 'الرئيسية',
  items: [
    { title: 'لوحة التحكم', href: '/admin', icon: LayoutDashboard, permission: 'canAccessAdminDashboard' },
    { title: 'التقارير والإحصائيات', href: '/admin/reports', icon: BarChart3, permission: 'canViewReports' },
  ]
};

// Content Section - Documentation related
const contentSection: NavSection = {
  title: 'إدارة المحتوى',
  items: [
    { title: 'المقالات', href: '/admin/articles', icon: FileText, permission: 'canManageArticles' },
    { title: 'شجرة المحتوى', href: '/admin/content-tree', icon: FolderTree, permission: 'canManageContentTree' },
    { title: 'الوسائط', href: '/admin/media', icon: Image, permission: 'canManageMedia' },
    { title: 'الوسوم', href: '/admin/tags', icon: Tags, permission: 'canManageTags' },
    { title: 'سجل التحديثات', href: '/admin/changelog', icon: History, permission: 'canManageChangelog' },
  ]
};

// Chat & Conversations Section
const chatSection: NavSection = {
  title: 'المحادثات',
  sectionPermission: 'canViewAllChats',
  items: [
    { title: 'صندوق الوارد', href: '/admin/chat', icon: MessageSquare, permission: 'canViewAllChats' },
    { title: 'المحادثات المؤرشفة', href: '/admin/archived-chats', icon: Archive, permission: 'canViewAllChats' },
    { title: 'الردود السريعة', href: '/admin/quick-replies', icon: Zap, permission: 'canManageQuickReplies' },
    { title: 'إعدادات الشات', href: '/admin/chat-settings', icon: Settings, permission: 'canManageSystemSettings' },
    { title: 'تضمين الدردشة', href: '/admin/chat-embed', icon: Code2, permission: 'canManageEmbedSettings' },
  ]
};

// Support Tickets Section
const ticketsSection: NavSection = {
  title: 'تذاكر الدعم',
  sectionPermission: 'canViewAllTickets',
  items: [
    { title: 'جميع التذاكر', href: '/admin/tickets', icon: Ticket, permission: 'canViewAllTickets' },
    { title: 'إعدادات التصعيد', href: '/admin/escalation-settings', icon: AlertTriangle, permission: 'canManageEscalation' },
    { title: 'البلاغات', href: '/admin/issues', icon: AlertTriangle, permission: 'canViewAllTickets' },
  ]
};

// Meetings Section
const meetingsSection: NavSection = {
  title: 'الاجتماعات',
  sectionPermission: 'canViewAllMeetings',
  items: [
    { title: 'طلبات الاجتماعات', href: '/admin/meetings', icon: CalendarDays, permission: 'canViewAllMeetings' },
    { title: 'إعدادات المواعيد', href: '/admin/meeting-settings', icon: Calendar, permission: 'canManageMeetingSettings' },
  ]
};

// Clients Section
const clientsSection: NavSection = {
  title: 'العملاء',
  sectionPermission: 'canManageClients',
  items: [
    { title: 'إدارة العملاء', href: '/admin/clients', icon: Building2, permission: 'canManageClients' },
    { title: 'التقييمات', href: '/admin/feedback', icon: ThumbsUp, permission: 'canManageClients' },
    { title: 'إعدادات التضمين', href: '/admin/embed-settings', icon: Code2, permission: 'canManageEmbedSettings' },
  ]
};

// Staff Management Section
const staffSection: NavSection = {
  title: 'فريق العمل',
  sectionPermission: 'canManageStaff',
  items: [
    { title: 'الموظفين', href: '/admin/staff', icon: UserCog, permission: 'canManageStaff' },
    { title: 'أداء الموظفين', href: '/admin/staff-performance', icon: BarChart3, permission: 'canViewStaffPerformance' },
  ]
};

// System Settings Section
const settingsSection: NavSection = {
  title: 'النظام',
  sectionPermission: 'canManageSystemSettings',
  items: [
    { title: 'المستخدمين', href: '/admin/users', icon: Users, permission: 'canManageUsers' },
    { title: 'الأدوار والصلاحيات', href: '/admin/roles', icon: Shield, permission: 'canManageRoles' },
    { title: 'سجل النشاط', href: '/admin/activity-log', icon: History, permission: 'canViewActivityLogs' },
    { title: 'سجل البحث', href: '/admin/search-logs', icon: Search, permission: 'canViewSearchLogs' },
    { title: 'الإعدادات العامة', href: '/admin/settings', icon: Settings, permission: 'canManageSystemSettings' },
  ]
};

export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, role, loading, authStatus, authError, signOut, isAdminOrEditor } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    // Never redirect based on partial/unknown state.
    if (authStatus === 'unauthenticated') {
      navigate('/admin/login', { replace: true });
      return;
    }

    // Only decide "unauthorized" after we are fully done checking.
    if (authStatus === 'authenticated' && !loading && user && !isAdminOrEditor) {
      navigate('/unauthorized?portal=admin&returnUrl=/admin', { replace: true });
    }
  }, [authStatus, loading, user, isAdminOrEditor, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/admin/login', { replace: true });
  };

  // Get current user's permissions
  const currentRole = role as AppRole | null;
  const permissions = currentRole ? rolePermissions[currentRole] : null;

  if (authStatus === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background" dir="rtl">
        <div className="flex flex-col items-center gap-4 text-center p-6">
          <AlertTriangle className="h-10 w-10 text-destructive" />
          <div className="space-y-1">
            <p className="font-medium text-foreground">تعذر التحقق من الجلسة أو الصلاحيات</p>
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

  // Show loading while auth is being checked
  if (authStatus === 'unknown' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground text-sm">جاري التحقق من الصلاحيات...</p>
        </div>
      </div>
    );
  }

  // Redirect is handled by the guard above
  if (authStatus !== 'authenticated') return null;

  // Don't render until we confirm user has access
  if (!user || !isAdminOrEditor) {
    return null;
  }

  const getRoleLabel = () => {
    if (currentRole && rolesInfo[currentRole]) {
      return rolesInfo[currentRole].name;
    }
    return 'زائر';
  };

  const getRoleBadgeColor = () => {
    if (currentRole && rolesInfo[currentRole]) {
      return rolesInfo[currentRole].badgeColor;
    }
    return 'bg-gray-100 text-gray-700';
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
  
  // Filter sections and items based on permissions
  const getFilteredSections = () => {
    if (!permissions) return [];
    
    return allSections
      .filter(section => {
        // If section has a permission requirement, check it
        if (section.sectionPermission) {
          return permissions[section.sectionPermission];
        }
        return true;
      })
      .map(section => ({
        ...section,
        items: section.items.filter(item => {
          // If item has a permission requirement, check it
          if (item.permission) {
            return permissions[item.permission];
          }
          return true;
        })
      }))
      .filter(section => section.items.length > 0); // Remove empty sections
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
            {permissions?.canViewAllChats && (
              <ChatNotificationDropdown userType="admin" linkTo="/admin/chat" />
            )}

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
