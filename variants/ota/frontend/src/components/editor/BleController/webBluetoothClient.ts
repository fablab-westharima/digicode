/**
 * WebBLE Controller — navigator.bluetooth wrapper (47.md commit #2, Phase 1)
 *
 * Thin abstraction over the Web Bluetooth GATT API for the controller UI.
 * Concerns:
 *  - Single device connect / disconnect lifecycle (Phase 1 = one device)
 *  - GATT service / characteristic resolution + caching
 *  - Generic write / read / notify-subscribe
 *  - NUS UART helpers (built on top of generic ops with fixed UUIDs)
 *  - Wire format = ASCII string (47.md §8.2): senders pass strings/numbers/
 *    booleans, the client encodes via TextEncoder; receivers get strings
 *    decoded via TextDecoder. This matches the existing firmware contract
 *    (bleMessage = String(c->getValue().c_str())).
 *
 * Constructor accepts an optional `bluetooth` parameter so tests can inject
 * a mock. Production code uses the default (navigator.bluetooth).
 *
 * Web Bluetooth limitations to surface to user (handled by component layer):
 *  - HTTPS required (DigiCode satisfies this; localhost dev works too)
 *  - Chrome / Edge / Opera supported; Firefox / Safari / iOS NOT
 *  - Pairing dialog is browser-controlled (no UI customization possible)
 *  - One device per client (multi-device deferred to Phase 3+)
 */

const NUS_SERVICE_UUID = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
const NUS_RX_UUID = '6e400002-b5a3-f393-e0a9-e50e24dcca9e';
const NUS_TX_UUID = '6e400003-b5a3-f393-e0a9-e50e24dcca9e';

export const NUS_UUIDS = {
  SERVICE: NUS_SERVICE_UUID,
  RX: NUS_RX_UUID,
  TX: NUS_TX_UUID,
} as const;

/** Default name prefix used by all DigiCode firmware (ble_uart_setup / ble_init). */
export const DEFAULT_NAME_PREFIX = 'DigiCode';

export type ConnectionState = 'idle' | 'connecting' | 'connected' | 'disconnected';

export interface ConnectOptions {
  /** Custom GATT service UUIDs the controller will access (besides NUS). */
  customServiceUuids?: string[];
  /** Override the device name prefix filter (default = "DigiCode"). */
  namePrefix?: string;
}

export interface WebBluetoothClientOptions {
  /** Inject a mock Bluetooth implementation. Defaults to navigator.bluetooth. */
  bluetooth?: Bluetooth;
}

export class WebBluetoothNotSupportedError extends Error {
  constructor() {
    super('Web Bluetooth is not supported in this browser');
    this.name = 'WebBluetoothNotSupportedError';
  }
}

export class WebBluetoothNotConnectedError extends Error {
  constructor() {
    super('No BLE device is currently connected');
    this.name = 'WebBluetoothNotConnectedError';
  }
}

type Listener<T> = (event: T) => void;

export interface ConnectedEvent {
  type: 'connected';
  deviceName: string;
}
export interface DisconnectedEvent {
  type: 'disconnected';
}
type ClientEvent = ConnectedEvent | DisconnectedEvent;
type ClientEventType = ClientEvent['type'];

/**
 * Type-safe lookup of payload by event-name literal so subscribers see the
 * correct event payload shape per channel.
 */
type EventByType<T extends ClientEventType> = Extract<ClientEvent, { type: T }>;

export class WebBluetoothClient {
  private bluetooth: Bluetooth | null;
  private device: BluetoothDevice | null = null;
  private server: BluetoothRemoteGATTServer | null = null;
  private characteristics = new Map<string, BluetoothRemoteGATTCharacteristic>();
  private subscriptions = new Map<string, Set<Listener<Uint8Array>>>();
  private listeners = new Map<ClientEventType, Set<Listener<ClientEvent>>>();
  private state: ConnectionState = 'idle';
  private encoder = new TextEncoder();
  private decoder = new TextDecoder();
  private boundHandleDisconnected = this.handleDisconnected.bind(this);

  constructor(options: WebBluetoothClientOptions = {}) {
    this.bluetooth = options.bluetooth ?? (typeof navigator !== 'undefined' ? navigator.bluetooth ?? null : null);
  }

  /** Returns true if this browser exposes navigator.bluetooth. */
  static isSupported(): boolean {
    return typeof navigator !== 'undefined' && 'bluetooth' in navigator && !!navigator.bluetooth;
  }

  isConnected(): boolean {
    return this.state === 'connected';
  }

  getState(): ConnectionState {
    return this.state;
  }

  getDeviceName(): string | null {
    return this.device?.name ?? null;
  }

  /**
   * Show the browser's BLE chooser, then connect to the selected device's GATT
   * server. Throws WebBluetoothNotSupportedError on unsupported browsers and
   * propagates the user's cancellation as a NotFoundError (per spec).
   */
  async connect(options: ConnectOptions = {}): Promise<void> {
    if (!this.bluetooth) {
      throw new WebBluetoothNotSupportedError();
    }
    if (this.state === 'connecting') return;
    this.state = 'connecting';
    try {
      const namePrefix = options.namePrefix ?? DEFAULT_NAME_PREFIX;
      const optionalServices = [NUS_SERVICE_UUID, ...(options.customServiceUuids ?? [])];
      const device = await this.bluetooth.requestDevice({
        filters: [{ namePrefix }],
        optionalServices,
      });
      const gatt = device.gatt;
      if (!gatt) {
        throw new Error('Selected device has no GATT server');
      }
      device.addEventListener('gattserverdisconnected', this.boundHandleDisconnected);
      const server = await gatt.connect();

      this.device = device;
      this.server = server;
      this.characteristics.clear();
      this.subscriptions.clear();
      this.state = 'connected';
      this.emit({ type: 'connected', deviceName: device.name ?? 'Unknown' });
    } catch (err) {
      this.state = 'idle';
      throw err;
    }
  }

  async disconnect(): Promise<void> {
    if (this.device) {
      this.device.removeEventListener('gattserverdisconnected', this.boundHandleDisconnected);
    }
    if (this.server?.connected) {
      this.server.disconnect();
    }
    this.handleDisconnected();
  }

  // ─────────── generic GATT operations ───────────

  async writeCharacteristic(serviceUuid: string, charUuid: string, value: Uint8Array): Promise<void> {
    const characteristic = await this.resolveCharacteristic(serviceUuid, charUuid);
    // writeValueWithoutResponse is faster but not always available; fall back to with-response.
    if (typeof characteristic.writeValueWithResponse === 'function') {
      await characteristic.writeValueWithResponse(value);
    } else {
      await characteristic.writeValue(value);
    }
  }

  async readCharacteristic(serviceUuid: string, charUuid: string): Promise<Uint8Array> {
    const characteristic = await this.resolveCharacteristic(serviceUuid, charUuid);
    const dataView = await characteristic.readValue();
    return new Uint8Array(dataView.buffer, dataView.byteOffset, dataView.byteLength);
  }

  /**
   * Subscribe to GATT notifications for a characteristic. Returns an
   * unsubscribe function that removes the listener and (when the listener
   * was the last one) stops notifications on the device.
   */
  async subscribeNotify(
    serviceUuid: string,
    charUuid: string,
    callback: (value: Uint8Array) => void
  ): Promise<() => void> {
    const characteristic = await this.resolveCharacteristic(serviceUuid, charUuid);
    const key = lower(charUuid);

    let listeners = this.subscriptions.get(key);
    if (!listeners) {
      listeners = new Set();
      this.subscriptions.set(key, listeners);
      const dispatcher = (event: Event): void => {
        const target = event.target as BluetoothRemoteGATTCharacteristic;
        const dv = target.value;
        if (!dv) return;
        const bytes = new Uint8Array(dv.buffer, dv.byteOffset, dv.byteLength);
        const set = this.subscriptions.get(key);
        if (!set) return;
        for (const fn of set) fn(bytes);
      };
      characteristic.addEventListener('characteristicvaluechanged', dispatcher);
      await characteristic.startNotifications();
    }
    listeners.add(callback);

    return () => {
      const set = this.subscriptions.get(key);
      if (!set) return;
      set.delete(callback);
      if (set.size === 0) {
        this.subscriptions.delete(key);
        // Best-effort stopNotifications; ignore errors on disconnected device.
        characteristic.stopNotifications().catch(() => {
          /* ignore */
        });
      }
    };
  }

  // ─────────── NUS UART helpers ───────────

  async sendNusText(text: string): Promise<void> {
    await this.writeCharacteristic(NUS_SERVICE_UUID, NUS_RX_UUID, this.encoder.encode(text));
  }

  async subscribeNusReceive(callback: (text: string) => void): Promise<() => void> {
    return this.subscribeNotify(NUS_SERVICE_UUID, NUS_TX_UUID, (bytes) => {
      callback(this.decoder.decode(bytes));
    });
  }

  // ─────────── ASCII wire format helpers ───────────

  encodeAscii(value: string | number | boolean): Uint8Array {
    if (typeof value === 'boolean') return this.encoder.encode(value ? '1' : '0');
    if (typeof value === 'number') return this.encoder.encode(String(value));
    return this.encoder.encode(value);
  }

  decodeAscii(bytes: Uint8Array): string {
    return this.decoder.decode(bytes);
  }

  // ─────────── event emitter ───────────

  on<T extends ClientEventType>(eventType: T, listener: Listener<EventByType<T>>): () => void {
    let set = this.listeners.get(eventType);
    if (!set) {
      set = new Set();
      this.listeners.set(eventType, set);
    }
    set.add(listener as Listener<ClientEvent>);
    return () => {
      const s = this.listeners.get(eventType);
      s?.delete(listener as Listener<ClientEvent>);
    };
  }

  // ─────────── internals ───────────

  private async resolveCharacteristic(
    serviceUuid: string,
    charUuid: string
  ): Promise<BluetoothRemoteGATTCharacteristic> {
    if (!this.server || !this.server.connected) {
      throw new WebBluetoothNotConnectedError();
    }
    const key = lower(charUuid);
    const cached = this.characteristics.get(key);
    if (cached) return cached;
    const service = await this.server.getPrimaryService(serviceUuid);
    const characteristic = await service.getCharacteristic(charUuid);
    this.characteristics.set(key, characteristic);
    return characteristic;
  }

  private handleDisconnected(): void {
    this.device = null;
    this.server = null;
    this.characteristics.clear();
    this.subscriptions.clear();
    if (this.state !== 'idle') {
      this.state = 'disconnected';
      this.emit({ type: 'disconnected' });
    }
  }

  private emit(event: ClientEvent): void {
    const set = this.listeners.get(event.type);
    if (!set) return;
    for (const fn of set) fn(event);
  }
}

function lower(uuid: string): string {
  return uuid.toLowerCase();
}
