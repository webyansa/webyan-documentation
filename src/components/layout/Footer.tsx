import { Link } from "react-router-dom";
import { Shield, Headphones, Building2 } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t bg-muted/30" dir="rtl">
      <div className="container py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-2">
            <h3 className="font-bold text-lg mb-2">دليل استخدام منصة ويبيان</h3>
            <p className="text-muted-foreground text-sm max-w-md">
              دليل شامل ومنظم لجميع ميزات منصة ويبيان. يساعدك على إدارة موقعك باحترافية وسهولة.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold mb-4 text-sm">روابط سريعة</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/getting-started" className="text-muted-foreground hover:text-foreground transition-colors">
                  ابدأ هنا
                </Link>
              </li>
              <li>
                <Link to="/changelog" className="text-muted-foreground hover:text-foreground transition-colors">
                  التحديثات
                </Link>
              </li>
              <li>
                <Link to="/submit-ticket" className="text-muted-foreground hover:text-foreground transition-colors">
                  الدعم الفني
                </Link>
              </li>
              <li>
                <Link to="/track-ticket" className="text-muted-foreground hover:text-foreground transition-colors">
                  تتبع تذكرة
                </Link>
              </li>
            </ul>
          </div>

          {/* Portal Access */}
          <div>
            <h4 className="font-semibold mb-4 text-sm">الوصول للبوابات</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link 
                  to="/portal/login" 
                  className="text-muted-foreground hover:text-green-600 transition-colors flex items-center gap-2"
                >
                  <Building2 className="h-4 w-4" />
                  بوابة العملاء
                </Link>
              </li>
              <li>
                <Link 
                  to="/support/login" 
                  className="text-muted-foreground hover:text-blue-600 transition-colors flex items-center gap-2"
                >
                  <Headphones className="h-4 w-4" />
                  بوابة الدعم الفني
                </Link>
              </li>
              <li>
                <Link 
                  to="/admin/login" 
                  className="text-muted-foreground hover:text-red-600 transition-colors flex items-center gap-2"
                >
                  <Shield className="h-4 w-4" />
                  لوحة التحكم
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t mt-8 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} ويبيان. جميع الحقوق محفوظة.
          </p>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <Link to="/" className="hover:text-foreground transition-colors">
              الرئيسية
            </Link>
            <span>•</span>
            <Link to="/report-issue" className="hover:text-foreground transition-colors">
              الإبلاغ عن مشكلة
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
