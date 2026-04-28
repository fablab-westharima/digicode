import { describe, it, expect, vi } from 'vitest';
import { compileCpp, shouldRetry, type CompileResult } from './compile-client';
import type { CompileFragments } from './cpp-generator';

const FRAGMENTS: CompileFragments = {
  fullCode: 'void setup(){} void loop(){}',
  includes: '',
  globals: '',
  setupCode: '',
  loopCode: '',
};

const OPTS = {
  serverUrl: 'https://example.invalid',
  board: 'esp32:esp32:esp32',
};

describe('shouldRetry', () => {
  it('returns false for successful attempts', () => {
    expect(shouldRetry({ ok: true, durationMs: 100 })).toBe(false);
  });

  it('returns true for network/timeout errors (no status)', () => {
    const r: CompileResult = {
      ok: false,
      durationMs: 60000,
      error: 'timeout after 60000ms',
    };
    expect(shouldRetry(r)).toBe(true);
  });

  it('returns true for 5xx server errors', () => {
    expect(shouldRetry({ ok: false, durationMs: 100, status: 502, error: 'HTTP 502' })).toBe(true);
    expect(shouldRetry({ ok: false, durationMs: 100, status: 503, error: 'HTTP 503' })).toBe(true);
  });

  it('returns false for compile failures (HTTP 200 with success:false)', () => {
    expect(shouldRetry({ ok: false, durationMs: 100, status: 200, error: 'compile failed' })).toBe(false);
  });

  it('returns false for 4xx client errors (do not retry malformed requests)', () => {
    expect(shouldRetry({ ok: false, durationMs: 100, status: 400, error: 'HTTP 400' })).toBe(false);
  });
});

describe('compileCpp — fetch mocking', () => {
  it('returns ok when server returns success:true', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true, version: '1.0.0' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    ) as unknown as typeof fetch;
    const result = await compileCpp(FRAGMENTS, { ...OPTS, fetchImpl });
    expect(result.ok).toBe(true);
    expect(result.status).toBe(200);
    expect(result.retryUsed).toBeUndefined();
  });

  it('returns failure with stderr when server returns success:false', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          success: false,
          error: "'Wire' was not declared in this scope",
          stderr: 'long stderr…',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    ) as unknown as typeof fetch;
    const result = await compileCpp(FRAGMENTS, { ...OPTS, fetchImpl });
    expect(result.ok).toBe(false);
    expect(result.status).toBe(200);
    expect(result.error).toContain('Wire');
    expect(result.stderr).toContain('long stderr');
  });

  it('retries on 5xx and reports retryUsed=true', async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(new Response('Bad gateway', { status: 502 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ) as unknown as typeof fetch;
    const result = await compileCpp(FRAGMENTS, { ...OPTS, fetchImpl });
    expect(result.ok).toBe(true);
    expect(result.retryUsed).toBe(true);
  });

  it('does not retry on 4xx', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response('Bad request', { status: 400 }),
    ) as unknown as typeof fetch;
    const result = await compileCpp(FRAGMENTS, { ...OPTS, fetchImpl });
    expect(result.ok).toBe(false);
    expect(result.status).toBe(400);
    expect(result.retryUsed).toBeUndefined();
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('uses ?fullPackage=true for ESP32 boards', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    ) as unknown as typeof fetch;
    await compileCpp(FRAGMENTS, { ...OPTS, fetchImpl });
    const calledUrl = fetchImpl.mock.calls[0][0] as string;
    expect(calledUrl).toContain('?fullPackage=true');
  });

  it('omits ?fullPackage for non-ESP32 boards (e.g., RP2040)', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    ) as unknown as typeof fetch;
    await compileCpp(FRAGMENTS, { ...OPTS, fetchImpl, board: 'rp2040:rp2040:rpipico' });
    const calledUrl = fetchImpl.mock.calls[0][0] as string;
    expect(calledUrl).not.toContain('fullPackage');
  });

  it('marks timeout errors and retries them', async () => {
    let callCount = 0;
    const fetchImpl = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        const err = new Error('aborted');
        err.name = 'AbortError';
        return Promise.reject(err);
      }
      return Promise.resolve(
        new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    }) as unknown as typeof fetch;
    const result = await compileCpp(FRAGMENTS, { ...OPTS, fetchImpl });
    expect(result.ok).toBe(true);
    expect(result.retryUsed).toBe(true);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
});
