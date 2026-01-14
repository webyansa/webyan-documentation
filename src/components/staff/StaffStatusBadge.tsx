import { Badge } from '@/components/ui/badge';
import { 
  Clock, 
  Eye, 
  Wrench, 
  CheckCircle2, 
  XCircle, 
  PauseCircle,
  Calendar,
  Video
} from 'lucide-react';

// Staff-specific statuses for tickets
export const staffTicketStatuses = {
  reviewing: { label: 'قيد المراجعة', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: Eye },
  working: { label: 'جاري العمل', color: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: Wrench },
  waiting_client: { label: 'بانتظار العميل', color: 'bg-orange-100 text-orange-700 border-orange-200', icon: Clock },
  escalated: { label: 'تم التصعيد', color: 'bg-red-100 text-red-700 border-red-200', icon: XCircle },
  resolved: { label: 'تم الحل', color: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle2 },
  on_hold: { label: 'معلقة', color: 'bg-gray-100 text-gray-700 border-gray-200', icon: PauseCircle },
};

// Staff-specific statuses for meetings
export const staffMeetingStatuses = {
  preparing: { label: 'جاري التحضير', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: Calendar },
  in_progress: { label: 'جاري الانعقاد', color: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: Video },
  completed: { label: 'منتهي', color: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle2 },
  rescheduled: { label: 'مؤجل', color: 'bg-orange-100 text-orange-700 border-orange-200', icon: Clock },
};

interface StatusBadgeProps {
  status: string;
  type: 'ticket' | 'meeting';
  className?: string;
}

export function StaffStatusBadge({ status, type, className }: StatusBadgeProps) {
  const config: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = 
    type === 'ticket' ? staffTicketStatuses : staffMeetingStatuses;
  const statusInfo = config[status];
  
  if (!statusInfo) {
    return <Badge variant="outline" className={className}>{status}</Badge>;
  }

  const Icon = statusInfo.icon;

  return (
    <Badge variant="outline" className={`gap-1 ${statusInfo.color} ${className}`}>
      <Icon className="h-3 w-3" />
      {statusInfo.label}
    </Badge>
  );
}

export function getStaffTicketStatusOptions() {
  return Object.entries(staffTicketStatuses).map(([value, config]) => ({
    value,
    label: config.label,
    icon: config.icon,
  }));
}

export function getStaffMeetingStatusOptions() {
  return Object.entries(staffMeetingStatuses).map(([value, config]) => ({
    value,
    label: config.label,
    icon: config.icon,
  }));
}
