import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Star, Send, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface MeetingRatingDialogProps {
  meeting: {
    id: string;
    subject: string;
    organization_id: string;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export default function MeetingRatingDialog({
  meeting,
  open,
  onOpenChange,
  onSuccess,
}: MeetingRatingDialogProps) {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!meeting || rating === 0) {
      toast.error('يرجى اختيار التقييم');
      return;
    }

    setSubmitting(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('meeting_ratings')
        .insert({
          meeting_id: meeting.id,
          organization_id: meeting.organization_id,
          rated_by: userData.user?.id,
          rating,
          comment: comment.trim() || null,
        });

      if (error) throw error;

      toast.success('شكراً لتقييمك! نقدر ملاحظاتك');
      setRating(0);
      setComment('');
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error('Error submitting rating:', error);
      toast.error(error.message || 'حدث خطأ في إرسال التقييم');
    } finally {
      setSubmitting(false);
    }
  };

  const ratingLabels: Record<number, string> = {
    1: 'سيء جداً',
    2: 'سيء',
    3: 'مقبول',
    4: 'جيد',
    5: 'ممتاز',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500" />
            تقييم الاجتماع
          </DialogTitle>
          <DialogDescription>
            {meeting?.subject}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Star Rating */}
          <div className="text-center space-y-3">
            <Label>كيف كان أداء الموظف؟</Label>
            <div className="flex items-center justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  onClick={() => setRating(star)}
                  className="transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-full p-1"
                >
                  <Star
                    className={`h-10 w-10 transition-colors ${
                      star <= (hoveredRating || rating)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'fill-muted text-muted-foreground hover:text-yellow-300'
                    }`}
                  />
                </button>
              ))}
            </div>
            {(hoveredRating || rating) > 0 && (
              <p className="text-sm font-medium text-primary animate-in fade-in">
                {ratingLabels[hoveredRating || rating]}
              </p>
            )}
          </div>

          {/* Comment */}
          <div className="space-y-2">
            <Label htmlFor="comment">ملاحظات إضافية (اختياري)</Label>
            <Textarea
              id="comment"
              placeholder="شاركنا رأيك وملاحظاتك لتحسين خدماتنا..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="min-h-[100px] resize-none"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            إلغاء
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || rating === 0} className="gap-2">
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            إرسال التقييم
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
