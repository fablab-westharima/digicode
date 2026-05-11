import { describe, it, expect } from 'vitest';
import { loadCatalog, indexByType } from './catalog';
import { validateRoots } from './case-validator';
import type { CatalogBoard } from './catalog-types';
import type { BlockNode } from './xml-builder';

const cat = loadCatalog();
const idx = indexByType(cat);

const fullBoard: CatalogBoard = {
  id: 'esp32-generic',
  name: 'ESP32',
  category: 'generic',
  supportsWifi: true,
  supportsBle: true,
  supportsOta: true,
  supportsEspNow: true,
};
const noBleBoard: CatalogBoard = { ...fullBoard, id: 'no-ble', supportsBle: false };

describe('validateRoots — happy path', () => {
  it('accepts a clean Singleton arduino_setup wrapping esp32_pin_mode', () => {
    const root: BlockNode = {
      type: 'arduino_setup',
      x: 50,
      y: 50,
      statements: {
        SETUP: {
          type: 'esp32_pin_mode',
          fields: { PIN: 2, MODE: 'OUTPUT' },
        },
      },
    };
    const issues = validateRoots([root], {
      mode: 'all_blocks',
      board: fullBoard,
      blockIndex: idx,
    });
    expect(issues).toEqual([]);
  });
});

describe('validateRoots — failures', () => {
  it('flags unknown block type', () => {
    const root: BlockNode = { type: 'totally_made_up_block' };
    const issues = validateRoots([root], {
      mode: 'all_blocks',
      board: fullBoard,
      blockIndex: idx,
    });
    expect(issues.length).toBe(1);
    expect(issues[0].reason).toBe('type not in catalog');
  });

  it('flags mode mismatch', () => {
    // esp32_pin_mode (category=gpio) is in gpio_bus / all_blocks / custom only.
    // Pick an unrelated mode to trigger the mismatch flag.
    const root: BlockNode = {
      type: 'esp32_pin_mode',
      fields: { PIN: 2, MODE: 'OUTPUT' },
    };
    const issues = validateRoots([root], {
      mode: 'input',
      board: fullBoard,
      blockIndex: idx,
    });
    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0].reason).toMatch(/mode "input" not in/);
  });

  it('flags board capability shortfall (BLE-required block on no-BLE board)', () => {
    const bleBlock = cat.blocks.find((b) => b.boardRequires === 'supportsBle');
    expect(bleBlock).toBeDefined();
    if (!bleBlock) return;
    const root: BlockNode = { type: bleBlock.type };
    // Synthesize would fill required fields; here we only need the type-check.
    if (bleBlock.fields.length > 0) {
      root.fields = {};
      for (const f of bleBlock.fields) root.fields[f.name] = f.default ?? '';
    }
    const issues = validateRoots([root], {
      mode: bleBlock.modes[0],
      board: noBleBoard,
      blockIndex: idx,
    });
    expect(
      issues.some((i) => i.reason.includes('boardRequires=supportsBle')),
    ).toBe(true);
  });

  it('flags missing required field', () => {
    const root: BlockNode = { type: 'esp32_pin_mode' /* fields omitted */ };
    const issues = validateRoots([root], {
      mode: 'all_blocks',
      board: fullBoard,
      blockIndex: idx,
    });
    expect(
      issues.filter((i) => i.reason.startsWith('missing required field'))
        .length,
    ).toBe(2); // PIN, MODE
  });

  it('recurses into values, statements, and next chains (path is reported)', () => {
    const root: BlockNode = {
      type: 'arduino_setup',
      statements: {
        SETUP: {
          type: 'unknown_inside',
        },
      },
    };
    const issues = validateRoots([root], {
      mode: 'all_blocks',
      board: fullBoard,
      blockIndex: idx,
    });
    expect(issues.length).toBe(1);
    expect(issues[0].path).toBe('root[0].statements.SETUP');
    expect(issues[0].reason).toBe('type not in catalog');
  });
});
