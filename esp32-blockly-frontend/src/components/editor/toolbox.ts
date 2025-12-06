// Blockly ツールボックス定義 - MicroPython用
export const basicToolbox = `
<xml xmlns="https://developers.google.com/blockly/xml" id="toolbox" style="display: none">
  <category name="ロジック" colour="#5C81A6">
    <block type="controls_if"></block>
    <block type="logic_compare"></block>
    <block type="logic_operation"></block>
    <block type="logic_negate"></block>
    <block type="logic_boolean"></block>
  </category>
  <category name="ループ" colour="#5CA65C">
    <block type="controls_repeat_ext">
      <value name="TIMES">
        <shadow type="math_number">
          <field name="NUM">10</field>
        </shadow>
      </value>
    </block>
    <block type="controls_whileUntil"></block>
    <block type="controls_for">
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
    <block type="controls_flow_statements"></block>
  </category>
  <category name="数学" colour="#5C68A6">
    <block type="math_number">
      <field name="NUM">0</field>
    </block>
    <block type="math_arithmetic">
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
  </category>
  <category name="テキスト" colour="#5CA68D">
    <block type="text"></block>
    <block type="text_join"></block>
    <block type="text_length">
      <value name="VALUE">
        <shadow type="text">
          <field name="TEXT">abc</field>
        </shadow>
      </value>
    </block>
  </category>
  <category name="変数" colour="#A65C81" custom="VARIABLE"></category>
  <category name="関数" colour="#9A5CA6" custom="PROCEDURE"></category>
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
</xml>
`;
