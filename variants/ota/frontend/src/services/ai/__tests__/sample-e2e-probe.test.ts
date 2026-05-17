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
 *   3. Strict XML parses (semanticValidator Check 7 satisfied)
 *   4. Cross-block contract compliance (Check 6 + 9 satisfied)
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
  });

  it('verifies sample count baseline (65 samples expected after BUG-086 C5)', () => {
    // Regression: if a sample is silently removed, the routing tests still pass
    // but coverage drops. Lock the count so removal requires test update.
    expect(sampleProjects.length).toBeGreaterThanOrEqual(65);
  });
});
