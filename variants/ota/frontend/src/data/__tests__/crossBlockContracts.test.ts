/*
 * DigiCode - Block-based ESP32 Programming Tool
 * Copyright (C) 2024-2026 DigiCo LLC
 *
 * Licensed under the GNU Affero General Public License version 3 or later.
 * See LICENSE file in the repository root for full terms.
 */

/**
 * BUG-086 Session 133 — Cross-block contract registry integrity tests.
 *
 * Verifies:
 *   1. Registry data integrity (no duplicate ids, sane shape)
 *   2. buildCrossBlockContractSection() auto-emission across all 5 langs
 *   3. Template placeholder substitution correctness per contract
 *   4. Filter clause (requiredWhen) emission for WebSocket WRITE=TRUE
 *   5. allHandlersRequired clause emission for HA Light RGB
 *
 * Together with sample-e2e-probe (commit C6 永続化), this test suite is
 * the zero-manual-sync gate: adding/removing an entry to/from
 * CROSS_BLOCK_CONTRACTS automatically requires this test to update OR pass,
 * surfacing any contract drift.
 */

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  CROSS_BLOCK_CONTRACTS,
  buildCrossBlockContractSection,
} from '../crossBlockContracts';
import { AI_LANGUAGES } from '../aiSystemPrompts';

const LANGS = AI_LANGUAGES;

// ---------------------------------------------------------------------------
// §1 Registry integrity
// ---------------------------------------------------------------------------

describe('CROSS_BLOCK_CONTRACTS registry integrity', () => {
  it('has at least 10 contracts (Type A scope per Phase A audit)', () => {
    expect(CROSS_BLOCK_CONTRACTS.length).toBeGreaterThanOrEqual(10);
  });

  it('all contract ids are unique', () => {
    const ids = CROSS_BLOCK_CONTRACTS.map((c) => c.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it('all register block types are unique (no protocol registered twice)', () => {
    const registers = CROSS_BLOCK_CONTRACTS.map((c) => c.register);
    const unique = new Set(registers);
    expect(unique.size).toBe(registers.length);
  });

  it.each(CROSS_BLOCK_CONTRACTS)(
    'contract $id has valid shape',
    (c) => {
      expect(c.id).toMatch(/^[a-z][a-z0-9-]*$/); // kebab-case
      expect(c.register).toMatch(/^[a-z][a-z0-9_]*$/); // snake_case
      expect(c.handlers.length).toBeGreaterThan(0);
      for (const h of c.handlers) expect(h).toMatch(/^[a-z][a-z0-9_]*$/);
      if (c.idField !== null) expect(c.idField).toMatch(/^[A-Z][A-Z0-9_]*$/);
      expect(c.protocolLabel.length).toBeGreaterThan(0);
      if (c.requiredWhen) {
        expect(c.requiredWhen.fieldName).toMatch(/^[A-Z][A-Z0-9_]*$/);
        expect(c.requiredWhen.fieldValue.length).toBeGreaterThan(0);
      }
      // allHandlersRequired is only meaningful when there are multiple handlers
      if (c.allHandlersRequired) expect(c.handlers.length).toBeGreaterThan(1);
    },
  );

  // Catalog cross-reference: every register + handler block type listed in
  // the registry MUST exist in public/ai/block-catalog.json. Catches drift
  // (block renamed / removed but contract not updated).
  it('every register + handler block type exists in block catalog', () => {
    const catalogPath = path.resolve(__dirname, '../../../public/ai/block-catalog.json');
    const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf-8'));
    const knownTypes = new Set<string>(catalog.blocks.map((b: { type: string }) => b.type));
    for (const c of CROSS_BLOCK_CONTRACTS) {
      expect(knownTypes.has(c.register), `register ${c.register} (contract ${c.id}) missing from catalog`).toBe(true);
      for (const h of c.handlers) {
        expect(knownTypes.has(h), `handler ${h} (contract ${c.id}) missing from catalog`).toBe(true);
      }
    }
  });

  // The idField name must actually exist as a field on the register block
  // (verifies the validator's findDirectChild lookup will succeed).
  it('idField name exists on the register block (catalog cross-ref)', () => {
    const catalogPath = path.resolve(__dirname, '../../../public/ai/block-catalog.json');
    const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf-8'));
    const byType = new Map<string, { fields: Array<{ name: string }> }>(
      catalog.blocks.map((b: { type: string; fields: Array<{ name: string }> }) => [b.type, b]),
    );
    for (const c of CROSS_BLOCK_CONTRACTS) {
      if (c.idField === null) continue; // global contract has no idField
      const reg = byType.get(c.register);
      expect(reg, `register ${c.register} not in catalog`).toBeDefined();
      const fieldNames = (reg!.fields ?? []).map((f) => f.name);
      expect(fieldNames, `idField ${c.idField} not in register ${c.register} (contract ${c.id})`).toContain(c.idField);
      // Each handler block (when idField is non-null) must also expose the
      // same idField, so validator can match by id equality.
      for (const h of c.handlers) {
        const hMeta = byType.get(h);
        expect(hMeta, `handler ${h} not in catalog`).toBeDefined();
        const hFieldNames = (hMeta!.fields ?? []).map((f) => f.name);
        expect(hFieldNames, `handler ${h} missing idField ${c.idField} (contract ${c.id})`).toContain(c.idField);
      }
    }
  });

  it('requiredWhen.fieldName exists on the register block (catalog cross-ref)', () => {
    const catalogPath = path.resolve(__dirname, '../../../public/ai/block-catalog.json');
    const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf-8'));
    const byType = new Map<string, { fields: Array<{ name: string }> }>(
      catalog.blocks.map((b: { type: string; fields: Array<{ name: string }> }) => [b.type, b]),
    );
    for (const c of CROSS_BLOCK_CONTRACTS) {
      if (!c.requiredWhen) continue;
      const reg = byType.get(c.register);
      const fieldNames = (reg!.fields ?? []).map((f) => f.name);
      expect(fieldNames, `requiredWhen.fieldName ${c.requiredWhen.fieldName} not in register ${c.register}`).toContain(c.requiredWhen.fieldName);
    }
  });
});

// ---------------------------------------------------------------------------
// §2 Auto-emission per lang (zero-manual-sync verification)
// ---------------------------------------------------------------------------

describe('buildCrossBlockContractSection auto-emission', () => {
  it.each(LANGS)('produces a non-empty section for lang=%s', (lang) => {
    const text = buildCrossBlockContractSection(lang);
    expect(text.length).toBeGreaterThan(50); // intro + at least 10 contract lines
  });

  it.each(LANGS)('includes every register block name in lang=%s', (lang) => {
    const text = buildCrossBlockContractSection(lang);
    for (const c of CROSS_BLOCK_CONTRACTS) {
      expect(text).toContain(c.register);
    }
  });

  it.each(LANGS)('includes every handler block name in lang=%s', (lang) => {
    const text = buildCrossBlockContractSection(lang);
    for (const c of CROSS_BLOCK_CONTRACTS) {
      for (const h of c.handlers) {
        expect(text).toContain(h);
      }
    }
  });

  it.each(LANGS)('includes every protocolLabel in lang=%s', (lang) => {
    const text = buildCrossBlockContractSection(lang);
    for (const c of CROSS_BLOCK_CONTRACTS) {
      expect(text).toContain(c.protocolLabel);
    }
  });

  it.each(LANGS)('includes idField name for ID-keyed contracts in lang=%s', (lang) => {
    const text = buildCrossBlockContractSection(lang);
    for (const c of CROSS_BLOCK_CONTRACTS) {
      if (c.idField === null) continue;
      // idField appears at least once per contract (in the template substitution)
      expect(text).toContain(c.idField);
    }
  });

  it.each(LANGS)('emits filter clause for WebSocket WRITE=TRUE contract in lang=%s', (lang) => {
    const text = buildCrossBlockContractSection(lang);
    // The filter clause mentions WRITE=TRUE — verify by substring
    expect(text).toContain('WRITE');
    expect(text).toContain('TRUE');
  });

  it.each(LANGS)('emits allHandlersRequired clause for HA Light RGB contract in lang=%s', (lang) => {
    const text = buildCrossBlockContractSection(lang);
    // ha-light-rgb has 2 handlers, both required — verify both appear
    expect(text).toContain('ha_light_on_command');
    expect(text).toContain('ha_light_on_rgb_command');
  });

  it.each(LANGS)('emits no unsubstituted placeholders in lang=%s', (lang) => {
    const text = buildCrossBlockContractSection(lang);
    expect(text).not.toContain('{protocolLabel}');
    expect(text).not.toContain('{register}');
    expect(text).not.toContain('{handlers}');
    expect(text).not.toContain('{idField}');
    expect(text).not.toContain('{filterClause}');
    expect(text).not.toContain('{allClause}');
    expect(text).not.toContain('{fieldName}');
    expect(text).not.toContain('{fieldValue}');
  });

  it.each(LANGS)('intro section appears once at the top in lang=%s', (lang) => {
    const text = buildCrossBlockContractSection(lang);
    const lines = text.split('\n');
    // First line is the intro; subsequent lines are bullet items starting with "- ★"
    expect(lines[0].length).toBeGreaterThan(20);
    expect(lines[0]).not.toMatch(/^- ★/);
    // The remaining lines should be N bullet items matching contract count
    const bulletLines = lines.slice(1).filter((l) => l.startsWith('- ★'));
    expect(bulletLines.length).toBe(CROSS_BLOCK_CONTRACTS.length);
  });
});

// ---------------------------------------------------------------------------
// §3 Zero-manual-sync property: emitted section size scales with registry
// ---------------------------------------------------------------------------

describe('zero-manual-sync property (registry size ↔ section size correlation)', () => {
  it.each(LANGS)('section bullet count == registry size in lang=%s', (lang) => {
    const text = buildCrossBlockContractSection(lang);
    const bulletLines = text.split('\n').filter((l) => l.startsWith('- ★'));
    expect(bulletLines.length).toBe(CROSS_BLOCK_CONTRACTS.length);
  });
});
