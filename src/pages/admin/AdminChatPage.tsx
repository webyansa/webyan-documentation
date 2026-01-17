import React from 'react';
import ProfessionalAgentInbox from '@/components/chat/inbox/ProfessionalAgentInbox';

export default function AdminChatPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">إدارة المحادثات</h1>
          <p className="text-muted-foreground text-sm">مراقبة وإدارة جميع المحادثات مع خيارات الأرشفة والحذف</p>
        </div>
      </div>
      <ProfessionalAgentInbox isAdmin={true} />
    </div>
  );
}
