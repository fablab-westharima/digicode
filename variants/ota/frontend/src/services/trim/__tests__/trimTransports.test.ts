/**
 * trim transport 抽象化 test (Phase D-1、Session 148)
 *
 * cover:
 *   - HttpTrimTransport: GET/POST shape verbatim (現 trimService.ts と互換)
 *   - SerialTrimTransport: SET_TRIM/SET_TRIMS/GET_TRIMS/SAVE_TRIMS/TEST_TRIM line command
 *   - BleTrimTransport: 同 line protocol (BLE NUS 経由)
 *   - TrimTransportFactory: WiFi → USB → BLE priority + null fallback
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HttpTrimTransport } from '../HttpTrimTransport';
import { SerialTrimTransport } from '../SerialTrimTransport';
import { BleTrimTransport } from '../BleTrimTransport';
import { createTrimTransport } from '../TrimTransportFactory';
import { serialService } from '@/services/serialService';
import { bluetoothService } from '@/services/bluetoothService';
import { useWifiStore } from '@/stores/wifiStore';

// ============================================================
// HttpTrimTransport
// ============================================================

describe('HttpTrimTransport', () => {
  const URL = 'http://device.local';
  let fetchMock: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ count: 4, trims: [0, 0, 0, 0] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );
  });

  afterEach(() => {
    fetchMock.mockRestore();
  });

  it('kind === "http"', () => {
    expect(new HttpTrimTransport(URL).kind).toBe('http');
  });

  it('getTrims: GET /trim を呼び TrimData を返す', async () => {
    const t = new HttpTrimTransport(URL);
    const data = await t.getTrims();
    expect(data).toEqual({ count: 4, trims: [0, 0, 0, 0] });
    expect(fetchMock).toHaveBeenCalledWith(`${URL}/trim`, { method: 'GET' });
  });

  it('setTrim: POST /trim with {index, value}', async () => {
    fetchMock.mockResolvedValueOnce(new Response('', { status: 200 }));
    const t = new HttpTrimTransport(URL);
    await t.setTrim(2, 5);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${URL}/trim`);
    expect(init?.method).toBe('POST');
    expect(JSON.parse(init?.body as string)).toEqual({ index: 2, value: 5 });
  });

  it('setTrims: POST /trim with {trims: [...]}', async () => {
    fetchMock.mockResolvedValueOnce(new Response('', { status: 200 }));
    const t = new HttpTrimTransport(URL);
    await t.setTrims([1, 2, 3, 4]);
    const [, init] = fetchMock.mock.calls[0];
    expect(JSON.parse(init?.body as string)).toEqual({ trims: [1, 2, 3, 4] });
  });

  it('saveTrims: POST /trim/save', async () => {
    fetchMock.mockResolvedValueOnce(new Response('', { status: 200 }));
    const t = new HttpTrimTransport(URL);
    await t.saveTrims();
    expect(fetchMock).toHaveBeenCalledWith(`${URL}/trim/save`, { method: 'POST' });
  });

  it('testServo: POST /trim/test with action + optional index', async () => {
    fetchMock.mockResolvedValue(new Response('', { status: 200 }));
    const t = new HttpTrimTransport(URL);
    await t.testServo('sweep', 1);
    expect(JSON.parse(fetchMock.mock.calls[0][1]?.body as string)).toEqual({
      action: 'sweep',
      index: 1,
    });
    await t.testServo('home');
    expect(JSON.parse(fetchMock.mock.calls[1][1]?.body as string)).toEqual({
      action: 'home',
    });
  });

  it('non-2xx は Error を throw', async () => {
    fetchMock.mockResolvedValueOnce(new Response('', { status: 500 }));
    const t = new HttpTrimTransport(URL);
    await expect(t.setTrim(0, 0)).rejects.toThrow('Failed to set trim');
  });
});

// ============================================================
// SerialTrimTransport
// ============================================================

describe('SerialTrimTransport', () => {
  it('kind === "serial"', () => {
    expect(new SerialTrimTransport({ writeLine: async () => true }).kind).toBe('serial');
  });

  it('setTrim: writeLine("SET_TRIM:index,value")', async () => {
    const writeLine = vi.fn().mockResolvedValue(true);
    await new SerialTrimTransport({ writeLine }).setTrim(2, 5);
    expect(writeLine).toHaveBeenCalledWith('SET_TRIM:2,5');
  });

  it('setTrims: writeLine("SET_TRIMS:csv")', async () => {
    const writeLine = vi.fn().mockResolvedValue(true);
    await new SerialTrimTransport({ writeLine }).setTrims([1, -2, 3, 0]);
    expect(writeLine).toHaveBeenCalledWith('SET_TRIMS:1,-2,3,0');
  });

  it('saveTrims: writeLine("SAVE_TRIMS")', async () => {
    const writeLine = vi.fn().mockResolvedValue(true);
    await new SerialTrimTransport({ writeLine }).saveTrims();
    expect(writeLine).toHaveBeenCalledWith('SAVE_TRIMS');
  });

  it('testServo: writeLine("TEST_TRIM:action[,index]")', async () => {
    const writeLine = vi.fn().mockResolvedValue(true);
    const s = new SerialTrimTransport({ writeLine });
    await s.testServo('sweep', 1);
    await s.testServo('home');
    expect(writeLine).toHaveBeenNthCalledWith(1, 'TEST_TRIM:sweep,1');
    expect(writeLine).toHaveBeenNthCalledWith(2, 'TEST_TRIM:home');
  });

  it('getTrims: best-effort = empty TrimData + GET_TRIMS 送信', async () => {
    const writeLine = vi.fn().mockResolvedValue(true);
    const data = await new SerialTrimTransport({ writeLine }).getTrims();
    expect(data).toEqual({ count: 0, trims: [] });
    expect(writeLine).toHaveBeenCalledWith('GET_TRIMS');
  });

  it('writeLine false で throw', async () => {
    const writeLine = vi.fn().mockResolvedValue(false);
    await expect(new SerialTrimTransport({ writeLine }).setTrim(0, 0)).rejects.toThrow(
      'Failed to send SET_TRIM via serial'
    );
  });
});

// ============================================================
// BleTrimTransport
// ============================================================

describe('BleTrimTransport', () => {
  it('kind === "ble"', () => {
    expect(new BleTrimTransport({ writeLine: async () => true }).kind).toBe('ble');
  });

  it('setTrim/setTrims/saveTrims/testServo/getTrims: same command set as Serial', async () => {
    const writeLine = vi.fn().mockResolvedValue(true);
    const b = new BleTrimTransport({ writeLine });
    await b.setTrim(1, 10);
    await b.setTrims([0, 0]);
    await b.saveTrims();
    await b.testServo('walk');
    await b.getTrims();
    expect(writeLine.mock.calls.map((c) => c[0])).toEqual([
      'SET_TRIM:1,10',
      'SET_TRIMS:0,0',
      'SAVE_TRIMS',
      'TEST_TRIM:walk',
      'GET_TRIMS',
    ]);
  });

  it('writeLine false で throw', async () => {
    const writeLine = vi.fn().mockResolvedValue(false);
    await expect(new BleTrimTransport({ writeLine }).saveTrims()).rejects.toThrow(
      'Failed to send SAVE_TRIMS via BLE'
    );
  });
});

// ============================================================
// TrimTransportFactory — priority: WiFi → USB → BLE
// ============================================================

describe('TrimTransportFactory', () => {
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

  it('全 transport disconnected → null', () => {
    expect(createTrimTransport()).toBeNull();
  });

  it('WiFi connected → HttpTrimTransport', () => {
    useWifiStore.setState({ status: 'connected', host: 'esp32.local' });
    const t = createTrimTransport();
    expect(t?.kind).toBe('http');
  });

  it('WiFi disconnected + USB connected → SerialTrimTransport', () => {
    Object.defineProperty(serialService, 'isConnected', {
      configurable: true,
      get: () => true,
    });
    const t = createTrimTransport();
    expect(t?.kind).toBe('serial');
  });

  it('WiFi/USB disconnected + BLE connected → BleTrimTransport', () => {
    Object.defineProperty(bluetoothService, 'isConnected', {
      configurable: true,
      get: () => true,
    });
    const t = createTrimTransport();
    expect(t?.kind).toBe('ble');
  });

  it('WiFi + USB 両方 connected → WiFi 優先 (HTTP)', () => {
    useWifiStore.setState({ status: 'connected', host: 'esp32.local' });
    Object.defineProperty(serialService, 'isConnected', {
      configurable: true,
      get: () => true,
    });
    expect(createTrimTransport()?.kind).toBe('http');
  });
});
