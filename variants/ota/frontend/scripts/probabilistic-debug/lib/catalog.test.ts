import { describe, it, expect, beforeEach } from 'vitest';
import {
  loadCatalog,
  blocksForMode,
  blocksFor,
  isBlockAllowedOnBoard,
  indexByType,
  catalogHash,
  clearCatalogCache,
} from './catalog';

describe('catalog loader', () => {
  beforeEach(() => clearCatalogCache());

  it('loads the real block-catalog.json (production catalog smoke test)', () => {
    const cat = loadCatalog();
    expect(cat.version).toBe('1.0');
    expect(cat.blocks.length).toBeGreaterThan(0);
    expect(cat.boards.length).toBeGreaterThan(0);
    expect(cat.boardFilters).toHaveProperty('wifi');
    expect(cat.boardFilters).toHaveProperty('ota');
    expect(cat.boardFilters).toHaveProperty('ble');
  });

  it('memoizes by catalog path', () => {
    const a = loadCatalog();
    const b = loadCatalog();
    expect(a).toBe(b);
  });

  it('all blocks have valid mode entries (subset of the 7 known modes)', () => {
    const cat = loadCatalog();
    const known = new Set([
      'all_blocks',
      'custom',
      'generic',
      'homeassistant',
      'robots_humanoid',
      'robots_transform',
      'robots_wheel',
    ]);
    for (const b of cat.blocks) {
      for (const m of b.modes) {
        expect(known.has(m), `unknown mode "${m}" on block "${b.type}"`).toBe(
          true,
        );
      }
    }
  });
});

describe('blocksForMode', () => {
  it('returns only blocks that include the given mode', () => {
    const cat = loadCatalog();
    const robots = blocksForMode(cat, 'robots_humanoid');
    expect(robots.length).toBeGreaterThan(0);
    for (const b of robots) {
      expect(b.modes).toContain('robots_humanoid');
    }
  });
});

describe('isBlockAllowedOnBoard', () => {
  const board = {
    id: 'esp32-generic',
    name: 'ESP32',
    category: 'generic',
    supportsWifi: true,
    supportsOta: true,
    supportsBle: true,
    supportsEspNow: true,
  };
  const noBleBoard = { ...board, id: 'no-ble', supportsBle: false };

  it('allows when boardRequires is null', () => {
    const block = {
      type: 'x',
      category: 'c',
      tooltip: '',
      colour: '#000',
      isStatement: true,
      hasOutput: false,
      modes: ['generic' as const],
      boardRequires: null,
      fields: [],
      valueInputs: [],
      statementInputs: [],
    };
    expect(isBlockAllowedOnBoard(block, board)).toBe(true);
  });

  it('blocks BLE-required block on a non-BLE board', () => {
    const block = {
      type: 'x',
      category: 'c',
      tooltip: '',
      colour: '#000',
      isStatement: true,
      hasOutput: false,
      modes: ['generic' as const],
      boardRequires: 'supportsBle' as const,
      fields: [],
      valueInputs: [],
      statementInputs: [],
    };
    expect(isBlockAllowedOnBoard(block, board)).toBe(true);
    expect(isBlockAllowedOnBoard(block, noBleBoard)).toBe(false);
  });
});

describe('blocksFor', () => {
  it('returns intersection of mode and board capability', () => {
    const cat = loadCatalog();
    const fullBoard = cat.boards.find((b) => b.supportsBle && b.supportsWifi);
    expect(fullBoard).toBeDefined();
    if (!fullBoard) return;

    const all = blocksFor(cat, 'generic', fullBoard);
    expect(all.length).toBeGreaterThan(0);
    for (const b of all) {
      expect(b.modes).toContain('generic');
    }
  });
});

describe('indexByType', () => {
  it('returns a map keyed by block.type covering every catalog entry', () => {
    const cat = loadCatalog();
    const idx = indexByType(cat);
    expect(idx.size).toBe(cat.blocks.length);
    for (const b of cat.blocks) {
      expect(idx.get(b.type)).toBe(b);
    }
  });
});

describe('catalogHash', () => {
  it('produces a stable 64-char hex hash for identical input', () => {
    const cat = loadCatalog();
    const a = catalogHash(cat);
    const b = catalogHash(cat);
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });

  it('changes when the block list changes', () => {
    const cat = loadCatalog();
    const a = catalogHash(cat);
    const mutated = { ...cat, blocks: cat.blocks.slice(0, -1) };
    const b = catalogHash(mutated);
    expect(a).not.toBe(b);
  });
});
