import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoginForm } from './LoginForm';
import { RegisterForm } from './RegisterForm';
import { ForgotPasswordForm } from './ForgotPasswordForm';
import { EmailVerificationWaiting } from './EmailVerificationWaiting';
import { LocaleSelector } from '@/components/common/LocaleSelector';

interface AuthPageProps {
  activeTab: 'login' | 'register';
  onTabChange: (tab: 'login' | 'register') => void;
  onLogin: (email: string, password: string) => Promise<void>;
  onRegister: (email: string, password: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

export function AuthPage({
  activeTab,
  onTabChange,
  onLogin,
  onRegister,
  isLoading,
  error,
}: AuthPageProps) {
  const { t } = useTranslation();
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);

  useEffect(() => {
    console.log('[AuthPage] Component mounted');
    return () => {
      console.log('[AuthPage] Component unmounted');
    };
  }, []);

  useEffect(() => {
    console.log('[AuthPage] registeredEmail changed:', registeredEmail);
  }, [registeredEmail]);

  const handleRegister = async (email: string, password: string) => {
    console.log('[AuthPage] handleRegister started', { email });
    try {
      await onRegister(email, password);
      console.log('[AuthPage] onRegister completed successfully');
      setRegisteredEmail(email);
      console.log('[AuthPage] setRegisteredEmail called', { email });
      console.log('[AuthPage] registeredEmail value right after setState:', registeredEmail);
    } catch (error) {
      console.error('[AuthPage] handleRegister error:', error);
      throw error;
    }
  };

  if (registeredEmail) {
    return (
      <EmailVerificationWaiting
        email={registeredEmail}
        onBackToLogin={() => {
          setRegisteredEmail(null);
          onTabChange('login');
        }}
      />
    );
  }

  if (showForgotPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0D1117] px-4">
        <div className="absolute top-4 right-4">
          <LocaleSelector />
        </div>
        <Card className="w-full max-w-md bg-[#161B22] border-[#2E333D]">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-[#E6EDF3]">{t('auth.forgotPassword')}</CardTitle>
            <CardDescription className="text-[#8B949E]">
              {t('auth.forgotPasswordDesc', '登録済みメールアドレスにリセットリンクを送信します')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ForgotPasswordForm onBack={() => setShowForgotPassword(false)} />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0D1117] px-4">
      <div className="absolute top-4 right-4">
        <LocaleSelector />
      </div>
      <Card className="w-full max-w-md bg-[#161B22] border-[#2E333D]">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl text-[#E6EDF3]">{t('home.title')}</CardTitle>
          <CardDescription className="text-[#8B949E]">
            {t('home.subtitle')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => onTabChange(v as 'login' | 'register')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">{t('auth.login')}</TabsTrigger>
              <TabsTrigger value="register">{t('auth.register')}</TabsTrigger>
            </TabsList>
            <TabsContent value="login" className="mt-4">
              <LoginForm
                onSubmit={onLogin}
                onSwitchToRegister={() => onTabChange('register')}
                onForgotPassword={() => setShowForgotPassword(true)}
                isLoading={isLoading}
                error={activeTab === 'login' ? error : null}
              />
            </TabsContent>
            <TabsContent value="register" className="mt-4">
              <RegisterForm
                onSubmit={handleRegister}
                onSwitchToLogin={() => onTabChange('login')}
                isLoading={isLoading}
                error={activeTab === 'register' ? error : null}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
