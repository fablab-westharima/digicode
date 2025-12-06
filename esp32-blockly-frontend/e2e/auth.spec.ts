import { test, expect } from '@playwright/test';

// テスト用認証情報（パスワードは大文字・小文字・数字・特殊文字を含む8文字以上）
const TEST_EMAIL = 'e2etest@example.com';
const TEST_PASSWORD = 'TestPassword123!';

test.describe('認証フロー', () => {
  test('ログインページが表示される', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/DigiCode/);
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('新規ユーザー登録ができる', async ({ page }) => {
    await page.goto('/');
    await page.click('text=新規登録');

    const timestamp = Date.now();
    await page.fill('input[type="email"]', `test${timestamp}@example.com`);
    await page.fill('#register-password', TEST_PASSWORD);
    await page.fill('#confirm-password', TEST_PASSWORD);
    await page.click('button[type="submit"]:has-text("新規登録")');

    // 登録後、ホームページにリダイレクト（URLは / または /home）
    await expect(page.locator('text=ブロックエディタ')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('button:has-text("ログアウト")')).toBeVisible();
  });

  test('有効な認証情報でログインできる', async ({ page }) => {
    // まず新規登録でユーザーを作成
    await page.goto('/');
    await page.click('text=新規登録');

    const timestamp = Date.now();
    const email = `logintest${timestamp}@example.com`;
    await page.fill('input[type="email"]', email);
    await page.fill('#register-password', TEST_PASSWORD);
    await page.fill('#confirm-password', TEST_PASSWORD);
    await page.click('button[type="submit"]:has-text("新規登録")');
    await expect(page.locator('text=ブロックエディタ')).toBeVisible({ timeout: 10000 });

    // ログアウト
    await page.click('button:has-text("ログアウト")');
    await expect(page.locator('input[type="email"]')).toBeVisible();

    // 同じ認証情報でログイン
    await page.fill('input[type="email"]', email);
    await page.fill('#password', TEST_PASSWORD);
    await page.click('button[type="submit"]:has-text("ログイン")');

    // ホームページにリダイレクトされることを確認
    await expect(page.locator('text=ブロックエディタ')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('button:has-text("ログアウト")')).toBeVisible();
  });

  test('無効な認証情報でログインできない', async ({ page }) => {
    await page.goto('/');

    await page.fill('input[type="email"]', 'invalid@example.com');
    await page.fill('#password', 'WrongPassword123');
    await page.click('button[type="submit"]:has-text("ログイン")');

    // エラーメッセージが表示される（または/authに留まる）
    await expect(page).toHaveURL('/auth', { timeout: 5000 });
  });

  test('ログアウトできる', async ({ page }) => {
    // まず新規登録でユーザーを作成
    await page.goto('/');
    await page.click('text=新規登録');

    const timestamp = Date.now();
    await page.fill('input[type="email"]', `logouttest${timestamp}@example.com`);
    await page.fill('#register-password', TEST_PASSWORD);
    await page.fill('#confirm-password', TEST_PASSWORD);
    await page.click('button[type="submit"]:has-text("新規登録")');
    await expect(page.locator('text=ブロックエディタ')).toBeVisible({ timeout: 10000 });

    // ログアウト
    await page.click('button:has-text("ログアウト")');

    // ログインページにリダイレクト
    await expect(page).toHaveURL('/auth', { timeout: 5000 });
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });
});
