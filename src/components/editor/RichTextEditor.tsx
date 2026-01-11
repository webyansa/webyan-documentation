import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Youtube from '@tiptap/extension-youtube';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Code,
  List,
  ListOrdered,
  Quote,
  Redo,
  Undo,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Link as LinkIcon,
  Image as ImageIcon,
  Youtube as YoutubeIcon,
  Heading1,
  Heading2,
  Heading3,
  Minus,
  Upload,
  Loader2,
  Check,
  FolderOpen,
} from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface MediaItem {
  id: string;
  url: string;
  filename: string;
  original_name: string;
  mime_type: string;
  created_at: string;
}

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
}

export default function RichTextEditor({ content, onChange, placeholder }: RichTextEditorProps) {
  const [linkUrl, setLinkUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [youtubeDialogOpen, setYoutubeDialogOpen] = useState(false);
  
  // Media library states
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [loadingMedia, setLoadingMedia] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [imageTab, setImageTab] = useState<'upload' | 'library' | 'url'>('upload');

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Underline,
      Image.configure({
        HTMLAttributes: {
          class: 'rounded-lg max-w-full',
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary underline',
        },
      }),
      Youtube.configure({
        width: 640,
        height: 360,
        HTMLAttributes: {
          class: 'rounded-lg mx-auto',
        },
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
    ],
    content: content || '',
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg dark:prose-invert max-w-none focus:outline-none min-h-[400px] p-4',
      },
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content || '');
    }
  }, [content, editor]);

  const fetchMediaLibrary = useCallback(async () => {
    setLoadingMedia(true);
    try {
      const { data, error } = await supabase
        .from('docs_media')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setMediaItems(data || []);
    } catch (error) {
      console.error('Error fetching media:', error);
    } finally {
      setLoadingMedia(false);
    }
  }, []);

  useEffect(() => {
    if (imageDialogOpen && imageTab === 'library') {
      fetchMediaLibrary();
    }
  }, [imageDialogOpen, imageTab, fetchMediaLibrary]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('يرجى اختيار ملف صورة فقط');
      return;
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('حجم الملف يجب أن يكون أقل من 10 ميجابايت');
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `articles/${fileName}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('docs-media')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('docs-media')
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl;

      // Save to database
      const { data: mediaData, error: dbError } = await supabase
        .from('docs_media')
        .insert({
          filename: fileName,
          original_name: file.name,
          url: publicUrl,
          mime_type: file.type,
          size_bytes: file.size,
        })
        .select()
        .single();

      if (dbError) throw dbError;

      // Insert image into editor
      if (editor) {
        editor.chain().focus().setImage({ src: publicUrl }).run();
      }

      toast.success('تم رفع الصورة بنجاح');
      setImageDialogOpen(false);
      
      // Reset file input
      event.target.value = '';
    } catch (error: any) {
      console.error('Error uploading file:', error);
      toast.error('حدث خطأ أثناء رفع الصورة');
    } finally {
      setUploading(false);
    }
  };

  const handleSelectFromLibrary = () => {
    if (selectedMedia && editor) {
      editor.chain().focus().setImage({ src: selectedMedia.url }).run();
      setImageDialogOpen(false);
      setSelectedMedia(null);
    }
  };

  if (!editor) {
    return null;
  }

  const addLink = () => {
    if (linkUrl) {
      editor.chain().focus().extendMarkRange('link').setLink({ href: linkUrl }).run();
      setLinkUrl('');
      setLinkDialogOpen(false);
    }
  };

  const addImage = () => {
    if (imageUrl) {
      editor.chain().focus().setImage({ src: imageUrl }).run();
      setImageUrl('');
      setImageDialogOpen(false);
    }
  };

  const addYoutube = () => {
    if (youtubeUrl) {
      editor.chain().focus().setYoutubeVideo({ src: youtubeUrl }).run();
      setYoutubeUrl('');
      setYoutubeDialogOpen(false);
    }
  };

  const ToolbarButton = ({
    onClick,
    isActive,
    children,
    title,
  }: {
    onClick: () => void;
    isActive?: boolean;
    children: React.ReactNode;
    title: string;
  }) => (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onClick}
      className={cn('h-8 w-8 p-0', isActive && 'bg-muted')}
      title={title}
    >
      {children}
    </Button>
  );

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 p-2 border-b bg-muted/50">
        {/* Undo/Redo */}
        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          title="تراجع"
        >
          <Undo className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          title="إعادة"
        >
          <Redo className="h-4 w-4" />
        </ToolbarButton>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Headings */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          isActive={editor.isActive('heading', { level: 1 })}
          title="عنوان 1"
        >
          <Heading1 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          isActive={editor.isActive('heading', { level: 2 })}
          title="عنوان 2"
        >
          <Heading2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          isActive={editor.isActive('heading', { level: 3 })}
          title="عنوان 3"
        >
          <Heading3 className="h-4 w-4" />
        </ToolbarButton>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Text formatting */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive('bold')}
          title="عريض"
        >
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive('italic')}
          title="مائل"
        >
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          isActive={editor.isActive('underline')}
          title="تسطير"
        >
          <UnderlineIcon className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          isActive={editor.isActive('strike')}
          title="يتوسطه خط"
        >
          <Strikethrough className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCode().run()}
          isActive={editor.isActive('code')}
          title="كود"
        >
          <Code className="h-4 w-4" />
        </ToolbarButton>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Alignment */}
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          isActive={editor.isActive({ textAlign: 'right' })}
          title="محاذاة لليمين"
        >
          <AlignRight className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          isActive={editor.isActive({ textAlign: 'center' })}
          title="توسيط"
        >
          <AlignCenter className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          isActive={editor.isActive({ textAlign: 'left' })}
          title="محاذاة لليسار"
        >
          <AlignLeft className="h-4 w-4" />
        </ToolbarButton>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Lists */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive('bulletList')}
          title="قائمة نقطية"
        >
          <List className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive('orderedList')}
          title="قائمة مرقمة"
        >
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          isActive={editor.isActive('blockquote')}
          title="اقتباس"
        >
          <Quote className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          title="خط فاصل"
        >
          <Minus className="h-4 w-4" />
        </ToolbarButton>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Link */}
        <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
          <DialogTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={cn('h-8 w-8 p-0', editor.isActive('link') && 'bg-muted')}
              title="رابط"
            >
              <LinkIcon className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>إضافة رابط</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>رابط URL</Label>
                <Input
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://example.com"
                  dir="ltr"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setLinkDialogOpen(false)}>
                إلغاء
              </Button>
              <Button onClick={addLink}>إضافة</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Image with Upload and Library */}
        <Dialog open={imageDialogOpen} onOpenChange={setImageDialogOpen}>
          <DialogTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              title="صورة"
            >
              <ImageIcon className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>إضافة صورة</DialogTitle>
            </DialogHeader>
            <Tabs value={imageTab} onValueChange={(v) => setImageTab(v as 'upload' | 'library' | 'url')}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="upload" className="gap-2">
                  <Upload className="h-4 w-4" />
                  رفع صورة
                </TabsTrigger>
                <TabsTrigger value="library" className="gap-2">
                  <FolderOpen className="h-4 w-4" />
                  مكتبة الوسائط
                </TabsTrigger>
                <TabsTrigger value="url" className="gap-2">
                  <LinkIcon className="h-4 w-4" />
                  رابط خارجي
                </TabsTrigger>
              </TabsList>

              <TabsContent value="upload" className="space-y-4 py-4">
                <div className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-8 hover:border-primary/50 transition-colors">
                  <Upload className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-sm text-muted-foreground mb-4">
                    اسحب الصورة هنا أو اضغط للاختيار
                  </p>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    disabled={uploading}
                    className="hidden"
                    id="image-upload"
                  />
                  <Button asChild disabled={uploading}>
                    <label htmlFor="image-upload" className="cursor-pointer">
                      {uploading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin ml-2" />
                          جاري الرفع...
                        </>
                      ) : (
                        'اختر صورة'
                      )}
                    </label>
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">
                    الحد الأقصى: 10 ميجابايت | الصيغ: JPG, PNG, GIF, WebP
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="library" className="space-y-4 py-4">
                {loadingMedia ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : mediaItems.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <FolderOpen className="h-12 w-12 mx-auto mb-4" />
                    <p>لا توجد صور في المكتبة</p>
                  </div>
                ) : (
                  <>
                    <ScrollArea className="h-[300px]">
                      <div className="grid grid-cols-4 gap-2 p-1">
                        {mediaItems.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => setSelectedMedia(item)}
                            className={cn(
                              'relative aspect-square rounded-lg overflow-hidden border-2 transition-all',
                              selectedMedia?.id === item.id
                                ? 'border-primary ring-2 ring-primary/20'
                                : 'border-transparent hover:border-muted-foreground/30'
                            )}
                          >
                            <img
                              src={item.url}
                              alt={item.original_name}
                              className="w-full h-full object-cover"
                            />
                            {selectedMedia?.id === item.id && (
                              <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                                <Check className="h-6 w-6 text-primary" />
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    </ScrollArea>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setImageDialogOpen(false)}>
                        إلغاء
                      </Button>
                      <Button onClick={handleSelectFromLibrary} disabled={!selectedMedia}>
                        إضافة الصورة المختارة
                      </Button>
                    </DialogFooter>
                  </>
                )}
              </TabsContent>

              <TabsContent value="url" className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>رابط الصورة</Label>
                  <Input
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://example.com/image.jpg"
                    dir="ltr"
                  />
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setImageDialogOpen(false)}>
                    إلغاء
                  </Button>
                  <Button onClick={addImage} disabled={!imageUrl}>
                    إضافة
                  </Button>
                </DialogFooter>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>

        {/* YouTube */}
        <Dialog open={youtubeDialogOpen} onOpenChange={setYoutubeDialogOpen}>
          <DialogTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              title="فيديو يوتيوب"
            >
              <YoutubeIcon className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>إضافة فيديو يوتيوب</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>رابط الفيديو</Label>
                <Input
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  dir="ltr"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setYoutubeDialogOpen(false)}>
                إلغاء
              </Button>
              <Button onClick={addYoutube}>إضافة</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Editor */}
      <EditorContent editor={editor} />
    </div>
  );
}