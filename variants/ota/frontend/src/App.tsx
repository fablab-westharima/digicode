/*
 * DigiCode - Block-based ESP32 Programming Tool
 * Copyright (C) 2024-2026 DigiCo LLC
 *
 * Licensed under the GNU Affero General Public License version 3 or later.
 * See LICENSE file in the repository root for full terms.
 */

import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useClassServerHealthStore } from '@/stores/classServerHealthStore';
import { AuthPage } from '@/components/auth/AuthPage';
import { EmailVerificationWaiting } from '@/components/auth/EmailVerificationWaiting';
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
import { HelpLocalLLMPage } from '@/pages/HelpLocalLLMPage';
import { HelpAPIKeysPage } from '@/pages/HelpAPIKeysPage';
import { ClassesPage } from '@/pages/ClassesPage';
import { ClassDetailPage } from '@/pages/ClassDetailPage';
import { AssignmentSubmissionsPage } from '@/pages/AssignmentSubmissionsPage';
import PlanPage from '@/pages/PlanPage';
import { initBlocklyMessages } from '@/utils/blocklyMessages';
import { ToastContainer } from '@/components/common/Toast';

// 保護されたルート
/**
 * Fires GA4 `page_view` on every react-router location change.
 *
 * Mounted inside <BrowserRouter> so `useLocation()` is available, and
 * outside <Routes> so it survives every route transition. The boot-
 * time `gtag('config', ..., { send_page_view: false })` call in
 * `initGA()` (src/lib/analytics.ts) suppresses the implicit initial
 * page_view so this hook is the single source of page_view events;
 * the first useEffect run after mount produces the equivalent
 * initial event for the landing route.
 *
 * Fix A (Session 136): every event includes the full GA4 page_view
 * payload — `page_path`, `page_location`, and `page_title`. Sending
 * `page_path` alone left the GA4 data stream stuck on the "no data
 * collected" verification warning even after gtag.js loaded; gtag.js's
 * automatic URL/title enrichment is unreliable under `send_page_view:
 * false`, so we provide the canonical session signal explicitly.
 *
 * When VITE_GA_MEASUREMENT_ID is unset (or set to an invalid shape),
 * `initGA()` short-circuits before installing `window.gtag` /
 * `window.__GA_ID__`, so the guard below is the single safe-fallback
 * gate — no error, no network request.
 */
function GAPageView() {
  const location = useLocation();
  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      window.gtag &&
      window.__GA_ID__
    ) {
      window.gtag('event', 'page_view', {
        page_path: location.pathname,
        page_location: window.location.href,
        page_title: document.title,
      });
    }
  }, [location.pathname]);
  return null;
}

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

function App() {
  const { checkAuth, isAuthenticated } = useAuthStore();
  const startHealthPolling = useClassServerHealthStore((s) => s.startPolling);
  const stopHealthPolling = useClassServerHealthStore((s) => s.stopPolling);

  useEffect(() => {
    checkAuth();
    // Initialize Blockly.Msg.* from i18next translations
    initBlocklyMessages();
  }, [checkAuth]);

  // class-server (ML30) ヘルスチェック polling: 認証 user のみ対象 (anonymous は
  // クラス機能 menu 自体が出ないため polling 不要)、60s 間隔で /api/health/class-server
  // を Workers 経由で叩き、2 連続失敗で down 状態を UI に反映。
  useEffect(() => {
    if (isAuthenticated) {
      startHealthPolling();
      return () => stopHealthPolling();
    }
    stopHealthPolling();
    return undefined;
  }, [isAuthenticated, startHealthPolling, stopHealthPolling]);

  return (
    <BrowserRouter>
      <GAPageView />
      <Routes>
        <Route path="/auth" element={<AuthRoute />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/verify-email/:token" element={<VerifyEmailPage />} />
        <Route path="/recovery/:token" element={<RecoveryPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/help/local-llm" element={<HelpLocalLLMPage />} />
        <Route path="/help/api-keys" element={<HelpAPIKeysPage />} />
        <Route path="/firmware" element={<FirmwareInstaller />} />
        <Route path="/admin" element={
          <ProtectedRoute>
            <AdminPage />
          </ProtectedRoute>
        } />
        <Route path="/plan" element={
          <ProtectedRoute>
            <PlanPage />
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
          element={<EditorPage />}
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
      <ToastContainer />
    </BrowserRouter>
  );
}

export default App;
