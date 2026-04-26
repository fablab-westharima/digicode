import { describe, it, expect } from 'vitest';
import catalog from '../../../../public/ai/block-catalog.json';
import { selectFewShot, __testing__ } from '../fewShotSelector';
import { sampleProjects } from '../../../data/sampleProjects';

interface CatalogField {
  name: string;
  type?: string;
  options?: unknown[];
  isCredential?: boolean;
}

interface CatalogInput {
  name: string;
  check?: string;
}

interface CatalogBlock {
  type: string;
  isStatement: boolean;
  hasOutput: boolean;
  fields: CatalogField[];
  valueInputs: CatalogInput[];
  statementInputs: CatalogInput[];
}

describe('catalog invariants', () => {
  const blocks = catalog.blocks as unknown as CatalogBlock[];
  const byType: Record<string, CatalogBlock> = Object.fromEntries(blocks.map((b) => [b.type, b]));

  it('bmp280_read is a value block with TYPE dropdown', () => {
    const b = byType['bmp280_read'];
    expect(b).toBeDefined();
    expect(b.isStatement).toBe(false);
    expect(b.hasOutput).toBe(true);
    expect(b.fields.find((f) => f.name === 'TYPE')?.options).toEqual(['temp', 'pres']);
  });

  it('wifi_connect has SSID and PASSWORD as credentials', () => {
    const b = byType['wifi_connect'];
    expect(b).toBeDefined();
    expect(b.fields.find((f) => f.name === 'SSID')?.isCredential).toBe(true);
    expect(b.fields.find((f) => f.name === 'PASSWORD')?.isCredential).toBe(true);
  });

  it('math_number is a value block (not statement)', () => {
    const b = byType['math_number'];
    expect(b).toBeDefined();
    expect(b.isStatement).toBe(false);
    expect(b.hasOutput).toBe(true);
  });

  it('arduino_setup is a hat block with SETUP statement input', () => {
    const b = byType['arduino_setup'];
    expect(b).toBeDefined();
    expect(b.isStatement).toBe(false);
    expect(b.hasOutput).toBe(false);
    expect(b.statementInputs.map((s) => s.name)).toContain('SETUP');
  });

  it('esp32_delay has TIME value input with Number check', () => {
    const b = byType['esp32_delay'];
    expect(b).toBeDefined();
    expect(b.valueInputs.find((v) => v.name === 'TIME')?.check).toBe('Number');
  });

  it('variables_get exists as value block with VAR field', () => {
    const b = byType['variables_get'];
    expect(b).toBeDefined();
    expect(b.hasOutput).toBe(true);
    expect(b.isStatement).toBe(false);
    expect(b.fields.find((f) => f.name === 'VAR')).toBeDefined();
  });

  it('variables_set exists as statement block with VAR field and VALUE input', () => {
    const b = byType['variables_set'];
    expect(b).toBeDefined();
    expect(b.isStatement).toBe(true);
    expect(b.hasOutput).toBe(false);
    expect(b.fields.find((f) => f.name === 'VAR')).toBeDefined();
    expect(b.valueInputs.find((v) => v.name === 'VALUE')).toBeDefined();
  });

  it('controls_for has VAR field', () => {
    const b = byType['controls_for'];
    expect(b).toBeDefined();
    expect(b.fields.find((f) => f.name === 'VAR')).toBeDefined();
  });

  it('tft_fill_screen has COLOR field defined', () => {
    const b = byType['tft_fill_screen'];
    expect(b).toBeDefined();
    expect(b.fields.find((f) => f.name === 'COLOR')).toBeDefined();
  });

  // BUG-052/053: ble_received_value (旧 ble_uart_get_received) は NUS UART / GATT 両 HANDLER で受信値を取得する value block
  it('ble_received_value is a String value block (BUG-052/053)', () => {
    const b = byType['ble_received_value'];
    expect(b).toBeDefined();
    expect(b.isStatement).toBe(false);
    expect(b.hasOutput).toBe(true);
    expect(b.fields).toEqual([]);
    expect(b.valueInputs).toEqual([]);
    expect(b.statementInputs).toEqual([]);
  });

  // BUG-053: 旧名 ble_uart_get_received は alias、catalog に出さない（重複防止）
  it('ble_uart_get_received is NOT in catalog (alias only, BUG-053)', () => {
    expect(byType['ble_uart_get_received']).toBeUndefined();
  });

  // BUG-054: スキャン結果取得 3 ブロック
  it('ble_scan_found_name is a String value block (BUG-054)', () => {
    const b = byType['ble_scan_found_name'];
    expect(b).toBeDefined();
    expect(b.isStatement).toBe(false);
    expect(b.hasOutput).toBe(true);
    expect(b.fields).toEqual([]);
  });

  it('ble_scan_found_address is a String value block (BUG-054)', () => {
    const b = byType['ble_scan_found_address'];
    expect(b).toBeDefined();
    expect(b.isStatement).toBe(false);
    expect(b.hasOutput).toBe(true);
    expect(b.fields).toEqual([]);
  });

  it('ble_scan_found_rssi is a Number value block (BUG-054)', () => {
    const b = byType['ble_scan_found_rssi'];
    expect(b).toBeDefined();
    expect(b.isStatement).toBe(false);
    expect(b.hasOutput).toBe(true);
    expect(b.fields).toEqual([]);
  });

  it('no block has both isStatement and hasOutput true', () => {
    for (const b of blocks) {
      expect(b.isStatement && b.hasOutput, `${b.type}: isStatement and hasOutput both true`).toBe(false);
    }
  });
});

describe('selectFewShot (動的 Few-shot 選択)', () => {
  it('returns 4 samples when no themed match (mode-specific 2 + shared basic 2)', () => {
    const result = selectFewShot('generic', 'こんにちは');
    expect(result.length).toBe(4);
  });

  it('returns 5 samples when themed match exists', () => {
    const result = selectFewShot('generic', '温度を測りたい');
    expect(result.length).toBe(5);
    expect(result[4]).toBe('temp-alert');
  });

  it('mode-specific samples come first (positions 0-1) for robots_humanoid', () => {
    const result = selectFewShot('robots_humanoid', '');
    expect(result[0]).toBe('humanoid-dance');
    expect(result[1]).toBe('humanoid-walk');
  });

  it('shared basic samples follow at positions 2-3', () => {
    const result = selectFewShot('robots_humanoid', '');
    expect(result[2]).toBe('led-blink');
    expect(result[3]).toBe('serial-hello');
  });

  it('mode-specific keyword is excluded from themed slot', () => {
    // robots_humanoid + walk: humanoid-walk is mode-specific, themed slot is empty
    const result = selectFewShot('robots_humanoid', '歩く動作を作って');
    expect(result.length).toBe(4);
    expect(result.includes('humanoid-walk')).toBe(true);
  });

  it('BLE UART keyword maps to ble-uart-receive', () => {
    const result = selectFewShot('generic', 'BLE で UART 受信したい');
    expect(result[4]).toBe('ble-uart-receive');
  });

  it('NTP keyword maps to ntp-time-sync', () => {
    const result = selectFewShot('generic', 'NTP で時刻同期');
    expect(result[4]).toBe('ntp-time-sync');
  });

  it('MQTT keyword maps to mqtt-direct', () => {
    const result = selectFewShot('generic', 'MQTT broker に publish');
    expect(result[4]).toBe('mqtt-direct');
  });

  it('NVS keyword maps to nvs-counter', () => {
    const result = selectFewShot('generic', 'NVS でカウンター永続化したい');
    expect(result[4]).toBe('nvs-counter');
  });

  it('interrupt keyword maps to interrupt-button', () => {
    const result = selectFewShot('generic', 'ボタンの割り込みで反応させたい');
    expect(result[4]).toBe('interrupt-button');
  });

  it('LCD keyword maps to lcd-display', () => {
    const result = selectFewShot('generic', 'I2C LCD に文字を表示したい');
    expect(result[4]).toBe('lcd-display');
  });

  it('DFPlayer keyword maps to dfplayer-music', () => {
    const result = selectFewShot('generic', 'DFPlayer で音楽再生');
    expect(result[4]).toBe('dfplayer-music');
  });

  it('dashboard keyword maps to multi-sensor-dashboard', () => {
    const result = selectFewShot('generic', '複数センサーの値を集約して表示');
    expect(result[4]).toBe('multi-sensor-dashboard');
  });

  // BUG-052: BLE コマンド系の prompt は受信値分岐 sample を選ぶ（BLE.*UART より優先）
  it('BLE command keyword maps to ble-uart-command-control (BUG-052)', () => {
    const result = selectFewShot('generic', 'BLE で受信したコマンドで LED 制御');
    expect(result[4]).toBe('ble-uart-command-control');
  });

  it('BLE control keyword maps to ble-uart-command-control (BUG-052)', () => {
    const result = selectFewShot('generic', 'BLE で ON/OFF で制御したい');
    expect(result[4]).toBe('ble-uart-command-control');
  });

  // 既存の BLE.*UART pattern は ble-uart-receive を引き続き選ぶ（regression check）
  it('BLE UART without command keyword still maps to ble-uart-receive (regression check)', () => {
    const result = selectFewShot('generic', 'BLE UART で受信したい');
    expect(result[4]).toBe('ble-uart-receive');
  });

  // BUG-053: GATT command/control prompt は受信値分岐 sample を選ぶ（generic GATT より優先）
  it('GATT command keyword maps to ble-gatt-command-control (BUG-053)', () => {
    const result = selectFewShot('generic', 'GATT カスタム characteristic で command を受け取って LED 制御');
    expect(result[4]).toBe('ble-gatt-command-control');
  });

  it('GATT write keyword maps to ble-gatt-command-control (BUG-053)', () => {
    const result = selectFewShot('generic', 'GATT write で受信値を取得して分岐');
    expect(result[4]).toBe('ble-gatt-command-control');
  });

  // BUG-053 regression: 一般的な GATT prompt は ble-gatt-custom を引き続き選ぶ
  it('generic GATT keyword still maps to ble-gatt-custom (regression check)', () => {
    const result = selectFewShot('generic', 'GATT カスタムサービスで定期通知');
    expect(result[4]).toBe('ble-gatt-custom');
  });

  // BUG-054: スキャン結果フィルタリング prompt は filter sample を選ぶ（generic iBeacon/scanner より優先）
  it('BLE scan filter keyword maps to ble-scan-filter-by-name (BUG-054)', () => {
    const result = selectFewShot('generic', 'BLE スキャンで特定の名前のデバイスを検出したい');
    expect(result[4]).toBe('ble-scan-filter-by-name');
  });

  it('BLE scan RSSI keyword maps to ble-scan-filter-by-name (BUG-054)', () => {
    const result = selectFewShot('generic', 'BLE スキャン中に RSSI でフィルタしたい');
    expect(result[4]).toBe('ble-scan-filter-by-name');
  });

  // BUG-054 regression: 一般的な beacon prompt は ble-beacon-scanner を引き続き選ぶ
  it('iBeacon keyword still maps to ble-beacon-scanner (regression check)', () => {
    const result = selectFewShot('generic', 'iBeacon を周辺スキャンしてシリアル出力');
    expect(result[4]).toBe('ble-beacon-scanner');
  });

  it('all referenced sample ids exist in sampleProjects', () => {
    const allIds = new Set<string>([
      ...Object.values(__testing__.MODE_SPECIFIC_SAMPLES).flat(),
      ...__testing__.SHARED_BASIC,
      ...__testing__.KEYWORD_TO_SAMPLE.map(([, id]) => id),
    ]);
    for (const id of allIds) {
      expect(sampleProjects.find((s) => s.id === id), `Sample id "${id}" not found in sampleProjects`).toBeDefined();
    }
  });

  it('returned ids point to existing samples', () => {
    const result = selectFewShot('generic', '温度センサーで湿度測定');
    for (const id of result) {
      expect(sampleProjects.find((s) => s.id === id)).toBeDefined();
    }
  });
});
