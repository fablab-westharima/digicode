import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Check, X } from 'lucide-react';

interface RegisterFormProps {
  onSubmit: (email: string, password: string) => Promise<void>;
  onSwitchToLogin: () => void;
  isLoading: boolean;
  error: string | null;
}

// パスワード要件チェック
interface PasswordRequirements {
  minLength: boolean;
  hasLowercase: boolean;
  hasUppercase: boolean;
  hasNumber: boolean;
  hasSpecialChar: boolean;
}

function checkPasswordRequirements(password: string): PasswordRequirements {
  return {
    minLength: password.length >= 8,
    hasLowercase: /[a-z]/.test(password),
    hasUppercase: /[A-Z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  };
}

export function RegisterForm({ onSubmit, onSwitchToLogin, isLoading, error }: RegisterFormProps) {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [showRequirements, setShowRequirements] = useState(false);

  const requirements = checkPasswordRequirements(password);
  const allRequirementsMet = Object.values(requirements).every(Boolean);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!allRequirementsMet) {
      setValidationError(t('auth.passwordRequirementsNotMet', 'パスワードが要件を満たしていません'));
      return;
    }

    if (password !== confirmPassword) {
      setValidationError(t('auth.passwordMismatch'));
      return;
    }

    await onSubmit(email, password);
  };

  const displayError = validationError || error;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="register-email">{t('auth.email')}</Label>
        <Input
          id="register-email"
          type="email"
          placeholder={t('auth.emailPlaceholder')}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={isLoading}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="register-password">{t('auth.password')}</Label>
        <Input
          id="register-password"
          type="password"
          placeholder={t('auth.minChars')}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onFocus={() => setShowRequirements(true)}
          required
          disabled={isLoading}
        />

        {/* パスワード要件表示 */}
        {showRequirements && (
          <div className="bg-[#0D1117] border border-[#2E333D] rounded-md p-3 space-y-1.5 text-xs">
            <div className="text-[#8B949E] font-medium mb-2">
              {t('auth.passwordRequirements', 'パスワードの要件:')}
            </div>

            <div className={`flex items-center gap-2 ${requirements.minLength ? 'text-green-500' : 'text-[#8B949E]'}`}>
              {requirements.minLength ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
              <span>{t('auth.req.minLength', '8文字以上')}</span>
            </div>

            <div className={`flex items-center gap-2 ${requirements.hasLowercase ? 'text-green-500' : 'text-[#8B949E]'}`}>
              {requirements.hasLowercase ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
              <span>{t('auth.req.lowercase', '小文字 (a-z) を含む')}</span>
            </div>

            <div className={`flex items-center gap-2 ${requirements.hasUppercase ? 'text-green-500' : 'text-[#8B949E]'}`}>
              {requirements.hasUppercase ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
              <span>{t('auth.req.uppercase', '大文字 (A-Z) を含む')}</span>
            </div>

            <div className={`flex items-center gap-2 ${requirements.hasNumber ? 'text-green-500' : 'text-[#8B949E]'}`}>
              {requirements.hasNumber ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
              <span>{t('auth.req.number', '数字 (0-9) を含む')}</span>
            </div>

            <div className={`flex items-center gap-2 ${requirements.hasSpecialChar ? 'text-green-500' : 'text-[#8B949E]'}`}>
              {requirements.hasSpecialChar ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
              <span>{t('auth.req.special', '特殊文字 (!@#$%^&* など) を含む')}</span>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirm-password">{t('auth.confirmPassword')}</Label>
        <Input
          id="confirm-password"
          type="password"
          placeholder={t('auth.confirmPasswordPlaceholder')}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          disabled={isLoading}
        />
      </div>

      {displayError && (
        <div className="text-sm text-red-500 bg-red-50 p-3 rounded-md">
          {displayError}
        </div>
      )}

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? t('auth.registering') : t('auth.register')}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        {t('auth.hasAccount')}{' '}
        <button
          type="button"
          onClick={onSwitchToLogin}
          className="text-primary underline hover:no-underline"
        >
          {t('auth.login')}
        </button>
      </p>
    </form>
  );
}
