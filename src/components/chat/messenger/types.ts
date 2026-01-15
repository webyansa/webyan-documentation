// Messenger Chat System Types

export interface ChatBranding {
  primaryColor: string;
  logoUrl?: string;
  agentAvatarUrl?: string;
  widgetPosition: 'left' | 'right';
  welcomeText: string;
  offlineText: string;
  organizationName: string;
}

export interface ChatWindow {
  id: string;
  conversationId: string;
  title: string;
  isMinimized: boolean;
  unreadCount: number;
}

export interface TypingIndicator {
  conversationId: string;
  userId: string;
  userName: string;
  timestamp: number;
}

export const defaultBranding: ChatBranding = {
  primaryColor: '#263c84',
  widgetPosition: 'left',
  welcomeText: 'مرحباً! كيف يمكننا مساعدتك؟',
  offlineText: 'نحن غير متاحين حالياً، سنرد عليك قريباً',
  organizationName: 'فريق الدعم'
};
