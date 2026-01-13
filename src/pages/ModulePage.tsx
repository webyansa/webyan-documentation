import { Link, useParams } from "react-router-dom";
import * as Icons from "lucide-react";
import { DocsLayout } from "@/components/layout/DocsLayout";
import { Breadcrumb } from "@/components/docs/Breadcrumb";
import { ArticleCard } from "@/components/docs/ArticleCard";
import { useModuleData } from "@/hooks/useModuleData";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

function getIcon(iconName: string) {
  const IconComponent = (Icons as any)[iconName];
  return IconComponent || Icons.FileText;
}

export default function ModulePage() {
  const { moduleSlug } = useParams();
  const { module, loading, error } = useModuleData(moduleSlug);

  if (loading) {
    return (
      <DocsLayout>
        <div className="max-w-4xl mx-auto">
          <Skeleton className="h-8 w-48 mb-6" />
          <div className="flex items-center gap-4 mb-10">
            <Skeleton className="w-16 h-16 rounded-2xl" />
            <div>
              <Skeleton className="h-8 w-64 mb-2" />
              <Skeleton className="h-4 w-96" />
            </div>
          </div>
          <div className="space-y-10">
            {[1, 2, 3].map((i) => (
              <div key={i}>
                <Skeleton className="h-6 w-48 mb-4" />
                <Skeleton className="h-32 w-full rounded-xl" />
              </div>
            ))}
          </div>
        </div>
      </DocsLayout>
    );
  }

  if (error || !module) {
    return (
      <DocsLayout>
        <div className="text-center py-20">
          <h1 className="text-2xl font-bold mb-4">القسم غير موجود</h1>
          <p className="text-muted-foreground mb-4">
            {error || "لم يتم العثور على هذا القسم"}
          </p>
          <Link to="/" className="text-primary hover:underline">
            العودة للصفحة الرئيسية
          </Link>
        </div>
      </DocsLayout>
    );
  }

  const IconComponent = getIcon(module.icon);

  return (
    <DocsLayout>
      <div className="max-w-4xl mx-auto">
        {/* Breadcrumb */}
        <Breadcrumb items={[{ label: module.title }]} className="mb-6" />

        {/* Header */}
        <header className="mb-10">
          <div className="flex items-center gap-4 mb-4">
            <div
              className={cn(
                "flex items-center justify-center w-16 h-16 rounded-2xl",
                module.color === "primary" && "bg-primary/10 text-primary",
                module.color === "secondary" && "bg-secondary/20 text-secondary",
                module.color === "accent" && "bg-accent/20 text-accent",
                !["primary", "secondary", "accent"].includes(module.color || "") && "bg-primary/10 text-primary"
              )}
            >
              <IconComponent className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                {module.title}
              </h1>
              <p className="text-muted-foreground">{module.description}</p>
            </div>
          </div>
        </header>

        {/* SubModules */}
        <div className="space-y-10">
          {module.subModules.length === 0 ? (
            <div className="p-8 rounded-xl border-2 border-dashed text-center">
              <p className="text-muted-foreground">
                لا توجد أقسام فرعية حالياً
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                سيتم إضافة المحتوى قريباً
              </p>
            </div>
          ) : (
            module.subModules.map((subModule) => {
              const SubIcon = getIcon(subModule.icon);

              return (
                <section key={subModule.id}>
                  <div className="flex items-center gap-3 mb-4">
                    <SubIcon className="h-5 w-5 text-muted-foreground" />
                    <h2 className="text-xl font-semibold">{subModule.title}</h2>
                  </div>

                  {subModule.articles.length > 0 ? (
                    <div className="grid gap-4">
                      {subModule.articles.map((article) => (
                        <ArticleCard
                          key={article.id}
                          article={{
                            id: article.id,
                            slug: article.slug,
                            title: article.title,
                            description: article.description || "",
                            objective: "",
                            targetRoles: [],
                            prerequisites: [],
                            steps: [],
                            notes: [],
                            warnings: [],
                            commonErrors: [],
                            faqs: [],
                            relatedArticles: [],
                            tags: article.difficulty ? [article.difficulty] : [],
                            lastUpdated: "",
                            author: "",
                            viewCount: article.views_count || 0,
                          }}
                          moduleSlug={module.slug}
                          subModuleSlug={subModule.slug}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 rounded-xl border-2 border-dashed text-center">
                      <p className="text-muted-foreground">
                        لا توجد مقالات حالياً في هذا القسم
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        سيتم إضافة المحتوى قريباً
                      </p>
                    </div>
                  )}
                </section>
              );
            })
          )}
        </div>
      </div>
    </DocsLayout>
  );
}
