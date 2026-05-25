/*
 * DigiCode - Block-based ESP32 Programming Tool
 * Copyright (C) 2024-2026 DigiCo LLC
 *
 * Licensed under the GNU Affero General Public License version 3 or later.
 * See LICENSE file in the repository root for full terms.
 */

/**
 * BUG-086 Session 133 C6 — Permanent end-to-end probe of all canonical samples.
 *
 * Closes the case 1 + case 20 trap (judgment-mistakes-history): previously
 * the project had vitest routing tests (catalogInvariants.test.ts) that
 * verified prompts route to the right sample, but no test that the sample
 * itself loads into a Blockly workspace and produces correct cpp. This
 * gap let broken canonical samples (wifi-dht22-controller / ha-rgb-led /
 * etc.) sit in the AI training set undetected for sessions.
 *
 * Each sample is tested for:
 *   1. xmlToCpp() runs to completion (no throw)
 *   2. Non-empty cpp output
 *   3. Strict XML parses + cross-block contract compliance
 *      (semanticValidator Check 1-10 zero issues)
 *   4. Phase X-4 (Session 153): host-compile probe via compile-api endpoint
 *      (env DIGICODE_COMPILE_API_URL gated, Phase X-5 cutover prerequisite).
 *      Complements Phase X-2 host-compile-probe.test.ts (generator-emit micro
 *      probe) — Check 4 here is canonical-sample-level macro probe (~68 cases).
 *
 * Backed by the same Layer 0 build-time audit script
 * (scripts/audit-sample-structural.ts) but runs in vitest so test failure
 * blocks CI rather than just blocking the build.
 */

import { describe, it, expect } from 'vitest';
import { xmlToCpp } from '../../../../scripts/probabilistic-debug/lib/cpp-generator';
import { sampleProjects } from '@/data/sampleProjects';
import { validateXml } from '../semanticValidator';
import type { BlockCatalog } from '../systemPrompt';
import realCatalog from '../../../../public/ai/block-catalog.json';

const CATALOG = realCatalog as unknown as BlockCatalog;
const COMPILE_API_URL = process.env.DIGICODE_COMPILE_API_URL;

describe('BUG-086 C6: sample-e2e-probe — every canonical sample loads + generates cpp', () => {
  describe.each(sampleProjects)('$id', (sample) => {
    it('xmlToCpp runs without throwing', () => {
      expect(() => xmlToCpp(sample.blocklyXml)).not.toThrow();
    });

    it('produces non-empty cpp output', () => {
      const result = xmlToCpp(sample.blocklyXml);
      expect(result.fullCode.length).toBeGreaterThan(0);
    });

    it('passes semanticValidator (Check 1-10) with zero issues', () => {
      const v = validateXml(sample.blocklyXml, CATALOG);
      expect(v.issues, `${sample.id} validator issues: ${JSON.stringify(v.issues, null, 2)}`).toEqual([]);
      expect(v.loadError).toBeUndefined();
    });

    // Phase X-4 (Session 153) Check 4: host-compile probe — submit the
    // sample's generated cpp to the compile-api endpoint and expect 200 OK.
    // Env-gated (DIGICODE_COMPILE_API_URL must be set, e.g.
    // https://compile.digital-fab.jp or http://localhost:13004 for ML30
    // tunnel). Unset = skip (CI safe-by-default, Phase X-5 cutover prereq).
    // Vitest 4 signature: options as 2nd arg, fn as 3rd arg.
    it.skipIf(!COMPILE_API_URL)(
      'compiles via compile-api (host-compile probe)',
      { timeout: 300000 },
      async () => {
        const cpp = xmlToCpp(sample.blocklyXml);
        // capi src/server.ts:83 = POST /api/compile (cold compile ~100-200s)
        const response = await fetch(`${COMPILE_API_URL}/api/compile`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            source: cpp.fullCode,
            board: 'esp32:esp32:esp32',
          }),
          signal: AbortSignal.timeout(240000),
        });
        expect(
          response.status,
          `${sample.id}: HTTP ${response.status}, body: ${await response.text().catch(() => 'unreadable')}`,
        ).toBe(200);
      },
    );
  });

  it('verifies sample count baseline (65 samples expected after BUG-086 C5)', () => {
    // Regression: if a sample is silently removed, the routing tests still pass
    // but coverage drops. Lock the count so removal requires test update.
    expect(sampleProjects.length).toBeGreaterThanOrEqual(65);
  });
});
