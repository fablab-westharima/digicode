/**
 * Combo strategy — 1 init + N operation blocks in one case.
 *
 * 真因 (1000-case `2026-04-30_17-49-15` cluster top):
 *   singleton strategy が「単独 block で test」前提のため、init-dependent な
 *   操作 block (humanoid_dance / mqtt_publish / qtr_calibrate 等) を init なしで
 *   生成し、`'humanoid' was not declared` 等の未宣言 error 多発 (286 fail のうち
 *   ~101 件 = 35% を占める Pareto top)。
 *
 * combo strategy はこれを根本解決:
 *   1 つの init block (e.g. humanoid_init) + N 個の関連操作 block
 *   (humanoid_walk / humanoid_dance / humanoid_jump / ...) を 1 case にまとめる。
 *   - init は arduino_setup.SETUP に配置 (statement 型)
 *   - 操作 block N 個は arduino_loop.LOOP に next chain で連結
 *   - 操作 block の hasOutput / isStatement / rootOnly は wrapForCompilability
 *     と同等のロジックで配置 (rootOnly は extra root として独立配置)
 *
 * 別途、singleton.ts は `OPERATION_TO_INIT_MAP` を参照して操作 block の singleton
 * case 生成時に対応 init を auto-prepend する init-aware 拡張を行う (combo case
 * とセットで cluster 完全解消)。
 */

import {
  type Catalog,
  type CatalogBlock,
  type Mode,
} from '../catalog-types';
import { indexByType, isBlockAllowedOnBoard } from '../catalog';
import { synthesizeBlock } from '../synthesize-block';
import { emitXml } from '../xml-builder';
import type { BlockNode } from '../xml-builder';
import { validateRoots } from '../case-validator';
import type { GeneratedCase } from '../case-types';
import { collectBlockTypes, generateCaseId } from '../case-helpers';

export interface ComboOptions {
  startIndex?: number;
  /** Cap on emitted cases (default 30). */
  maxCount?: number;
}

export interface InitDependency {
  /** Init block type (e.g. 'humanoid_init'). */
  init: string;
  /** Operation block types that require this init (e.g. ['humanoid_walk', ...]). */
  operations: readonly string[];
  /** Optional human-readable label for combo case naming. */
  label?: string;
}

/**
 * 依存関係マップ — 1000-case fail の cluster top (~101 件、35% on 71.4% baseline)
 * + 第64回 fine-tuning (mqtt 全 ops + json 2 系統 split) を反映。
 *
 * 各 init prefix に対する操作 block を block-catalog.json grep + jsonBlocks.ts 実装
 * 精読 (2026-04-30) で確認:
 *   - mqtt: `mqtt_setup` のみが `PubSubClient mqttClient(espClient);` 宣言、
 *     全 mqtt_* ops が `mqttClient` 参照 (mqtt_connect も含む)
 *   - json: `json_parse` / `json_parse_size` が `_jsonDoc` (input) 宣言、
 *     `json_create_object` が `_jsonOutDoc` (output) 宣言、両者は別系統
 */
export const INIT_DEPENDENCIES: readonly InitDependency[] = [
  {
    init: 'humanoid_init',
    label: 'humanoid',
    operations: [
      'humanoid_home', 'humanoid_walk', 'humanoid_turn', 'humanoid_jump',
      'humanoid_moonwalk', 'humanoid_dance', 'humanoid_swing', 'humanoid_bend',
      'humanoid_gesture', 'humanoid_sound',
    ],
  },
  {
    init: 'transform_init',
    label: 'transform',
    operations: [
      'transform_mode', 'transform_shift', 'transform_home', 'transform_walk',
      'transform_turn', 'transform_stop', 'transform_roll', 'transform_roll_rotate',
      'transform_pushup', 'transform_dance',
    ],
  },
  {
    init: 'wheel_init',
    label: 'wheel',
    operations: [
      'wheel_forward', 'wheel_backward', 'wheel_turn_left', 'wheel_turn_right',
      'wheel_spin_left', 'wheel_spin_right', 'wheel_stop',
    ],
  },
  {
    init: 'qtr_8a_init',
    label: 'qtr-8a',
    operations: [
      'qtr_calibrate', 'qtr_auto_calibrate', 'qtr_is_calibrated',
      'qtr_line_position_normalized', 'qtr_line_position', 'qtr_line_detected',
      'qtr_read_all', 'qtr_sensor_value', 'qtr_raw_value', 'qtr_emitter_control',
    ],
  },
  {
    init: 'qtr_8rc_init',
    label: 'qtr-8rc',
    operations: [
      'qtr_calibrate', 'qtr_auto_calibrate', 'qtr_is_calibrated',
      'qtr_line_position_normalized', 'qtr_line_position', 'qtr_line_detected',
      'qtr_read_all', 'qtr_sensor_value', 'qtr_raw_value', 'qtr_emitter_control',
    ],
  },
  {
    // mqtt_setup が `PubSubClient mqttClient(espClient);` を declares、
    // 全 mqtt_* ops が mqttClient 参照 (第64回で全 ops 追加)。
    init: 'mqtt_setup',
    label: 'mqtt',
    operations: [
      'mqtt_connect', 'mqtt_connect_with_lwt', 'mqtt_is_connected',
      'mqtt_publish', 'mqtt_publish_qos',
      'mqtt_subscribe', 'mqtt_unsubscribe', 'mqtt_disconnect',
      'mqtt_loop', 'mqtt_get_state', 'mqtt_on_message',
      'mqtt_topic_value', 'mqtt_message_value',
      'mqtt_set_buffer_size', 'mqtt_set_keepalive', 'mqtt_last_will',
    ],
  },
  {
    init: 'neopixel_init',
    label: 'neopixel',
    operations: [
      'neopixel_rainbow', 'neopixel_color_simple', 'neopixel_set_color',
      'neopixel_show', 'neopixel_clear',
    ],
  },
  {
    // json_parse / json_parse_size が `StaticJsonDocument _jsonDoc;` を declares、
    // 全 json read ops (get_*/has_key/array_*) が _jsonDoc 参照 (第64回 split)。
    init: 'json_parse',
    label: 'json-read',
    operations: [
      'json_get_string', 'json_get_number', 'json_get_int', 'json_get_bool',
      'json_get_nested', 'json_has_key', 'json_array_size', 'json_array_get',
    ],
  },
  {
    // json_create_object が `StaticJsonDocument _jsonOutDoc;` を declares、
    // 全 json write ops (set_*/to_string/to_string_pretty) が _jsonOutDoc 参照。
    init: 'json_create_object',
    label: 'json-write',
    operations: [
      'json_set_bool', 'json_set_number', 'json_set_string',
      'json_to_string', 'json_to_string_pretty',
    ],
  },
  {
    // diff_drive_init が `diffSetMotors` / `DIFF_L_*` / `DIFF_R_*` / track-width
    // 関連の definitions_ を declares、全 diff_drive_* operation block が
    // diffSetMotors / 速度変数を参照 (BUG-072、第64回まで漏れていた 11 番目 prefix)。
    init: 'diff_drive_init',
    label: 'diff-drive',
    operations: [
      'diff_drive_set_speed', 'diff_drive_forward', 'diff_drive_backward',
      'diff_drive_stop', 'diff_drive_spin', 'diff_drive_curve',
      'diff_drive_forward_distance', 'diff_drive_rotate_angle',
      'diff_drive_line_trace', 'diff_drive_get_speed',
    ],
  },
  // ────────────────────────────────────────────────────────────────────
  // 第66回 expansion (2026-05-02) — 1000-case `2026-05-01_03-15-26` (passRate
  // 85.7%) cluster top の "X was not declared in this scope" 群を 14 prefix
  // 追加で消化。各 init は generator.definitions_ で C++ global 変数 (lcd /
  // tft / display / pid / encoder 等) を declare、ops は同変数を参照する。
  // singleton/edge/pair 戦略の prependInitForOp が各 op の type を見て
  // 対応 init を arduino_setup.SETUP に auto-prepend するため、cluster top
  // の compile error が解消される見込み。
  // ────────────────────────────────────────────────────────────────────
  {
    init: 'lcd_init',
    label: 'lcd',
    operations: ['lcd_clear', 'lcd_print', 'lcd_print_at', 'lcd_backlight'],
  },
  {
    init: 'tft_init',
    label: 'tft',
    operations: [
      'tft_draw_line', 'tft_draw_pixel', 'tft_fill_screen',
      'tft_draw_circle', 'tft_draw_rect', 'tft_print',
      'tft_set_cursor', 'tft_color_rgb',
    ],
  },
  {
    init: 'display_init',
    label: 'display',
    operations: ['display_clear', 'display_show', 'display_text'],
  },
  // post-Phase 4-4 commit 2-4 (case_0482-0486 fix): epaper_init 登録漏れ。
  // 第80回 ac01a56 で epaper 6 block (GxEPD2_BW、Waveshare 2.9"+) 追加時、
  // INIT_DEPENDENCIES への登録が漏れた systematic 設計欠陥。epaper_print /
  // partial_update / full_refresh / clear / draw_image が `epaperDisplay`
  // global instance を参照、epaper_init 不在で undefined → fail。
  // 本登録で singleton (prependInitForOp 経由) + combo の両 strategy で
  // epaper_init を auto-prepend、case_0482-0486 解消。
  {
    init: 'epaper_init',
    label: 'epaper',
    operations: [
      'epaper_print', 'epaper_partial_update', 'epaper_full_refresh',
      'epaper_clear', 'epaper_draw_image',
    ],
  },
  // post-Phase 4-4 commit 2-5 (case_0207-0212 fix): preferences_begin 登録漏れ。
  // 第80回 BP3 期に NVS storage block 追加時、INIT_DEPENDENCIES への登録漏れた
  // systematic 設計欠陥。preferences_put / get / remove / clear / end が template
  // 内 global `Preferences preferences;` instance を参照、template (USB/BLE) で
  // declare 不在 + preferences_begin generator も declare せず (OTA template
  // との redefinition 回避設計) で undefined → fail。本 commit で USB+BLE
  // template に declare 追加 + INIT_DEPENDENCIES 登録の併用 fix。
  {
    init: 'preferences_begin',
    label: 'preferences',
    operations: [
      'preferences_put', 'preferences_get', 'preferences_remove',
      'preferences_clear', 'preferences_end',
    ],
  },
  // post-Phase 4-4 commit 2-7 (case_0128-0130 fix): array_create 登録漏れ。
  // array_create は varName + type + dim を user 入力で `${type} ${varName}[size];`
  // declare、array_set / array_get / array_size が同 varName を参照
  // (default 'myArray')。第80回 commit (BP2 系) で array block 追加時、
  // INIT_DEPENDENCIES への登録漏れた = singleton/combo strategy で array_create
  // auto-prepend されず undefined → fail。commit 2-4 epaper / 2-5 preferences と
  // 同根 pattern。本 commit で INIT_DEPENDENCIES 登録 + arrayBlocks.ts
  // ensureArrayDefault helper の併用 fix。
  {
    init: 'array_create',
    label: 'array',
    operations: ['array_set', 'array_get', 'array_size'],
  },
  // post-Phase 4-4 commit 2-8 (case_0089/0091/0093/0096 fix): ble_init 登録漏れ。
  // ble_init が NimBLEDevice::init + pBleServer (server instance) + advertising
  // pre-config を declare、operation block (ble_add_service / ble_add_characteristic /
  // ble_notify / ble_on_write / ble_disconnect / ble_start_advertising) が
  // pBleServer / bleConnected / bleCharMap / bleServiceMap を参照。第80回 BP4
  // 期 BLE 系 block 追加時、INIT_DEPENDENCIES 登録漏れた systematic 設計欠陥。
  // 加えて ble_disconnect は NimBLE v2 API drift (`disconnectAll()` → per-conn
  // loop with `getPeerDevices()`) で fail、ble_beacon_broadcast は
  // NimBLEAdvertisementData::addData(std::string) overload 不在 (uint8_t* form
  // 必要) で fail。本 commit で 3 layer 同時 fix。
  //
  // 注: ble_uart_setup は init 役を兼ねる別 path (NUS UART)、独立 init で
  // 自身が pBleServer 等 declare、ble_init と互換 (両者 idempotent)。
  // GATT custom services (ble_add_service / characteristic 系) は ble_init
  // 経由で auto-prepend (ble_uart_setup 経由でも OK だが singleton では
  // ble_init を選ぶ、operations 単純化)。
  {
    init: 'ble_init',
    label: 'ble',
    operations: [
      'ble_add_service', 'ble_add_characteristic', 'ble_notify',
      'ble_on_write', 'ble_disconnect', 'ble_start_advertising',
    ],
  },
  // post-Phase 4-4 commit 2-10 (case_0370 fix): ota_setup_simple 登録漏れ。
  // ota_loop が `ArduinoOTA.handle()` を呼び、ota_get_hostname が
  // `ArduinoOTA.getHostname()` を呼ぶが、両者とも standalone (init 不在) では
  // ArduinoOTA singleton が undeclared でコンパイル失敗していた。第80回 BP3
  // 期 OTA block 追加時、INIT_DEPENDENCIES 登録漏れた systematic 設計欠陥。
  //
  // ota_setup_simple を init に選択 (full-fledged ota_setup より軽量で
  // WiFi 接続を前提としない、tooltip "use after mqtt_setup or ha_device_init")。
  // ota_loop / ota_get_hostname は generator 側で <ArduinoOTA.h> include を
  // self-emit するため singleton/edge も compile pass (commit 2-10 wifi pattern
  // 同型の「2 手段併用」案 X)。
  {
    init: 'ota_setup_simple',
    label: 'ota',
    operations: ['ota_loop', 'ota_get_hostname'],
  },
  {
    init: 'pid_init',
    label: 'pid',
    operations: [
      'pid_calculate', 'pid_motor_speeds', 'pid_reset',
      'pid_get_speed', 'pid_set_gains',
    ],
  },
  {
    init: 'encoder_init',
    label: 'encoder',
    operations: [
      'encoder_count', 'encoder_reset', 'encoder_distance',
      'encoder_speed', 'encoder_wait_distance',
    ],
  },
  {
    init: 'line_sensor_init',
    label: 'line-sensor',
    operations: [
      'line_sensor_calibrate', 'line_sensor_detected', 'line_sensor_raw',
      'line_sensor_value', 'line_sensor_position',
    ],
  },
  {
    init: 'wall_sensor_init',
    label: 'wall-sensor',
    operations: [
      'wall_sensor_read', 'wall_sensor_value', 'wall_sensor_error',
      'wall_sensor_has_wall', 'wall_sensor_info', 'wall_sensor_set_threshold',
    ],
  },
  {
    init: 'motor_init',
    label: 'motor',
    operations: ['motor_move', 'motor_stop', 'motor_speed'],
  },
  {
    init: 'ir_sender_init',
    label: 'ir-sender',
    operations: ['ir_sender_send'],
  },
  {
    init: 'ir_receiver_init',
    label: 'ir-receiver',
    operations: ['ir_receiver_decode'],
  },
  {
    // ha_device_init が HAMqtt インスタンス (haMqtt) を declares、
    // ha_is_connected / ha_loop / ha_report_interval / ha_diagnostics_auto が
    // 直接参照 (ha_diagnostics_auto は HASensorNumber / HASensor を自前 declare
    // するが、publish 経路は haMqtt 経由)。
    init: 'ha_device_init',
    label: 'ha-device',
    operations: ['ha_is_connected', 'ha_loop', 'ha_report_interval', 'ha_diagnostics_auto'],
  },
  // post-Phase 4-4 commit 2-6 (case_0266-0302 fix、最大 cluster 25 件): HA 11
  // entity の create→operation 依存を明示登録。各 _create が entity instance を
  // declare、operation は instance 参照。第80回 commit で 11 entity 追加時、
  // INIT_DEPENDENCIES への登録漏れ + commit 2-6 で arduinoHABlocks.ts 11 helper
  // function 追加 (operation block 単独配置で default declare、conditional
  // guard) の併用 fix。詳細は arduinoHABlocks.ts:14- ensureHa<Entity>Default
  // helper 群を参照。
  {
    init: 'ha_sensor_create',
    label: 'ha-sensor',
    operations: ['ha_sensor_update'],
  },
  {
    init: 'ha_binary_sensor_create',
    label: 'ha-binary-sensor',
    operations: ['ha_binary_sensor_update'],
  },
  {
    init: 'ha_switch_create',
    label: 'ha-switch',
    operations: ['ha_switch_on_command', 'ha_switch_set_state'],
  },
  {
    init: 'ha_light_create',
    label: 'ha-light',
    operations: [
      'ha_light_on_command', 'ha_light_state', 'ha_light_brightness',
      'ha_light_set_state',
    ],
  },
  {
    init: 'ha_light_create_rgb',
    label: 'ha-light-rgb',
    operations: [
      'ha_light_on_rgb_command', 'ha_light_rgb_r', 'ha_light_rgb_g',
      'ha_light_rgb_b', 'ha_light_set_rgb',
    ],
  },
  {
    init: 'ha_number_create',
    label: 'ha-number',
    operations: [
      'ha_number_on_command', 'ha_number_value', 'ha_number_set_state',
    ],
  },
  {
    init: 'ha_fan_create',
    label: 'ha-fan',
    operations: [
      'ha_fan_on_command', 'ha_fan_state', 'ha_fan_speed', 'ha_fan_set_state',
    ],
  },
  {
    init: 'ha_cover_create',
    label: 'ha-cover',
    operations: ['ha_cover_on_command', 'ha_cover_set_state'],
  },
  {
    init: 'ha_button_create',
    label: 'ha-button',
    operations: ['ha_button_on_press'],
  },
  {
    init: 'ha_device_trigger_create',
    label: 'ha-device-trigger',
    operations: ['ha_device_trigger_fire'],
  },
  {
    init: 'ha_scene_create',
    label: 'ha-scene',
    operations: ['ha_scene_on_command'],
  },
  {
    init: 'ha_tag_scanner_create',
    label: 'ha-tag-scanner',
    operations: ['ha_tag_scanner_scanned'],
  },
  {
    // servo_attach は init 役で `Servo servo<N>` を declares、
    // servo_* op が同 instance を参照。
    init: 'servo_attach',
    label: 'servo',
    // servo_write_value was aliased to servo_write (sunset: 2027-05-03);
    // alias is not exposed in the catalog, so probabilistic-debug only
    // emits the canonical servo_write.
    operations: ['servo_detach', 'servo_sweep', 'servo_write'],
  },
  {
    init: 'ticker_attach',
    label: 'ticker',
    operations: ['ticker_detach', 'check_ticker'],
  },
  {
    init: 'attach_interrupt',
    label: 'interrupt',
    operations: ['check_interrupt', 'detach_interrupt'],
  },
  // ────────────────────────────────────────────────────────────────────
  // 第72回 expansion (2026-05-03) — 1000-case `2026-05-03_04-40-54` (passRate
  // 90.4%) cluster top の "X was not declared in this scope" 群を 13 prefix
  // 追加で消化。Tier 1 (cluster top で実証、+1.4pp 期待):
  //   rtc_init / rus04_init / dht_init / stepper_init / mpu6050_init
  // Tier 2 (将来予防、potential cluster guard):
  //   as5600 / bme280 / bmp280 / ultrasonic / vl53l0x / camera / can / dfplayer
  // BLE / WebSocket は ordering 制約 (init → add_service → add_characteristic →
  // start_advertising 等) が強く、flat ops chain で combo case 化すると
  // structural compile fail の risk あり、別 task で nuanced 対応。
  // ────────────────────────────────────────────────────────────────────
  {
    // rtc_init が `RTC_DS3231 rtc;` を declares、rtc_* ops が rtc 参照。
    init: 'rtc_init',
    label: 'rtc',
    operations: ['rtc_set_time', 'rtc_get_formatted', 'rtc_get_component'],
  },
  {
    // rus04_init が `RUS04 rus04Eyes;` を declares、rus04_* ops が参照
    // (cluster #6 = rus04Eyes undeclared 3 件)。
    init: 'rus04_init',
    label: 'rus04',
    operations: ['rus04_distance', 'rus04_both_simple', 'rus04_rgb', 'rus04_off'],
  },
  {
    // dht_init が `DHT dht(...)` を declares (cluster #7 = dht undeclared 2 件)。
    init: 'dht_init',
    label: 'dht',
    operations: ['dht_temperature', 'dht_humidity'],
  },
  {
    // stepper_init が `AccelStepper stepperMove(...)` を declares
    // (cluster #23 = stepperMove undeclared 2 件)。
    init: 'stepper_init',
    label: 'stepper',
    operations: ['stepper_move', 'stepper_rotate', 'stepper_stop'],
  },
  {
    // mpu6050_init が `Adafruit_MPU6050 mpu;` を declares
    // (cluster #2 = Adafruit_MPU6050 type ref 4 件、init で type include + var 同時)。
    init: 'mpu6050_init',
    label: 'mpu6050',
    operations: [
      'mpu6050_update', 'mpu6050_read_accel', 'mpu6050_read_gyro',
      'mpu6050_read_temperature', 'mpu6050_get_angle', 'mpu6050_calibrate',
    ],
  },
  {
    init: 'as5600_init',
    label: 'as5600',
    operations: ['as5600_read_angle', 'as5600_read_raw'],
  },
  {
    init: 'bme280_init',
    label: 'bme280',
    operations: ['bme280_read'],
  },
  {
    init: 'bmp280_init',
    label: 'bmp280',
    operations: ['bmp280_read', 'bmp280_read_altitude'],
  },
  // 51.md commit #6-A (2026-05-04 第79回): SHT30 stand-alone (Sensirion lib)
  {
    init: 'sht30_init',
    label: 'sht30',
    operations: ['sht30_read_temperature', 'sht30_read_humidity'],
  },
  // 51.md commit #6-B (2026-05-04 第79回): SHT40 stand-alone (Adafruit lib)
  {
    init: 'sht40_init',
    label: 'sht40',
    operations: ['sht40_read_temperature', 'sht40_read_humidity'],
  },
  // 51.md commit #6-C (2026-05-04 第79回): QMP6988 stand-alone (M5Unit-ENV lib)
  {
    init: 'qmp6988_init',
    label: 'qmp6988',
    operations: ['qmp6988_read_pressure'],
  },
  // 51.md commit #6-D (2026-05-04 第79回): ENV III ユニット統合 (SHT30+QMP6988)
  {
    init: 'env3_init',
    label: 'env3',
    operations: ['env3_read_temperature', 'env3_read_humidity', 'env3_read_pressure'],
  },
  // 51.md commit #7 (2026-05-04 第79回): AC current clamp (analogRead RMS)
  {
    init: 'ac_current_clamp_init',
    label: 'ac_clamp',
    operations: ['ac_current_clamp_read_rms', 'ac_current_clamp_calibrate'],
  },
  // 51.md commit #9 (2026-05-04 第79回): ESP-NOW (esp_now.h、ESP32 core)
  {
    init: 'espnow_init',
    label: 'espnow',
    operations: ['espnow_register_peer', 'espnow_send', 'espnow_broadcast'],
  },
  // 51.md commit #10 (2026-05-04 第79回): HX711 ロードセル (robtillaart lib)
  {
    init: 'hx711_init',
    label: 'hx711',
    operations: ['hx711_read_raw', 'hx711_read_weight', 'hx711_tare', 'hx711_calibrate', 'hx711_set_scale'],
  },
  // 51.md commit #11 (2026-05-04 第79回): OLED SSD1306 (Adafruit lib 既存)
  {
    init: 'oled_ssd1306_init',
    label: 'oled_ssd1306',
    operations: [
      'oled_ssd1306_clear', 'oled_ssd1306_display', 'oled_ssd1306_print',
      'oled_ssd1306_draw_pixel', 'oled_ssd1306_draw_line', 'oled_ssd1306_draw_rect',
      'oled_ssd1306_draw_circle', 'oled_ssd1306_set_text_size', 'oled_ssd1306_invert',
    ],
  },
  // 51.md commit #12 (2026-05-04 第79回): M5Stack 本体 (M5Unified、`category=m5stack` 限定)
  {
    init: 'm5stack_begin',
    label: 'm5stack',
    operations: [
      'm5stack_update',
      'm5stack_button_a_pressed', 'm5stack_button_b_pressed', 'm5stack_button_c_pressed',
      'm5stack_button_a_held', 'm5stack_button_b_held', 'm5stack_button_c_held',
      'm5stack_lcd_print', 'm5stack_lcd_print_at', 'm5stack_lcd_clear', 'm5stack_lcd_set_text_size',
      'm5stack_speaker_tone', 'm5stack_battery_level', 'm5stack_battery_voltage',
    ],
  },
  {
    init: 'ultrasonic_init',
    label: 'ultrasonic',
    operations: ['ultrasonic_distance'],
  },
  {
    init: 'vl53l0x_init',
    label: 'vl53l0x',
    operations: ['vl53l0x_read_distance_mm'],
  },
  {
    init: 'camera_init',
    label: 'camera',
    operations: [
      'camera_capture', 'camera_save_sd', 'camera_send_http',
      'camera_stream_start',
    ],
  },
  {
    init: 'can_init',
    label: 'can',
    operations: [
      'can_send', 'can_receive_available', 'can_get_received_id',
      'can_get_received_data',
    ],
  },
  {
    init: 'dfplayer_init',
    label: 'dfplayer',
    operations: [
      'dfplayer_play', 'dfplayer_pause', 'dfplayer_resume',
      'dfplayer_stop', 'dfplayer_volume',
    ],
  },
];

/**
 * Operation type → required init type の逆引きマップ。
 * singleton.ts (init-aware 拡張) と combo.ts 自身が参照、cluster top 操作 block
 * の singleton 生成時に対応 init を auto-prepend するために使用。
 *
 * 同 operation が複数 init で参照される場合は最初の登場順 (= INIT_DEPENDENCIES
 * の declaration 順) で resolve する (qtr の 2 init variants は singleton では
 * qtr_8a_init を選択、combo では別 case で variation)。
 */
export const OPERATION_TO_INIT_MAP: Map<string, string> = (() => {
  const map = new Map<string, string>();
  for (const dep of INIT_DEPENDENCIES) {
    for (const op of dep.operations) {
      if (!map.has(op)) {
        map.set(op, dep.init);
      }
    }
  }
  return map;
})();

/**
 * Init block を arduino_setup.SETUP に挿入可能な statement BlockNode に変換する。
 *
 * - isStatement init (humanoid_init / mqtt_setup 等) はそのまま synthesize して return。
 * - value-typed init (mpu6050_init / rtc_init 等、hasOutput=true で bool/status 返り値)
 *   は `controls_if IF0=initSynth` で wrap (cpp 出力 = `if (mpu6050_init()) { }`、
 *   side effect で MPU6050 hardware 初期化 + 成功時 if body 空 = no-op、value 評価で
 *   compile pass + Adafruit_MPU6050 type / `mpu` 変数の declaration が definitions_
 *   経由で global emit される)。
 *
 * 第72回 expansion で導入、value-typed init 9 件 (rtc/mpu6050/as5600/bme280/bmp280/
 * vl53l0x/camera/can/dfplayer) を SETUP context で扱うため。
 */
function synthesizeInitForSetup(
  initBlock: CatalogBlock,
  idx: Map<string, CatalogBlock>,
  mode: Mode,
): BlockNode {
  const initSynth = synthesizeBlock(initBlock, { mode, blockIndex: idx });
  if (initBlock.isStatement) return initSynth;
  if (initBlock.hasOutput) {
    return { type: 'controls_if', values: { IF0: initSynth } };
  }
  // Edge case: neither isStatement nor hasOutput (rootOnly 等) — fallback as-is、
  // validateRoots で reject される可能性あるが現状 INIT_DEPENDENCIES に該当 nil。
  return initSynth;
}

/**
 * 既存 roots ツリー内に target 型の block が存在するか深さ優先で検出。
 * Init duplication 回避用 (例えば pair が humanoid_init+humanoid_dance を生成
 * する場合、prependInitForOp は重複 prepend を避けるため早期 return する)。
 */
function rootsContainBlock(
  roots: BlockNode[],
  targetType: string,
): boolean {
  function walk(node: BlockNode | null | undefined): boolean {
    if (!node) return false;
    if (node.type === targetType) return true;
    if (node.values) {
      for (const v of Object.values(node.values)) {
        if (walk(v)) return true;
      }
    }
    if (node.statements) {
      for (const s of Object.values(node.statements)) {
        if (walk(s)) return true;
      }
    }
    if (node.next && walk(node.next)) return true;
    return false;
  }
  return roots.some((r) => walk(r));
}

/**
 * Init-aware 共通 helper — 操作 block (e.g., humanoid_dance) を含む roots に
 * 対応 init (humanoid_init) を arduino_setup.SETUP の先頭に prepend する。
 * 既に init が roots 内のどこかにある場合は no-op (重複回避)。
 *
 * singleton.ts / edge.ts (numberBoundary + dropdownEnum) / pair.ts (loop peer)
 * から共通利用、init-dependent 操作 block の "未宣言 error" cluster を解消。
 */
export function prependInitForOp(
  roots: BlockNode[],
  opType: string,
  idx: Map<string, CatalogBlock>,
  mode: Mode,
): BlockNode[] {
  const requiredInit = OPERATION_TO_INIT_MAP.get(opType);
  if (!requiredInit || requiredInit === opType) return roots;
  if (rootsContainBlock(roots, requiredInit)) return roots;

  const initBlock = idx.get(requiredInit);
  if (!initBlock) return roots;

  // 第72回 expansion: value-typed init (mpu6050_init 等) は controls_if で wrap
  // して statement context に embed (synthesizeInitForSetup 経由)。
  const initSynth = synthesizeInitForSetup(initBlock, idx, mode);
  return roots.map((root) => {
    if (root.type !== 'arduino_setup') return root;
    const existingSetup = root.statements?.SETUP;
    return {
      ...root,
      statements: {
        ...root.statements,
        SETUP: existingSetup
          ? { ...initSynth, next: existingSetup }
          : initSynth,
      },
    };
  });
}

/**
 * Operation block を arduino_loop.LOOP に next chain として束ねる helper。
 * - statement 型: そのまま chain の next に追加
 * - hasOutput=true: esp32_serial_println(VALUE=...) で wrap してから chain
 * - rootOnly: extra roots に独立配置 (chain せず)
 */
function buildOpsChain(
  ops: CatalogBlock[],
  mode: Mode,
  idx: Map<string, CatalogBlock>,
): { loopChain: BlockNode | null; extraRoots: BlockNode[] } {
  const loopParts: BlockNode[] = [];
  const extraRoots: BlockNode[] = [];

  for (const op of ops) {
    const synth = synthesizeBlock(op, { mode, blockIndex: idx });
    if (op.isStatement) {
      loopParts.push(synth);
    } else if (op.hasOutput) {
      loopParts.push({
        type: 'esp32_serial_println',
        values: { VALUE: synth },
      });
    } else {
      // rootOnly handler — placed as separate root, not chained.
      extraRoots.push({ ...synth });
    }
  }

  // Chain loopParts via .next (a.next = b, b.next = c, ...)
  let loopChain: BlockNode | null = null;
  for (let i = loopParts.length - 1; i >= 0; i--) {
    const part = loopParts[i];
    loopChain = loopChain ? { ...part, next: loopChain } : part;
  }

  return { loopChain, extraRoots };
}

export function generateComboCases(
  catalog: Catalog,
  options: ComboOptions = {},
): GeneratedCase[] {
  const idx = indexByType(catalog);
  const cap = options.maxCount ?? 30;
  let seq = options.startIndex ?? 1;
  const cases: GeneratedCase[] = [];

  for (const dep of INIT_DEPENDENCIES) {
    if (cases.length >= cap) break;

    const initBlock = idx.get(dep.init);
    if (!initBlock) continue; // catalog mismatch — skip

    const opBlocks = dep.operations
      .map((opType) => idx.get(opType))
      .filter((b): b is CatalogBlock => b !== undefined);
    if (opBlocks.length === 0) continue;

    // 1 combo case = init + 5 ops 程度 (operations が多い場合は variation で複数 case 生成)
    const groupSize = 5;
    for (let i = 0; i < opBlocks.length; i += groupSize) {
      if (cases.length >= cap) break;
      const opSlice = opBlocks.slice(i, i + groupSize);
      const result = buildComboCase(
        dep,
        initBlock,
        opSlice,
        catalog,
        idx,
        generateCaseId(seq),
        i / groupSize,
      );
      if (!result) continue;
      cases.push(result);
      seq++;
    }
  }

  return cases;
}

function buildComboCase(
  dep: InitDependency,
  initBlock: CatalogBlock,
  ops: CatalogBlock[],
  catalog: Catalog,
  idx: Map<string, CatalogBlock>,
  id: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _variationIdx: number,
): GeneratedCase | null {
  // Shared mode: init と全 ops に共通する mode を採用
  let sharedModes = [...initBlock.modes];
  for (const op of ops) {
    sharedModes = sharedModes.filter((m) => op.modes.includes(m));
  }
  if (sharedModes.length === 0) return null;
  const mode: Mode = sharedModes.includes('all_blocks')
    ? 'all_blocks'
    : sharedModes[0];

  // Board: esp32-generic 優先、init + 全 ops が許可される board を選択
  const allBlocks = [initBlock, ...ops];
  const preferredBoard = catalog.boards.find(
    (b) =>
      b.id === 'esp32-generic' &&
      allBlocks.every((bl) => isBlockAllowedOnBoard(bl, b)),
  );
  const board =
    preferredBoard ??
    catalog.boards.find((b) =>
      allBlocks.every((bl) => isBlockAllowedOnBoard(bl, b)),
    );
  if (!board) return null;

  // Init synthesize — isStatement init はそのまま、value-typed init (hasOutput) は
  // controls_if IF0=initSynth で wrap (第72回 expansion、synthesizeInitForSetup 経由)
  const initSynth = synthesizeInitForSetup(initBlock, idx, mode);

  // Operations を loop chain にまとめる
  const { loopChain, extraRoots } = buildOpsChain(ops, mode, idx);

  const roots: BlockNode[] = [
    {
      type: 'arduino_setup',
      x: 50,
      y: 50,
      statements: { SETUP: initSynth },
    },
    {
      type: 'arduino_loop',
      x: 50,
      y: 350,
      ...(loopChain ? { statements: { LOOP: loopChain } } : {}),
    },
    ...extraRoots.map((r, i) => ({ ...r, x: 50, y: 650 + i * 200 })),
  ];

  const issues = validateRoots(roots, { mode, board, blockIndex: idx });
  if (issues.length > 0) {
    // validation fail → drop (combo は best-effort、cluster 解消優先)
    return null;
  }

  return {
    id,
    strategy: 'combo',
    mode,
    boardId: board.id,
    blocksUsed: collectBlockTypes(roots),
    xml: emitXml(roots),
  };
}
