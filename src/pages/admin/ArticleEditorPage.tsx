import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowRight, Save, Eye, Loader2, Plus, X, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';

// Validation schema
const articleSchema = z.object({
  title: z.string().trim().min(1, 'العنوان مطلوب').max(200, 'العنوان طويل جداً'),
  slug: z.string().trim().min(1, 'الرابط مطلوب').max(100, 'الرابط طويل جداً')
    .regex(/^[a-z0-9-]+$/, 'الرابط يجب أن يحتوي على أحرف إنجليزية صغيرة وأرقام وشرطات فقط'),
  submodule_id: z.string().uuid('يجب اختيار القسم'),
  status: z.enum(['draft', 'published', 'archived']),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
  description: z.string().max(500, 'الوصف طويل جداً').optional().nullable(),
  objective: z.string().max(500, 'الهدف طويل جداً').optional().nullable(),
  content: z.string().optional().nullable(),
});

interface Module {
  id: string;
  title: string;
  submodules: Submodule[];
}

interface Submodule {
  id: string;
  title: string;
}

interface ArticleFormData {
  title: string;
  slug: string;
  submodule_id: string;
  status: 'draft' | 'published' | 'archived';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  description: string;
  objective: string;
  content: string;
  prerequisites: string[];
  warnings: string[];
  notes: string[];
  target_roles: string[];
}

const initialFormData: ArticleFormData = {
  title: '',
  slug: '',
  submodule_id: '',
  status: 'draft',
  difficulty: 'beginner',
  description: '',
  objective: '',
  content: '',
  prerequisites: [],
  warnings: [],
  notes: [],
  target_roles: [],
};

export default function ArticleEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isEditing = id && id !== 'new';
  
  const [formData, setFormData] = useState<ArticleFormData>(initialFormData);
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // New item inputs
  const [newPrerequisite, setNewPrerequisite] = useState('');
  const [newWarning, setNewWarning] = useState('');
  const [newNote, setNewNote] = useState('');
  const [newRole, setNewRole] = useState('');

  useEffect(() => {
    fetchModules();
    if (isEditing) {
      fetchArticle();
    } else {
      setLoading(false);
    }
  }, [id]);

  const fetchModules = async () => {
    try {
      const { data: modulesData, error: modulesError } = await supabase
        .from('docs_modules')
        .select('id, title')
        .eq('is_published', true)
        .order('sort_order');

      if (modulesError) throw modulesError;

      const modulesWithSubmodules: Module[] = [];

      for (const module of modulesData || []) {
        const { data: submodulesData, error: submodulesError } = await supabase
          .from('docs_submodules')
          .select('id, title')
          .eq('module_id', module.id)
          .order('sort_order');

        if (submodulesError) throw submodulesError;

        modulesWithSubmodules.push({
          ...module,
          submodules: submodulesData || [],
        });
      }

      setModules(modulesWithSubmodules);
    } catch (error) {
      console.error('Error fetching modules:', error);
      toast.error('حدث خطأ أثناء تحميل الأقسام');
    }
  };

  const fetchArticle = async () => {
    try {
      const { data, error } = await supabase
        .from('docs_articles')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      if (data) {
        setFormData({
          title: data.title || '',
          slug: data.slug || '',
          submodule_id: data.submodule_id || '',
          status: data.status || 'draft',
          difficulty: data.difficulty || 'beginner',
          description: data.description || '',
          objective: data.objective || '',
          content: data.content || '',
          prerequisites: data.prerequisites || [],
          warnings: data.warnings || [],
          notes: data.notes || [],
          target_roles: data.target_roles || [],
        });
      }
    } catch (error) {
      console.error('Error fetching article:', error);
      toast.error('حدث خطأ أثناء تحميل المقال');
      navigate('/admin/articles');
    } finally {
      setLoading(false);
    }
  };

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[\u0621-\u064A]/g, '') // Remove Arabic letters
      .replace(/\s+/g, '-')
      .replace(/[^\w-]/g, '')
      .replace(/--+/g, '-')
      .trim();
  };

  const handleTitleChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      title: value,
      slug: prev.slug || generateSlug(value),
    }));
    if (errors.title) {
      setErrors(prev => ({ ...prev, title: '' }));
    }
  };

  const validateForm = (): boolean => {
    try {
      articleSchema.parse({
        title: formData.title,
        slug: formData.slug,
        submodule_id: formData.submodule_id,
        status: formData.status,
        difficulty: formData.difficulty,
        description: formData.description || null,
        objective: formData.objective || null,
        content: formData.content || null,
      });
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            newErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleSave = async (publish = false) => {
    if (!validateForm()) {
      toast.error('يرجى تصحيح الأخطاء');
      return;
    }

    setSaving(true);
    try {
      const articleData = {
        title: formData.title.trim(),
        slug: formData.slug.trim(),
        submodule_id: formData.submodule_id,
        status: publish ? 'published' : formData.status,
        difficulty: formData.difficulty,
        description: formData.description?.trim() || null,
        objective: formData.objective?.trim() || null,
        content: formData.content?.trim() || null,
        prerequisites: formData.prerequisites.length > 0 ? formData.prerequisites : null,
        warnings: formData.warnings.length > 0 ? formData.warnings : null,
        notes: formData.notes.length > 0 ? formData.notes : null,
        target_roles: formData.target_roles.length > 0 ? formData.target_roles : null,
        author_id: user?.id,
        published_at: publish ? new Date().toISOString() : null,
      };

      if (isEditing) {
        const { error } = await supabase
          .from('docs_articles')
          .update(articleData)
          .eq('id', id);

        if (error) throw error;
        toast.success('تم تحديث المقال بنجاح');
      } else {
        const { error } = await supabase
          .from('docs_articles')
          .insert(articleData);

        if (error) throw error;
        toast.success('تم إنشاء المقال بنجاح');
      }

      navigate('/admin/articles');
    } catch (error: any) {
      console.error('Error saving article:', error);
      if (error.code === '23505') {
        setErrors({ slug: 'هذا الرابط مستخدم بالفعل' });
        toast.error('هذا الرابط مستخدم بالفعل');
      } else {
        toast.error('حدث خطأ أثناء حفظ المقال');
      }
    } finally {
      setSaving(false);
    }
  };

  const addArrayItem = (
    field: 'prerequisites' | 'warnings' | 'notes' | 'target_roles',
    value: string,
    setter: (value: string) => void
  ) => {
    if (!value.trim()) return;
    setFormData(prev => ({
      ...prev,
      [field]: [...prev[field], value.trim()],
    }));
    setter('');
  };

  const removeArrayItem = (
    field: 'prerequisites' | 'warnings' | 'notes' | 'target_roles',
    index: number
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index),
    }));
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
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin/articles')}>
            <ArrowRight className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              {isEditing ? 'تعديل المقال' : 'مقال جديد'}
            </h1>
            <p className="text-muted-foreground">
              {isEditing ? 'تعديل محتوى المقال' : 'إنشاء مقال جديد'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isEditing && (
            <Button variant="outline" size="sm" asChild>
              <a href={`/docs/${formData.slug}`} target="_blank" rel="noopener noreferrer">
                <Eye className="h-4 w-4 ml-2" />
                معاينة
              </a>
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => handleSave(false)}
            disabled={saving}
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
            <Save className="h-4 w-4 ml-2" />
            حفظ كمسودة
          </Button>
          <Button onClick={() => handleSave(true)} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
            نشر
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle>المعلومات الأساسية</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">العنوان *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="عنوان المقال"
                  className={errors.title ? 'border-destructive' : ''}
                />
                {errors.title && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.title}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug">الرابط (Slug) *</Label>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, slug: e.target.value }));
                    if (errors.slug) setErrors(prev => ({ ...prev, slug: '' }));
                  }}
                  placeholder="article-slug"
                  dir="ltr"
                  className={errors.slug ? 'border-destructive' : ''}
                />
                {errors.slug && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.slug}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">الوصف</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="وصف مختصر للمقال..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="objective">الهدف</Label>
                <Textarea
                  id="objective"
                  value={formData.objective}
                  onChange={(e) => setFormData(prev => ({ ...prev, objective: e.target.value }))}
                  placeholder="ما الذي سيتعلمه القارئ من هذا المقال..."
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          {/* Content */}
          <Card>
            <CardHeader>
              <CardTitle>المحتوى</CardTitle>
              <CardDescription>محتوى المقال بتنسيق Markdown</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={formData.content}
                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                placeholder="اكتب محتوى المقال هنا..."
                rows={20}
                className="font-mono text-sm"
              />
            </CardContent>
          </Card>

          {/* Additional Info */}
          <Card>
            <CardHeader>
              <CardTitle>معلومات إضافية</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Prerequisites */}
              <div className="space-y-2">
                <Label>المتطلبات المسبقة</Label>
                <div className="flex gap-2">
                  <Input
                    value={newPrerequisite}
                    onChange={(e) => setNewPrerequisite(e.target.value)}
                    placeholder="إضافة متطلب..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addArrayItem('prerequisites', newPrerequisite, setNewPrerequisite);
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => addArrayItem('prerequisites', newPrerequisite, setNewPrerequisite)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.prerequisites.map((item, index) => (
                    <Badge key={index} variant="secondary" className="gap-1">
                      {item}
                      <button
                        type="button"
                        onClick={() => removeArrayItem('prerequisites', index)}
                        className="hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Warnings */}
              <div className="space-y-2">
                <Label>التحذيرات</Label>
                <div className="flex gap-2">
                  <Input
                    value={newWarning}
                    onChange={(e) => setNewWarning(e.target.value)}
                    placeholder="إضافة تحذير..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addArrayItem('warnings', newWarning, setNewWarning);
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => addArrayItem('warnings', newWarning, setNewWarning)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.warnings.map((item, index) => (
                    <Badge key={index} variant="destructive" className="gap-1">
                      {item}
                      <button
                        type="button"
                        onClick={() => removeArrayItem('warnings', index)}
                        className="hover:opacity-70"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Notes */}
              <div className="space-y-2">
                <Label>ملاحظات</Label>
                <div className="flex gap-2">
                  <Input
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="إضافة ملاحظة..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addArrayItem('notes', newNote, setNewNote);
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => addArrayItem('notes', newNote, setNewNote)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.notes.map((item, index) => (
                    <Badge key={index} variant="outline" className="gap-1">
                      {item}
                      <button
                        type="button"
                        onClick={() => removeArrayItem('notes', index)}
                        className="hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Target Roles */}
              <div className="space-y-2">
                <Label>الفئات المستهدفة</Label>
                <div className="flex gap-2">
                  <Input
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    placeholder="مثال: مدير المحتوى..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addArrayItem('target_roles', newRole, setNewRole);
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => addArrayItem('target_roles', newRole, setNewRole)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.target_roles.map((item, index) => (
                    <Badge key={index} className="gap-1 bg-primary/10 text-primary">
                      {item}
                      <button
                        type="button"
                        onClick={() => removeArrayItem('target_roles', index)}
                        className="hover:opacity-70"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Settings */}
          <Card>
            <CardHeader>
              <CardTitle>إعدادات المقال</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>القسم *</Label>
                <Select
                  value={formData.submodule_id}
                  onValueChange={(value) => {
                    setFormData(prev => ({ ...prev, submodule_id: value }));
                    if (errors.submodule_id) setErrors(prev => ({ ...prev, submodule_id: '' }));
                  }}
                >
                  <SelectTrigger className={errors.submodule_id ? 'border-destructive' : ''}>
                    <SelectValue placeholder="اختر القسم" />
                  </SelectTrigger>
                  <SelectContent>
                    {modules.map((module) => (
                      <div key={module.id}>
                        <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">
                          {module.title}
                        </div>
                        {module.submodules.map((submodule) => (
                          <SelectItem key={submodule.id} value={submodule.id}>
                            {submodule.title}
                          </SelectItem>
                        ))}
                      </div>
                    ))}
                  </SelectContent>
                </Select>
                {errors.submodule_id && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.submodule_id}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>الحالة</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: 'draft' | 'published' | 'archived') =>
                    setFormData(prev => ({ ...prev, status: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">مسودة</SelectItem>
                    <SelectItem value="published">منشور</SelectItem>
                    <SelectItem value="archived">مؤرشف</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>مستوى الصعوبة</Label>
                <Select
                  value={formData.difficulty}
                  onValueChange={(value: 'beginner' | 'intermediate' | 'advanced') =>
                    setFormData(prev => ({ ...prev, difficulty: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">مبتدئ</SelectItem>
                    <SelectItem value="intermediate">متوسط</SelectItem>
                    <SelectItem value="advanced">متقدم</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Quick Tips */}
          <Card>
            <CardHeader>
              <CardTitle>نصائح</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>• استخدم عناوين واضحة ومختصرة</p>
              <p>• أضف وصفاً يوضح محتوى المقال</p>
              <p>• حدد المتطلبات المسبقة للقارئ</p>
              <p>• اختر مستوى الصعوبة المناسب</p>
              <p>• يمكنك استخدام Markdown للتنسيق</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
