import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Search, MoreHorizontal, Eye, Edit, Trash2, Loader2, Archive, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { toast } from 'sonner';

interface Article {
  id: string;
  title: string;
  slug: string;
  status: 'draft' | 'published' | 'archived';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  views_count: number;
  created_at: string;
  updated_at: string;
  submodule: {
    title: string;
    slug: string;
    module: {
      title: string;
      slug: string;
    };
  } | null;
}

export default function ArticlesPage() {
  const { isAdmin } = useAuth();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [articleToDelete, setArticleToDelete] = useState<Article | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchArticles();
  }, [statusFilter]);

  const fetchArticles = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('docs_articles')
        .select(`
          id,
          title,
          slug,
          status,
          difficulty,
          views_count,
          created_at,
          updated_at,
          submodule:docs_submodules(
            title,
            slug,
            module:docs_modules(title, slug)
          )
        `)
        .order('updated_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter as 'draft' | 'published' | 'archived');
      }

      const { data, error } = await query;

      if (error) throw error;
      setArticles((data as unknown as Article[]) || []);
    } catch (error) {
      console.error('Error fetching articles:', error);
      toast.error('حدث خطأ أثناء تحميل المقالات');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!articleToDelete) return;
    
    setDeleting(true);
    try {
      const { error } = await supabase
        .from('docs_articles')
        .delete()
        .eq('id', articleToDelete.id);

      if (error) throw error;

      toast.success('تم حذف المقال بنجاح');
      setArticles(prev => prev.filter(a => a.id !== articleToDelete.id));
    } catch (error) {
      console.error('Error deleting article:', error);
      toast.error('حدث خطأ أثناء حذف المقال');
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setArticleToDelete(null);
    }
  };

  const handleStatusChange = async (articleId: string, newStatus: 'draft' | 'published' | 'archived') => {
    try {
      const { error } = await supabase
        .from('docs_articles')
        .update({ 
          status: newStatus,
          published_at: newStatus === 'published' ? new Date().toISOString() : null
        })
        .eq('id', articleId);

      if (error) throw error;

      toast.success(
        newStatus === 'published' ? 'تم نشر المقال' :
        newStatus === 'archived' ? 'تم أرشفة المقال' :
        'تم إرجاع المقال للمسودة'
      );
      
      setArticles(prev => prev.map(a => 
        a.id === articleId ? { ...a, status: newStatus } : a
      ));
    } catch (error) {
      console.error('Error updating article status:', error);
      toast.error('حدث خطأ أثناء تحديث حالة المقال');
    }
  };

  const filteredArticles = articles.filter((article) =>
    article.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'published':
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">منشور</Badge>;
      case 'draft':
        return <Badge variant="secondary">مسودة</Badge>;
      case 'archived':
        return <Badge variant="outline">مؤرشف</Badge>;
      default:
        return null;
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

  const getArticlePreviewUrl = (article: Article) => {
    if (!article.submodule) return '#';
    return `/docs/${article.submodule.module?.slug}/${article.submodule.slug}/${article.slug}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">المقالات</h1>
          <p className="text-muted-foreground">
            إدارة مقالات الدليل ({articles.length} مقال)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={fetchArticles} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Link to="/admin/articles/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              مقال جديد
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">البحث والفلترة</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="ابحث في المقالات..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="الحالة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الحالات</SelectItem>
                <SelectItem value="published">منشور</SelectItem>
                <SelectItem value="draft">مسودة</SelectItem>
                <SelectItem value="archived">مؤرشف</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Articles Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredArticles.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">لا توجد مقالات</p>
              <Link to="/admin/articles/new">
                <Button className="mt-4 gap-2">
                  <Plus className="h-4 w-4" />
                  إضافة أول مقال
                </Button>
              </Link>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>العنوان</TableHead>
                  <TableHead>القسم</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>المستوى</TableHead>
                  <TableHead>المشاهدات</TableHead>
                  <TableHead>آخر تحديث</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredArticles.map((article) => (
                  <TableRow key={article.id}>
                    <TableCell>
                      <Link 
                        to={`/admin/articles/${article.id}`}
                        className="font-medium hover:text-primary transition-colors"
                      >
                        {article.title}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {article.submodule?.module?.title} / {article.submodule?.title}
                    </TableCell>
                    <TableCell>{getStatusBadge(article.status)}</TableCell>
                    <TableCell>{getDifficultyBadge(article.difficulty)}</TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Eye className="h-3 w-3" />
                        {article.views_count || 0}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {format(new Date(article.updated_at), 'dd MMM yyyy', { locale: ar })}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                          <DropdownMenuItem asChild>
                            <Link to={`/admin/articles/${article.id}`} className="flex items-center gap-2">
                              <Edit className="h-4 w-4" />
                              تعديل
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link to={getArticlePreviewUrl(article)} target="_blank" className="flex items-center gap-2">
                              <Eye className="h-4 w-4" />
                              معاينة
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {article.status !== 'published' && (
                            <DropdownMenuItem 
                              onClick={() => handleStatusChange(article.id, 'published')}
                              className="text-green-600"
                            >
                              <Eye className="h-4 w-4 ml-2" />
                              نشر
                            </DropdownMenuItem>
                          )}
                          {article.status === 'published' && (
                            <DropdownMenuItem 
                              onClick={() => handleStatusChange(article.id, 'draft')}
                            >
                              <RefreshCw className="h-4 w-4 ml-2" />
                              إرجاع للمسودة
                            </DropdownMenuItem>
                          )}
                          {article.status !== 'archived' && (
                            <DropdownMenuItem 
                              onClick={() => handleStatusChange(article.id, 'archived')}
                            >
                              <Archive className="h-4 w-4 ml-2" />
                              أرشفة
                            </DropdownMenuItem>
                          )}
                          {isAdmin && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                className="text-red-600"
                                onClick={() => {
                                  setArticleToDelete(article);
                                  setDeleteDialogOpen(true);
                                }}
                              >
                                <Trash2 className="h-4 w-4 ml-2" />
                                حذف
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>هل أنت متأكد من حذف هذا المقال؟</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم حذف المقال "{articleToDelete?.title}" نهائياً. لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}