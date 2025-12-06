import i18n from '@/i18n';

/**
 * Blocklyブロック定義用のi18n翻訳関数
 * Blocklyブロックはコンポーネント外で定義されるため、useTranslation()が使えない
 * この関数を使用して翻訳キーから翻訳テキストを取得する
 */
export function t(key: string, options?: Record<string, unknown>): string {
  return i18n.t(key, options);
}

/**
 * 現在の言語コードを取得
 */
export function getCurrentLanguage(): string {
  return i18n.language;
}

/**
 * Blocklyワークスペースの再構築を通知するためのイベント
 * 言語切り替え時にBlocklyワークスペースを再構築するために使用
 */
export function notifyLanguageChange(): void {
  // カスタムイベントを発火
  window.dispatchEvent(new CustomEvent('blockly-language-change'));
}
