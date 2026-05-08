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

  // 47.md Phase 2 commit #7 (第73回): WiFi controller / WebSocket server
  // patterns route to wifi-controller-mix (LED + Servo + Temperature combo).
  it('websocket keyword maps to wifi-controller-mix (commit #7)', () => {
    const result = selectFewShot('generic', 'WebSocket サーバーで LED を制御したい');
    expect(result[4]).toBe('wifi-controller-mix');
  });

  it('WiFi controller keyword maps to wifi-controller-mix (commit #7)', () => {
    const result = selectFewShot('generic', 'WiFi コントローラを作って ESP32 を遠隔操作');
    expect(result[4]).toBe('wifi-controller-mix');
  });

  it('browser control keyword maps to wifi-controller-mix (commit #7)', () => {
    const result = selectFewShot('generic', 'ブラウザから ESP32 を制御するページが欲しい');
    expect(result[4]).toBe('wifi-controller-mix');
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

  // 52.md commit #21 (2026-05-04 第80回): Phase C+D + 新規発見対応 6 sample + invariants
  it('TM1637 keyword maps to tm1637-clock (52.md #21)', () => {
    const result = selectFewShot('generic', 'TM1637 7セグでデジタル時計を作って');
    expect(result).toContain('tm1637-clock');
  });

  it('MAX7219 keyword maps to max7219-scroll-text (52.md #21)', () => {
    const result = selectFewShot('generic', 'MAX7219 LED マトリクスにスクロール表示');
    expect(result).toContain('max7219-scroll-text');
  });

  it('LoRa keyword maps to lora-mesh-sender (52.md #21)', () => {
    // 注: 「距離」「proximity」が earlier pattern (proximity-stop) で match するため
    // 「LoRa」 単独 keyword で test
    const result = selectFewShot('generic', 'LoRa SX1276 で送受信したい');
    expect(result).toContain('lora-mesh-sender');
  });

  it('GPS keyword maps to gps-tracker (52.md #21)', () => {
    const result = selectFewShot('generic', 'GPS 位置追跡 trackerを作って');
    expect(result).toContain('gps-tracker');
  });

  it('Modbus keyword maps to modbus-temp-monitor (52.md #21)', () => {
    const result = selectFewShot('generic', 'Modbus RTU で産業センサ読込');
    expect(result).toContain('modbus-temp-monitor');
  });

  it('air quality keyword maps to air-quality-dashboard (52.md #21)', () => {
    const result = selectFewShot('generic', 'CO2 と PM2.5 の空気質ダッシュボード');
    expect(result).toContain('air-quality-dashboard');
  });

  // 第88回 (2026-05-08) AI 参照ファイルメンテ: 51.md/52.md 残カテゴリ 12 sample 検証
  it('M5Stack body button keyword maps to m5stack-button-lcd (88回)', () => {
    const result = selectFewShot('generic', 'M5Stack Atom で本体ボタンと LCD を使いたい');
    expect(result).toContain('m5stack-button-lcd');
  });

  it('HX711 load cell keyword maps to hx711-scale (88回)', () => {
    const result = selectFewShot('generic', 'HX711 でロードセルから重量を計量したい');
    expect(result).toContain('hx711-scale');
  });

  it('ESP-NOW peer keyword maps to espnow-mesh-receiver (88回)', () => {
    const result = selectFewShot('generic', 'ESP-NOW でデバイス間通信を作りたい');
    expect(result).toContain('espnow-mesh-receiver');
  });

  it('SHT40 sensor keyword maps to sht40-temp-humidity (88回)', () => {
    const result = selectFewShot('generic', 'SHT40 で温湿度を取得したい');
    expect(result).toContain('sht40-temp-humidity');
  });

  it('e-Paper display keyword maps to epaper-status-display (88回)', () => {
    const result = selectFewShot('generic', '電子ペーパーに状態を表示したい');
    expect(result).toContain('epaper-status-display');
  });

  it('Stepper motor keyword maps to stepper-position-control (88回)', () => {
    const result = selectFewShot('generic', '28BYJ-48 ステッパで位置制御したい');
    expect(result).toContain('stepper-position-control');
  });

  it('Relay timer keyword maps to relay-timer-control (88回)', () => {
    const result = selectFewShot('generic', 'リレーをタイマー制御で ON/OFF 切替');
    expect(result).toContain('relay-timer-control');
  });

  it('NeoMatrix keyword maps to neomatrix-pixel-display (88回)', () => {
    const result = selectFewShot('generic', 'NeoMatrix 8x8 LED にピクセル描画したい');
    expect(result).toContain('neomatrix-pixel-display');
  });

  it('MAX30102 heart rate keyword maps to max30102-pulse-monitor (88回)', () => {
    const result = selectFewShot('generic', 'MAX30102 で心拍と SpO2 を取得したい');
    expect(result).toContain('max30102-pulse-monitor');
  });

  it('INA219 power monitor keyword maps to ina219-power-monitor (88回)', () => {
    const result = selectFewShot('generic', 'INA219 で消費電力を測定したい');
    expect(result).toContain('ina219-power-monitor');
  });

  it('APDS9960 gesture keyword maps to apds9960-gesture-control (88回)', () => {
    const result = selectFewShot('generic', 'APDS9960 でジェスチャー入力したい');
    expect(result).toContain('apds9960-gesture-control');
  });

  it('Pushover notification keyword maps to pushover-distance-alert (88回)', () => {
    const result = selectFewShot('generic', 'Pushover でスマホにプッシュ通知したい');
    expect(result).toContain('pushover-distance-alert');
  });
});
