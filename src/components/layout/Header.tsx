import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Search, Menu, X, LogOut, Settings, User, Building2, Users, Shield } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useStaffAuth } from "@/hooks/useStaffAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { NotificationDropdown } from "@/components/layout/NotificationDropdown";
import { ChatNotificationDropdown } from "@/components/layout/ChatNotificationDropdown";
import webyanLogo from "@/assets/webyan-logo.svg";
import { supabase } from "@/integrations/supabase/client";

interface HeaderProps {
  onMenuToggle?: () => void;
  isMenuOpen?: boolean;
}

type UserType = 'admin' | 'staff' | 'client' | 'visitor' | null;

export function Header({ onMenuToggle, isMenuOpen }: HeaderProps) {
  const location = useLocation();
  const isDashboardOnly = location.pathname.startsWith('/admin') || location.pathname.startsWith('/staff') || location.pathname.startsWith('/portal');

  const [searchQuery, setSearchQuery] = useState("");
  const { user, role, signOut, isAdmin, isAdminOrEditor } = useAuth();
  const { isStaff, permissions } = useStaffAuth();
  
  const [isClient, setIsClient] = useState(false);
  const [clientOrganizationId, setClientOrganizationId] = useState<string | null>(null);
  const [userType, setUserType] = useState<UserType>(null);
  const [userName, setUserName] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      checkUserType();
    } else {
      setUserType(null);
      setIsClient(false);
      setClientOrganizationId(null);
      setUserName(null);
    }
  }, [user, isAdmin, isAdminOrEditor, isStaff]);

  const checkUserType = async () => {
    // Priority: Admin > Staff > Client
    
    // Check if admin first
    if (isAdmin || isAdminOrEditor) {
      setUserType('admin');
      return;
    }

    // Check if staff
    if (isStaff && permissions.staffId) {
      setUserType('staff');
      // Get staff name
      const { data: staffData } = await supabase
        .from('staff_members')
        .select('full_name')
        .eq('id', permissions.staffId)
        .single();
      
      if (staffData) {
        setUserName(staffData.full_name);
      }
      return;
    }

    // Check if client
    const { data: clientData } = await supabase
      .from('client_accounts')
      .select('id, organization_id, full_name')
      .eq('user_id', user?.id)
      .eq('is_active', true)
      .maybeSingle();
    
    if (clientData) {
      setIsClient(true);
      setClientOrganizationId(clientData.organization_id);
      setUserType('client');
      setUserName(clientData.full_name);
      return;
    }

    // Default: visitor
    setUserType('visitor');
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/search?q=${encodeURIComponent(searchQuery)}`;
    }
  };

  const getUserTypeLabel = () => {
    switch (userType) {
      case 'admin':
        return role === 'admin' ? 'مدير النظام' : 'محرر';
      case 'staff':
        return 'موظف دعم';
      case 'client':
        return 'عميل';
      default:
        return 'زائر';
    }
  };

  const getUserTypeBadgeColor = () => {
    switch (userType) {
      case 'admin':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'staff':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'client':
        return 'bg-green-100 text-green-700 border-green-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getUserTypeIcon = () => {
    switch (userType) {
      case 'admin':
        return <Shield className="h-3 w-3" />;
      case 'staff':
        return <Users className="h-3 w-3" />;
      case 'client':
        return <Building2 className="h-3 w-3" />;
      default:
        return <User className="h-3 w-3" />;
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="container flex h-16 items-center justify-between gap-4">
        {/* Mobile Menu Button */}
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onMenuToggle}
          aria-label={isMenuOpen ? "إغلاق القائمة" : "فتح القائمة"}
        >
          {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>

        {/* Logo */}
        <Link to="/" className="flex items-center gap-3 transition-opacity hover:opacity-80">
          <img src={webyanLogo} alt="ويبيان" className="h-8 w-auto" />
          <div className="hidden sm:flex flex-col">
            <span className="text-xs text-muted-foreground">دليل استخدام</span>
            <span className="text-sm font-semibold text-primary">لوحة التحكم</span>
          </div>
        </Link>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="flex-1 max-w-xl mx-4">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="ابحث في الدليل..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-10 bg-muted/50 border-transparent focus:border-primary focus:bg-background transition-colors"
            />
          </div>
        </form>

        {/* Quick Actions */}
        <nav className="hidden md:flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/changelog">التحديثات</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to="/submit-ticket">إبلاغ عن مشكلة</Link>
          </Button>
          
          {user ? (
            <>
              {isDashboardOnly && (
                <>
                  <NotificationDropdown />

                  {/* Chat Notifications based on user type */}
                  {userType === 'admin' && (
                    <ChatNotificationDropdown 
                      userType="admin" 
                      linkTo="/admin/chat"
                    />
                  )}

                  {userType === 'staff' && permissions.staffId && (
                    <ChatNotificationDropdown 
                      userType="staff" 
                      staffId={permissions.staffId}
                      linkTo="/staff/chat"
                    />
                  )}

                  {userType === 'client' && clientOrganizationId && (
                    <ChatNotificationDropdown 
                      userType="client" 
                      organizationId={clientOrganizationId}
                      linkTo="/portal/chat"
                    />
                  )}
                </>
              )}
              
              {/* Portal Links based on user type - Only show the appropriate portal */}
              {userType === 'client' && (
                <Button variant="ghost" size="sm" asChild className="text-green-600 hover:text-green-700 hover:bg-green-50">
                  <Link to="/portal" className="flex items-center gap-1">
                    <Building2 className="h-4 w-4" />
                    بوابة العملاء
                  </Link>
                </Button>
              )}

              {userType === 'staff' && (
                <Button variant="ghost" size="sm" asChild className="text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                  <Link to="/staff" className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    بوابة الموظفين
                  </Link>
                </Button>
              )}
              
              {userType === 'admin' && (
                <Button variant="ghost" size="sm" asChild className="text-red-600 hover:text-red-700 hover:bg-red-50">
                  <Link to="/admin" className="flex items-center gap-1">
                    <Shield className="h-4 w-4" />
                    لوحة التحكم
                  </Link>
                </Button>
              )}

              {/* User Info */}
              <div className="flex items-center gap-2 mr-2 pr-2 border-r border-border">
                <div className="flex flex-col items-end">
                  <span className="text-sm font-medium text-foreground">
                    {userName || user?.email?.split('@')[0]}
                  </span>
                  <Badge variant="outline" className={`text-xs px-1.5 py-0 flex items-center gap-1 ${getUserTypeBadgeColor()}`}>
                    {getUserTypeIcon()}
                    {getUserTypeLabel()}
                  </Badge>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={signOut}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <LogOut className="h-4 w-4 ml-1" />
                  خروج
                </Button>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link to="/portal-login" className="flex items-center gap-1">
                  <Building2 className="h-4 w-4" />
                  بوابة العملاء
                </Link>
              </Button>
              <Button variant="default" size="sm" asChild>
                <Link to="/auth">تسجيل الدخول</Link>
              </Button>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
