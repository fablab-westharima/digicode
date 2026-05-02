/**
 * WebBluetoothClient tests (47.md commit #2, Phase 1)
 *
 * Uses a hand-rolled mock that mirrors the surface of BluetoothDevice /
 * BluetoothRemoteGATTServer / Service / Characteristic. Each test wires a
 * fresh mock so cross-test state cannot leak.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  WebBluetoothClient,
  WebBluetoothNotSupportedError,
  WebBluetoothNotConnectedError,
  NUS_UUIDS,
} from '../webBluetoothClient';

// ─────────── mock harness ───────────

class MockCharacteristic {
  uuid: string;
  value: DataView | null = null;
  writeValueWithResponse = vi.fn(async (data: BufferSource) => {
    this.value = toDataView(data);
  });
  writeValue = vi.fn(async (data: BufferSource) => {
    this.value = toDataView(data);
  });
  readValue = vi.fn(async () => {
    return this.value ?? new DataView(new ArrayBuffer(0));
  });
  startNotifications = vi.fn(async () => this);
  stopNotifications = vi.fn(async () => this);
  private listeners = new Set<(event: Event) => void>();
  addEventListener(type: string, fn: (event: Event) => void): void {
    if (type === 'characteristicvaluechanged') this.listeners.add(fn);
  }
  removeEventListener(type: string, fn: (event: Event) => void): void {
    if (type === 'characteristicvaluechanged') this.listeners.delete(fn);
  }
  /** Test helper: simulate firmware notify. */
  emitNotification(payload: string): void {
    this.value = toDataView(new TextEncoder().encode(payload));
    for (const fn of this.listeners) fn({ target: this } as unknown as Event);
  }
  constructor(uuid: string) {
    this.uuid = uuid.toLowerCase();
  }
}

class MockService {
  uuid: string;
  characteristics = new Map<string, MockCharacteristic>();
  constructor(uuid: string, characteristicUuids: string[]) {
    this.uuid = uuid.toLowerCase();
    for (const cu of characteristicUuids) {
      this.characteristics.set(cu.toLowerCase(), new MockCharacteristic(cu));
    }
  }
  async getCharacteristic(uuid: string): Promise<MockCharacteristic> {
    const c = this.characteristics.get(uuid.toLowerCase());
    if (!c) throw new Error(`Characteristic ${uuid} not found`);
    return c;
  }
}

class MockGATTServer {
  connected = false;
  services = new Map<string, MockService>();
  device: MockDevice;
  constructor(device: MockDevice) {
    this.device = device;
  }
  async connect(): Promise<MockGATTServer> {
    this.connected = true;
    return this;
  }
  disconnect(): void {
    this.connected = false;
    this.device.dispatchDisconnect();
  }
  async getPrimaryService(uuid: string): Promise<MockService> {
    const s = this.services.get(uuid.toLowerCase());
    if (!s) throw new Error(`Service ${uuid} not found`);
    return s;
  }
}

class MockDevice {
  name: string;
  gatt: MockGATTServer;
  private listeners = new Set<() => void>();
  constructor(name: string) {
    this.name = name;
    this.gatt = new MockGATTServer(this);
  }
  addEventListener(type: string, fn: () => void): void {
    if (type === 'gattserverdisconnected') this.listeners.add(fn);
  }
  removeEventListener(type: string, fn: () => void): void {
    if (type === 'gattserverdisconnected') this.listeners.delete(fn);
  }
  dispatchDisconnect(): void {
    for (const fn of this.listeners) fn();
  }
}

class MockBluetooth {
  requestDevice = vi.fn(async (_opts: unknown): Promise<MockDevice> => {
    return this.nextDevice;
  });
  nextDevice!: MockDevice;
}

function toDataView(data: BufferSource): DataView {
  if (data instanceof ArrayBuffer) return new DataView(data);
  if (ArrayBuffer.isView(data)) return new DataView(data.buffer, data.byteOffset, data.byteLength);
  return new DataView(new ArrayBuffer(0));
}

function makeClient() {
  const bluetooth = new MockBluetooth();
  const device = new MockDevice('DigiCode-A1B2');
  // Pre-register NUS service + custom service for tests
  device.gatt.services.set(
    NUS_UUIDS.SERVICE.toLowerCase(),
    new MockService(NUS_UUIDS.SERVICE, [NUS_UUIDS.RX, NUS_UUIDS.TX])
  );
  const customSvcUuid = '11112222-3333-4444-5555-666677778888';
  const customCharUuid = '00001111-aaaa-bbbb-cccc-ddddeeeeff01';
  device.gatt.services.set(
    customSvcUuid.toLowerCase(),
    new MockService(customSvcUuid, [customCharUuid])
  );
  bluetooth.nextDevice = device;
  const client = new WebBluetoothClient({ bluetooth: bluetooth as unknown as Bluetooth });
  return { client, bluetooth, device, customSvcUuid, customCharUuid };
}

// ─────────── tests ───────────

describe('WebBluetoothClient — feature detection', () => {
  it('isSupported returns false when navigator.bluetooth is missing', () => {
    // jsdom does not provide navigator.bluetooth, so this is naturally false.
    expect(WebBluetoothClient.isSupported()).toBe(false);
  });

  it('connect throws WebBluetoothNotSupportedError when no Bluetooth available', async () => {
    const client = new WebBluetoothClient({ bluetooth: undefined as unknown as Bluetooth });
    await expect(client.connect()).rejects.toBeInstanceOf(WebBluetoothNotSupportedError);
  });
});

describe('WebBluetoothClient — connect / disconnect lifecycle', () => {
  it('transitions idle → connecting → connected and emits connected event', async () => {
    const { client, device } = makeClient();
    expect(client.getState()).toBe('idle');
    expect(client.isConnected()).toBe(false);

    const connected = vi.fn();
    client.on('connected', connected);

    await client.connect();
    expect(client.isConnected()).toBe(true);
    expect(client.getState()).toBe('connected');
    expect(client.getDeviceName()).toBe('DigiCode-A1B2');
    expect(connected).toHaveBeenCalledWith({ type: 'connected', deviceName: 'DigiCode-A1B2' });
    expect(device.gatt.connected).toBe(true);
  });

  it('passes namePrefix and customServiceUuids to requestDevice', async () => {
    const { client, bluetooth } = makeClient();
    await client.connect({
      namePrefix: 'MyDev',
      customServiceUuids: ['11112222-3333-4444-5555-666677778888'],
    });
    const opts = bluetooth.requestDevice.mock.calls[0][0] as {
      filters: { namePrefix: string }[];
      optionalServices: string[];
    };
    expect(opts.filters[0].namePrefix).toBe('MyDev');
    expect(opts.optionalServices).toContain(NUS_UUIDS.SERVICE);
    expect(opts.optionalServices).toContain('11112222-3333-4444-5555-666677778888');
  });

  it('disconnect clears state and emits disconnected event', async () => {
    const { client } = makeClient();
    await client.connect();
    const disconnected = vi.fn();
    client.on('disconnected', disconnected);
    await client.disconnect();
    expect(client.isConnected()).toBe(false);
    expect(client.getState()).toBe('disconnected');
    expect(disconnected).toHaveBeenCalledWith({ type: 'disconnected' });
  });

  it('detects involuntary disconnection (gattserverdisconnected event)', async () => {
    const { client, device } = makeClient();
    await client.connect();
    const disconnected = vi.fn();
    client.on('disconnected', disconnected);
    device.dispatchDisconnect();
    expect(client.isConnected()).toBe(false);
    expect(disconnected).toHaveBeenCalled();
  });
});

describe('WebBluetoothClient — generic GATT operations', () => {
  it('writeCharacteristic uses writeValueWithResponse and stores value', async () => {
    const { client, customSvcUuid, customCharUuid, device } = makeClient();
    await client.connect();
    await client.writeCharacteristic(customSvcUuid, customCharUuid, new TextEncoder().encode('hello'));
    const char = device.gatt.services.get(customSvcUuid.toLowerCase())!.characteristics.get(
      customCharUuid.toLowerCase()
    )!;
    expect(char.writeValueWithResponse).toHaveBeenCalledTimes(1);
  });

  it('readCharacteristic returns the underlying bytes', async () => {
    const { client, customSvcUuid, customCharUuid, device } = makeClient();
    await client.connect();
    const char = device.gatt.services.get(customSvcUuid.toLowerCase())!.characteristics.get(
      customCharUuid.toLowerCase()
    )!;
    char.value = new DataView(new TextEncoder().encode('123').buffer);
    const result = await client.readCharacteristic(customSvcUuid, customCharUuid);
    expect(new TextDecoder().decode(result)).toBe('123');
  });

  it('throws WebBluetoothNotConnectedError when used before connect', async () => {
    const { client, customSvcUuid, customCharUuid } = makeClient();
    await expect(
      client.readCharacteristic(customSvcUuid, customCharUuid)
    ).rejects.toBeInstanceOf(WebBluetoothNotConnectedError);
  });

  it('caches characteristics after first resolution', async () => {
    const { client, customSvcUuid, customCharUuid, device } = makeClient();
    await client.connect();
    const svc = device.gatt.services.get(customSvcUuid.toLowerCase())!;
    const getCharSpy = vi.spyOn(svc, 'getCharacteristic');
    await client.writeCharacteristic(customSvcUuid, customCharUuid, new Uint8Array([1]));
    await client.writeCharacteristic(customSvcUuid, customCharUuid, new Uint8Array([2]));
    expect(getCharSpy).toHaveBeenCalledTimes(1);
  });
});

describe('WebBluetoothClient — notify subscription', () => {
  it('subscribeNotify forwards notifications to all listeners', async () => {
    const { client, device } = makeClient();
    await client.connect();
    const txChar = device.gatt.services
      .get(NUS_UUIDS.SERVICE.toLowerCase())!
      .characteristics.get(NUS_UUIDS.TX.toLowerCase())!;

    const listener1 = vi.fn();
    const listener2 = vi.fn();
    await client.subscribeNotify(NUS_UUIDS.SERVICE, NUS_UUIDS.TX, listener1);
    await client.subscribeNotify(NUS_UUIDS.SERVICE, NUS_UUIDS.TX, listener2);

    txChar.emitNotification('hello');
    expect(listener1).toHaveBeenCalledTimes(1);
    expect(listener2).toHaveBeenCalledTimes(1);
    expect(new TextDecoder().decode(listener1.mock.calls[0][0])).toBe('hello');
  });

  it('unsubscribe removes listener and stops notifications when empty', async () => {
    const { client, device } = makeClient();
    await client.connect();
    const txChar = device.gatt.services
      .get(NUS_UUIDS.SERVICE.toLowerCase())!
      .characteristics.get(NUS_UUIDS.TX.toLowerCase())!;

    const listener = vi.fn();
    const unsubscribe = await client.subscribeNotify(NUS_UUIDS.SERVICE, NUS_UUIDS.TX, listener);
    expect(txChar.startNotifications).toHaveBeenCalledTimes(1);
    unsubscribe();
    expect(txChar.stopNotifications).toHaveBeenCalledTimes(1);

    txChar.emitNotification('after-unsub');
    expect(listener).not.toHaveBeenCalled();
  });
});

describe('WebBluetoothClient — NUS UART helpers', () => {
  it('sendNusText writes UTF-8 to NUS RX', async () => {
    const { client, device } = makeClient();
    await client.connect();
    await client.sendNusText('hello');
    const rxChar = device.gatt.services
      .get(NUS_UUIDS.SERVICE.toLowerCase())!
      .characteristics.get(NUS_UUIDS.RX.toLowerCase())!;
    expect(rxChar.writeValueWithResponse).toHaveBeenCalledTimes(1);
    const arg = rxChar.writeValueWithResponse.mock.calls[0][0] as Uint8Array;
    expect(new TextDecoder().decode(arg)).toBe('hello');
  });

  it('subscribeNusReceive decodes notifications as text', async () => {
    const { client, device } = makeClient();
    await client.connect();
    const txChar = device.gatt.services
      .get(NUS_UUIDS.SERVICE.toLowerCase())!
      .characteristics.get(NUS_UUIDS.TX.toLowerCase())!;
    const received = vi.fn();
    await client.subscribeNusReceive(received);
    txChar.emitNotification('temp: 25.3°C');
    expect(received).toHaveBeenCalledWith('temp: 25.3°C');
  });
});

describe('WebBluetoothClient — wire format helpers', () => {
  let client: WebBluetoothClient;
  beforeEach(() => {
    client = new WebBluetoothClient({ bluetooth: undefined as unknown as Bluetooth });
  });

  it('encodeAscii encodes booleans as "0" / "1"', () => {
    expect(new TextDecoder().decode(client.encodeAscii(true))).toBe('1');
    expect(new TextDecoder().decode(client.encodeAscii(false))).toBe('0');
  });

  it('encodeAscii encodes numbers as base-10 strings', () => {
    expect(new TextDecoder().decode(client.encodeAscii(42))).toBe('42');
    expect(new TextDecoder().decode(client.encodeAscii(-3.14))).toBe('-3.14');
  });

  it('encodeAscii passes strings through', () => {
    expect(new TextDecoder().decode(client.encodeAscii('hello'))).toBe('hello');
  });

  it('decodeAscii decodes UTF-8 bytes', () => {
    const bytes = new TextEncoder().encode('°C');
    expect(client.decodeAscii(bytes)).toBe('°C');
  });
});
