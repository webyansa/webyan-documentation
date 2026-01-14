import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useStaffAuth } from '@/hooks/useStaffAuth';
import { FileText, FolderTree, Image, Tags, History, ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function StaffContent() {
  const { permissions } = useStaffAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!permissions.canManageContent) {
      navigate('/staff');
    }
  }, [permissions.canManageContent, navigate]);

  const contentLinks = [
    {
      title: 'المقالات',
      description: 'إنشاء وتحرير مقالات الدليل',
      icon: FileText,
      href: '/admin/articles',
      color: 'bg-blue-100 text-blue-600',
    },
    {
      title: 'شجرة المحتوى',
      description: 'تنظيم هيكل المحتوى والأقسام',
      icon: FolderTree,
      href: '/admin/content-tree',
      color: 'bg-green-100 text-green-600',
    },
    {
      title: 'الوسائط',
      description: 'إدارة الصور والملفات المرفقة',
      icon: Image,
      href: '/admin/media',
      color: 'bg-purple-100 text-purple-600',
    },
    {
      title: 'الوسوم',
      description: 'إدارة تصنيفات المحتوى',
      icon: Tags,
      href: '/admin/tags',
      color: 'bg-orange-100 text-orange-600',
    },
    {
      title: 'سجل التحديثات',
      description: 'إدارة سجل التغييرات والتحديثات',
      icon: History,
      href: '/admin/changelog',
      color: 'bg-pink-100 text-pink-600',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FileText className="h-6 w-6" />
          إدارة المحتوى
        </h1>
        <p className="text-muted-foreground">الوصول السريع لأدوات إدارة المحتوى</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {contentLinks.map((link) => (
          <Link key={link.href} to={link.href}>
            <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-lg ${link.color}`}>
                    <link.icon className="h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{link.title}</CardTitle>
                    <CardDescription>{link.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Button variant="ghost" className="gap-2 w-full justify-center">
                  الانتقال
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
