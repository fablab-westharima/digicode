/**
 * compile-client.test.ts (commit #4、BUG-078 fix layer 3/3、第84回)
 *
 * orchestrator SSE client の WHATWG SSE spec compliant parser + chunk count
 * mismatch + Content-Type mismatch + stream early termination + stuck
 * detection + 524 explicit no-retry を網羅検証。
 *
 * 12 cases (既存 7 を SSE flow 対応 + new 5):
 *   既存: happy path / stderr fail / 5xx retry / 4xx no-retry / fullPackage
 *         query / non-fullPackage query / abort retry
 *   新規: 524 no-retry / chunk count mismatch / Content-Type mismatch /
 *         stream ended w/o complete / stuck detection
 *
 * mock 戦略 (Q-D 確定): `fetchImpl` injection (test seam)、`new Response(string,
 * { headers })` で SSE body 注入、自前 SSE parser 動作含めて検証。
 */

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

/** SSE event 配列を WHATWG spec format text に serialize。 */
function serializeSseEvents(
  events: Array<{ event: string; data: unknown; id?: string }>,
): string {
  return events
    .map((ev) => {
      const lines: string[] = [`event: ${ev.event}`];
      if (ev.id !== undefined) lines.push(`id: ${ev.id}`);
      lines.push(`data: ${JSON.stringify(ev.data)}`);
      return lines.join('\n') + '\n\n';
    })
    .join('');
}

/** SSE response (text/event-stream) を構築。 */
function sseResponse(
  events: Array<{ event: string; data: unknown; id?: string }>,
  opts: { status?: number; contentType?: string } = {},
): Response {
  const status = opts.status ?? 200;
  const contentType = opts.contentType ?? 'text/event-stream';
  return new Response(serializeSseEvents(events), {
    status,
    headers: { 'Content-Type': contentType },
  });
}

/** 標準的な happy-path SSE body (firmware 1 chunk + 4-file bundle + complete) */
const HAPPY_EVENTS = [
  { event: 'start', data: { ts: 1 } },
  { event: 'firmware-meta', data: { totalChunks: 1, totalBytes: 4 } },
  { event: 'firmware-chunk', id: '0', data: { seq: 0, total: 1, data: btoa('test') } },
  { event: 'bootloader', data: { data: btoa('boot') } },
  { event: 'partitions', data: { data: btoa('part') } },
  { event: 'boot_app0', data: { data: btoa('app0') } },
  {
    event: 'complete',
    data: { success: true, durationMs: 100, template: 'DigiCodeOTA', pioBoard: 'esp32dev' },
  },
];

describe('shouldRetry (commit #4 SSE 文脈再定義)', () => {
  it('returns false for successful attempts', () => {
    expect(shouldRetry({ ok: true, durationMs: 100 })).toBe(false);
  });

  it('returns true for network/timeout errors (no status)', () => {
    const r: CompileResult = {
      ok: false,
      durationMs: 60000,
      error: 'aborted',
    };
    expect(shouldRetry(r)).toBe(true);
  });

  it('returns true for 5xx server errors (excluding 524)', () => {
    expect(shouldRetry({ ok: false, durationMs: 100, status: 502, error: 'HTTP 502' })).toBe(true);
    expect(shouldRetry({ ok: false, durationMs: 100, status: 503, error: 'HTTP 503' })).toBe(true);
    expect(shouldRetry({ ok: false, durationMs: 100, status: 500, error: 'HTTP 500' })).toBe(true);
  });

  // 新規: 524 SSE で原理発生せず、保守上 dead branch (要請 4 確定、第84回)
  it('returns FALSE for HTTP 524 (SSE で原理発生せず、retry 削除)', () => {
    expect(shouldRetry({ ok: false, durationMs: 100, status: 524, error: 'HTTP 524' })).toBe(false);
  });

  it('returns false for compile failures (HTTP 200 with event:error)', () => {
    expect(shouldRetry({ ok: false, durationMs: 100, status: 200, error: 'compile failed' })).toBe(false);
  });

  it('returns false for 4xx client errors (do not retry malformed requests)', () => {
    expect(shouldRetry({ ok: false, durationMs: 100, status: 400, error: 'HTTP 400' })).toBe(false);
  });
});

describe('compileCpp — SSE event flow (既存 7 cases SSE 対応)', () => {
  it('returns ok when SSE complete event received (happy path、case 1)', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(sseResponse(HAPPY_EVENTS)) as unknown as typeof fetch;
    const result = await compileCpp(FRAGMENTS, { ...OPTS, fetchImpl });
    expect(result.ok).toBe(true);
    expect(result.status).toBe(200);
    expect(result.retryUsed).toBeUndefined();
  });

  it('returns failure with stderr when SSE event:error received (case 2)', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      sseResponse([
        { event: 'start', data: { ts: 1 } },
        {
          event: 'error',
          data: {
            error: "'Wire' was not declared in this scope",
            stderr: 'long stderr…',
          },
        },
      ]),
    ) as unknown as typeof fetch;
    const result = await compileCpp(FRAGMENTS, { ...OPTS, fetchImpl });
    expect(result.ok).toBe(false);
    expect(result.status).toBe(200);
    expect(result.error).toContain('Wire');
    expect(result.stderr).toContain('long stderr');
  });

  it('retries on 5xx initial response and reports retryUsed=true (case 3)', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(new Response('Bad gateway', { status: 502 }))
      .mockResolvedValueOnce(sseResponse(HAPPY_EVENTS)) as unknown as typeof fetch;
    const result = await compileCpp(FRAGMENTS, { ...OPTS, fetchImpl });
    expect(result.ok).toBe(true);
    expect(result.retryUsed).toBe(true);
  });

  it('does not retry on 4xx initial response (case 4)', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response('Bad request', { status: 400 }),
    ) as unknown as typeof fetch;
    const result = await compileCpp(FRAGMENTS, { ...OPTS, fetchImpl });
    expect(result.ok).toBe(false);
    expect(result.status).toBe(400);
    expect(result.retryUsed).toBeUndefined();
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('uses ?fullPackage=true for ESP32 boards (case 5)', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(sseResponse(HAPPY_EVENTS)) as unknown as typeof fetch;
    await compileCpp(FRAGMENTS, { ...OPTS, fetchImpl });
    const calledUrl = fetchImpl.mock.calls[0][0] as string;
    expect(calledUrl).toContain('/api/compile/sse');
    expect(calledUrl).toContain('?fullPackage=true');
  });

  it('omits ?fullPackage for non-ESP32 boards (case 6、avr fqbn)', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(sseResponse(HAPPY_EVENTS)) as unknown as typeof fetch;
    await compileCpp(FRAGMENTS, { ...OPTS, fetchImpl, board: 'arduino:avr:uno' });
    const calledUrl = fetchImpl.mock.calls[0][0] as string;
    expect(calledUrl).toContain('/api/compile/sse');
    expect(calledUrl).not.toContain('fullPackage');
  });

  it('marks abort errors (network) and retries them (case 7)', async () => {
    let callCount = 0;
    const fetchImpl = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        const err = new Error('aborted');
        err.name = 'AbortError';
        return Promise.reject(err);
      }
      return Promise.resolve(sseResponse(HAPPY_EVENTS));
    }) as unknown as typeof fetch;
    const result = await compileCpp(FRAGMENTS, { ...OPTS, fetchImpl });
    expect(result.ok).toBe(true);
    expect(result.retryUsed).toBe(true);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
});

describe('compileCpp — SSE defensive coding (新規 5 cases)', () => {
  it('returns failure on chunk count mismatch (補足 2、case 8)', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      sseResponse([
        { event: 'start', data: { ts: 1 } },
        { event: 'firmware-meta', data: { totalChunks: 3, totalBytes: 6 } },
        { event: 'firmware-chunk', id: '0', data: { seq: 0, total: 3, data: btoa('aa') } },
        { event: 'firmware-chunk', id: '1', data: { seq: 1, total: 3, data: btoa('bb') } },
        // seq=2 missing!
        { event: 'complete', data: { success: true, durationMs: 100, template: 'X' } },
      ]),
    ) as unknown as typeof fetch;
    const result = await compileCpp(FRAGMENTS, { ...OPTS, fetchImpl });
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/chunk.*mismatch.*2.*3/i);
  });

  it('returns failure on Content-Type mismatch (case 9)', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response('{"foo":"bar"}', {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    ) as unknown as typeof fetch;
    const result = await compileCpp(FRAGMENTS, { ...OPTS, fetchImpl });
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/content-type.*application\/json/i);
    expect(fetchImpl).toHaveBeenCalledTimes(1); // no retry on Content-Type mismatch (200 + non-event-stream)
  });

  it('returns failure when SSE stream ends without complete event (補足 3、case 10)', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      sseResponse([
        { event: 'start', data: { ts: 1 } },
        { event: 'firmware-meta', data: { totalChunks: 1, totalBytes: 4 } },
        { event: 'firmware-chunk', id: '0', data: { seq: 0, total: 1, data: btoa('test') } },
        // stream close without complete or error
      ]),
    ) as unknown as typeof fetch;
    const result = await compileCpp(FRAGMENTS, { ...OPTS, fetchImpl });
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/stream.*ended|complete event/i);
  });

  it('aborts on stuck (no event for stuckMs、case 11)', async () => {
    // 各 fetch call で fresh Response を返却 (retry 時に body locked 回避)。
    // ReadableStream は start event 即時 emit 後、close せず enqueue もしない =
    // parser が次 read で block → stuckMs 後に AbortError fire 期待。
    const fetchImpl = vi.fn().mockImplementation(
      () =>
        Promise.resolve(
          new Response(
            new ReadableStream<Uint8Array>({
              start(controller) {
                controller.enqueue(
                  new TextEncoder().encode('event: start\ndata: {"ts":1}\n\n'),
                );
                // never close — stuck timer should fire after stuckMs
              },
            }),
            { status: 200, headers: { 'Content-Type': 'text/event-stream' } },
          ),
        ),
    ) as unknown as typeof fetch;
    const result = await compileCpp(FRAGMENTS, {
      ...OPTS,
      fetchImpl,
      stuckMs: 50, // short threshold for test
    });
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/stuck/i);
    // stuck = AbortError (no status) → shouldRetry true → retry once
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(result.retryUsed).toBe(true);
  }, 5000);

  it('appends &no-cache=true when noCache option set on ESP32 (amendment 9, case 13)', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(sseResponse(HAPPY_EVENTS)) as unknown as typeof fetch;
    await compileCpp(FRAGMENTS, { ...OPTS, fetchImpl, noCache: true });
    const calledUrl = fetchImpl.mock.calls[0][0] as string;
    expect(calledUrl).toContain('?fullPackage=true');
    expect(calledUrl).toContain('&no-cache=true');
  });

  it('propagates CompileResult.cached from SSE complete event data (amendment 9, case 14)', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      sseResponse([
        { event: 'start', data: { ts: 1 } },
        { event: 'firmware-meta', data: { totalChunks: 1, totalBytes: 4 } },
        { event: 'firmware-chunk', id: '0', data: { seq: 0, total: 1, data: btoa('test') } },
        // server reports cache HIT
        { event: 'complete', data: { success: true, durationMs: 50, template: 'X', cached: true } },
      ]),
    ) as unknown as typeof fetch;
    const result = await compileCpp(FRAGMENTS, { ...OPTS, fetchImpl });
    expect(result.ok).toBe(true);
    expect(result.cached).toBe(true);
  });

  it('handles SSE comment line (`:` heartbeat) without crashing (case 12)', async () => {
    // Custom SSE body with heartbeat (`:\n\n`) interleaved between events.
    // Verifies parser correctly ignores comment lines per WHATWG spec.
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(
        [
          'event: start\ndata: {"ts":1}\n\n',
          ':\n\n', // heartbeat 1
          'event: firmware-meta\ndata: {"totalChunks":1,"totalBytes":4}\n\n',
          ':\n\n', // heartbeat 2
          'event: firmware-chunk\nid: 0\ndata: {"seq":0,"total":1,"data":"dGVzdA=="}\n\n',
          'event: complete\ndata: {"success":true,"durationMs":100,"template":"X"}\n\n',
        ].join(''),
        { status: 200, headers: { 'Content-Type': 'text/event-stream' } },
      ),
    ) as unknown as typeof fetch;
    const result = await compileCpp(FRAGMENTS, { ...OPTS, fetchImpl });
    expect(result.ok).toBe(true);
    expect(result.status).toBe(200);
  });
});
