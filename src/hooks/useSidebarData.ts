import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SidebarArticle {
  id: string;
  slug: string;
  title: string;
}

export interface SidebarSubModule {
  id: string;
  slug: string;
  title: string;
  icon: string;
  articles: SidebarArticle[];
}

export interface SidebarModule {
  id: string;
  slug: string;
  title: string;
  icon: string;
  subModules: SidebarSubModule[];
}

export function useSidebarData() {
  const [modules, setModules] = useState<SidebarModule[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSidebarData = useCallback(async () => {
    try {
      // Fetch all data in a single parallel call for maximum performance
      const [modulesRes, submodulesRes, articlesRes] = await Promise.all([
        supabase
          .from('docs_modules')
          .select('id, slug, title, icon')
          .eq('is_published', true)
          .order('sort_order'),
        supabase
          .from('docs_submodules')
          .select('id, slug, title, icon, module_id')
          .eq('is_published', true)
          .order('sort_order'),
        supabase
          .from('docs_articles')
          .select('id, slug, title, submodule_id')
          .eq('status', 'published')
          .order('sort_order'),
      ]);

      if (modulesRes.error) throw modulesRes.error;
      if (submodulesRes.error) throw submodulesRes.error;

      // Build maps for fast lookup
      const articlesBySubmodule = (articlesRes.data || []).reduce((acc, article) => {
        if (!acc[article.submodule_id]) acc[article.submodule_id] = [];
        acc[article.submodule_id].push({
          id: article.id,
          slug: article.slug,
          title: article.title,
        });
        return acc;
      }, {} as Record<string, SidebarArticle[]>);

      const submodulesByModule = (submodulesRes.data || []).reduce((acc, sub) => {
        if (!acc[sub.module_id]) acc[sub.module_id] = [];
        acc[sub.module_id].push({
          id: sub.id,
          slug: sub.slug,
          title: sub.title,
          icon: sub.icon || 'FileText',
          articles: articlesBySubmodule[sub.id] || [],
        });
        return acc;
      }, {} as Record<string, SidebarSubModule[]>);

      const modulesWithContent = (modulesRes.data || []).map((mod) => ({
        id: mod.id,
        slug: mod.slug,
        title: mod.title,
        icon: mod.icon || 'BookOpen',
        subModules: submodulesByModule[mod.id] || [],
      }));

      setModules(modulesWithContent);
    } catch (error) {
      console.error('Error fetching sidebar data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSidebarData();

    // Subscribe to realtime updates for instant refresh
    const channel = supabase
      .channel('sidebar-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'docs_modules' },
        () => fetchSidebarData()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'docs_submodules' },
        () => fetchSidebarData()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'docs_articles' },
        () => fetchSidebarData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchSidebarData]);

  return { modules, loading };
}
