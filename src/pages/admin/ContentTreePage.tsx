import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Plus, ChevronDown, ChevronLeft, FolderOpen, FileText, Edit, Trash2, Loader2, Eye, EyeOff, GripVertical } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Article {
  id: string;
  title: string;
  slug: string;
  status: string;
}

interface Submodule {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  sort_order: number;
  is_published: boolean;
  articles: Article[];
}

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

// Sortable Module Item Component
function SortableModuleItem({
  module,
  openModules,
  toggleModule,
  openEditModuleDialog,
  setSelectedModule,
  setDeleteModuleDialogOpen,
  setSelectedModuleId,
  setSubmoduleDialogOpen,
  openEditSubmoduleDialog,
  setSelectedSubmodule,
  setDeleteSubmoduleDialogOpen,
  isAdmin,
  onSubmodulesReorder,
}: {
  module: Module;
  openModules: string[];
  toggleModule: (id: string) => void;
  openEditModuleDialog: (module: Module) => void;
  setSelectedModule: (module: Module | null) => void;
  setDeleteModuleDialogOpen: (open: boolean) => void;
  setSelectedModuleId: (id: string | null) => void;
  setSubmoduleDialogOpen: (open: boolean) => void;
  openEditSubmoduleDialog: (submodule: Submodule) => void;
  setSelectedSubmodule: (submodule: Submodule | null) => void;
  setDeleteSubmoduleDialogOpen: (open: boolean) => void;
  isAdmin: boolean;
  onSubmodulesReorder: (moduleId: string, submodules: Submodule[]) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: module.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleSubmoduleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = module.submodules.findIndex((s) => s.id === active.id);
      const newIndex = module.submodules.findIndex((s) => s.id === over.id);
      const newSubmodules = arrayMove(module.submodules, oldIndex, newIndex);
      onSubmodulesReorder(module.id, newSubmodules);
    }
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Collapsible
        open={openModules.includes(module.id)}
        onOpenChange={() => toggleModule(module.id)}
      >
        <div className="border rounded-lg">
          <CollapsibleTrigger className="flex items-center justify-between w-full p-4 hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-3">
              <button
                {...attributes}
                {...listeners}
                className="cursor-grab hover:text-primary p-1"
                onClick={(e) => e.stopPropagation()}
              >
                <GripVertical className="h-4 w-4 text-muted-foreground" />
              </button>
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
                <Badge variant="outline" className="text-xs gap-1">
                  <EyeOff className="h-3 w-3" />
                  مخفي
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => openEditModuleDialog(module)}
              >
                <Edit className="h-4 w-4" />
              </Button>
              {isAdmin && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => {
                    setSelectedModule(module);
                    setDeleteModuleDialogOpen(true);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
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
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleSubmoduleDragEnd}
                >
                  <SortableContext
                    items={module.submodules.map((s) => s.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {module.submodules.map((submodule) => (
                      <SortableSubmoduleItem
                        key={submodule.id}
                        submodule={submodule}
                        openEditSubmoduleDialog={openEditSubmoduleDialog}
                        setSelectedSubmodule={setSelectedSubmodule}
                        setDeleteSubmoduleDialogOpen={setDeleteSubmoduleDialogOpen}
                        isAdmin={isAdmin}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
              )}
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>
    </div>
  );
}

// Sortable Submodule Item Component
function SortableSubmoduleItem({
  submodule,
  openEditSubmoduleDialog,
  setSelectedSubmodule,
  setDeleteSubmoduleDialogOpen,
  isAdmin,
}: {
  submodule: Submodule;
  openEditSubmoduleDialog: (submodule: Submodule) => void;
  setSelectedSubmodule: (submodule: Submodule | null) => void;
  setDeleteSubmoduleDialogOpen: (open: boolean) => void;
  isAdmin: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: submodule.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="space-y-1">
      <div className="flex items-center justify-between py-2 pr-4 hover:bg-muted/30 rounded transition-colors">
        <div className="flex items-center gap-3">
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab hover:text-primary p-1"
          >
            <GripVertical className="h-3 w-3 text-muted-foreground" />
          </button>
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{submodule.title}</span>
          <Badge variant="outline" className="text-xs">
            {submodule.articles.length} مقال
          </Badge>
          {!submodule.is_published && (
            <Badge variant="outline" className="text-xs gap-1">
              <EyeOff className="h-3 w-3" />
              مخفي
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => openEditSubmoduleDialog(submodule)}
          >
            <Edit className="h-3 w-3" />
          </Button>
          {isAdmin && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={() => {
                setSelectedSubmodule(submodule);
                setDeleteSubmoduleDialogOpen(true);
              }}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
      {/* Articles List */}
      {submodule.articles.length > 0 && (
        <div className="pr-12 space-y-1">
          {submodule.articles.map((article) => (
            <Link
              key={article.id}
              to={`/admin/articles/${article.id}`}
              className="flex items-center justify-between py-1.5 px-3 rounded hover:bg-muted/50 transition-colors text-sm"
            >
              <span className="text-muted-foreground">{article.title}</span>
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
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ContentTreePage() {
  const { isAdmin } = useAuth();
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [openModules, setOpenModules] = useState<string[]>([]);
  
  // Module dialogs
  const [moduleDialogOpen, setModuleDialogOpen] = useState(false);
  const [editModuleDialogOpen, setEditModuleDialogOpen] = useState(false);
  const [deleteModuleDialogOpen, setDeleteModuleDialogOpen] = useState(false);
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);
  
  // Submodule dialogs
  const [submoduleDialogOpen, setSubmoduleDialogOpen] = useState(false);
  const [editSubmoduleDialogOpen, setEditSubmoduleDialogOpen] = useState(false);
  const [deleteSubmoduleDialogOpen, setDeleteSubmoduleDialogOpen] = useState(false);
  const [selectedSubmodule, setSelectedSubmodule] = useState<Submodule | null>(null);
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  
  // Form states
  const [newModuleTitle, setNewModuleTitle] = useState('');
  const [newModuleSlug, setNewModuleSlug] = useState('');
  const [newModuleDescription, setNewModuleDescription] = useState('');
  const [newModulePublished, setNewModulePublished] = useState(true);
  
  const [newSubmoduleTitle, setNewSubmoduleTitle] = useState('');
  const [newSubmoduleSlug, setNewSubmoduleSlug] = useState('');
  const [newSubmoduleDescription, setNewSubmoduleDescription] = useState('');
  const [newSubmodulePublished, setNewSubmodulePublished] = useState(true);
  
  const [saving, setSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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

        const submodulesWithArticles: Submodule[] = [];

        for (const submodule of submodulesData || []) {
          const { data: articlesData } = await supabase
            .from('docs_articles')
            .select('id, title, slug, status')
            .eq('submodule_id', submodule.id)
            .order('sort_order');

          submodulesWithArticles.push({
            ...submodule,
            articles: articlesData || [],
          });
        }

        modulesWithSubmodules.push({
          ...module,
          submodules: submodulesWithArticles,
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

  // Handle module drag end
  const handleModuleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = modules.findIndex((m) => m.id === active.id);
      const newIndex = modules.findIndex((m) => m.id === over.id);
      const newModules = arrayMove(modules, oldIndex, newIndex);
      setModules(newModules);

      // Update sort_order in database
      try {
        for (let i = 0; i < newModules.length; i++) {
          await supabase
            .from('docs_modules')
            .update({ sort_order: i })
            .eq('id', newModules[i].id);
        }
        toast.success('تم تحديث ترتيب الوحدات');
      } catch (error) {
        console.error('Error updating module order:', error);
        toast.error('حدث خطأ أثناء تحديث الترتيب');
        fetchModules();
      }
    }
  };

  // Handle submodules reorder
  const handleSubmodulesReorder = async (moduleId: string, newSubmodules: Submodule[]) => {
    setModules((prev) =>
      prev.map((m) =>
        m.id === moduleId ? { ...m, submodules: newSubmodules } : m
      )
    );

    // Update sort_order in database
    try {
      for (let i = 0; i < newSubmodules.length; i++) {
        await supabase
          .from('docs_submodules')
          .update({ sort_order: i })
          .eq('id', newSubmodules[i].id);
      }
      toast.success('تم تحديث ترتيب الأقسام');
    } catch (error) {
      console.error('Error updating submodule order:', error);
      toast.error('حدث خطأ أثناء تحديث الترتيب');
      fetchModules();
    }
  };

  // Module handlers
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
        is_published: newModulePublished,
      });

      if (error) throw error;

      toast.success('تم إضافة الوحدة بنجاح');
      setModuleDialogOpen(false);
      resetModuleForm();
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

  const handleEditModule = async () => {
    if (!selectedModule || !newModuleTitle.trim()) {
      toast.error('يرجى إدخال عنوان الوحدة');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('docs_modules')
        .update({
          title: newModuleTitle,
          slug: newModuleSlug || generateSlug(newModuleTitle),
          description: newModuleDescription || null,
          is_published: newModulePublished,
        })
        .eq('id', selectedModule.id);

      if (error) throw error;

      toast.success('تم تحديث الوحدة بنجاح');
      setEditModuleDialogOpen(false);
      resetModuleForm();
      fetchModules();
    } catch (error: any) {
      console.error('Error updating module:', error);
      if (error.code === '23505') {
        toast.error('هذا الرابط مستخدم بالفعل');
      } else {
        toast.error('حدث خطأ أثناء تحديث الوحدة');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteModule = async () => {
    if (!selectedModule) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('docs_modules')
        .delete()
        .eq('id', selectedModule.id);

      if (error) throw error;

      toast.success('تم حذف الوحدة بنجاح');
      setDeleteModuleDialogOpen(false);
      setSelectedModule(null);
      fetchModules();
    } catch (error: any) {
      console.error('Error deleting module:', error);
      toast.error('حدث خطأ أثناء حذف الوحدة. تأكد من حذف جميع الأقسام أولاً');
    } finally {
      setSaving(false);
    }
  };

  // Submodule handlers
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
        description: newSubmoduleDescription || null,
        is_published: newSubmodulePublished,
        sort_order: 0,
      });

      if (error) throw error;

      toast.success('تم إضافة القسم بنجاح');
      setSubmoduleDialogOpen(false);
      resetSubmoduleForm();
      fetchModules();
    } catch (error: any) {
      console.error('Error adding submodule:', error);
      if (error.code === '23505') {
        toast.error('هذا الرابط مستخدم بالفعل');
      } else {
        toast.error('حدث خطأ أثناء إضافة القسم');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleEditSubmodule = async () => {
    if (!selectedSubmodule || !newSubmoduleTitle.trim()) {
      toast.error('يرجى إدخال عنوان القسم');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('docs_submodules')
        .update({
          title: newSubmoduleTitle,
          slug: newSubmoduleSlug || generateSlug(newSubmoduleTitle),
          description: newSubmoduleDescription || null,
          is_published: newSubmodulePublished,
        })
        .eq('id', selectedSubmodule.id);

      if (error) throw error;

      toast.success('تم تحديث القسم بنجاح');
      setEditSubmoduleDialogOpen(false);
      resetSubmoduleForm();
      fetchModules();
    } catch (error: any) {
      console.error('Error updating submodule:', error);
      if (error.code === '23505') {
        toast.error('هذا الرابط مستخدم بالفعل');
      } else {
        toast.error('حدث خطأ أثناء تحديث القسم');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSubmodule = async () => {
    if (!selectedSubmodule) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('docs_submodules')
        .delete()
        .eq('id', selectedSubmodule.id);

      if (error) throw error;

      toast.success('تم حذف القسم بنجاح');
      setDeleteSubmoduleDialogOpen(false);
      setSelectedSubmodule(null);
      fetchModules();
    } catch (error: any) {
      console.error('Error deleting submodule:', error);
      toast.error('حدث خطأ أثناء حذف القسم. تأكد من حذف جميع المقالات أولاً');
    } finally {
      setSaving(false);
    }
  };

  const resetModuleForm = () => {
    setNewModuleTitle('');
    setNewModuleSlug('');
    setNewModuleDescription('');
    setNewModulePublished(true);
    setSelectedModule(null);
  };

  const resetSubmoduleForm = () => {
    setNewSubmoduleTitle('');
    setNewSubmoduleSlug('');
    setNewSubmoduleDescription('');
    setNewSubmodulePublished(true);
    setSelectedSubmodule(null);
    setSelectedModuleId(null);
  };

  const openEditModuleDialog = (module: Module) => {
    setSelectedModule(module);
    setNewModuleTitle(module.title);
    setNewModuleSlug(module.slug);
    setNewModuleDescription(module.description || '');
    setNewModulePublished(module.is_published);
    setEditModuleDialogOpen(true);
  };

  const openEditSubmoduleDialog = (submodule: Submodule) => {
    setSelectedSubmodule(submodule);
    setNewSubmoduleTitle(submodule.title);
    setNewSubmoduleSlug(submodule.slug);
    setNewSubmoduleDescription(submodule.description || '');
    setNewSubmodulePublished(submodule.is_published);
    setEditSubmoduleDialogOpen(true);
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
            إدارة الوحدات والأقسام الفرعية والمقالات - اسحب للترتيب
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
                <Label>العنوان *</Label>
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
                <Textarea
                  value={newModuleDescription}
                  onChange={(e) => setNewModuleDescription(e.target.value)}
                  placeholder="وصف مختصر للوحدة"
                  rows={2}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>منشور</Label>
                <Switch
                  checked={newModulePublished}
                  onCheckedChange={setNewModulePublished}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setModuleDialogOpen(false); resetModuleForm(); }}>
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
            {modules.length} وحدة رئيسية - اسحب وأفلت لإعادة الترتيب
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
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleModuleDragEnd}
            >
              <SortableContext
                items={modules.map((m) => m.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {modules.map((module) => (
                    <SortableModuleItem
                      key={module.id}
                      module={module}
                      openModules={openModules}
                      toggleModule={toggleModule}
                      openEditModuleDialog={openEditModuleDialog}
                      setSelectedModule={setSelectedModule}
                      setDeleteModuleDialogOpen={setDeleteModuleDialogOpen}
                      setSelectedModuleId={setSelectedModuleId}
                      setSubmoduleDialogOpen={setSubmoduleDialogOpen}
                      openEditSubmoduleDialog={openEditSubmoduleDialog}
                      setSelectedSubmodule={setSelectedSubmodule}
                      setDeleteSubmoduleDialogOpen={setDeleteSubmoduleDialogOpen}
                      isAdmin={isAdmin}
                      onSubmodulesReorder={handleSubmodulesReorder}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </CardContent>
      </Card>

      {/* Edit Module Dialog */}
      <Dialog open={editModuleDialogOpen} onOpenChange={(open) => { setEditModuleDialogOpen(open); if (!open) resetModuleForm(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تعديل الوحدة</DialogTitle>
            <DialogDescription>
              تعديل بيانات الوحدة الرئيسية
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>العنوان *</Label>
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
              <Textarea
                value={newModuleDescription}
                onChange={(e) => setNewModuleDescription(e.target.value)}
                placeholder="وصف مختصر للوحدة"
                rows={2}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>منشور</Label>
              <Switch
                checked={newModulePublished}
                onCheckedChange={setNewModulePublished}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditModuleDialogOpen(false); resetModuleForm(); }}>
              إلغاء
            </Button>
            <Button onClick={handleEditModule} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
              حفظ التغييرات
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Module Dialog */}
      <AlertDialog open={deleteModuleDialogOpen} onOpenChange={setDeleteModuleDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف الوحدة</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف وحدة "{selectedModule?.title}"؟ سيتم حذف جميع الأقسام الفرعية والمقالات المرتبطة بها.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteModule}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Submodule Dialog */}
      <Dialog open={submoduleDialogOpen} onOpenChange={(open) => { setSubmoduleDialogOpen(open); if (!open) resetSubmoduleForm(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>إضافة قسم فرعي</DialogTitle>
            <DialogDescription>
              أضف قسماً فرعياً جديداً للوحدة
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>العنوان *</Label>
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
            <div className="space-y-2">
              <Label>الوصف (اختياري)</Label>
              <Textarea
                value={newSubmoduleDescription}
                onChange={(e) => setNewSubmoduleDescription(e.target.value)}
                placeholder="وصف مختصر للقسم"
                rows={2}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>منشور</Label>
              <Switch
                checked={newSubmodulePublished}
                onCheckedChange={setNewSubmodulePublished}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setSubmoduleDialogOpen(false); resetSubmoduleForm(); }}>
              إلغاء
            </Button>
            <Button onClick={handleAddSubmodule} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
              إضافة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Submodule Dialog */}
      <Dialog open={editSubmoduleDialogOpen} onOpenChange={(open) => { setEditSubmoduleDialogOpen(open); if (!open) resetSubmoduleForm(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تعديل القسم</DialogTitle>
            <DialogDescription>
              تعديل بيانات القسم الفرعي
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>العنوان *</Label>
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
            <div className="space-y-2">
              <Label>الوصف (اختياري)</Label>
              <Textarea
                value={newSubmoduleDescription}
                onChange={(e) => setNewSubmoduleDescription(e.target.value)}
                placeholder="وصف مختصر للقسم"
                rows={2}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>منشور</Label>
              <Switch
                checked={newSubmodulePublished}
                onCheckedChange={setNewSubmodulePublished}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditSubmoduleDialogOpen(false); resetSubmoduleForm(); }}>
              إلغاء
            </Button>
            <Button onClick={handleEditSubmodule} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
              حفظ التغييرات
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Submodule Dialog */}
      <AlertDialog open={deleteSubmoduleDialogOpen} onOpenChange={setDeleteSubmoduleDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف القسم</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف قسم "{selectedSubmodule?.title}"؟ سيتم حذف جميع المقالات المرتبطة به.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSubmodule}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}