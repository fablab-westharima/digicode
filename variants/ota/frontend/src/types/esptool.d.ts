/**
 * Type definitions for esptool-js
 * esptool-js doesn't have official TypeScript types, so we define them here
 */

// Web Serial API types
interface SerialPort {
  readonly readable: ReadableStream<Uint8Array> | null;
  readonly writable: WritableStream<Uint8Array> | null;
  open(options: SerialOptions): Promise<void>;
  close(): Promise<void>;
  getInfo(): SerialPortInfo;
  getSignals(): Promise<SerialInputSignals>;
  setSignals(signals: SerialOutputSignals): Promise<void>;
  forget(): Promise<void>;
  addEventListener(type: string, listener: EventListenerOrEventListenerObject): void;
  removeEventListener(type: string, listener: EventListenerOrEventListenerObject): void;
}

interface SerialOptions {
  baudRate: number;
  dataBits?: 7 | 8;
  stopBits?: 1 | 2;
  parity?: 'none' | 'even' | 'odd';
  bufferSize?: number;
  flowControl?: 'none' | 'hardware';
}

interface SerialPortInfo {
  usbVendorId?: number;
  usbProductId?: number;
}

interface SerialInputSignals {
  dataCarrierDetect: boolean;
  clearToSend: boolean;
  ringIndicator: boolean;
  dataSetReady: boolean;
}

interface SerialOutputSignals {
  dataTerminalReady?: boolean;
  requestToSend?: boolean;
  break?: boolean;
}

declare module 'esptool-js' {
  export interface LoaderOptions {
    transport: Transport;
    baudrate?: number;
    terminal?: {
      clean?: () => void;
      writeLine?: (text: string) => void;
      write?: (text: string) => void;
    };
    debugLogging?: boolean;
    enableTracing?: boolean;
  }

  export interface ESPLoaderOptions {
    transport: Transport;
    baudrate?: number;
    terminal?: {
      clean?: () => void;
      writeLine?: (text: string) => void;
      write?: (text: string) => void;
    };
    debugLogging?: boolean;
    enableTracing?: boolean;
  }

  export interface FlashOptions {
    fileArray: Array<{
      data: string;
      address: number;
    }>;
    flashSize?: string | 'keep';
    flashMode?: string | 'keep';
    flashFreq?: string | 'keep';
    eraseAll?: boolean;
    compress?: boolean;
    reportProgress?: (fileIndex: number, written: number, total: number) => void;
    calculateMD5Hash?: (data: string) => string;
  }

  export class ROM {
    readMac(loader: ESPLoader): Promise<string>;
    getChipFeatures(loader: ESPLoader): Promise<string[]>;
  }

  export class ESPLoader {
    chip: ROM;

    constructor(options: ESPLoaderOptions);

    main(): Promise<string>;
    main_fn(): Promise<void>;
    detect_chip(): Promise<string>;
    detectChip(): Promise<string>;
    read_reg(addr: number): Promise<number>;
    readReg(addr: number): Promise<number>;
    write_reg(addr: number, value: number, mask?: number, delay_us?: number): Promise<void>;
    writeReg(addr: number, value: number, mask?: number, delay_us?: number): Promise<void>;
    sync(): Promise<void>;
    get_chip_description(): Promise<string>;
    getChipDescription(): Promise<string>;
    get_chip_features(): Promise<string[]>;
    getChipFeatures(): Promise<string[]>;
    get_crystal_freq(): Promise<number>;
    getCrystalFreq(): Promise<number>;
    read_mac(): Promise<string>;
    readMac(): Promise<string>;
    erase_flash(): Promise<void>;
    eraseFlash(): Promise<void>;
    flash_data(data: Uint8Array, offset: number, onProgress?: (loaded: number, total: number) => void): Promise<void>;
    flashData(data: Uint8Array, offset: number, onProgress?: (loaded: number, total: number) => void): Promise<void>;
    flash_id(): Promise<number>;
    flashId(): Promise<number>;
    write_flash(options: FlashOptions): Promise<void>;
    writeFlash(options: FlashOptions): Promise<void>;
    hard_reset(): Promise<void>;
    hardReset(): Promise<void>;
    soft_reset(): Promise<void>;
    softReset(): Promise<void>;
    after(mode?: 'hard_reset' | 'no_reset', usingUsbOtg?: boolean): Promise<void>;
    disconnect(): Promise<void>;
  }

  export class Transport {
    device: SerialPort;
    baudrate: number;
    tracing: boolean;
    leftOver: Uint8Array;

    constructor(device: SerialPort, tracing?: boolean);

    connect(baud?: number): Promise<void>;
    disconnect(): Promise<void>;
    read(timeout?: number, minData?: number): Promise<Uint8Array>;
    write(data: Uint8Array): Promise<void>;
    rawRead(timeout?: number): AsyncGenerator<Uint8Array>;
    rawRead(timeout?: number): Promise<Uint8Array>;
    setRTS(state: boolean): Promise<void>;
    setDTR(state: boolean): Promise<void>;
    returnTrace(): string;
  }
}
