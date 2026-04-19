import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';
import { Loader2, Mail, RefreshCw } from 'lucide-react';
import { verifyOtp, resendOtp } from '@/services/authService';
import { setTokens } from '@/lib/api';

interface OtpInputDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  email: string;
  onSuccess?: () => void;
}

export function OtpInputDialog({ open, onOpenChange, email, onSuccess }: OtpInputDialogProps) {
  const { t } = useTranslation();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [trustDevice, setTrustDevice] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // 再送信クールダウンタイマー
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // ダイアログが開いたときに最初の入力にフォーカス
  useEffect(() => {
    if (open) {
      setOtp(['', '', '', '', '', '']);
      setError(null);
      setTrustDevice(false);
      // 初回は60秒クールダウン（OTPが送信されているため）
      setResendCooldown(60);
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 100);
    }
  }, [open]);

  const handleChange = (index: number, value: string) => {
    // 数字のみ許可
    if (value && !/^\d$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setError(null);

    // 次の入力欄に自動フォーカス
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    // バックスペースで前の入力欄にフォーカス
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    // Enterで送信
    if (e.key === 'Enter' && otp.every(d => d)) {
      handleSubmit();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim();
    const digits = pastedData.replace(/\D/g, '').slice(0, 6).split('');

    if (digits.length > 0) {
      const newOtp = [...otp];
      digits.forEach((digit, i) => {
        if (i < 6) newOtp[i] = digit;
      });
      setOtp(newOtp);

      // 最後の入力された位置にフォーカス
      const focusIndex = Math.min(digits.length, 5);
      inputRefs.current[focusIndex]?.focus();
    }
  };

  const handleSubmit = async () => {
    const code = otp.join('');
    if (code.length !== 6) {
      setError(t('auth.2fa.otpLengthError', { defaultValue: '6桁のコードを入力してください' }));
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await verifyOtp(email, code, trustDevice);

      // トークン保存
      setTokens(result.accessToken, result.refreshToken, result.expiresIn);
      localStorage.setItem('user', JSON.stringify(result.user));

      // 成功コールバック
      if (onSuccess) {
        onSuccess();
      } else {
        // デフォルトではページリロード
        window.location.href = '/';
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : t('auth.2fa.verifyError', { defaultValue: 'OTP検証に失敗しました' }));
      // エラー時は入力をクリア
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;

    setIsResending(true);
    setError(null);

    try {
      await resendOtp(email);
      setResendCooldown(60); // 60秒クールダウン
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch (error) {
      setError(error instanceof Error ? error.message : t('auth.2fa.resendError', { defaultValue: 'OTP再送信に失敗しました' }));
    } finally {
      setIsResending(false);
    }
  };

  const isComplete = otp.every(d => d);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            {t('auth.2fa.title', { defaultValue: '2段階認証' })}
          </DialogTitle>
          <DialogDescription>
            {t('auth.2fa.description', { defaultValue: '{{email}} に送信された6桁のコードを入力してください。', email })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* OTP入力フィールド */}
          <div className="flex justify-center gap-2" onPaste={handlePaste}>
            {otp.map((digit, index) => (
              <Input
                key={index}
                ref={(el) => { inputRefs.current[index] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                className="w-12 h-14 text-center text-2xl font-mono"
                disabled={isLoading}
                autoComplete="one-time-code"
              />
            ))}
          </div>

          {/* エラーメッセージ */}
          {error && (
            <div className="text-sm text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/30 p-3 rounded-md text-center">
              {error}
            </div>
          )}

          {/* 有効期限の案内 */}
          <p className="text-xs text-muted-foreground text-center">
            {t('auth.2fa.expiresIn', { defaultValue: 'コードは10分間有効です' })}
          </p>

          {/* このデバイスを信頼するチェックボックス */}
          <div className="flex items-center space-x-2 justify-center">
            <Checkbox
              id="trustDevice"
              checked={trustDevice}
              onCheckedChange={(checked) => setTrustDevice(checked === true)}
            />
            <Label
              htmlFor="trustDevice"
              className="text-sm cursor-pointer"
            >
              {t('auth.2fa.trustDevice', { defaultValue: 'このデバイスを信頼する（30日間）' })}
            </Label>
          </div>

          {/* 送信ボタン */}
          <Button
            onClick={handleSubmit}
            disabled={isLoading || !isComplete}
            className="w-full"
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('auth.2fa.verify', { defaultValue: '確認' })}
          </Button>

          {/* 再送信リンク */}
          <div className="flex items-center justify-center">
            <Button
              type="button"
              variant="link"
              onClick={handleResend}
              disabled={isResending || resendCooldown > 0}
              className="text-sm"
            >
              {isResending && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
              {resendCooldown > 0
                ? t('auth.2fa.resendCooldown', { defaultValue: '{{seconds}}秒後に再送信可能', seconds: resendCooldown })
                : t('auth.2fa.resend', { defaultValue: 'コードを再送信' })
              }
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
