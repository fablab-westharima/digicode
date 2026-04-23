import i18n from '@/i18n';

/**
 * BLE書き込み専用サービス
 *
 * 教訓（Rule 13, 22）に基づく設計:
 * - firmwareService.ts / usbFirmwareService.tsとは完全独立
 * - requestDevice()はユーザージェスチャーコンテキスト内で呼び出す（Rule 22）
 * - h2zero/NimBLEOtaプロトコル準拠
 */

// UUID定義（h2zero/NimBLEOta準拠）
const OTA_SERVICE_UUID = 0x8018;
const RECV_FW_CHAR_UUID = 0x8020;    // ファームウェア受信 + ACK通知
const COMMAND_CHAR_UUID = 0x8022;    // コマンド送信 + 応答通知

// NimBLEOtaプロトコル定数
const START_COMMAND = 0x0001;
const ACK_ACCEPTED = 0x0000;
const FW_ACK_SUCCESS = 0x0000;
const FW_ACK_CRC_ERROR = 0x0001;
const FW_ACK_SECTOR_ERROR = 0x0002;
const FW_ACK_LEN_ERROR = 0x0003;
const RSP_CRC_ERROR = 0xFFFF;

// セクターサイズ（4KB）
const SECTOR_SIZE = 4096;

export type BleFlashStage = 'connecting' | 'preparing' | 'flashing' | 'verifying' | 'complete' | 'error';

export type BleFlashProgress = {
  stage: BleFlashStage;
  percent: number;
  message: string;
};

export type BleDeviceInfo = {
  name: string;
  id: string;
};

/**
 * CRC16-CCITT計算（NimBLEOta準拠）
 */
function crc16Ccitt(buf: Uint8Array): number {
  let crc16 = 0;
  for (let i = 0; i < buf.length; i++) {
    crc16 ^= buf[i] << 8;
    for (let j = 0; j < 8; j++) {
      if (crc16 & 0x8000) {
        crc16 = (crc16 << 1) ^ 0x1021;
      } else {
        crc16 = crc16 << 1;
      }
      crc16 &= 0xFFFF;
    }
  }
  return crc16;
}

class BleFirmwareService {
  private device: BluetoothDevice | null = null;
  private server: BluetoothRemoteGATTServer | null = null;
  private recvFwChar: BluetoothRemoteGATTCharacteristic | null = null;
  private commandChar: BluetoothRemoteGATTCharacteristic | null = null;
  private logCallback: ((message: string) => void) | null = null;

  // 通知キュー
  private commandQueue: Array<{ resolve: (value: number) => void }> = [];
  private firmwareQueue: Array<{ resolve: (value: { status: number; sector: number }) => void }> = [];

  /**
   * Web Bluetooth APIサポート確認
   */
  get isSupported(): boolean {
    return 'bluetooth' in navigator;
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
    console.log('[BLE]', message);
  }

  /**
   * コマンド通知ハンドラー
   */
  private handleCommandNotification = (event: Event) => {
    const char = event.target as BluetoothRemoteGATTCharacteristic;
    const value = char.value;
    if (!value || value.byteLength !== 20) return;

    const data = new Uint8Array(value.buffer);
    const ack = data[0] | (data[1] << 8);
    const cmd = data[2] | (data[3] << 8);
    const rsp = data[4] | (data[5] << 8);
    const crc = data[18] | (data[19] << 8);

    // CRC検証
    const calcCrc = crc16Ccitt(data.slice(0, 18));
    const finalRsp = calcCrc !== crc ? RSP_CRC_ERROR : rsp;

    this.log(`Command notification: ack=${ack}, cmd=${cmd}, rsp=${rsp}, crc_ok=${calcCrc === crc}`);

    // キューに結果を返す
    const pending = this.commandQueue.shift();
    if (pending) {
      pending.resolve(finalRsp);
    }
  };

  /**
   * ファームウェア通知ハンドラー
   */
  private handleFirmwareNotification = (event: Event) => {
    const char = event.target as BluetoothRemoteGATTCharacteristic;
    const value = char.value;
    if (!value || value.byteLength !== 20) return;

    const data = new Uint8Array(value.buffer);
    const sectorSent = data[0] | (data[1] << 8);
    const status = data[2] | (data[3] << 8);
    const curSector = data[4] | (data[5] << 8);
    const crc = data[18] | (data[19] << 8);

    // CRC検証
    const calcCrc = crc16Ccitt(data.slice(0, 18));
    const finalStatus = calcCrc !== crc ? RSP_CRC_ERROR : status;

    this.log(`Firmware notification: sector=${sectorSent}, status=${status}, curSector=${curSector}, crc_ok=${calcCrc === crc}`);

    // キューに結果を返す
    const pending = this.firmwareQueue.shift();
    if (pending) {
      pending.resolve({ status: finalStatus, sector: curSector });
    }
  };

  /**
   * コマンドレスポンスを待つ
   */
  private waitForCommandResponse(timeout = 10000): Promise<number> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        const idx = this.commandQueue.findIndex(p => p.resolve === resolve);
        if (idx >= 0) this.commandQueue.splice(idx, 1);
        reject(new Error('Command response timeout'));
      }, timeout);

      this.commandQueue.push({
        resolve: (value) => {
          clearTimeout(timer);
          resolve(value);
        }
      });
    });
  }

  /**
   * ファームウェアACKを待つ
   */
  private waitForFirmwareAck(timeout = 30000): Promise<{ status: number; sector: number }> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        const idx = this.firmwareQueue.findIndex(p => p.resolve === resolve);
        if (idx >= 0) this.firmwareQueue.splice(idx, 1);
        reject(new Error('Firmware ACK timeout'));
      }, timeout);

      this.firmwareQueue.push({
        resolve: (value) => {
          clearTimeout(timer);
          resolve(value);
        }
      });
    });
  }

  /**
   * BLEデバイスに接続
   * ユーザージェスチャーコンテキスト内で呼び出す（Rule 22）
   */
  async connect(
    onProgress: (progress: BleFlashProgress) => void
  ): Promise<BleDeviceInfo | null> {
    if (!this.isSupported) {
      onProgress({
        stage: 'error',
        percent: 0,
        message: i18n.t('firmware.status.webBluetoothUnsupported', { defaultValue: 'Web Bluetooth APIはこのブラウザでサポートされていません。Chrome または Edge を使用してください。' })
      });
      return null;
    }

    try {
      onProgress({
        stage: 'connecting',
        percent: 0,
        message: i18n.t('firmware.status.searchingBle', { defaultValue: 'BLEデバイスを検索中...' })
      });

      // デバイス選択（ユーザージェスチャー内で実行必須）
      this.device = await navigator.bluetooth.requestDevice({
        filters: [{ namePrefix: 'DigiCode-' }],
        optionalServices: [OTA_SERVICE_UUID]
      });

      this.log(`Device selected: ${this.device.name}`);

      onProgress({
        stage: 'connecting',
        percent: 20,
        message: i18n.t('firmware.status.connectingDevice', { defaultValue: 'デバイスに接続中...' })
      });

      // GATT接続
      this.server = await this.device.gatt!.connect();
      this.log('GATT connected');

      onProgress({
        stage: 'connecting',
        percent: 40,
        message: i18n.t('firmware.status.fetchOtaService', { defaultValue: 'OTAサービスを取得中...' })
      });

      // OTAサービス取得
      const service = await this.server.getPrimaryService(OTA_SERVICE_UUID);
      this.log('OTA Service acquired');

      onProgress({
        stage: 'connecting',
        percent: 50,
        message: i18n.t('firmware.status.fetchCharacteristics', { defaultValue: 'Characteristicsを取得中...' })
      });

      // Characteristics取得
      this.recvFwChar = await service.getCharacteristic(RECV_FW_CHAR_UUID);
      this.commandChar = await service.getCharacteristic(COMMAND_CHAR_UUID);

      this.log('Characteristics acquired (RECV_FW + COMMAND)');

      onProgress({
        stage: 'connecting',
        percent: 60,
        message: i18n.t('firmware.status.connectedTo', { defaultValue: '接続成功: {{name}}', name: this.device.name })
      });

      return {
        name: this.device.name || 'Unknown',
        id: this.device.id
      };
    } catch (error) {
      console.error('[BLE] Connection error:', error);
      onProgress({
        stage: 'error',
        percent: 0,
        message: i18n.t('firmware.status.connectError', { defaultValue: '接続エラー: {{message}}', message: (error as Error).message })
      });
      return null;
    }
  }

  /**
   * セクターをアップロード
   * NimBLEOtaプロトコル: 各チャンクは [セクターインデックス(2byte)] + [シーケンス(1byte)] + [データ]
   */
  private async uploadSector(sector: Uint8Array, sectorIndex: number): Promise<void> {
    // MTUサイズ（安全のため200バイトに制限）
    const maxBytes = 200 - 3; // 3バイトのヘッダー分を引く
    const chunks: Uint8Array[] = [];

    for (let i = 0; i < sector.length; i += maxBytes) {
      chunks.push(sector.slice(i, i + maxBytes));
    }

    for (let seq = 0; seq < chunks.length; seq++) {
      const chunk = chunks[seq];
      const isLast = seq === chunks.length - 1;
      const sequence = isLast ? 0xFF : seq;

      // パケット作成: [sectorIndex(2)] + [sequence(1)] + [data]
      const packet = new Uint8Array(3 + chunk.length);
      packet[0] = sectorIndex & 0xFF;
      packet[1] = (sectorIndex >> 8) & 0xFF;
      packet[2] = sequence;
      packet.set(chunk, 3);

      await this.recvFwChar!.writeValueWithoutResponse(packet);

      // BLEバッファを空けるため少し待つ
      await new Promise(resolve => setTimeout(resolve, 5));
    }
  }

  /**
   * ファームウェアをBLE経由で書き込み
   * NimBLEOtaプロトコル準拠
   */
  async writeOta(
    firmwareBlob: Blob,
    onProgress: (progress: BleFlashProgress) => void
  ): Promise<boolean> {
    if (!this.device || !this.server || !this.recvFwChar || !this.commandChar) {
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

      // ファームウェアをArrayBufferに変換
      const firmwareArrayBuffer = await firmwareBlob.arrayBuffer();
      const firmwareData = new Uint8Array(firmwareArrayBuffer);
      const firmwareSize = firmwareData.length;

      this.log(`Firmware size: ${firmwareSize} bytes`);

      // セクター分割（4KBごと + CRC16）
      const sectors: Uint8Array[] = [];
      for (let i = 0; i < firmwareSize; i += SECTOR_SIZE) {
        const sectorData = firmwareData.slice(i, i + SECTOR_SIZE);
        const crc = crc16Ccitt(sectorData);

        // セクター + CRC16
        const sectorWithCrc = new Uint8Array(sectorData.length + 2);
        sectorWithCrc.set(sectorData);
        sectorWithCrc[sectorData.length] = crc & 0xFF;
        sectorWithCrc[sectorData.length + 1] = (crc >> 8) & 0xFF;
        sectors.push(sectorWithCrc);
      }

      this.log(`Split into ${sectors.length} sectors`);

      onProgress({
        stage: 'preparing',
        percent: 10,
        message: i18n.t('firmware.status.firmwareInfo', { defaultValue: 'ファームウェア: {{sizeKb}} KB ({{sectors}}セクター)', sizeKb: (firmwareSize / 1024).toFixed(1), sectors: sectors.length })
      });

      // 通知を設定
      await this.commandChar.startNotifications();
      this.commandChar.addEventListener('characteristicvaluechanged', this.handleCommandNotification);

      onProgress({
        stage: 'preparing',
        percent: 12,
        message: i18n.t('firmware.status.sendingOtaStart', { defaultValue: 'OTA開始コマンド送信中...' })
      });

      // STARTコマンド送信（20バイト）
      const startCommand = new Uint8Array(20);
      startCommand[0] = START_COMMAND & 0xFF;
      startCommand[1] = (START_COMMAND >> 8) & 0xFF;
      startCommand[2] = firmwareSize & 0xFF;
      startCommand[3] = (firmwareSize >> 8) & 0xFF;
      startCommand[4] = (firmwareSize >> 16) & 0xFF;
      startCommand[5] = (firmwareSize >> 24) & 0xFF;
      // bytes 6-17: zeros (padding)
      const startCrc = crc16Ccitt(startCommand.slice(0, 18));
      startCommand[18] = startCrc & 0xFF;
      startCommand[19] = (startCrc >> 8) & 0xFF;

      this.log(`Sending START command with size=${firmwareSize}`);

      // STARTコマンド送信とACK待ち（リトライあり）
      let startAck = RSP_CRC_ERROR;
      for (let retry = 0; retry < 3 && startAck === RSP_CRC_ERROR; retry++) {
        await this.commandChar.writeValueWithoutResponse(startCommand);
        try {
          startAck = await this.waitForCommandResponse(5000);
        } catch {
          this.log(`START command retry ${retry + 1}`);
        }
      }

      if (startAck !== ACK_ACCEPTED) {
        throw new Error(`START command rejected: ${startAck}`);
      }

      this.log('START command accepted');

      // ファームウェア通知を設定
      await this.recvFwChar.startNotifications();
      this.recvFwChar.addEventListener('characteristicvaluechanged', this.handleFirmwareNotification);

      onProgress({
        stage: 'flashing',
        percent: 15,
        message: i18n.t('firmware.status.writeStart', { defaultValue: '書き込み開始...' })
      });

      // セクター送信
      let sectorIndex = 0;
      const totalSectors = sectors.length;

      while (sectorIndex < totalSectors) {
        const sector = sectors[sectorIndex];
        const isLastSector = sectorIndex === totalSectors - 1;

        // 最後のセクターは0xFFFFで送信
        const sendIndex = isLastSector ? 0xFFFF : sectorIndex;

        this.log(`Sending sector ${sectorIndex}/${totalSectors - 1} (index=${sendIndex}, size=${sector.length})`);

        await this.uploadSector(sector, sendIndex);

        // ACK待ち
        const { status, sector: rspSector } = await this.waitForFirmwareAck();

        if (status === FW_ACK_SUCCESS) {
          const percent = 15 + Math.floor((sectorIndex / (totalSectors - 1)) * 80);
          onProgress({
            stage: 'flashing',
            percent,
            message: i18n.t('firmware.status.writingSectors', { defaultValue: '書き込み中... {{current}}/{{total}} セクター', current: sectorIndex + 1, total: totalSectors })
          });

          if (isLastSector) {
            this.log('Last sector ACK received - OTA complete');
            break;
          }
          sectorIndex++;
        } else if (status === FW_ACK_CRC_ERROR || status === FW_ACK_LEN_ERROR || status === RSP_CRC_ERROR) {
          this.log(`Sector ${sectorIndex} error (${status}), retrying...`);
          // リトライ（sectorIndexは変更しない）
        } else if (status === FW_ACK_SECTOR_ERROR) {
          this.log(`Sector error, jumping to sector ${rspSector}`);
          sectorIndex = rspSector;
        } else {
          throw new Error(`Unknown ACK status: ${status}`);
        }
      }

      // 通知停止
      this.commandChar.removeEventListener('characteristicvaluechanged', this.handleCommandNotification);
      this.recvFwChar.removeEventListener('characteristicvaluechanged', this.handleFirmwareNotification);
      await this.commandChar.stopNotifications();
      await this.recvFwChar.stopNotifications();

      onProgress({
        stage: 'complete',
        percent: 100,
        message: i18n.t('firmware.status.writeSuccessBle', { defaultValue: 'BLE書き込みが完了しました！' })
      });

      this.log('BLE OTA write completed successfully');

      // 切断（デバイスは自動再起動する）
      await this.disconnect();

      return true;
    } catch (error) {
      console.error('[BLE] Write error:', error);
      onProgress({
        stage: 'error',
        percent: 0,
        message: i18n.t('firmware.status.writeError', { defaultValue: '書き込みエラー: {{message}}', message: (error as Error).message })
      });

      // クリーンアップ
      try {
        if (this.commandChar) {
          this.commandChar.removeEventListener('characteristicvaluechanged', this.handleCommandNotification);
        }
        if (this.recvFwChar) {
          this.recvFwChar.removeEventListener('characteristicvaluechanged', this.handleFirmwareNotification);
        }
      } catch {
        // ignore cleanup errors
      }

      return false;
    }
  }

  /**
   * 切断
   */
  async disconnect(): Promise<void> {
    if (this.server) {
      try {
        this.server.disconnect();
        this.log('GATT disconnected');
      } catch (error) {
        console.error('[BLE] Disconnect error:', error);
      }
    }

    this.device = null;
    this.server = null;
    this.recvFwChar = null;
    this.commandChar = null;
    this.commandQueue = [];
    this.firmwareQueue = [];
  }

  /**
   * デバイスの切断イベントを監視
   */
  onDisconnected(callback: () => void) {
    if (this.device) {
      this.device.addEventListener('gattserverdisconnected', () => {
        this.log('Device disconnected');
        callback();
      });
    }
  }
}

export const bleFirmwareService = new BleFirmwareService();
