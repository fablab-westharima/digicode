import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoginForm } from './LoginForm';
import { RegisterForm } from './RegisterForm';
import { RecoveryTab } from './RecoveryTab';
import { LocaleSelector } from '@/components/common/LocaleSelector';

interface AuthPageProps {
  activeTab: 'login' | 'register' | 'recovery';
  onTabChange: (tab: 'login' | 'register' | 'recovery') => void;
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0D1117] px-4">
      <div className="absolute top-4 right-4">
        <LocaleSelector />
      </div>
      <Card className="w-full max-w-lg bg-[#161B22] border-[#2E333D]">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl text-[#E6EDF3]">{t('home.title')}</CardTitle>
          <CardDescription className="text-[#8B949E]">
            {t('home.subtitle')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => onTabChange(v as 'login' | 'register' | 'recovery')}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="login">{t('auth.login')}</TabsTrigger>
              <TabsTrigger value="register">{t('auth.register')}</TabsTrigger>
              <TabsTrigger value="recovery">復旧</TabsTrigger>
            </TabsList>
            <TabsContent value="login" className="mt-4">
              <LoginForm
                onSubmit={onLogin}
                isLoading={isLoading}
                error={activeTab === 'login' ? error : null}
              />
            </TabsContent>
            <TabsContent value="register" className="mt-4">
              <RegisterForm
                onSubmit={onRegister}
                isLoading={isLoading}
                error={activeTab === 'register' ? error : null}
              />
            </TabsContent>
            <TabsContent value="recovery" className="mt-4">
              <RecoveryTab />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
