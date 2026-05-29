import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { HelmetProvider } from 'react-helmet-async';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { Toaster } from './components/ui/sonner';
import { ReactNode } from 'react';

import { LandingPage }         from './pages/LandingPage';
import { LoginPage }           from './pages/LoginPage';
import { SignupPage }          from './pages/SignupPage';
import { ForgotPasswordPage }  from './pages/ForgotPasswordPage';
import { OnboardingPage }      from './pages/OnboardingPage';
import { DashboardPage }       from './pages/DashboardPage';
import { AuditsPage }          from './pages/AuditsPage';
import { AccountAuditPage }    from './pages/AccountAuditPage';
import { AuditRunningPage }    from './pages/AuditRunningPage';
import { ReportsPage }         from './pages/ReportsPage';
import { SharedReportPage }    from './pages/SharedReportPage';
import { AlertsPage }          from './pages/AlertsPage';
import { MonitoringPage }      from './pages/MonitoringPage';
import { AnalyticsPage }       from './pages/AnalyticsPage';
import { WhiteLabelPage }      from './pages/WhiteLabelPage';
import { IntegrationsPage }    from './pages/IntegrationsPage';
import { BillingPage }         from './pages/BillingPage';
import { SettingsPage }        from './pages/SettingsPage';
import { TeamPage }            from './pages/TeamPage';
import { NotificationPrefsPage } from './pages/NotificationPrefsPage';
import { ApiDocsPage }         from './pages/ApiDocsPage';
import { GoogleAdsCallbackPage } from './pages/GoogleAdsCallbackPage';
import { NotFoundPage }        from './pages/NotFoundPage';

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

function PublicOnlyRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return null;
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <>{children}</>;
}

export default function App() {
  return (
    <HelmetProvider>
    <AuthProvider>
      <Toaster position="bottom-right" richColors />
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} />
          <Route path="/signup" element={<PublicOnlyRoute><SignupPage /></PublicOnlyRoute>} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reports/share/:token" element={<SharedReportPage />} />
          <Route path="/integrations/google-ads/callback" element={<GoogleAdsCallbackPage />} />

          {/* Onboarding (auth required, but before full workspace setup) */}
          <Route path="/onboarding" element={<ProtectedRoute><OnboardingPage /></ProtectedRoute>} />

          {/* App */}
          <Route path="/dashboard"    element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/audits"       element={<ProtectedRoute><AuditsPage /></ProtectedRoute>} />
          <Route path="/accounts/:accountId" element={<ProtectedRoute><AccountAuditPage /></ProtectedRoute>} />
          <Route path="/audit/:runId/running" element={<ProtectedRoute><AuditRunningPage /></ProtectedRoute>} />
          <Route path="/reports"      element={<ProtectedRoute><ReportsPage /></ProtectedRoute>} />
          <Route path="/alerts"       element={<ProtectedRoute><AlertsPage /></ProtectedRoute>} />
          <Route path="/monitoring"   element={<ProtectedRoute><MonitoringPage /></ProtectedRoute>} />
          <Route path="/analytics"    element={<ProtectedRoute><AnalyticsPage /></ProtectedRoute>} />
          <Route path="/white-label"  element={<ProtectedRoute><WhiteLabelPage /></ProtectedRoute>} />
          <Route path="/integrations" element={<ProtectedRoute><IntegrationsPage /></ProtectedRoute>} />
          <Route path="/billing"      element={<ProtectedRoute><BillingPage /></ProtectedRoute>} />
          <Route path="/settings"     element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
          <Route path="/settings/team" element={<ProtectedRoute><TeamPage /></ProtectedRoute>} />
          <Route path="/settings/notifications" element={<ProtectedRoute><NotificationPrefsPage /></ProtectedRoute>} />
          <Route path="/docs"         element={<ProtectedRoute><ApiDocsPage /></ProtectedRoute>} />

          {/* 404 */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
    </HelmetProvider>
  );
}
