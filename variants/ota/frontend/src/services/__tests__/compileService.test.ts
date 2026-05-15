/**
 * compileService.ts テスト (commit #3、BUG-078 fix layer 2/3、57.md §2.3、第84回)
 *
 * テスト戦略 (Q-D 確定):
 * - `@microsoft/fetch-event-source` lib 自体はモックしない (SSE parser 動作を含めて検証)
 * - `globalThis.fetch` を `vi.spyOn` で mock、controllable Response (text/event-stream
 *   body) を返却することで onopen / onmessage / onerror の全 path を検証
 * - chunk reassembly + Blob 構築 + i18n localized error の defensive coding 全件カバー
 *
 * 8 cases (補足 1-3 + Pattern B 警戒):
 * 1. happy path (fullPackage、firmware chunk × 2 + bootloader/partitions/boot_app0 + complete)
 * 2. error event mid-stream (start → error)
 * 3. chunk count mismatch (補足 2、meta=3 だが chunk=2)
 * 4. chunk index missing (補足 2、seq=0+seq=2、seq=1 欠番)
 * 5. HTTP 4xx initial response (onopen で FatalSseError throw)
 * 6. Content-Type mismatch (onopen で FatalSseError throw)
 * 7. stream ended without complete event (補足 3 順序遵守、stream close 後 completeData=null)
 * 8. binary mode (non-fullPackage、bootloader/partitions/boot_app0 不在)
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { __testing__ } from '../compileService';

const {
  compileViaSse,
  base64ToUint8Array,
  checkLocalVersion,
  extractRemoteShaFromTagsResponse,
  REMOTE_CACHE_KEY,
} = __testing__;

/** SSE event 配列を WHATWG SSE spec format の text に serialize */
function serializeSseEvents(
  events: Array<{ event: string; data: unknown; id?: string }>,
): string {
  return events
    .map((ev) => {
      const lines: string[] = [];
      lines.push(`event: ${ev.event}`);
      if (ev.id !== undefined) lines.push(`id: ${ev.id}`);
      lines.push(`data: ${JSON.stringify(ev.data)}`);
      return lines.join('\n') + '\n\n';
    })
    .join('');
}

/** controllable Response を返す mock fetch を install。返却前 status / Content-Type 制御可。 */
function mockFetchWithSseEvents(
  events: Array<{ event: string; data: unknown; id?: string }>,
  options: { status?: number; contentType?: string } = {},
): void {
  const status = options.status ?? 200;
  const contentType = options.contentType ?? 'text/event-stream';
  const body = serializeSseEvents(events);
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(status === 200 ? body : '', {
      status,
      headers: { 'Content-Type': contentType },
    }),
  );
}

beforeEach(() => {
  // i18n init は test setup で省略、t() は defaultValue にフォールバックさせる
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('base64ToUint8Array', () => {
  it('decodes ASCII base64 to byte-equivalent Uint8Array', () => {
    const result = base64ToUint8Array(btoa('hello'));
    expect(result.length).toBe(5);
    expect(Array.from(result)).toEqual([104, 101, 108, 108, 111]); // 'hello'
  });
});

describe('compileViaSse — happy path', () => {
  it('case 1: returns CompileResult with fullPackage when all events received in order', async () => {
    mockFetchWithSseEvents([
      { event: 'start', data: { ts: 1777945810404 } },
      { event: 'firmware-meta', data: { totalChunks: 2, totalBytes: 11 } },
      { event: 'firmware-chunk', id: '0', data: { seq: 0, total: 2, data: btoa('hello ') } },
      { event: 'firmware-chunk', id: '1', data: { seq: 1, total: 2, data: btoa('world') } },
      { event: 'bootloader', data: { data: btoa('boot') } },
      { event: 'partitions', data: { data: btoa('part') } },
      { event: 'boot_app0', data: { data: btoa('app0') } },
      {
        event: 'complete',
        data: {
          success: true,
          durationMs: 1234,
          template: 'DigiCodeOTA',
          pioBoard: 'esp32dev',
          cached: false,
        },
      },
    ]);

    const result = await compileViaSse(
      'http://localhost:3099/api/compile/sse',
      '{"board":"esp32:esp32:esp32"}',
    );

    expect(result.success).toBe(true);
    expect(result.fullPackage).toBeDefined();
    expect(result.fullPackage?.firmware.size).toBe(11); // 'hello world' = 6 + 5 bytes
    expect(result.fullPackage?.bootloader.size).toBe(4);
    expect(result.fullPackage?.partitions.size).toBe(4);
    expect(result.fullPackage?.bootApp0.size).toBe(4);
    expect(result.template).toBe('DigiCodeOTA');
    expect(result.version).toBe('DigiCodeOTA');
    expect(result.binary).toBeUndefined(); // fullPackage path で binary は undefined
  });

  it('case 8: returns CompileResult with binary (no fullPackage) when bootloader/partitions/boot_app0 absent', async () => {
    mockFetchWithSseEvents([
      { event: 'start', data: { ts: 1 } },
      { event: 'firmware-meta', data: { totalChunks: 1, totalBytes: 4 } },
      { event: 'firmware-chunk', id: '0', data: { seq: 0, total: 1, data: btoa('test') } },
      { event: 'complete', data: { success: true, durationMs: 100, template: 'BasicArduino' } },
    ]);

    const result = await compileViaSse('http://test/api/compile/sse', '{}');

    expect(result.success).toBe(true);
    expect(result.fullPackage).toBeUndefined();
    expect(result.binary).toBeDefined();
    expect(result.binary?.size).toBe(4); // 'test'
    expect(result.template).toBe('BasicArduino');
  });
});

describe('compileViaSse — error path', () => {
  it('case 2: returns failure when stream emits event:error', async () => {
    mockFetchWithSseEvents([
      { event: 'start', data: { ts: 1 } },
      {
        event: 'error',
        data: {
          error: 'template not found: /opt/digicode-compile/templates/DigiCodeOTA.ino',
          details: 'caused by: ENOENT',
          stderr: 'fs.statSync: no such file',
        },
      },
    ]);

    const result = await compileViaSse('http://test/api/compile/sse', '{}');

    expect(result.success).toBe(false);
    expect(result.error).toContain('template not found');
    expect(result.details).toBe('caused by: ENOENT');
    expect(result.stderr).toBe('fs.statSync: no such file');
  });

  it('case 3: returns failure when chunk count mismatch (補足 2)', async () => {
    mockFetchWithSseEvents([
      { event: 'start', data: { ts: 1 } },
      { event: 'firmware-meta', data: { totalChunks: 3, totalBytes: 100 } },
      { event: 'firmware-chunk', id: '0', data: { seq: 0, total: 3, data: btoa('aa') } },
      { event: 'firmware-chunk', id: '1', data: { seq: 1, total: 3, data: btoa('bb') } },
      // seq=2 missing!
      { event: 'complete', data: { success: true, durationMs: 100, template: 'X' } },
    ]);

    const result = await compileViaSse('http://test/api/compile/sse', '{}');

    expect(result.success).toBe(false);
    // i18n key may resolve to localized text or defaultValue; both contain "received 2, expected 3"
    expect(result.error).toMatch(/2.*3|chunk.*mismatch/i);
  });

  it('case 4: returns failure when chunk index missing (補足 2、seq 欠番 detection)', async () => {
    mockFetchWithSseEvents([
      { event: 'start', data: { ts: 1 } },
      { event: 'firmware-meta', data: { totalChunks: 3, totalBytes: 6 } },
      { event: 'firmware-chunk', id: '0', data: { seq: 0, total: 3, data: btoa('aa') } },
      // seq=1 skipped (gap)
      { event: 'firmware-chunk', id: '2', data: { seq: 2, total: 3, data: btoa('cc') } },
      // length === 3 だが index 1 が undefined → chunk count mismatch ではなく欠番 detection
      // (firmwareChunks[2] = ... なので length === 3 になる)
      { event: 'complete', data: { success: true, durationMs: 100, template: 'X' } },
    ]);

    const result = await compileViaSse('http://test/api/compile/sse', '{}');

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/chunk.*1|chunk.*missing|missing.*1/i);
  });

  it('case 5: returns failure on HTTP 4xx initial response (onopen FatalSseError)', async () => {
    mockFetchWithSseEvents([], { status: 400, contentType: 'application/json' });

    const result = await compileViaSse('http://test/api/compile/sse', '{}');

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/HTTP 400|400/);
  });

  it('case 6: returns failure on Content-Type mismatch (onopen FatalSseError)', async () => {
    mockFetchWithSseEvents([], { status: 200, contentType: 'application/json' });

    const result = await compileViaSse('http://test/api/compile/sse', '{}');

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/content-type|application\/json/i);
  });

  it('case 7: returns failure when stream ends without complete event (補足 3 順序遵守)', async () => {
    mockFetchWithSseEvents([
      { event: 'start', data: { ts: 1 } },
      { event: 'firmware-meta', data: { totalChunks: 2, totalBytes: 4 } },
      { event: 'firmware-chunk', id: '0', data: { seq: 0, total: 2, data: btoa('aa') } },
      { event: 'firmware-chunk', id: '1', data: { seq: 1, total: 2, data: btoa('bb') } },
      // stream close without complete or error
    ]);

    const result = await compileViaSse('http://test/api/compile/sse', '{}');

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/stream.*ended|complete.*event/i);
  });
});

// ── Session 129: local compile-server version check ───────────────────────
//
// `checkLocalVersion` performs two HTTP fetches (local /health + DockerHub
// Hub API tag list) and compares the local image's bake-in gitSha against
// the latest `main-<sha>` tag. We mock `globalThis.fetch` with a URL-aware
// implementation so a single call can route both requests through one mock.

function mockFetchByUrl(
  routes: Record<string, { status: number; body: unknown } | { reject: Error }>,
): void {
  vi.spyOn(globalThis, 'fetch').mockImplementation((input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    for (const [pattern, response] of Object.entries(routes)) {
      if (url.includes(pattern)) {
        if ('reject' in response) {
          return Promise.reject(response.reject);
        }
        return Promise.resolve(
          new Response(JSON.stringify(response.body), {
            status: response.status,
            headers: { 'Content-Type': 'application/json' },
          }),
        );
      }
    }
    return Promise.reject(new Error(`unexpected fetch URL in test: ${url}`));
  });
}

describe('extractRemoteShaFromTagsResponse', () => {
  it('extracts 7-char sha from the first main-<sha> entry', () => {
    const sha = extractRemoteShaFromTagsResponse({
      results: [
        { name: 'latest', last_updated: '2026-05-15T00:00:00Z' },
        { name: 'main-abcd123', last_updated: '2026-05-15T00:00:00Z' },
      ],
    });
    expect(sha).toBe('abcd123');
  });

  it('returns null when no main-<sha> entry is present', () => {
    const sha = extractRemoteShaFromTagsResponse({
      results: [{ name: 'latest' }, { name: 'v0.1.0' }],
    });
    expect(sha).toBeNull();
  });

  it('returns null on malformed payload', () => {
    expect(extractRemoteShaFromTagsResponse(null)).toBeNull();
    expect(extractRemoteShaFromTagsResponse({})).toBeNull();
    expect(extractRemoteShaFromTagsResponse({ results: 'oops' })).toBeNull();
  });
});

describe('checkLocalVersion', () => {
  beforeEach(() => {
    localStorage.clear();
    // Ensure the version cache is empty so each test exercises the real
    // DockerHub fetch path (the cache TTL hides remote calls otherwise).
    localStorage.removeItem(REMOTE_CACHE_KEY);
    // Reset local server URL to the default so getCompileServerLocalUrl()
    // returns http://localhost:3001 in all test runs.
    localStorage.removeItem('compileServerLocalUrl');
  });

  it("case A (ok): outcome='ok' when local gitSha === DockerHub main-<sha>", async () => {
    mockFetchByUrl({
      '/health': {
        status: 200,
        body: {
          status: 'ok',
          service: 'digicode-compile-api',
          version: '0.1.0',
          gitSha: 'deadbee',
          builtAt: '2026-05-15T12:00:00Z',
          timestamp: '2026-05-15T12:00:00Z',
        },
      },
      'hub.docker.com': {
        status: 200,
        body: {
          results: [
            { name: 'latest' },
            { name: 'main-deadbee' },
          ],
        },
      },
    });

    const result = await checkLocalVersion();
    expect(result.outcome).toBe('ok');
    if (result.outcome === 'ok') {
      expect(result.localSha).toBe('deadbee');
      expect(result.remoteSha).toBe('deadbee');
    }
  });

  it("case B (outdated/sha-mismatch): outcome='outdated' when local gitSha !== remote", async () => {
    mockFetchByUrl({
      '/health': {
        status: 200,
        body: {
          status: 'ok',
          service: 'digicode-compile-api',
          version: '0.1.0',
          gitSha: '0000111',
          builtAt: '2026-05-01T00:00:00Z',
          timestamp: '2026-05-15T00:00:00Z',
        },
      },
      'hub.docker.com': {
        status: 200,
        body: {
          results: [
            { name: 'latest' },
            { name: 'main-9999fff' },
          ],
        },
      },
    });

    const result = await checkLocalVersion();
    expect(result.outcome).toBe('outdated');
    if (result.outcome === 'outdated') {
      expect(result.localSha).toBe('0000111');
      expect(result.remoteSha).toBe('9999fff');
      expect(result.reason).toBe('sha-mismatch');
    }
  });

  it("case C (outdated/legacy-image): outcome='outdated' when local /health has no gitSha", async () => {
    mockFetchByUrl({
      '/health': {
        status: 200,
        body: {
          status: 'ok',
          service: 'digicode-compile-api',
          version: '0.1.0',
          timestamp: '2026-05-15T00:00:00Z',
          // gitSha + builtAt absent (pre-Session-129 image)
        },
      },
      'hub.docker.com': {
        status: 200,
        body: {
          results: [{ name: 'latest' }, { name: 'main-9999fff' }],
        },
      },
    });

    const result = await checkLocalVersion();
    expect(result.outcome).toBe('outdated');
    if (result.outcome === 'outdated') {
      expect(result.localSha).toBeUndefined();
      expect(result.reason).toBe('legacy-image');
    }
  });

  it("case D (check-failed/remote-unreachable): outcome='check-failed' when DockerHub returns 5xx (fail-soft)", async () => {
    mockFetchByUrl({
      '/health': {
        status: 200,
        body: {
          status: 'ok',
          service: 'digicode-compile-api',
          version: '0.1.0',
          gitSha: 'deadbee',
          builtAt: '2026-05-15T12:00:00Z',
          timestamp: '2026-05-15T12:00:00Z',
        },
      },
      'hub.docker.com': {
        status: 503,
        body: { error: 'service unavailable' },
      },
    });

    const result = await checkLocalVersion();
    expect(result.outcome).toBe('check-failed');
    if (result.outcome === 'check-failed') {
      expect(result.reason).toBe('remote-unreachable');
    }
  });
});
