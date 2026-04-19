/**
 * USB書き込み専用サービス
 *
 * 教訓（2025-12-10）に基づく設計:
 * - firmwareService.tsとは完全独立
 * - baudrate: 115200 bps固定（460800/230400は失敗）
 * - fullPackageモード必須: 4ファイル書き込み
 * - NVS保護: eraseFlash()を使わない
 * - DigiCodeUSB.inoテンプレート専用（WiFi/OTA機能なし）
 */

import { ESPLoader, Transport } from 'esptool-js';
import type { FullPackage } from './compileService';
import i18n from '@/i18n';

export type UsbFlashStage = 'connecting' | 'preparing' | 'flashing' | 'verifying' | 'complete' | 'error';

export type UsbFlashProgress = {
  stage: UsbFlashStage;
  file?: string;
  percent: number;
  message: string;
};

export type UsbChipInfo = {
  name: string;
  mac: string;
  features: string[];
};

class UsbFirmwareService {
  private loader: ESPLoader | null = null;
  private transport: Transport | null = null;
  private port: SerialPort | null = null;
  private logCallback: ((message: string) => void) | null = null;

  /**
   * Web Serial APIサポート確認
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

  private log(message: string) {
    if (this.logCallback) {
      this.logCallback(message);
    }
    console.log('[USB]', message);
  }

  /**
   * ESP32に接続
   * baudrate: 115200 bps固定（教訓に基づく）
   */
  async connect(
    onProgress: (progress: UsbFlashProgress) => void
  ): Promise<UsbChipInfo | null> {
    if (!this.isSupported) {
      onProgress({
        stage: 'error',
        percent: 0,
        message: i18n.t('firmware.status.webSerialUnsupported', { defaultValue: 'Web Serial APIはこのブラウザでサポートされていません。Chrome または Edge を使用してください。' })
      });
      return null;
    }

    try {
      onProgress({
        stage: 'connecting',
        percent: 0,
        message: i18n.t('firmware.status.selectDevice', { defaultValue: 'デバイスを選択してください...' })
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
        message: i18n.t('firmware.status.openingPort', { defaultValue: 'ポートを開いています...' })
      });

      // Transportを初期化
      this.transport = new Transport(this.port!, true);

      onProgress({
        stage: 'connecting',
        percent: 20,
        message: i18n.t('firmware.status.initEspLoader', { defaultValue: 'ESPLoaderを初期化中...' })
      });

      // esptool-js初期化
      // baudrate: 115200 bps固定（教訓: 460800/230400は失敗）
      this.loader = new ESPLoader({
        transport: this.transport,
        baudrate: 115200,
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
        message: i18n.t('firmware.status.connectingEsp32', { defaultValue: 'ESP32と接続中...' })
      });

      // ESP32と接続・検出
      const chipName = await this.loader.main();

      onProgress({
        stage: 'connecting',
        percent: 40,
        message: i18n.t('firmware.status.fetchChipInfo', { defaultValue: 'チップ情報を取得中...' })
      });

      // chipオブジェクトからMAC addressとfeaturesを取得
      const macAddr = await this.loader.chip.readMac(this.loader);
      const features = await this.loader.chip.getChipFeatures(this.loader);

      onProgress({
        stage: 'connecting',
        percent: 50,
        message: i18n.t('firmware.status.connectedTo', { defaultValue: '接続成功: {{name}}', name: chipName })
      });

      return {
        name: chipName,
        mac: macAddr,
        features: features
      };
    } catch (error) {
      console.error('[USB] Connection error:', error);
      onProgress({
        stage: 'error',
        percent: 0,
        message: i18n.t('firmware.status.connectError', { defaultValue: '接続エラー: {{message}}', message: (error as Error).message })
      });
      return null;
    }
  }

  /**
   * FullPackageをUSB経由で書き込み
   *
   * 教訓に基づく実装:
   * - 4ファイル書き込み（bootloader, partitions, bootApp0, firmware）
   * - eraseFlash()を使わない（NVS保護）
   * - アドレスマップ:
   *   - bootloader: 0x1000
   *   - partitions: 0x8000
   *   - bootApp0: 0xe000
   *   - firmware: 0x10000
   */
  async writeFullPackage(
    fullPackage: FullPackage,
    onProgress: (progress: UsbFlashProgress) => void
  ): Promise<boolean> {
    if (!this.loader) {
      onProgress({
        stage: 'error',
        percent: 0,
        message: i18n.t('firmware.status.connectFirst', { defaultValue: '先に接続してください' })
      });
      return false;
    }

    try {
      onProgress({
        stage: 'preparing',
        percent: 5,
        message: i18n.t('firmware.status.preparingFirmware', { defaultValue: 'ファームウェアを準備中...' })
      });

      // 各BlobをArrayBufferに変換してbinaryStringに
      const bootloaderData = await this.blobToBinaryString(fullPackage.bootloader);
      const partitionsData = await this.blobToBinaryString(fullPackage.partitions);
      const bootApp0Data = await this.blobToBinaryString(fullPackage.bootApp0);
      const firmwareData = await this.blobToBinaryString(fullPackage.firmware);

      onProgress({
        stage: 'preparing',
        percent: 20,
        message: i18n.t('firmware.status.firmwareReady', { defaultValue: 'ファームウェア準備完了' })
      });

      // 教訓: eraseFlash()を使わない（NVS保護）
      // 4ファイルのアドレスだけに書き込むことでNVS領域を保護

      onProgress({
        stage: 'flashing',
        percent: 25,
        message: i18n.t('firmware.status.writeStart', { defaultValue: '書き込み開始...' })
      });

      // 4ファイル全部書き込み（ESP32の正しいアドレスマップ）
      await this.loader.writeFlash({
        fileArray: [
          { data: bootloaderData, address: 0x1000 },   // Bootloader
          { data: partitionsData, address: 0x8000 },   // Partition table
          { data: bootApp0Data, address: 0xe000 },     // Boot app0
          { data: firmwareData, address: 0x10000 }     // Application firmware
        ],
        flashSize: 'keep',
        flashMode: 'keep',
        flashFreq: 'keep',
        eraseAll: false,  // NVS保護: 全消去しない
        compress: true,
        reportProgress: (fileIndex: number, written: number, total: number) => {
          const filePercent = 25 + (written / total) * 65;  // 25% - 90%
          const fileNames = ['bootloader', 'partitions', 'boot_app0', 'firmware'];
          const fileName = fileNames[fileIndex] || 'file';
          onProgress({
            stage: 'flashing',
            file: fileName,
            percent: filePercent,
            message: i18n.t('firmware.status.writingFile', { defaultValue: '{{file}} を書き込み中... {{percent}}%', file: fileName, percent: Math.floor((written / total) * 100) })
          });
        }
      });

      onProgress({
        stage: 'verifying',
        percent: 92,
        message: i18n.t('firmware.status.resetEsp32', { defaultValue: 'ESP32をリセット中...' })
      });

      // Hard reset
      await this.loader.after('hard_reset');

      onProgress({
        stage: 'complete',
        percent: 100,
        message: i18n.t('firmware.status.writeSuccessUsb', { defaultValue: '✅ USB書き込みが完了しました！' })
      });

      return true;
    } catch (error) {
      console.error('[USB] Write error:', error);
      onProgress({
        stage: 'error',
        percent: 0,
        message: i18n.t('firmware.status.writeError', { defaultValue: '書き込みエラー: {{message}}', message: (error as Error).message })
      });
      return false;
    }
  }

  /**
   * BlobをbinaryStringに変換
   */
  private async blobToBinaryString(blob: Blob): Promise<string> {
    const arrayBuffer = await blob.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    return Array.from(uint8Array)
      .map(byte => String.fromCharCode(byte))
      .join('');
  }

  /**
   * 切断
   * 注意: ESPLoaderにはdisconnect()メソッドがない。Transportのdisconnect()のみ使用
   */
  async disconnect(): Promise<void> {
    // ESPLoaderはnullにするだけ（disconnect()メソッドなし）
    this.loader = null;

    if (this.transport) {
      try {
        await this.transport.disconnect();
      } catch (error) {
        console.error('[USB] Transport disconnect error:', error);
      }
      this.transport = null;
    }
    this.port = null;
  }

  /**
   * すべてのシリアルポートを強制的に解放
   */
  async releaseAllPorts(): Promise<void> {
    try {
      if (!('serial' in navigator)) {
        return;
      }

      // 現在の接続をクローズ
      await this.disconnect();

      // すべての許可されたポートをクローズ
      const ports = await navigator.serial.getPorts();
      this.log(`Releasing ${ports.length} port(s)...`);

      for (const port of ports) {
        try {
          if (port.readable || port.writable) {
            await port.close();
          }
        } catch (error) {
          console.debug('[USB] Error closing port:', error);
        }
      }

      // ポート権限を忘れる（forget()メソッドが利用可能な場合）
      for (const port of ports) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          if ('forget' in port && typeof (port as any).forget === 'function') {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (port as any).forget();
          }
        } catch (error) {
          console.debug('[USB] forget() not supported or error:', error);
        }
      }

      this.log('All ports released');
    } catch (error) {
      console.error('[USB] Error releasing ports:', error);
      throw error;
    }
  }
}

export const usbFirmwareService = new UsbFirmwareService();
