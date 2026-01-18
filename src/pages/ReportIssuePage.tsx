import { useState } from "react";
import { Link } from "react-router-dom";
import { Send, AlertCircle, CheckCircle } from "lucide-react";
import { DocsLayout } from "@/components/layout/DocsLayout";
import { Breadcrumb } from "@/components/docs/Breadcrumb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function ReportIssuePage() {
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    articleUrl: "",
    issueType: "",
    description: "",
    email: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, this would send to the backend
    console.log("Issue reported:", formData);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <DocsLayout>
        <div className="max-w-2xl mx-auto text-center py-16">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center">
              <CheckCircle className="h-10 w-10 text-success" />
            </div>
          </div>
          <h1 className="text-2xl font-bold mb-4">تم إرسال البلاغ بنجاح!</h1>
          <p className="text-muted-foreground mb-6">
            شكراً لمساعدتنا في تحسين الدليل. سنراجع ملاحظاتك ونعمل على إصلاح المشكلة.
          </p>
          <Button asChild>
            <Link to="/">العودة للصفحة الرئيسية</Link>
          </Button>
        </div>
      </DocsLayout>
    );
  }

  return (
    <DocsLayout>
      <div className="max-w-2xl mx-auto">
        {/* Breadcrumb */}
        <Breadcrumb items={[{ label: "إبلاغ عن مشكلة" }]} className="mb-6" />

        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-warning/10 text-warning">
              <AlertCircle className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">إبلاغ عن مشكلة في الشرح</h1>
              <p className="text-muted-foreground">
                ساعدنا في تحسين جودة الدليل
              </p>
            </div>
          </div>
        </header>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="articleUrl">رابط الصفحة (اختياري)</Label>
            <Input
              id="articleUrl"
              type="url"
              placeholder="https://..."
              value={formData.articleUrl}
              onChange={(e) =>
                setFormData({ ...formData, articleUrl: e.target.value })
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="issueType">نوع المشكلة</Label>
            <Select
              value={formData.issueType}
              onValueChange={(value) =>
                setFormData({ ...formData, issueType: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="اختر نوع المشكلة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="outdated">معلومات قديمة</SelectItem>
                <SelectItem value="unclear">شرح غير واضح</SelectItem>
                <SelectItem value="missing">معلومات ناقصة</SelectItem>
                <SelectItem value="incorrect">معلومات خاطئة</SelectItem>
                <SelectItem value="broken-link">رابط معطل</SelectItem>
                <SelectItem value="other">أخرى</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">وصف المشكلة</Label>
            <Textarea
              id="description"
              placeholder="اشرح المشكلة بالتفصيل..."
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className="min-h-[150px]"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">البريد الإلكتروني (اختياري)</Label>
            <Input
              id="email"
              type="email"
              placeholder="للتواصل معك بخصوص الحل"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
            />
          </div>

          <Button type="submit" size="lg" className="w-full gap-2">
            <Send className="h-5 w-5" />
            إرسال البلاغ
          </Button>
        </form>
      </div>
    </DocsLayout>
  );
}
