import { useState, memo, useCallback } from 'react';
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
import { useContentTree, Module, Submodule } from '@/hooks/useContentTree';
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

// Sortable Submodule Item Component
const SortableSubmoduleItem = memo(function SortableSubmoduleItem({
  submodule,
  onEdit,
  onDelete,
  isAdmin,
}: {
  submodule: Submodule;
  onEdit: (submodule: Submodule) => void;
  onDelete: (submodule: Submodule) => void;
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
            onClick={() => onEdit(submodule)}
          >
            <Edit className="h-3 w-3" />
          </Button>
          {isAdmin && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={() => onDelete(submodule)}
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
});

// Sortable Module Item Component
const SortableModuleItem = memo(function SortableModuleItem({
  module,
  isOpen,
  onToggle,
  onEdit,
  onDelete,
  onAddSubmodule,
  onEditSubmodule,
  onDeleteSubmodule,
  onSubmodulesReorder,
  isAdmin,
}: {
  module: Module;
  isOpen: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onAddSubmodule: () => void;
  onEditSubmodule: (submodule: Submodule) => void;
  onDeleteSubmodule: (submodule: Submodule) => void;
  onSubmodulesReorder: (newSubmodules: Submodule[]) => void;
  isAdmin: boolean;
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
      onSubmodulesReorder(newSubmodules);
    }
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Collapsible open={isOpen} onOpenChange={onToggle}>
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
              {isOpen ? (
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
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit}>
                <Edit className="h-4 w-4" />
              </Button>
              {isAdmin && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={onDelete}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={onAddSubmodule}>
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
                        onEdit={onEditSubmodule}
                        onDelete={onDeleteSubmodule}
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
});

export default function ContentTreePage() {
  const { isAdmin } = useAuth();
  const {
    modules,
    loading,
    addModuleOptimistic,
    updateModuleOptimistic,
    deleteModuleOptimistic,
    addSubmoduleOptimistic,
    updateSubmoduleOptimistic,
    deleteSubmoduleOptimistic,
    reorderModules,
    reorderSubmodules,
  } = useContentTree();

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

  const toggleModule = useCallback((moduleId: string) => {
    setOpenModules((prev) =>
      prev.includes(moduleId)
        ? prev.filter((id) => id !== moduleId)
        : [...prev, moduleId]
    );
  }, []);

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
      
      // Optimistic update
      reorderModules(newModules);

      // Update in database
      try {
        await Promise.all(
          newModules.map((m, i) =>
            supabase.from('docs_modules').update({ sort_order: i }).eq('id', m.id)
          )
        );
        toast.success('تم تحديث ترتيب الوحدات');
      } catch (error) {
        console.error('Error updating module order:', error);
        toast.error('حدث خطأ أثناء تحديث الترتيب');
      }
    }
  };

  // Handle submodules reorder
  const handleSubmodulesReorder = async (moduleId: string, newSubmodules: Submodule[]) => {
    // Optimistic update
    reorderSubmodules(moduleId, newSubmodules);

    try {
      await Promise.all(
        newSubmodules.map((s, i) =>
          supabase.from('docs_submodules').update({ sort_order: i }).eq('id', s.id)
        )
      );
      toast.success('تم تحديث ترتيب الأقسام');
    } catch (error) {
      console.error('Error updating submodule order:', error);
      toast.error('حدث خطأ أثناء تحديث الترتيب');
    }
  };

  // Module handlers
  const handleAddModule = async () => {
    if (!newModuleTitle.trim()) {
      toast.error('يرجى إدخال عنوان الوحدة');
      return;
    }

    setSaving(true);
    const slug = newModuleSlug || generateSlug(newModuleTitle);
    
    try {
      const { data, error } = await supabase
        .from('docs_modules')
        .insert({
          title: newModuleTitle,
          slug,
          description: newModuleDescription || null,
          sort_order: modules.length,
          is_published: newModulePublished,
        })
        .select()
        .single();

      if (error) throw error;

      // Optimistic update with real ID
      addModuleOptimistic({ ...data, submodules: [] });
      toast.success('تم إضافة الوحدة بنجاح');
      setModuleDialogOpen(false);
      resetModuleForm();
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
    const updates = {
      title: newModuleTitle,
      slug: newModuleSlug || generateSlug(newModuleTitle),
      description: newModuleDescription || null,
      is_published: newModulePublished,
    };

    // Optimistic update
    updateModuleOptimistic(selectedModule.id, updates);
    
    try {
      const { error } = await supabase
        .from('docs_modules')
        .update(updates)
        .eq('id', selectedModule.id);

      if (error) throw error;

      toast.success('تم تحديث الوحدة بنجاح');
      setEditModuleDialogOpen(false);
      resetModuleForm();
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
    
    // Optimistic update
    deleteModuleOptimistic(selectedModule.id);
    
    try {
      const { error } = await supabase
        .from('docs_modules')
        .delete()
        .eq('id', selectedModule.id);

      if (error) throw error;

      toast.success('تم حذف الوحدة بنجاح');
      setDeleteModuleDialogOpen(false);
      setSelectedModule(null);
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
    const slug = newSubmoduleSlug || generateSlug(newSubmoduleTitle);
    const module = modules.find((m) => m.id === selectedModuleId);
    
    try {
      const { data, error } = await supabase
        .from('docs_submodules')
        .insert({
          module_id: selectedModuleId,
          title: newSubmoduleTitle,
          slug,
          description: newSubmoduleDescription || null,
          is_published: newSubmodulePublished,
          sort_order: module?.submodules.length || 0,
        })
        .select()
        .single();

      if (error) throw error;

      // Optimistic update
      addSubmoduleOptimistic(selectedModuleId, { ...data, articles: [] });
      toast.success('تم إضافة القسم بنجاح');
      setSubmoduleDialogOpen(false);
      resetSubmoduleForm();
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
    const updates = {
      title: newSubmoduleTitle,
      slug: newSubmoduleSlug || generateSlug(newSubmoduleTitle),
      description: newSubmoduleDescription || null,
      is_published: newSubmodulePublished,
    };

    // Optimistic update
    updateSubmoduleOptimistic(selectedSubmodule.id, updates);
    
    try {
      const { error } = await supabase
        .from('docs_submodules')
        .update(updates)
        .eq('id', selectedSubmodule.id);

      if (error) throw error;

      toast.success('تم تحديث القسم بنجاح');
      setEditSubmoduleDialogOpen(false);
      resetSubmoduleForm();
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
    
    // Optimistic update
    deleteSubmoduleOptimistic(selectedSubmodule.id);
    
    try {
      const { error } = await supabase
        .from('docs_submodules')
        .delete()
        .eq('id', selectedSubmodule.id);

      if (error) throw error;

      toast.success('تم حذف القسم بنجاح');
      setDeleteSubmoduleDialogOpen(false);
      setSelectedSubmodule(null);
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
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={newModulePublished}
                  onCheckedChange={setNewModulePublished}
                />
                <Label>منشور</Label>
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
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            هيكل المحتوى
          </CardTitle>
          <CardDescription>
            {modules.length} وحدة رئيسية
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {modules.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FolderOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>لا توجد وحدات بعد</p>
              <p className="text-sm">ابدأ بإضافة وحدة رئيسية</p>
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
                {modules.map((module) => (
                  <SortableModuleItem
                    key={module.id}
                    module={module}
                    isOpen={openModules.includes(module.id)}
                    onToggle={() => toggleModule(module.id)}
                    onEdit={() => openEditModuleDialog(module)}
                    onDelete={() => {
                      setSelectedModule(module);
                      setDeleteModuleDialogOpen(true);
                    }}
                    onAddSubmodule={() => {
                      setSelectedModuleId(module.id);
                      setSubmoduleDialogOpen(true);
                    }}
                    onEditSubmodule={openEditSubmoduleDialog}
                    onDeleteSubmodule={(sub) => {
                      setSelectedSubmodule(sub);
                      setDeleteSubmoduleDialogOpen(true);
                    }}
                    onSubmodulesReorder={(newSubs) =>
                      handleSubmodulesReorder(module.id, newSubs)
                    }
                    isAdmin={isAdmin}
                  />
                ))}
              </SortableContext>
            </DndContext>
          )}
        </CardContent>
      </Card>

      {/* Edit Module Dialog */}
      <Dialog open={editModuleDialogOpen} onOpenChange={setEditModuleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تعديل الوحدة</DialogTitle>
            <DialogDescription>تعديل بيانات الوحدة</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>العنوان *</Label>
              <Input
                value={newModuleTitle}
                onChange={(e) => setNewModuleTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>الرابط (Slug)</Label>
              <Input
                value={newModuleSlug}
                onChange={(e) => setNewModuleSlug(e.target.value)}
                dir="ltr"
              />
            </div>
            <div className="space-y-2">
              <Label>الوصف</Label>
              <Textarea
                value={newModuleDescription}
                onChange={(e) => setNewModuleDescription(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={newModulePublished}
                onCheckedChange={setNewModulePublished}
              />
              <Label>منشور</Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditModuleDialogOpen(false);
                resetModuleForm();
              }}
            >
              إلغاء
            </Button>
            <Button onClick={handleEditModule} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
              حفظ
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
              هل أنت متأكد من حذف "{selectedModule?.title}"؟ سيتم حذف جميع الأقسام
              والمقالات المرتبطة بها.
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
      <Dialog open={submoduleDialogOpen} onOpenChange={setSubmoduleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>إضافة قسم فرعي</DialogTitle>
            <DialogDescription>أضف قسم فرعي جديد للوحدة</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>العنوان *</Label>
              <Input
                value={newSubmoduleTitle}
                onChange={(e) => setNewSubmoduleTitle(e.target.value)}
                placeholder="مثال: إنشاء محتوى جديد"
              />
            </div>
            <div className="space-y-2">
              <Label>الرابط (Slug)</Label>
              <Input
                value={newSubmoduleSlug}
                onChange={(e) => setNewSubmoduleSlug(e.target.value)}
                placeholder="مثال: create-content"
                dir="ltr"
              />
            </div>
            <div className="space-y-2">
              <Label>الوصف (اختياري)</Label>
              <Textarea
                value={newSubmoduleDescription}
                onChange={(e) => setNewSubmoduleDescription(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={newSubmodulePublished}
                onCheckedChange={setNewSubmodulePublished}
              />
              <Label>منشور</Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setSubmoduleDialogOpen(false);
                resetSubmoduleForm();
              }}
            >
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
      <Dialog open={editSubmoduleDialogOpen} onOpenChange={setEditSubmoduleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تعديل القسم</DialogTitle>
            <DialogDescription>تعديل بيانات القسم الفرعي</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>العنوان *</Label>
              <Input
                value={newSubmoduleTitle}
                onChange={(e) => setNewSubmoduleTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>الرابط (Slug)</Label>
              <Input
                value={newSubmoduleSlug}
                onChange={(e) => setNewSubmoduleSlug(e.target.value)}
                dir="ltr"
              />
            </div>
            <div className="space-y-2">
              <Label>الوصف</Label>
              <Textarea
                value={newSubmoduleDescription}
                onChange={(e) => setNewSubmoduleDescription(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={newSubmodulePublished}
                onCheckedChange={setNewSubmodulePublished}
              />
              <Label>منشور</Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditSubmoduleDialogOpen(false);
                resetSubmoduleForm();
              }}
            >
              إلغاء
            </Button>
            <Button onClick={handleEditSubmodule} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
              حفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Submodule Dialog */}
      <AlertDialog
        open={deleteSubmoduleDialogOpen}
        onOpenChange={setDeleteSubmoduleDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف القسم</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف "{selectedSubmodule?.title}"؟ سيتم حذف جميع
              المقالات المرتبطة به.
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
