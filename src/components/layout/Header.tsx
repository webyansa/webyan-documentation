import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Search, Menu, X, LogOut, User, Building2, Users, Shield, Headphones } from "lucide-react";
import { useUserType } from "@/hooks/useUserType";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { NotificationDropdown } from "@/components/layout/NotificationDropdown";
import { ChatNotificationDropdown } from "@/components/layout/ChatNotificationDropdown";
import webyanLogo from "@/assets/webyan-logo.svg";
import { Skeleton } from "@/components/ui/skeleton";

interface HeaderProps {
  onMenuToggle?: () => void;
  isMenuOpen?: boolean;
}

export function Header({ onMenuToggle, isMenuOpen }: HeaderProps) {
  const location = useLocation();
  const isDashboardOnly = location.pathname.startsWith('/admin') || 
                          location.pathname.startsWith('/staff') || 
                          location.pathname.startsWith('/support') ||
                          location.pathname.startsWith('/portal');

  const [searchQuery, setSearchQuery] = useState("");
  const { 
    user, 
    loading, 
    signOut, 
    userInfo, 
    isAdmin, 
    isAdminOrEditor, 
    isStaff, 
    isClient 
  } = useUserType();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/search?q=${encodeURIComponent(searchQuery)}`;
    }
  };

  const getUserTypeLabel = () => {
    switch (userInfo.userType) {
      case 'admin':
        return 'مدير النظام';
      case 'editor':
        return 'محرر';
      case 'staff':
        return userInfo.roleName === 'support_agent' ? 'موظف دعم فني' : 'موظف';
      case 'client':
        return 'عميل';
      default:
        return 'زائر';
    }
  };

  const getUserTypeBadgeColor = () => {
    switch (userInfo.userType) {
      case 'admin':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'editor':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'staff':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'client':
        return 'bg-green-100 text-green-700 border-green-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getUserTypeIcon = () => {
    switch (userInfo.userType) {
      case 'admin':
        return <Shield className="h-3 w-3" />;
      case 'editor':
        return <User className="h-3 w-3" />;
      case 'staff':
        return <Headphones className="h-3 w-3" />;
      case 'client':
        return <Building2 className="h-3 w-3" />;
      default:
        return <User className="h-3 w-3" />;
    }
  };

  // Get appropriate portal link based on user type
  const getPortalLink = () => {
    switch (userInfo.userType) {
      case 'admin':
      case 'editor':
        return { href: '/admin', label: 'لوحة التحكم', icon: Shield, color: 'text-red-600 hover:text-red-700 hover:bg-red-50' };
      case 'staff':
        return { href: '/support', label: 'بوابة الدعم', icon: Headphones, color: 'text-blue-600 hover:text-blue-700 hover:bg-blue-50' };
      case 'client':
        return { href: '/portal', label: 'بوابة العملاء', icon: Building2, color: 'text-green-600 hover:text-green-700 hover:bg-green-50' };
      default:
        return null;
    }
  };

  const portalLink = getPortalLink();

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
          
          {loading ? (
            <div className="flex items-center gap-2 mr-2 pr-2 border-r border-border">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex flex-col gap-1">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          ) : user ? (
            <>
              {isDashboardOnly && (
                <>
                  <NotificationDropdown />

                  {/* Chat Notifications based on user type */}
                  {(isAdmin || isAdminOrEditor) && (
                    <ChatNotificationDropdown 
                      userType="admin" 
                      linkTo="/admin/chat"
                    />
                  )}

                  {isStaff && userInfo.staffId && (
                    <ChatNotificationDropdown 
                      userType="staff" 
                      staffId={userInfo.staffId}
                      linkTo="/support/chat"
                    />
                  )}

                  {isClient && userInfo.organizationId && (
                    <ChatNotificationDropdown 
                      userType="client" 
                      organizationId={userInfo.organizationId}
                      linkTo="/portal/chat"
                    />
                  )}
                </>
              )}
              
              {/* Portal Link based on user type */}
              {portalLink && (
                <Button variant="ghost" size="sm" asChild className={portalLink.color}>
                  <Link to={portalLink.href} className="flex items-center gap-1">
                    <portalLink.icon className="h-4 w-4" />
                    {portalLink.label}
                  </Link>
                </Button>
              )}

              {/* User Info */}
              <div className="flex items-center gap-2 mr-2 pr-2 border-r border-border">
                <div className="flex flex-col items-end">
                  <span className="text-sm font-medium text-foreground">
                    {userInfo.displayName || user?.email?.split('@')[0]}
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
              <Button variant="default" size="sm" asChild className="bg-green-600 hover:bg-green-700">
                <Link to="/portal/login" className="flex items-center gap-1">
                  <Building2 className="h-4 w-4" />
                  بوابة العملاء
                </Link>
              </Button>
            </div>
          )}
        </nav>

        {/* Mobile: Login Button */}
        <div className="md:hidden">
          {!loading && !user && (
            <Button size="sm" asChild className="bg-green-600 hover:bg-green-700">
              <Link to="/portal/login">
                <Building2 className="h-4 w-4" />
              </Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
