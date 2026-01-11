import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronDown, ChevronLeft, Loader2 } from "lucide-react";
import * as Icons from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

interface Module {
  id: string;
  slug: string;
  title: string;
  icon: string;
  subModules: SubModule[];
}

interface SubModule {
  id: string;
  slug: string;
  title: string;
  icon: string;
  articles: Article[];
}

interface Article {
  id: string;
  slug: string;
  title: string;
}

function getIcon(iconName: string) {
  const IconComponent = (Icons as any)[iconName];
  return IconComponent ? <IconComponent className="h-4 w-4" /> : null;
}

function ModuleItem({ module }: { module: Module }) {
  const location = useLocation();
  const [isExpanded, setIsExpanded] = useState(
    location.pathname.includes(`/${module.slug}`)
  );

  const isActive = location.pathname.includes(`/${module.slug}`);

  return (
    <div className="mb-1">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
          isActive
            ? "bg-sidebar-accent text-sidebar-primary"
            : "text-sidebar-foreground hover:bg-sidebar-accent/50"
        )}
      >
        <div className="flex items-center gap-2">
          {getIcon(module.icon)}
          <span>{module.title}</span>
        </div>
        {isExpanded ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronLeft className="h-4 w-4" />
        )}
      </button>

      {isExpanded && (
        <div className="mr-4 mt-1 border-r border-sidebar-border pr-2 space-y-0.5">
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
}

function SubModuleItem({
  module,
  subModule,
}: {
  module: Module;
  subModule: SubModule;
}) {
  const location = useLocation();
  const [isExpanded, setIsExpanded] = useState(
    location.pathname.includes(`/${module.slug}/${subModule.slug}`)
  );

  const hasArticles = subModule.articles.length > 0;
  const isActive = location.pathname.includes(
    `/${module.slug}/${subModule.slug}`
  );

  if (!hasArticles) {
    return (
      <Link
        to={`/docs/${module.slug}/${subModule.slug}`}
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
          isActive
            ? "bg-sidebar-accent text-sidebar-primary font-medium"
            : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/30"
        )}
      >
        {getIcon(subModule.icon)}
        <span>{subModule.title}</span>
      </Link>
    );
  }

  return (
    <div>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "w-full flex items-center justify-between gap-2 px-3 py-2 rounded-md text-sm transition-colors",
          isActive
            ? "text-sidebar-primary font-medium"
            : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/30"
        )}
      >
        <div className="flex items-center gap-2">
          {getIcon(subModule.icon)}
          <span>{subModule.title}</span>
        </div>
        {isExpanded ? (
          <ChevronDown className="h-3 w-3" />
        ) : (
          <ChevronLeft className="h-3 w-3" />
        )}
      </button>

      {isExpanded && (
        <div className="mr-4 mt-0.5 space-y-0.5">
          {subModule.articles.map((article) => (
            <Link
              key={article.id}
              to={`/docs/${module.slug}/${subModule.slug}/${article.slug}`}
              className={cn(
                "block px-3 py-1.5 rounded text-xs transition-colors",
                location.pathname.includes(article.slug)
                  ? "bg-sidebar-accent text-sidebar-primary font-medium"
                  : "text-muted-foreground hover:text-sidebar-foreground"
              )}
            >
              {article.title}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchModules();
  }, []);

  const fetchModules = async () => {
    try {
      // Fetch modules
      const { data: modulesData, error: modulesError } = await supabase
        .from('docs_modules')
        .select('id, slug, title, icon')
        .eq('is_published', true)
        .order('sort_order');

      if (modulesError) throw modulesError;

      const modulesWithContent: Module[] = [];

      for (const mod of modulesData || []) {
        // Fetch submodules for this module
        const { data: submodulesData } = await supabase
          .from('docs_submodules')
          .select('id, slug, title, icon')
          .eq('module_id', mod.id)
          .eq('is_published', true)
          .order('sort_order');

        const subModulesWithArticles: SubModule[] = [];

        for (const sub of submodulesData || []) {
          // Fetch articles for this submodule
          const { data: articlesData } = await supabase
            .from('docs_articles')
            .select('id, slug, title')
            .eq('submodule_id', sub.id)
            .eq('status', 'published')
            .order('sort_order');

          subModulesWithArticles.push({
            id: sub.id,
            slug: sub.slug,
            title: sub.title,
            icon: sub.icon || 'FileText',
            articles: articlesData || [],
          });
        }

        modulesWithContent.push({
          id: mod.id,
          slug: mod.slug,
          title: mod.title,
          icon: mod.icon || 'BookOpen',
          subModules: subModulesWithArticles,
        });
      }

      setModules(modulesWithContent);
    } catch (error) {
      console.error('Error fetching sidebar data:', error);
    } finally {
      setLoading(false);
    }
  };

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
          "fixed top-16 right-0 z-40 h-[calc(100vh-4rem)] w-72 border-l bg-sidebar transition-transform duration-300 lg:translate-x-0",
          isOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"
        )}
      >
        <ScrollArea className="h-full py-4 px-3">
          <nav className="space-y-1">
            {/* Quick Links */}
            <div className="mb-4 pb-4 border-b border-sidebar-border">
              <Link
                to="/"
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
              >
                {getIcon("Home")}
                <span>الرئيسية</span>
              </Link>
              <Link
                to="/getting-started"
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-secondary hover:bg-sidebar-accent transition-colors"
              >
                {getIcon("Rocket")}
                <span>ابدأ هنا</span>
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
