import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { AuthPage } from '@/components/auth/AuthPage';
import { EmailVerificationWaiting } from '@/components/auth/EmailVerificationWaiting';
import { MobileWarning } from '@/components/MobileWarning';
import { EditorPage } from '@/pages/EditorPage';
import { FirmwareInstaller } from '@/pages/FirmwareInstaller';
import { DocsPage } from '@/pages/DocsPage';
import { PinSettingsPage } from '@/pages/PinSettingsPage';
import { CompileServerSettingsPage } from '@/pages/CompileServerSettingsPage';
import { ProjectsPage } from '@/pages/ProjectsPage';
import { ResetPasswordPage } from '@/pages/ResetPasswordPage';
import { VerifyEmailPage } from '@/pages/VerifyEmailPage';
import { RecoveryPage } from '@/pages/RecoveryPage';
import { AdminPage } from '@/pages/AdminPage';
import { AboutPage } from '@/pages/AboutPage';
import { ClassesPage } from '@/pages/ClassesPage';
import { ClassDetailPage } from '@/pages/ClassDetailPage';
import { AssignmentSubmissionsPage } from '@/pages/AssignmentSubmissionsPage';
import { initBlocklyMessages } from '@/utils/blocklyMessages';

// モバイルデバイス検出フック
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
}

// 保護されたルート
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-muted-foreground">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}

// 認証ページ（ログイン済みならホームへ）
function AuthRoute() {
  const { isAuthenticated, isLoading, login, register, error, clearError } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'login' | 'register' | 'recovery'>('login');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);

  useEffect(() => {
    clearError();
  }, [activeTab, clearError]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-muted-foreground">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const handleLogin = async (email: string, password: string) => {
    setIsSubmitting(true);
    try {
      await login(email, password);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegister = async (email: string, password: string) => {
    setIsSubmitting(true);
    try {
      await register(email, password);
      setRegisteredEmail(email);
    } finally {
      setIsSubmitting(false);
    }
  };

  // メール確認待ち画面を表示
  if (registeredEmail) {
    return (
      <EmailVerificationWaiting
        email={registeredEmail}
        onBackToLogin={() => {
          setRegisteredEmail(null);
          setActiveTab('login');
        }}
      />
    );
  }

  return (
    <AuthPage
      activeTab={activeTab}
      onTabChange={setActiveTab}
      onLogin={handleLogin}
      onRegister={handleRegister}
      isLoading={isSubmitting}
      error={error}
    />
  );
}

// エディタページラッパー（モバイル検出付き）
function EditorRoute() {
  const isMobile = useIsMobile();

  if (isMobile) {
    return <MobileWarning />;
  }

  return <EditorPage />;
}

function App() {
  const { checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
    // Initialize Blockly.Msg.* from i18next translations
    initBlocklyMessages();
  }, [checkAuth]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/auth" element={<AuthRoute />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/verify-email/:token" element={<VerifyEmailPage />} />
        <Route path="/recovery/:token" element={<RecoveryPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/firmware" element={<FirmwareInstaller />} />
        <Route path="/admin" element={
          <ProtectedRoute>
            <AdminPage />
          </ProtectedRoute>
        } />
        <Route path="/classes" element={
          <ProtectedRoute>
            <ClassesPage />
          </ProtectedRoute>
        } />
        <Route path="/classes/:id" element={
          <ProtectedRoute>
            <ClassDetailPage />
          </ProtectedRoute>
        } />
        <Route path="/classes/:classId/assignments/:assignmentId/submissions" element={
          <ProtectedRoute>
            <AssignmentSubmissionsPage />
          </ProtectedRoute>
        } />
        <Route
          path="/"
          element={<EditorRoute />}
        />
        {/* 以下のルートはPhase 5で削除予定（EditorPage内に統合） */}
        <Route
          path="/docs"
          element={
            <ProtectedRoute>
              <DocsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/pin-settings"
          element={
            <ProtectedRoute>
              <PinSettingsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/compile-server-settings"
          element={
            <ProtectedRoute>
              <CompileServerSettingsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/projects"
          element={
            <ProtectedRoute>
              <ProjectsPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
