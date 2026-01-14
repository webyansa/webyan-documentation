import { format, formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { 
  MessageSquare, 
  CheckCircle2, 
  Clock, 
  UserPlus, 
  Edit, 
  AlertCircle,
  Calendar
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

export interface ActivityItem {
  id: string;
  type: 'reply' | 'status_change' | 'assigned' | 'note' | 'created' | 'completed';
  message: string;
  user: string;
  created_at: string;
  metadata?: {
    old_status?: string;
    new_status?: string;
    staff_note?: string;
  };
}

const activityIcons = {
  reply: MessageSquare,
  status_change: Edit,
  assigned: UserPlus,
  note: AlertCircle,
  created: Calendar,
  completed: CheckCircle2,
};

const activityColors = {
  reply: 'bg-blue-100 text-blue-600',
  status_change: 'bg-yellow-100 text-yellow-600',
  assigned: 'bg-purple-100 text-purple-600',
  note: 'bg-orange-100 text-orange-600',
  created: 'bg-gray-100 text-gray-600',
  completed: 'bg-green-100 text-green-600',
};

interface ActivityTimelineProps {
  activities: ActivityItem[];
  maxHeight?: string;
}

export function ActivityTimeline({ activities, maxHeight = '300px' }: ActivityTimelineProps) {
  if (activities.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>لا توجد أنشطة بعد</p>
      </div>
    );
  }

  return (
    <ScrollArea style={{ maxHeight }} className="pr-4">
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute right-[15px] top-0 bottom-0 w-0.5 bg-border" />
        
        <div className="space-y-4">
          {activities.map((activity) => {
            const Icon = activityIcons[activity.type] || Clock;
            const colorClass = activityColors[activity.type] || 'bg-gray-100 text-gray-600';
            
            return (
              <div key={activity.id} className="relative flex gap-4 pr-8">
                {/* Icon */}
                <div className={`absolute right-0 w-8 h-8 rounded-full flex items-center justify-center ${colorClass} z-10`}>
                  <Icon className="h-4 w-4" />
                </div>
                
                {/* Content */}
                <div className="flex-1 bg-muted/50 rounded-lg p-3">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="text-sm font-medium text-foreground">{activity.message}</p>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{activity.user}</span>
                    <span>•</span>
                    <span title={format(new Date(activity.created_at), 'dd/MM/yyyy HH:mm', { locale: ar })}>
                      {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true, locale: ar })}
                    </span>
                  </div>
                  {activity.metadata?.staff_note && (
                    <div className="mt-2 p-2 bg-background rounded text-sm text-muted-foreground border-r-2 border-primary">
                      {activity.metadata.staff_note}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </ScrollArea>
  );
}
