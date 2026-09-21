import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { RequireProfileCompletion } from './components/RequireProfileCompletion';
import { AppLayout } from './layouts/AppLayout';

import { LoginPage } from './pages/LoginPage';
import { CompleteRegisterPage } from './pages/CompleteRegisterPage';
import { HomePage } from './pages/HomePage';
import { BookingPage } from './pages/BookingPage';
import { BookingSuccessPage } from './pages/BookingSuccessPage';
import { ProfilePage } from './pages/ProfilePage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { SettingsPage } from './pages/SettingsPage';
import { AboutPage } from './pages/AboutPage';
import { TermsPage } from './pages/TermsPage';
import { PrivacyPolicyPage } from './pages/PrivacyPolicyPage';
import { FAQPage } from './pages/FAQPage';
import { SupportPage, ChatPage, ReportPage, RatingPage } from './pages/SupportPage';
import { RegisterPage, VerifyOtpPage, ResetSuccessPage } from './pages/AuthAuxPages';
import { InstallPCPage } from './pages/InstallPCPage';
import { InstallMobilePage } from './pages/InstallMobilePage';
import { FloatingInstallBanner } from './components/FloatingInstallBanner';

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <FloatingInstallBanner />
        <Routes>
          <Route path="/" element={<Navigate to="/home" replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/verify-otp" element={<VerifyOtpPage />} />
          <Route path="/reset-success" element={<ResetSuccessPage />} />

          <Route
            path="/complete-register"
            element={
              <ProtectedRoute>
                <CompleteRegisterPage />
              </ProtectedRoute>
            }
          />

          <Route
            element={
              <ProtectedRoute>
                <RequireProfileCompletion>
                  <AppLayout />
                </RequireProfileCompletion>
              </ProtectedRoute>
            }
          >
            <Route path="/home" element={<HomePage />} />
            <Route path="/agendar" element={<BookingPage />} />
            <Route path="/perfil" element={<ProfilePage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/support" element={<SupportPage />} />
            <Route path="/rating" element={<RatingPage />} />
            <Route path="/faq" element={<FAQPage />} />
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/report" element={<ReportPage />} />
            <Route path="/privacy" element={<PrivacyPolicyPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/instalar-pc" element={<InstallPCPage />} />
            <Route path="/instalar-celular" element={<InstallMobilePage />} />
            <Route path="/instalar" element={<Navigate to="/instalar-pc" replace />} />
            <Route path="/booking-success" element={<BookingSuccessPage />} />
          </Route>

          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminDashboardPage />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/home" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
