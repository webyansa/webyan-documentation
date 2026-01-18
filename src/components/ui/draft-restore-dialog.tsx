import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
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
import { FileText, Clock, Trash2 } from 'lucide-react';

interface DraftRestoreDialogProps {
  open: boolean;
  onRestore: () => void;
  onDiscard: () => void;
  draftTimestamp?: Date | null;
  entityType?: string;
}

export function DraftRestoreDialog({
  open,
  onRestore,
  onDiscard,
  draftTimestamp,
  entityType = 'المحتوى',
}: DraftRestoreDialogProps) {
  const formattedTime = draftTimestamp
    ? format(draftTimestamp, 'dd MMMM yyyy - HH:mm', { locale: ar })
    : '';

  return (
    <AlertDialog open={open}>
      <AlertDialogContent className="max-w-md" dir="rtl">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            تم العثور على مسودة محفوظة
          </AlertDialogTitle>
          <AlertDialogDescription className="text-right space-y-3">
            <p>
              يوجد {entityType} غير مكتمل تم حفظه تلقائياً.
            </p>
            {draftTimestamp && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted p-2 rounded">
                <Clock className="h-4 w-4" />
                <span>آخر حفظ: {formattedTime}</span>
              </div>
            )}
            <p className="font-medium text-foreground">
              هل تريد استعادة المسودة أو البدء من جديد؟
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-row-reverse gap-2 sm:gap-2">
          <AlertDialogAction onClick={onRestore} className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            استعادة المسودة
          </AlertDialogAction>
          <AlertDialogCancel onClick={onDiscard} className="flex items-center gap-2">
            <Trash2 className="h-4 w-4" />
            تجاهل والبدء من جديد
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
