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

  it('returns the canonical ESP32 FQBN for esp32-generic', () => {
    expect(fqbnFor('esp32-generic')).toBe('esp32:esp32:esp32');
  });

  it('returns the M5Stack FQBN for m5stack-basic (top-priority board)', () => {
    expect(fqbnFor('m5stack-basic')).toBe('m5stack:esp32:m5stack_core');
  });

  it('throws on unknown boardId', () => {
    expect(() => fqbnFor('nonexistent-board')).toThrow(/Unknown boardId/);
  });
});
