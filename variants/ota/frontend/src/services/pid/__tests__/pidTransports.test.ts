/**
 * PID transport 抽象化 test (Phase D-2、Session 148、D-new-6 (B))
 *
 * cover:
 *   - HttpPidTransport: POST /pid {name, kp, ki, kd} shape
 *   - SerialPidTransport: SET_PID:name,kp,ki,kd line command
 *   - BlePidTransport: 同 line protocol (NUS 経由)
 *   - PidTransportFactory: WiFi → USB → BLE priority + null fallback
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HttpPidTransport } from '../HttpPidTransport';
import { SerialPidTransport } from '../SerialPidTransport';
import { BlePidTransport } from '../BlePidTransport';
import { createPidTransport } from '../PidTransportFactory';
import { serialService } from '@/services/serialService';
import { bluetoothService } from '@/services/bluetoothService';
import { useWifiStore } from '@/stores/wifiStore';

// ============================================================
// HttpPidTransport
// ============================================================

describe('HttpPidTransport', () => {
  const URL = 'http://device.local';
  let fetchMock: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('', { status: 200 }));
  });

  afterEach(() => {
    fetchMock.mockRestore();
  });

  it('kind === "http"', () => {
    expect(new HttpPidTransport(URL).kind).toBe('http');
  });

  it('setPid: POST /pid with {name, kp, ki, kd}', async () => {
    await new HttpPidTransport(URL).setPid('default', 0.2, 0.0001, 5);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${URL}/pid`);
    expect(init?.method).toBe('POST');
    expect(JSON.parse(init?.body as string)).toEqual({
      name: 'default',
      kp: 0.2,
      ki: 0.0001,
      kd: 5,
    });
  });

  it('non-2xx で throw', async () => {
    fetchMock.mockResolvedValueOnce(new Response('', { status: 500 }));
    await expect(new HttpPidTransport(URL).setPid('default', 0, 0, 0)).rejects.toThrow(
      'Failed to set PID'
    );
  });
});

// ============================================================
// SerialPidTransport
// ============================================================

describe('SerialPidTransport', () => {
  it('kind === "serial"', () => {
    expect(new SerialPidTransport({ writeLine: async () => true }).kind).toBe('serial');
  });

  it('setPid: writeLine("SET_PID:name,kp,ki,kd")', async () => {
    const writeLine = vi.fn().mockResolvedValue(true);
    await new SerialPidTransport({ writeLine }).setPid('main', 1.0, 0.01, 15);
    expect(writeLine).toHaveBeenCalledWith('SET_PID:main,1,0.01,15');
  });

  it('writeLine false で throw', async () => {
    const writeLine = vi.fn().mockResolvedValue(false);
    await expect(new SerialPidTransport({ writeLine }).setPid('x', 0, 0, 0)).rejects.toThrow(
      'Failed to send SET_PID via serial'
    );
  });
});

// ============================================================
// BlePidTransport
// ============================================================

describe('BlePidTransport', () => {
  it('kind === "ble"', () => {
    expect(new BlePidTransport({ writeLine: async () => true }).kind).toBe('ble');
  });

  it('setPid: writeLine("SET_PID:name,kp,ki,kd") via BLE', async () => {
    const writeLine = vi.fn().mockResolvedValue(true);
    await new BlePidTransport({ writeLine }).setPid('default', 0.5, 0.001, 10);
    expect(writeLine).toHaveBeenCalledWith('SET_PID:default,0.5,0.001,10');
  });

  it('writeLine false で throw', async () => {
    const writeLine = vi.fn().mockResolvedValue(false);
    await expect(new BlePidTransport({ writeLine }).setPid('x', 0, 0, 0)).rejects.toThrow(
      'Failed to send SET_PID via BLE'
    );
  });
});

// ============================================================
// PidTransportFactory — priority WiFi → USB → BLE
// ============================================================

describe('PidTransportFactory', () => {
  beforeEach(() => {
    useWifiStore.setState({ status: 'disconnected', host: '' });
    Object.defineProperty(serialService, 'isConnected', {
      configurable: true,
      get: () => false,
    });
    Object.defineProperty(bluetoothService, 'isConnected', {
      configurable: true,
      get: () => false,
    });
  });

  it('全 disconnect → null', () => {
    expect(createPidTransport()).toBeNull();
  });

  it('WiFi connected → HttpPidTransport', () => {
    useWifiStore.setState({ status: 'connected', host: 'esp32.local' });
    expect(createPidTransport()?.kind).toBe('http');
  });

  it('USB only → SerialPidTransport', () => {
    Object.defineProperty(serialService, 'isConnected', {
      configurable: true,
      get: () => true,
    });
    expect(createPidTransport()?.kind).toBe('serial');
  });

  it('BLE only → BlePidTransport', () => {
    Object.defineProperty(bluetoothService, 'isConnected', {
      configurable: true,
      get: () => true,
    });
    expect(createPidTransport()?.kind).toBe('ble');
  });
});
