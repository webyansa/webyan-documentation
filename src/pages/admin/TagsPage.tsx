import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Plus, Trash2, Loader2, Tags } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface Tag {
  id: string;
  name: string;
  slug: string;
  color: string;
}

const colorOptions = [
  { value: 'gray', label: 'رمادي', class: 'bg-gray-100 text-gray-700' },
  { value: 'red', label: 'أحمر', class: 'bg-red-100 text-red-700' },
  { value: 'orange', label: 'برتقالي', class: 'bg-orange-100 text-orange-700' },
  { value: 'yellow', label: 'أصفر', class: 'bg-yellow-100 text-yellow-700' },
  { value: 'green', label: 'أخضر', class: 'bg-green-100 text-green-700' },
  { value: 'blue', label: 'أزرق', class: 'bg-blue-100 text-blue-700' },
  { value: 'purple', label: 'بنفسجي', class: 'bg-purple-100 text-purple-700' },
  { value: 'pink', label: 'وردي', class: 'bg-pink-100 text-pink-700' },
];

export default function TagsPage() {
  const { isAdmin } = useAuth();
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagSlug, setNewTagSlug] = useState('');
  const [newTagColor, setNewTagColor] = useState('gray');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchTags();
  }, []);

  const fetchTags = async () => {
    try {
      const { data, error } = await supabase
        .from('docs_tags')
        .select('*')
        .order('name');

      if (error) throw error;
      setTags(data || []);
    } catch (error) {
      console.error('Error fetching tags:', error);
      toast.error('حدث خطأ أثناء تحميل الوسوم');
    } finally {
      setLoading(false);
    }
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\w\u0621-\u064A-]/g, '');
  };

  const handleAddTag = async () => {
    if (!newTagName.trim()) {
      toast.error('يرجى إدخال اسم الوسم');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from('docs_tags').insert({
        name: newTagName,
        slug: newTagSlug || generateSlug(newTagName),
        color: newTagColor,
      });

      if (error) throw error;

      toast.success('تم إضافة الوسم بنجاح');
      setDialogOpen(false);
      setNewTagName('');
      setNewTagSlug('');
      setNewTagColor('gray');
      fetchTags();
    } catch (error: any) {
      console.error('Error adding tag:', error);
      if (error.code === '23505') {
        toast.error('هذا الوسم موجود بالفعل');
      } else {
        toast.error('حدث خطأ أثناء إضافة الوسم');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTag = async (tagId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الوسم؟')) return;

    try {
      const { error } = await supabase
        .from('docs_tags')
        .delete()
        .eq('id', tagId);

      if (error) throw error;

      toast.success('تم حذف الوسم بنجاح');
      fetchTags();
    } catch (error) {
      console.error('Error deleting tag:', error);
      toast.error('حدث خطأ أثناء حذف الوسم');
    }
  };

  const getColorClass = (color: string) => {
    return colorOptions.find((c) => c.value === color)?.class || 'bg-gray-100 text-gray-700';
  };

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
          <h1 className="text-2xl font-bold">الوسوم</h1>
          <p className="text-muted-foreground">
            إدارة وسوم المقالات
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              وسم جديد
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>إضافة وسم جديد</DialogTitle>
              <DialogDescription>
                أضف وسماً جديداً لتصنيف المقالات
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>الاسم</Label>
                <Input
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  placeholder="مثال: متقدم"
                />
              </div>
              <div className="space-y-2">
                <Label>الرابط (Slug)</Label>
                <Input
                  value={newTagSlug}
                  onChange={(e) => setNewTagSlug(e.target.value)}
                  placeholder="مثال: advanced"
                  dir="ltr"
                />
              </div>
              <div className="space-y-2">
                <Label>اللون</Label>
                <div className="flex flex-wrap gap-2">
                  {colorOptions.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => setNewTagColor(color.value)}
                      className={`px-3 py-1 rounded-full text-sm transition-all ${color.class} ${
                        newTagColor === color.value
                          ? 'ring-2 ring-offset-2 ring-primary'
                          : ''
                      }`}
                    >
                      {color.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                إلغاء
              </Button>
              <Button onClick={handleAddTag} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
                إضافة
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tags Grid */}
      <Card>
        <CardHeader>
          <CardTitle>جميع الوسوم</CardTitle>
          <CardDescription>
            {tags.length} وسم
          </CardDescription>
        </CardHeader>
        <CardContent>
          {tags.length === 0 ? (
            <div className="text-center py-12">
              <Tags className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">لا توجد وسوم بعد</p>
              <Button
                className="mt-4 gap-2"
                onClick={() => setDialogOpen(true)}
              >
                <Plus className="h-4 w-4" />
                إضافة أول وسم
              </Button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-3">
              {tags.map((tag) => (
                <div
                  key={tag.id}
                  className="flex items-center gap-2 group"
                >
                  <Badge className={getColorClass(tag.color)}>
                    {tag.name}
                  </Badge>
                  {isAdmin && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-600"
                      onClick={() => handleDeleteTag(tag.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
