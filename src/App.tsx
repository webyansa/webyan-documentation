import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";

// Public pages
import HomePage from "./pages/HomePage";
import ModulePage from "./pages/ModulePage";
import ArticlePage from "./pages/ArticlePage";
import SearchPage from "./pages/SearchPage";
import ChangelogPage from "./pages/ChangelogPage";
import ReportIssuePage from "./pages/ReportIssuePage";
import GettingStartedPage from "./pages/GettingStartedPage";
import AuthPage from "./pages/AuthPage";
import NotFound from "./pages/NotFound";
import SubmitTicketPage from "./pages/SubmitTicketPage";
import MyTicketsPage from "./pages/MyTicketsPage";
import TicketDetailPage from "./pages/TicketDetailPage";
import TrackTicketPage from "./pages/TrackTicketPage";
import PortalLoginPage from "./pages/PortalLoginPage";

// Admin pages
import AdminLayout from "./pages/admin/AdminLayout";
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

// Client Portal pages
import PortalLayout from "./pages/portal/PortalLayout";
import PortalDashboard from "./pages/portal/PortalDashboard";
import PortalTickets from "./pages/portal/PortalTickets";
import PortalNewTicket from "./pages/portal/PortalNewTicket";
import PortalTicketDetail from "./pages/portal/PortalTicketDetail";
import PortalMeetings from "./pages/portal/PortalMeetings";
import PortalNewMeeting from "./pages/portal/PortalNewMeeting";
import PortalSubscription from "./pages/portal/PortalSubscription";
import PortalMessages from "./pages/portal/PortalMessages";
import PortalSettings from "./pages/portal/PortalSettings";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<HomePage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/getting-started" element={<GettingStartedPage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/changelog" element={<ChangelogPage />} />
            <Route path="/report-issue" element={<ReportIssuePage />} />
            <Route path="/submit-ticket" element={<SubmitTicketPage />} />
            <Route path="/my-tickets" element={<MyTicketsPage />} />
            <Route path="/my-tickets/:ticketId" element={<TicketDetailPage />} />
            <Route path="/track-ticket" element={<TrackTicketPage />} />
            <Route path="/portal-login" element={<PortalLoginPage />} />
            <Route path="/docs/:moduleSlug" element={<ModulePage />} />
            <Route path="/docs/:moduleSlug/:subModuleSlug" element={<ModulePage />} />
            <Route path="/docs/:moduleSlug/:subModuleSlug/:articleSlug" element={<ArticlePage />} />
            
            {/* Client Portal Routes */}
            <Route path="/portal" element={<PortalLayout />}>
              <Route index element={<PortalDashboard />} />
              <Route path="tickets" element={<PortalTickets />} />
              <Route path="tickets/new" element={<PortalNewTicket />} />
              <Route path="tickets/:id" element={<PortalTicketDetail />} />
              <Route path="meetings" element={<PortalMeetings />} />
              <Route path="meetings/new" element={<PortalNewMeeting />} />
              <Route path="subscription" element={<PortalSubscription />} />
              <Route path="messages" element={<PortalMessages />} />
              <Route path="settings" element={<PortalSettings />} />
            </Route>
            
            {/* Admin Routes */}
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
            </Route>
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
