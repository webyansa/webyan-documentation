import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { BookOpen, Rocket, TrendingUp, Clock, ArrowLeft, Loader2, Building2, Ticket, Users, Shield } from "lucide-react";
import { DocsLayout } from "@/components/layout/DocsLayout";
import { SearchBar } from "@/components/docs/SearchBar";
import { ModuleCard } from "@/components/docs/ModuleCard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useStaffAuth } from "@/hooks/useStaffAuth";
import webyanLogo from "@/assets/webyan-logo.svg";

interface Module {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  icon: string;
  color: string;
  subModulesCount: number;
  articlesCount: number;
}

interface PopularArticle {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  views_count: number;
  moduleSlug: string;
  subModuleSlug: string;
}

type UserType = 'admin' | 'staff' | 'client' | null;

export default function HomePage() {
  const { user, isAdmin, isAdminOrEditor } = useAuth();
  const { isStaff } = useStaffAuth();
  const [modules, setModules] = useState<Module[]>([]);
  const [popularArticles, setPopularArticles] = useState<PopularArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [userType, setUserType] = useState<UserType>(null);

  useEffect(() => {
    fetchData();
    if (user) {
      checkUserType();
    } else {
      setUserType(null);
    }
  }, [user, isAdmin, isAdminOrEditor, isStaff]);

  const checkUserType = async () => {
    // Priority: Admin > Staff > Client
    if (isAdmin || isAdminOrEditor) {
      setUserType('admin');
      return;
    }

    if (isStaff) {
      setUserType('staff');
      return;
    }

    const { data } = await supabase
      .from('client_accounts')
      .select('id')
      .eq('user_id', user?.id)
      .eq('is_active', true)
      .maybeSingle();
    
    if (data) {
      setUserType('client');
    }
  };

  const fetchData = async () => {
    try {
      // Fetch modules + submodules + articles (published) in parallel for speed
      const [modulesRes, submodulesRes, articlesRes] = await Promise.all([
        supabase
          .from('docs_modules')
          .select('id, slug, title, description, icon, color')
          .eq('is_published', true)
          .order('sort_order'),
        supabase
          .from('docs_submodules')
          .select('id, module_id')
          .eq('is_published', true),
        supabase
          .from('docs_articles')
          .select('id, submodule_id')
          .eq('status', 'published'),
      ]);

      if (modulesRes.error) throw modulesRes.error;
      if (submodulesRes.error) throw submodulesRes.error;
      if (articlesRes.error) throw articlesRes.error;

      const moduleSubCount: Record<string, number> = {};
      const moduleArticleCount: Record<string, number> = {};
      const submoduleToModule: Record<string, string> = {};

      for (const sub of submodulesRes.data || []) {
        submoduleToModule[sub.id] = sub.module_id;
        moduleSubCount[sub.module_id] = (moduleSubCount[sub.module_id] || 0) + 1;
      }

      for (const art of articlesRes.data || []) {
        const moduleId = submoduleToModule[art.submodule_id];
        if (!moduleId) continue;
        moduleArticleCount[moduleId] = (moduleArticleCount[moduleId] || 0) + 1;
      }

      const modulesWithCounts: Module[] = (modulesRes.data || []).map((mod) => ({
        ...mod,
        icon: mod.icon || 'BookOpen',
        color: mod.color || 'primary',
        subModulesCount: moduleSubCount[mod.id] || 0,
        articlesCount: moduleArticleCount[mod.id] || 0,
      }));

      setModules(modulesWithCounts);

      // Fetch popular articles
      const { data: articlesData, error: articlesError } = await supabase
        .from('docs_articles')
        .select(`
          id, slug, title, description, views_count,
          submodule:docs_submodules(
            slug,
            module:docs_modules(slug)
          )
        `)
        .eq('status', 'published')
        .order('views_count', { ascending: false })
        .limit(4);

      if (!articlesError && articlesData) {
        const articles: PopularArticle[] = articlesData.map((a: any) => ({
          id: a.id,
          slug: a.slug,
          title: a.title,
          description: a.description,
          views_count: a.views_count,
          moduleSlug: a.submodule?.module?.slug || '',
          subModuleSlug: a.submodule?.slug || '',
        }));
        setPopularArticles(articles);
      }
    } catch (error) {
      console.error('Error fetching home data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get portal card based on user type
  const getPortalCard = () => {
    if (userType === 'admin') {
      return (
        <Link
          to="/admin"
          className="docs-card flex items-center gap-4 p-6 group border-red-200 bg-red-50/50"
        >
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-red-100 text-red-600 group-hover:scale-110 transition-transform">
            <Shield className="h-7 w-7" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold group-hover:text-red-600 transition-colors">
              لوحة التحكم
            </h3>
            <p className="text-sm text-muted-foreground">
              إدارة النظام
            </p>
          </div>
          <ArrowLeft className="h-5 w-5 text-muted-foreground group-hover:text-red-600 group-hover:-translate-x-1 transition-all" />
        </Link>
      );
    }

    if (userType === 'staff') {
      return (
        <Link
          to="/staff"
          className="docs-card flex items-center gap-4 p-6 group border-blue-200 bg-blue-50/50"
        >
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-100 text-blue-600 group-hover:scale-110 transition-transform">
            <Users className="h-7 w-7" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold group-hover:text-blue-600 transition-colors">
              بوابة الموظفين
            </h3>
            <p className="text-sm text-muted-foreground">
              مهامي ودعم العملاء
            </p>
          </div>
          <ArrowLeft className="h-5 w-5 text-muted-foreground group-hover:text-blue-600 group-hover:-translate-x-1 transition-all" />
        </Link>
      );
    }

    if (userType === 'client') {
      return (
        <Link
          to="/portal"
          className="docs-card flex items-center gap-4 p-6 group border-green-200 bg-green-50/50"
        >
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-green-100 text-green-600 group-hover:scale-110 transition-transform">
            <Building2 className="h-7 w-7" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold group-hover:text-green-600 transition-colors">
              بوابة العملاء
            </h3>
            <p className="text-sm text-muted-foreground">
              إدارة حسابك
            </p>
          </div>
          <ArrowLeft className="h-5 w-5 text-muted-foreground group-hover:text-green-600 group-hover:-translate-x-1 transition-all" />
        </Link>
      );
    }

    // Not logged in - show client portal login
    return (
      <Link
        to="/portal-login"
        className="docs-card flex items-center gap-4 p-6 group border-primary/20"
      >
        <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 text-primary group-hover:scale-110 transition-transform">
          <Building2 className="h-7 w-7" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold group-hover:text-primary transition-colors">
            بوابة العملاء
          </h3>
          <p className="text-sm text-muted-foreground">
            دخول عملاء ويبيان
          </p>
        </div>
        <ArrowLeft className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:-translate-x-1 transition-all" />
      </Link>
    );
  };

  return (
    <DocsLayout>
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl docs-hero-section mb-12 px-6 py-16 lg:py-20">
        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <div className="flex justify-center mb-6">
            <img
              src={webyanLogo}
              alt="ويبيان"
              className="h-12 brightness-0 invert"
            />
          </div>

          <h1 className="text-3xl lg:text-5xl font-bold text-white mb-4">
            دليل استخدام لوحة التحكم
          </h1>

          <p className="text-lg text-white/80 mb-8">
            كل ما تحتاجه لإدارة موقعك باحترافية. دليل شامل ومنظم لجميع ميزات منصة ويبيان.
          </p>

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto">
            <SearchBar variant="hero" />
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-64 h-64 bg-white/5 rounded-full -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-white/5 rounded-full translate-x-1/3 translate-y-1/2" />
      </section>

      {/* Quick Start */}
      <section className="mb-12">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            to="/getting-started"
            className="docs-card flex items-center gap-4 p-6 group"
          >
            <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-secondary/20 text-secondary group-hover:scale-110 transition-transform">
              <Rocket className="h-7 w-7" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold group-hover:text-primary transition-colors">
                ابدأ هنا
              </h3>
              <p className="text-sm text-muted-foreground">
                دليل البداية السريعة
              </p>
            </div>
            <ArrowLeft className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:-translate-x-1 transition-all" />
          </Link>

          <Link
            to="/changelog"
            className="docs-card flex items-center gap-4 p-6 group"
          >
            <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 text-primary group-hover:scale-110 transition-transform">
              <Clock className="h-7 w-7" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold group-hover:text-primary transition-colors">
                التحديثات
              </h3>
              <p className="text-sm text-muted-foreground">
                آخر الميزات الجديدة
              </p>
            </div>
            <ArrowLeft className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:-translate-x-1 transition-all" />
          </Link>

          <Link
            to="/submit-ticket"
            className="docs-card flex items-center gap-4 p-6 group"
          >
            <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-orange-100 text-orange-600 group-hover:scale-110 transition-transform">
              <Ticket className="h-7 w-7" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold group-hover:text-primary transition-colors">
                طلب دعم
              </h3>
              <p className="text-sm text-muted-foreground">
                إبلاغ عن مشكلة
              </p>
            </div>
            <ArrowLeft className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:-translate-x-1 transition-all" />
          </Link>

          {getPortalCard()}
        </div>
      </section>

      {/* Popular Articles */}
      {popularArticles.length > 0 && (
        <section className="mb-12">
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp className="h-5 w-5 text-secondary" />
            <h2 className="text-xl font-semibold">الأكثر زيارة</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {popularArticles.map((article) => (
              <Link
                key={article.id}
                to={`/docs/${article.moduleSlug}/${article.subModuleSlug}/${article.slug}`}
                className="docs-card p-4 group"
              >
                <h3 className="font-medium group-hover:text-primary transition-colors mb-1">
                  {article.title}
                </h3>
                {article.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {article.description}
                  </p>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Modules Grid */}
      <section>
        <div className="flex items-center gap-2 mb-6">
          <BookOpen className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">استكشف الأقسام</h2>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : modules.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">لا توجد وحدات منشورة بعد</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {modules.map((module) => (
                <ModuleCard
                  key={module.id}
                  module={{
                    id: module.id,
                    slug: module.slug,
                    title: module.title,
                    description: module.description || '',
                    icon: module.icon,
                    color: module.color,
                    subModules: [],
                    subModulesCount: module.subModulesCount,
                    articlesCount: module.articlesCount,
                  }}
                />
            ))}
          </div>
        )}
      </section>
    </DocsLayout>
  );
}
