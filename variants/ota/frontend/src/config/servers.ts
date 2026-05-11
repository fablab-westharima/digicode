/**
 * コンパイルサーバー設定（一元管理）
 *
 * すべてのサービス（compileService, firmwareService等）がこの設定を参照する。
 * クラウドのデフォルトURLを変更する場合は、ここだけ修正すれば全てに反映される。
 *
 * ローカルサーバーURLは「デフォルト = http://localhost:3001」だが、
 * 2026-05-01 以降は localStorage キー `compileServerLocalUrl` に保存された
 * ユーザー指定 URL を優先する（CompileServerSettings の port 入力 UI 経由）。
 * port-prompt installer (`scripts/local-compile/install.sh` / `.ps1`) が
 * 別 port (3002+) を選んだケースをここでも追従できるようにするため。
 */

export const DEFAULT_LOCAL_PORT = 3001;
export const DEFAULT_LOCAL_URL = `http://localhost:${DEFAULT_LOCAL_PORT}`;

export const COMPILE_SERVERS = {
  /**
   * Primary: Cloudflare Load Balancer (ML30 primary + Railway fallback の自動 failover、第105回 Task 1)
   * - 安定性: 高（CF infrastructure が ML30 ↔ Railway 内部 failover を担う）
   * - レイテンシ: 低（CF anycast、ML30 直接比 +20ms 程度の微増）
   * - 内部 origin pool: ml30-compile (compile.digital-fab.jp) → railway-compile (Railway URL)
   */
  primary: 'https://api-compile.digital-fab.jp',

  /**
   * Backup: Railway 直接（CF LB infrastructure 自体が down した場合の最終避難）
   * - 2 層防御 layer 2: 通常時は layer 1 (CF LB primary) で完結、CF LB 障害時のみ発動
   * - 安定性: 中（Railway の制約あり）
   * - レイテンシ: 中（海外、~800ms）
   */
  fallback: 'https://amiable-patience-production-1d47.up.railway.app',

  /**
   * Local: ローカル開発用
   * - DigiCode local compile-server installer を使ってローカル起動した場合
   * - デフォルトは port 3001、ユーザー指定 URL は localStorage で override
   */
  local: DEFAULT_LOCAL_URL,
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
 * ローカルサーバーURLを取得（ローカルストレージから）。
 * ユーザーが UI で port を変更した場合は localStorage に保存された URL を返す。
 * 未設定 or 無効な URL の場合はデフォルト (http://localhost:3001) にフォールバック。
 */
export function getCompileServerLocalUrl(): string {
  const stored = localStorage.getItem('compileServerLocalUrl');
  if (!stored) return COMPILE_SERVERS.local;
  // 簡易 sanity check: http(s):// で始まる文字列のみ accept、それ以外はデフォルト
  if (!/^https?:\/\/.+/.test(stored)) return COMPILE_SERVERS.local;
  return stored;
}

/**
 * ローカルサーバーURLを保存（ローカルストレージに保存）。
 * デフォルト URL と同値 or 空文字列を渡した場合は localStorage キーを削除し、
 * デフォルト挙動に戻す（不要な entry を残さない）。
 */
export function setCompileServerLocalUrl(url: string): void {
  if (!url || url === COMPILE_SERVERS.local) {
    localStorage.removeItem('compileServerLocalUrl');
    return;
  }
  localStorage.setItem('compileServerLocalUrl', url);
}

/**
 * 現在のモードに応じたサーバーURLを取得
 */
export function getCompileServerUrl(): string {
  const mode = getCompileServerMode();
  return mode === 'cloud' ? COMPILE_SERVERS.primary : getCompileServerLocalUrl();
}
