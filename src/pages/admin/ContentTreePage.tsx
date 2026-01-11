import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { Plus, ChevronDown, ChevronLeft, FolderOpen, FileText, Edit, Trash2, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface Module {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  icon: string | null;
  sort_order: number;
  is_published: boolean;
  submodules: Submodule[];
}

interface Submodule {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  sort_order: number;
  is_published: boolean;
  articles_count: number;
}

export default function ContentTreePage() {
  const { isAdmin } = useAuth();
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [openModules, setOpenModules] = useState<string[]>([]);
  const [moduleDialogOpen, setModuleDialogOpen] = useState(false);
  const [submoduleDialogOpen, setSubmoduleDialogOpen] = useState(false);
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  const [newModuleTitle, setNewModuleTitle] = useState('');
  const [newModuleSlug, setNewModuleSlug] = useState('');
  const [newModuleDescription, setNewModuleDescription] = useState('');
  const [newSubmoduleTitle, setNewSubmoduleTitle] = useState('');
  const [newSubmoduleSlug, setNewSubmoduleSlug] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchModules();
  }, []);

  const fetchModules = async () => {
    try {
      const { data: modulesData, error: modulesError } = await supabase
        .from('docs_modules')
        .select('*')
        .order('sort_order');

      if (modulesError) throw modulesError;

      const modulesWithSubmodules: Module[] = [];

      for (const module of modulesData || []) {
        const { data: submodulesData, error: submodulesError } = await supabase
          .from('docs_submodules')
          .select('*')
          .eq('module_id', module.id)
          .order('sort_order');

        if (submodulesError) throw submodulesError;

        const submodulesWithCount: Submodule[] = [];

        for (const submodule of submodulesData || []) {
          const { count } = await supabase
            .from('docs_articles')
            .select('*', { count: 'exact', head: true })
            .eq('submodule_id', submodule.id);

          submodulesWithCount.push({
            ...submodule,
            articles_count: count || 0,
          });
        }

        modulesWithSubmodules.push({
          ...module,
          submodules: submodulesWithCount,
        });
      }

      setModules(modulesWithSubmodules);
    } catch (error) {
      console.error('Error fetching modules:', error);
      toast.error('حدث خطأ أثناء تحميل شجرة المحتوى');
    } finally {
      setLoading(false);
    }
  };

  const toggleModule = (moduleId: string) => {
    setOpenModules((prev) =>
      prev.includes(moduleId)
        ? prev.filter((id) => id !== moduleId)
        : [...prev, moduleId]
    );
  };

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\w\u0621-\u064A-]/g, '');
  };

  const handleAddModule = async () => {
    if (!newModuleTitle.trim()) {
      toast.error('يرجى إدخال عنوان الوحدة');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from('docs_modules').insert({
        title: newModuleTitle,
        slug: newModuleSlug || generateSlug(newModuleTitle),
        description: newModuleDescription || null,
        sort_order: modules.length,
      });

      if (error) throw error;

      toast.success('تم إضافة الوحدة بنجاح');
      setModuleDialogOpen(false);
      setNewModuleTitle('');
      setNewModuleSlug('');
      setNewModuleDescription('');
      fetchModules();
    } catch (error: any) {
      console.error('Error adding module:', error);
      if (error.code === '23505') {
        toast.error('هذا الرابط مستخدم بالفعل');
      } else {
        toast.error('حدث خطأ أثناء إضافة الوحدة');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleAddSubmodule = async () => {
    if (!newSubmoduleTitle.trim() || !selectedModuleId) {
      toast.error('يرجى إدخال عنوان القسم');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from('docs_submodules').insert({
        module_id: selectedModuleId,
        title: newSubmoduleTitle,
        slug: newSubmoduleSlug || generateSlug(newSubmoduleTitle),
        sort_order: 0,
      });

      if (error) throw error;

      toast.success('تم إضافة القسم بنجاح');
      setSubmoduleDialogOpen(false);
      setNewSubmoduleTitle('');
      setNewSubmoduleSlug('');
      setSelectedModuleId(null);
      fetchModules();
    } catch (error: any) {
      console.error('Error adding submodule:', error);
      if (error.code === '23505') {
        toast.error('هذا الرابط مستخدم بالفعل في هذه الوحدة');
      } else {
        toast.error('حدث خطأ أثناء إضافة القسم');
      }
    } finally {
      setSaving(false);
    }
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
          <h1 className="text-2xl font-bold">شجرة المحتوى</h1>
          <p className="text-muted-foreground">
            إدارة الوحدات والأقسام الفرعية
          </p>
        </div>
        <Dialog open={moduleDialogOpen} onOpenChange={setModuleDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              وحدة جديدة
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>إضافة وحدة جديدة</DialogTitle>
              <DialogDescription>
                أضف وحدة رئيسية جديدة لشجرة المحتوى
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>العنوان</Label>
                <Input
                  value={newModuleTitle}
                  onChange={(e) => setNewModuleTitle(e.target.value)}
                  placeholder="مثال: إدارة المحتوى"
                />
              </div>
              <div className="space-y-2">
                <Label>الرابط (Slug)</Label>
                <Input
                  value={newModuleSlug}
                  onChange={(e) => setNewModuleSlug(e.target.value)}
                  placeholder="مثال: content-management"
                  dir="ltr"
                />
              </div>
              <div className="space-y-2">
                <Label>الوصف (اختياري)</Label>
                <Input
                  value={newModuleDescription}
                  onChange={(e) => setNewModuleDescription(e.target.value)}
                  placeholder="وصف مختصر للوحدة"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setModuleDialogOpen(false)}>
                إلغاء
              </Button>
              <Button onClick={handleAddModule} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
                إضافة
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Content Tree */}
      <Card>
        <CardHeader>
          <CardTitle>الوحدات والأقسام</CardTitle>
          <CardDescription>
            {modules.length} وحدة رئيسية
          </CardDescription>
        </CardHeader>
        <CardContent>
          {modules.length === 0 ? (
            <div className="text-center py-12">
              <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">لا توجد وحدات بعد</p>
              <Button
                className="mt-4 gap-2"
                onClick={() => setModuleDialogOpen(true)}
              >
                <Plus className="h-4 w-4" />
                إضافة أول وحدة
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {modules.map((module) => (
                <Collapsible
                  key={module.id}
                  open={openModules.includes(module.id)}
                  onOpenChange={() => toggleModule(module.id)}
                >
                  <div className="border rounded-lg">
                    <CollapsibleTrigger className="flex items-center justify-between w-full p-4 hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-3">
                        {openModules.includes(module.id) ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronLeft className="h-4 w-4 text-muted-foreground" />
                        )}
                        <FolderOpen className="h-5 w-5 text-primary" />
                        <span className="font-medium">{module.title}</span>
                        <Badge variant="secondary" className="text-xs">
                          {module.submodules.length} قسم
                        </Badge>
                        {!module.is_published && (
                          <Badge variant="outline" className="text-xs">
                            مخفي
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedModuleId(module.id);
                            setSubmoduleDialogOpen(true);
                          }}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="border-t px-4 py-2 space-y-1">
                        {module.submodules.length === 0 ? (
                          <p className="text-sm text-muted-foreground py-2 pr-8">
                            لا توجد أقسام فرعية
                          </p>
                        ) : (
                          module.submodules.map((submodule) => (
                            <div
                              key={submodule.id}
                              className="flex items-center justify-between py-2 pr-8 hover:bg-muted/30 rounded transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <FileText className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm">{submodule.title}</span>
                                <Badge variant="outline" className="text-xs">
                                  {submodule.articles_count} مقال
                                </Badge>
                              </div>
                              <div className="flex items-center gap-1">
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <Edit className="h-3 w-3" />
                                </Button>
                                {isAdmin && (
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600">
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Submodule Dialog */}
      <Dialog open={submoduleDialogOpen} onOpenChange={setSubmoduleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>إضافة قسم فرعي</DialogTitle>
            <DialogDescription>
              أضف قسماً فرعياً جديداً للوحدة
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>العنوان</Label>
              <Input
                value={newSubmoduleTitle}
                onChange={(e) => setNewSubmoduleTitle(e.target.value)}
                placeholder="مثال: إدارة المقالات"
              />
            </div>
            <div className="space-y-2">
              <Label>الرابط (Slug)</Label>
              <Input
                value={newSubmoduleSlug}
                onChange={(e) => setNewSubmoduleSlug(e.target.value)}
                placeholder="مثال: articles"
                dir="ltr"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubmoduleDialogOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={handleAddSubmodule} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
              إضافة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
