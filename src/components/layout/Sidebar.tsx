import { useState, memo, forwardRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronDown, ChevronLeft, Loader2 } from 'lucide-react';
import * as Icons from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useSidebarData, SidebarModule, SidebarSubModule } from '@/hooks/useSidebarData';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

function getIcon(iconName: string) {
  const IconComponent = (Icons as any)[iconName];
  return IconComponent ? <IconComponent className="h-5 w-5 flex-shrink-0" /> : null;
}

const SubModuleItem = memo(forwardRef<HTMLDivElement, {
  module: SidebarModule;
  subModule: SidebarSubModule;
}>(function SubModuleItem({ module, subModule }, ref) {
  const location = useLocation();
  const isActive = location.pathname.includes(`/${module.slug}/${subModule.slug}`);
  const [isExpanded, setIsExpanded] = useState(isActive);
  const hasArticles = subModule.articles.length > 0;

  if (!hasArticles) {
    return (
      <Link
        to={`/docs/${module.slug}/${subModule.slug}`}
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors',
          isActive
            ? 'bg-primary/10 text-primary font-medium'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
        )}
      >
        {getIcon(subModule.icon)}
        <span className="flex-1 text-right">{subModule.title}</span>
      </Link>
    );
  }

  return (
    <div ref={ref}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          'w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors',
          isActive
            ? 'text-primary font-medium'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
        )}
      >
        {getIcon(subModule.icon)}
        <span className="flex-1 text-right">{subModule.title}</span>
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
        ) : (
          <ChevronLeft className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
        )}
      </button>

      {isExpanded && (
        <div className="mr-4 mt-0.5 border-r-2 border-border pr-2 space-y-0.5">
          {subModule.articles.map((article) => (
            <Link
              key={article.id}
              to={`/docs/${module.slug}/${subModule.slug}/${article.slug}`}
              className={cn(
                'block px-2 py-1.5 rounded-md text-sm transition-colors',
                location.pathname.includes(article.slug)
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
              )}
            >
              {article.title}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}));

const ModuleItem = memo(forwardRef<HTMLDivElement, { module: SidebarModule }>(function ModuleItem({ module }, ref) {
  const location = useLocation();
  const isActive = location.pathname.includes(`/${module.slug}`);
  const [isExpanded, setIsExpanded] = useState(isActive);

  return (
    <div ref={ref} className="mb-0.5">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          'w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all',
          isActive
            ? 'bg-primary/10 text-primary'
            : 'text-foreground hover:bg-muted/50'
        )}
      >
        {getIcon(module.icon)}
        <span className="flex-1 text-right">{module.title}</span>
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
        ) : (
          <ChevronLeft className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
        )}
      </button>

      {isExpanded && module.subModules.length > 0 && (
        <div className="mr-4 mt-0.5 border-r-2 border-border pr-2 space-y-0.5">
          {module.subModules.map((subModule) => (
            <SubModuleItem
              key={subModule.id}
              module={module}
              subModule={subModule}
            />
          ))}
        </div>
      )}
    </div>
  );
}));
export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { modules, loading } = useSidebarData();

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-16 right-0 z-40 h-[calc(100vh-4rem)] w-64 border-l bg-background transition-transform duration-300 lg:translate-x-0',
          isOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
        )}
      >
        <ScrollArea className="h-full py-4 px-3">
          <nav className="space-y-0.5">
            {/* Quick Links */}
            <div className="mb-4 pb-3 border-b border-border space-y-0.5">
              <Link
                to="/"
                className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-foreground hover:bg-muted/50 transition-colors"
              >
                {getIcon('Home')}
                <span className="flex-1 text-right">الرئيسية</span>
              </Link>
              <Link
                to="/getting-started"
                className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-secondary hover:bg-muted/50 transition-colors"
              >
                {getIcon('Rocket')}
                <span className="flex-1 text-right">ابدأ هنا</span>
              </Link>
              <Link
                to="/submit-ticket"
                className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
              >
                {getIcon('TicketPlus')}
                <span className="flex-1 text-right">الإبلاغ عن مشكلة</span>
              </Link>
              <Link
                to="/track-ticket"
                className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:bg-muted/50 transition-colors"
              >
                {getIcon('Search')}
                <span className="flex-1 text-right">تتبع تذكرة</span>
              </Link>
            </div>

            {/* Modules */}
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : modules.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                لا توجد وحدات بعد
              </p>
            ) : (
              modules.map((module) => (
                <ModuleItem key={module.id} module={module} />
              ))
            )}
          </nav>
        </ScrollArea>
      </aside>
    </>
  );
}
