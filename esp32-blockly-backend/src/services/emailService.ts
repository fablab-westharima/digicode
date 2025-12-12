/**
 * メール送信サービス（Resend）
 *
 * パスワードリセット、メール確認、リカバリーなどのトランザクショナルメール送信を担当
 */
import { Resend } from 'resend';

// フロントエンドURL設定
const FRONTEND_URLS = {
  production: 'https://digicode.pages.dev',
  development: 'http://localhost:5173',
};

/**
 * パスワードリセットメールを送信
 */
export async function sendPasswordResetEmail(
  resendApiKey: string,
  to: string,
  resetToken: string,
  isDev: boolean = false
): Promise<{ success: boolean; error?: string }> {
  // APIキーが設定されていない場合はスキップ
  if (!resendApiKey) {
    console.warn('RESEND_API_KEY is not set. Skipping email send.');
    return { success: false, error: 'メール送信サービスが設定されていません' };
  }

  const resend = new Resend(resendApiKey);
  const frontendUrl = isDev ? FRONTEND_URLS.development : FRONTEND_URLS.production;
  const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;

  try {
    const { error } = await resend.emails.send({
      from: 'DigiCode <noreply@digicode.app>', // ドメイン認証後に変更
      to: [to],
      subject: '【DigiCode】パスワードリセットのご案内',
      html: generatePasswordResetEmailHtml(resetUrl),
      text: generatePasswordResetEmailText(resetUrl),
    });

    if (error) {
      console.error('Resend error:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error('Email send error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'メール送信に失敗しました'
    };
  }
}

/**
 * パスワードリセットメールのHTML本文
 */
function generatePasswordResetEmailHtml(resetUrl: string): string {
  return `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #22c55e 0%, #3b82f6 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 28px;">DigiCodeβ2</h1>
    <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">パスワードリセット</p>
  </div>

  <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
    <p>DigiCodeをご利用いただきありがとうございます。</p>

    <p>パスワードリセットのリクエストを受け付けました。<br>
    以下のボタンをクリックして、新しいパスワードを設定してください。</p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${resetUrl}"
         style="display: inline-block; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); color: white; text-decoration: none; padding: 15px 40px; border-radius: 8px; font-weight: bold; font-size: 16px;">
        パスワードをリセットする
      </a>
    </div>

    <p style="font-size: 14px; color: #6b7280;">
      このリンクは<strong>1時間</strong>有効です。<br>
      心当たりがない場合は、このメールを無視してください。
    </p>

    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

    <p style="font-size: 12px; color: #9ca3af;">
      ボタンがクリックできない場合は、以下のURLをブラウザにコピー＆ペーストしてください：<br>
      <a href="${resetUrl}" style="color: #3b82f6; word-break: break-all;">${resetUrl}</a>
    </p>
  </div>

  <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
    <p>© 2024 DigiCode - ビジュアルプログラミングでESP32を動かそう</p>
  </div>
</body>
</html>
  `.trim();
}

/**
 * パスワードリセットメールのテキスト本文（HTMLが表示できない場合用）
 */
function generatePasswordResetEmailText(resetUrl: string): string {
  return `
DigiCodeβ2 - パスワードリセット

DigiCodeをご利用いただきありがとうございます。

パスワードリセットのリクエストを受け付けました。
以下のURLにアクセスして、新しいパスワードを設定してください。

${resetUrl}

このリンクは1時間有効です。
心当たりがない場合は、このメールを無視してください。

---
© 2024 DigiCode - ビジュアルプログラミングでESP32を動かそう
  `.trim();
}

/**
 * メール確認メールを送信
 */
export async function sendVerificationEmail(
  resendApiKey: string,
  to: string,
  verificationToken: string,
  isDev: boolean = false
): Promise<{ success: boolean; error?: string }> {
  if (!resendApiKey) {
    console.warn('RESEND_API_KEY is not set. Skipping email send.');
    return { success: false, error: 'メール送信サービスが設定されていません' };
  }

  const resend = new Resend(resendApiKey);
  const frontendUrl = isDev ? FRONTEND_URLS.development : FRONTEND_URLS.production;
  const verificationUrl = `${frontendUrl}/verify-email/${verificationToken}`;

  try {
    const { error } = await resend.emails.send({
      from: 'DigiCode <noreply@digicode.app>',
      to: [to],
      subject: '【DigiCode】メールアドレスの確認',
      html: generateVerificationEmailHtml(verificationUrl),
      text: generateVerificationEmailText(verificationUrl),
    });

    if (error) {
      console.error('Resend error:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error('Email send error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'メール送信に失敗しました'
    };
  }
}

/**
 * メール確認メールのHTML本文
 */
function generateVerificationEmailHtml(verificationUrl: string): string {
  return `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #22c55e 0%, #3b82f6 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 28px;">DigiCodeβ2</h1>
    <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">メールアドレスの確認</p>
  </div>

  <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
    <p>DigiCodeへようこそ！</p>

    <p>アカウント登録ありがとうございます。<br>
    以下のボタンをクリックして、メールアドレスを確認してください。</p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${verificationUrl}"
         style="display: inline-block; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); color: white; text-decoration: none; padding: 15px 40px; border-radius: 8px; font-weight: bold; font-size: 16px;">
        メールアドレスを確認する
      </a>
    </div>

    <p style="font-size: 14px; color: #6b7280;">
      このリンクは<strong>24時間</strong>有効です。<br>
      心当たりがない場合は、このメールを無視してください。
    </p>

    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

    <p style="font-size: 12px; color: #9ca3af;">
      ボタンがクリックできない場合は、以下のURLをブラウザにコピー＆ペーストしてください：<br>
      <a href="${verificationUrl}" style="color: #3b82f6; word-break: break-all;">${verificationUrl}</a>
    </p>
  </div>

  <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
    <p>© 2024 DigiCode - ビジュアルプログラミングでESP32を動かそう</p>
  </div>
</body>
</html>
  `.trim();
}

/**
 * メール確認メールのテキスト本文
 */
function generateVerificationEmailText(verificationUrl: string): string {
  return `
DigiCodeβ2 - メールアドレスの確認

DigiCodeへようこそ！

アカウント登録ありがとうございます。
以下のURLにアクセスして、メールアドレスを確認してください。

${verificationUrl}

このリンクは24時間有効です。
心当たりがない場合は、このメールを無視してください。

---
© 2024 DigiCode - ビジュアルプログラミングでESP32を動かそう
  `.trim();
}

/**
 * リカバリーメールを送信
 */
export async function sendRecoveryEmail(
  resendApiKey: string,
  to: string,
  recoveryToken: string,
  isDev: boolean = false
): Promise<{ success: boolean; error?: string }> {
  if (!resendApiKey) {
    console.warn('RESEND_API_KEY is not set. Skipping email send.');
    return { success: false, error: 'メール送信サービスが設定されていません' };
  }

  const resend = new Resend(resendApiKey);
  const frontendUrl = isDev ? FRONTEND_URLS.development : FRONTEND_URLS.production;
  const recoveryUrl = `${frontendUrl}/recovery/${recoveryToken}`;

  try {
    const { error } = await resend.emails.send({
      from: 'DigiCode <noreply@digicode.app>',
      to: [to],
      subject: '【DigiCode】アカウントリカバリー',
      html: generateRecoveryEmailHtml(recoveryUrl),
      text: generateRecoveryEmailText(recoveryUrl),
    });

    if (error) {
      console.error('Resend error:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error('Email send error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'メール送信に失敗しました'
    };
  }
}

/**
 * リカバリーメールのHTML本文
 */
function generateRecoveryEmailHtml(recoveryUrl: string): string {
  return `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #22c55e 0%, #3b82f6 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 28px;">DigiCodeβ2</h1>
    <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">アカウントリカバリー</p>
  </div>

  <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
    <p>DigiCodeをご利用いただきありがとうございます。</p>

    <p>アカウントリカバリーのリクエストを受け付けました。<br>
    以下のボタンをクリックして、アカウントにログインしてください。</p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${recoveryUrl}"
         style="display: inline-block; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); color: white; text-decoration: none; padding: 15px 40px; border-radius: 8px; font-weight: bold; font-size: 16px;">
        アカウントを復旧する
      </a>
    </div>

    <p style="font-size: 14px; color: #6b7280;">
      このリンクは<strong>1時間</strong>有効です。<br>
      ログイン後、新しいパスキーを登録してください。<br>
      心当たりがない場合は、このメールを無視してください。
    </p>

    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

    <p style="font-size: 12px; color: #9ca3af;">
      ボタンがクリックできない場合は、以下のURLをブラウザにコピー＆ペーストしてください：<br>
      <a href="${recoveryUrl}" style="color: #3b82f6; word-break: break-all;">${recoveryUrl}</a>
    </p>
  </div>

  <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
    <p>© 2024 DigiCode - ビジュアルプログラミングでESP32を動かそう</p>
  </div>
</body>
</html>
  `.trim();
}

/**
 * リカバリーメールのテキスト本文
 */
function generateRecoveryEmailText(recoveryUrl: string): string {
  return `
DigiCodeβ2 - アカウントリカバリー

DigiCodeをご利用いただきありがとうございます。

アカウントリカバリーのリクエストを受け付けました。
以下のURLにアクセスして、アカウントにログインしてください。

${recoveryUrl}

このリンクは1時間有効です。
ログイン後、新しいパスキーを登録してください。
心当たりがない場合は、このメールを無視してください。

---
© 2024 DigiCode - ビジュアルプログラミングでESP32を動かそう
  `.trim();
}
