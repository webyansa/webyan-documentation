import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useDraftPersistence } from '@/hooks/useDraftPersistence';
import { useUnsavedChangesWarning } from '@/hooks/useUnsavedChangesWarning';
import { DraftRestoreDialog } from '@/components/ui/draft-restore-dialog';
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
import { 
  ArrowRight, 
  Save, 
  Eye, 
  Loader2, 
  Plus, 
  X, 
  AlertCircle,
  RefreshCw,
  Copy,
  Check,
  Link as LinkIcon,
  CloudOff,
  Clock
} from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';
import RichTextEditor from '@/components/editor/RichTextEditor';
import { generateSlug } from '@/lib/slugify';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

// Validation schema - simplified
const articleSchema = z.object({
  title: z.string().trim().min(1, 'العنوان مطلوب').max(200, 'العنوان طويل جداً (الحد الأقصى 200 حرف)'),
  slug: z.string().trim().min(1, 'الرابط مطلوب').max(100, 'الرابط طويل جداً')
    .regex(/^[a-z0-9-]+$/, 'الرابط يجب أن يحتوي على أحرف إنجليزية صغيرة وأرقام وشرطات فقط'),
  submodule_id: z.string().uuid('يجب اختيار القسم'),
  status: z.enum(['draft', 'published', 'archived']),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
  description: z.string().max(500, 'الوصف طويل جداً (الحد الأقصى 500 حرف)').optional().nullable(),
  content: z.string().min(1, 'المحتوى مطلوب - لا يمكن حفظ مقال فارغ').optional().nullable(),
});

interface Module {
  id: string;
  title: string;
  slug: string;
  submodules: Submodule[];
}

interface Submodule {
  id: string;
  title: string;
  slug: string;
}

// Simplified form data - removed unnecessary fields
interface ArticleFormData {
  title: string;
  slug: string;
  submodule_id: string;
  status: 'draft' | 'published' | 'archived';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  description: string;
  content: string;
  warnings: string[];
  notes: string[];
}

const initialFormData: ArticleFormData = {
  title: '',
  slug: '',
  submodule_id: '',
  status: 'draft',
  difficulty: 'beginner',
  description: '',
  content: '',
  warnings: [],
  notes: [],
};

// Base URL for article preview
const DOCS_BASE_URL = 'https://docs.webyan.net/articles';

export default function ArticleEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isEditing = id && id !== 'new';
  
  // Draft persistence
  const {
    data: formData,
    setData: setFormData,
    isDirty,
    hasDraft,
    draftTimestamp,
    showRestorePrompt,
    restoreDraft,
    discardDraft,
    clearDraft,
    saveDraftNow,
    resetWithData,
  } = useDraftPersistence<ArticleFormData>(initialFormData, {
    key: 'article',
    entityId: isEditing ? id : null,
    debounceMs: 500,
  });

  // Warn before leaving with unsaved changes
  useUnsavedChangesWarning({
    isDirty,
    message: 'لديك تغييرات غير محفوظة في المقال',
    onSaveDraft: saveDraftNow,
  });
  
  const [modules, setModules] = useState<Module[]>([]);
  const [existingSlugs, setExistingSlugs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // New item inputs
  const [newWarning, setNewWarning] = useState('');
  const [newNote, setNewNote] = useState('');

  // Fetch all existing slugs for uniqueness check
  const fetchExistingSlugs = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('docs_articles')
        .select('slug, id');
      
      if (error) throw error;
      
      // Exclude current article's slug if editing
      const slugs = (data || [])
        .filter(article => !isEditing || article.id !== id)
        .map(article => article.slug);
      
      setExistingSlugs(slugs);
    } catch (error) {
      console.error('Error fetching slugs:', error);
    }
  }, [id, isEditing]);

  useEffect(() => {
    const init = async () => {
      await Promise.all([
        fetchModules(),
        fetchExistingSlugs(),
      ]);
      
      if (isEditing) {
        await fetchArticle();
      }
      setLoading(false);
    };
    
    init();
  }, [id, fetchExistingSlugs]);

  const fetchModules = async () => {
    try {
      const { data: modulesData, error: modulesError } = await supabase
        .from('docs_modules')
        .select('id, title, slug')
        .eq('is_published', true)
        .order('sort_order');

      if (modulesError) throw modulesError;

      const modulesWithSubmodules: Module[] = [];

      for (const module of modulesData || []) {
        const { data: submodulesData, error: submodulesError } = await supabase
          .from('docs_submodules')
          .select('id, title, slug')
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
        const loadedData: ArticleFormData = {
          title: data.title || '',
          slug: data.slug || '',
          submodule_id: data.submodule_id || '',
          status: data.status || 'draft',
          difficulty: data.difficulty || 'beginner',
          description: data.description || '',
          content: data.content || '',
          warnings: data.warnings || [],
          notes: data.notes || [],
        };
        
        // Reset with server data but don't clear draft (user might have newer changes)
        resetWithData(loadedData);
        // Mark slug as manually edited if article exists
        setSlugManuallyEdited(true);
      }
    } catch (error) {
      console.error('Error fetching article:', error);
      toast.error('حدث خطأ أثناء تحميل المقال');
      navigate('/admin/articles');
    }
  };

  // Auto-generate slug from title
  const handleTitleChange = (value: string) => {
    setFormData(prev => {
      const updated = { ...prev, title: value };
      
      // Only auto-generate if not manually edited
      if (!slugManuallyEdited) {
        updated.slug = generateSlug(value);
      }
      
      return updated;
    });
    
    if (errors.title) {
      setErrors(prev => ({ ...prev, title: '' }));
    }
  };

  // Manual slug edit
  const handleSlugChange = (value: string) => {
    // Clean the slug input
    const cleanSlug = value
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-');
    
    setFormData(prev => ({ ...prev, slug: cleanSlug }));
    setSlugManuallyEdited(true);
    
    if (errors.slug) {
      setErrors(prev => ({ ...prev, slug: '' }));
    }
  };

  // Regenerate slug from title
  const regenerateSlug = () => {
    const newSlug = generateSlug(formData.title);
    setFormData(prev => ({ ...prev, slug: newSlug }));
    setSlugManuallyEdited(false);
    toast.success('تم توليد الرابط تلقائياً');
  };

  // Copy full URL to clipboard
  const copyUrl = async () => {
    const fullUrl = `${DOCS_BASE_URL}/${formData.slug}`;
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      toast.success('تم نسخ الرابط');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('فشل نسخ الرابط');
    }
  };

  // Ensure slug uniqueness before save
  const getUniqueSlug = async (slug: string): Promise<string> => {
    let baseSlug = slug;
    let counter = 1;
    let uniqueSlug = slug;
    
    while (existingSlugs.includes(uniqueSlug)) {
      counter++;
      uniqueSlug = `${baseSlug}-${counter}`;
    }
    
    return uniqueSlug;
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
        
        // Show toast with first error
        const firstError = error.errors[0];
        if (firstError) {
          const fieldNames: Record<string, string> = {
            title: 'العنوان',
            slug: 'الرابط',
            submodule_id: 'القسم',
            content: 'المحتوى',
            description: 'الوصف',
          };
          const fieldName = fieldNames[firstError.path[0] as string] || firstError.path[0];
          toast.error(`خطأ في حقل "${fieldName}": ${firstError.message}`);
        }
      }
      return false;
    }
  };

  const handleSave = async (publish = false) => {
    // Basic validation
    if (!formData.title.trim()) {
      setErrors({ title: 'العنوان مطلوب' });
      toast.error('يجب إدخال عنوان المقال');
      return;
    }
    
    if (!formData.submodule_id) {
      setErrors({ submodule_id: 'يجب اختيار القسم' });
      toast.error('يجب اختيار القسم');
      return;
    }
    
    if (!formData.content?.trim()) {
      setErrors({ content: 'المحتوى مطلوب' });
      toast.error('لا يمكن حفظ مقال فارغ - يجب إضافة محتوى');
      return;
    }
    
    if (!validateForm()) {
      return;
    }

    setSaving(true);
    
    try {
      // Ensure slug is unique
      let finalSlug = formData.slug;
      if (!isEditing || formData.slug !== formData.slug) {
        finalSlug = await getUniqueSlug(formData.slug);
        if (finalSlug !== formData.slug) {
          setFormData(prev => ({ ...prev, slug: finalSlug }));
          toast.info(`تم تعديل الرابط ليصبح فريداً: ${finalSlug}`);
        }
      }
      
      const articleData = {
        title: formData.title.trim(),
        slug: finalSlug,
        submodule_id: formData.submodule_id,
        status: publish ? 'published' : formData.status,
        difficulty: formData.difficulty,
        description: formData.description?.trim() || null,
        content: formData.content?.trim() || null,
        warnings: formData.warnings.length > 0 ? formData.warnings : null,
        notes: formData.notes.length > 0 ? formData.notes : null,
        author_id: user?.id,
        published_at: publish ? new Date().toISOString() : null,
      };

      console.log('Saving article with data:', articleData);

      if (isEditing) {
        const { data, error } = await supabase
          .from('docs_articles')
          .update(articleData)
          .eq('id', id)
          .select('id')
          .single();

        if (error) {
          console.error('Update error:', error);
          throw error;
        }
        
        toast.success(publish ? 'تم نشر المقال بنجاح' : 'تم تحديث المقال بنجاح');
        
        // Clear draft after successful save
        clearDraft();
        
        // Stay on edit page
        if (data?.id) {
          navigate(`/admin/articles/${data.id}/edit`, { replace: true });
        }
      } else {
        const { data, error } = await supabase
          .from('docs_articles')
          .insert(articleData)
          .select('id')
          .single();

        if (error) {
          console.error('Insert error:', error);
          throw error;
        }
        
        toast.success(publish ? 'تم إنشاء ونشر المقال بنجاح' : 'تم إنشاء المقال بنجاح');
        
        // Clear draft after successful save
        clearDraft();
        
        // Redirect to edit page of new article
        if (data?.id) {
          navigate(`/admin/articles/${data.id}/edit`, { replace: true });
        }
      }
    } catch (error: any) {
      console.error('Error saving article:', error);
      
      // Handle specific errors
      if (error.code === '23505') {
        if (error.message?.includes('slug')) {
          setErrors({ slug: 'هذا الرابط مستخدم بالفعل، جرب رابطاً آخر' });
          toast.error('هذا الرابط مستخدم بالفعل');
        } else {
          toast.error('يوجد تعارض في البيانات، يرجى المحاولة مرة أخرى');
        }
      } else if (error.code === '23503') {
        setErrors({ submodule_id: 'القسم المحدد غير صالح' });
        toast.error('القسم المحدد غير موجود');
      } else if (error.code === '42501') {
        toast.error('ليس لديك صلاحية لحفظ المقالات');
      } else {
        toast.error(`حدث خطأ أثناء حفظ المقال: ${error.message || 'خطأ غير معروف'}`);
      }
    } finally {
      setSaving(false);
    }
  };

  const addArrayItem = (
    field: 'warnings' | 'notes',
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
    field: 'warnings' | 'notes',
    index: number
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index),
    }));
  };

  // Get preview URL based on selected submodule
  const getPreviewUrl = () => {
    if (!formData.submodule_id || !formData.slug) return null;
    
    // Find the module and submodule
    for (const module of modules) {
      const submodule = module.submodules.find(s => s.id === formData.submodule_id);
      if (submodule) {
        return `/docs/${module.slug}/${submodule.slug}/${formData.slug}`;
      }
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const previewUrl = getPreviewUrl();

  return (
    <div className="space-y-6">
      {/* Draft Restore Dialog */}
      <DraftRestoreDialog
        open={showRestorePrompt}
        onRestore={restoreDraft}
        onDiscard={discardDraft}
        draftTimestamp={draftTimestamp}
        entityType="مقال"
      />
      
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
            <div className="flex items-center gap-2">
              <p className="text-muted-foreground">
                {isEditing ? 'تعديل محتوى المقال' : 'إنشاء مقال جديد في دليل الاستخدام'}
              </p>
              {/* Draft Status Indicator */}
              {isDirty && (
                <Badge variant="outline" className="text-xs gap-1 text-yellow-600 border-yellow-300 bg-yellow-50">
                  <CloudOff className="h-3 w-3" />
                  تغييرات غير محفوظة
                </Badge>
              )}
              {hasDraft && draftTimestamp && !isDirty && (
                <Badge variant="outline" className="text-xs gap-1 text-blue-600 border-blue-300 bg-blue-50">
                  <Clock className="h-3 w-3" />
                  محفوظ محلياً {format(draftTimestamp, 'HH:mm', { locale: ar })}
                </Badge>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isEditing && previewUrl && (
            <Button variant="outline" size="sm" asChild>
              <a href={previewUrl} target="_blank" rel="noopener noreferrer">
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
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">العنوان *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="عنوان المقال (مثال: كيفية إدارة المستخدمين)"
                  className={errors.title ? 'border-destructive' : ''}
                />
                {errors.title && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.title}
                  </p>
                )}
              </div>

              {/* Slug with URL Preview */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="slug">الرابط (Slug) *</Label>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={regenerateSlug}
                      disabled={!formData.title}
                      className="h-7 text-xs"
                    >
                      <RefreshCw className="h-3 w-3 ml-1" />
                      توليد تلقائي
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={copyUrl}
                      disabled={!formData.slug}
                      className="h-7 text-xs"
                    >
                      {copied ? (
                        <Check className="h-3 w-3 ml-1 text-green-500" />
                      ) : (
                        <Copy className="h-3 w-3 ml-1" />
                      )}
                      نسخ
                    </Button>
                  </div>
                </div>
                <div className="relative">
                  <Input
                    id="slug"
                    value={formData.slug}
                    onChange={(e) => handleSlugChange(e.target.value)}
                    placeholder="article-slug"
                    dir="ltr"
                    className={`pl-8 ${errors.slug ? 'border-destructive' : ''}`}
                  />
                  <LinkIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                </div>
                {errors.slug && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.slug}
                  </p>
                )}
                {/* URL Preview */}
                {formData.slug && (
                  <div className="flex items-center gap-2 p-2 bg-muted rounded-md text-sm">
                    <span className="text-muted-foreground">الرابط الكامل:</span>
                    <code className="text-primary font-mono text-xs" dir="ltr">
                      {DOCS_BASE_URL}/{formData.slug}
                    </code>
                  </div>
                )}
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">الوصف (اختياري)</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="وصف مختصر يظهر في نتائج البحث..."
                  rows={2}
                  className={errors.description ? 'border-destructive' : ''}
                />
                {errors.description && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.description}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  {formData.description?.length || 0}/500 حرف
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Content */}
          <Card>
            <CardHeader>
              <CardTitle>المحتوى *</CardTitle>
              <CardDescription>محتوى المقال - استخدم شريط الأدوات للتنسيق</CardDescription>
            </CardHeader>
            <CardContent>
              <div className={errors.content ? 'ring-2 ring-destructive rounded-md' : ''}>
                <RichTextEditor
                  content={formData.content}
                  onChange={(content) => {
                    setFormData(prev => ({ ...prev, content }));
                    if (errors.content) {
                      setErrors(prev => ({ ...prev, content: '' }));
                    }
                  }}
                  placeholder="اكتب محتوى المقال هنا..."
                />
              </div>
              {errors.content && (
                <p className="text-sm text-destructive flex items-center gap-1 mt-2">
                  <AlertCircle className="h-3 w-3" />
                  {errors.content}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Additional Info - Only Warnings and Notes */}
          <Card>
            <CardHeader>
              <CardTitle>معلومات إضافية</CardTitle>
              <CardDescription>تحذيرات وملاحظات للقارئ (اختياري)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Warnings */}
              <div className="space-y-2">
                <Label>التحذيرات</Label>
                <div className="flex gap-2">
                  <Input
                    value={newWarning}
                    onChange={(e) => setNewWarning(e.target.value)}
                    placeholder="إضافة تحذير مهم للقارئ..."
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
                    placeholder="إضافة ملاحظة مفيدة..."
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
                        <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground bg-muted/50">
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
                    <SelectItem value="draft">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-yellow-500" />
                        مسودة
                      </div>
                    </SelectItem>
                    <SelectItem value="published">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-green-500" />
                        منشور
                      </div>
                    </SelectItem>
                    <SelectItem value="archived">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-gray-500" />
                        مؤرشف
                      </div>
                    </SelectItem>
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
                    <SelectItem value="beginner">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">مبتدئ</Badge>
                      </div>
                    </SelectItem>
                    <SelectItem value="intermediate">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">متوسط</Badge>
                      </div>
                    </SelectItem>
                    <SelectItem value="advanced">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">متقدم</Badge>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Quick Tips */}
          <Card>
            <CardHeader>
              <CardTitle>نصائح سريعة</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>• العنوان يُولّد الرابط تلقائياً</p>
              <p>• يمكنك تعديل الرابط يدوياً عند الحاجة</p>
              <p>• المحتوى مطلوب لحفظ المقال</p>
              <p>• اختر القسم المناسب للمقال</p>
              <p>• استخدم المحرر الغني لإضافة صور وفيديو</p>
            </CardContent>
          </Card>

          {/* Sticky Save Buttons on Mobile */}
          <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 bg-background border-t shadow-lg z-50">
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => handleSave(false)}
                disabled={saving}
                className="flex-1"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
                <Save className="h-4 w-4 ml-2" />
                حفظ كمسودة
              </Button>
              <Button onClick={() => handleSave(true)} disabled={saving} className="flex-1">
                {saving && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
                نشر
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
