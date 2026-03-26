// Web Serial API Service for ESP32 Connection

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface SerialServiceOptions {
  baudRate?: number;
  onData?: (data: string) => void;
  onStatusChange?: (status: ConnectionStatus) => void;
  onError?: (error: Error) => void;
}

// SerialPort型を定義（Web Serial APIはグローバルに存在）
type SerialPortType = {
  readonly readable: ReadableStream<Uint8Array> | null;
  readonly writable: WritableStream<Uint8Array> | null;
  getInfo(): { usbVendorId?: number; usbProductId?: number };
  open(options: { baudRate: number; dataBits?: number; stopBits?: number; parity?: string; flowControl?: string }): Promise<void>;
  close(): Promise<void>;
  setSignals(signals: { dataTerminalReady?: boolean; requestToSend?: boolean; break?: boolean }): Promise<void>;
  getSignals(): Promise<{ dataCarrierDetect: boolean; clearToSend: boolean; ringIndicator: boolean; dataSetReady: boolean }>;
};

class SerialService {
  private port: SerialPortType | null = null;
  private reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  private writer: WritableStreamDefaultWriter<Uint8Array> | null = null;
  private readLoopRunning = false;
  private options: SerialServiceOptions = {};
  private _status: ConnectionStatus = 'disconnected';

  get status(): ConnectionStatus {
    return this._status;
  }

  get isConnected(): boolean {
    return this._status === 'connected';
  }

  get isSupported(): boolean {
    return 'serial' in navigator;
  }

  private setStatus(status: ConnectionStatus) {
    this._status = status;
    this.options.onStatusChange?.(status);
  }

  async connect(options: SerialServiceOptions = {}): Promise<boolean> {
    if (!this.isSupported) {
      const error = new Error('Web Serial APIはこのブラウザでサポートされていません。Chrome または Edge を使用してください。');
      options.onError?.(error);
      return false;
    }

    if (this.isConnected) {
      await this.disconnect();
    }

    this.options = options;
    this.setStatus('connecting');

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const serial = (navigator as any).serial;

      // ESP32のUSB-UART チップ（CP2102, CH340など）をフィルタ
      this.port = await serial.requestPort({
        filters: [
          { usbVendorId: 0x10C4 }, // Silicon Labs CP210x
          { usbVendorId: 0x1A86 }, // QinHeng Electronics CH340
          { usbVendorId: 0x0403 }, // FTDI
          { usbVendorId: 0x303A }, // Espressif USB JTAG/serial
        ]
      }) as SerialPortType;

      // ポートが既に開いている場合（他サービスが閉じきれていない場合）は一度閉じる
      if (this.port.readable || this.port.writable) {
        console.debug('[Serial] Port already open, closing before reconnect...');
        try {
          await this.port.close();
        } catch (error) {
          console.debug('[Serial] Port close error (expected):', error);
        }
        // ポートが安定するまで少し待つ
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      await this.port.open({
        baudRate: options.baudRate || 115200,
        dataBits: 8,
        stopBits: 1,
        parity: 'none',
        flowControl: 'none',
      });

      this.setStatus('connected');
      this.startReadLoop();
      return true;
    } catch (error) {
      this.setStatus('error');
      if (error instanceof Error) {
        // ユーザーがキャンセルした場合
        if (error.name === 'NotFoundError') {
          this.setStatus('disconnected');
          return false;
        }
        this.options.onError?.(error);
      }
      return false;
    }
  }

  async disconnect(): Promise<void> {
    this.readLoopRunning = false;

    if (this.reader) {
      try {
        await this.reader.cancel();
      } catch (error) {
        // 切断時のエラーは想定内だがデバッグ用にログ出力
        console.debug('[Serial] Reader cancel error (expected during disconnect):', error);
      }
      try {
        this.reader.releaseLock();
      } catch (error) {
        console.debug('[Serial] Reader releaseLock error (expected during disconnect):', error);
      }
      this.reader = null;
    }

    if (this.writer) {
      try {
        await this.writer.close();
      } catch (error) {
        // 切断時のエラーは想定内だがデバッグ用にログ出力
        console.debug('[Serial] Writer close error (expected during disconnect):', error);
      }
      try {
        this.writer.releaseLock();
      } catch (error) {
        console.debug('[Serial] Writer releaseLock error (expected during disconnect):', error);
      }
      this.writer = null;
    }

    if (this.port) {
      try {
        await this.port.close();
      } catch (error) {
        // 切断時のエラーは想定内だがデバッグ用にログ出力
        console.debug('[Serial] Port close error (expected during disconnect):', error);
      }
      this.port = null;
    }

    this.setStatus('disconnected');
  }

  private async startReadLoop(): Promise<void> {
    if (!this.port) return;
    const readable = this.port.readable;
    if (!readable) return;

    this.readLoopRunning = true;
    const decoder = new TextDecoder();

    while (this.readLoopRunning && this.port) {
      const currentReadable = this.port.readable;
      if (!currentReadable) break;

      try {
        this.reader = currentReadable.getReader();

        while (this.readLoopRunning) {
          const { value, done } = await this.reader.read();
          if (done) break;
          if (value) {
            const text = decoder.decode(value);
            this.options.onData?.(text);
          }
        }
      } catch (error) {
        if (this.readLoopRunning) {
          console.error('Serial read error:', error);
        }
      } finally {
        if (this.reader) {
          this.reader.releaseLock();
          this.reader = null;
        }
      }
    }
  }

  async write(data: string): Promise<boolean> {
    if (!this.port) return false;
    const writable = this.port.writable;
    if (!writable) return false;

    try {
      this.writer = writable.getWriter();
      const encoder = new TextEncoder();
      await this.writer.write(encoder.encode(data));
      this.writer.releaseLock();
      this.writer = null;
      return true;
    } catch (error) {
      console.error('Serial write error:', error);
      if (this.writer) {
        this.writer.releaseLock();
        this.writer = null;
      }
      return false;
    }
  }

  async writeLine(data: string): Promise<boolean> {
    return this.write(data + '\n');
  }

  /**
   * MicroPythonコード実行（Paste Mode）
   */
  async executeCode(code: string): Promise<boolean> {
    if (this._status !== 'connected') {
      console.error('Serial not connected');
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
   * スリープユーティリティ
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async writeBytes(data: Uint8Array): Promise<boolean> {
    if (!this.port) return false;
    const writable = this.port.writable;
    if (!writable) return false;

    try {
      this.writer = writable.getWriter();
      await this.writer.write(data);
      this.writer.releaseLock();
      this.writer = null;
      return true;
    } catch (error) {
      console.error('Serial write error:', error);
      if (this.writer) {
        this.writer.releaseLock();
        this.writer = null;
      }
      return false;
    }
  }

  // ESP32をリセット（DTR/RTSシグナルを使用）
  async resetESP32(): Promise<void> {
    if (!this.port) return;

    try {
      // EN (リセット) ピンをLOWに
      await this.port.setSignals({ dataTerminalReady: false, requestToSend: true });
      await new Promise(resolve => setTimeout(resolve, 100));

      // EN ピンをHIGHに戻す
      await this.port.setSignals({ dataTerminalReady: false, requestToSend: false });
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error('Reset ESP32 error:', error);
    }
  }

  // ESP32をブートローダーモードに（書き込み用）
  async enterBootloader(): Promise<void> {
    if (!this.port) return;

    try {
      // IO0をLOWに保持しながらリセット
      await this.port.setSignals({ dataTerminalReady: false, requestToSend: true });
      await new Promise(resolve => setTimeout(resolve, 100));

      await this.port.setSignals({ dataTerminalReady: true, requestToSend: false });
      await new Promise(resolve => setTimeout(resolve, 50));

      await this.port.setSignals({ dataTerminalReady: false, requestToSend: false });
    } catch (error) {
      console.error('Enter bootloader error:', error);
    }
  }

  getPortInfo(): { vendorId?: number; productId?: number } | null {
    if (!this.port) return null;
    const info = this.port.getInfo();
    return {
      vendorId: info.usbVendorId,
      productId: info.usbProductId,
    };
  }

  /**
   * 全てのUSBシリアルポートを強制的に解放する
   * Windows環境でポートがロックされたままになる問題を解決
   */
  async forceReleaseAllPorts(): Promise<number> {
    if (!this.isSupported) {
      throw new Error('Web Serial APIはこのブラウザでサポートされていません');
    }

    // 現在の接続を切断
    await this.disconnect();

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const serial = (navigator as any).serial;

      // 以前に接続したことがある全てのポートを取得
      const ports = await serial.getPorts() as SerialPortType[];

      console.log(`[USBポート解放] ${ports.length}個のポートが見つかりました`);

      // 各ポートを強制的に閉じる
      let releasedCount = 0;
      for (const port of ports) {
        try {
          // ポートが既に開いているかチェック（readable/writableがnullでない場合）
          if (port.readable || port.writable) {
            console.log('[USBポート解放] ポートを閉じています...', port.getInfo());
            await port.close();
            releasedCount++;
          }
        } catch (error) {
          // 既に閉じられているポートのエラーは無視
          console.debug('[USBポート解放] ポートクローズエラー（既に閉じている可能性）:', error);
        }
      }

      console.log(`[USBポート解放] ${releasedCount}個のポートを解放しました`);
      return releasedCount;
    } catch (error) {
      console.error('[USBポート解放] エラー:', error);
      throw error;
    }
  }
}

// シングルトンインスタンス
export const serialService = new SerialService();
