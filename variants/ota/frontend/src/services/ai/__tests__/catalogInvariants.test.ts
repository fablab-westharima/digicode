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
  outputType?: string | string[] | null;
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

  // BUG-085 (第132回): catalog schema enrichment — outputType field for value blocks.
  // Verifies that the generator extracts `setOutput(true, 'Type')` 2nd arg into
  // `outputType` field, and that statement / hat blocks do NOT have it.
  it('all hasOutput=true blocks have outputType field defined (BUG-085 B)', () => {
    for (const b of blocks) {
      if (!b.hasOutput) continue;
      // outputType can be: string ('Number'/'String'/'Boolean'/'Array'), string[] (multi-type),
      // or null (dynamic / any). undefined is NOT allowed for hasOutput=true blocks.
      expect(b.outputType !== undefined, `${b.type}: hasOutput=true but outputType is undefined`).toBe(true);
    }
  });

  it('no hasOutput=false block has outputType field (BUG-085 B)', () => {
    for (const b of blocks) {
      if (b.hasOutput) continue;
      expect(b.outputType === undefined, `${b.type}: hasOutput=false but outputType=${JSON.stringify(b.outputType)} is set`).toBe(true);
    }
  });

  it('websocket_server_received_value has outputType=String (BUG-085 B canonical sample)', () => {
    const b = byType['websocket_server_received_value'];
    expect(b).toBeDefined();
    expect(b.hasOutput).toBe(true);
    expect(b.outputType).toBe('String');
  });

  it('ble_received_value has outputType=String (BUG-085 B)', () => {
    const b = byType['ble_received_value'];
    expect(b).toBeDefined();
    expect(b.outputType).toBe('String');
  });

  it('math_number has outputType=Number (BUG-085 B builtin)', () => {
    const b = byType['math_number'];
    expect(b).toBeDefined();
    expect(b.outputType).toBe('Number');
  });

  it('text has outputType=String (BUG-085 B builtin)', () => {
    const b = byType['text'];
    expect(b).toBeDefined();
    expect(b.outputType).toBe('String');
  });

  it('logic_compare has outputType=Boolean (BUG-085 B builtin)', () => {
    const b = byType['logic_compare'];
    expect(b).toBeDefined();
    expect(b.outputType).toBe('Boolean');
  });

  it('variables_get has outputType=null (BUG-085 B builtin, dynamic)', () => {
    const b = byType['variables_get'];
    expect(b).toBeDefined();
    expect(b.outputType).toBe(null);
  });

  it('preferences_get has outputType=null (BUG-085 B, ternary cannot be statically resolved)', () => {
    const b = byType['preferences_get'];
    expect(b).toBeDefined();
    // preferences_get uses `setOutput(true, type === 'String' ? 'String' : 'Number')` — depends on
    // runtime TYPE field, so static AST extraction yields null (= dynamic / any).
    expect(b.outputType).toBe(null);
  });
});

describe('selectFewShot (動的 Few-shot 選択)', () => {
  it('returns 4 samples when no themed match (mode-specific 2 + shared basic 2)', () => {
    const result = selectFewShot('all_blocks', 'こんにちは');
    expect(result.length).toBe(4);
  });

  it('returns 5 samples when themed match exists', () => {
    const result = selectFewShot('all_blocks', '温度を測りたい');
    expect(result.length).toBe(5);
    expect(result[4]).toBe('temp-alert');
  });

  it('mode-specific samples come first (positions 0-1) for robotics', () => {
    const result = selectFewShot('robotics', '');
    // Session 104: robotics consolidates 3 old robot modes; the two
    // mode-specific samples cover humanoid + wheel use cases.
    expect(result[0]).toBe('humanoid-dance');
    expect(result[1]).toBe('wheel-line-follow');
  });

  it('shared basic samples follow at positions 2-3', () => {
    const result = selectFewShot('robotics', '');
    expect(result[2]).toBe('led-blink');
    expect(result[3]).toBe('serial-hello');
  });

  it('walk keyword still routes humanoid-walk via themed slot in robotics', () => {
    // Session 104: humanoid-walk is no longer mode-specific for robotics (the
    // two slots are humanoid-dance + wheel-line-follow), so the "歩く" keyword
    // still picks humanoid-walk via the themed routing — fills position 4.
    const result = selectFewShot('robotics', '歩く動作を作って');
    expect(result.length).toBe(5);
    expect(result[4]).toBe('humanoid-walk');
  });

  it('BLE UART keyword maps to ble-uart-receive', () => {
    const result = selectFewShot('all_blocks', 'BLE で UART 受信したい');
    expect(result[4]).toBe('ble-uart-receive');
  });

  it('NTP keyword maps to ntp-time-sync', () => {
    const result = selectFewShot('all_blocks', 'NTP で時刻同期');
    expect(result[4]).toBe('ntp-time-sync');
  });

  it('MQTT keyword maps to mqtt-direct', () => {
    const result = selectFewShot('all_blocks', 'MQTT broker に publish');
    expect(result[4]).toBe('mqtt-direct');
  });

  it('NVS keyword maps to nvs-counter', () => {
    const result = selectFewShot('all_blocks', 'NVS でカウンター永続化したい');
    expect(result[4]).toBe('nvs-counter');
  });

  it('interrupt keyword maps to interrupt-button', () => {
    const result = selectFewShot('all_blocks', 'ボタンの割り込みで反応させたい');
    expect(result[4]).toBe('interrupt-button');
  });

  it('LCD keyword maps to lcd-display', () => {
    const result = selectFewShot('all_blocks', 'I2C LCD に文字を表示したい');
    expect(result[4]).toBe('lcd-display');
  });

  it('DFPlayer keyword maps to dfplayer-music', () => {
    const result = selectFewShot('all_blocks', 'DFPlayer で音楽再生');
    expect(result[4]).toBe('dfplayer-music');
  });

  it('dashboard keyword maps to multi-sensor-dashboard', () => {
    const result = selectFewShot('all_blocks', '複数センサーの値を集約して表示');
    expect(result[4]).toBe('multi-sensor-dashboard');
  });

  // BUG-052: BLE コマンド系の prompt は受信値分岐 sample を選ぶ（BLE.*UART より優先）
  it('BLE command keyword maps to ble-uart-command-control (BUG-052)', () => {
    const result = selectFewShot('all_blocks', 'BLE で受信したコマンドで LED 制御');
    expect(result[4]).toBe('ble-uart-command-control');
  });

  it('BLE control keyword maps to ble-uart-command-control (BUG-052)', () => {
    const result = selectFewShot('all_blocks', 'BLE で ON/OFF で制御したい');
    expect(result[4]).toBe('ble-uart-command-control');
  });

  // 既存の BLE.*UART pattern は ble-uart-receive を引き続き選ぶ（regression check）
  it('BLE UART without command keyword still maps to ble-uart-receive (regression check)', () => {
    const result = selectFewShot('all_blocks', 'BLE UART で受信したい');
    expect(result[4]).toBe('ble-uart-receive');
  });

  // BUG-053: GATT command/control prompt は受信値分岐 sample を選ぶ（generic GATT より優先）
  it('GATT command keyword maps to ble-gatt-command-control (BUG-053)', () => {
    const result = selectFewShot('all_blocks', 'GATT カスタム characteristic で command を受け取って LED 制御');
    expect(result[4]).toBe('ble-gatt-command-control');
  });

  it('GATT write keyword maps to ble-gatt-command-control (BUG-053)', () => {
    const result = selectFewShot('all_blocks', 'GATT write で受信値を取得して分岐');
    expect(result[4]).toBe('ble-gatt-command-control');
  });

  // BUG-053 regression: 一般的な GATT prompt は ble-gatt-custom を引き続き選ぶ
  it('generic GATT keyword still maps to ble-gatt-custom (regression check)', () => {
    const result = selectFewShot('all_blocks', 'GATT カスタムサービスで定期通知');
    expect(result[4]).toBe('ble-gatt-custom');
  });

  // BUG-054: スキャン結果フィルタリング prompt は filter sample を選ぶ（generic iBeacon/scanner より優先）
  it('BLE scan filter keyword maps to ble-scan-filter-by-name (BUG-054)', () => {
    const result = selectFewShot('all_blocks', 'BLE スキャンで特定の名前のデバイスを検出したい');
    expect(result[4]).toBe('ble-scan-filter-by-name');
  });

  it('BLE scan RSSI keyword maps to ble-scan-filter-by-name (BUG-054)', () => {
    const result = selectFewShot('all_blocks', 'BLE スキャン中に RSSI でフィルタしたい');
    expect(result[4]).toBe('ble-scan-filter-by-name');
  });

  // BUG-054 regression: 一般的な beacon prompt は ble-beacon-scanner を引き続き選ぶ
  it('iBeacon keyword still maps to ble-beacon-scanner (regression check)', () => {
    const result = selectFewShot('all_blocks', 'iBeacon を周辺スキャンしてシリアル出力');
    expect(result[4]).toBe('ble-beacon-scanner');
  });

  // 47.md Phase 2 commit #7 (第73回): WiFi controller / WebSocket server
  // patterns route to wifi-controller-mix (LED + Servo + Temperature combo).
  it('websocket keyword maps to wifi-controller-mix (commit #7)', () => {
    const result = selectFewShot('all_blocks', 'WebSocket サーバーで LED を制御したい');
    expect(result[4]).toBe('wifi-controller-mix');
  });

  it('WiFi controller keyword maps to wifi-controller-mix (commit #7)', () => {
    const result = selectFewShot('all_blocks', 'WiFi コントローラを作って ESP32 を遠隔操作');
    expect(result[4]).toBe('wifi-controller-mix');
  });

  it('browser control keyword maps to wifi-controller-mix (commit #7)', () => {
    const result = selectFewShot('all_blocks', 'ブラウザから ESP32 を制御するページが欲しい');
    expect(result[4]).toBe('wifi-controller-mix');
  });

  // BUG-085 (第132回): 英語 variant の coverage 拡張。元の regex は literal "controller"
  // 必須で "controlled" / "control" / "controls" / Wi-Fi 系を miss していた。中広拡張で
  // canonical sample を english prompt に対しても hit させる (rule 16 §Adversary parity
  // 適用、英語 prompt も主要 attack surface = audit 対象)。
  it('English "WiFi-controlled" maps to wifi-controller-mix (BUG-085)', () => {
    const result = selectFewShot('all_blocks', 'Create a WiFi-controlled program for ESP32');
    expect(result[4]).toBe('wifi-controller-mix');
  });

  it('English "WiFi-controlled" + LED + Servo (no DHT) maps to wifi-led-servo-controller (BUG-086 C5 2-channel canonical)', () => {
    // BUG-086 (第133回): the verbatim user prompt without DHT22 now routes to
    // the new 2-channel canonical wifi-led-servo-controller (LED+servo only,
    // no temperature). Previously this fell through to wifi-controller-mix
    // (3-channel + MPU6050), causing AI to overgeneralize the 3-channel
    // pattern and drop the servo on_message handler. The new sample is
    // wired in fewShotSelector.ts BETWEEN wifi-dht22-controller (3-channel
    // with temperature) and wifi-controller-mix (generic MPU6050).
    const result = selectFewShot(
      'all_blocks',
      'Create a WiFi-controlled program for ESP32. A toggle button on the web UI to turn on/off the LED on pin 2. A slider on the web UI to control a servo motor angle (0-180 degrees) on pin 13.'
    );
    expect(result[4]).toBe('wifi-led-servo-controller');
  });

  it('English "WiFi controls" (verb form) maps to wifi-controller-mix (BUG-085)', () => {
    const result = selectFewShot('all_blocks', 'WiFi controls a servo motor');
    expect(result[4]).toBe('wifi-controller-mix');
  });

  it('English "Wi-Fi-controlled" (hyphenated form) maps to wifi-controller-mix (BUG-085)', () => {
    const result = selectFewShot('all_blocks', 'Wi-Fi-controlled device');
    expect(result[4]).toBe('wifi-controller-mix');
  });

  it('English "web UI with toggle" maps to wifi-controller-mix (BUG-085)', () => {
    const result = selectFewShot('all_blocks', 'A web UI with toggle button to switch LED on/off');
    expect(result[4]).toBe('wifi-controller-mix');
  });

  it('English "slider on web UI" maps to wifi-controller-mix (BUG-085)', () => {
    const result = selectFewShot('all_blocks', 'A slider on the web UI to control servo angle');
    expect(result[4]).toBe('wifi-controller-mix');
  });

  it('Smartphone control (JA スマホ) maps to wifi-controller-mix (BUG-085)', () => {
    const result = selectFewShot('all_blocks', 'スマホで ESP32 を制御するアプリ');
    expect(result[4]).toBe('wifi-controller-mix');
  });

  // BUG-085 regression: false-positive guard. WiFi mentioned without control word
  // should NOT route to wifi-controller-mix (otherwise generic WiFi + sensor / HTTP
  // prompts would shadow MQTT/HTTP/NTP samples). web UI alone (no control verb /
  // widget) similarly should not trigger (would mis-fire for "show settings on web
  // UI" type prompts).
  it('Regression: "WiFi + MQTT only" should NOT map to wifi-controller-mix (BUG-085 FP guard)', () => {
    const result = selectFewShot('all_blocks', 'Connect to WiFi and send sensor data via MQTT');
    expect(result[4]).not.toBe('wifi-controller-mix');
  });

  it('Regression: "WiFi + HTTP only" should NOT map to wifi-controller-mix (BUG-085 FP guard)', () => {
    const result = selectFewShot('all_blocks', 'Use WiFi to POST sensor readings to a REST API');
    expect(result[4]).not.toBe('wifi-controller-mix');
  });

  it('Regression: "web UI without control widget" should NOT map to wifi-controller-mix (BUG-085 FP guard)', () => {
    const result = selectFewShot('all_blocks', 'Configure your settings in the web UI');
    // Note: may match other regex (HTTP / settings / etc.) but must not route to wifi-controller-mix
    expect(result[4]).not.toBe('wifi-controller-mix');
  });

  // BUG-085 (第132回): D1-D3 new sample routing (more specific than existing).
  // Verifies that the user's verbatim prompt + key variant prompts route to the
  // new specialized samples instead of the existing broader ones.
  it('User verbatim prompt (WiFi-controlled + DHT22) maps to wifi-dht22-controller (BUG-085 D1)', () => {
    const result = selectFewShot(
      'all_blocks',
      'Create a WiFi-controlled program for ESP32 with SSID and password input. The device has: 1) A toggle button on the web UI to turn on/off the LED on pin 2. 2) A slider on the web UI to control a servo motor angle (0-180 degrees) on pin 13. 3) A DHT22 temperature sensor on pin 4 that displays the current temperature on the web UI.'
    );
    expect(result[4]).toBe('wifi-dht22-controller');
  });

  it('"WiFi controller + DHT22" routes to wifi-dht22-controller (BUG-085 D1)', () => {
    const result = selectFewShot('all_blocks', 'WiFi controller with DHT22 temperature sensor');
    expect(result[4]).toBe('wifi-dht22-controller');
  });

  it('"ブラウザ制御 + 温度センサ" routes to wifi-dht22-controller (BUG-085 D1 JA)', () => {
    const result = selectFewShot('all_blocks', 'ブラウザから ESP32 を制御 + 温度センサを表示');
    expect(result[4]).toBe('wifi-dht22-controller');
  });

  // BUG-086 (第133回) C5: 2-channel canonical wifi-led-servo-controller routing tests
  // Validates that prompts containing LED+servo combinations (no temperature)
  // route to the new 2-channel canonical, NOT to wifi-controller-mix (3-channel
  // with MPU6050). Tests the regex's specific-first ordering vs fall-through.

  it('"LED toggle + servo slider on web UI" routes to wifi-led-servo-controller (BUG-086)', () => {
    const result = selectFewShot('all_blocks', 'LED toggle and servo slider on web UI');
    expect(result[4]).toBe('wifi-led-servo-controller');
  });

  it('"servo + LED via browser" (servo-first) routes to wifi-led-servo-controller (BUG-086)', () => {
    const result = selectFewShot('all_blocks', 'Control a servo and an LED from the browser');
    expect(result[4]).toBe('wifi-led-servo-controller');
  });

  it('"WiFi-controlled LED + servo" (without "controller" / "controlled" alone in noun form) routes to wifi-led-servo-controller (BUG-086)', () => {
    const result = selectFewShot('all_blocks', 'WiFi-controlled program with LED toggle and servo slider for ESP32');
    expect(result[4]).toBe('wifi-led-servo-controller');
  });

  it('Regression: "LED + servo + DHT22" (3-channel) routes to wifi-dht22-controller (NOT wifi-led-servo-controller, BUG-086 FP guard)', () => {
    const result = selectFewShot(
      'all_blocks',
      'WiFi-controlled program with LED toggle, servo slider, and DHT22 temperature sensor',
    );
    expect(result[4]).toBe('wifi-dht22-controller');
  });

  it('Regression: "MPU6050 + LED + servo via WiFi" (generic controller) falls through to wifi-controller-mix (NOT wifi-led-servo-controller, BUG-086 FP guard)', () => {
    // Without LED+servo combo in adjacent form, the wifi-led-servo regex
    // doesn't fire; falls through to wifi-controller-mix which is generic.
    // Use "WiFi controller" (noun, not adj.) to match wifi-controller-mix
    // without satisfying the BUG-086 2-channel regex.
    const result = selectFewShot('all_blocks', 'WiFi controller with MPU6050 motion sensor');
    expect(result[4]).toBe('wifi-controller-mix');
  });

  it('"HA 複数 entity 制御" routes to ha-multi-control (BUG-085 D2)', () => {
    const result = selectFewShot('all_blocks', 'HA で複数 entity を制御したい (switch + number slider)');
    expect(result[4]).toBe('ha-multi-control');
  });

  it('English "HA switch and number" routes to ha-multi-control (BUG-085 D2)', () => {
    const result = selectFewShot('all_blocks', 'HA switch and number entity together');
    expect(result[4]).toBe('ha-multi-control');
  });

  it('"ESP-NOW + LED 制御" routes to espnow-peer-control (BUG-085 D3)', () => {
    const result = selectFewShot('all_blocks', 'ESP-NOW で受信して LED を制御したい');
    expect(result[4]).toBe('espnow-peer-control');
  });

  it('English "ESP-NOW with relay" routes to espnow-peer-control (BUG-085 D3)', () => {
    const result = selectFewShot('all_blocks', 'ESP-NOW receiver with relay control');
    expect(result[4]).toBe('espnow-peer-control');
  });

  // BUG-085 regression: existing samples still win for non-overlap prompts.
  it('Regression: pure "WiFi-controlled" (no temperature) still maps to wifi-controller-mix', () => {
    const result = selectFewShot('all_blocks', 'WiFi-controlled LED toggle program');
    expect(result[4]).toBe('wifi-controller-mix');
  });

  it('Regression: pure ESP-NOW receiver (no actuator) still maps to espnow-mesh-receiver', () => {
    const result = selectFewShot('all_blocks', 'ESP-NOW で受信機を作って Serial 出力');
    expect(result[4]).toBe('espnow-mesh-receiver');
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
    const result = selectFewShot('all_blocks', '温度センサーで湿度測定');
    for (const id of result) {
      expect(sampleProjects.find((s) => s.id === id)).toBeDefined();
    }
  });

  // 52.md commit #21 (2026-05-04 第80回): Phase C+D + 新規発見対応 6 sample + invariants
  it('TM1637 keyword maps to tm1637-clock (52.md #21)', () => {
    const result = selectFewShot('all_blocks', 'TM1637 7セグでデジタル時計を作って');
    expect(result).toContain('tm1637-clock');
  });

  it('MAX7219 keyword maps to max7219-scroll-text (52.md #21)', () => {
    const result = selectFewShot('all_blocks', 'MAX7219 LED マトリクスにスクロール表示');
    expect(result).toContain('max7219-scroll-text');
  });

  it('LoRa keyword maps to lora-mesh-sender (52.md #21)', () => {
    // 注: 「距離」「proximity」が earlier pattern (proximity-stop) で match するため
    // 「LoRa」 単独 keyword で test
    const result = selectFewShot('all_blocks', 'LoRa SX1276 で送受信したい');
    expect(result).toContain('lora-mesh-sender');
  });

  it('GPS keyword maps to gps-tracker (52.md #21)', () => {
    const result = selectFewShot('all_blocks', 'GPS 位置追跡 trackerを作って');
    expect(result).toContain('gps-tracker');
  });

  it('Modbus keyword maps to modbus-temp-monitor (52.md #21)', () => {
    const result = selectFewShot('all_blocks', 'Modbus RTU で産業センサ読込');
    expect(result).toContain('modbus-temp-monitor');
  });

  it('air quality keyword maps to air-quality-dashboard (52.md #21)', () => {
    const result = selectFewShot('all_blocks', 'CO2 と PM2.5 の空気質ダッシュボード');
    expect(result).toContain('air-quality-dashboard');
  });

  // 第88回 (2026-05-08) AI 参照ファイルメンテ: 51.md/52.md 残カテゴリ 12 sample 検証
  it('M5Stack body button keyword maps to m5stack-button-lcd (88回)', () => {
    const result = selectFewShot('all_blocks', 'M5Stack Atom で本体ボタンと LCD を使いたい');
    expect(result).toContain('m5stack-button-lcd');
  });

  it('HX711 load cell keyword maps to hx711-scale (88回)', () => {
    const result = selectFewShot('all_blocks', 'HX711 でロードセルから重量を計量したい');
    expect(result).toContain('hx711-scale');
  });

  it('ESP-NOW peer keyword maps to espnow-mesh-receiver (88回)', () => {
    const result = selectFewShot('all_blocks', 'ESP-NOW でデバイス間通信を作りたい');
    expect(result).toContain('espnow-mesh-receiver');
  });

  it('SHT40 sensor keyword maps to sht40-temp-humidity (88回)', () => {
    const result = selectFewShot('all_blocks', 'SHT40 で温湿度を取得したい');
    expect(result).toContain('sht40-temp-humidity');
  });

  it('e-Paper display keyword maps to epaper-status-display (88回)', () => {
    const result = selectFewShot('all_blocks', '電子ペーパーに状態を表示したい');
    expect(result).toContain('epaper-status-display');
  });

  it('Stepper motor keyword maps to stepper-position-control (88回)', () => {
    const result = selectFewShot('all_blocks', '28BYJ-48 ステッパで位置制御したい');
    expect(result).toContain('stepper-position-control');
  });

  it('Relay timer keyword maps to relay-timer-control (88回)', () => {
    const result = selectFewShot('all_blocks', 'リレーをタイマー制御で ON/OFF 切替');
    expect(result).toContain('relay-timer-control');
  });

  it('NeoMatrix keyword maps to neomatrix-pixel-display (88回)', () => {
    const result = selectFewShot('all_blocks', 'NeoMatrix 8x8 LED にピクセル描画したい');
    expect(result).toContain('neomatrix-pixel-display');
  });

  it('MAX30102 heart rate keyword maps to max30102-pulse-monitor (88回)', () => {
    const result = selectFewShot('all_blocks', 'MAX30102 で心拍と SpO2 を取得したい');
    expect(result).toContain('max30102-pulse-monitor');
  });

  it('INA219 power monitor keyword maps to ina219-power-monitor (88回)', () => {
    const result = selectFewShot('all_blocks', 'INA219 で消費電力を測定したい');
    expect(result).toContain('ina219-power-monitor');
  });

  it('APDS9960 gesture keyword maps to apds9960-gesture-control (88回)', () => {
    const result = selectFewShot('all_blocks', 'APDS9960 でジェスチャー入力したい');
    expect(result).toContain('apds9960-gesture-control');
  });

  it('Pushover notification keyword maps to pushover-distance-alert (88回)', () => {
    const result = selectFewShot('all_blocks', 'Pushover でスマホにプッシュ通知したい');
    expect(result).toContain('pushover-distance-alert');
  });
});
