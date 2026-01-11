import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Article {
  id: string;
  title: string;
  slug: string;
  status: string;
}

export interface Submodule {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  sort_order: number;
  is_published: boolean;
  module_id: string;
  articles: Article[];
}

export interface Module {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  icon: string | null;
  sort_order: number;
  is_published: boolean;
  submodules: Submodule[];
}

export function useContentTree() {
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchModules = useCallback(async () => {
    try {
      // Fetch all data in parallel for better performance
      const [modulesRes, submodulesRes, articlesRes] = await Promise.all([
        supabase
          .from('docs_modules')
          .select('*')
          .order('sort_order'),
        supabase
          .from('docs_submodules')
          .select('*')
          .order('sort_order'),
        supabase
          .from('docs_articles')
          .select('id, title, slug, status, submodule_id')
          .order('sort_order'),
      ]);

      if (modulesRes.error) throw modulesRes.error;
      if (submodulesRes.error) throw submodulesRes.error;

      // Map articles to submodules
      const articlesBySubmodule = (articlesRes.data || []).reduce((acc, article) => {
        if (!acc[article.submodule_id]) acc[article.submodule_id] = [];
        acc[article.submodule_id].push(article);
        return acc;
      }, {} as Record<string, Article[]>);

      // Map submodules to modules with articles
      const submodulesByModule = (submodulesRes.data || []).reduce((acc, sub) => {
        if (!acc[sub.module_id]) acc[sub.module_id] = [];
        acc[sub.module_id].push({
          ...sub,
          articles: articlesBySubmodule[sub.id] || [],
        });
        return acc;
      }, {} as Record<string, Submodule[]>);

      // Build final structure
      const modulesWithContent = (modulesRes.data || []).map((mod) => ({
        ...mod,
        submodules: submodulesByModule[mod.id] || [],
      }));

      setModules(modulesWithContent);
    } catch (error) {
      console.error('Error fetching modules:', error);
      toast.error('حدث خطأ أثناء تحميل شجرة المحتوى');
    } finally {
      setLoading(false);
    }
  }, []);

  // Subscribe to realtime updates
  useEffect(() => {
    fetchModules();

    const modulesChannel = supabase
      .channel('content-tree-modules')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'docs_modules' },
        () => fetchModules()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'docs_submodules' },
        () => fetchModules()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(modulesChannel);
    };
  }, [fetchModules]);

  // Optimistic update helpers
  const addModuleOptimistic = (newModule: Module) => {
    setModules((prev) => [...prev, newModule]);
  };

  const updateModuleOptimistic = (id: string, updates: Partial<Module>) => {
    setModules((prev) =>
      prev.map((m) => (m.id === id ? { ...m, ...updates } : m))
    );
  };

  const deleteModuleOptimistic = (id: string) => {
    setModules((prev) => prev.filter((m) => m.id !== id));
  };

  const addSubmoduleOptimistic = (moduleId: string, newSubmodule: Submodule) => {
    setModules((prev) =>
      prev.map((m) =>
        m.id === moduleId
          ? { ...m, submodules: [...m.submodules, newSubmodule] }
          : m
      )
    );
  };

  const updateSubmoduleOptimistic = (id: string, updates: Partial<Submodule>) => {
    setModules((prev) =>
      prev.map((m) => ({
        ...m,
        submodules: m.submodules.map((s) =>
          s.id === id ? { ...s, ...updates } : s
        ),
      }))
    );
  };

  const deleteSubmoduleOptimistic = (id: string) => {
    setModules((prev) =>
      prev.map((m) => ({
        ...m,
        submodules: m.submodules.filter((s) => s.id !== id),
      }))
    );
  };

  const reorderModules = (newModules: Module[]) => {
    setModules(newModules);
  };

  const reorderSubmodules = (moduleId: string, newSubmodules: Submodule[]) => {
    setModules((prev) =>
      prev.map((m) =>
        m.id === moduleId ? { ...m, submodules: newSubmodules } : m
      )
    );
  };

  return {
    modules,
    loading,
    fetchModules,
    addModuleOptimistic,
    updateModuleOptimistic,
    deleteModuleOptimistic,
    addSubmoduleOptimistic,
    updateSubmoduleOptimistic,
    deleteSubmoduleOptimistic,
    reorderModules,
    reorderSubmodules,
  };
}
