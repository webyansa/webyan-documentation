// ============================================
// Centralized RBAC Permissions Matrix
// ============================================

import { Shield, Edit3, Headphones, Users } from 'lucide-react';

// The four main roles in the system
export type AppRole = 'admin' | 'editor' | 'support_agent' | 'client';

// Role metadata for UI display
export interface RoleInfo {
  name: string;
  nameEnglish: string;
  description: string;
  portal: 'admin' | 'support' | 'portal';
  loginPath: string;
  dashboardPath: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  badgeColor: string;
}

// Complete role definitions
export const rolesInfo: Record<AppRole, RoleInfo> = {
  admin: {
    name: 'مدير',
    nameEnglish: 'Admin',
    description: 'صلاحيات كاملة للوصول إلى جميع أجزاء النظام وإدارة المستخدمين والإعدادات',
    portal: 'admin',
    loginPath: '/admin/login',
    dashboardPath: '/admin',
    icon: Shield,
    color: 'text-red-600',
    badgeColor: 'bg-red-100 text-red-700',
  },
  editor: {
    name: 'محرر',
    nameEnglish: 'Editor',
    description: 'صلاحيات إدارة المحتوى والمقالات فقط، بدون إدارة المستخدمين والإعدادات',
    portal: 'admin',
    loginPath: '/admin/login',
    dashboardPath: '/admin',
    icon: Edit3,
    color: 'text-blue-600',
    badgeColor: 'bg-blue-100 text-blue-700',
  },
  support_agent: {
    name: 'دعم فني',
    nameEnglish: 'Support Agent',
    description: 'صلاحيات الرد على التذاكر والمحادثات وحضور الاجتماعات المُسندة',
    portal: 'support',
    loginPath: '/support/login',
    dashboardPath: '/support',
    icon: Headphones,
    color: 'text-orange-600',
    badgeColor: 'bg-orange-100 text-orange-700',
  },
  client: {
    name: 'عميل',
    nameEnglish: 'Client',
    description: 'صلاحيات الوصول لبوابة العملاء وفتح التذاكر والمحادثات وطلب الاجتماعات',
    portal: 'portal',
    loginPath: '/portal/login',
    dashboardPath: '/portal',
    icon: Users,
    color: 'text-green-600',
    badgeColor: 'bg-green-100 text-green-700',
  },
};

// Permission definitions for each role
export interface RolePermissions {
  // Admin Dashboard Access
  canAccessAdminDashboard: boolean;
  canViewReports: boolean;
  
  // User Management
  canManageUsers: boolean;
  canManageRoles: boolean;
  
  // Content Management
  canManageArticles: boolean;
  canManageContentTree: boolean;
  canManageMedia: boolean;
  canManageTags: boolean;
  canManageChangelog: boolean;
  
  // Support Features (Admin view)
  canViewAllTickets: boolean;
  canViewAllChats: boolean;
  canManageEscalation: boolean;
  canManageQuickReplies: boolean;
  canViewAllMeetings: boolean;
  canManageMeetingSettings: boolean;
  
  // Client Management
  canManageClients: boolean;
  canManageEmbedSettings: boolean;
  
  // Staff Management
  canManageStaff: boolean;
  canViewStaffPerformance: boolean;
  
  // System Settings
  canManageSystemSettings: boolean;
  canViewActivityLogs: boolean;
  canViewSearchLogs: boolean;
  
  // Support Portal Access
  canAccessSupportPortal: boolean;
  canReplyToAssignedTickets: boolean;
  canManageAssignedChats: boolean;
  canAttendAssignedMeetings: boolean;
  
  // Client Portal Access
  canAccessClientPortal: boolean;
  canCreateTickets: boolean;
  canCreateChats: boolean;
  canRequestMeetings: boolean;
  canUpdateOwnProfile: boolean;
}

// Permissions matrix for each role
export const rolePermissions: Record<AppRole, RolePermissions> = {
  admin: {
    // Full access to everything
    canAccessAdminDashboard: true,
    canViewReports: true,
    canManageUsers: true,
    canManageRoles: true,
    canManageArticles: true,
    canManageContentTree: true,
    canManageMedia: true,
    canManageTags: true,
    canManageChangelog: true,
    canViewAllTickets: true,
    canViewAllChats: true,
    canManageEscalation: true,
    canManageQuickReplies: true,
    canViewAllMeetings: true,
    canManageMeetingSettings: true,
    canManageClients: true,
    canManageEmbedSettings: true,
    canManageStaff: true,
    canViewStaffPerformance: true,
    canManageSystemSettings: true,
    canViewActivityLogs: true,
    canViewSearchLogs: true,
    canAccessSupportPortal: false,
    canReplyToAssignedTickets: false,
    canAttendAssignedMeetings: false,
    canManageAssignedChats: false,
    canAccessClientPortal: false,
    canCreateTickets: false,
    canCreateChats: false,
    canRequestMeetings: false,
    canUpdateOwnProfile: true,
  },
  editor: {
    // Content management only
    canAccessAdminDashboard: true,
    canViewReports: false,
    canManageUsers: false,
    canManageRoles: false,
    canManageArticles: true,
    canManageContentTree: true,
    canManageMedia: true,
    canManageTags: true,
    canManageChangelog: true,
    canViewAllTickets: false,
    canViewAllChats: false,
    canManageEscalation: false,
    canManageQuickReplies: false,
    canViewAllMeetings: false,
    canManageMeetingSettings: false,
    canManageClients: false,
    canManageEmbedSettings: false,
    canManageStaff: false,
    canViewStaffPerformance: false,
    canManageSystemSettings: false,
    canViewActivityLogs: false,
    canViewSearchLogs: false,
    canAccessSupportPortal: false,
    canReplyToAssignedTickets: false,
    canAttendAssignedMeetings: false,
    canManageAssignedChats: false,
    canAccessClientPortal: false,
    canCreateTickets: false,
    canCreateChats: false,
    canRequestMeetings: false,
    canUpdateOwnProfile: true,
  },
  support_agent: {
    // Support portal access only
    canAccessAdminDashboard: false,
    canViewReports: false,
    canManageUsers: false,
    canManageRoles: false,
    canManageArticles: false,
    canManageContentTree: false,
    canManageMedia: false,
    canManageTags: false,
    canManageChangelog: false,
    canViewAllTickets: false,
    canViewAllChats: false,
    canManageEscalation: false,
    canManageQuickReplies: false,
    canViewAllMeetings: false,
    canManageMeetingSettings: false,
    canManageClients: false,
    canManageEmbedSettings: false,
    canManageStaff: false,
    canViewStaffPerformance: false,
    canManageSystemSettings: false,
    canViewActivityLogs: false,
    canViewSearchLogs: false,
    canAccessSupportPortal: true,
    canReplyToAssignedTickets: true,
    canAttendAssignedMeetings: true,
    canManageAssignedChats: true,
    canAccessClientPortal: false,
    canCreateTickets: false,
    canCreateChats: false,
    canRequestMeetings: false,
    canUpdateOwnProfile: true,
  },
  client: {
    // Client portal access only
    canAccessAdminDashboard: false,
    canViewReports: false,
    canManageUsers: false,
    canManageRoles: false,
    canManageArticles: false,
    canManageContentTree: false,
    canManageMedia: false,
    canManageTags: false,
    canManageChangelog: false,
    canViewAllTickets: false,
    canViewAllChats: false,
    canManageEscalation: false,
    canManageQuickReplies: false,
    canViewAllMeetings: false,
    canManageMeetingSettings: false,
    canManageClients: false,
    canManageEmbedSettings: false,
    canManageStaff: false,
    canViewStaffPerformance: false,
    canManageSystemSettings: false,
    canViewActivityLogs: false,
    canViewSearchLogs: false,
    canAccessSupportPortal: false,
    canReplyToAssignedTickets: false,
    canAttendAssignedMeetings: false,
    canManageAssignedChats: false,
    canAccessClientPortal: true,
    canCreateTickets: true,
    canCreateChats: true,
    canRequestMeetings: true,
    canUpdateOwnProfile: true,
  },
};

// Helper to get permissions for a role
export function getPermissionsForRole(role: AppRole | null): RolePermissions | null {
  if (!role || !rolePermissions[role]) return null;
  return rolePermissions[role];
}

// Helper to check if a role can access admin dashboard
export function canAccessAdmin(role: AppRole | null): boolean {
  if (!role) return false;
  return role === 'admin' || role === 'editor';
}

// Helper to check if a role can access support portal
export function canAccessSupport(role: AppRole | null): boolean {
  if (!role) return false;
  return role === 'support_agent';
}

// Helper to get the correct portal redirect for a role
export function getPortalRedirect(role: AppRole | null): string {
  if (!role) return '/';
  return rolesInfo[role]?.dashboardPath || '/';
}

// Helper to get the correct login path for a role
export function getLoginPath(role: AppRole | null): string {
  if (!role) return '/';
  return rolesInfo[role]?.loginPath || '/';
}

// List of all roles in order
export const allRoles: AppRole[] = ['admin', 'editor', 'support_agent', 'client'];

// Admin sidebar permissions matrix
export interface AdminNavPermission {
  permission: keyof RolePermissions;
  adminOnly?: boolean;
}
