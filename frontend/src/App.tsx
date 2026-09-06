import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { KoisaWidget } from '@/components/ai/KoisaWidget';
import LandingPage from '@/pages/LandingPage';
import LoginPage from '@/pages/LoginPage';
import ClientLoginPage from '@/pages/ClientLoginPage';
import OnboardingPage from '@/pages/OnboardingPage';
import DashboardPage from '@/pages/DashboardPage';
import AdminPage from '@/pages/AdminPage';

// Routes where the floating Koisa launcher should be hidden (auth surfaces).
const HIDE_KOISA_ON = new Set(['/login', '/client-login']);

export default function App() {
  const location = useLocation();
  const showKoisa = !HIDE_KOISA_ON.has(location.pathname);

  return (
    <>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/client-login" element={<ClientLoginPage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute loginPath="/client-login">
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute roles={['ADVISER', 'ADVISER_ASSISTANT', 'COMPLIANCE_OFFICER', 'PLATFORM_ADMIN']}>
              <AdminPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* Global assistant — public on marketing pages, authenticated inside the app. */}
      {showKoisa && <KoisaWidget />}
    </>
  );
}
