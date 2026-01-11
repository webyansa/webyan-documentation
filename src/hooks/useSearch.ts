import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SearchResult {
  id: string;
  title: string;
  description: string | null;
  type: 'module' | 'submodule' | 'article';
  slug: string;
  moduleSlug?: string;
  subModuleSlug?: string;
  relevance: number;
}

export function useSearch(query: string) {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setResults([]);
      return;
    }

    const searchTimeout = setTimeout(() => {
      performSearch(query);
    }, 300);

    return () => clearTimeout(searchTimeout);
  }, [query]);

  const performSearch = async (searchQuery: string) => {
    setLoading(true);
    try {
      const lowerQuery = searchQuery.toLowerCase();
      const results: SearchResult[] = [];

      // Search modules
      const { data: modules } = await supabase
        .from('docs_modules')
        .select('id, slug, title, description')
        .eq('is_published', true)
        .ilike('title', `%${searchQuery}%`);

      // Search submodules
      const { data: submodules } = await supabase
        .from('docs_submodules')
        .select('id, slug, title, description, module_id, module:docs_modules(slug)')
        .eq('is_published', true)
        .or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);

      // Search articles
      const { data: articles } = await supabase
        .from('docs_articles')
        .select(`
          id, slug, title, description, submodule_id,
          submodule:docs_submodules(
            slug,
            module:docs_modules(slug)
          )
        `)
        .eq('status', 'published')
        .or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,content.ilike.%${searchQuery}%`);

      // Process modules
      for (const mod of modules || []) {
        const titleMatch = mod.title.toLowerCase().includes(lowerQuery);
        results.push({
          id: mod.id,
          title: mod.title,
          description: mod.description,
          type: 'module',
          slug: mod.slug,
          relevance: titleMatch ? 3 : 1,
        });
      }

      // Process submodules
      for (const sub of submodules || []) {
        const titleMatch = sub.title.toLowerCase().includes(lowerQuery);
        results.push({
          id: sub.id,
          title: sub.title,
          description: sub.description,
          type: 'submodule',
          slug: sub.slug,
          moduleSlug: (sub.module as any)?.slug,
          relevance: titleMatch ? 2 : 1,
        });
      }

      // Process articles
      for (const art of articles || []) {
        const titleMatch = art.title.toLowerCase().includes(lowerQuery);
        results.push({
          id: art.id,
          title: art.title,
          description: art.description,
          type: 'article',
          slug: art.slug,
          moduleSlug: (art.submodule as any)?.module?.slug,
          subModuleSlug: (art.submodule as any)?.slug,
          relevance: titleMatch ? 3 : 1,
        });
      }

      // Sort by relevance
      results.sort((a, b) => b.relevance - a.relevance);
      setResults(results);

      // Log search
      await supabase.from('docs_search_logs').insert({
        query: searchQuery,
        results_count: results.length,
      });
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  return { results, loading };
}
