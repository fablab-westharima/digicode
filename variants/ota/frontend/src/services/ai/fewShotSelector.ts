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
// Phase 1: 12 sample / Phase 2 (2026-04-26): +8 sample 追加 → 計 20 entries
const KEYWORD_TO_SAMPLE: ReadonlyArray<readonly [RegExp, string]> = [
  // 条件分岐パターン
  [/温度|湿度|temperature|humidity|alert|°C/i, 'temp-alert'],
  [/距離|障害物|obstacle|proximity|超音波.*停/i, 'proximity-stop'],
  // BLE
  [/BLE.*UART|UART.*BLE|BLE.*受信/i, 'ble-uart-receive'],
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
