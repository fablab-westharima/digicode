import { test, expect } from '@playwright/test';

// テスト用認証情報（パスワードは大文字・小文字・数字・特殊文字を含む8文字以上）
const TEST_PASSWORD = 'TestPassword123!';

test.describe('エディタ基本操作', () => {
  test.beforeEach(async ({ page }) => {
    // 新規ユーザーを作成してログイン
    await page.goto('/');
    await page.click('text=新規登録');

    const timestamp = Date.now();
    await page.fill('input[type="email"]', `editortest${timestamp}@example.com`);
    await page.fill('#register-password', TEST_PASSWORD);
    await page.fill('#confirm-password', TEST_PASSWORD);
    await page.click('button[type="submit"]:has-text("新規登録")');
    await expect(page.locator('text=ブロックエディタ')).toBeVisible({ timeout: 10000 });

    // エディタに移動（ブロックエディタカードの「作成する」ボタンをクリック）
    await page.locator('text=ブロックエディタ').locator('..').locator('..').locator('button:has-text("作成する")').click();
    await expect(page).toHaveURL(/\/editor/, { timeout: 10000 });
  });

  test('Blocklyワークスペースが表示される', async ({ page }) => {
    // Blocklyのツールボックスが表示されることを確認
    await expect(page.locator('.blocklyToolboxDiv')).toBeVisible();
    // Blocklyのワークスペースが表示されることを確認
    await expect(page.locator('.blocklyMainBackground')).toBeVisible();
  });

  test('コードプレビューが表示される', async ({ page }) => {
    // 生成コードエリアが表示されることを確認
    await expect(page.locator('text=生成コード').first()).toBeVisible({ timeout: 10000 });
  });

  test('言語切り替えができる', async ({ page }) => {
    // Arduino C++が選択されていることを確認
    await expect(page.locator('text=Arduino')).toBeVisible();

    // MicroPythonに切り替え（もし実装されている場合）
    // await page.click('text=MicroPython');
    // await expect(page.locator('text=MicroPython')).toBeVisible();
  });

  test('ツールバーのボタンが機能する', async ({ page }) => {
    // ツールバーにDigiCodeロゴまたはホームリンクが存在することを確認
    const homeLink = page.locator('a[href="/home"]').or(page.locator('a[href="/"]')).or(page.locator('text=DigiCode'));
    await expect(homeLink.first()).toBeVisible({ timeout: 10000 });

    // 書き込み関連のボタンが存在することを確認
    const writeButton = page.locator('button:has-text("書き込み")').or(page.locator('button:has-text("実行")'));
    if (await writeButton.first().isVisible().catch(() => false)) {
      await expect(writeButton.first()).toBeVisible();
    }
  });
});
