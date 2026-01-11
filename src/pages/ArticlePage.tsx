import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, Clock, Eye, AlertTriangle, CheckCircle, Info, HelpCircle, Loader2 } from "lucide-react";
import { DocsLayout } from "@/components/layout/DocsLayout";
import { Breadcrumb } from "@/components/docs/Breadcrumb";
import { TableOfContents } from "@/components/docs/TableOfContents";
import { FeedbackWidget } from "@/components/docs/FeedbackWidget";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

interface Article {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  objective: string | null;
  target_roles: string[] | null;
  prerequisites: string[] | null;
  content: string | null;
  steps: { title: string; content: string }[];
  notes: string[] | null;
  warnings: string[] | null;
  common_errors: { error: string; solution: string }[];
  faqs: { question: string; answer: string }[];
  difficulty: string;
  views_count: number;
  updated_at: string;
}

interface BreadcrumbItem {
  moduleTitle: string;
  moduleSlug: string;
  subModuleTitle: string;
  subModuleSlug: string;
}

export default function ArticlePage() {
  const { moduleSlug, subModuleSlug, articleSlug } = useParams();
  const [article, setArticle] = useState<Article | null>(null);
  const [breadcrumb, setBreadcrumb] = useState<BreadcrumbItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (moduleSlug && subModuleSlug && articleSlug) {
      fetchArticle();
    }
  }, [moduleSlug, subModuleSlug, articleSlug]);

  const fetchArticle = async () => {
    try {
      // Find the module
      const { data: moduleData } = await supabase
        .from('docs_modules')
        .select('id, slug, title')
        .eq('slug', moduleSlug)
        .maybeSingle();

      if (!moduleData) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      // Find the submodule
      const { data: subModuleData } = await supabase
        .from('docs_submodules')
        .select('id, slug, title')
        .eq('module_id', moduleData.id)
        .eq('slug', subModuleSlug)
        .maybeSingle();

      if (!subModuleData) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      // Find the article
      const { data: articleData, error } = await supabase
        .from('docs_articles')
        .select('*')
        .eq('submodule_id', subModuleData.id)
        .eq('slug', articleSlug)
        .eq('status', 'published')
        .maybeSingle();

      if (error || !articleData) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      // Increment views
      await supabase
        .from('docs_articles')
        .update({ views_count: (articleData.views_count || 0) + 1 })
        .eq('id', articleData.id);

      setArticle({
        ...articleData,
        steps: (articleData.steps as { title: string; content: string }[]) || [],
        common_errors: (articleData.common_errors as { error: string; solution: string }[]) || [],
        faqs: (articleData.faqs as { question: string; answer: string }[]) || [],
      });

      setBreadcrumb({
        moduleTitle: moduleData.title,
        moduleSlug: moduleData.slug,
        subModuleTitle: subModuleData.title,
        subModuleSlug: subModuleData.slug,
      });
    } catch (error) {
      console.error('Error fetching article:', error);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  const getDifficultyBadge = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner':
        return <Badge variant="outline" className="border-green-300 text-green-600">مبتدئ</Badge>;
      case 'intermediate':
        return <Badge variant="outline" className="border-yellow-300 text-yellow-600">متوسط</Badge>;
      case 'advanced':
        return <Badge variant="outline" className="border-red-300 text-red-600">متقدم</Badge>;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <DocsLayout>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DocsLayout>
    );
  }

  if (notFound || !article || !breadcrumb) {
    return (
      <DocsLayout>
        <div className="text-center py-24">
          <h1 className="text-2xl font-bold mb-4">المقال غير موجود</h1>
          <p className="text-muted-foreground mb-6">
            لم نتمكن من العثور على المقال المطلوب
          </p>
          <Link to="/" className="text-primary hover:underline">
            العودة للرئيسية
          </Link>
        </div>
      </DocsLayout>
    );
  }

  const tocItems = [
    ...(article.objective ? [{ id: 'objective', title: 'الهدف', level: 1 }] : []),
    ...(article.steps.length > 0 ? [{ id: 'steps', title: 'الخطوات', level: 1 }] : []),
    ...(article.notes && article.notes.length > 0 ? [{ id: 'notes', title: 'ملاحظات', level: 1 }] : []),
    ...(article.warnings && article.warnings.length > 0 ? [{ id: 'warnings', title: 'تنبيهات', level: 1 }] : []),
    ...(article.common_errors.length > 0 ? [{ id: 'errors', title: 'أخطاء شائعة', level: 1 }] : []),
    ...(article.faqs.length > 0 ? [{ id: 'faqs', title: 'أسئلة شائعة', level: 1 }] : []),
  ];

  return (
    <DocsLayout>
      <div className="max-w-6xl mx-auto">
        <div className="lg:grid lg:grid-cols-[1fr_250px] lg:gap-8">
          {/* Main Content */}
          <article className="min-w-0">
            {/* Breadcrumb */}
            <Breadcrumb
              items={[
                { label: breadcrumb.moduleTitle, href: `/docs/${breadcrumb.moduleSlug}` },
                { label: breadcrumb.subModuleTitle, href: `/docs/${breadcrumb.moduleSlug}/${breadcrumb.subModuleSlug}` },
                { label: article.title },
              ]}
              className="mb-6"
            />

            {/* Header */}
            <header className="mb-8">
              <div className="flex items-center gap-2 mb-3">
                {getDifficultyBadge(article.difficulty)}
                {article.target_roles && article.target_roles.length > 0 && (
                  article.target_roles.map((role) => (
                    <Badge key={role} variant="secondary" className="text-xs">
                      {role}
                    </Badge>
                  ))
                )}
              </div>

              <h1 className="text-3xl lg:text-4xl font-bold mb-4">{article.title}</h1>

              {article.description && (
                <p className="text-lg text-muted-foreground mb-4">
                  {article.description}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  آخر تحديث: {format(new Date(article.updated_at), 'dd MMMM yyyy', { locale: ar })}
                </span>
                <span className="flex items-center gap-1">
                  <Eye className="h-4 w-4" />
                  {article.views_count} مشاهدة
                </span>
              </div>
            </header>

            <Separator className="mb-8" />

            {/* Objective */}
            {article.objective && (
              <section id="objective" className="mb-8">
                <div className="docs-card p-6 bg-primary/5 border-primary/20">
                  <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
                    <Info className="h-5 w-5 text-primary" />
                    الهدف
                  </h2>
                  <p className="text-muted-foreground">{article.objective}</p>
                </div>
              </section>
            )}

            {/* Prerequisites */}
            {article.prerequisites && article.prerequisites.length > 0 && (
              <section className="mb-8">
                <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <div className="w-1 h-6 bg-primary rounded-full" />
                  المتطلبات المسبقة
                </h2>
                <ul className="space-y-2">
                  {article.prerequisites.map((prereq, i) => (
                    <li key={i} className="flex items-start gap-2 text-muted-foreground">
                      <CheckCircle className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                      {prereq}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Content */}
            {article.content && (
              <section className="mb-8 prose prose-lg max-w-none">
                <div 
                  className="text-foreground whitespace-pre-wrap"
                  dangerouslySetInnerHTML={{ 
                    __html: article.content
                      .replace(/^# (.+)$/gm, '<h2 class="text-xl font-bold mt-6 mb-3">$1</h2>')
                      .replace(/^## (.+)$/gm, '<h3 class="text-lg font-semibold mt-4 mb-2">$1</h3>')
                      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                      .replace(/^- (.+)$/gm, '<li class="mr-4 list-disc list-inside">$1</li>')
                      .replace(/\n/g, '<br/>')
                  }}
                />
              </section>
            )}

            {/* Steps */}
            {article.steps.length > 0 && (
              <section id="steps" className="mb-8">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <div className="w-1 h-6 bg-primary rounded-full" />
                  خطوات التنفيذ
                </h2>
                <div className="space-y-6">
                  {article.steps.map((step, index) => (
                    <div
                      key={index}
                      className="relative pr-12 pb-6 border-r-2 border-muted last:border-transparent last:pb-0"
                    >
                      <div className="absolute right-0 top-0 transform translate-x-1/2 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                        {index + 1}
                      </div>
                      <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                      <p className="text-muted-foreground">{step.content}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Notes */}
            {article.notes && article.notes.length > 0 && (
              <section id="notes" className="mb-8">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <div className="w-1 h-6 bg-blue-500 rounded-full" />
                  ملاحظات
                </h2>
                <div className="space-y-2">
                  {article.notes.map((note, i) => (
                    <div key={i} className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-200">
                      <Info className="h-5 w-5 shrink-0 mt-0.5" />
                      <p className="text-sm">{note}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Warnings */}
            {article.warnings && article.warnings.length > 0 && (
              <section id="warnings" className="mb-8">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <div className="w-1 h-6 bg-orange-500 rounded-full" />
                  تنبيهات
                </h2>
                <div className="space-y-2">
                  {article.warnings.map((warning, i) => (
                    <div key={i} className="flex items-start gap-2 p-3 rounded-lg bg-orange-50 text-orange-800 dark:bg-orange-950 dark:text-orange-200">
                      <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
                      <p className="text-sm">{warning}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Common Errors */}
            {article.common_errors.length > 0 && (
              <section id="errors" className="mb-8">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <div className="w-1 h-6 bg-red-500 rounded-full" />
                  أخطاء شائعة وحلولها
                </h2>
                <div className="space-y-3">
                  {article.common_errors.map((item, i) => (
                    <div key={i} className="docs-card overflow-hidden">
                      <div className="flex items-start gap-2 p-4 bg-red-50 dark:bg-red-950/30 border-b">
                        <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                        <span className="font-medium text-red-800 dark:text-red-200">{item.error}</span>
                      </div>
                      <div className="flex items-start gap-2 p-4 bg-green-50 dark:bg-green-950/30">
                        <CheckCircle className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                        <span className="text-green-800 dark:text-green-200">{item.solution}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* FAQs */}
            {article.faqs.length > 0 && (
              <section id="faqs" className="mb-8">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <div className="w-1 h-6 bg-purple-500 rounded-full" />
                  أسئلة شائعة
                </h2>
                <Accordion type="single" collapsible className="w-full">
                  {article.faqs.map((faq, i) => (
                    <AccordionItem key={i} value={`faq-${i}`}>
                      <AccordionTrigger className="text-right">
                        <div className="flex items-center gap-2">
                          <HelpCircle className="h-4 w-4 text-primary shrink-0" />
                          {faq.question}
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground pr-6">
                        {faq.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </section>
            )}

            <Separator className="my-8" />

            {/* Feedback */}
            <FeedbackWidget articleId={article.id} className="mb-8" />
          </article>

          {/* Sidebar - Table of Contents */}
          {tocItems.length > 0 && (
            <aside className="hidden lg:block">
              <div className="sticky top-24">
                <TableOfContents items={tocItems} />
              </div>
            </aside>
          )}
        </div>
      </div>
    </DocsLayout>
  );
}
