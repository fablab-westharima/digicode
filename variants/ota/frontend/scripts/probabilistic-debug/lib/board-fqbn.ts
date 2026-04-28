/**
 * board-fqbn.ts
 *
 * Maps catalog `boardId` (e.g. "esp32-generic") to arduino-cli FQBN
 * (e.g. "esp32:esp32:esp32"). Mirrors `SUPPORTED_BOARDS` in
 * `src/stores/boardStore.ts`. Kept as a small standalone constant so the
 * orchestrator does not have to import the zustand-bound store from a
 * Node CLI context.
 */

export const BOARD_FQBN: Record<string, string> = {
  // ESP32 generic
  'esp32-generic': 'esp32:esp32:esp32',
  'esp32-s3-generic': 'esp32:esp32:esp32s3',
  'esp32-c3-generic': 'esp32:esp32:esp32c3',
  'esp32-c6-generic': 'esp32:esp32:esp32c6',
  // M5Stack family
  'm5stack-basic': 'm5stack:esp32:m5stack_core',
  'm5stickc-plus': 'm5stack:esp32:m5stick_c_plus',
  'atom-lite': 'm5stack:esp32:atom_lite',
  'atom-matrix': 'm5stack:esp32:atom_matrix',
  'm5stamp-pico': 'm5stack:esp32:stamp_pico',
  'm5stamp-c3': 'esp32:esp32:esp32c3',
  'm5stamp-s3a': 'esp32:esp32:esp32s3',
  // Seeed XIAO
  'xiao-esp32c3': 'esp32:esp32:esp32c3',
  'xiao-esp32s3': 'esp32:esp32:esp32s3',
  'xiao-esp32c6': 'esp32:esp32:esp32c6',
  // RP2040
  'rp2040-pico': 'rp2040:rp2040:rpipico',
  'rp2040-pico-w': 'rp2040:rp2040:rpipicow',
  'rp2040-xiao': 'rp2040:rp2040:seeed_xiao_rp2040',
  'rp2040-nano-connect': 'arduino:mbed_nano:nanorp2040connect',
};

export function fqbnFor(boardId: string): string {
  const fqbn = BOARD_FQBN[boardId];
  if (!fqbn) {
    throw new Error(
      `Unknown boardId "${boardId}" — update BOARD_FQBN in board-fqbn.ts`,
    );
  }
  return fqbn;
}
