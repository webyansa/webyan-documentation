import React from 'react';
import { MessageCircle, Users, Clock } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ChatStatsWidgetProps {
  unreadCustomers: number;
  unreadInternal: number;
  unassignedCount: number;
  className?: string;
}

export function ChatStatsWidget({ 
  unreadCustomers, 
  unreadInternal, 
  unassignedCount,
  className 
}: ChatStatsWidgetProps) {
  const hasNotifications = unreadCustomers > 0 || unreadInternal > 0 || unassignedCount > 0;

  if (!hasNotifications) return null;

  return (
    <Card className={cn("p-3 flex items-center gap-4", className)}>
      {unreadCustomers > 0 && (
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
            <MessageCircle className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">رسائل العملاء</p>
            <Badge variant="destructive" className="text-xs">
              {unreadCustomers} جديدة
            </Badge>
          </div>
        </div>
      )}
      
      {unreadInternal > 0 && (
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-secondary/10 flex items-center justify-center">
            <Users className="h-4 w-4 text-secondary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">رسائل داخلية</p>
            <Badge variant="secondary" className="text-xs">
              {unreadInternal} جديدة
            </Badge>
          </div>
        </div>
      )}
      
      {unassignedCount > 0 && (
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-amber-500/10 flex items-center justify-center">
            <Clock className="h-4 w-4 text-amber-500" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">غير مسندة</p>
            <Badge variant="outline" className="text-xs border-amber-500 text-amber-600">
              {unassignedCount} محادثة
            </Badge>
          </div>
        </div>
      )}
    </Card>
  );
}
