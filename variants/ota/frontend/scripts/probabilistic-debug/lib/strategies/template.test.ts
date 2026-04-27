import { describe, it, expect } from 'vitest';
import { loadCatalog, indexByType } from '../catalog';
import { generateTemplateCases } from './template';
import { sampleProjects } from '../../../../src/data/sampleProjects';

const cat = loadCatalog();
const idx = indexByType(cat);

describe('generateTemplateCases (defaults)', () => {
  const cases = generateTemplateCases(cat);

  it('emits between 150 and 200 cases by default', () => {
    expect(cases.length).toBeGreaterThan(150);
    expect(cases.length).toBeLessThanOrEqual(200);
  });

  it('every case is tagged with strategy="template"', () => {
    for (const c of cases) expect(c.strategy).toBe('template');
  });

  it('every case xml opens with the Blockly namespace', () => {
    for (const c of cases) {
      expect(c.xml).toMatch(
        /^<xml xmlns="https:\/\/developers\.google\.com\/blockly\/xml">/,
      );
    }
  });

  it('every case mode is all_blocks and board is esp32-generic', () => {
    for (const c of cases) {
      expect(c.mode).toBe('all_blocks');
      expect(c.boardId).toBe('esp32-generic');
    }
  });

  it('every case includes the original sample (id 0001 maps to the first sample)', () => {
    const first = cases[0];
    expect(first.id).toBe('case_0001');
    expect(first.xml).toBe(sampleProjects[0].blocklyXml);
  });

  it('each case extracts blocksUsed only from the sample-known catalog types', () => {
    const knownTypes = new Set(cat.blocks.map((b) => b.type));
    for (const c of cases) {
      for (const t of c.blocksUsed) {
        expect(knownTypes.has(t), `unknown type "${t}" in template case ${c.id}`).toBe(
          true,
        );
      }
    }
  });

  it('PIN sweep produces distinct XMLs for samples that contain a PIN field', () => {
    const ledBlinkVariants = cases.filter((c) =>
      c.blocksUsed.includes('esp32_pin_mode'),
    );
    expect(ledBlinkVariants.length).toBeGreaterThan(1);
    const distinctXmls = new Set(ledBlinkVariants.map((c) => c.xml));
    expect(distinctXmls.size).toBeGreaterThan(1);
  });
});

describe('generateTemplateCases — options', () => {
  it('honours maxCount and startIndex', () => {
    const cases = generateTemplateCases(cat, {
      maxCount: 4,
      startIndex: 700,
    });
    expect(cases.length).toBe(4);
    expect(cases[0].id).toBe('case_0700');
    expect(cases[3].id).toBe('case_0703');
  });
});

// Catalog index is referenced indirectly via blocksUsed validation;
// we keep a smoke reference here so the import is exercised by the suite.
void idx;
