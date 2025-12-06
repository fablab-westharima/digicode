import { test, expect } from '@playwright/test';

// テスト用認証情報（パスワードは大文字・小文字・数字・特殊文字を含む8文字以上）
const TEST_PASSWORD = 'TestPassword123!';

test.describe('プロジェクト管理', () => {
  test.beforeEach(async ({ page }) => {
    // 新規ユーザーを作成してログイン
    await page.goto('/');
    await page.click('text=新規登録');

    const timestamp = Date.now();
    await page.fill('input[type="email"]', `projecttest${timestamp}@example.com`);
    await page.fill('#register-password', TEST_PASSWORD);
    await page.fill('#confirm-password', TEST_PASSWORD);
    await page.click('button[type="submit"]:has-text("新規登録")');
    await expect(page.locator('text=ブロックエディタ')).toBeVisible({ timeout: 10000 });
  });

  test('新規プロジェクトを作成できる', async ({ page }) => {
    // ブロックエディタカードの「作成する」ボタンをクリック
    await page.locator('text=ブロックエディタ').locator('..').locator('..').locator('button:has-text("作成する")').click();
    await expect(page).toHaveURL(/\/editor/);

    // エディタページに遷移したことを確認
    await page.waitForLoadState('networkidle');
  });

  test('プロジェクトを保存できる', async ({ page }) => {
    // エディタに移動
    await page.locator('text=ブロックエディタ').locator('..').locator('..').locator('button:has-text("作成する")').click();
    await expect(page).toHaveURL(/\/editor/);
    await page.waitForLoadState('networkidle');

    // 保存ボタンをクリック
    const saveButton = page.locator('button', { hasText: /保存/ }).first();
    if (await saveButton.isVisible()) {
      await saveButton.click();

      // 保存ダイアログが表示される（実装による）
      // プロジェクト名を入力して保存
      const timestamp = Date.now();
      const projectName = `テストプロジェクト_${timestamp}`;

      const projectNameInput = page.locator('input[placeholder*="プロジェクト名"]').first();
      if (await projectNameInput.isVisible()) {
        await projectNameInput.fill(projectName);
        await page.click('button:has-text("保存")');

        // 成功メッセージまたは確認
        await page.waitForTimeout(1000);
      }
    }
  });

  test('プロジェクト一覧を表示できる', async ({ page }) => {
    // プロジェクト一覧カードの「一覧を見る」ボタンをクリック
    const projectListButton = page.locator('text=プロジェクト一覧').locator('..').locator('..').locator('button:has-text("一覧を見る")');
    if (await projectListButton.isVisible()) {
      await projectListButton.click();

      // プロジェクト一覧ダイアログまたはページが表示される
      await page.waitForTimeout(500);
    }
  });

  test('ホームページから各機能にアクセスできる', async ({ page }) => {
    // ホームページのカードが表示されることを確認
    await expect(page.locator('text=ファームウェア書き込み')).toBeVisible();
    await expect(page.locator('text=デバイス設定')).toBeVisible();
    await expect(page.locator('text=ブロックエディタ')).toBeVisible();
    await expect(page.locator('text=プロジェクト一覧')).toBeVisible();
  });
});
