// Blockly ツールボックス定義 - MicroPython用
export const basicToolbox = `
<xml xmlns="https://developers.google.com/blockly/xml" id="toolbox" style="display: none">
  <category name="ロジック" colour="#5C81A6">
    <block type="controls_if"></block>
    <block type="controls_ifelse"></block>
    <block type="logic_compare">
      <field name="OP">EQ</field>
    </block>
    <block type="logic_operation">
      <field name="OP">AND</field>
    </block>
    <block type="logic_negate"></block>
    <block type="logic_boolean">
      <field name="BOOL">TRUE</field>
    </block>
    <block type="logic_null"></block>
    <block type="logic_ternary"></block>
  </category>
  <category name="ループ" colour="#5CA65C">
    <block type="controls_repeat_ext">
      <value name="TIMES">
        <shadow type="math_number">
          <field name="NUM">10</field>
        </shadow>
      </value>
    </block>
    <block type="controls_whileUntil">
      <field name="MODE">WHILE</field>
    </block>
    <block type="controls_for">
      <field name="VAR">i</field>
      <value name="FROM">
        <shadow type="math_number">
          <field name="NUM">1</field>
        </shadow>
      </value>
      <value name="TO">
        <shadow type="math_number">
          <field name="NUM">10</field>
        </shadow>
      </value>
      <value name="BY">
        <shadow type="math_number">
          <field name="NUM">1</field>
        </shadow>
      </value>
    </block>
    <block type="controls_forEach"></block>
    <block type="controls_flow_statements">
      <field name="FLOW">BREAK</field>
    </block>
  </category>
  <category name="数学" colour="#5C68A6">
    <block type="math_number">
      <field name="NUM">0</field>
    </block>
    <block type="math_arithmetic">
      <field name="OP">ADD</field>
      <value name="A">
        <shadow type="math_number">
          <field name="NUM">1</field>
        </shadow>
      </value>
      <value name="B">
        <shadow type="math_number">
          <field name="NUM">1</field>
        </shadow>
      </value>
    </block>
    <block type="math_single">
      <field name="OP">ROOT</field>
      <value name="NUM">
        <shadow type="math_number">
          <field name="NUM">9</field>
        </shadow>
      </value>
    </block>
    <block type="math_trig">
      <field name="OP">SIN</field>
      <value name="NUM">
        <shadow type="math_number">
          <field name="NUM">45</field>
        </shadow>
      </value>
    </block>
    <block type="math_constant">
      <field name="CONSTANT">PI</field>
    </block>
    <block type="math_number_property">
      <field name="PROPERTY">EVEN</field>
      <value name="NUMBER_TO_CHECK">
        <shadow type="math_number">
          <field name="NUM">0</field>
        </shadow>
      </value>
    </block>
    <block type="math_round">
      <field name="OP">ROUND</field>
      <value name="NUM">
        <shadow type="math_number">
          <field name="NUM">3.1</field>
        </shadow>
      </value>
    </block>
    <block type="math_modulo">
      <value name="DIVIDEND">
        <shadow type="math_number">
          <field name="NUM">64</field>
        </shadow>
      </value>
      <value name="DIVISOR">
        <shadow type="math_number">
          <field name="NUM">10</field>
        </shadow>
      </value>
    </block>
    <block type="math_constrain">
      <value name="VALUE">
        <shadow type="math_number">
          <field name="NUM">50</field>
        </shadow>
      </value>
      <value name="LOW">
        <shadow type="math_number">
          <field name="NUM">1</field>
        </shadow>
      </value>
      <value name="HIGH">
        <shadow type="math_number">
          <field name="NUM">100</field>
        </shadow>
      </value>
    </block>
    <block type="math_random_int">
      <value name="FROM">
        <shadow type="math_number">
          <field name="NUM">1</field>
        </shadow>
      </value>
      <value name="TO">
        <shadow type="math_number">
          <field name="NUM">100</field>
        </shadow>
      </value>
    </block>
    <block type="math_random_float"></block>
  </category>
  <category name="テキスト" colour="#5CA68D">
    <block type="text">
      <field name="TEXT"></field>
    </block>
    <block type="text_multiline">
      <field name="TEXT"></field>
    </block>
    <block type="text_join"></block>
    <block type="text_append">
      <value name="TEXT">
        <shadow type="text"></shadow>
      </value>
    </block>
    <block type="text_length">
      <value name="VALUE">
        <shadow type="text">
          <field name="TEXT">abc</field>
        </shadow>
      </value>
    </block>
    <block type="text_isEmpty">
      <value name="VALUE">
        <shadow type="text">
          <field name="TEXT"></field>
        </shadow>
      </value>
    </block>
    <block type="text_indexOf">
      <field name="END">FIRST</field>
      <value name="VALUE">
        <block type="text">
          <field name="TEXT">abc</field>
        </block>
      </value>
      <value name="FIND">
        <shadow type="text">
          <field name="TEXT">b</field>
        </shadow>
      </value>
    </block>
    <block type="text_charAt">
      <field name="WHERE">FROM_START</field>
      <value name="VALUE">
        <block type="text">
          <field name="TEXT">abc</field>
        </block>
      </value>
    </block>
    <block type="text_getSubstring">
      <field name="WHERE1">FROM_START</field>
      <field name="WHERE2">FROM_START</field>
      <value name="STRING">
        <block type="text">
          <field name="TEXT">abc</field>
        </block>
      </value>
    </block>
    <block type="text_changeCase">
      <field name="CASE">UPPERCASE</field>
      <value name="TEXT">
        <shadow type="text">
          <field name="TEXT">abc</field>
        </shadow>
      </value>
    </block>
    <block type="text_trim">
      <field name="MODE">BOTH</field>
      <value name="TEXT">
        <shadow type="text">
          <field name="TEXT">abc</field>
        </shadow>
      </value>
    </block>
    <block type="text_print">
      <value name="TEXT">
        <shadow type="text">
          <field name="TEXT">abc</field>
        </shadow>
      </value>
    </block>
  </category>
  <category name="変数" colour="#A65C81" custom="VARIABLE"></category>
  <category name="関数" colour="#9A5CA6" custom="PROCEDURE"></category>
  <category name="配列" colour="#745CA6">
    <block type="lists_create_with">
      <mutation items="0"></mutation>
    </block>
    <block type="lists_create_with">
      <mutation items="3"></mutation>
    </block>
    <block type="lists_repeat">
      <value name="NUM">
        <shadow type="math_number">
          <field name="NUM">5</field>
        </shadow>
      </value>
    </block>
    <block type="lists_length"></block>
    <block type="lists_isEmpty"></block>
    <block type="lists_indexOf">
      <field name="END">FIRST</field>
      <value name="VALUE">
        <block type="lists_create_with">
          <mutation items="3"></mutation>
        </block>
      </value>
    </block>
    <block type="lists_getIndex">
      <field name="MODE">GET</field>
      <field name="WHERE">FROM_START</field>
      <value name="VALUE">
        <block type="lists_create_with">
          <mutation items="3"></mutation>
        </block>
      </value>
    </block>
    <block type="lists_setIndex">
      <field name="MODE">SET</field>
      <field name="WHERE">FROM_START</field>
      <value name="LIST">
        <block type="lists_create_with">
          <mutation items="3"></mutation>
        </block>
      </value>
    </block>
    <block type="lists_getSublist">
      <field name="WHERE1">FROM_START</field>
      <field name="WHERE2">FROM_START</field>
      <value name="LIST">
        <block type="lists_create_with">
          <mutation items="3"></mutation>
        </block>
      </value>
    </block>
    <block type="lists_split">
      <field name="MODE">SPLIT</field>
      <value name="DELIM">
        <shadow type="text">
          <field name="TEXT">,</field>
        </shadow>
      </value>
    </block>
    <block type="lists_sort">
      <field name="TYPE">NUMERIC</field>
      <field name="DIRECTION">1</field>
    </block>
    <block type="lists_reverse"></block>
  </category>
  <category name="色" colour="#A5745C">
    <block type="colour_picker">
      <field name="COLOUR">#ff0000</field>
    </block>
    <block type="colour_random"></block>
    <block type="colour_rgb">
      <value name="RED">
        <shadow type="math_number">
          <field name="NUM">100</field>
        </shadow>
      </value>
      <value name="GREEN">
        <shadow type="math_number">
          <field name="NUM">50</field>
        </shadow>
      </value>
      <value name="BLUE">
        <shadow type="math_number">
          <field name="NUM">0</field>
        </shadow>
      </value>
    </block>
    <block type="colour_blend">
      <value name="COLOUR1">
        <shadow type="colour_picker">
          <field name="COLOUR">#ff0000</field>
        </shadow>
      </value>
      <value name="COLOUR2">
        <shadow type="colour_picker">
          <field name="COLOUR">#0000ff</field>
        </shadow>
      </value>
      <value name="RATIO">
        <shadow type="math_number">
          <field name="NUM">0.5</field>
        </shadow>
      </value>
    </block>
  </category>
  <sep></sep>
  <category name="ESP32 - 基本（無料）" colour="#2196F3">
    <block type="esp32_digital_write"></block>
    <block type="esp32_digital_read"></block>
    <block type="esp32_delay">
      <value name="TIME">
        <shadow type="math_number">
          <field name="NUM">1000</field>
        </shadow>
      </value>
    </block>
    <block type="esp32_print">
      <value name="VALUE">
        <shadow type="text">
          <field name="TEXT">Hello</field>
        </shadow>
      </value>
    </block>
    <block type="esp32_while_true"></block>
  </category>
  <category name="ESP32 - 拡張（無料）" colour="#4CAF50">
    <label text="アナログIO・PWM"></label>
    <block type="esp32_analog_read"></block>
    <block type="esp32_pwm_write">
      <value name="VALUE">
        <shadow type="math_number">
          <field name="NUM">512</field>
        </shadow>
      </value>
    </block>
    <block type="esp32_pwm_setup">
      <value name="FREQ">
        <shadow type="math_number">
          <field name="NUM">1000</field>
        </shadow>
      </value>
    </block>
    <sep></sep>
    <label text="WiFi"></label>
    <block type="esp32_wifi_connect">
      <value name="SSID">
        <shadow type="text">
          <field name="TEXT">YourSSID</field>
        </shadow>
      </value>
      <value name="PASSWORD">
        <shadow type="text">
          <field name="TEXT">password</field>
        </shadow>
      </value>
    </block>
    <block type="esp32_wifi_disconnect"></block>
    <sep></sep>
    <label text="時間・LED・センサー"></label>
    <block type="esp32_time_sleep">
      <value name="TIME">
        <shadow type="math_number">
          <field name="NUM">1</field>
        </shadow>
      </value>
    </block>
    <block type="esp32_led_on"></block>
    <block type="esp32_led_off"></block>
    <block type="esp32_button_pressed"></block>
    <block type="esp32_temperature"></block>
  </category>
  <category name="🤖 OTTO 2足歩行（無料）" colour="#FF6B35">
    <block type="otto_init"></block>
    <block type="otto_home"></block>
    <sep></sep>
    <label text="移動"></label>
    <block type="otto_walk"></block>
    <block type="otto_turn"></block>
    <block type="otto_jump"></block>
    <block type="otto_moonwalk"></block>
    <sep></sep>
    <label text="ジェスチャー"></label>
    <block type="otto_dance"></block>
    <block type="otto_swing"></block>
    <block type="otto_bend"></block>
  </category>
  <category name="🚗 OTTO Wheel（無料）" colour="#4CAF50">
    <block type="otto_wheel_init"></block>
    <block type="otto_wheel_forward"></block>
    <block type="otto_wheel_backward"></block>
    <block type="otto_wheel_turn_left"></block>
    <block type="otto_wheel_turn_right"></block>
    <block type="otto_wheel_spin_left"></block>
    <block type="otto_wheel_spin_right"></block>
    <block type="otto_wheel_stop"></block>
  </category>
  <category name="🐱 OTTO Ninja（無料）" colour="#9C27B0">
    <label text="初期化・設定"></label>
    <block type="otto_ninja_init"></block>
    <block type="otto_ninja_mode"></block>
    <block type="otto_ninja_transform"></block>
    <block type="otto_ninja_align"></block>
    <block type="otto_ninja_calibrate"></block>
    <block type="otto_ninja_home"></block>
    <sep></sep>
    <label text="歩行 (Walk)"></label>
    <block type="otto_ninja_walk"></block>
    <block type="otto_ninja_walk_power"></block>
    <block type="otto_ninja_turn"></block>
    <block type="otto_ninja_trot"></block>
    <block type="otto_ninja_stop"></block>
    <sep></sep>
    <label text="走行 (Roll)"></label>
    <block type="otto_ninja_roll"></block>
    <block type="otto_ninja_roll_power"></block>
    <block type="otto_ninja_roll_rotate"></block>
    <sep></sep>
    <label text="ジェスチャー"></label>
    <block type="otto_ninja_pushup"></block>
    <block type="otto_ninja_lateral"></block>
    <block type="otto_ninja_dance"></block>
  </category>
  <category name="📡 センサー（無料）" colour="#FF9800">
    <label text="HC-SR04 超音波センサー"></label>
    <block type="ultrasonic_init"></block>
    <block type="ultrasonic_distance"></block>
    <sep gap="32"></sep>
    <label text="RUS-04 超音波センサー (RGB内蔵)"></label>
    <block type="otto_ultrasonic_init"></block>
    <block type="otto_ultrasonic_distance"></block>
    <label text="RUS-04 RGB LED制御"></label>
    <block type="otto_ultrasonic_both_simple"></block>
    <block type="otto_ultrasonic_rgb"></block>
    <block type="otto_ultrasonic_eye"></block>
    <block type="otto_ultrasonic_brightness"></block>
    <block type="otto_ultrasonic_off"></block>
    <sep gap="32"></sep>
    <label text="温湿度センサー"></label>
    <block type="dht_init"></block>
    <block type="dht_temperature"></block>
    <block type="dht_humidity"></block>
  </category>
  <category name="🔊 音声（無料）" colour="#8BC34A">
    <block type="buzzer_tone">
      <value name="FREQ_CUSTOM">
        <shadow type="math_number">
          <field name="NUM">440</field>
        </shadow>
      </value>
      <value name="DURATION">
        <shadow type="math_number">
          <field name="NUM">500</field>
        </shadow>
      </value>
    </block>
    <block type="buzzer_stop"></block>
    <block type="buzzer_melody"></block>
  </category>
  <category name="💡 NeoPixel（無料）" colour="#E91E63">
    <label text="初期化"></label>
    <block type="neopixel_init"></block>
    <sep></sep>
    <label text="エフェクト"></label>
    <block type="neopixel_rainbow"></block>
    <block type="neopixel_bounce"></block>
    <block type="neopixel_cycle"></block>
    <sep></sep>
    <label text="色設定（簡単）"></label>
    <block type="neopixel_color_simple"></block>
    <block type="neopixel_light_simple"></block>
    <sep></sep>
    <label text="色設定（RGB詳細）"></label>
    <block type="neopixel_set_color">
      <value name="RED">
        <shadow type="math_number">
          <field name="NUM">255</field>
        </shadow>
      </value>
      <value name="GREEN">
        <shadow type="math_number">
          <field name="NUM">0</field>
        </shadow>
      </value>
      <value name="BLUE">
        <shadow type="math_number">
          <field name="NUM">0</field>
        </shadow>
      </value>
    </block>
    <block type="neopixel_set_all">
      <value name="RED">
        <shadow type="math_number">
          <field name="NUM">255</field>
        </shadow>
      </value>
      <value name="GREEN">
        <shadow type="math_number">
          <field name="NUM">0</field>
        </shadow>
      </value>
      <value name="BLUE">
        <shadow type="math_number">
          <field name="NUM">0</field>
        </shadow>
      </value>
    </block>
    <block type="neopixel_show"></block>
    <block type="neopixel_clear"></block>
    <block type="neopixel_brightness">
      <value name="BRIGHTNESS">
        <shadow type="math_number">
          <field name="NUM">50</field>
        </shadow>
      </value>
    </block>
  </category>
  <category name="🔒 ESP32 - プレミアム" colour="#FFD700">
    <block type="esp32_i2c_scan"></block>
    <block type="esp32_spi_transfer">
      <value name="DATA">
        <shadow type="text">
          <field name="TEXT">Hello</field>
        </shadow>
      </value>
    </block>
    <block type="esp32_neopixel_set">
      <value name="INDEX">
        <shadow type="math_number">
          <field name="NUM">0</field>
        </shadow>
      </value>
      <value name="R">
        <shadow type="math_number">
          <field name="NUM">255</field>
        </shadow>
      </value>
      <value name="G">
        <shadow type="math_number">
          <field name="NUM">0</field>
        </shadow>
      </value>
      <value name="B">
        <shadow type="math_number">
          <field name="NUM">0</field>
        </shadow>
      </value>
    </block>
    <block type="esp32_servo_angle">
      <value name="ANGLE">
        <shadow type="math_number">
          <field name="NUM">90</field>
        </shadow>
      </value>
    </block>
    <block type="esp32_ultrasonic_distance"></block>
  </category>
  <sep></sep>
  <category name="🎛️ Servo（無料）" colour="#FF5722">
    <block type="servo_attach"></block>
    <block type="servo_write"></block>
    <block type="servo_write_value"></block>
    <block type="servo_sweep"></block>
    <block type="servo_detach"></block>
  </category>
  <category name="🚗 Motor（無料）" colour="#607D8B">
    <block type="motor_init"></block>
    <block type="motor_move"></block>
    <block type="motor_speed"></block>
    <block type="motor_stop"></block>
  </category>
  <category name="🔩 Stepper（無料）" colour="#795548">
    <block type="stepper_init"></block>
    <block type="stepper_move"></block>
    <block type="stepper_rotate"></block>
    <block type="stepper_stop"></block>
  </category>
  <category name="📺 Display（無料）" colour="#3F51B5">
    <block type="display_init"></block>
    <block type="display_text"></block>
    <block type="display_show"></block>
    <block type="display_clear"></block>
    <block type="display_line"></block>
    <block type="display_rect"></block>
  </category>
</xml>
`;
