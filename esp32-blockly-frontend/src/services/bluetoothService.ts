// Web Bluetooth API Service for ESP32 BLE UART
// Nordic UART Service (NUS) implementation

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

// Nordic UART Service UUID
const UART_SERVICE_UUID = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
const UART_TX_CHARACTERISTIC_UUID = '6e400002-b5a3-f393-e0a9-e50e24dcca9e'; // Write
const UART_RX_CHARACTERISTIC_UUID = '6e400003-b5a3-f393-e0a9-e50e24dcca9e'; // Notify

interface BluetoothConfig {
  onData?: (data: string) => void;
  onStatusChange?: (status: ConnectionStatus) => void;
  onError?: (error: Error) => void;
}

class BluetoothService {
  private device: BluetoothDevice | null = null;
  private server: BluetoothRemoteGATTServer | null = null;
  private txCharacteristic: BluetoothRemoteGATTCharacteristic | null = null;
  private rxCharacteristic: BluetoothRemoteGATTCharacteristic | null = null;
  private config: BluetoothConfig | null = null;
  private status: ConnectionStatus = 'disconnected';
  private receiveBuffer: string = '';

  /**
   * Web Bluetooth APIがサポートされているか確認
   */
  get isSupported(): boolean {
    return 'bluetooth' in navigator;
  }

  /**
   * ESP32デバイスに接続
   */
  async connect(config: BluetoothConfig): Promise<boolean> {
    if (!this.isSupported) {
      const error = new Error('Web Bluetooth API is not supported in this browser');
      config.onError?.(error);
      return false;
    }

    if (this.device && this.status === 'connected') {
      console.warn('Already connected to Bluetooth device');
      return true;
    }

    this.config = config;
    this.setStatus('connecting');

    try {
      // デバイス選択ダイアログを表示
      this.device = await navigator.bluetooth.requestDevice({
        filters: [
          { services: [UART_SERVICE_UUID] },
          { namePrefix: 'ESP32' }
        ],
        optionalServices: [UART_SERVICE_UUID]
      });

      // 切断イベントリスナー
      this.device.addEventListener('gattserverdisconnected', () => {
        console.log('Bluetooth device disconnected');
        this.handleDisconnection();
      });

      // GATTサーバーに接続
      this.server = await this.device.gatt!.connect();

      // UARTサービスを取得
      const service = await this.server.getPrimaryService(UART_SERVICE_UUID);

      // TX Characteristic (Write)
      this.txCharacteristic = await service.getCharacteristic(UART_TX_CHARACTERISTIC_UUID);

      // RX Characteristic (Notify)
      this.rxCharacteristic = await service.getCharacteristic(UART_RX_CHARACTERISTIC_UUID);

      // 通知を開始
      await this.rxCharacteristic.startNotifications();
      this.rxCharacteristic.addEventListener('characteristicvaluechanged', (event) => {
        this.handleDataReceived(event);
      });

      this.setStatus('connected');
      console.log('Bluetooth connected successfully');
      return true;

    } catch (error) {
      console.error('Failed to connect to Bluetooth device:', error);
      this.config?.onError?.(error as Error);
      this.setStatus('error');
      return false;
    }
  }

  /**
   * 切断
   */
  async disconnect(): Promise<void> {
    try {
      if (this.rxCharacteristic) {
        await this.rxCharacteristic.stopNotifications();
      }

      if (this.server && this.server.connected) {
        this.server.disconnect();
      }

      this.device = null;
      this.server = null;
      this.txCharacteristic = null;
      this.rxCharacteristic = null;
      this.setStatus('disconnected');
      this.receiveBuffer = '';
    } catch (error) {
      console.error('Error during disconnect:', error);
    }
  }

  /**
   * データ送信
   */
  async write(data: string): Promise<boolean> {
    if (!this.txCharacteristic || this.status !== 'connected') {
      console.error('Bluetooth not connected');
      return false;
    }

    try {
      const encoder = new TextEncoder();
      const dataArray = encoder.encode(data);

      // BLEは一度に送信できるデータ量に制限があるため、分割送信
      const maxChunkSize = 20; // MTU size - header
      for (let i = 0; i < dataArray.length; i += maxChunkSize) {
        const chunk = dataArray.slice(i, i + maxChunkSize);
        await this.txCharacteristic.writeValue(chunk);
        // 小さな遅延を入れて確実に送信
        await this.sleep(10);
      }

      return true;
    } catch (error) {
      console.error('Failed to write data:', error);
      return false;
    }
  }

  /**
   * コマンド送信（改行付き）
   */
  async writeLine(data: string): Promise<boolean> {
    return this.write(data + '\r\n');
  }

  /**
   * MicroPythonコード実行（Paste Mode）
   */
  async executeCode(code: string): Promise<boolean> {
    if (this.status !== 'connected') {
      console.error('Bluetooth not connected');
      return false;
    }

    try {
      // Ctrl+E: Paste mode開始
      await this.write('\x05');
      await this.sleep(100);

      // コード送信
      await this.write(code);
      await this.sleep(100);

      // Ctrl+D: Paste mode終了・実行
      await this.write('\x04');

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
    if (this.status !== 'connected') {
      console.error('Bluetooth not connected');
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
    if (this.status === 'connected') {
      // Ctrl+D: soft reset
      await this.write('\x04');
    }
  }

  /**
   * Ctrl+C送信（実行中断）
   */
  async interrupt(): Promise<void> {
    if (this.status === 'connected') {
      // Ctrl+C
      await this.write('\x03');
    }
  }

  /**
   * データ受信処理
   */
  private handleDataReceived(event: Event) {
    const target = event.target as BluetoothRemoteGATTCharacteristic;
    const value = target.value;

    if (value) {
      const decoder = new TextDecoder();
      const text = decoder.decode(value);

      // バッファに追加
      this.receiveBuffer += text;

      // 改行で区切ってコールバック
      const lines = this.receiveBuffer.split('\n');
      if (lines.length > 1) {
        // 最後の要素以外を処理
        for (let i = 0; i < lines.length - 1; i++) {
          this.config?.onData?.(lines[i] + '\n');
        }
        // 最後の要素（未完了の行）をバッファに保持
        this.receiveBuffer = lines[lines.length - 1];
      }
    }
  }

  /**
   * 切断処理
   */
  private handleDisconnection() {
    this.setStatus('disconnected');
    this.device = null;
    this.server = null;
    this.txCharacteristic = null;
    this.rxCharacteristic = null;
    this.receiveBuffer = '';
  }

  /**
   * ステータス変更
   */
  private setStatus(status: ConnectionStatus) {
    this.status = status;
    this.config?.onStatusChange?.(status);
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
export const bluetoothService = new BluetoothService();
