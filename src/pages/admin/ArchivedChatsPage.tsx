import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useChat } from '@/hooks/useChat';
import { toast } from 'sonner';
import {
  Archive,
  Trash2,
  RotateCcw,
  Search,
  Loader2,
  MessageSquare,
  Calendar,
  User,
  CheckSquare,
  Square,
  AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface ArchivedConversation {
  id: string;
  subject: string | null;
  last_message_preview: string | null;
  last_message_at: string | null;
  archived_at: string | null;
  created_at: string;
  source: string | null;
  client_account?: {
    full_name: string;
    email: string;
  } | null;
  organization?: {
    name: string;
  } | null;
}

export default function ArchivedChatsPage() {
  const [conversations, setConversations] = useState<ArchivedConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingBulk, setDeletingBulk] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const { deleteConversation, restoreConversation, deleteConversationsBulk } = useChat();

  const fetchArchivedConversations = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          id,
          subject,
          last_message_preview,
          last_message_at,
          archived_at,
          created_at,
          source,
          client_account:client_accounts(full_name, email),
          organization:client_organizations(name)
        `)
        .not('archived_at', 'is', null)
        .order('archived_at', { ascending: false });

      if (error) throw error;
      setConversations(data || []);
    } catch (error) {
      console.error('Error fetching archived conversations:', error);
      toast.error('حدث خطأ أثناء تحميل المحادثات المؤرشفة');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchArchivedConversations();
  }, [fetchArchivedConversations]);

  const handleRestore = async (id: string) => {
    setRestoringId(id);
    try {
      await restoreConversation(id);
      setConversations(prev => prev.filter(c => c.id !== id));
      setSelectedIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      toast.success('تم استعادة المحادثة بنجاح');
    } catch (error) {
      toast.error('حدث خطأ أثناء استعادة المحادثة');
    } finally {
      setRestoringId(null);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await deleteConversation(deletingId);
      setConversations(prev => prev.filter(c => c.id !== deletingId));
      setSelectedIds(prev => {
        const next = new Set(prev);
        next.delete(deletingId);
        return next;
      });
      toast.success('تم حذف المحادثة نهائياً');
    } catch (error) {
      toast.error('حدث خطأ أثناء حذف المحادثة');
    } finally {
      setDeletingId(null);
      setShowDeleteDialog(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    setDeletingBulk(true);
    try {
      await deleteConversationsBulk(Array.from(selectedIds));
      setConversations(prev => prev.filter(c => !selectedIds.has(c.id)));
      setSelectedIds(new Set());
      toast.success(`تم حذف ${selectedIds.size} محادثة نهائياً`);
    } catch (error) {
      toast.error('حدث خطأ أثناء حذف المحادثات');
    } finally {
      setDeletingBulk(false);
      setShowBulkDeleteDialog(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredConversations.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredConversations.map(c => c.id)));
    }
  };

  const filteredConversations = conversations.filter(conv => {
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    return (
      conv.subject?.toLowerCase().includes(search) ||
      conv.last_message_preview?.toLowerCase().includes(search) ||
      conv.client_account?.full_name?.toLowerCase().includes(search) ||
      conv.client_account?.email?.toLowerCase().includes(search) ||
      conv.organization?.name?.toLowerCase().includes(search)
    );
  });

  const getClientName = (conv: ArchivedConversation) => {
    if (conv.client_account?.full_name) return conv.client_account.full_name;
    if (conv.organization?.name) return conv.organization.name;
    return 'زائر';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Archive className="h-6 w-6 text-muted-foreground" />
            المحادثات المؤرشفة
          </h1>
          <p className="text-muted-foreground mt-1">
            إدارة المحادثات المؤرشفة واستعادتها أو حذفها نهائياً
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-sm">
            {conversations.length} محادثة
          </Badge>
        </div>
      </div>

      {/* Search and Actions */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="relative w-full sm:w-80">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="البحث في المحادثات المؤرشفة..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={toggleSelectAll}
                disabled={filteredConversations.length === 0}
              >
                {selectedIds.size === filteredConversations.length && filteredConversations.length > 0 ? (
                  <>
                    <Square className="h-4 w-4 ml-2" />
                    إلغاء تحديد الكل
                  </>
                ) : (
                  <>
                    <CheckSquare className="h-4 w-4 ml-2" />
                    تحديد الكل ({filteredConversations.length})
                  </>
                )}
              </Button>

              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowBulkDeleteDialog(true)}
                disabled={selectedIds.size === 0 || deletingBulk}
              >
                {deletingBulk ? (
                  <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4 ml-2" />
                )}
                حذف المحدد ({selectedIds.size})
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Conversations List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">قائمة المحادثات المؤرشفة</CardTitle>
          <CardDescription>
            يمكنك استعادة المحادثات إلى صندوق الوارد أو حذفها نهائياً
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Archive className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground">لا توجد محادثات مؤرشفة</h3>
              <p className="text-sm text-muted-foreground/70 mt-1">
                {searchQuery ? 'لا توجد نتائج مطابقة للبحث' : 'المحادثات المؤرشفة ستظهر هنا'}
              </p>
            </div>
          ) : (
            <ScrollArea className="max-h-[600px]">
              <div className="divide-y">
                {filteredConversations.map((conv) => (
                  <div
                    key={conv.id}
                    className="flex items-start gap-4 p-4 hover:bg-muted/50 transition-colors"
                  >
                    <Checkbox
                      checked={selectedIds.has(conv.id)}
                      onCheckedChange={() => toggleSelect(conv.id)}
                      className="mt-1"
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <span className="font-medium truncate">{getClientName(conv)}</span>
                            {conv.source && (
                              <Badge variant="outline" className="text-xs">
                                {conv.source === 'embed' ? 'ويدجت' : conv.source}
                              </Badge>
                            )}
                          </div>

                          {conv.subject && (
                            <p className="text-sm text-muted-foreground truncate mb-1">
                              {conv.subject}
                            </p>
                          )}

                          {conv.last_message_preview && (
                            <p className="text-sm text-muted-foreground/70 truncate">
                              <MessageSquare className="h-3 w-3 inline ml-1" />
                              {conv.last_message_preview}
                            </p>
                          )}

                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            {conv.archived_at && (
                              <span className="flex items-center gap-1">
                                <Archive className="h-3 w-3" />
                                أُرشف: {format(new Date(conv.archived_at), 'dd/MM/yyyy', { locale: ar })}
                              </span>
                            )}
                            {conv.created_at && (
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                أُنشئ: {format(new Date(conv.created_at), 'dd/MM/yyyy', { locale: ar })}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRestore(conv.id)}
                            disabled={restoringId === conv.id}
                          >
                            {restoringId === conv.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <RotateCcw className="h-4 w-4 ml-1" />
                                استعادة
                              </>
                            )}
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => {
                              setDeletingId(conv.id);
                              setShowDeleteDialog(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4 ml-1" />
                            حذف نهائي
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Single Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              تأكيد الحذف النهائي
            </AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف هذه المحادثة نهائياً؟
              <br />
              <strong className="text-destructive">هذا الإجراء لا يمكن التراجع عنه.</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              حذف نهائياً
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Dialog */}
      <AlertDialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              تأكيد الحذف النهائي المتعدد
            </AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف <strong>{selectedIds.size}</strong> محادثة نهائياً؟
              <br />
              <strong className="text-destructive">هذا الإجراء لا يمكن التراجع عنه.</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingBulk}>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={deletingBulk}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingBulk ? (
                <>
                  <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                  جاري الحذف...
                </>
              ) : (
                `حذف ${selectedIds.size} محادثة`
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
