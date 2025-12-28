import { ESPLoader, Transport } from 'esptool-js';
import { getCompileServerUrl } from '@/config/servers';
import type { FullPackage } from './compileService';

export type FlashStage = 'connecting' | 'erasing' | 'flashing' | 'verifying' | 'complete' | 'error';

export type FlashProgress = {
  stage: FlashStage;
  file?: string;
  percent: number;
  message: string;
};

export type ChipInfo = {
  name: string;
  mac: string;
  features: string[];
};

class FirmwareService {
  private loader: ESPLoader | null = null;
  private transport: Transport | null = null;
  private port: SerialPort | null = null;
  private logCallback: ((message: string) => void) | null = null;

  /**
   * Check if Web Serial API is supported
   */
  get isSupported(): boolean {
    return 'serial' in navigator;
  }

  /**
   * Set log callback
   */
  setLogCallback(callback: (message: string) => void) {
    this.logCallback = callback;
  }

  /**
   * Log message
   */
  private log(message: string) {
    if (this.logCallback) {
      this.logCallback(message);
    }
    console.log('[esptool]', message);
  }

  /**
   * Connect to ESP32 device
   */
  async connect(
    onProgress: (progress: FlashProgress) => void
  ): Promise<ChipInfo | null> {
    if (!this.isSupported) {
      onProgress({
        stage: 'error',
        percent: 0,
        message: 'Web Serial APIはこのブラウザでサポートされていません。Chrome または Edge を使用してください。'
      });
      return null;
    }

    try {
      onProgress({
        stage: 'connecting',
        percent: 0,
        message: 'デバイスを選択してください...'
      });

      // Web Serial APIでポート選択
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const serial = (navigator as any).serial;
      this.port = await serial.requestPort({
        filters: [
          { usbVendorId: 0x10C4 }, // Silicon Labs CP210x
          { usbVendorId: 0x1A86 }, // QinHeng Electronics CH340
          { usbVendorId: 0x0403 }, // FTDI
          { usbVendorId: 0x303A }, // Espressif USB JTAG/serial
        ]
      });

      onProgress({
        stage: 'connecting',
        percent: 10,
        message: 'ポートを開いています...'
      });

      // Transportを初期化
      this.transport = new Transport(this.port!, true);

      onProgress({
        stage: 'connecting',
        percent: 20,
        message: 'ESPLoaderを初期化中...'
      });

      // esptool-js初期化
      this.loader = new ESPLoader({
        transport: this.transport,
        baudrate: 115200,  // 初期接続用（stub flasher起動後は自動的に高速化される）
        terminal: {
          clean: () => this.log('[TERMINAL CLEAN]'),
          writeLine: (text) => this.log(text),
          write: (text) => this.log(text),
        },
        debugLogging: true,
      });

      onProgress({
        stage: 'connecting',
        percent: 30,
        message: 'ESP32と接続中...'
      });

      // ESP32と接続・検出
      const chipName = await this.loader.main();

      onProgress({
        stage: 'connecting',
        percent: 40,
        message: 'チップ情報を取得中...'
      });

      // chipオブジェクトからMAC addressとfeaturesを取得
      const macAddr = await this.loader.chip.readMac(this.loader);
      const features = await this.loader.chip.getChipFeatures(this.loader);

      onProgress({
        stage: 'connecting',
        percent: 50,
        message: `接続成功: ${chipName}`
      });

      return {
        name: chipName,
        mac: macAddr,
        features: features
      };
    } catch (error) {
      console.error('Connection error:', error);
      onProgress({
        stage: 'error',
        percent: 0,
        message: `接続エラー: ${(error as Error).message}`
      });
      return null;
    }
  }

  /**
   * Flash MicroPython firmware to ESP32
   */
  async flashFirmware(
    onProgress: (progress: FlashProgress) => void
  ): Promise<boolean> {
    if (!this.loader) {
      onProgress({
        stage: 'error',
        percent: 0,
        message: '先に接続してください'
      });
      return false;
    }

    try {
      // MicroPython統合ファームウェア（bootloader, partition table, アプリケーションが1つに統合）
      const files = [
        { name: 'ESP32_GENERIC-20250911-v1.26.1.bin', address: 0x1000 },
      ];

      onProgress({
        stage: 'erasing',
        percent: 10,
        message: 'ファームウェアファイルを読み込み中...'
      });

      // 全ファイルを読み込み
      const fileArray: Array<{ data: string; address: number }> = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const progressPercent = 10 + (i / files.length) * 20;

        onProgress({
          stage: 'erasing',
          file: file.name,
          percent: progressPercent,
          message: `${file.name} を読み込み中...`
        });

        const response = await fetch(`/firmware/esp32/${file.name}`);
        if (!response.ok) {
          throw new Error(`${file.name} の読み込みに失敗しました (${response.status})`);
        }

        const arrayBuffer = await response.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);

        // Uint8ArrayをBase64文字列に変換
        const binaryString = Array.from(uint8Array)
          .map(byte => String.fromCharCode(byte))
          .join('');

        fileArray.push({
          data: binaryString,
          address: file.address
        });
      }

      onProgress({
        stage: 'erasing',
        percent: 30,
        message: 'フラッシュメモリを消去中...'
      });

      // MicroPython推奨: フラッシュ全体を消去
      await this.loader.eraseFlash();

      onProgress({
        stage: 'flashing',
        percent: 40,
        message: '書き込み準備完了'
      });

      // writeFlashを使用して一括書き込み（公式例に従う）
      await this.loader.writeFlash({
        fileArray: fileArray,
        flashSize: 'keep',
        flashMode: 'keep',
        flashFreq: 'keep',
        eraseAll: false,  // 既に手動で消去済み（公式例に従う）
        compress: true,  // 公式例に従って圧縮を有効化
        reportProgress: (fileIndex: number, written: number, total: number) => {
          const filePercent = 40 + (written / total) * 50;
          const fileName = files[fileIndex]?.name || 'ファイル';
          onProgress({
            stage: 'flashing',
            file: fileName,
            percent: filePercent,
            message: `${fileName} を書き込み中... ${Math.floor((written / total) * 100)}%`
          });
        }
      });

      onProgress({
        stage: 'verifying',
        percent: 95,
        message: 'ESP32をリセット中...'
      });

      // Hard reset to boot into MicroPython
      await this.loader.after('hard_reset');

      // 完了
      onProgress({
        stage: 'complete',
        percent: 100,
        message: '✅ ファームウェアの書き込みが完了しました！ESP32がMicroPythonで起動します。'
      });

      return true;
    } catch (error) {
      console.error('Flash error:', error);
      onProgress({
        stage: 'error',
        percent: 0,
        message: `書き込みエラー: ${(error as Error).message}`
      });
      return false;
    }
  }

  /**
   * Disconnect from ESP32
   */
  async disconnect(): Promise<void> {
    if (this.loader) {
      try {
        await this.loader.disconnect();
      } catch (error) {
        console.error('Disconnect error:', error);
      }
      this.loader = null;
    }
    if (this.transport) {
      try {
        await this.transport.disconnect();
      } catch (error) {
        console.error('Transport disconnect error:', error);
      }
      this.transport = null;
    }
    this.port = null;
  }

  /**
   * Check if firmware files exist
   */
  async checkFirmwareFiles(): Promise<{
    available: boolean;
    missing: string[];
  }> {
    const files = [
      'ESP32_GENERIC-20250911-v1.26.1.bin',
    ];

    const missing: string[] = [];

    for (const file of files) {
      try {
        const response = await fetch(`/firmware/esp32/${file}`, { method: 'HEAD' });
        if (!response.ok) {
          missing.push(file);
        }
      } catch {
        missing.push(file);
      }
    }

    return {
      available: missing.length === 0,
      missing,
    };
  }

  /**
   * Flash complete Arduino firmware (bootloader + partitions + boot_app0 + firmware) to ESP32
   * Used for firmware installer with cloud-compiled DigiCodeOTA template
   */
  async flashCompleteArduinoFirmware(
    bootloaderBlob: Blob,
    partitionsBlob: Blob,
    bootApp0Blob: Blob,
    firmwareBlob: Blob,
    onProgress: (progress: FlashProgress) => void
  ): Promise<boolean> {
    if (!this.loader) {
      onProgress({
        stage: 'error',
        percent: 0,
        message: '先に接続してください'
      });
      return false;
    }

    try {
      onProgress({
        stage: 'erasing',
        percent: 5,
        message: 'ファームウェアを準備中...'
      });

      // Convert all Blobs to binary strings
      const bootloaderData = await this.blobToBinaryString(bootloaderBlob);
      const partitionsData = await this.blobToBinaryString(partitionsBlob);
      const bootApp0Data = await this.blobToBinaryString(bootApp0Blob);
      const firmwareData = await this.blobToBinaryString(firmwareBlob);

      onProgress({
        stage: 'erasing',
        percent: 20,
        message: 'フラッシュメモリを消去中...'
      });

      // Erase flash
      await this.loader.eraseFlash();

      onProgress({
        stage: 'flashing',
        percent: 30,
        message: '書き込み準備完了'
      });

      // Write all 4 files to their respective addresses
      await this.loader.writeFlash({
        fileArray: [
          { data: bootloaderData, address: 0x1000 },    // bootloader @ 4096
          { data: partitionsData, address: 0x8000 },    // partitions @ 32768
          { data: bootApp0Data, address: 0xE000 },      // boot_app0 @ 57344
          { data: firmwareData, address: 0x10000 }      // firmware @ 65536
        ],
        flashSize: 'keep',
        flashMode: 'keep',
        flashFreq: 'keep',
        eraseAll: false,
        compress: true,
        reportProgress: (fileIndex: number, written: number, total: number) => {
          const filePercent = 30 + (written / total) * 60;
          const fileNames = ['bootloader', 'partitions', 'boot_app0', 'firmware'];
          const fileName = fileNames[fileIndex] || 'file';
          onProgress({
            stage: 'flashing',
            file: fileName,
            percent: filePercent,
            message: `${fileName} を書き込み中... ${Math.floor((written / total) * 100)}%`
          });
        }
      });

      onProgress({
        stage: 'verifying',
        percent: 95,
        message: 'ESP32をリセット中...'
      });

      // Hard reset
      await this.loader.after('hard_reset');

      onProgress({
        stage: 'complete',
        percent: 100,
        message: '✅ ファームウェアの書き込みが完了しました！'
      });

      return true;
    } catch (error) {
      console.error('Flash complete Arduino error:', error);
      onProgress({
        stage: 'error',
        percent: 0,
        message: `書き込みエラー: ${(error as Error).message}`
      });
      return false;
    }
  }

  /**
   * Convert Blob to binary string for esptool-js
   */
  private async blobToBinaryString(blob: Blob): Promise<string> {
    const arrayBuffer = await blob.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    return Array.from(uint8Array)
      .map(byte => String.fromCharCode(byte))
      .join('');
  }

  /**
   * Flash Arduino firmware (compiled from Blockly) to ESP32
   *
   * @param data - ArrayBuffer（従来の単一binファイル）またはFullPackage（4ファイルセット）
   * @param onProgress - 進捗コールバック
   */
  async flashArduinoFirmware(
    data: ArrayBuffer | FullPackage,
    onProgress: (progress: FlashProgress) => void
  ): Promise<boolean> {
    if (!this.loader) {
      onProgress({
        stage: 'error',
        percent: 0,
        message: '先に接続してください'
      });
      return false;
    }

    try {
      onProgress({
        stage: 'erasing',
        percent: 10,
        message: 'ファームウェアを準備中...'
      });

      // FullPackageかArrayBufferかを判定
      const isFullPackage = !(data instanceof ArrayBuffer);

      if (isFullPackage) {
        // fullPackageモード: 4ファイル全部書き込み
        const fullPackage = data as FullPackage;

        // 各BlobをArrayBufferに変換してbinaryStringに
        const bootloaderBuffer = await fullPackage.bootloader.arrayBuffer();
        const bootloaderString = Array.from(new Uint8Array(bootloaderBuffer))
          .map(byte => String.fromCharCode(byte))
          .join('');

        const partitionsBuffer = await fullPackage.partitions.arrayBuffer();
        const partitionsString = Array.from(new Uint8Array(partitionsBuffer))
          .map(byte => String.fromCharCode(byte))
          .join('');

        const bootApp0Buffer = await fullPackage.bootApp0.arrayBuffer();
        const bootApp0String = Array.from(new Uint8Array(bootApp0Buffer))
          .map(byte => String.fromCharCode(byte))
          .join('');

        const firmwareBuffer = await fullPackage.firmware.arrayBuffer();
        const firmwareString = Array.from(new Uint8Array(firmwareBuffer))
          .map(byte => String.fromCharCode(byte))
          .join('');

        onProgress({
          stage: 'erasing',
          percent: 30,
          message: 'フラッシュメモリを消去中...'
        });

        // フラッシュ消去
        await this.loader.eraseFlash();

        onProgress({
          stage: 'flashing',
          percent: 40,
          message: '書き込み準備完了'
        });

        // 4ファイル全部書き込み（ESP32の正しいアドレスマップ）
        await this.loader.writeFlash({
          fileArray: [
            { data: bootloaderString, address: 0x1000 },   // Bootloader
            { data: partitionsString, address: 0x8000 },   // Partition table
            { data: bootApp0String, address: 0xe000 },     // Boot app0
            { data: firmwareString, address: 0x10000 }     // Application firmware
          ],
          flashSize: 'keep',
          flashMode: 'keep',
          flashFreq: 'keep',
          eraseAll: false,
          compress: true,
          reportProgress: (_fileIndex: number, written: number, total: number) => {
            const filePercent = 40 + (written / total) * 50;
            onProgress({
              stage: 'flashing',
              percent: filePercent,
              message: `書き込み中... ${Math.floor((written / total) * 100)}%`
            });
          }
        });
      } else {
        // 従来モード: 単一binファイルを0x10000番地に書き込み（後方互換性）
        const arrayBuffer = data as ArrayBuffer;
        const uint8Array = new Uint8Array(arrayBuffer);
        const binaryString = Array.from(uint8Array)
          .map(byte => String.fromCharCode(byte))
          .join('');

        onProgress({
          stage: 'erasing',
          percent: 30,
          message: 'フラッシュメモリを消去中...'
        });

        // フラッシュ消去
        await this.loader.eraseFlash();

        onProgress({
          stage: 'flashing',
          percent: 40,
          message: '書き込み準備完了'
        });

        // Arduino binファイルを0x10000番地に書き込み
        await this.loader.writeFlash({
          fileArray: [
            {
              data: binaryString,
              address: 0x10000  // Arduinoアプリケーション開始アドレス
            }
          ],
          flashSize: 'keep',
          flashMode: 'keep',
          flashFreq: 'keep',
          eraseAll: false,
          compress: true,
          reportProgress: (_fileIndex: number, written: number, total: number) => {
            const filePercent = 40 + (written / total) * 50;
            onProgress({
              stage: 'flashing',
              percent: filePercent,
              message: `書き込み中... ${Math.floor((written / total) * 100)}%`
            });
          }
        });
      }

      onProgress({
        stage: 'verifying',
        percent: 95,
        message: 'ESP32をリセット中...'
      });

      // Hard reset
      await this.loader.after('hard_reset');

      onProgress({
        stage: 'complete',
        percent: 100,
        message: '✅ ファームウェアの書き込みが完了しました！'
      });

      return true;
    } catch (error) {
      console.error('Flash Arduino error:', error);
      onProgress({
        stage: 'error',
        percent: 0,
        message: `書き込みエラー: ${(error as Error).message}`
      });
      return false;
    }
  }

  /**
   * mDNSホスト名をIPアドレスに解決
   * @param hostname mDNSホスト名（例: digicode-robot001.local）
   */
  async resolveMdns(hostname: string): Promise<string | null> {
    try {
      const compileServerUrl = getCompileServerUrl();
      const response = await fetch(`${compileServerUrl}/api/resolve?hostname=${encodeURIComponent(hostname)}`, {
        signal: AbortSignal.timeout(5000)
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.ip) {
          console.log(`[mDNS] Resolved ${hostname} -> ${data.ip}`);
          return data.ip;
        }
      }
      return null;
    } catch (error) {
      console.error('[mDNS] Resolution failed:', error);
      return null;
    }
  }

  /**
   * WiFi経由でOTA更新を実行
   * @param deviceUrl デバイスのURL
   * @param binData ファームウェアバイナリ
   * @param onProgress 進捗コールバック
   * @param timeoutMs タイムアウト（ミリ秒、デフォルト60秒）
   */
  async otaUpdate(
    deviceUrl: string,
    binData: Blob,
    onProgress: (progress: FlashProgress) => void,
    timeoutMs: number = 60000
  ): Promise<boolean> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      // .localドメインの場合、バックエンドでmDNS解決
      let resolvedUrl = deviceUrl;
      if (deviceUrl.includes('.local')) {
        onProgress({
          stage: 'connecting',
          percent: 0,
          message: `mDNSでデバイスを検索中...`
        });

        // URLからホスト名を抽出
        const url = new URL(deviceUrl);
        const hostname = url.hostname;
        const resolvedIp = await this.resolveMdns(hostname);

        if (resolvedIp) {
          resolvedUrl = `http://${resolvedIp}`;
          console.log(`[OTA] Using resolved IP: ${resolvedUrl}`);
        } else {
          throw new Error(`mDNS解決に失敗: ${hostname}`);
        }
      }

      onProgress({
        stage: 'connecting',
        percent: 5,
        message: `${resolvedUrl} に接続中...`
      });

      // デバイスの疎通確認（リトライ機能付き）
      // 2回目以降の書き込みで接続が不安定な問題への対策
      const maxConnectRetries = 3;
      let connected = false;

      for (let attempt = 0; attempt < maxConnectRetries; attempt++) {
        try {
          onProgress({
            stage: 'connecting',
            percent: 5 + (attempt * 2),
            message: attempt > 0
              ? `接続を再試行中... (${attempt + 1}/${maxConnectRetries})`
              : `${resolvedUrl} に接続中...`
          });

          const pingResponse = await fetch(resolvedUrl, {
            signal: AbortSignal.timeout(5000),
            mode: 'cors'
          });
          if (pingResponse.ok) {
            connected = true;
            break;
          }
        } catch (pingError) {
          console.log(`[OTA] Connection attempt ${attempt + 1}/${maxConnectRetries} failed:`, pingError);
          if (attempt < maxConnectRetries - 1) {
            // 次のリトライまで待機（exponential backoff）
            await new Promise(resolve => setTimeout(resolve, 2000 * (attempt + 1)));
          }
        }
      }

      if (!connected) {
        throw new Error(`デバイスに接続できません: ${resolvedUrl}\n再起動直後の場合は、10秒程度待ってから再試行してください。`);
      }

      onProgress({
        stage: 'connecting',
        percent: 10,
        message: 'デバイスに接続しました'
      });

      // FormDataでバイナリを送信
      const formData = new FormData();
      formData.append('firmware', binData, 'firmware.bin');

      onProgress({
        stage: 'flashing',
        percent: 20,
        message: 'ファームウェアをアップロード中...'
      });

      // XMLHttpRequestを使用して進捗を取得
      const uploadResult = await new Promise<{ ok: boolean; status: number; text: string }>((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        // アップロード進捗
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = 20 + (event.loaded / event.total) * 50; // 20% - 70%
            onProgress({
              stage: 'flashing',
              percent: Math.round(percent),
              message: `アップロード中... ${Math.round((event.loaded / event.total) * 100)}%`
            });
          }
        };

        xhr.onload = () => {
          resolve({ ok: xhr.status >= 200 && xhr.status < 300, status: xhr.status, text: xhr.responseText });
        };

        xhr.onerror = () => {
          reject(new Error('ネットワークエラー'));
        };

        xhr.ontimeout = () => {
          reject(new Error(`タイムアウト（${timeoutMs / 1000}秒）`));
        };

        // AbortControllerのシグナルを監視
        controller.signal.addEventListener('abort', () => {
          xhr.abort();
          reject(new Error(`タイムアウト（${timeoutMs / 1000}秒）`));
        });

        xhr.open('POST', `${resolvedUrl}/doUpdate`);
        xhr.timeout = timeoutMs;
        xhr.send(formData);
      });

      if (!uploadResult.ok) {
        throw new Error(`OTA更新に失敗: ${uploadResult.status} ${uploadResult.text}`);
      }

      onProgress({
        stage: 'verifying',
        percent: 75,
        message: 'アップロード完了、デバイスが再起動中...'
      });

      // デバイスの再起動を待つ（進捗表示付き）
      // ESP32のリブート + WiFi再接続 + OTAサーバー起動に十分な時間を確保
      // 2回目以降の書き込みが不安定になる問題への対策として待機時間を延長
      const rebootWaitTime = 20000; // 20秒（15秒では不足する場合がある）
      const rebootSteps = 5;
      for (let i = 0; i < rebootSteps; i++) {
        await new Promise(resolve => setTimeout(resolve, rebootWaitTime / rebootSteps));
        onProgress({
          stage: 'verifying',
          percent: 75 + ((i + 1) / rebootSteps) * 15, // 75% - 90%
          message: `デバイス再起動中... (${i + 1}/${rebootSteps})`
        });
      }

      // デバイスが復帰したか確認（複数回リトライ）
      // OTAサーバーが完全に起動するまで時間がかかる場合があるため、
      // リトライ回数と間隔を増やして安定性を向上
      onProgress({
        stage: 'verifying',
        percent: 90,
        message: 'デバイスの復帰を確認中...'
      });

      let deviceVerified = false;
      const maxRetries = 5; // 3回から5回に増加

      for (let retry = 0; retry < maxRetries; retry++) {
        try {
          await new Promise(resolve => setTimeout(resolve, 3000)); // 2秒から3秒に増加
          onProgress({
            stage: 'verifying',
            percent: 90 + ((retry + 1) / maxRetries) * 8, // 90% - 98%
            message: `デバイス確認中... (${retry + 1}/${maxRetries})`
          });
          const verifyResponse = await fetch(resolvedUrl, {
            signal: AbortSignal.timeout(5000),
            mode: 'cors'
          });
          if (verifyResponse.ok) {
            deviceVerified = true;
            break;
          }
        } catch {
          console.log(`[OTA] Device verification attempt ${retry + 1}/${maxRetries} failed`);
        }
      }

      if (deviceVerified) {
        onProgress({
          stage: 'complete',
          percent: 100,
          message: '✓ OTA更新が完了しました！デバイスが正常に再起動しました。'
        });
        return true;
      } else {
        // デバイスが応答しない場合は警告として表示
        console.error('[OTA] Device verification failed after all retries');
        onProgress({
          stage: 'error',
          percent: 100,
          message: '⚠️ アップロードは完了しましたが、デバイスが応答しません。デバイスの電源とWiFi接続を確認してください。'
        });
        return false;  // 検証失敗は成功とみなさない
      }
    } catch (error) {
      console.error('OTA update error:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);

      // タイムアウトエラーの判定
      if (errorMessage.includes('タイムアウト') || errorMessage.includes('abort')) {
        onProgress({
          stage: 'error',
          percent: 0,
          message: `OTA更新タイムアウト: ${timeoutMs / 1000}秒以内に完了しませんでした。デバイスの電源を確認してください。`
        });
      } else {
        onProgress({
          stage: 'error',
          percent: 0,
          message: `OTA更新エラー: ${errorMessage}`
        });
      }
      return false;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * デバイスのオンライン状態を確認
   * @param deviceUrl デバイスのURL
   * @param timeoutMs タイムアウト（ミリ秒）
   */
  async checkDeviceOnline(deviceUrl: string, timeoutMs: number = 3000): Promise<boolean> {
    try {
      const response = await fetch(deviceUrl, {
        signal: AbortSignal.timeout(timeoutMs),
        mode: 'cors'
      });
      if (!response.ok) {
        console.debug(`[Device] Online check failed for ${deviceUrl}: HTTP ${response.status}`);
      }
      return response.ok;
    } catch (error) {
      console.debug(`[Device] Online check failed for ${deviceUrl}:`, error);
      return false;
    }
  }

  /**
   * 複数デバイスへの一括OTA更新
   * @param devices 更新対象デバイスのリスト
   * @param binData ファームウェアバイナリ
   * @param onProgress 進捗コールバック（デバイスごと）
   * @param onBatchProgress 全体進捗コールバック
   */
  async batchOtaUpdate(
    devices: Array<{ url: string; name: string }>,
    binData: Blob,
    onProgress: (deviceUrl: string, progress: FlashProgress) => void,
    onBatchProgress?: (completed: number, total: number, results: Map<string, boolean>) => void
  ): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>();
    const total = devices.length;

    // 順次更新（並列にすると帯域の問題が発生する可能性があるため）
    for (let i = 0; i < devices.length; i++) {
      const device = devices[i];

      try {
        const success = await this.otaUpdate(
          device.url,
          binData,
          (progress) => onProgress(device.url, progress),
          60000  // 60秒タイムアウト
        );
        results.set(device.url, success);
      } catch {
        results.set(device.url, false);
        onProgress(device.url, {
          stage: 'error',
          percent: 0,
          message: 'OTA更新に失敗しました'
        });
      }

      // 全体進捗を通知
      if (onBatchProgress) {
        onBatchProgress(i + 1, total, results);
      }
    }

    return results;
  }

  /**
   * 以前接続したデバイスに自動再接続
   * ページロード時に呼び出して、以前の接続を復元
   * @returns 接続成功したらChipInfo、失敗したらnull
   */
  async autoReconnect(): Promise<ChipInfo | null> {
    try {
      if (!('serial' in navigator)) {
        console.debug('[AutoReconnect] Web Serial API not supported');
        return null;
      }

      // 以前許可されたポートを取得
      const ports = await navigator.serial.getPorts();
      if (ports.length === 0) {
        console.debug('[AutoReconnect] No previously granted ports');
        return null;
      }

      // 最初のポートに接続を試みる
      const port = ports[0];
      console.log('[AutoReconnect] Attempting to reconnect to previous device...');

      // すでに開いている場合はクローズ
      if (port.readable || port.writable) {
        try {
          await port.close();
        } catch (error) {
          console.debug('[AutoReconnect] Port already closed or error closing:', error);
        }
      }

      // ポートを開く
      await port.open({ baudRate: 115200 });

      // Transportを作成
      this.transport = new Transport(port, true);
      this.loader = new ESPLoader({
        transport: this.transport,
        baudrate: 115200,
        terminal: {
          clean: () => {},
          writeLine: (data: string) => console.log('[ESPLoader]', data),
          write: (data: string) => console.log('[ESPLoader]', data)
        }
      });

      // チップ情報を取得
      const chipName = await this.loader.main();
      const macAddr = await this.loader.readMac();
      const features = await this.loader.getFlashId();

      const chipInfo: ChipInfo = {
        name: chipName,
        mac: macAddr,
        features: [features.toString()]
      };

      console.log('[AutoReconnect] Successfully reconnected:', chipInfo);
      return chipInfo;
    } catch (error) {
      console.debug('[AutoReconnect] Failed to auto-reconnect:', error);
      // 失敗してもエラーは投げない（初回接続の場合は正常）
      return null;
    }
  }

  /**
   * すべてのシリアルポートを強制的に解放
   * Windowsでポートが解放されない問題への対処
   */
  async releaseAllPorts(): Promise<void> {
    try {
      if (!('serial' in navigator)) {
        console.debug('[ReleasePort] Web Serial API not supported');
        return;
      }

      // 現在の接続をクローズ
      if (this.loader) {
        try {
          await this.loader.disconnect();
        } catch (error) {
          console.debug('[ReleasePort] Error disconnecting loader:', error);
        }
        this.loader = null;
      }

      if (this.transport) {
        try {
          await this.transport.disconnect();
        } catch (error) {
          console.debug('[ReleasePort] Error disconnecting transport:', error);
        }
        this.transport = null;
      }

      // すべての許可されたポートをクローズ
      const ports = await navigator.serial.getPorts();
      console.log(`[ReleasePort] Releasing ${ports.length} port(s)...`);

      for (const port of ports) {
        try {
          // ポートが開いている場合のみクローズ
          if (port.readable || port.writable) {
            await port.close();
            console.log('[ReleasePort] Port closed successfully');
          }
        } catch (error) {
          console.debug('[ReleasePort] Error closing port:', error);
          // エラーは無視して続行
        }
      }

      // ポート権限を忘れる（forget()メソッドが利用可能な場合）
      for (const port of ports) {
        try {
          if ('forget' in port && typeof (port as any).forget === 'function') {
            await (port as any).forget();
            console.log('[ReleasePort] Port permission forgotten');
          }
        } catch (error) {
          console.debug('[ReleasePort] forget() not supported or error:', error);
        }
      }

      console.log('[ReleasePort] All ports released');
    } catch (error) {
      console.error('[ReleasePort] Error releasing ports:', error);
      throw error;
    }
  }
}

export const firmwareService = new FirmwareService();
