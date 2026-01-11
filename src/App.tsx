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
            <Route path="/docs/:moduleSlug" element={<ModulePage />} />
            <Route path="/docs/:moduleSlug/:subModuleSlug" element={<ModulePage />} />
            <Route path="/docs/:moduleSlug/:subModuleSlug/:articleSlug" element={<ArticlePage />} />
            
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
            </Route>
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
