/**
 * コンパイルサーバー設定（一元管理）
 *
 * すべてのサービス（compileService, firmwareService等）がこの設定を参照する。
 * サーバーURLを変更する場合は、ここだけ修正すれば全てに反映される。
 */

export const COMPILE_SERVERS = {
  /**
   * Primary: 自宅Ubuntuサーバー
   * - 安定性: 高
   * - レイテンシ: 低（国内）
   */
  primary: 'https://compile.digital-fab.jp',

  /**
   * Backup: Railwayサーバー
   * - 安定性: 中（Railwayの制約あり）
   * - レイテンシ: 中（海外）
   * - Primaryが落ちた時の自動フォールバック先
   */
  fallback: 'https://amiable-patience-production-1d47.up.railway.app',

  /**
   * Local: ローカル開発用
   * - arduino-compile-serverをローカルで起動している場合に使用
   */
  local: 'http://localhost:3001'
} as const;

/**
 * コンパイルサーバーモード
 */
export type CompileServerMode = 'cloud' | 'local';

/**
 * 現在のサーバーモードを取得（ローカルストレージから）
 */
export function getCompileServerMode(): CompileServerMode {
  return (localStorage.getItem('compileServerMode') as CompileServerMode) || 'cloud';
}

/**
 * サーバーモードを設定（ローカルストレージに保存）
 */
export function setCompileServerMode(mode: CompileServerMode): void {
  localStorage.setItem('compileServerMode', mode);
}

/**
 * 現在のモードに応じたサーバーURLを取得
 */
export function getCompileServerUrl(): string {
  const mode = getCompileServerMode();
  return mode === 'cloud' ? COMPILE_SERVERS.primary : COMPILE_SERVERS.local;
}
