/**
 * USB書き込みサービス
 * esptool-jsを使用してESP32にファームウェアを書き込む
 *
 * 制約:
 * - baudrate: 115200のみ（2025-12-10の実験で460800/230400は不安定）
 * - fullPackageモード必須（bootloader, partitions, boot_app0, firmwareの4ファイル）
 */

import { ESPLoader, Transport } from 'esptool-js';
import type {
  FullPackage,
  FlashProgress,
  ChipInfo,
  UsbFlashConfig
} from '../types/flash';

class UsbFirmwareService {
  private loader: ESPLoader | null = null;
  private transport: Transport | null = null;
  private port: SerialPort | null = null;
  private logCallback: ((message: string) => void) | null = null;

  /**
   * Web Serial API対応チェック
   */
  get isSupported(): boolean {
    return 'serial' in navigator;
  }

  /**
   * ログコールバック設定
   */
  setLogCallback(callback: (message: string) => void) {
    this.logCallback = callback;
  }

  /**
   * ログ出力
   */
  private log(message: string) {
    if (this.logCallback) {
      this.logCallback(message);
    }
    console.log('[UsbFirmware]', message);
  }

  /**
   * ESP32デバイスに接続
   */
  async connect(
    onProgress: (progress: FlashProgress) => void,
    config: UsbFlashConfig = { baudRate: 115200, debugLogging: true }
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

      // esptool-js初期化（baudrate: 115200固定）
      this.loader = new ESPLoader({
        transport: this.transport,
        baudrate: config.baudRate,
        terminal: {
          clean: () => this.log('[TERMINAL CLEAN]'),
          writeLine: (text) => this.log(text),
          write: (text) => this.log(text),
        },
        debugLogging: config.debugLogging ?? true,
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
   * Arduino fullPackageをESP32に書き込む
   *
   * @param fullPackage - 4ファイルセット（bootloader, partitions, boot_app0, firmware）
   * @param onProgress - 進捗コールバック
   */
  async flashFirmware(
    fullPackage: FullPackage,
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
        reportProgress: (fileIndex: number, written: number, total: number) => {
          const filePercent = 40 + (written / total) * 50;
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
   * ESP32から切断
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

  /**
   * 以前接続したデバイスに自動再接続
   * ページロード時に呼び出して、以前の接続を復元
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
}

export const usbFirmwareService = new UsbFirmwareService();
