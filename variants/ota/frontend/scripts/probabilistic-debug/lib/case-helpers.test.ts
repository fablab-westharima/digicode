import { describe, it, expect } from 'vitest';
import { loadCatalog } from './catalog';
import {
  pickMode,
  pickBoard,
  generateCaseId,
  collectBlockTypes,
  DEFAULT_MODE,
} from './case-helpers';
import type { BlockNode } from './xml-builder';

const cat = loadCatalog();

describe('pickMode', () => {
  it('returns DEFAULT_MODE (all_blocks) for any catalog block', () => {
    // Per audit, every block is in all_blocks.
    for (const b of cat.blocks) {
      expect(pickMode(b)).toBe(DEFAULT_MODE);
    }
  });

  it('falls back to first listed mode when block lacks all_blocks (synthetic)', () => {
    const synth = {
      type: 'x',
      category: 'c',
      tooltip: '',
      colour: '#000',
      isStatement: true,
      hasOutput: false,
      modes: ['robots_humanoid' as const],
      boardRequires: null,
      fields: [],
      valueInputs: [],
      statementInputs: [],
    };
    expect(pickMode(synth)).toBe('robots_humanoid');
  });
});

describe('pickBoard', () => {
  it('returns esp32-generic for blocks with no board requirement', () => {
    const noReq = cat.blocks.find((b) => b.boardRequires === null);
    expect(noReq).toBeDefined();
    if (!noReq) return;
    expect(pickBoard(noReq, cat).id).toBe('esp32-generic');
  });

  it('returns a BLE-capable board for BLE-required blocks', () => {
    const bleBlock = cat.blocks.find((b) => b.boardRequires === 'supportsBle');
    expect(bleBlock).toBeDefined();
    if (!bleBlock) return;
    const board = pickBoard(bleBlock, cat);
    expect(board.supportsBle).toBe(true);
    // esp32-generic is preferred and has BLE.
    expect(board.id).toBe('esp32-generic');
  });

  it('returns a WiFi-capable board for WiFi-required blocks', () => {
    const wifiBlock = cat.blocks.find(
      (b) => b.boardRequires === 'supportsWifi',
    );
    expect(wifiBlock).toBeDefined();
    if (!wifiBlock) return;
    expect(pickBoard(wifiBlock, cat).supportsWifi).toBe(true);
  });

  it('throws if no board satisfies boardRequires (synthetic)', () => {
    const noOption = {
      type: 'x',
      category: 'c',
      tooltip: '',
      colour: '#000',
      isStatement: true,
      hasOutput: false,
      modes: ['generic' as const],
      // Use an unsupported boardRequires string so isBlockAllowedOnBoard returns false.
      boardRequires: 'supportsZigbee' as unknown as null,
      fields: [],
      valueInputs: [],
      statementInputs: [],
    };
    expect(() => pickBoard(noOption, cat)).toThrow();
  });
});

describe('generateCaseId', () => {
  it('zero-pads to 4 digits', () => {
    expect(generateCaseId(1)).toBe('case_0001');
    expect(generateCaseId(42)).toBe('case_0042');
    expect(generateCaseId(1000)).toBe('case_1000');
  });
});

describe('collectBlockTypes', () => {
  it('returns sorted unique types from a tree', () => {
    const tree: BlockNode = {
      type: 'arduino_setup',
      statements: {
        SETUP: {
          type: 'esp32_pin_mode',
          fields: { PIN: 2, MODE: 'OUTPUT' },
          next: { type: 'esp32_pin_mode', fields: { PIN: 4, MODE: 'INPUT' } },
        },
      },
    };
    const sibling: BlockNode = {
      type: 'arduino_loop',
      statements: {
        LOOP: {
          type: 'esp32_serial_println',
          values: { VALUE: { type: 'math_number', fields: { NUM: 0 } } },
        },
      },
    };
    expect(collectBlockTypes([tree, sibling])).toEqual([
      'arduino_loop',
      'arduino_setup',
      'esp32_pin_mode',
      'esp32_serial_println',
      'math_number',
    ]);
  });
});
