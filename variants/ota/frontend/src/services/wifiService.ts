// WebREPL Service for ESP32 WiFi AP Mode Connection
// Based on MicroPython WebREPL protocol

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

interface WifiConfig {
  host: string;
  port: number;
  password: string;
  onData?: (data: string) => void;
  onStatusChange?: (status: ConnectionStatus) => void;
  onError?: (error: Error) => void;
}

class WifiService {
  private ws: WebSocket | null = null;
  private config: WifiConfig | null = null;
  private status: ConnectionStatus = 'disconnected';
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;

  /**
   * ESP32のWebREPLに接続
   */
  async connect(config: WifiConfig): Promise<boolean> {
    if (this.ws && this.status === 'connected') {
      console.warn('Already connected to WebREPL');
      return true;
    }

    this.config = config;
    this.setStatus('connecting');

    try {
      const url = `ws://${config.host}:${config.port}`;
      this.ws = new WebSocket(url);

      // WebSocket接続成功
      this.ws.onopen = () => {
        console.log('WebREPL connected');
        this.reconnectAttempts = 0;
        // WebREPLパスワード認証
        this.authenticate();
      };

      // メッセージ受信
      this.ws.onmessage = (event) => {
        const data = event.data;
        if (typeof data === 'string') {
          this.config?.onData?.(data);

          // パスワード入力プロンプトを検出
          if (data.includes('Password:')) {
            this.sendPassword();
          }
          // 認証成功を検出
          else if (data.includes('WebREPL connected')) {
            this.setStatus('connected');
          }
        }
      };

      // 接続エラー
      this.ws.onerror = (event) => {
        console.error('WebREPL error:', event);
        const error = new Error('WebREPL connection error');
        this.config?.onError?.(error);
        this.setStatus('error');
      };

      // 接続クローズ
      this.ws.onclose = () => {
        console.log('WebREPL disconnected');
        this.setStatus('disconnected');
        this.attemptReconnect();
      };

      return true;
    } catch (error) {
      console.error('Failed to connect to WebREPL:', error);
      this.config?.onError?.(error as Error);
      this.setStatus('error');
      return false;
    }
  }

  /**
   * WebREPL認証
   */
  private authenticate() {
    // WebREPLプロトコルの初期化コマンド
    // 最初のハンドシェイク
    const initCmd = 'A';
    this.sendRaw(initCmd);
  }

  /**
   * パスワード送信
   */
  private sendPassword() {
    if (this.config?.password) {
      this.sendRaw(this.config.password + '\r\n');
    }
  }

  /**
   * 切断
   */
  async disconnect(): Promise<void> {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.setStatus('disconnected');
    this.config = null;
  }

  /**
   * コマンド送信
   */
  async sendCommand(command: string): Promise<boolean> {
    if (!this.ws || this.status !== 'connected') {
      console.error('WebREPL not connected');
      return false;
    }

    try {
      this.sendRaw(command + '\r\n');
      return true;
    } catch (error) {
      console.error('Failed to send command:', error);
      return false;
    }
  }

  /**
   * MicroPythonコード実行（Paste Mode）
   */
  async executeCode(code: string): Promise<boolean> {
    if (!this.ws || this.status !== 'connected') {
      console.error('WebREPL not connected');
      return false;
    }

    try {
      // Ctrl+E: Paste mode開始
      this.sendRaw('\x05');

      // 少し待機
      await this.sleep(100);

      // コード送信
      this.sendRaw(code);

      // 少し待機
      await this.sleep(100);

      // Ctrl+D: Paste mode終了・実行
      this.sendRaw('\x04');

      return true;
    } catch (error) {
      console.error('Failed to execute code:', error);
      return false;
    }
  }

  /**
   * ファイルアップロード（簡易版）
   */
  async uploadFile(filename: string, content: string): Promise<boolean> {
    if (!this.ws || this.status !== 'connected') {
      console.error('WebREPL not connected');
      return false;
    }

    try {
      // ファイル書き込みコマンドを実行
      const writeCommand = `
with open('${filename}', 'w') as f:
    f.write('''${content}''')
print('File uploaded: ${filename}')
`;
      return await this.executeCode(writeCommand);
    } catch (error) {
      console.error('Failed to upload file:', error);
      return false;
    }
  }

  /**
   * ESP32リセット
   */
  async resetESP32(): Promise<void> {
    if (this.ws && this.status === 'connected') {
      // Ctrl+D: soft reset
      this.sendRaw('\x04');
    }
  }

  /**
   * Ctrl+C送信（実行中断）
   */
  async interrupt(): Promise<void> {
    if (this.ws && this.status === 'connected') {
      // Ctrl+C
      this.sendRaw('\x03');
    }
  }

  /**
   * 生データ送信
   */
  private sendRaw(data: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(data);
    }
  }

  /**
   * ステータス変更
   */
  private setStatus(status: ConnectionStatus) {
    this.status = status;
    this.config?.onStatusChange?.(status);
  }

  /**
   * 再接続試行
   */
  private attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts && this.config) {
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);

      setTimeout(() => {
        if (this.config) {
          this.connect(this.config);
        }
      }, 2000 * this.reconnectAttempts);
    }
  }

  /**
   * スリープユーティリティ
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 接続状態を取得
   */
  get isConnected(): boolean {
    return this.status === 'connected';
  }

  /**
   * 現在のステータスを取得
   */
  getStatus(): ConnectionStatus {
    return this.status;
  }
}

// シングルトンインスタンス
export const wifiService = new WifiService();
