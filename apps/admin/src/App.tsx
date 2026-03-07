import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { DateFilterProvider } from '@/context/DateFilterContext';
import { ThemeProvider } from 'next-themes';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useEffect } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import LoginPage from '@/pages/LoginPage';
import DashboardPage from '@/pages/DashboardPage';
import CompaniesPage from '@/pages/CompaniesPage';
import CompanyDetailPage from '@/pages/CompanyDetailPage';
import ProjectsPage from '@/pages/ProjectsPage';
import ProjectDetailPage from '@/pages/ProjectDetailPage';
import InvoicesPage from '@/pages/InvoicesPage';
import InvoiceDetailPage from '@/pages/InvoiceDetailPage';
import LeadsPage from '@/pages/LeadsPage';
import CmsPage from '@/pages/CmsPage';
import AboutCmsPage from '@/pages/settings/cms/AboutCmsPage';
import StaffPage from '@/pages/StaffPage';
import StaffProfilePage from '@/pages/StaffProfilePage';
import SettingsPage from '@/pages/SettingsPage';
import NotFoundPage from '@/pages/NotFoundPage';
import WorkLogsPage from '@/pages/WorkLogsPage';
import NoticesPage from '@/pages/NoticesPage';
import NoticeDetailPage from '@/pages/NoticeDetailPage';
import ProfilePage from '@/pages/ProfilePage';
import RecycleBinPage from '@/pages/RecycleBinPage';
import StaffManagementPage from '@/pages/StaffManagementPage';
import RoleManagementPage from '@/pages/RoleManagementPage';
import { ToastContainer } from '@/components/Toast';
import SetupPage from '@/pages/SetupPage';

function DynamicFavicon() {
  const { data: settings } = useQuery({
    queryKey: ['site-settings-favicon'],
    queryFn: async () => {
      const { data } = await supabase.from('site_settings').select('company_logo_url').eq('id', 1).single();
      return data;
    },
    staleTime: 60000, // 1 minute
  });

  useEffect(() => {
    if (settings?.company_logo_url) {
      const link: HTMLLinkElement = document.querySelector("link[rel~='icon']") || document.createElement('link');
      link.type = 'image/svg+xml';
      link.rel = 'icon';
      link.href = settings.company_logo_url;
      document.getElementsByTagName('head')[0].appendChild(link);
    }
  }, [settings?.company_logo_url]);

  return null;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <div className="h-10 w-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        <p className="text-muted-foreground text-sm">Loading...</p>
      </div>
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  // If the user was assigned a temp password, force setup
  if ((profile as any)?.force_password_change) return <Navigate to="/setup" replace />;
  return <>{children}</>;
}

function PermissionRoute({ permission, children }: { permission: string; children: React.ReactNode }) {
  const { can } = useAuth();
  if (!can(permission)) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center px-4">
        <div className="h-16 w-16 bg-red-100 dark:bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Access Denied</h2>
        <p className="text-muted-foreground max-w-md">
          You don't have permission to access this page. Please contact your administrator if you need access.
        </p>
      </div>
    );
  }
  return <>{children}</>;
}

function AppRoutes() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/setup" element={user ? <SetupPage /> : <Navigate to="/login" replace />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <DateFilterProvider>
              <AdminLayout />
            </DateFilterProvider>
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="companies" element={<PermissionRoute permission="manage_companies"><CompaniesPage /></PermissionRoute>} />
        <Route path="companies/:id" element={<PermissionRoute permission="manage_companies"><CompanyDetailPage /></PermissionRoute>} />
        <Route path="projects" element={<PermissionRoute permission="view_projects"><ProjectsPage /></PermissionRoute>} />
        <Route path="projects/:id" element={<PermissionRoute permission="view_projects"><ProjectDetailPage /></PermissionRoute>} />
        <Route path="invoices" element={<PermissionRoute permission="manage_invoices"><InvoicesPage /></PermissionRoute>} />
        <Route path="invoices/:id" element={<PermissionRoute permission="manage_invoices"><InvoiceDetailPage /></PermissionRoute>} />
        <Route path="leads" element={<PermissionRoute permission="view_leads"><LeadsPage /></PermissionRoute>} />
        <Route path="cms" element={<PermissionRoute permission="manage_cms"><CmsPage /></PermissionRoute>} />
        <Route path="cms/about" element={<PermissionRoute permission="manage_cms"><AboutCmsPage /></PermissionRoute>} />
        <Route path="staff" element={<PermissionRoute permission="view_staff"><StaffPage /></PermissionRoute>} />
        <Route path="staff/:id" element={<PermissionRoute permission="view_staff"><StaffProfilePage /></PermissionRoute>} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="work-logs" element={<PermissionRoute permission="view_audit_logs"><WorkLogsPage /></PermissionRoute>} />
        <Route path="notices" element={<PermissionRoute permission="view_notices"><NoticesPage /></PermissionRoute>} />
        <Route path="notices/:id" element={<PermissionRoute permission="view_notices"><NoticeDetailPage /></PermissionRoute>} />
        <Route path="staff-management" element={<PermissionRoute permission="manage_staff"><StaffManagementPage /></PermissionRoute>} />
        <Route path="role-management" element={<PermissionRoute permission="manage_roles"><RoleManagementPage /></PermissionRoute>} />
        <Route path="recycle-bin" element={<RecycleBinPage />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <AuthProvider>
          <DynamicFavicon />
          <AppRoutes />
          <ToastContainer />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
