import { useState } from "react";
import { Link } from "react-router-dom";
import { Search, Menu, X, LogOut, Settings, User } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NotificationDropdown } from "@/components/layout/NotificationDropdown";
import webyanLogo from "@/assets/webyan-logo.svg";

interface HeaderProps {
  onMenuToggle?: () => void;
  isMenuOpen?: boolean;
}

export function Header({ onMenuToggle, isMenuOpen }: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const { user, role, signOut, isAdmin, isAdminOrEditor } = useAuth();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/search?q=${encodeURIComponent(searchQuery)}`;
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
              <NotificationDropdown />
              {isAdminOrEditor && (
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/admin" className="flex items-center gap-1">
                    <Settings className="h-4 w-4" />
                    لوحة التحكم
                  </Link>
                </Button>
              )}
              <div className="flex items-center gap-2 mr-2 pr-2 border-r border-border">
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <User className="h-4 w-4" />
                  {role === 'admin' ? 'مدير' : role === 'editor' ? 'محرر' : 'زائر'}
                </span>
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
            <Button variant="default" size="sm" asChild>
              <Link to="/auth">تسجيل الدخول</Link>
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}
