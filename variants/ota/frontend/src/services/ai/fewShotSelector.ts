import type { RobotMode } from '@/stores/robotModeStore';

// Few-shot 構成: mode 専用 2 + 汎用 basic 2 + テーマ動的 1 = 最大 5
// 重複排除のため、mode 専用に既に含まれる id は themed として再追加しない

const SHARED_BASIC = ['led-blink', 'serial-hello'] as const;

const MODE_SPECIFIC_SAMPLES: Record<RobotMode, readonly [string, string]> = {
  robots_humanoid:  ['humanoid-dance', 'humanoid-walk'],
  robots_wheel:     ['wheel-obstacle', 'wheel-line-follow'],
  robots_transform: ['transform-ninja', 'transform-morph'],
  homeassistant:    ['ha-led-control', 'ha-multi-sensor'],
  generic:          ['ultrasonic-distance', 'dht-sensor'],
  all_blocks:       ['ultrasonic-distance', 'dht-sensor'],
  custom:           ['ultrasonic-distance', 'dht-sensor'],
};

// 優先度順（上から match 試行、最初に hit したものを採用）
// Phase 1: 12 sample / Phase 2 (2026-04-26): +8 sample 追加 → 20 / Phase 3 (BUG-052): +1 → 21 / BUG-053+054: +2 → 23 / 47.md Phase 2 commit #7 (第73回 wifi-controller-mix): +1 → 24 / 52.md commit #21 (2026-05-04 第80回): +6 → 30 / 第88回 (2026-05-08 残カテゴリ FEW_SHOT 12 sample): +12 → 42 entries
const KEYWORD_TO_SAMPLE: ReadonlyArray<readonly [RegExp, string]> = [
  // 47.md Phase 2 WiFi controller (commit #7): WebSocket server / WiFi
  // controller / browser-based control patterns. Listed near the top so
  // controller-flavored prompts hit this canonical Few-shot before the
  // generic IoT heuristics (mqtt / http / json) below.
  [/websocket|wi.?fi.?controller|wi.?fi.*コントロー|LAN.*control|ブラウザ.*制御|browser.*control/i, 'wifi-controller-mix'],
  // 第88回 (2026-05-08) AI 参照ファイルメンテ: 51.md/52.md 残カテゴリ 12 sample 対応 KEYWORD。
  // 特定 HW 名 (M5Stack / SHT40 / APDS9960 等) を generic pattern (LCD / 温度湿度 / ジェスチャ等) より上に置くことで
  // user の意図 (specific HW を使いたい) を優先解決。下方の 52.md commit #21 6 sample (TM1637/MAX7219/LoRa/...) と
  // 共存可 (それらは specific 名 only で generic と衝突しないため移動不要)。
  [/m5stack.*(begin|button|LCD)|本体.?(LCD|ボタン)|M5.*Core|M5.*Atom|M5.*Stick/i, 'm5stack-button-lcd'],
  [/HX711|ロードセル|load.?cell|秤|scale|計量|重量/i, 'hx711-scale'],
  [/ESP.?NOW|esp.?now|peer.?to.?peer.*ESP|ESP.*P2P|メッシュ.*ESP/i, 'espnow-mesh-receiver'],
  [/SHT40|SHT4x|ENV.*IV|温湿度.*Sensirion/i, 'sht40-temp-humidity'],
  [/e.?paper|epaper|電子ペーパー|GxEPD/i, 'epaper-status-display'],
  [/stepper|ステッパ|28BYJ|ULN2003|a4988/i, 'stepper-position-control'],
  [/relay|リレー(?!.*set)|electromagnetic.*switch|タイマー.?制御.*ON.?OFF/i, 'relay-timer-control'],
  [/neomatrix|NeoMatrix|NeoPixel.*matrix|LED.*8x8|ピクセル.?描画/i, 'neomatrix-pixel-display'],
  [/MAX30102|心拍|脈拍|heart.?rate|SpO2|血中酸素|pulse.*ox/i, 'max30102-pulse-monitor'],
  [/INA219|電力.?(モニタ|測定)|電圧.*電流.?同時|power.?monitor|消費電力/i, 'ina219-power-monitor'],
  [/APDS9960|ジェスチャ|gesture(?!.*BLE)|手.?(振り|かざす).*検出|非接触.?入力/i, 'apds9960-gesture-control'],
  [/Pushover|push.?notification|スマホ.*(通知|alert)|プッシュ通知/i, 'pushover-distance-alert'],
  // 条件分岐パターン
  [/温度|湿度|temperature|humidity|alert|°C/i, 'temp-alert'],
  [/距離|障害物|obstacle|proximity|超音波.*停/i, 'proximity-stop'],
  // BLE
  // 「コマンド」「制御」「分岐」「ON/OFF 切替」等、受信値による条件分岐を示唆する pattern を BLE.*UART より優先
  [/BLE.*(command|control|コマンド|分岐|制御)|(command|control|コマンド).*BLE|BLE.*受信値.*(分岐|制御)|BLE.*ON.*OFF/i, 'ble-uart-command-control'],
  [/BLE.*UART|UART.*BLE|BLE.*受信/i, 'ble-uart-receive'],
  // GATT 系: command/control/分岐 を含む場合は専用 sample へ（generic GATT より優先）
  [/GATT.*(command|control|コマンド|分岐|制御|write|受信)|(command|control|コマンド|分岐|write).*GATT/i, 'ble-gatt-command-control'],
  // BLE スキャン特定デバイス検出: filter/名前/RSSI 等を含む場合は filter sample へ（generic iBeacon/scanner より優先）
  [/(scan|スキャン).*(filter|フィルタ|名前|name|RSSI|特定)|filter.*BLE.*device|find.*specific.*BLE|(特定|specific).*(BLE.*デバイス|BLE.*device)/i, 'ble-scan-filter-by-name'],
  [/iBeacon|beacon|ビーコン/i, 'ble-beacon-scanner'],
  [/GATT|characteristic|キャラクタリスティック/i, 'ble-gatt-custom'],
  // ロボット動作
  [/walk|歩く|歩行/i, 'humanoid-walk'],
  [/line.?follow|ライントレース|ライン追従/i, 'wheel-line-follow'],
  [/morph|形態変化|変身/i, 'transform-morph'],
  [/gesture|手振り|首振り|ジェスチャ/i, 'humanoid-gesture'],
  [/remote|リモコン|リモート操作/i, 'wheel-remote-control'],
  // WiFi 系
  [/HTTP|API.*取得|REST|JSON.*取得|GET.*request/i, 'http-get-request'],
  [/MQTT|broker|メッセージブローカー/i, 'mqtt-direct'],
  [/NTP|時刻同期|時間同期/i, 'ntp-time-sync'],
  // 複合 / dashboard
  [/複合|combo|combine/i, 'sensor-actuator-combo'],
  [/dashboard|集約|複数.?センサー|multi.?sensor/i, 'multi-sensor-dashboard'],
  // ストレージ / I/O / 表示 / 音声
  [/animation|アニメ|フェード|アニメーション/i, 'neopixel-animation'],
  [/NVS|EEPROM|不揮発|永続化|persistent|persist/i, 'nvs-counter'],
  [/割り?込み|interrupt|debounce|チャタリング/i, 'interrupt-button'],
  [/LCD|液晶|16x2|文字.?表示/i, 'lcd-display'],
  [/DFPlayer|MP3|音楽|音声再生/i, 'dfplayer-music'],
  // 52.md commit #21 (2026-05-04 第80回): Phase C+D + 新規発見対応 6 sample
  [/TM1637|7セグ|7-?seg|デジタル時計|時刻表示/i, 'tm1637-clock'],
  [/MAX7219|LED.?マトリクス|LED.?matrix|スクロール表示|scroll.*text/i, 'max7219-scroll-text'],
  [/LoRa|長距離無線|長距離通信|low.?power.?wide.?area|LPWAN/i, 'lora-mesh-sender'],
  [/GPS|位置追跡|tracker|緯度|経度|衛星/i, 'gps-tracker'],
  [/Modbus|産業.?センサ|Industrial.*IoT|RS485|PLC/i, 'modbus-temp-monitor'],
  [/空気質|CO2|PM2.?5|PMS5003|SCD30|air.?quality|粉塵/i, 'air-quality-dashboard'],
];

function selectThemedSample(promptText: string, exclude: ReadonlySet<string>): string | null {
  for (const [pattern, id] of KEYWORD_TO_SAMPLE) {
    if (exclude.has(id)) continue;
    if (pattern.test(promptText)) return id;
  }
  return null;
}

export function selectFewShot(mode: RobotMode, promptText: string): string[] {
  const modeSpecific = MODE_SPECIFIC_SAMPLES[mode] ?? MODE_SPECIFIC_SAMPLES.generic;
  const used = new Set<string>([...modeSpecific, ...SHARED_BASIC]);
  const themed = selectThemedSample(promptText, used);
  const result: string[] = [...modeSpecific, ...SHARED_BASIC];
  if (themed) result.push(themed);
  return result.slice(0, 5);
}

// テスト用 export（catalogInvariants.test.ts で使用）
export const __testing__ = {
  MODE_SPECIFIC_SAMPLES,
  SHARED_BASIC,
  KEYWORD_TO_SAMPLE,
  selectThemedSample,
};
