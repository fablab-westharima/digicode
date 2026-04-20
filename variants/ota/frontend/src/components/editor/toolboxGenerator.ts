// ロボットモードに応じたツールボックスを動的に生成
import type { RobotMode } from '@/stores/robotModeStore';
import { ROBOT_MODES } from '@/stores/robotModeStore';
import type { BoardDefinition } from '@/stores/boardStore';
import i18n from '@/i18n';

// 翻訳ヘルパー関数
const t = (key: string) => i18n.t(key);
const cat = (key: string) => t(`toolbox.categories.${key}`);
const label = (key: string) => t(`toolbox.labels.${key}`);

// カテゴリ定義を取得する関数（i18n対応のため関数化）
const getToolboxCategories = (): Record<string, string> => ({
  // Arduino基本構造（セットアップ・ループ）
  arduino_core: `
  <category id="arduino_core" name="${cat('program')}" colour="#9C27B0">
    <block type="arduino_setup"></block>
    <block type="arduino_loop"></block>
  </category>`,

  // 基本カテゴリ（全モード共通）
  logic: `
  <category id="logic" name="${cat('logic')}" colour="#6366f1">
    <block type="controls_if"></block>
    <block type="controls_ifelse"></block>
    <block type="logic_compare"><field name="OP">EQ</field></block>
    <block type="logic_operation"><field name="OP">AND</field></block>
    <block type="logic_negate"></block>
    <block type="logic_boolean"><field name="BOOL">TRUE</field></block>
    <block type="logic_ternary"></block>
  </category>`,

  loops: `
  <category id="loops" name="${cat('loops')}" colour="#22c55e">
    <block type="controls_repeat_ext">
      <value name="TIMES"><shadow type="math_number"><field name="NUM">10</field></shadow></value>
    </block>
    <block type="controls_whileUntil"><field name="MODE">WHILE</field></block>
    <block type="controls_for">
      <field name="VAR">i</field>
      <value name="FROM"><shadow type="math_number"><field name="NUM">1</field></shadow></value>
      <value name="TO"><shadow type="math_number"><field name="NUM">10</field></shadow></value>
      <value name="BY"><shadow type="math_number"><field name="NUM">1</field></shadow></value>
    </block>
    <block type="controls_flow_statements"><field name="FLOW">BREAK</field></block>
  </category>`,

  math: `
  <category id="math" name="${cat('math')}" colour="#3b82f6">
    <block type="math_number"><field name="NUM">0</field></block>
    <block type="math_arithmetic">
      <field name="OP">ADD</field>
      <value name="A"><shadow type="math_number"><field name="NUM">1</field></shadow></value>
      <value name="B"><shadow type="math_number"><field name="NUM">1</field></shadow></value>
    </block>
    <block type="math_arithmetic">
      <field name="OP">MINUS</field>
      <value name="A"><shadow type="math_number"><field name="NUM">1</field></shadow></value>
      <value name="B"><shadow type="math_number"><field name="NUM">1</field></shadow></value>
    </block>
    <block type="math_arithmetic">
      <field name="OP">MULTIPLY</field>
      <value name="A"><shadow type="math_number"><field name="NUM">1</field></shadow></value>
      <value name="B"><shadow type="math_number"><field name="NUM">1</field></shadow></value>
    </block>
    <block type="math_arithmetic">
      <field name="OP">DIVIDE</field>
      <value name="A"><shadow type="math_number"><field name="NUM">1</field></shadow></value>
      <value name="B"><shadow type="math_number"><field name="NUM">1</field></shadow></value>
    </block>
    <block type="math_random_int">
      <value name="FROM"><shadow type="math_number"><field name="NUM">1</field></shadow></value>
      <value name="TO"><shadow type="math_number"><field name="NUM">100</field></shadow></value>
    </block>
    <block type="math_modulo">
      <value name="DIVIDEND"><shadow type="math_number"><field name="NUM">10</field></shadow></value>
      <value name="DIVISOR"><shadow type="math_number"><field name="NUM">3</field></shadow></value>
    </block>
    <block type="math_constrain">
      <value name="VALUE"><shadow type="math_number"><field name="NUM">50</field></shadow></value>
      <value name="LOW"><shadow type="math_number"><field name="NUM">1</field></shadow></value>
      <value name="HIGH"><shadow type="math_number"><field name="NUM">100</field></shadow></value>
    </block>
    <block type="math_round"><field name="OP">ROUND</field></block>
    <block type="math_single"><field name="OP">ABS</field></block>
    <block type="math_map">
      <value name="VALUE"><shadow type="math_number"><field name="NUM">512</field></shadow></value>
      <value name="FROM_LOW"><shadow type="math_number"><field name="NUM">0</field></shadow></value>
      <value name="FROM_HIGH"><shadow type="math_number"><field name="NUM">1023</field></shadow></value>
      <value name="TO_LOW"><shadow type="math_number"><field name="NUM">0</field></shadow></value>
      <value name="TO_HIGH"><shadow type="math_number"><field name="NUM">255</field></shadow></value>
    </block>
  </category>`,

  variables: `
  <category id="variables" name="${cat('variables')}" colour="#f43f5e" custom="VARIABLE"></category>`,

  functions: `
  <category id="functions" name="${cat('functions')}" colour="#ec4899" custom="PROCEDURE"></category>`,

  time: `
  <category id="time" name="${cat('time')}" colour="#06b6d4">
    <block type="esp32_delay">
      <value name="TIME"><shadow type="math_number"><field name="NUM">1000</field></shadow></value>
    </block>
    <block type="esp32_millis"></block>
  </category>`,

  serial: `
  <category id="serial" name="${cat('serial')}" colour="#64748b">
    <block type="esp32_serial_begin">
      <field name="BAUD">9600</field>
    </block>
    <block type="esp32_serial_print"></block>
    <block type="esp32_serial_println"></block>
  </category>`,

  // Humanoid ロボット（旧 OTTO 二足歩行）
  robot_humanoid: `
  <category id="robotHumanoid" name="${cat('humanoid')}" colour="#FF6B35">
    <block type="humanoid_init"></block>
    <block type="humanoid_home"></block>
    <sep></sep>
    <label text="${label('movement')}"></label>
    <block type="humanoid_walk"></block>
    <block type="humanoid_turn"></block>
    <block type="humanoid_jump"></block>
    <block type="humanoid_moonwalk"></block>
    <sep></sep>
    <label text="${label('gesture')}"></label>
    <block type="humanoid_dance"></block>
    <block type="humanoid_swing"></block>
    <block type="humanoid_bend"></block>
    <block type="humanoid_gesture"></block>
    <block type="humanoid_sound"></block>
  </category>`,

  // Wheel ロボット（旧 OTTO Wheel）
  robot_wheel: `
  <category id="robotWheel" name="${cat('wheelRobot')}" colour="#4CAF50">
    <block type="wheel_init"></block>
    <sep></sep>
    <label text="${label('movement')}"></label>
    <block type="wheel_forward"></block>
    <block type="wheel_backward"></block>
    <block type="wheel_turn_left"></block>
    <block type="wheel_turn_right"></block>
    <block type="wheel_spin_left"></block>
    <block type="wheel_spin_right"></block>
    <block type="wheel_stop"></block>
  </category>`,

  // Transform ロボット（旧 OTTO Ninja）
  robot_transform: `
  <category id="robotTransform" name="${cat('transform')}" colour="#9C27B0">
    <label text="${label('init')}"></label>
    <block type="transform_init"></block>
    <block type="transform_mode"></block>
    <block type="transform_shift"></block>
    <block type="transform_home"></block>
    <sep></sep>
    <label text="${label('walk')}"></label>
    <block type="transform_walk"></block>
    <block type="transform_turn"></block>
    <block type="transform_stop"></block>
    <sep></sep>
    <label text="${label('roll')}"></label>
    <block type="transform_roll"></block>
    <block type="transform_roll_rotate"></block>
    <sep></sep>
    <label text="${label('gesture')}"></label>
    <block type="transform_pushup"></block>
    <block type="transform_dance"></block>
  </category>`,

  // センサー - 超音波
  sensor_ultrasonic: `
  <category id="ultrasonicSensor" name="${cat('ultrasonicSensor')}" colour="#3b82f6">
    <label text="${label('hcsr04')}"></label>
    <block type="ultrasonic_init"></block>
    <block type="ultrasonic_distance"></block>
    <sep gap="24"></sep>
    <label text="${label('rus04')}"></label>
    <block type="otto_ultrasonic_init"></block>
    <block type="otto_ultrasonic_distance"></block>
    <block type="otto_ultrasonic_both_simple"></block>
    <block type="otto_ultrasonic_rgb"></block>
    <block type="otto_ultrasonic_off"></block>
  </category>`,

  // モーター
  motor: `
  <category id="motor" name="${cat('motor')}" colour="#607D8B">
    <block type="motor_init"></block>
    <block type="motor_move"></block>
    <block type="motor_speed"></block>
    <block type="motor_stop"></block>
  </category>`,

  // 差動駆動
  diff_drive: `
  <category id="diffDrive" name="${cat('diffDrive')}" colour="#00897B">
    <label text="${label('init')}"></label>
    <block type="diff_drive_init"></block>
    <sep></sep>
    <label text="${label('basicMotion')}"></label>
    <block type="diff_drive_forward">
      <value name="SPEED"><shadow type="math_number"><field name="NUM">150</field></shadow></value>
    </block>
    <block type="diff_drive_backward">
      <value name="SPEED"><shadow type="math_number"><field name="NUM">150</field></shadow></value>
    </block>
    <block type="diff_drive_spin">
      <value name="SPEED"><shadow type="math_number"><field name="NUM">100</field></shadow></value>
    </block>
    <block type="diff_drive_curve">
      <value name="SPEED"><shadow type="math_number"><field name="NUM">150</field></shadow></value>
      <value name="RATIO"><shadow type="math_number"><field name="NUM">50</field></shadow></value>
    </block>
    <block type="diff_drive_stop"></block>
    <sep></sep>
    <label text="${label('precisionControl')}"></label>
    <block type="diff_drive_forward_distance">
      <value name="DISTANCE"><shadow type="math_number"><field name="NUM">100</field></shadow></value>
      <value name="SPEED"><shadow type="math_number"><field name="NUM">150</field></shadow></value>
    </block>
    <block type="diff_drive_rotate_angle">
      <value name="ANGLE"><shadow type="math_number"><field name="NUM">90</field></shadow></value>
      <value name="SPEED"><shadow type="math_number"><field name="NUM">100</field></shadow></value>
    </block>
    <sep></sep>
    <label text="${label('detailedSettings')}"></label>
    <block type="diff_drive_set_speed">
      <value name="LEFT"><shadow type="math_number"><field name="NUM">150</field></shadow></value>
      <value name="RIGHT"><shadow type="math_number"><field name="NUM">150</field></shadow></value>
    </block>
    <block type="diff_drive_line_trace">
      <value name="BASE_SPEED"><shadow type="math_number"><field name="NUM">150</field></shadow></value>
      <value name="ERROR"><shadow type="math_number"><field name="NUM">0</field></shadow></value>
      <value name="CORRECTION"><shadow type="math_number"><field name="NUM">0</field></shadow></value>
    </block>
    <block type="diff_drive_get_speed"></block>
  </category>`,

  // エンコーダー
  encoder: `
  <category id="encoder" name="${cat('encoder')}" colour="#795548">
    <label text="${label('init')}"></label>
    <block type="encoder_init"></block>
    <sep></sep>
    <label text="${label('measurement')}"></label>
    <block type="encoder_distance"></block>
    <block type="encoder_speed"></block>
    <block type="encoder_count"></block>
    <sep></sep>
    <label text="${label('control')}"></label>
    <block type="encoder_reset"></block>
    <block type="encoder_wait_distance">
      <value name="DISTANCE"><shadow type="math_number"><field name="NUM">100</field></shadow></value>
    </block>
  </category>`,

  // 壁センサー
  sensor_wall: `
  <category id="wallSensor" name="${cat('wallSensor')}" colour="#FF5722">
    <label text="${label('init')}"></label>
    <block type="wall_sensor_init"></block>
    <sep></sep>
    <label text="${label('wallDetection')}"></label>
    <block type="wall_sensor_has_wall"></block>
    <block type="wall_sensor_info"></block>
    <block type="wall_sensor_error"></block>
    <sep></sep>
    <label text="${label('sensorValue')}"></label>
    <block type="wall_sensor_value"></block>
    <block type="wall_sensor_read"></block>
    <block type="wall_sensor_set_threshold">
      <value name="THRESHOLD"><shadow type="math_number"><field name="NUM">1500</field></shadow></value>
    </block>
  </category>`,

  // ラインセンサー（TCRT5000/汎用）
  sensor_line: `
  <category id="lineSensor" name="${cat('lineSensor')}" colour="#E91E63">
    <label text="${label('beginnerInit')}"></label>
    <block type="line_sensor_init_simple_2"></block>
    <sep></sep>
    <label text="${label('intermediateInit')}"></label>
    <block type="line_sensor_init"></block>
    <sep></sep>
    <label text="${label('calibration')}"></label>
    <block type="line_sensor_calibrate">
      <value name="DURATION"><shadow type="math_number"><field name="NUM">3000</field></shadow></value>
    </block>
    <sep></sep>
    <label text="${label('lineDetection')}"></label>
    <block type="line_sensor_position"></block>
    <block type="line_sensor_detected">
      <value name="THRESHOLD"><shadow type="math_number"><field name="NUM">500</field></shadow></value>
    </block>
    <sep></sep>
    <label text="${label('sensorValue')}"></label>
    <block type="line_sensor_value"></block>
    <block type="line_sensor_raw"></block>
  </category>`,

  // QTRセンサー（高速）
  sensor_qtr: `
  <category id="qtrSensor" name="${cat('qtrSensor')}" colour="#9C27B0">
    <label text="${label('init')}"></label>
    <block type="qtr_8a_init"></block>
    <block type="qtr_8rc_init"></block>
    <sep></sep>
    <label text="${label('calibration')}"></label>
    <block type="qtr_calibrate">
      <value name="SAMPLES"><shadow type="math_number"><field name="NUM">400</field></shadow></value>
    </block>
    <block type="qtr_auto_calibrate">
      <value name="DURATION"><shadow type="math_number"><field name="NUM">5000</field></shadow></value>
    </block>
    <block type="qtr_is_calibrated"></block>
    <sep></sep>
    <label text="${label('lineDetection')}"></label>
    <block type="qtr_line_position_normalized"></block>
    <block type="qtr_line_position"></block>
    <block type="qtr_line_detected">
      <value name="THRESHOLD"><shadow type="math_number"><field name="NUM">200</field></shadow></value>
    </block>
    <sep></sep>
    <label text="${label('sensorValue')}"></label>
    <block type="qtr_read_all"></block>
    <block type="qtr_sensor_value"></block>
    <block type="qtr_raw_value"></block>
    <sep></sep>
    <label text="${label('control')}"></label>
    <block type="qtr_emitter_control"></block>
  </category>`,

  // PID制御
  pid: `
  <category id="pidControl" name="${cat('pidControl')}" colour="#3F51B5">
    <label text="${label('init')}"></label>
    <block type="pid_init">
      <value name="KP"><shadow type="math_number"><field name="NUM">0.5</field></shadow></value>
      <value name="KI"><shadow type="math_number"><field name="NUM">0.0</field></shadow></value>
      <value name="KD"><shadow type="math_number"><field name="NUM">0.1</field></shadow></value>
    </block>
    <sep></sep>
    <label text="${label('pidCalculation')}"></label>
    <block type="pid_calculate">
      <value name="ERROR"><shadow type="math_number"><field name="NUM">0</field></shadow></value>
    </block>
    <block type="pid_motor_speeds">
      <value name="BASE_SPEED"><shadow type="math_number"><field name="NUM">150</field></shadow></value>
      <value name="ERROR"><shadow type="math_number"><field name="NUM">0</field></shadow></value>
    </block>
    <block type="pid_get_speed"></block>
    <sep></sep>
    <label text="${label('parameters')}"></label>
    <block type="pid_set_gains">
      <value name="KP"><shadow type="math_number"><field name="NUM">0.5</field></shadow></value>
      <value name="KI"><shadow type="math_number"><field name="NUM">0.0</field></shadow></value>
      <value name="KD"><shadow type="math_number"><field name="NUM">0.1</field></shadow></value>
    </block>
    <block type="pid_reset"></block>
  </category>`,

  // カメラ (BP7-1, 2026-04-20 追加)
  camera: `
  <category id="camera" name="${cat('camera')}" colour="#212121">
    <block type="camera_init"></block>
    <block type="camera_capture"></block>
    <block type="camera_save_sd"></block>
    <block type="camera_send_http"></block>
    <block type="camera_stream_start"></block>
  </category>`,

  // CAN Bus (BP7-2, 2026-04-20 追加)
  can_bus: `
  <category id="canBus" name="${cat('canBus')}" colour="#37474F">
    <block type="can_init"></block>
    <block type="can_send"></block>
    <block type="can_receive_available"></block>
    <block type="can_get_received_id"></block>
    <block type="can_get_received_data"></block>
  </category>`,

  // IR リモコン (BP6-2, 2026-04-20 追加)
  ir_remote: `
  <category id="irRemote" name="${cat('irRemote')}" colour="#FF6F00">
    <label text="${label('irReceiver') || 'Receiver'}"></label>
    <block type="ir_receiver_init"></block>
    <block type="ir_receiver_decode"></block>
    <sep></sep>
    <label text="${label('irSender') || 'Sender'}"></label>
    <block type="ir_sender_init"></block>
    <block type="ir_sender_send"></block>
  </category>`,

  // TFT ディスプレイ (BP6-4, 2026-04-20 追加)
  tft_display: `
  <category id="tftDisplay" name="${cat('tftDisplay')}" colour="#9C27B0">
    <label text="${label('tftInit') || 'Init'}"></label>
    <block type="tft_init"></block>
    <block type="tft_fill_screen"></block>
    <sep></sep>
    <label text="${label('tftDraw') || 'Draw'}"></label>
    <block type="tft_draw_pixel"></block>
    <block type="tft_draw_line"></block>
    <block type="tft_draw_rect"></block>
    <block type="tft_draw_circle"></block>
    <sep></sep>
    <label text="${label('tftText') || 'Text'}"></label>
    <block type="tft_set_cursor"></block>
    <block type="tft_print"></block>
    <block type="tft_color_rgb"></block>
  </category>`,

  // RFID (BP6-5, 2026-04-20 追加)
  rfid: `
  <category id="rfid" name="${cat('rfid')}" colour="#4CAF50">
    <label text="${label('rfidM5') || '✅ M5Stack RFID 2 (技適対応)'}"></label>
    <block type="rfid_init_m5stack"></block>
    <sep></sep>
    <label text="${label('rfidGeneric') || '⚠️ Generic MFRC522 (要確認)'}"></label>
    <block type="rfid_init_generic"></block>
    <sep></sep>
    <label text="${label('rfidOps') || 'Operations'}"></label>
    <block type="rfid_is_card_present"></block>
    <block type="rfid_read_uid"></block>
    <block type="rfid_read_data"></block>
    <block type="rfid_write_data"></block>
  </category>`,

  // WebSocket (BP6-1, 2026-04-20 追加) — supportsWifi フィルタ対象
  websocket: `
  <category id="websocket" name="${cat('websocket')}" colour="#00BCD4">
    <block type="websocket_connect"></block>
    <block type="websocket_send"></block>
    <block type="websocket_on_message"></block>
    <block type="websocket_is_connected"></block>
    <block type="websocket_disconnect"></block>
  </category>`,

  // UART 2 / Serial2 (BP6-3, 2026-04-20 追加)
  uart_extra: `
  <category id="uartExtra" name="${cat('uartExtra')}" colour="#607D8B">
    <block type="serial2_begin"></block>
    <block type="serial2_print"></block>
    <block type="serial2_println"></block>
    <block type="serial2_read"></block>
    <block type="serial2_read_string_until"></block>
    <block type="serial2_available"></block>
  </category>`,

  // DFPlayer MP3 (BP6-6, 2026-04-20 追加)
  audio_dfplayer: `
  <category id="audioDfplayer" name="${cat('audioDfplayer')}" colour="#FF5722">
    <block type="dfplayer_init"></block>
    <block type="dfplayer_play"></block>
    <block type="dfplayer_pause"></block>
    <block type="dfplayer_resume"></block>
    <block type="dfplayer_stop"></block>
    <block type="dfplayer_volume"></block>
  </category>`,

  // BLE (BP4, 2026-04-20 追加) — supportsBle フィルタ対象、ESP32 専用
  ble: `
  <category id="ble" name="${cat('ble')}" colour="#2196F3">
    <label text="${label('bleUart') || 'Nordic UART (NUS)'}"></label>
    <block type="ble_uart_setup"></block>
    <block type="ble_uart_write"></block>
    <block type="ble_uart_on_receive"></block>
    <block type="ble_is_connected"></block>
    <block type="ble_disconnect"></block>
    <sep></sep>
    <label text="${label('bleGatt') || 'GATT Custom Service'}"></label>
    <block type="ble_init"></block>
    <block type="ble_add_service"></block>
    <block type="ble_add_characteristic"></block>
    <block type="ble_notify"></block>
    <block type="ble_on_write"></block>
    <block type="ble_start_advertising"></block>
    <sep></sep>
    <label text="${label('bleBeacon') || 'iBeacon'}"></label>
    <block type="ble_beacon_broadcast"></block>
    <sep></sep>
    <label text="${label('bleScan') || 'Scan'}"></label>
    <block type="ble_scan_start"></block>
    <block type="ble_on_device_found"></block>
    <block type="ble_get_rssi"></block>
  </category>`,

  // NTP 時刻同期 (BP3-1, 2026-04-20 追加) — supportsWifi フィルタ対象
  ntp_time: `
  <category id="ntpTime" name="${cat('ntpTime')}" colour="#3F51B5">
    <label text="${label('ntpSync') || 'Sync'}"></label>
    <block type="ntp_sync"></block>
    <sep></sep>
    <label text="${label('ntpGet') || 'Get Time'}"></label>
    <block type="ntp_get_formatted"></block>
    <block type="ntp_get_component"></block>
    <block type="ntp_get_unix_time"></block>
  </category>`,

  // RTC (BP3-2, 2026-04-20 追加)
  rtc: `
  <category id="rtc" name="${cat('rtc')}" colour="#9C27B0">
    <label text="${label('rtcInit') || 'Init'}"></label>
    <block type="rtc_init"></block>
    <block type="rtc_set_time"></block>
    <sep></sep>
    <label text="${label('rtcGet') || 'Get Time'}"></label>
    <block type="rtc_get_formatted"></block>
    <block type="rtc_get_component"></block>
  </category>`,

  // 設定保存 NVS / EEPROM (BP3-3/BP3-4, 2026-04-20 追加)
  storage_nvs: `
  <category id="storageNvs" name="${cat('storageNvs')}" colour="#795548">
    <label text="${label('preferences') || 'Preferences (NVS)'}"></label>
    <block type="preferences_begin"></block>
    <block type="preferences_put"></block>
    <block type="preferences_get"></block>
    <block type="preferences_remove"></block>
    <block type="preferences_clear"></block>
    <block type="preferences_end"></block>
    <sep></sep>
    <label text="${label('eeprom') || 'EEPROM'}"></label>
    <block type="eeprom_write"></block>
    <block type="eeprom_read"></block>
  </category>`,

  // ファイルシステム SD / LittleFS (BP3-5/BP3-6, 2026-04-20 追加)
  storage_fs: `
  <category id="storageFs" name="${cat('storageFs')}" colour="#FF9800">
    <label text="${label('sdCard') || 'SD Card'}"></label>
    <block type="sd_begin"></block>
    <block type="sd_write"></block>
    <block type="sd_read"></block>
    <block type="sd_exists"></block>
    <block type="sd_delete"></block>
    <block type="sd_csv_append"></block>
    <sep></sep>
    <label text="${label('littlefs') || 'LittleFS'}"></label>
    <block type="fs_mount"></block>
    <block type="fs_write"></block>
    <block type="fs_read"></block>
    <block type="fs_exists"></block>
    <block type="fs_delete"></block>
  </category>`,

  // 割り込み・タイマー (BP2-1, 2026-04-20 追加)
  interrupt: `
  <category id="interrupt" name="${cat('interrupt')}" colour="#E91E63">
    <label text="${label('pinInterrupt') || 'Pin Interrupt'}"></label>
    <block type="attach_interrupt"></block>
    <block type="detach_interrupt"></block>
    <block type="check_interrupt"></block>
    <sep></sep>
    <label text="${label('ticker') || 'Ticker (ESP32)'}"></label>
    <block type="ticker_attach"></block>
    <block type="ticker_detach"></block>
    <block type="check_ticker"></block>
  </category>`,

  // I2C / SPI 通信 (BP2-2, 2026-04-20 追加)
  i2c_spi: `
  <category id="i2cSpi" name="${cat('i2cSpi')}" colour="#4CAF50">
    <label text="I2C"></label>
    <block type="i2c_scan"></block>
    <block type="i2c_write">
      <value name="ADDR"><shadow type="math_number"><field name="NUM">0x27</field></shadow></value>
      <value name="DATA"><shadow type="math_number"><field name="NUM">0</field></shadow></value>
    </block>
    <block type="i2c_read">
      <value name="ADDR"><shadow type="math_number"><field name="NUM">0x27</field></shadow></value>
      <value name="COUNT"><shadow type="math_number"><field name="NUM">1</field></shadow></value>
    </block>
    <block type="i2c_write_register">
      <value name="ADDR"><shadow type="math_number"><field name="NUM">0x68</field></shadow></value>
      <value name="REG"><shadow type="math_number"><field name="NUM">0x00</field></shadow></value>
      <value name="VALUE"><shadow type="math_number"><field name="NUM">0</field></shadow></value>
    </block>
    <block type="i2c_read_register">
      <value name="ADDR"><shadow type="math_number"><field name="NUM">0x68</field></shadow></value>
      <value name="REG"><shadow type="math_number"><field name="NUM">0x00</field></shadow></value>
    </block>
    <sep></sep>
    <label text="SPI"></label>
    <block type="spi_begin"></block>
    <block type="spi_transfer">
      <value name="DATA"><shadow type="math_number"><field name="NUM">0</field></shadow></value>
    </block>
  </category>`,

  // GPIO
  gpio: `
  <category id="gpio" name="${cat('gpio')}" colour="#9C27B0">
    <block type="esp32_pin_mode"></block>
    <block type="esp32_digital_write"></block>
    <block type="esp32_digital_read"></block>
    <block type="esp32_analog_read"></block>
    <block type="esp32_analog_write">
      <value name="VALUE"><shadow type="math_number"><field name="NUM">128</field></shadow></value>
    </block>
    <block type="esp32_builtin_led_on"></block>
    <block type="esp32_builtin_led_off"></block>
  </category>`,

  // サーボ
  servo: `
  <category id="servo" name="${cat('servo')}" colour="#FF5722">
    <block type="servo_attach"></block>
    <block type="servo_write"></block>
    <block type="servo_write_value"></block>
    <block type="servo_sweep"></block>
    <block type="servo_detach"></block>
  </category>`,

  // NeoPixel
  neopixel: `
  <category id="neopixel" name="${cat('neopixel')}" colour="#E91E63">
    <block type="neopixel_init"></block>
    <block type="neopixel_rainbow"></block>
    <block type="neopixel_color_simple"></block>
    <block type="neopixel_set_color">
      <value name="RED"><shadow type="math_number"><field name="NUM">255</field></shadow></value>
      <value name="GREEN"><shadow type="math_number"><field name="NUM">0</field></shadow></value>
      <value name="BLUE"><shadow type="math_number"><field name="NUM">0</field></shadow></value>
    </block>
    <block type="neopixel_show"></block>
    <block type="neopixel_clear"></block>
  </category>`,

  // ブザー
  buzzer: `
  <category id="buzzer" name="${cat('buzzer')}" colour="#8BC34A">
    <block type="buzzer_tone">
      <value name="FREQ_CUSTOM"><shadow type="math_number"><field name="NUM">440</field></shadow></value>
      <value name="DURATION"><shadow type="math_number"><field name="NUM">500</field></shadow></value>
    </block>
    <block type="buzzer_stop"></block>
    <block type="buzzer_melody"></block>
  </category>`,

  // ディスプレイ
  display: `
  <category id="display" name="${cat('display')}" colour="#3F51B5">
    <label text="OLED"></label>
    <block type="display_init"></block>
    <block type="display_text"></block>
    <block type="display_show"></block>
    <block type="display_clear"></block>
    <sep></sep>
    <label text="${label('lcdI2c') || 'LCD I2C'}"></label>
    <block type="lcd_init"></block>
    <block type="lcd_print"></block>
    <block type="lcd_print_at"></block>
    <block type="lcd_clear"></block>
    <block type="lcd_backlight"></block>
  </category>`,

  // ToF 距離センサー VL53L0X (BP5-4, 2026-04-20 追加)
  sensor_tof: `
  <category id="sensorTof" name="${cat('sensorTof')}" colour="#795548">
    <block type="vl53l0x_init"></block>
    <block type="vl53l0x_read_distance_mm"></block>
  </category>`,

  // 磁気エンコーダ AS5600 (BP5-5, 2026-04-20 追加)
  sensor_encoder_mag: `
  <category id="sensorEncoderMag" name="${cat('sensorEncoderMag')}" colour="#880E4F">
    <block type="as5600_init"></block>
    <block type="as5600_read_angle"></block>
    <block type="as5600_read_raw"></block>
  </category>`,

  // DHT温湿度センサー
  sensor_dht: `
  <category id="temperature" name="${cat('temperature')}" colour="#06b6d4">
    <block type="dht_init"></block>
    <block type="dht_temperature"></block>
    <block type="dht_humidity"></block>
  </category>`,

  // MQTT / Home Assistant
  mqtt: `
  <category id="mqttHa" name="${cat('mqttHa')}" colour="#00BCD4">
    <label text="${label('mqttSettings')}"></label>
    <block type="mqtt_setup"></block>
    <block type="mqtt_set_buffer_size"></block>
    <block type="mqtt_set_keepalive"></block>
    <sep></sep>
    <label text="${label('connection')}"></label>
    <block type="mqtt_connect"></block>
    <block type="mqtt_connect_with_lwt"></block>
    <block type="mqtt_disconnect"></block>
    <sep></sep>
    <label text="${label('lwtSettings')}"></label>
    <block type="mqtt_last_will"></block>
    <sep></sep>
    <label text="${label('send')}"></label>
    <block type="mqtt_publish"></block>
    <block type="mqtt_publish_qos"></block>
    <sep></sep>
    <label text="${label('receive')}"></label>
    <block type="mqtt_subscribe"></block>
    <block type="mqtt_unsubscribe"></block>
    <block type="mqtt_on_message"></block>
    <block type="mqtt_topic_value"></block>
    <block type="mqtt_message_value"></block>
    <sep></sep>
    <label text="${label('loopProcessing')}"></label>
    <block type="mqtt_loop"></block>
    <sep></sep>
    <label text="${label('statusCheck')}"></label>
    <block type="mqtt_is_connected"></block>
    <block type="mqtt_get_state"></block>
    <block type="wifi_is_connected"></block>
    <block type="wifi_reconnect"></block>
    <block type="wifi_get_ip"></block>
    <block type="wifi_get_rssi"></block>
  </category>`,

  // ArduinoHA（Home Assistant Auto Discovery）
  arduino_ha: `
  <category id="haAutoDiscovery" name="${cat('haAutoDiscovery')}" colour="#4CAF50">
    <label text="${label('deviceInit')}"></label>
    <block type="ha_device_init"></block>
    <block type="ha_device_init_auth"></block>
    <sep></sep>
    <label text="${label('sensor')}"></label>
    <block type="ha_sensor_create"></block>
    <block type="ha_sensor_update"></block>
    <sep></sep>
    <label text="${label('binarySensor')}"></label>
    <block type="ha_binary_sensor_create"></block>
    <block type="ha_binary_sensor_update"></block>
    <sep></sep>
    <label text="${label('switch')}"></label>
    <block type="ha_switch_create"></block>
    <block type="ha_switch_on_command"></block>
    <block type="ha_switch_set_state"></block>
    <sep></sep>
    <label text="${label('light')}"></label>
    <block type="ha_light_create"></block>
    <block type="ha_light_on_command"></block>
    <block type="ha_light_state"></block>
    <block type="ha_light_brightness"></block>
    <block type="ha_light_set_state"></block>
    <sep></sep>
    <label text="${label('rgbLight')}"></label>
    <block type="ha_light_create_rgb"></block>
    <block type="ha_light_on_rgb_command"></block>
    <block type="ha_light_rgb_r"></block>
    <block type="ha_light_rgb_g"></block>
    <block type="ha_light_rgb_b"></block>
    <block type="ha_light_set_rgb"></block>
    <sep></sep>
    <label text="${label('numberController')}"></label>
    <block type="ha_number_create"></block>
    <block type="ha_number_on_command"></block>
    <block type="ha_number_value"></block>
    <block type="ha_number_set_state"></block>
    <sep></sep>
    <label text="${label('fan')}"></label>
    <block type="ha_fan_create"></block>
    <block type="ha_fan_on_command"></block>
    <block type="ha_fan_state"></block>
    <block type="ha_fan_speed"></block>
    <block type="ha_fan_set_state"></block>
    <sep></sep>
    <label text="${label('cover')}"></label>
    <block type="ha_cover_create"></block>
    <block type="ha_cover_on_command"></block>
    <block type="ha_cover_set_state"></block>
    <sep></sep>
    <label text="${label('button')}"></label>
    <block type="ha_button_create"></block>
    <block type="ha_button_on_press"></block>
    <sep></sep>
    <label text="${label('deviceTrigger')}"></label>
    <block type="ha_device_trigger_create"></block>
    <block type="ha_device_trigger_fire"></block>
    <sep></sep>
    <label text="${label('scene')}"></label>
    <block type="ha_scene_create"></block>
    <block type="ha_scene_on_command"></block>
    <sep></sep>
    <label text="${label('tagScanner')}"></label>
    <block type="ha_tag_scanner_create"></block>
    <block type="ha_tag_scanner_scanned"></block>
    <sep></sep>
    <label text="${label('loopStatus')}"></label>
    <block type="ha_loop"></block>
    <block type="ha_is_connected"></block>
    <block type="ha_report_interval"></block>
  </category>`,

  // HTTPリクエスト
  http: `
  <category id="http" name="${cat('http')}" colour="#2196F3">
    <label text="${label('get')}"></label>
    <block type="http_get"></block>
    <block type="http_get_with_headers"></block>
    <sep></sep>
    <label text="${label('post')}"></label>
    <block type="http_post"></block>
    <block type="http_post_json"></block>
    <sep></sep>
    <label text="${label('putDelete')}"></label>
    <block type="http_put"></block>
    <block type="http_delete"></block>
    <sep></sep>
    <label text="${label('helper')}"></label>
    <block type="http_url_encode"></block>
    <block type="http_build_url"></block>
    <block type="http_is_success"></block>
  </category>`,

  // JSON
  json: `
  <category id="json" name="${cat('json')}" colour="#FF5722">
    <label text="${label('parse')}"></label>
    <block type="json_parse"></block>
    <block type="json_parse_size"></block>
    <sep></sep>
    <label text="${label('getValue')}"></label>
    <block type="json_get_string"></block>
    <block type="json_get_number"></block>
    <block type="json_get_int"></block>
    <block type="json_get_bool"></block>
    <block type="json_get_nested"></block>
    <block type="json_has_key"></block>
    <sep></sep>
    <label text="${label('array')}"></label>
    <block type="json_array_size"></block>
    <block type="json_array_get"></block>
    <sep></sep>
    <label text="${label('generate')}"></label>
    <block type="json_create_object"></block>
    <block type="json_set_string"></block>
    <block type="json_set_number"></block>
    <block type="json_set_bool"></block>
    <block type="json_to_string"></block>
    <block type="json_to_string_pretty"></block>
    <block type="json_simple"></block>
  </category>`,

  // WiFi 接続 (BP1-2c, 2026-04-20 追加)
  // supportsWifi が true のボード（ESP32 系 + Pico W + Nano RP2040 Connect）で表示。
  // wifi_connect ブロック単体のカテゴリ。既存 wifi_is_connected / wifi_reconnect /
  // wifi_get_ip / wifi_get_rssi は mqtt カテゴリ内に存続（リグレッション回避）。
  wifi: `
  <category id="wifi" name="${cat('wifi')}" colour="#00BCD4">
    <block type="wifi_connect"></block>
  </category>`,

  // OTA・ESP管理
  ota: `
  <category id="otaEsp" name="${cat('otaEsp')}" colour="#9C27B0">
    <label text="${label('otaSettings')}"></label>
    <block type="ota_setup"></block>
    <block type="ota_setup_simple"></block>
    <block type="ota_loop"></block>
    <block type="ota_get_hostname"></block>
    <sep></sep>
    <label text="${label('espControl')}"></label>
    <block type="esp_restart"></block>
    <block type="esp_deep_sleep"></block>
    <block type="esp_light_sleep"></block>
    <sep></sep>
    <label text="${label('espInfo')}"></label>
    <block type="esp_get_free_heap"></block>
    <block type="esp_get_chip_id"></block>
    <block type="esp_get_cpu_freq"></block>
    <block type="esp_get_flash_size"></block>
    <block type="esp_get_sketch_size"></block>
    <block type="esp_get_free_sketch_space"></block>
  </category>`,

  // デジタルセンサー（Otto Blocklyスタイル）
  sensor_digital: `
  <category id="digitalSensor" name="${cat('digitalSensor')}" colour="#f59e0b">
    <block type="button_sensor"></block>
    <block type="pir_sensor"></block>
    <block type="tilt_sensor"></block>
    <block type="vibration_sensor"></block>
    <block type="hall_sensor"></block>
    <block type="hall_sensor_esp32"></block>
    <block type="photo_interrupter"></block>
    <block type="ir_obstacle_sensor"></block>
    <block type="flame_sensor_digital"></block>
    <block type="gas_sensor_digital"></block>
    <block type="limit_switch"></block>
    <block type="digital_read"></block>
  </category>`,

  // アナログセンサー（Otto Blocklyスタイル）
  // 姿勢・慣性センサー MPU6050 (BP5-1, 2026-04-20 追加)
  sensor_motion: `
  <category id="sensorMotion" name="${cat('sensorMotion')}" colour="#FF5722">
    <label text="MPU6050"></label>
    <block type="mpu6050_init"></block>
    <block type="mpu6050_update"></block>
    <block type="mpu6050_read_accel"></block>
    <block type="mpu6050_read_gyro"></block>
    <block type="mpu6050_read_temperature"></block>
    <block type="mpu6050_get_angle"></block>
    <block type="mpu6050_calibrate"></block>
  </category>`,

  // 環境センサー BME280/BMP280 (BP5-2, 2026-04-20 追加)
  sensor_environment: `
  <category id="sensorEnvironment" name="${cat('sensorEnvironment')}" colour="#4CAF50">
    <label text="BME280 (温湿度・気圧)"></label>
    <block type="bme280_init"></block>
    <block type="bme280_read"></block>
    <sep></sep>
    <label text="BMP280 (気圧・高度)"></label>
    <block type="bmp280_init"></block>
    <block type="bmp280_read"></block>
    <block type="bmp280_read_altitude"></block>
  </category>`,

  sensor_analog: `
  <category id="analogSensor" name="${cat('analogSensor')}" colour="#10b981">
    <block type="potentiometer"></block>
    <block type="ldr_sensor"></block>
    <block type="thermistor_sensor"></block>
    <block type="lm35_sensor"></block>
    <block type="gas_sensor_analog"></block>
    <block type="soil_moisture_sensor"></block>
    <block type="water_level_sensor"></block>
    <block type="flame_sensor_analog"></block>
    <block type="ir_reflective_sensor"></block>
    <block type="joystick_sensor"></block>
    <block type="analog_read"></block>
    <sep></sep>
    <label text="${label('battery') || 'Battery'}"></label>
    <block type="battery_voltage"></block>
    <block type="battery_percentage"></block>
  </category>`,

  // ステッピングモーター
  stepper: `
  <category id="stepper" name="${cat('stepper')}" colour="#795548">
    <block type="stepper_init"></block>
    <block type="stepper_move"></block>
    <block type="stepper_rotate"></block>
    <block type="stepper_stop"></block>
  </category>`,

  // テキスト
  text: `
  <category id="text" name="${cat('text')}" colour="#14b8a6">
    <block type="text"><field name="TEXT"></field></block>
    <block type="text_join"></block>
    <block type="text_length">
      <value name="VALUE"><shadow type="text"><field name="TEXT">abc</field></shadow></value>
    </block>
  </category>`,

  // 配列（Otto Blocklyスタイル）
  lists: `
  <category id="lists" name="${cat('lists')}" colour="#FF8900">
    <block type="array_create">
      <field name="VAR">myArray</field>
      <field name="TYPE">int</field>
      <field name="DIM">1</field>
      <field name="INIT_TYPE">size</field>
      <value name="SIZE0"><shadow type="math_number"><field name="NUM">5</field></shadow></value>
    </block>
    <block type="array_set">
      <field name="VAR">myArray</field>
      <field name="DIM">1</field>
      <value name="INDEX0"><shadow type="math_number"><field name="NUM">0</field></shadow></value>
      <value name="VALUE"><shadow type="math_number"><field name="NUM">0</field></shadow></value>
    </block>
    <block type="array_get">
      <field name="VAR">myArray</field>
      <field name="DIM">1</field>
      <value name="INDEX0"><shadow type="math_number"><field name="NUM">0</field></shadow></value>
    </block>
    <block type="array_size">
      <field name="VAR">myArray</field>
    </block>
    <block type="array_content">
      <mutation items="3"></mutation>
      <field name="COUNT">3</field>
      <value name="ITEM0"><shadow type="math_number"><field name="NUM">1</field></shadow></value>
      <value name="ITEM1"><shadow type="math_number"><field name="NUM">2</field></shadow></value>
      <value name="ITEM2"><shadow type="math_number"><field name="NUM">3</field></shadow></value>
    </block>
  </category>`,

  // お気に入り設定（customモード専用）
  favorite_settings: `
  <category id="favoriteSettings" name="⚙️ ${cat('favoriteSettings')}" colour="#FFA500">
    <label text="${label('clickToOpenSettings')}"></label>
  </category>`,

  // 区切り線
  separator1: `<sep></sep>`,
  separator2: `<sep></sep>`,
  separator3: `<sep></sep>`,
  separator4: `<sep></sep>`,
  separator5: `<sep></sep>`,
  separator6: `<sep></sep>`,
  separator7: `<sep></sep>`,
  separator8: `<sep></sep>`,
});

// 各モードで表示するカテゴリの順序
const MODE_CATEGORY_ORDER: Record<RobotMode, string[]> = {
  robots_humanoid: [
    'arduino_core',
    'robot_humanoid',
    'separator1',
    // センサー（基本）
    'sensor_digital',
    'sensor_analog',
    'sensor_ultrasonic',
    'sensor_dht',
    // センサー（応用）
    'sensor_motion',
    'separator2',
    // アクチュエータ・表示・音声
    'servo',
    'buzzer',
    'neopixel',
    'display',
    'audio_dfplayer',
    'separator3',
    // 短距離無線
    'ble',
    'separator4',
    // 基本プログラミング
    'serial',
    'time',
    'logic',
    'loops',
    'math',
    'lists',
    'variables',
    'functions',
  ],
  robots_wheel: [
    'arduino_core',
    'robot_wheel',
    'separator1',
    // モーター・駆動系・制御
    'motor',
    'diff_drive',
    'encoder',
    'pid',
    'separator2',
    // センサー（基本）
    'sensor_digital',
    'sensor_analog',
    'sensor_ultrasonic',
    'sensor_dht',
    // センサー（応用: 競技ロボット）
    'sensor_line',
    'sensor_qtr',
    'sensor_wall',
    'sensor_motion',
    'separator3',
    // アクチュエータ・表示
    'servo',
    'stepper',
    'buzzer',
    'neopixel',
    'display',
    'separator4',
    // 永続化
    'storage_nvs',
    'separator5',
    // 基本プログラミング
    'serial',
    'time',
    'logic',
    'loops',
    'math',
    'lists',
    'variables',
    'functions',
  ],
  robots_transform: [
    'arduino_core',
    'robot_transform',
    'separator1',
    // センサー（基本）
    'sensor_digital',
    'sensor_analog',
    'sensor_ultrasonic',
    'sensor_dht',
    'sensor_motion',
    'separator2',
    // アクチュエータ・表示・音声
    'servo',
    'buzzer',
    'neopixel',
    'display',
    'audio_dfplayer',
    'separator3',
    // 短距離無線
    'ble',
    'separator4',
    // 基本プログラミング
    'serial',
    'time',
    'logic',
    'loops',
    'math',
    'lists',
    'variables',
    'functions',
  ],
  // micromouse と line_trace は robots_wheel に統合済み
  homeassistant: [
    'arduino_core',
    'separator1',
    // ネットワーク通信（IoT特化モードのため最優先）
    'wifi',
    'mqtt',
    'arduino_ha',
    'http',
    'json',
    'ota',
    'websocket',
    'separator2',
    // センサー（基礎 → 応用）
    'sensor_digital',
    'sensor_analog',
    'sensor_ultrasonic',
    'sensor_dht',
    'sensor_motion',
    'sensor_environment',
    'sensor_tof',
    'sensor_encoder_mag',
    'separator3',
    // アクチュエータ・表示・音声
    'servo',
    'stepper',
    'buzzer',
    'neopixel',
    'display',
    'tft_display',
    'camera',
    'audio_dfplayer',
    'separator4',
    // 短距離無線・識別
    'ble',
    'ir_remote',
    'rfid',
    'separator5',
    // GPIO・バス・割り込み
    'gpio',
    'interrupt',
    'i2c_spi',
    'uart_extra',
    'can_bus',
    'separator6',
    // シリアル・時間・永続化
    'serial',
    'time',
    'ntp_time',
    'rtc',
    'storage_nvs',
    'storage_fs',
    'separator7',
    // モーター・駆動系
    'motor',
    'diff_drive',
    'encoder',
    'pid',
    'separator8',
    // 基本プログラミング
    'logic',
    'loops',
    'math',
    'text',
    'lists',
    'variables',
    'functions',
  ],
  generic: [
    'arduino_core',
    'separator1',
    // センサー（基礎 → 応用）
    'sensor_digital',
    'sensor_analog',
    'sensor_ultrasonic',
    'sensor_dht',
    'sensor_motion',
    'sensor_environment',
    'sensor_tof',
    'sensor_encoder_mag',
    'separator2',
    // アクチュエータ・表示・音声
    'servo',
    'stepper',
    'buzzer',
    'neopixel',
    'display',
    'tft_display',
    'camera',
    'audio_dfplayer',
    'separator3',
    // ネットワーク通信
    'wifi',
    'mqtt',
    'arduino_ha',
    'http',
    'json',
    'ota',
    'websocket',
    'separator4',
    // 短距離無線・識別
    'ble',
    'ir_remote',
    'rfid',
    'separator5',
    // GPIO・バス・割り込み
    'gpio',
    'interrupt',
    'i2c_spi',
    'uart_extra',
    'can_bus',
    'separator6',
    // シリアル・時間・永続化
    'serial',
    'time',
    'ntp_time',
    'rtc',
    'storage_nvs',
    'storage_fs',
    'separator7',
    // 基本プログラミング
    'logic',
    'loops',
    'math',
    'text',
    'lists',
    'variables',
    'functions',
  ],
  all_blocks: [
    'arduino_core',
    // ロボットキット
    'robot_humanoid',
    'robot_wheel',
    'robot_transform',
    'separator1',
    // モーター・駆動系・制御
    'motor',
    'diff_drive',
    'encoder',
    'stepper',
    'pid',
    'separator2',
    // センサー（競技）
    'sensor_line',
    'sensor_qtr',
    'sensor_wall',
    // センサー（基礎 → 応用）
    'sensor_digital',
    'sensor_analog',
    'sensor_ultrasonic',
    'sensor_dht',
    'sensor_motion',
    'sensor_environment',
    'sensor_tof',
    'sensor_encoder_mag',
    'separator3',
    // アクチュエータ・表示・音声
    'servo',
    'buzzer',
    'neopixel',
    'display',
    'tft_display',
    'camera',
    'audio_dfplayer',
    'separator4',
    // ネットワーク通信
    'wifi',
    'mqtt',
    'arduino_ha',
    'http',
    'json',
    'ota',
    'websocket',
    'separator5',
    // 短距離無線・識別
    'ble',
    'ir_remote',
    'rfid',
    'separator6',
    // GPIO・バス・割り込み
    'gpio',
    'interrupt',
    'i2c_spi',
    'uart_extra',
    'can_bus',
    'separator7',
    // シリアル・時間・永続化
    'serial',
    'time',
    'ntp_time',
    'rtc',
    'storage_nvs',
    'storage_fs',
    'separator8',
    // 基本プログラミング
    'logic',
    'loops',
    'math',
    'text',
    'lists',
    'variables',
    'functions',
  ],
  custom: [
    'arduino_core',
    'favorite_settings',
    'separator1',
    // ロボットキット
    'robot_humanoid',
    'robot_wheel',
    'robot_transform',
    'separator2',
    // モーター・駆動系・制御
    'motor',
    'diff_drive',
    'encoder',
    'stepper',
    'pid',
    'separator3',
    // センサー（競技）
    'sensor_line',
    'sensor_qtr',
    'sensor_wall',
    // センサー（基礎 → 応用）
    'sensor_digital',
    'sensor_analog',
    'sensor_ultrasonic',
    'sensor_dht',
    'sensor_motion',
    'sensor_environment',
    'sensor_tof',
    'sensor_encoder_mag',
    'separator4',
    // アクチュエータ・表示・音声
    'servo',
    'buzzer',
    'neopixel',
    'display',
    'tft_display',
    'camera',
    'audio_dfplayer',
    'separator5',
    // ネットワーク通信
    'wifi',
    'mqtt',
    'arduino_ha',
    'http',
    'json',
    'ota',
    'websocket',
    'separator6',
    // 短距離無線・識別
    'ble',
    'ir_remote',
    'rfid',
    'separator7',
    // GPIO・バス・割り込み
    'gpio',
    'interrupt',
    'i2c_spi',
    'uart_extra',
    'can_bus',
    'separator8',
    // シリアル・時間・永続化
    'serial',
    'time',
    'ntp_time',
    'rtc',
    'storage_nvs',
    'storage_fs',
    // 基本プログラミング
    'logic',
    'loops',
    'math',
    'text',
    'lists',
    'variables',
    'functions',
  ],
};

/**
 * 指定されたロボットモードに応じたツールボックスXMLを生成
 * @param mode ロボットモード
 * @param favoriteCategories お気に入りカテゴリのID配列（customモードの場合のみ使用）
 * @param board 選択中ボードの定義（省略可）。指定時は supportsWifi/supportsOta/supportsBle
 *              に応じて対応外カテゴリを除外する。省略時は全カテゴリ表示（既存挙動）。
 */
export function generateToolbox(
  mode: RobotMode,
  favoriteCategories: string[] = [],
  board?: BoardDefinition
): string {
  let categories: string[];

  // お気に入りモードの場合、お気に入りカテゴリを使用
  if (mode === 'custom' && favoriteCategories.length > 0) {
    // arduino_coreは常に最初に表示
    categories = ['arduino_core', 'separator1', ...favoriteCategories];
  } else {
    categories = MODE_CATEGORY_ORDER[mode] || MODE_CATEGORY_ORDER.custom;
  }

  // 可視性フィルタ (2026-04-20 BP1-2c)
  // ボード対応フラグに基づき、選択中ボードでサポートされないカテゴリを除外する。
  // 将来 BLE 専用カテゴリ (BP4) が追加されたら BLE_CATEGORIES を同様に判定する。
  if (board) {
    const WIFI_CATEGORIES = new Set(['wifi', 'mqtt', 'arduino_ha', 'http', 'ntp_time', 'websocket']);
    const OTA_CATEGORIES = new Set(['ota']);
    const BLE_CATEGORIES = new Set(['ble']);
    categories = categories.filter(catId => {
      if (!board.supportsWifi && WIFI_CATEGORIES.has(catId)) return false;
      if (!board.supportsOta && OTA_CATEGORIES.has(catId)) return false;
      if (!board.supportsBle && BLE_CATEGORIES.has(catId)) return false;
      return true;
    });
  }

  // 毎回新しく翻訳を取得（言語切り替え時に対応）
  const toolboxCategories = getToolboxCategories();

  const categoryXml = categories
    .map(catId => toolboxCategories[catId] || '')
    .filter(xml => xml.length > 0)
    .join('\n');

  return `
<xml xmlns="https://developers.google.com/blockly/xml" id="toolbox" style="display: none">
${categoryXml}
</xml>`;
}

/**
 * 全てのモード情報を取得（UI用）
 */
export function getAllModes() {
  return Object.values(ROBOT_MODES);
}
