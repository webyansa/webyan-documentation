import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import { 
  Image as ImageIcon, 
  Upload, 
  Search, 
  Loader2, 
  FolderOpen, 
  Trash2, 
  Copy, 
  Check,
  X,
  FileImage,
  Calendar,
  HardDrive
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface MediaFile {
  id: string;
  name: string;
  url: string;
  size: number;
  mimeType: string;
  createdAt: string;
}

export default function MediaPage() {
  const { user, isAdmin } = useAuth();
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFile, setSelectedFile] = useState<MediaFile | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<MediaFile | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  const fetchFiles = useCallback(async () => {
    try {
      const { data, error } = await supabase.storage
        .from('docs-media')
        .list('', {
          limit: 100,
          sortBy: { column: 'created_at', order: 'desc' },
        });

      if (error) throw error;

      const filesWithUrls: MediaFile[] = (data || [])
        .filter(file => file.name !== '.emptyFolderPlaceholder')
        .map(file => {
          const { data: urlData } = supabase.storage
            .from('docs-media')
            .getPublicUrl(file.name);

          return {
            id: file.id,
            name: file.name,
            url: urlData.publicUrl,
            size: file.metadata?.size || 0,
            mimeType: file.metadata?.mimetype || 'image/jpeg',
            createdAt: file.created_at,
          };
        });

      setFiles(filesWithUrls);
    } catch (error) {
      console.error('Error fetching files:', error);
      toast.error('حدث خطأ أثناء تحميل الملفات');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    setUploading(true);
    let successCount = 0;

    try {
      for (const file of Array.from(selectedFiles)) {
        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
        if (!allowedTypes.includes(file.type)) {
          toast.error(`نوع الملف ${file.name} غير مدعوم`);
          continue;
        }

        // Validate file size (10MB max)
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`الملف ${file.name} كبير جداً (الحد الأقصى 10MB)`);
          continue;
        }

        // Generate unique filename
        const timestamp = Date.now();
        const ext = file.name.split('.').pop();
        const filename = `${timestamp}-${Math.random().toString(36).substring(7)}.${ext}`;

        const { error } = await supabase.storage
          .from('docs-media')
          .upload(filename, file, {
            cacheControl: '3600',
            upsert: false,
          });

        if (error) throw error;
        successCount++;
      }

      if (successCount > 0) {
        toast.success(`تم رفع ${successCount} ملف بنجاح`);
        fetchFiles();
      }
    } catch (error: any) {
      console.error('Error uploading file:', error);
      toast.error(error.message || 'حدث خطأ أثناء رفع الملف');
    } finally {
      setUploading(false);
      // Reset input
      e.target.value = '';
    }
  };

  const handleDelete = async () => {
    if (!fileToDelete) return;

    try {
      const { error } = await supabase.storage
        .from('docs-media')
        .remove([fileToDelete.name]);

      if (error) throw error;

      toast.success('تم حذف الملف بنجاح');
      setFiles(prev => prev.filter(f => f.id !== fileToDelete.id));
      setFileToDelete(null);
      setDeleteDialogOpen(false);
      if (selectedFile?.id === fileToDelete.id) {
        setSelectedFile(null);
      }
    } catch (error) {
      console.error('Error deleting file:', error);
      toast.error('حدث خطأ أثناء حذف الملف');
    }
  };

  const copyToClipboard = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(url);
      toast.success('تم نسخ الرابط');
      setTimeout(() => setCopiedUrl(null), 2000);
    } catch (error) {
      toast.error('فشل في نسخ الرابط');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 بايت';
    const k = 1024;
    const sizes = ['بايت', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const filteredFiles = files.filter(file =>
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">الوسائط</h1>
          <p className="text-muted-foreground">
            إدارة الصور والملفات المرفقة بالمقالات
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="file"
            id="file-upload"
            className="hidden"
            accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
            multiple
            onChange={handleUpload}
            disabled={uploading}
          />
          <label htmlFor="file-upload">
            <Button asChild disabled={uploading}>
              <span className="gap-2 cursor-pointer">
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                رفع ملف جديد
              </span>
            </Button>
          </label>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">إجمالي الملفات</CardTitle>
            <FileImage className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{files.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">إجمالي الحجم</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatFileSize(files.reduce((acc, f) => acc + f.size, 0))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">آخر رفع</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {files.length > 0
                ? format(new Date(files[0].createdAt), 'dd MMM', { locale: ar })
                : '-'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">البحث</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="ابحث في الوسائط..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Media Grid */}
      <Card>
        <CardHeader>
          <CardTitle>جميع الوسائط</CardTitle>
          <CardDescription>{filteredFiles.length} ملف</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="text-center py-12">
              <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {searchQuery ? 'لا توجد نتائج للبحث' : 'لا توجد ملفات وسائط بعد'}
              </p>
              {!searchQuery && (
                <>
                  <p className="text-sm text-muted-foreground mt-2">
                    ارفع صوراً جديدة لاستخدامها في المقالات
                  </p>
                  <label htmlFor="file-upload">
                    <Button asChild className="mt-4 gap-2">
                      <span className="cursor-pointer">
                        <Upload className="h-4 w-4" />
                        رفع أول ملف
                      </span>
                    </Button>
                  </label>
                </>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {filteredFiles.map((file) => (
                <div
                  key={file.id}
                  className="relative group cursor-pointer rounded-lg border overflow-hidden hover:border-primary transition-colors"
                  onClick={() => setSelectedFile(file)}
                >
                  <div className="aspect-square bg-muted">
                    <img
                      src={file.url}
                      alt={file.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Button
                      size="icon"
                      variant="secondary"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        copyToClipboard(file.url);
                      }}
                    >
                      {copiedUrl === file.url ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                    {isAdmin && (
                      <Button
                        size="icon"
                        variant="destructive"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFileToDelete(file);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* File Preview Dialog */}
      <Dialog open={!!selectedFile} onOpenChange={() => setSelectedFile(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>تفاصيل الملف</DialogTitle>
            <DialogDescription>معاينة وتفاصيل الملف</DialogDescription>
          </DialogHeader>
          {selectedFile && (
            <div className="space-y-4">
              <div className="relative rounded-lg overflow-hidden bg-muted">
                <img
                  src={selectedFile.url}
                  alt={selectedFile.name}
                  className="max-h-[400px] mx-auto object-contain"
                />
              </div>
              <div className="grid gap-4 text-sm">
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                  <span className="text-muted-foreground">اسم الملف</span>
                  <span className="font-mono text-xs">{selectedFile.name}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                  <span className="text-muted-foreground">الحجم</span>
                  <span>{formatFileSize(selectedFile.size)}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                  <span className="text-muted-foreground">النوع</span>
                  <Badge variant="secondary">{selectedFile.mimeType}</Badge>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                  <span className="text-muted-foreground">تاريخ الرفع</span>
                  <span>
                    {format(new Date(selectedFile.createdAt), 'dd MMMM yyyy', { locale: ar })}
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-muted">
                  <span className="text-muted-foreground block mb-2">الرابط</span>
                  <div className="flex items-center gap-2">
                    <Input
                      value={selectedFile.url}
                      readOnly
                      className="font-mono text-xs"
                      dir="ltr"
                    />
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => copyToClipboard(selectedFile.url)}
                    >
                      {copiedUrl === selectedFile.url ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedFile(null)}>
              إغلاق
            </Button>
            {isAdmin && selectedFile && (
              <Button
                variant="destructive"
                onClick={() => {
                  setFileToDelete(selectedFile);
                  setDeleteDialogOpen(true);
                }}
              >
                <Trash2 className="h-4 w-4 ml-2" />
                حذف
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم حذف هذا الملف نهائياً ولا يمكن استرجاعه.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
