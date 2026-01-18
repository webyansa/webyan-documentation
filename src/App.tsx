import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { StaffAuthProvider } from "@/hooks/useStaffAuth";

// Public pages
import HomePage from "./pages/HomePage";
import ModulePage from "./pages/ModulePage";
import ArticlePage from "./pages/ArticlePage";
import SearchPage from "./pages/SearchPage";
import ChangelogPage from "./pages/ChangelogPage";
import ReportIssuePage from "./pages/ReportIssuePage";
import GettingStartedPage from "./pages/GettingStartedPage";
import NotFound from "./pages/NotFound";
import SubmitTicketPage from "./pages/SubmitTicketPage";
import MyTicketsPage from "./pages/MyTicketsPage";
import TicketDetailPage from "./pages/TicketDetailPage";
import TrackTicketPage from "./pages/TrackTicketPage";
import EmbedTicketPage from "./pages/embed/EmbedTicketPage";
import EmbedChatPage from "./pages/embed/EmbedChatPage";
import UnauthorizedPage from "./pages/UnauthorizedPage";

// Admin pages
import AdminLayout from "./pages/admin/AdminLayout";
import AdminLoginPage from "./pages/admin/AdminLoginPage";
import DashboardPage from "./pages/admin/DashboardPage";
import ArticlesPage from "./pages/admin/ArticlesPage";
import ArticleEditorPage from "./pages/admin/ArticleEditorPage";
import ContentTreePage from "./pages/admin/ContentTreePage";
import MediaPage from "./pages/admin/MediaPage";
import TagsPage from "./pages/admin/TagsPage";
import AdminChangelogPage from "./pages/admin/AdminChangelogPage";
import FeedbackPage from "./pages/admin/FeedbackPage";
import IssuesPage from "./pages/admin/IssuesPage";
import SearchLogsPage from "./pages/admin/SearchLogsPage";
import ReportsPage from "./pages/admin/ReportsPage";
import UsersPage from "./pages/admin/UsersPage";
import SettingsPage from "./pages/admin/SettingsPage";
import AdminTicketsPage from "./pages/admin/AdminTicketsPage";
import ClientsPage from "./pages/admin/ClientsPage";
import AdminMeetingsPage from "./pages/admin/AdminMeetingsPage";
import MeetingSettingsPage from "./pages/admin/MeetingSettingsPage";
import StaffPage from "./pages/admin/StaffPage";
import StaffPerformancePage from "./pages/admin/StaffPerformancePage";
import EscalationSettingsPage from "./pages/admin/EscalationSettingsPage";
import EmbedSettingsPage from "./pages/admin/EmbedSettingsPage";
import ChatSettingsPage from "./pages/admin/ChatSettingsPage";
import AdminChatPage from "./pages/admin/AdminChatPage";
import QuickRepliesPage from "./pages/admin/QuickRepliesPage";
import ChatEmbedSettingsPage from "./pages/admin/ChatEmbedSettingsPage";
import ArchivedChatsPage from "./pages/admin/ArchivedChatsPage";
import RolesManagementPage from "./pages/admin/RolesManagementPage";
import ActivityLogPage from "./pages/admin/ActivityLogPage";

// Client Portal pages
import PortalLayout from "./pages/portal/PortalLayout";
import PortalLoginPage from "./pages/portal/PortalLoginPage";
import PortalForgotPasswordPage from "./pages/portal/PortalForgotPasswordPage";
import PortalResetPasswordPage from "./pages/portal/PortalResetPasswordPage";
import PortalDashboard from "./pages/portal/PortalDashboard";
import PortalTickets from "./pages/portal/PortalTickets";
import PortalNewTicket from "./pages/portal/PortalNewTicket";
import PortalTicketDetail from "./pages/portal/PortalTicketDetail";
import PortalMeetings from "./pages/portal/PortalMeetings";
import PortalNewMeeting from "./pages/portal/PortalNewMeeting";
import PortalSubscription from "./pages/portal/PortalSubscription";
import PortalMessages from "./pages/portal/PortalMessages";
import PortalChat from "./pages/portal/PortalChat";
import PortalSettings from "./pages/portal/PortalSettings";

// Support/Staff Portal pages
import StaffLayout from "./pages/staff/StaffLayout";
import SupportLoginPage from "./pages/staff/SupportLoginPage";
import StaffDashboard from "./pages/staff/StaffDashboard";
import StaffTickets from "./pages/staff/StaffTickets";
import StaffMeetings from "./pages/staff/StaffMeetings";
import StaffContent from "./pages/staff/StaffContent";
import StaffChatPage from "./pages/staff/StaffChatPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Disable automatic refetch on window focus to prevent data reload
      // when user switches tabs and returns - this preserves bfcache behavior
      refetchOnWindowFocus: false,
      // Keep data fresh but don't refetch on reconnect automatically
      refetchOnReconnect: false,
      // Keep stale data longer to prevent unnecessary refetches
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <StaffAuthProvider>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<HomePage />} />
              <Route path="/getting-started" element={<GettingStartedPage />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/changelog" element={<ChangelogPage />} />
              <Route path="/report-issue" element={<ReportIssuePage />} />
              <Route path="/submit-ticket" element={<SubmitTicketPage />} />
              <Route path="/my-tickets" element={<MyTicketsPage />} />
              <Route path="/my-tickets/:ticketId" element={<TicketDetailPage />} />
              <Route path="/track-ticket" element={<TrackTicketPage />} />
              <Route path="/embed/ticket" element={<EmbedTicketPage />} />
              <Route path="/embed/chat" element={<EmbedChatPage />} />
              <Route path="/docs/:moduleSlug" element={<ModulePage />} />
              <Route path="/docs/:moduleSlug/:subModuleSlug" element={<ModulePage />} />
              <Route path="/docs/:moduleSlug/:subModuleSlug/:articleSlug" element={<ArticlePage />} />
              
              {/* Legacy routes - redirect to new paths */}
              <Route path="/auth" element={<Navigate to="/admin/login" replace />} />
              <Route path="/portal-login" element={<Navigate to="/portal/login" replace />} />
              <Route path="/staff" element={<Navigate to="/support" replace />} />
              <Route path="/staff/*" element={<Navigate to="/support" replace />} />
              
              {/* Client Portal Routes - Public */}
              <Route path="/portal/login" element={<PortalLoginPage />} />
              <Route path="/portal/forgot-password" element={<PortalForgotPasswordPage />} />
              <Route path="/portal/reset-password" element={<PortalResetPasswordPage />} />
              
              {/* Client Portal Routes - Protected */}
              <Route path="/portal" element={<PortalLayout />}>
                <Route index element={<PortalDashboard />} />
                <Route path="tickets" element={<PortalTickets />} />
                <Route path="tickets/new" element={<PortalNewTicket />} />
                <Route path="tickets/:id" element={<PortalTicketDetail />} />
                <Route path="chat" element={<PortalChat />} />
                <Route path="meetings" element={<PortalMeetings />} />
                <Route path="meetings/new" element={<PortalNewMeeting />} />
                <Route path="subscription" element={<PortalSubscription />} />
                <Route path="messages" element={<PortalMessages />} />
                <Route path="settings" element={<PortalSettings />} />
              </Route>

              {/* Support/Staff Portal Routes */}
              <Route path="/support/login" element={<SupportLoginPage />} />
              <Route path="/support" element={<StaffLayout />}>
                <Route index element={<StaffDashboard />} />
                <Route path="tickets" element={<StaffTickets />} />
                <Route path="tickets/:id" element={<StaffTickets />} />
                <Route path="chat" element={<StaffChatPage />} />
                <Route path="meetings" element={<StaffMeetings />} />
                <Route path="meetings/:id" element={<StaffMeetings />} />
                <Route path="content" element={<StaffContent />} />
              </Route>
              
              {/* Admin Routes */}
              <Route path="/admin/login" element={<AdminLoginPage />} />
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<DashboardPage />} />
                <Route path="articles" element={<ArticlesPage />} />
                <Route path="articles/new" element={<ArticleEditorPage />} />
                <Route path="articles/:id" element={<ArticleEditorPage />} />
                <Route path="content-tree" element={<ContentTreePage />} />
                <Route path="media" element={<MediaPage />} />
                <Route path="tags" element={<TagsPage />} />
                <Route path="changelog" element={<AdminChangelogPage />} />
                <Route path="feedback" element={<FeedbackPage />} />
                <Route path="issues" element={<IssuesPage />} />
                <Route path="search-logs" element={<SearchLogsPage />} />
                <Route path="reports" element={<ReportsPage />} />
                <Route path="users" element={<UsersPage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="tickets" element={<AdminTicketsPage />} />
                <Route path="clients" element={<ClientsPage />} />
                <Route path="meetings" element={<AdminMeetingsPage />} />
                <Route path="meeting-settings" element={<MeetingSettingsPage />} />
                <Route path="staff" element={<StaffPage />} />
                <Route path="staff-performance" element={<StaffPerformancePage />} />
                <Route path="escalation-settings" element={<EscalationSettingsPage />} />
                <Route path="embed-settings" element={<EmbedSettingsPage />} />
                <Route path="chat-settings" element={<ChatSettingsPage />} />
                <Route path="chat" element={<AdminChatPage />} />
                <Route path="quick-replies" element={<QuickRepliesPage />} />
                <Route path="chat-embed" element={<ChatEmbedSettingsPage />} />
                <Route path="archived-chats" element={<ArchivedChatsPage />} />
                <Route path="roles" element={<RolesManagementPage />} />
                <Route path="activity-log" element={<ActivityLogPage />} />
              </Route>
              
              {/* Unauthorized Page */}
              <Route path="/unauthorized" element={<UnauthorizedPage />} />
              
              <Route path="*" element={<NotFound />} />
            </Routes>
          </StaffAuthProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
