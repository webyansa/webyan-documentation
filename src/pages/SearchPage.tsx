import { useSearchParams, Link } from "react-router-dom";
import { Search, FileText, ArrowLeft, Folder, FolderOpen } from "lucide-react";
import { DocsLayout } from "@/components/layout/DocsLayout";
import { Breadcrumb } from "@/components/docs/Breadcrumb";
import { SearchBar } from "@/components/docs/SearchBar";
import { Badge } from "@/components/ui/badge";
import { useSearch } from "@/hooks/useSearch";

export default function SearchPage() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get("q") || "";
  const { results, loading } = useSearch(query);

  const getResultPath = (result: typeof results[0]) => {
    if (result.type === 'module') return `/docs/${result.slug}`;
    if (result.type === 'submodule') return `/docs/${result.moduleSlug}/${result.slug}`;
    return `/docs/${result.moduleSlug}/${result.subModuleSlug}/${result.slug}`;
  };

  const getResultIcon = (type: string) => {
    if (type === 'module') return <FolderOpen className="h-6 w-6 text-primary" />;
    if (type === 'submodule') return <Folder className="h-6 w-6 text-secondary" />;
    return <FileText className="h-6 w-6 text-muted-foreground" />;
  };

  return (
    <DocsLayout>
      <div className="max-w-4xl mx-auto">
        {/* Breadcrumb */}
        <Breadcrumb items={[{ label: "نتائج البحث" }]} className="mb-6" />

        {/* Search */}
        <div className="mb-8">
          <SearchBar variant="hero" />
        </div>

        {/* Results */}
        {query.trim() ? (
          <>
            <div className="mb-6">
              <p className="text-muted-foreground">
                {loading ? (
                  'جاري البحث...'
                ) : results.length > 0 ? (
                  <>
                    تم العثور على <span className="font-semibold text-foreground">{results.length}</span> نتيجة لـ "{query}"
                  </>
                ) : (
                  <>لم نجد نتائج لـ "{query}"</>
                )}
              </p>
            </div>

            {results.length > 0 ? (
              <div className="space-y-3">
                {results.map((result) => (
                  <Link
                    key={result.id}
                    to={getResultPath(result)}
                    className="docs-card block p-5 group hover:border-primary/50 transition-colors"
                  >
                    <div className="flex items-start gap-4">
                      <div className="mt-1">{getResultIcon(result.type)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-lg font-semibold group-hover:text-primary transition-colors">
                            {result.title}
                          </h3>
                          <Badge variant="secondary" className="text-xs">
                            {result.type === 'module' ? 'وحدة' : result.type === 'submodule' ? 'قسم فرعي' : 'مقال'}
                          </Badge>
                        </div>
                        {result.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {result.description}
                          </p>
                        )}
                      </div>
                      <ArrowLeft className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:-translate-x-1 transition-all mt-1" />
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 px-6 rounded-2xl bg-muted/50">
                <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h2 className="text-xl font-semibold mb-2">لم نجد نتائج</h2>
                <p className="text-muted-foreground mb-6">
                  جرب كلمات بحث مختلفة أو تصفح الأقسام
                </p>
                <Link
                  to="/"
                  className="inline-flex items-center gap-2 text-primary hover:underline"
                >
                  تصفح جميع الأقسام
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-16 px-6 rounded-2xl bg-muted/50">
            <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">ابحث في الدليل</h2>
            <p className="text-muted-foreground">
              أدخل كلمات البحث للعثور على المقالات والشروحات
            </p>
          </div>
        )}
      </div>
    </DocsLayout>
  );
}
