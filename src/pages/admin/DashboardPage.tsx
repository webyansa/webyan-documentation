import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
} from 'lucide-react';

interface Stats {
  totalArticles: number;
  publishedArticles: number;
  draftArticles: number;
  totalModules: number;
  totalSubmodules: number;
  totalFeedback: number;
  helpfulFeedback: number;
  notHelpfulFeedback: number;
  totalSearches: number;
  openIssues: number;
}

export default function DashboardPage() {
  const { isAdmin, user } = useAuth();
  const [stats, setStats] = useState<Stats>({
    totalArticles: 0,
    publishedArticles: 0,
    draftArticles: 0,
    totalModules: 0,
    totalSubmodules: 0,
    totalFeedback: 0,
    helpfulFeedback: 0,
    notHelpfulFeedback: 0,
    totalSearches: 0,
    openIssues: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Fetch articles count
        const { count: totalArticles } = await supabase
          .from('docs_articles')
          .select('*', { count: 'exact', head: true });

        const { count: publishedArticles } = await supabase
          .from('docs_articles')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'published');

        const { count: draftArticles } = await supabase
          .from('docs_articles')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'draft');

        // Fetch modules count
        const { count: totalModules } = await supabase
          .from('docs_modules')
          .select('*', { count: 'exact', head: true });

        const { count: totalSubmodules } = await supabase
          .from('docs_submodules')
          .select('*', { count: 'exact', head: true });

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

          feedbackStats = {
            total: totalFeedback || 0,
            helpful: helpfulFeedback || 0,
            notHelpful: notHelpfulFeedback || 0,
          };
          searchCount = totalSearches || 0;
          issuesCount = openIssues || 0;
        }

        setStats({
          totalArticles: totalArticles || 0,
          publishedArticles: publishedArticles || 0,
          draftArticles: draftArticles || 0,
          totalModules: totalModules || 0,
          totalSubmodules: totalSubmodules || 0,
          totalFeedback: feedbackStats.total,
          helpfulFeedback: feedbackStats.helpful,
          notHelpfulFeedback: feedbackStats.notHelpful,
          totalSearches: searchCount,
          openIssues: issuesCount,
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

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">إجمالي المقالات</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalArticles}</div>
            <div className="flex gap-2 mt-1">
              <Badge variant="secondary" className="text-xs">
                {stats.publishedArticles} منشور
              </Badge>
              <Badge variant="outline" className="text-xs">
                {stats.draftArticles} مسودة
              </Badge>
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
              وحدة رئيسية • {stats.totalSubmodules} قسم فرعي
            </p>
          </CardContent>
        </Card>

        {isAdmin && (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">معدل الإفادة</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{helpfulRate}%</div>
                <div className="flex gap-2 mt-1 text-xs">
                  <span className="flex items-center gap-1 text-green-600">
                    <ThumbsUp className="h-3 w-3" />
                    {stats.helpfulFeedback}
                  </span>
                  <span className="flex items-center gap-1 text-red-600">
                    <ThumbsDown className="h-3 w-3" />
                    {stats.notHelpfulFeedback}
                  </span>
                </div>
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
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
                <FileText className="h-4 w-4" />
                رفع صور جديدة
              </Button>
            </Link>
          </CardContent>
        </Card>

        {isAdmin && stats.openIssues > 0 && (
          <Card className="border-orange-200 bg-orange-50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2 text-orange-700">
                <AlertTriangle className="h-5 w-5" />
                بلاغات تحتاج مراجعة
              </CardTitle>
              <CardDescription className="text-orange-600">
                {stats.openIssues} بلاغ مفتوح
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link to="/admin/issues">
                <Button variant="outline" className="w-full border-orange-300 text-orange-700 hover:bg-orange-100">
                  مراجعة البلاغات
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-muted-foreground" />
              آخر التحديثات
            </CardTitle>
            <CardDescription>
              سيتم عرض آخر التحديثات هنا
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground text-center py-4">
              لا توجد تحديثات حديثة
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
