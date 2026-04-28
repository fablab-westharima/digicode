import { describe, it, expect } from 'vitest';
import { loadCatalog } from './catalog';
import { BOARD_FQBN, fqbnFor } from './board-fqbn';

describe('BOARD_FQBN', () => {
  it('covers every catalog board id', () => {
    const cat = loadCatalog();
    for (const board of cat.boards) {
      expect(BOARD_FQBN[board.id], `missing FQBN for "${board.id}"`).toBeDefined();
    }
  });

  it('returns ESP32 FQBN for the primary preferred board', () => {
    expect(fqbnFor('esp32-generic')).toBe('esp32:esp32:esp32');
  });

  it('returns RP2040 FQBN for the rp2040-pico board', () => {
    expect(fqbnFor('rp2040-pico')).toBe('rp2040:rp2040:rpipico');
  });

  it('throws on unknown boardId', () => {
    expect(() => fqbnFor('nonexistent-board')).toThrow(/Unknown boardId/);
  });
});
