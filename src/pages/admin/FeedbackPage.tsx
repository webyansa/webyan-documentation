import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ThumbsUp, ThumbsDown, Loader2, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface Feedback {
  id: string;
  is_helpful: boolean;
  reason: string | null;
  comment: string | null;
  created_at: string;
  article: {
    title: string;
    slug: string;
  } | null;
}

export default function FeedbackPage() {
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, helpful: 0, notHelpful: 0 });

  useEffect(() => {
    fetchFeedback();
  }, []);

  const fetchFeedback = async () => {
    try {
      const { data, error } = await supabase
        .from('docs_feedback')
        .select(`
          id,
          is_helpful,
          reason,
          comment,
          created_at,
          article:docs_articles(title, slug)
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      
      const typedData = (data || []) as unknown as Feedback[];
      setFeedback(typedData);

      // Calculate stats
      const total = typedData.length;
      const helpful = typedData.filter((f) => f.is_helpful).length;
      setStats({
        total,
        helpful,
        notHelpful: total - helpful,
      });
    } catch (error) {
      console.error('Error fetching feedback:', error);
    } finally {
      setLoading(false);
    }
  };

  const helpfulRate = stats.total > 0 ? Math.round((stats.helpful / stats.total) * 100) : 0;

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
      <div>
        <h1 className="text-2xl font-bold">التقييمات</h1>
        <p className="text-muted-foreground">
          مراجعة تقييمات الزوار للمقالات
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">إجمالي التقييمات</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ThumbsUp className="h-4 w-4 text-green-500" />
              مفيد
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.helpful}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ThumbsDown className="h-4 w-4 text-red-500" />
              غير مفيد
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.notHelpful}</div>
          </CardContent>
        </Card>
      </div>

      {/* Rate Card */}
      <Card>
        <CardHeader>
          <CardTitle>معدل الإفادة</CardTitle>
          <CardDescription>نسبة التقييمات الإيجابية</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="text-4xl font-bold text-primary">{helpfulRate}%</div>
            <div className="flex-1 h-4 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 transition-all"
                style={{ width: `${helpfulRate}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Feedback Table */}
      <Card>
        <CardHeader>
          <CardTitle>آخر التقييمات</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {feedback.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">لا توجد تقييمات بعد</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>المقال</TableHead>
                  <TableHead>التقييم</TableHead>
                  <TableHead>السبب</TableHead>
                  <TableHead>التعليق</TableHead>
                  <TableHead>التاريخ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {feedback.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      {item.article?.title || 'مقال محذوف'}
                    </TableCell>
                    <TableCell>
                      {item.is_helpful ? (
                        <Badge className="bg-green-100 text-green-700 gap-1">
                          <ThumbsUp className="h-3 w-3" />
                          مفيد
                        </Badge>
                      ) : (
                        <Badge className="bg-red-100 text-red-700 gap-1">
                          <ThumbsDown className="h-3 w-3" />
                          غير مفيد
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {item.reason || '-'}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm max-w-xs truncate">
                      {item.comment || '-'}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {format(new Date(item.created_at), 'dd MMM yyyy', { locale: ar })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
