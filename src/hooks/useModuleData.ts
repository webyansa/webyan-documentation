import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Article {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  difficulty: string | null;
  views_count: number | null;
}

export interface SubModule {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  icon: string;
  articles: Article[];
}

export interface Module {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  icon: string;
  color: string | null;
  subModules: SubModule[];
}

export function useModuleData(moduleSlug: string | undefined) {
  const [module, setModule] = useState<Module | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchModuleData = useCallback(async () => {
    if (!moduleSlug) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch module by slug
      const { data: moduleData, error: moduleError } = await supabase
        .from('docs_modules')
        .select('id, slug, title, description, icon, color')
        .eq('slug', moduleSlug)
        .eq('is_published', true)
        .single();

      if (moduleError) {
        if (moduleError.code === 'PGRST116') {
          setModule(null);
          return;
        }
        throw moduleError;
      }

      // Fetch submodules for this module
      const { data: submodulesData, error: submodulesError } = await supabase
        .from('docs_submodules')
        .select('id, slug, title, description, icon')
        .eq('module_id', moduleData.id)
        .eq('is_published', true)
        .order('sort_order');

      if (submodulesError) throw submodulesError;

      // Fetch articles for all submodules
      const submoduleIds = (submodulesData || []).map(s => s.id);
      
      let articlesData: any[] = [];
      if (submoduleIds.length > 0) {
        const { data, error: articlesError } = await supabase
          .from('docs_articles')
          .select('id, slug, title, description, difficulty, views_count, submodule_id')
          .in('submodule_id', submoduleIds)
          .eq('status', 'published')
          .order('sort_order');

        if (articlesError) throw articlesError;
        articlesData = data || [];
      }

      // Build articles map by submodule
      const articlesBySubmodule = articlesData.reduce((acc, article) => {
        if (!acc[article.submodule_id]) acc[article.submodule_id] = [];
        acc[article.submodule_id].push({
          id: article.id,
          slug: article.slug,
          title: article.title,
          description: article.description,
          difficulty: article.difficulty,
          views_count: article.views_count,
        });
        return acc;
      }, {} as Record<string, Article[]>);

      // Build submodules with articles
      const subModulesWithArticles: SubModule[] = (submodulesData || []).map(sub => ({
        id: sub.id,
        slug: sub.slug,
        title: sub.title,
        description: sub.description,
        icon: sub.icon || 'FileText',
        articles: articlesBySubmodule[sub.id] || [],
      }));

      // Build final module object
      const moduleWithContent: Module = {
        id: moduleData.id,
        slug: moduleData.slug,
        title: moduleData.title,
        description: moduleData.description,
        icon: moduleData.icon || 'BookOpen',
        color: moduleData.color || 'primary',
        subModules: subModulesWithArticles,
      };

      setModule(moduleWithContent);
    } catch (err) {
      console.error('Error fetching module data:', err);
      setError('حدث خطأ في تحميل البيانات');
    } finally {
      setLoading(false);
    }
  }, [moduleSlug]);

  useEffect(() => {
    fetchModuleData();
  }, [fetchModuleData]);

  return { module, loading, error, refetch: fetchModuleData };
}
