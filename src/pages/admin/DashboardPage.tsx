import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  FileText,
  FolderTree,
  ThumbsUp,
  ThumbsDown,
  Eye,
  Search,
  AlertTriangle,
  Plus,
  TrendingUp,
  Users,
  Clock,
  Image,
  ArrowUpRight,
  BarChart3,
  Loader2,
} from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface Stats {
  totalArticles: number;
  publishedArticles: number;
  draftArticles: number;
  archivedArticles: number;
  totalModules: number;
  totalSubmodules: number;
  totalFeedback: number;
  helpfulFeedback: number;
  notHelpfulFeedback: number;
  totalSearches: number;
  openIssues: number;
  totalViews: number;
  totalMedia: number;
}

interface RecentArticle {
  id: string;
  title: string;
  status: string;
  views_count: number;
  updated_at: string;
}

interface TopSearch {
  query: string;
  count: number;
}

export default function DashboardPage() {
  const { isAdmin, user } = useAuth();
  const [stats, setStats] = useState<Stats>({
    totalArticles: 0,
    publishedArticles: 0,
    draftArticles: 0,
    archivedArticles: 0,
    totalModules: 0,
    totalSubmodules: 0,
    totalFeedback: 0,
    helpfulFeedback: 0,
    notHelpfulFeedback: 0,
    totalSearches: 0,
    openIssues: 0,
    totalViews: 0,
    totalMedia: 0,
  });
  const [recentArticles, setRecentArticles] = useState<RecentArticle[]>([]);
  const [topSearches, setTopSearches] = useState<TopSearch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Fetch articles count and views
        const { data: articles } = await supabase
          .from('docs_articles')
          .select('id, status, views_count');

        const totalArticles = articles?.length || 0;
        const publishedArticles = articles?.filter(a => a.status === 'published').length || 0;
        const draftArticles = articles?.filter(a => a.status === 'draft').length || 0;
        const archivedArticles = articles?.filter(a => a.status === 'archived').length || 0;
        const totalViews = articles?.reduce((sum, a) => sum + (a.views_count || 0), 0) || 0;

        // Fetch modules count
        const { count: totalModules } = await supabase
          .from('docs_modules')
          .select('*', { count: 'exact', head: true });

        const { count: totalSubmodules } = await supabase
          .from('docs_submodules')
          .select('*', { count: 'exact', head: true });

        // Fetch recent articles
        const { data: recentData } = await supabase
          .from('docs_articles')
          .select('id, title, status, views_count, updated_at')
          .order('updated_at', { ascending: false })
          .limit(5);

        setRecentArticles(recentData || []);

        // Fetch media count
        let mediaCount = 0;
        try {
          const { data: mediaData } = await supabase.storage
            .from('docs-media')
            .list('', { limit: 1000 });
          mediaCount = mediaData?.filter(f => f.name !== '.emptyFolderPlaceholder').length || 0;
        } catch (e) {
          console.log('No media bucket yet');
        }

        // Fetch feedback stats (admin only)
        let feedbackStats = { total: 0, helpful: 0, notHelpful: 0 };
        let searchCount = 0;
        let issuesCount = 0;

        if (isAdmin) {
          const { count: totalFeedback } = await supabase
            .from('docs_feedback')
            .select('*', { count: 'exact', head: true });

          const { count: helpfulFeedback } = await supabase
            .from('docs_feedback')
            .select('*', { count: 'exact', head: true })
            .eq('is_helpful', true);

          const { count: notHelpfulFeedback } = await supabase
            .from('docs_feedback')
            .select('*', { count: 'exact', head: true })
            .eq('is_helpful', false);

          const { count: totalSearches } = await supabase
            .from('docs_search_logs')
            .select('*', { count: 'exact', head: true });

          const { count: openIssues } = await supabase
            .from('docs_issue_reports')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'open');

          // Fetch top searches
          const { data: searchData } = await supabase
            .from('docs_search_logs')
            .select('query')
            .order('created_at', { ascending: false })
            .limit(100);

          if (searchData) {
            const searchCounts: Record<string, number> = {};
            searchData.forEach(s => {
              searchCounts[s.query] = (searchCounts[s.query] || 0) + 1;
            });
            const sorted = Object.entries(searchCounts)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 5)
              .map(([query, count]) => ({ query, count }));
            setTopSearches(sorted);
          }

          feedbackStats = {
            total: totalFeedback || 0,
            helpful: helpfulFeedback || 0,
            notHelpful: notHelpfulFeedback || 0,
          };
          searchCount = totalSearches || 0;
          issuesCount = openIssues || 0;
        }

        setStats({
          totalArticles,
          publishedArticles,
          draftArticles,
          archivedArticles,
          totalModules: totalModules || 0,
          totalSubmodules: totalSubmodules || 0,
          totalFeedback: feedbackStats.total,
          helpfulFeedback: feedbackStats.helpful,
          notHelpfulFeedback: feedbackStats.notHelpful,
          totalSearches: searchCount,
          openIssues: issuesCount,
          totalViews,
          totalMedia: mediaCount,
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [isAdmin]);

  const helpfulRate = stats.totalFeedback > 0 
    ? Math.round((stats.helpfulFeedback / stats.totalFeedback) * 100) 
    : 0;

  const publishedRate = stats.totalArticles > 0
    ? Math.round((stats.publishedArticles / stats.totalArticles) * 100)
    : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">لوحة التحكم</h1>
          <p className="text-muted-foreground">
            مرحباً بك في لوحة تحكم دليل ويبيان
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/admin/articles/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              مقال جديد
            </Button>
          </Link>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">المقالات</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalArticles}</div>
            <div className="flex gap-2 mt-2 flex-wrap">
              <Badge variant="default" className="text-xs bg-green-500">
                {stats.publishedArticles} منشور
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {stats.draftArticles} مسودة
              </Badge>
              {stats.archivedArticles > 0 && (
                <Badge variant="outline" className="text-xs">
                  {stats.archivedArticles} مؤرشف
                </Badge>
              )}
            </div>
            <Progress value={publishedRate} className="mt-3 h-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {publishedRate}% معدل النشر
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">المشاهدات</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalViews.toLocaleString('ar-EG')}</div>
            <p className="text-xs text-muted-foreground mt-1">
              إجمالي مشاهدات المقالات
            </p>
            <div className="flex items-center gap-1 mt-2 text-green-600 text-sm">
              <TrendingUp className="h-3 w-3" />
              <span>نشط</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">هيكل المحتوى</CardTitle>
            <FolderTree className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalModules}</div>
            <p className="text-xs text-muted-foreground mt-1">
              وحدة رئيسية
            </p>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline">{stats.totalSubmodules} قسم فرعي</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">الوسائط</CardTitle>
            <Image className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalMedia}</div>
            <p className="text-xs text-muted-foreground mt-1">
              ملف مرفوع
            </p>
            <Link to="/admin/media" className="text-primary text-sm flex items-center gap-1 mt-2 hover:underline">
              إدارة الوسائط
              <ArrowUpRight className="h-3 w-3" />
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Admin-only stats */}
      {isAdmin && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">معدل الإفادة</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{helpfulRate}%</div>
              <div className="flex gap-4 mt-2 text-sm">
                <span className="flex items-center gap-1 text-green-600">
                  <ThumbsUp className="h-4 w-4" />
                  {stats.helpfulFeedback}
                </span>
                <span className="flex items-center gap-1 text-red-600">
                  <ThumbsDown className="h-4 w-4" />
                  {stats.notHelpfulFeedback}
                </span>
              </div>
              <Progress value={helpfulRate} className="mt-3 h-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">عمليات البحث</CardTitle>
              <Search className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalSearches}</div>
              <p className="text-xs text-muted-foreground mt-1">
                إجمالي عمليات البحث
              </p>
              <Link to="/admin/search-logs" className="text-primary text-sm flex items-center gap-1 mt-2 hover:underline">
                عرض السجلات
                <ArrowUpRight className="h-3 w-3" />
              </Link>
            </CardContent>
          </Card>

          <Card className={stats.openIssues > 0 ? 'border-orange-200 bg-orange-50 dark:bg-orange-950/20' : ''}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">البلاغات المفتوحة</CardTitle>
              <AlertTriangle className={`h-4 w-4 ${stats.openIssues > 0 ? 'text-orange-500' : 'text-muted-foreground'}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.openIssues}</div>
              <p className="text-xs text-muted-foreground mt-1">
                بلاغ يحتاج مراجعة
              </p>
              {stats.openIssues > 0 && (
                <Link to="/admin/issues">
                  <Button size="sm" variant="outline" className="mt-2 w-full border-orange-300 text-orange-700 hover:bg-orange-100">
                    مراجعة البلاغات
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recent Activity & Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Recent Articles */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-muted-foreground" />
              آخر المقالات المحدثة
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentArticles.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                لا توجد مقالات حديثة
              </p>
            ) : (
              <div className="space-y-3">
                {recentArticles.map((article) => (
                  <Link
                    key={article.id}
                    to={`/admin/articles/${article.id}`}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium text-sm">{article.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(article.updated_at), 'dd MMM yyyy', { locale: ar })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          article.status === 'published'
                            ? 'default'
                            : article.status === 'draft'
                            ? 'secondary'
                            : 'outline'
                        }
                        className="text-xs"
                      >
                        {article.status === 'published'
                          ? 'منشور'
                          : article.status === 'draft'
                          ? 'مسودة'
                          : 'مؤرشف'}
                      </Badge>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        {article.views_count || 0}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">إجراءات سريعة</CardTitle>
            <CardDescription>الأعمال الأكثر شيوعاً</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link to="/admin/articles/new" className="block">
              <Button variant="outline" className="w-full justify-start gap-2">
                <Plus className="h-4 w-4" />
                إضافة مقال جديد
              </Button>
            </Link>
            <Link to="/admin/content-tree" className="block">
              <Button variant="outline" className="w-full justify-start gap-2">
                <FolderTree className="h-4 w-4" />
                إدارة شجرة المحتوى
              </Button>
            </Link>
            <Link to="/admin/media" className="block">
              <Button variant="outline" className="w-full justify-start gap-2">
                <Image className="h-4 w-4" />
                رفع صور جديدة
              </Button>
            </Link>
            <Link to="/admin/articles" className="block">
              <Button variant="outline" className="w-full justify-start gap-2">
                <FileText className="h-4 w-4" />
                إدارة المقالات
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Top Searches (Admin only) */}
      {isAdmin && topSearches.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Search className="h-5 w-5 text-muted-foreground" />
              أكثر عمليات البحث
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 md:grid-cols-5">
              {topSearches.map((search, index) => (
                <div
                  key={search.query}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted"
                >
                  <span className="text-sm font-medium truncate">{search.query}</span>
                  <Badge variant="secondary">{search.count}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
