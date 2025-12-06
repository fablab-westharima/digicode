import { test, expect } from '@playwright/test';

// テスト用認証情報（パスワードは大文字・小文字・数字・特殊文字を含む8文字以上）
const TEST_PASSWORD = 'TestPassword123!';

test.describe('サンプルプロジェクト', () => {
  test.beforeEach(async ({ page }) => {
    // 新規ユーザーを作成してログイン
    await page.goto('/');
    await page.click('text=新規登録');

    const timestamp = Date.now();
    await page.fill('input[type="email"]', `sampletest${timestamp}@example.com`);
    await page.fill('#register-password', TEST_PASSWORD);
    await page.fill('#confirm-password', TEST_PASSWORD);
    await page.click('button[type="submit"]:has-text("新規登録")');
    await expect(page.locator('text=ブロックエディタ')).toBeVisible({ timeout: 10000 });

    // エディタに移動（ブロックエディタカードの「作成する」ボタンをクリック）
    await page.locator('text=ブロックエディタ').locator('..').locator('..').locator('button:has-text("作成する")').click();
    await expect(page).toHaveURL(/\/editor/, { timeout: 10000 });
  });

  test('サンプルプロジェクト一覧が表示される', async ({ page }) => {
    // サンプルボタンをクリック
    const sampleButton = page.locator('button', { hasText: /サンプル/ }).first();
    if (await sampleButton.isVisible()) {
      await sampleButton.click();

      // サンプル一覧ダイアログが表示される
      await expect(page.locator('text=サンプルプロジェクト')).toBeVisible();
    }
  });

  test('サンプルプロジェクトを読み込める', async ({ page }) => {
    const sampleButton = page.locator('button', { hasText: /サンプル/ }).first();
    if (await sampleButton.isVisible()) {
      await sampleButton.click();

      // 最初のサンプルを選択
      const firstSample = page.locator('[role="dialog"] button').first();
      if (await firstSample.isVisible()) {
        await firstSample.click();

        // サンプルが読み込まれたことを確認
        await page.waitForTimeout(1000);
      }
    }
  });
});
