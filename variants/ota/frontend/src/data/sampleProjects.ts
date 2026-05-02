/**
 * Sample Projects for DigiCode
 * Pre-made Blockly templates for learning and quick start
 */

export interface SampleProject {
  id: string;
  title: string;
  description: string;
  category: 'basic' | 'sensor' | 'motor' | 'robots' | 'advanced' | 'iot';
  language: 'arduino';
  blocklyXml: string;
}

export const sampleProjects: SampleProject[] = [
  // Basic examples
  {
    id: 'led-blink',
    title: 'LED点滅（Lチカ）',
    description: 'LEDを1秒間隔で点滅させる基本プログラム',
    category: 'basic',
    language: 'arduino',
    blocklyXml: `<xml xmlns="https://developers.google.com/blockly/xml"><block type="arduino_setup" x="50" y="50"><statement name="SETUP"><block type="esp32_pin_mode"><field name="PIN">2</field><field name="MODE">OUTPUT</field></block></statement></block><block type="arduino_loop" x="50" y="250"><statement name="LOOP"><block type="esp32_digital_write"><field name="PIN">2</field><field name="VALUE">HIGH</field><next><block type="esp32_delay"><value name="TIME"><block type="math_number"><field name="NUM">1000</field></block></value><next><block type="esp32_digital_write"><field name="PIN">2</field><field name="VALUE">LOW</field><next><block type="esp32_delay"><value name="TIME"><block type="math_number"><field name="NUM">1000</field></block></value></block></next></block></next></block></next></block></statement></block></xml>`
  },
  {
    id: 'serial-hello',
    title: 'シリアル通信',
    description: 'シリアルモニタに"Hello DigiCode!"を出力',
    category: 'basic',
    language: 'arduino',
    blocklyXml: `<xml xmlns="https://developers.google.com/blockly/xml">
      <block type="arduino_setup" x="50" y="50">
<statement name="SETUP">
          <block type="esp32_serial_begin">
            <field name="BAUD">115200</field>
          </block>
        </statement>
</block>
<block type="arduino_loop" x="50" y="250">
<statement name="LOOP">
          <block type="esp32_serial_println">
            <value name="VALUE">
              <block type="text">
                <field name="TEXT">Hello DigiCode!</field>
              </block>
            </value>
            <next>
              <block type="esp32_delay">
                <value name="TIME">
                  <block type="math_number">
                    <field name="NUM">1000</field>
                  </block>
                </value>
              </block>
            </next>
          </block>
        </statement>
</block>
    </xml>`
  },
  // Sensor examples
  {
    id: 'ultrasonic-distance',
    title: '超音波距離センサー',
    description: 'HC-SR04で距離を測定してシリアル出力',
    category: 'sensor',
    language: 'arduino',
    blocklyXml: `<xml xmlns="https://developers.google.com/blockly/xml">
      <block type="arduino_setup" x="50" y="50">
<statement name="SETUP">
          <block type="esp32_serial_begin">
            <field name="BAUD">115200</field>
            <next>
              <block type="ultrasonic_init">
                <field name="TRIG_PIN">18</field>
                <field name="ECHO_PIN">19</field>
              </block>
            </next>
          </block>
        </statement>
</block>
<block type="arduino_loop" x="50" y="250">
<statement name="LOOP">
          <block type="esp32_serial_print">
            <value name="VALUE">
              <block type="text">
                <field name="TEXT">Distance: </field>
              </block>
            </value>
            <next>
              <block type="esp32_serial_print">
                <value name="VALUE">
                  <block type="ultrasonic_distance"></block>
                </value>
                <next>
                  <block type="esp32_serial_println">
                    <value name="VALUE">
                      <block type="text">
                        <field name="TEXT"> cm</field>
                      </block>
                    </value>
                    <next>
                      <block type="esp32_delay">
                        <value name="TIME">
                          <block type="math_number">
                            <field name="NUM">500</field>
                          </block>
                        </value>
                      </block>
                    </next>
                  </block>
                </next>
              </block>
            </next>
          </block>
        </statement>
</block>
    </xml>`
  },
  {
    id: 'dht-sensor',
    title: '温湿度センサー',
    description: 'DHTセンサーで温度と湿度を測定',
    category: 'sensor',
    language: 'arduino',
    blocklyXml: `<xml xmlns="https://developers.google.com/blockly/xml">
      <block type="arduino_setup" x="50" y="50">
<statement name="SETUP">
          <block type="esp32_serial_begin">
            <field name="BAUD">115200</field>
            <next>
              <block type="dht_init">
                <field name="PIN">4</field>
                <field name="TYPE">DHT11</field>
              </block>
            </next>
          </block>
        </statement>
</block>
<block type="arduino_loop" x="50" y="250">
<statement name="LOOP">
          <block type="esp32_serial_print">
            <value name="VALUE">
              <block type="text">
                <field name="TEXT">Temp: </field>
              </block>
            </value>
            <next>
              <block type="esp32_serial_print">
                <value name="VALUE">
                  <block type="dht_temperature"></block>
                </value>
                <next>
                  <block type="esp32_serial_print">
                    <value name="VALUE">
                      <block type="text">
                        <field name="TEXT">C, Humidity: </field>
                      </block>
                    </value>
                    <next>
                      <block type="esp32_serial_print">
                        <value name="VALUE">
                          <block type="dht_humidity"></block>
                        </value>
                        <next>
                          <block type="esp32_serial_println">
                            <value name="VALUE">
                              <block type="text">
                                <field name="TEXT">%</field>
                              </block>
                            </value>
                            <next>
                              <block type="esp32_delay">
                                <value name="TIME">
                                  <block type="math_number">
                                    <field name="NUM">2000</field>
                                  </block>
                                </value>
                              </block>
                            </next>
                          </block>
                        </next>
                      </block>
                    </next>
                  </block>
                </next>
              </block>
            </next>
          </block>
        </statement>
</block>
    </xml>`
  },
  // Motor examples
  {
    id: 'servo-sweep',
    title: 'サーボスイープ',
    description: 'サーボモーターを0度から180度まで往復させる',
    category: 'motor',
    language: 'arduino',
    blocklyXml: `<xml xmlns="https://developers.google.com/blockly/xml">
      <block type="arduino_setup" x="50" y="50">
        <statement name="SETUP">
          <block type="servo_attach">
            <field name="PIN">13</field>
          </block>
        </statement>
      </block>
      <block type="arduino_loop" x="50" y="250">
        <statement name="LOOP">
          <block type="servo_sweep">
            <field name="PIN">13</field>
            <value name="START"><block type="math_number"><field name="NUM">0</field></block></value>
            <value name="END"><block type="math_number"><field name="NUM">180</field></block></value>
            <value name="SPEED"><block type="math_number"><field name="NUM">15</field></block></value>
            <next>
              <block type="servo_sweep">
                <field name="PIN">13</field>
                <value name="START"><block type="math_number"><field name="NUM">180</field></block></value>
                <value name="END"><block type="math_number"><field name="NUM">0</field></block></value>
                <value name="SPEED"><block type="math_number"><field name="NUM">15</field></block></value>
              </block>
            </next>
          </block>
        </statement>
      </block>
    </xml>`
  },
  {
    id: 'neopixel-rainbow',
    title: 'NeoPixel レインボー',
    description: 'NeoPixel LEDで虹色を表示',
    category: 'motor',
    language: 'arduino',
    blocklyXml: `<xml xmlns="https://developers.google.com/blockly/xml">
      <block type="arduino_setup" x="50" y="50">
        <statement name="SETUP">
          <block type="neopixel_init">
            <field name="PIN">5</field>
            <field name="NUM_LEDS">8</field>
          </block>
        </statement>
      </block>
      <block type="arduino_loop" x="50" y="250">
        <statement name="LOOP">
          <block type="neopixel_rainbow">
            <field name="SPEED">normal</field>
            <next>
              <block type="esp32_delay">
                <value name="TIME">
                  <block type="math_number">
                    <field name="NUM">100</field>
                  </block>
                </value>
              </block>
            </next>
          </block>
        </statement>
      </block>
    </xml>`
  },
  // Robots examples
  {
    id: 'wheel-obstacle',
    title: 'Wheel 障害物回避',
    description: '超音波センサーで障害物を検知して回避',
    category: 'robots',
    language: 'arduino',
    blocklyXml: `<xml xmlns="https://developers.google.com/blockly/xml">
      <block type="arduino_setup" x="50" y="50">
<statement name="SETUP">
          <block type="wheel_init">
            <field name="PIN_L">14</field>
            <field name="PIN_R">13</field>
            <next>
              <block type="ultrasonic_init">
                <field name="TRIG_PIN">18</field>
                <field name="ECHO_PIN">19</field>
              </block>
            </next>
          </block>
        </statement>
</block>
<block type="arduino_loop" x="50" y="250">
<statement name="LOOP">
          <block type="controls_if">
            <value name="IF0">
              <block type="logic_compare">
                <field name="OP">LT</field>
                <value name="A">
                  <block type="ultrasonic_distance"></block>
                </value>
                <value name="B">
                  <block type="math_number">
                    <field name="NUM">20</field>
                  </block>
                </value>
              </block>
            </value>
            <statement name="DO0">
              <block type="wheel_stop">
                <next>
                  <block type="wheel_backward">
                    <field name="SPEED">50</field>
                    <next>
                      <block type="esp32_delay">
                        <value name="TIME">
                          <block type="math_number">
                            <field name="NUM">500</field>
                          </block>
                        </value>
                        <next>
                          <block type="wheel_spin_right">
                            <next>
                              <block type="esp32_delay">
                                <value name="TIME">
                                  <block type="math_number">
                                    <field name="NUM">300</field>
                                  </block>
                                </value>
                              </block>
                            </next>
                          </block>
                        </next>
                      </block>
                    </next>
                  </block>
                </next>
              </block>
            </statement>
            <next>
              <block type="wheel_forward">
                <field name="SPEED">50</field>
                <next>
                  <block type="esp32_delay">
                    <value name="TIME">
                      <block type="math_number">
                        <field name="NUM">100</field>
                      </block>
                    </value>
                  </block>
                </next>
              </block>
            </next>
          </block>
        </statement>
</block>
    </xml>`
  },
  {
    id: 'transform-ninja',
    title: 'Transform トランスフォーム',
    description: 'Walk/Rollモードを切り替えながら移動',
    category: 'robots',
    language: 'arduino',
    blocklyXml: `<xml xmlns="https://developers.google.com/blockly/xml">
      <block type="arduino_setup" x="50" y="50">
<statement name="SETUP">
          <block type="transform_init">
            <field name="PIN_LL">27</field>
            <field name="PIN_RL">15</field>
            <field name="PIN_LF">14</field>
            <field name="PIN_RF">13</field>
          </block>
        </statement>
</block>
<block type="arduino_loop" x="50" y="250">
<statement name="LOOP">
          <block type="transform_shift">
            <field name="MODE">walk</field>
            <next>
              <block type="transform_walk">
                <field name="DIRECTION">forward</field>
                <field name="SPEED">normal</field>
                <next>
                  <block type="transform_walk">
                    <field name="DIRECTION">forward</field>
                    <field name="SPEED">normal</field>
                    <next>
                      <block type="esp32_delay">
                        <value name="TIME">
                          <block type="math_number">
                            <field name="NUM">1000</field>
                          </block>
                        </value>
                        <next>
                          <block type="transform_shift">
                            <field name="MODE">roll</field>
                            <next>
                              <block type="transform_roll">
                                <field name="DIRECTION">forward</field>
                                <field name="SPEED">normal</field>
                                <next>
                                  <block type="esp32_delay">
                                    <value name="TIME">
                                      <block type="math_number">
                                        <field name="NUM">2000</field>
                                      </block>
                                    </value>
                                    <next>
                                      <block type="transform_stop">
                                        <field name="MODE">roll</field>
                                        <next>
                                          <block type="esp32_delay">
                                            <value name="TIME">
                                              <block type="math_number">
                                                <field name="NUM">1000</field>
                                              </block>
                                            </value>
                                          </block>
                                        </next>
                                      </block>
                                    </next>
                                  </block>
                                </next>
                              </block>
                            </next>
                          </block>
                        </next>
                      </block>
                    </next>
                  </block>
                </next>
              </block>
            </next>
          </block>
        </statement>
</block>
    </xml>`
  },
  {
    id: 'humanoid-dance',
    title: 'Humanoid ダンス',
    description: 'Humanoidに様々なダンスをさせる',
    category: 'robots',
    language: 'arduino',
    blocklyXml: `<xml xmlns="https://developers.google.com/blockly/xml">
      <block type="arduino_setup" x="50" y="50">
<statement name="SETUP">
          <block type="humanoid_init">
            <field name="PIN_LL">27</field>
            <field name="PIN_RL">15</field>
            <field name="PIN_LF">14</field>
            <field name="PIN_RF">13</field>
          </block>
        </statement>
</block>
<block type="arduino_loop" x="50" y="250">
<statement name="LOOP">
          <block type="humanoid_home">
            <next>
              <block type="esp32_delay">
                <value name="TIME">
                  <block type="math_number">
                    <field name="NUM">1000</field>
                  </block>
                </value>
                <next>
                  <block type="humanoid_dance">
                    <field name="STEPS">4</field>
                    <next>
                      <block type="humanoid_swing">
                        <field name="STEPS">4</field>
                        <next>
                          <block type="humanoid_moonwalk">
                            <field name="STEPS">4</field>
                            <field name="DIRECTION">1</field>
                            <next>
                              <block type="humanoid_jump">
                                <field name="STEPS">2</field>
                                <next>
                                  <block type="esp32_delay">
                                    <value name="TIME">
                                      <block type="math_number">
                                        <field name="NUM">2000</field>
                                      </block>
                                    </value>
                                  </block>
                                </next>
                              </block>
                            </next>
                          </block>
                        </next>
                      </block>
                    </next>
                  </block>
                </next>
              </block>
            </next>
          </block>
        </statement>
</block>
    </xml>`
  },
  // Competition robot examples
  // IoT / Home Assistant examples
  {
    id: 'ha-led-control',
    title: 'Home Assistant LED制御',
    description: 'MQTTでHome AssistantからLEDをON/OFF制御',
    category: 'iot',
    language: 'arduino',
    blocklyXml: `<xml xmlns="https://developers.google.com/blockly/xml">
      <block type="arduino_setup" x="50" y="50">
<statement name="SETUP">
          <block type="mqtt_setup">
            <field name="SSID">your_ssid</field>
            <field name="WIFI_PASS">your_password</field>
            <field name="BROKER">192.168.1.100</field>
            <field name="PORT">1883</field>
            <field name="CLIENT_ID">esp32_led</field>
            <next>
              <block type="esp32_pin_mode">
                <field name="PIN">2</field>
                <field name="MODE">OUTPUT</field>
                <next>
                  <block type="esp32_serial_begin">
                    <field name="BAUD">115200</field>
                    <next>
                      <block type="mqtt_connect">
                        <field name="USERNAME"></field>
                        <field name="PASSWORD"></field>
                        <next>
                          <block type="mqtt_subscribe">
                            <field name="TOPIC">home/esp32/led/set</field>
                          </block>
                        </next>
                      </block>
                    </next>
                  </block>
                </next>
              </block>
            </next>
          </block>
        </statement>
</block>
<block type="arduino_loop" x="50" y="250">
<statement name="LOOP">
          <block type="mqtt_loop">
          </block>
        </statement>
</block>
      <block type="mqtt_on_message" x="50" y="400">
        <statement name="CALLBACK">
          <block type="esp32_serial_print">
            <value name="VALUE">
              <block type="text">
                <field name="TEXT">Received: </field>
              </block>
            </value>
            <next>
              <block type="esp32_serial_println">
                <value name="VALUE">
                  <block type="mqtt_message_value"></block>
                </value>
                <next>
                  <block type="controls_if">
                    <mutation else="1"></mutation>
                    <value name="IF0">
                      <block type="logic_compare">
                        <field name="OP">EQ</field>
                        <value name="A">
                          <block type="mqtt_message_value"></block>
                        </value>
                        <value name="B">
                          <block type="text">
                            <field name="TEXT">ON</field>
                          </block>
                        </value>
                      </block>
                    </value>
                    <statement name="DO0">
                      <block type="esp32_digital_write">
                        <field name="PIN">2</field>
                        <field name="VALUE">HIGH</field>
                        <next>
                          <block type="mqtt_publish">
                            <field name="TOPIC">home/esp32/led/state</field>
                            <value name="MESSAGE">
                              <block type="text">
                                <field name="TEXT">ON</field>
                              </block>
                            </value>
                          </block>
                        </next>
                      </block>
                    </statement>
                    <statement name="ELSE">
                      <block type="esp32_digital_write">
                        <field name="PIN">2</field>
                        <field name="VALUE">LOW</field>
                        <next>
                          <block type="mqtt_publish">
                            <field name="TOPIC">home/esp32/led/state</field>
                            <value name="MESSAGE">
                              <block type="text">
                                <field name="TEXT">OFF</field>
                              </block>
                            </value>
                          </block>
                        </next>
                      </block>
                    </statement>
                  </block>
                </next>
              </block>
            </next>
          </block>
        </statement>
      </block>
    </xml>`
  },
  // Home Assistant Auto Discovery サンプル
  {
    id: 'ha-temperature-sensor',
    title: 'HA温度センサー',
    description: 'Home Assistantに温度センサーを自動登録',
    category: 'iot',
    language: 'arduino',
    blocklyXml: `<xml xmlns="https://developers.google.com/blockly/xml">
      <block type="arduino_setup" x="50" y="50">
<statement name="SETUP">
          <block type="esp32_serial_begin">
            <field name="BAUD">115200</field>
            <next>
              <block type="ha_device_init">
                <field name="SSID">your_ssid</field>
                <field name="WIFI_PASS">your_password</field>
                <field name="BROKER">192.168.1.100</field>
                <field name="PORT">1883</field>
                <field name="DEVICE_NAME">温度センサー</field>
                <field name="DEVICE_ID">temp_sensor</field>
                <next>
                  <block type="ha_sensor_create">
                    <field name="SENSOR_ID">temperature</field>
                    <field name="NAME">室温</field>
                    <field name="DEVICE_CLASS">temperature</field>
                    <field name="UNIT">°C</field>
                  </block>
                </next>
              </block>
            </next>
          </block>
        </statement>
</block>
<block type="arduino_loop" x="50" y="250">
<statement name="LOOP">
          <block type="ha_report_interval">
            <value name="INTERVAL">
              <block type="math_number">
                <field name="NUM">30</field>
              </block>
            </value>
            <statement name="CALLBACK">
              <block type="ha_sensor_update">
                <field name="SENSOR_ID">temperature</field>
                <value name="VALUE">
                  <block type="math_number">
                    <field name="NUM">25</field>
                  </block>
                </value>
              </block>
            </statement>
            <next>
              <block type="ha_loop"></block>
            </next>
          </block>
        </statement>
</block>
    </xml>`
  },
  {
    id: 'ha-smart-relay',
    title: 'HAスマートリレー',
    description: 'Home Assistantから制御できるスマートリレー',
    category: 'iot',
    language: 'arduino',
    blocklyXml: `<xml xmlns="https://developers.google.com/blockly/xml">
      <block type="arduino_setup" x="50" y="50">
<statement name="SETUP">
          <block type="esp32_serial_begin">
            <field name="BAUD">115200</field>
            <next>
              <block type="esp32_pin_mode">
                <field name="PIN">5</field>
                <field name="MODE">OUTPUT</field>
                <next>
                  <block type="ha_device_init">
                    <field name="SSID">your_ssid</field>
                    <field name="WIFI_PASS">your_password</field>
                    <field name="BROKER">192.168.1.100</field>
                    <field name="PORT">1883</field>
                    <field name="DEVICE_NAME">スマートプラグ</field>
                    <field name="DEVICE_ID">smart_plug</field>
                    <next>
                      <block type="ha_switch_create">
                        <field name="SWITCH_ID">relay</field>
                        <field name="NAME">コンセント</field>
                        <field name="ICON">mdi:power-plug</field>
                      </block>
                    </next>
                  </block>
                </next>
              </block>
            </next>
          </block>
        </statement>
</block>
<block type="arduino_loop" x="50" y="250">
<statement name="LOOP">
          <block type="ha_loop"></block>
        </statement>
</block>
      <block type="ha_switch_on_command" x="50" y="400">
        <field name="SWITCH_ID">relay</field>
        <statement name="ON_CALLBACK">
          <block type="esp32_digital_write">
            <field name="PIN">5</field>
            <field name="VALUE">HIGH</field>
          </block>
        </statement>
        <statement name="OFF_CALLBACK">
          <block type="esp32_digital_write">
            <field name="PIN">5</field>
            <field name="VALUE">LOW</field>
          </block>
        </statement>
      </block>
    </xml>`
  },
  {
    id: 'ha-rgb-led',
    title: 'HA RGB LED',
    description: 'Home AssistantからRGB LEDの色を制御',
    category: 'iot',
    language: 'arduino',
    blocklyXml: `<xml xmlns="https://developers.google.com/blockly/xml">
      <block type="arduino_setup" x="50" y="50">
<statement name="SETUP">
          <block type="esp32_serial_begin">
            <field name="BAUD">115200</field>
            <next>
              <block type="neopixel_init">
                <field name="PIN">4</field>
                <field name="NUM_LEDS">1</field>
                <next>
                  <block type="ha_device_init">
                    <field name="SSID">your_ssid</field>
                    <field name="WIFI_PASS">your_password</field>
                    <field name="BROKER">192.168.1.100</field>
                    <field name="PORT">1883</field>
                    <field name="DEVICE_NAME">デスクライト</field>
                    <field name="DEVICE_ID">desk_light</field>
                    <next>
                      <block type="ha_light_create_rgb">
                        <field name="LIGHT_ID">rgb_led</field>
                        <field name="NAME">RGB LED</field>
                      </block>
                    </next>
                  </block>
                </next>
              </block>
            </next>
          </block>
        </statement>
</block>
<block type="arduino_loop" x="50" y="250">
<statement name="LOOP">
          <block type="ha_loop"></block>
        </statement>
</block>
      <block type="ha_light_on_rgb_command" x="50" y="400">
        <field name="LIGHT_ID">rgb_led</field>
        <statement name="CALLBACK">
          <block type="neopixel_set_color">
            <field name="INDEX">0</field>
            <value name="RED">
              <block type="ha_light_rgb_r"></block>
            </value>
            <value name="GREEN">
              <block type="ha_light_rgb_g"></block>
            </value>
            <value name="BLUE">
              <block type="ha_light_rgb_b"></block>
            </value>
            <next>
              <block type="neopixel_show"></block>
            </next>
          </block>
        </statement>
      </block>
    </xml>`
  },
  {
    id: 'ha-multi-sensor',
    title: 'HA複合センサーノード',
    description: '温度・湿度・モーションの複合センサーノード',
    category: 'iot',
    language: 'arduino',
    blocklyXml: `<xml xmlns="https://developers.google.com/blockly/xml">
      <block type="arduino_setup" x="50" y="50">
<statement name="SETUP">
          <block type="esp32_serial_begin">
            <field name="BAUD">115200</field>
            <next>
              <block type="esp32_pin_mode">
                <field name="PIN">13</field>
                <field name="MODE">INPUT</field>
                <next>
                  <block type="ha_device_init">
                    <field name="SSID">your_ssid</field>
                    <field name="WIFI_PASS">your_password</field>
                    <field name="BROKER">192.168.1.100</field>
                    <field name="PORT">1883</field>
                    <field name="DEVICE_NAME">リビングセンサー</field>
                    <field name="DEVICE_ID">living_sensor</field>
                    <next>
                      <block type="ha_sensor_create">
                        <field name="SENSOR_ID">temperature</field>
                        <field name="NAME">温度</field>
                        <field name="DEVICE_CLASS">temperature</field>
                        <field name="UNIT">°C</field>
                        <next>
                          <block type="ha_sensor_create">
                            <field name="SENSOR_ID">humidity</field>
                            <field name="NAME">湿度</field>
                            <field name="DEVICE_CLASS">humidity</field>
                            <field name="UNIT">%</field>
                            <next>
                              <block type="ha_binary_sensor_create">
                                <field name="SENSOR_ID">motion</field>
                                <field name="NAME">人感センサー</field>
                                <field name="DEVICE_CLASS">motion</field>
                              </block>
                            </next>
                          </block>
                        </next>
                      </block>
                    </next>
                  </block>
                </next>
              </block>
            </next>
          </block>
        </statement>
</block>
<block type="arduino_loop" x="50" y="250">
<statement name="LOOP">
          <block type="ha_report_interval">
            <value name="INTERVAL">
              <block type="math_number">
                <field name="NUM">30</field>
              </block>
            </value>
            <statement name="CALLBACK">
              <block type="ha_sensor_update">
                <field name="SENSOR_ID">temperature</field>
                <value name="VALUE">
                  <block type="math_number">
                    <field name="NUM">25</field>
                  </block>
                </value>
                <next>
                  <block type="ha_sensor_update">
                    <field name="SENSOR_ID">humidity</field>
                    <value name="VALUE">
                      <block type="math_number">
                        <field name="NUM">60</field>
                      </block>
                    </value>
                    <next>
                      <block type="ha_binary_sensor_update">
                        <field name="SENSOR_ID">motion</field>
                        <value name="VALUE">
                          <block type="esp32_digital_read">
                            <field name="PIN">13</field>
                          </block>
                        </value>
                      </block>
                    </next>
                  </block>
                </next>
              </block>
            </statement>
            <next>
              <block type="ha_loop"></block>
            </next>
          </block>
        </statement>
</block>
    </xml>`
  },
  // ===== Phase 1 C 拡充 (2026-04-26): AI Few-shot 用 12 sample =====
  {
    id: 'temp-alert',
    title: '温度アラート',
    description: '温度センサーで30°Cを超えたらBLE送信、それ以外でLEDオフ',
    category: 'sensor',
    language: 'arduino',
    blocklyXml: `<xml xmlns="https://developers.google.com/blockly/xml"><block type="arduino_setup" x="50" y="50"><statement name="SETUP"><block type="dht_init"><field name="PIN">4</field><field name="TYPE">DHT22</field><next><block type="ble_uart_setup"><field name="NAME">TempAlert</field><next><block type="esp32_pin_mode"><field name="PIN">2</field><field name="MODE">OUTPUT</field></block></next></block></next></block></statement></block><block type="arduino_loop" x="50" y="250"><statement name="LOOP"><block type="controls_ifelse"><value name="IF0"><block type="logic_compare"><field name="OP">GT</field><value name="A"><block type="dht_temperature"></block></value><value name="B"><block type="math_number"><field name="NUM">30</field></block></value></block></value><statement name="DO0"><block type="ble_uart_write"><value name="TEXT"><block type="text_join"><value name="ADD0"><block type="text"><field name="TEXT">Alert: </field></block></value><value name="ADD1"><block type="dht_temperature"></block></value></block></value><next><block type="esp32_digital_write"><field name="PIN">2</field><field name="VALUE">HIGH</field></block></next></block></statement><statement name="ELSE"><block type="esp32_digital_write"><field name="PIN">2</field><field name="VALUE">LOW</field></block></statement><next><block type="esp32_delay"><value name="TIME"><block type="math_number"><field name="NUM">2000</field></block></value></block></next></block></statement></block></xml>`
  },
  {
    id: 'proximity-stop',
    title: '障害物検知停止',
    description: '超音波センサーで20cm以内に物体検知したら停止、それ以外で前進',
    category: 'sensor',
    language: 'arduino',
    blocklyXml: `<xml xmlns="https://developers.google.com/blockly/xml"><block type="arduino_setup" x="50" y="50"><statement name="SETUP"><block type="ultrasonic_init"><field name="TRIG_PIN">18</field><field name="ECHO_PIN">19</field><next><block type="wheel_init"><field name="PIN_L">14</field><field name="PIN_R">13</field></block></next></block></statement></block><block type="arduino_loop" x="50" y="250"><statement name="LOOP"><block type="controls_ifelse"><value name="IF0"><block type="logic_compare"><field name="OP">LT</field><value name="A"><block type="ultrasonic_distance"></block></value><value name="B"><block type="math_number"><field name="NUM">20</field></block></value></block></value><statement name="DO0"><block type="wheel_stop"></block></statement><statement name="ELSE"><block type="wheel_forward"><field name="SPEED">50</field></block></statement><next><block type="esp32_delay"><value name="TIME"><block type="math_number"><field name="NUM">100</field></block></value></block></next></block></statement></block></xml>`
  },
  {
    id: 'ble-uart-receive',
    title: 'BLE UART受信',
    description: 'BLEで受信したらLEDを200msフラッシュ',
    category: 'iot',
    language: 'arduino',
    blocklyXml: `<xml xmlns="https://developers.google.com/blockly/xml"><block type="arduino_setup" x="50" y="50"><statement name="SETUP"><block type="ble_uart_setup"><field name="NAME">LedControl</field><next><block type="esp32_pin_mode"><field name="PIN">2</field><field name="MODE">OUTPUT</field></block></next></block></statement></block><block type="arduino_loop" x="50" y="250"><statement name="LOOP"><block type="ble_uart_on_receive"><statement name="HANDLER"><block type="esp32_digital_write"><field name="PIN">2</field><field name="VALUE">HIGH</field><next><block type="esp32_delay"><value name="TIME"><block type="math_number"><field name="NUM">200</field></block></value><next><block type="esp32_digital_write"><field name="PIN">2</field><field name="VALUE">LOW</field></block></next></block></next></block></statement></block></statement></block></xml>`
  },
  {
    id: 'ble-uart-command-control',
    title: 'BLEコマンド制御',
    description: 'BLE受信値「ON」「OFF」でLEDを制御（受信値分岐の正規パターン）',
    category: 'iot',
    language: 'arduino',
    blocklyXml: `<xml xmlns="https://developers.google.com/blockly/xml"><block type="arduino_setup" x="50" y="50"><statement name="SETUP"><block type="ble_uart_setup"><field name="NAME">CommandLed</field><next><block type="esp32_pin_mode"><field name="PIN">2</field><field name="MODE">OUTPUT</field></block></next></block></statement></block><block type="arduino_loop" x="50" y="250"><statement name="LOOP"><block type="ble_uart_on_receive"><statement name="HANDLER"><block type="controls_if"><value name="IF0"><block type="logic_compare"><field name="OP">EQ</field><value name="A"><block type="ble_received_value"></block></value><value name="B"><block type="text"><field name="TEXT">ON</field></block></value></block></value><statement name="DO0"><block type="esp32_digital_write"><field name="PIN">2</field><field name="VALUE">HIGH</field></block></statement><next><block type="controls_if"><value name="IF0"><block type="logic_compare"><field name="OP">EQ</field><value name="A"><block type="ble_received_value"></block></value><value name="B"><block type="text"><field name="TEXT">OFF</field></block></value></block></value><statement name="DO0"><block type="esp32_digital_write"><field name="PIN">2</field><field name="VALUE">LOW</field></block></statement></block></next></block></statement></block></statement></block></xml>`
  },
  {
    id: 'ble-beacon-scanner',
    title: 'BLEビーコンスキャン',
    description: '近隣のBLEデバイスをスキャンしてシリアル出力',
    category: 'iot',
    language: 'arduino',
    blocklyXml: `<xml xmlns="https://developers.google.com/blockly/xml"><block type="arduino_setup" x="50" y="50"><statement name="SETUP"><block type="esp32_serial_begin"><field name="BAUD">115200</field><next><block type="ble_scan_start"><field name="DURATION">5</field></block></next></block></statement></block><block type="arduino_loop" x="50" y="250"><statement name="LOOP"><block type="ble_on_device_found"><statement name="HANDLER"><block type="esp32_serial_println"><value name="VALUE"><block type="text"><field name="TEXT">BLE device found</field></block></value></block></statement><next><block type="esp32_delay"><value name="TIME"><block type="math_number"><field name="NUM">1000</field></block></value></block></next></block></statement></block></xml>`
  },
  {
    id: 'ble-gatt-custom',
    title: 'BLE GATTカスタム',
    description: 'GATTカスタム characteristicを定期通知',
    category: 'iot',
    language: 'arduino',
    blocklyXml: `<xml xmlns="https://developers.google.com/blockly/xml"><block type="arduino_setup" x="50" y="50"><statement name="SETUP"><block type="ble_init"><field name="NAME">GattDemo</field><next><block type="ble_add_service"><field name="UUID">12345678-1234-1234-1234-123456789ABC</field><next><block type="ble_add_characteristic"><field name="SERVICE_UUID">12345678-1234-1234-1234-123456789ABC</field><field name="CHAR_UUID">00001111-1234-1234-1234-123456789ABC</field><field name="READ">TRUE</field><field name="WRITE">TRUE</field><field name="NOTIFY">TRUE</field><next><block type="ble_start_advertising"></block></next></block></next></block></next></block></statement></block><block type="arduino_loop" x="50" y="250"><statement name="LOOP"><block type="ble_notify"><field name="CHAR_UUID">00001111-1234-1234-1234-123456789ABC</field><value name="VALUE"><block type="text"><field name="TEXT">Hello</field></block></value><next><block type="esp32_delay"><value name="TIME"><block type="math_number"><field name="NUM">5000</field></block></value></block></next></block></statement></block></xml>`
  },
  {
    id: 'ble-gatt-command-control',
    title: 'BLE GATTコマンド制御',
    description: 'GATT Write受信値「ON」「OFF」でLEDを制御（GATTでの受信値分岐パターン）',
    category: 'iot',
    language: 'arduino',
    blocklyXml: `<xml xmlns="https://developers.google.com/blockly/xml"><block type="arduino_setup" x="50" y="50"><statement name="SETUP"><block type="ble_init"><field name="NAME">CmdGatt</field><next><block type="ble_add_service"><field name="UUID">12345678-1234-1234-1234-123456789ABC</field><next><block type="ble_add_characteristic"><field name="SERVICE_UUID">12345678-1234-1234-1234-123456789ABC</field><field name="CHAR_UUID">00001111-1234-1234-1234-123456789ABC</field><field name="READ">TRUE</field><field name="WRITE">TRUE</field><field name="NOTIFY">FALSE</field><next><block type="ble_start_advertising"><next><block type="esp32_pin_mode"><field name="PIN">2</field><field name="MODE">OUTPUT</field></block></next></block></next></block></next></block></next></block></statement></block><block type="arduino_loop" x="50" y="250"><statement name="LOOP"><block type="ble_on_write"><field name="CHAR_UUID">00001111-1234-1234-1234-123456789ABC</field><statement name="HANDLER"><block type="controls_if"><value name="IF0"><block type="logic_compare"><field name="OP">EQ</field><value name="A"><block type="ble_received_value"></block></value><value name="B"><block type="text"><field name="TEXT">ON</field></block></value></block></value><statement name="DO0"><block type="esp32_digital_write"><field name="PIN">2</field><field name="VALUE">HIGH</field></block></statement><next><block type="controls_if"><value name="IF0"><block type="logic_compare"><field name="OP">EQ</field><value name="A"><block type="ble_received_value"></block></value><value name="B"><block type="text"><field name="TEXT">OFF</field></block></value></block></value><statement name="DO0"><block type="esp32_digital_write"><field name="PIN">2</field><field name="VALUE">LOW</field></block></statement></block></next></block></statement></block></statement></block></xml>`
  },
  {
    id: 'ble-scan-filter-by-name',
    title: 'BLEスキャン名前フィルタ',
    description: 'スキャンで特定デバイス名を検出したらアドレスとRSSIをシリアル出力（スキャン結果値による分岐パターン）',
    category: 'iot',
    language: 'arduino',
    blocklyXml: `<xml xmlns="https://developers.google.com/blockly/xml"><block type="arduino_setup" x="50" y="50"><statement name="SETUP"><block type="esp32_serial_begin"><field name="BAUD">115200</field><next><block type="ble_scan_start"><field name="DURATION">10</field></block></next></block></statement></block><block type="arduino_loop" x="50" y="250"><statement name="LOOP"><block type="ble_on_device_found"><statement name="HANDLER"><block type="controls_if"><value name="IF0"><block type="logic_compare"><field name="OP">EQ</field><value name="A"><block type="ble_scan_found_name"></block></value><value name="B"><block type="text"><field name="TEXT">MyDevice</field></block></value></block></value><statement name="DO0"><block type="esp32_serial_println"><value name="VALUE"><block type="text"><field name="TEXT">MATCH</field></block></value><next><block type="esp32_serial_println"><value name="VALUE"><block type="ble_scan_found_address"></block></value><next><block type="esp32_serial_println"><value name="VALUE"><block type="ble_scan_found_rssi"></block></value></block></next></block></next></block></statement></block></statement></block></statement></block></xml>`
  },
  {
    id: 'humanoid-walk',
    title: 'Humanoid 歩行',
    description: 'Humanoidが前後に歩行する基本動作',
    category: 'robots',
    language: 'arduino',
    blocklyXml: `<xml xmlns="https://developers.google.com/blockly/xml"><block type="arduino_setup" x="50" y="50"><statement name="SETUP"><block type="humanoid_init"><field name="PIN_LL">27</field><field name="PIN_RL">15</field><field name="PIN_LF">14</field><field name="PIN_RF">13</field></block></statement></block><block type="arduino_loop" x="50" y="250"><statement name="LOOP"><block type="humanoid_home"><next><block type="esp32_delay"><value name="TIME"><block type="math_number"><field name="NUM">500</field></block></value><next><block type="humanoid_walk"><field name="STEPS">4</field><field name="DIRECTION">1</field><field name="SPEED">1000</field><next><block type="esp32_delay"><value name="TIME"><block type="math_number"><field name="NUM">1000</field></block></value><next><block type="humanoid_walk"><field name="STEPS">4</field><field name="DIRECTION">-1</field><field name="SPEED">1000</field><next><block type="esp32_delay"><value name="TIME"><block type="math_number"><field name="NUM">1000</field></block></value></block></next></block></next></block></next></block></next></block></next></block></statement></block></xml>`
  },
  {
    id: 'wheel-line-follow',
    title: 'Wheel ライントレース',
    description: '光センサーでラインに沿って前進',
    category: 'robots',
    language: 'arduino',
    blocklyXml: `<xml xmlns="https://developers.google.com/blockly/xml"><block type="arduino_setup" x="50" y="50"><statement name="SETUP"><block type="wheel_init"><field name="PIN_L">14</field><field name="PIN_R">13</field><next><block type="line_sensor_init_simple_2"><field name="PIN1">36</field><field name="PIN2">39</field></block></next></block></statement></block><block type="arduino_loop" x="50" y="250"><statement name="LOOP"><block type="controls_ifelse"><value name="IF0"><block type="logic_compare"><field name="OP">LT</field><value name="A"><block type="line_sensor_position"></block></value><value name="B"><block type="math_number"><field name="NUM">0</field></block></value></block></value><statement name="DO0"><block type="wheel_turn_left"></block></statement><statement name="ELSE"><block type="wheel_turn_right"></block></statement><next><block type="wheel_forward"><field name="SPEED">30</field><next><block type="esp32_delay"><value name="TIME"><block type="math_number"><field name="NUM">50</field></block></value></block></next></block></next></block></statement></block></xml>`
  },
  {
    id: 'transform-morph',
    title: 'Transform 形態変化',
    description: 'Walk → Roll の形態変化で移動',
    category: 'robots',
    language: 'arduino',
    blocklyXml: `<xml xmlns="https://developers.google.com/blockly/xml"><block type="arduino_setup" x="50" y="50"><statement name="SETUP"><block type="transform_init"><field name="PIN_LL">27</field><field name="PIN_RL">15</field><field name="PIN_LF">14</field><field name="PIN_RF">13</field></block></statement></block><block type="arduino_loop" x="50" y="250"><statement name="LOOP"><block type="transform_shift"><field name="MODE">walk</field><next><block type="transform_walk"><field name="DIRECTION">forward</field><field name="SPEED">normal</field><next><block type="esp32_delay"><value name="TIME"><block type="math_number"><field name="NUM">2000</field></block></value><next><block type="transform_shift"><field name="MODE">roll</field><next><block type="transform_roll"><field name="DIRECTION">forward</field><field name="SPEED">fast</field><next><block type="esp32_delay"><value name="TIME"><block type="math_number"><field name="NUM">2000</field></block></value><next><block type="transform_stop"><field name="MODE">roll</field></block></next></block></next></block></next></block></next></block></next></block></next></block></statement></block></xml>`
  },
  {
    id: 'http-get-request',
    title: 'HTTP GETリクエスト',
    description: 'HTTP GETでURLからデータ取得してシリアル出力',
    category: 'iot',
    language: 'arduino',
    blocklyXml: `<xml xmlns="https://developers.google.com/blockly/xml"><block type="arduino_setup" x="50" y="50"><statement name="SETUP"><block type="esp32_serial_begin"><field name="BAUD">115200</field><next><block type="wifi_connect"><field name="SSID">your_ssid</field><field name="PASSWORD">your_password</field></block></next></block></statement></block><block type="arduino_loop" x="50" y="250"><statement name="LOOP"><block type="esp32_serial_println"><value name="VALUE"><block type="http_get"><value name="URL"><block type="text"><field name="TEXT">http://example.com/api/data</field></block></value></block></value><next><block type="esp32_delay"><value name="TIME"><block type="math_number"><field name="NUM">10000</field></block></value></block></next></block></statement></block></xml>`
  },
  {
    id: 'mqtt-direct',
    title: 'MQTT直接publish',
    description: 'DHTセンサーの温度をMQTT brokerに直接publish (HA経由なし)',
    category: 'iot',
    language: 'arduino',
    blocklyXml: `<xml xmlns="https://developers.google.com/blockly/xml"><block type="arduino_setup" x="50" y="50"><statement name="SETUP"><block type="mqtt_setup"><field name="PORT">1883</field><field name="SSID">your_ssid</field><field name="WIFI_PASS">your_password</field><field name="BROKER">192.168.1.100</field><field name="CLIENT_ID">esp32_pub</field><next><block type="dht_init"><field name="PIN">4</field><field name="TYPE">DHT22</field><next><block type="mqtt_connect"><field name="USERNAME"></field><field name="PASSWORD"></field></block></next></block></next></block></statement></block><block type="arduino_loop" x="50" y="250"><statement name="LOOP"><block type="mqtt_loop"><next><block type="mqtt_publish"><field name="TOPIC">sensors/temperature</field><field name="RETAIN">FALSE</field><value name="MESSAGE"><block type="text_join"><value name="ADD0"><block type="text"><field name="TEXT">temp=</field></block></value><value name="ADD1"><block type="dht_temperature"></block></value></block></value><next><block type="esp32_delay"><value name="TIME"><block type="math_number"><field name="NUM">5000</field></block></value></block></next></block></next></block></statement></block></xml>`
  },
  {
    id: 'ntp-time-sync',
    title: 'NTP時刻同期',
    description: 'NTPで時刻同期して定期的にシリアル出力',
    category: 'iot',
    language: 'arduino',
    blocklyXml: `<xml xmlns="https://developers.google.com/blockly/xml"><block type="arduino_setup" x="50" y="50"><statement name="SETUP"><block type="esp32_serial_begin"><field name="BAUD">115200</field><next><block type="wifi_connect"><field name="SSID">your_ssid</field><field name="PASSWORD">your_password</field><next><block type="ntp_sync"><field name="TZ_OFFSET">32400</field><field name="SERVER">pool.ntp.org</field></block></next></block></next></block></statement></block><block type="arduino_loop" x="50" y="250"><statement name="LOOP"><block type="esp32_serial_println"><value name="VALUE"><block type="ntp_get_formatted"><field name="FORMAT">%Y-%m-%d %H:%M:%S</field></block></value><next><block type="esp32_delay"><value name="TIME"><block type="math_number"><field name="NUM">1000</field></block></value></block></next></block></statement></block></xml>`
  },
  {
    id: 'sensor-actuator-combo',
    title: 'センサー・アクチュエーター複合',
    description: '温度に応じてサーボ角度とLEDを制御する複合動作',
    category: 'sensor',
    language: 'arduino',
    blocklyXml: `<xml xmlns="https://developers.google.com/blockly/xml"><block type="arduino_setup" x="50" y="50"><statement name="SETUP"><block type="dht_init"><field name="PIN">4</field><field name="TYPE">DHT22</field><next><block type="servo_attach"><field name="PIN">13</field><next><block type="esp32_pin_mode"><field name="PIN">2</field><field name="MODE">OUTPUT</field></block></next></block></next></block></statement></block><block type="arduino_loop" x="50" y="250"><statement name="LOOP"><block type="controls_ifelse"><value name="IF0"><block type="logic_compare"><field name="OP">GT</field><value name="A"><block type="dht_temperature"></block></value><value name="B"><block type="math_number"><field name="NUM">25</field></block></value></block></value><statement name="DO0"><block type="servo_write"><field name="PIN">13</field><value name="ANGLE"><block type="math_number"><field name="NUM">180</field></block></value><next><block type="esp32_digital_write"><field name="PIN">2</field><field name="VALUE">HIGH</field></block></next></block></statement><statement name="ELSE"><block type="servo_write"><field name="PIN">13</field><value name="ANGLE"><block type="math_number"><field name="NUM">0</field></block></value><next><block type="esp32_digital_write"><field name="PIN">2</field><field name="VALUE">LOW</field></block></next></block></statement><next><block type="esp32_delay"><value name="TIME"><block type="math_number"><field name="NUM">3000</field></block></value></block></next></block></statement></block></xml>`
  },
  // ===== Phase 2 C 拡充 (2026-04-26): AI Few-shot 用 残 8 sample =====
  {
    id: 'humanoid-gesture',
    title: 'Humanoid ジェスチャー',
    description: 'Humanoidが手振り・喜び・マジックなど複数のジェスチャーを順に実行',
    category: 'robots',
    language: 'arduino',
    blocklyXml: `<xml xmlns="https://developers.google.com/blockly/xml"><block type="arduino_setup" x="50" y="50"><statement name="SETUP"><block type="humanoid_init"><field name="PIN_LL">27</field><field name="PIN_RL">15</field><field name="PIN_LF">14</field><field name="PIN_RF">13</field></block></statement></block><block type="arduino_loop" x="50" y="250"><statement name="LOOP"><block type="humanoid_home"><next><block type="humanoid_gesture"><field name="GESTURE">Wave</field><next><block type="esp32_delay"><value name="TIME"><block type="math_number"><field name="NUM">2000</field></block></value><next><block type="humanoid_gesture"><field name="GESTURE">Happy</field><next><block type="esp32_delay"><value name="TIME"><block type="math_number"><field name="NUM">2000</field></block></value><next><block type="humanoid_gesture"><field name="GESTURE">Magic</field><next><block type="esp32_delay"><value name="TIME"><block type="math_number"><field name="NUM">2000</field></block></value></block></next></block></next></block></next></block></next></block></next></block></next></block></statement></block></xml>`
  },
  {
    id: 'wheel-remote-control',
    title: 'Wheel リモコン操作',
    description: 'BLEで受信したらWheelロボットを1秒前進させて停止',
    category: 'robots',
    language: 'arduino',
    blocklyXml: `<xml xmlns="https://developers.google.com/blockly/xml"><block type="arduino_setup" x="50" y="50"><statement name="SETUP"><block type="ble_uart_setup"><field name="NAME">WheelRemote</field><next><block type="wheel_init"><field name="PIN_L">14</field><field name="PIN_R">13</field></block></next></block></statement></block><block type="arduino_loop" x="50" y="250"><statement name="LOOP"><block type="ble_uart_on_receive"><statement name="HANDLER"><block type="wheel_forward"><field name="SPEED">50</field><next><block type="esp32_delay"><value name="TIME"><block type="math_number"><field name="NUM">1000</field></block></value><next><block type="wheel_stop"></block></next></block></next></block></statement></block></statement></block></xml>`
  },
  {
    id: 'multi-sensor-dashboard',
    title: '複合センサーダッシュボード',
    description: '温度・湿度・距離の3センサー値をシリアルにダッシュボード形式で出力',
    category: 'iot',
    language: 'arduino',
    blocklyXml: `<xml xmlns="https://developers.google.com/blockly/xml"><block type="arduino_setup" x="50" y="50"><statement name="SETUP"><block type="esp32_serial_begin"><field name="BAUD">115200</field><next><block type="dht_init"><field name="PIN">4</field><field name="TYPE">DHT22</field><next><block type="ultrasonic_init"><field name="TRIG_PIN">18</field><field name="ECHO_PIN">19</field></block></next></block></next></block></statement></block><block type="arduino_loop" x="50" y="250"><statement name="LOOP"><block type="esp32_serial_print"><value name="VALUE"><block type="text"><field name="TEXT">T=</field></block></value><next><block type="esp32_serial_println"><value name="VALUE"><block type="dht_temperature"></block></value><next><block type="esp32_serial_print"><value name="VALUE"><block type="text"><field name="TEXT">H=</field></block></value><next><block type="esp32_serial_println"><value name="VALUE"><block type="dht_humidity"></block></value><next><block type="esp32_serial_print"><value name="VALUE"><block type="text"><field name="TEXT">Dist=</field></block></value><next><block type="esp32_serial_println"><value name="VALUE"><block type="ultrasonic_distance"></block></value><next><block type="esp32_delay"><value name="TIME"><block type="math_number"><field name="NUM">2000</field></block></value></block></next></block></next></block></next></block></next></block></next></block></next></block></statement></block></xml>`
  },
  {
    id: 'neopixel-animation',
    title: 'NeoPixel フェードアニメ',
    description: 'NeoPixelの明るさを0から255まで段階的に変化させるフェードアニメーション',
    category: 'motor',
    language: 'arduino',
    blocklyXml: `<xml xmlns="https://developers.google.com/blockly/xml"><block type="arduino_setup" x="50" y="50"><statement name="SETUP"><block type="neopixel_init"><field name="PIN">4</field><field name="NUM_LEDS">8</field></block></statement></block><block type="arduino_loop" x="50" y="250"><statement name="LOOP"><block type="controls_for"><field name="VAR">brightness</field><value name="FROM"><block type="math_number"><field name="NUM">0</field></block></value><value name="TO"><block type="math_number"><field name="NUM">255</field></block></value><value name="BY"><block type="math_number"><field name="NUM">5</field></block></value><statement name="DO"><block type="neopixel_set_color"><field name="INDEX">0</field><value name="RED"><block type="variables_get"><field name="VAR">brightness</field></block></value><value name="GREEN"><block type="math_number"><field name="NUM">0</field></block></value><value name="BLUE"><block type="math_number"><field name="NUM">100</field></block></value><next><block type="neopixel_show"><next><block type="esp32_delay"><value name="TIME"><block type="math_number"><field name="NUM">20</field></block></value></block></next></block></next></block></statement></block></statement></block></xml>`
  },
  {
    id: 'nvs-counter',
    title: 'NVS 起動回数カウンター',
    description: 'NVS (Preferences) で起動回数を永続化し、起動毎にインクリメント',
    category: 'basic',
    language: 'arduino',
    blocklyXml: `<xml xmlns="https://developers.google.com/blockly/xml"><block type="arduino_setup" x="50" y="50"><statement name="SETUP"><block type="esp32_serial_begin"><field name="BAUD">115200</field><next><block type="preferences_begin"><field name="NAMESPACE">counter</field><field name="READONLY">FALSE</field><next><block type="variables_set"><field name="VAR">count</field><value name="VALUE"><block type="math_arithmetic"><field name="OP">ADD</field><value name="A"><block type="preferences_get"><field name="TYPE">Int</field><field name="KEY">value</field><value name="DEFAULT"><block type="math_number"><field name="NUM">0</field></block></value></block></value><value name="B"><block type="math_number"><field name="NUM">1</field></block></value></block></value><next><block type="preferences_put"><field name="TYPE">Int</field><field name="KEY">value</field><value name="VALUE"><block type="variables_get"><field name="VAR">count</field></block></value><next><block type="preferences_end"></block></next></block></next></block></next></block></next></block></statement></block><block type="arduino_loop" x="50" y="250"><statement name="LOOP"><block type="esp32_serial_print"><value name="VALUE"><block type="text"><field name="TEXT">Boot count: </field></block></value><next><block type="esp32_serial_println"><value name="VALUE"><block type="variables_get"><field name="VAR">count</field></block></value><next><block type="esp32_delay"><value name="TIME"><block type="math_number"><field name="NUM">5000</field></block></value></block></next></block></next></block></statement></block></xml>`
  },
  {
    id: 'interrupt-button',
    title: 'ボタン割り込み',
    description: 'ボタン押下を割り込みで検出し、シリアルに通知 (FALLING / INPUT_PULLUP)',
    category: 'basic',
    language: 'arduino',
    blocklyXml: `<xml xmlns="https://developers.google.com/blockly/xml"><block type="arduino_setup" x="50" y="50"><statement name="SETUP"><block type="esp32_serial_begin"><field name="BAUD">115200</field><next><block type="esp32_pin_mode"><field name="PIN">5</field><field name="MODE">INPUT_PULLUP</field><next><block type="attach_interrupt"><field name="PIN">5</field><field name="MODE">FALLING</field><statement name="HANDLER"><block type="esp32_serial_println"><value name="VALUE"><block type="text"><field name="TEXT">Pressed</field></block></value></block></statement></block></next></block></next></block></statement></block><block type="arduino_loop" x="50" y="250"><statement name="LOOP"><block type="esp32_delay"><value name="TIME"><block type="math_number"><field name="NUM">100</field></block></value></block></statement></block></xml>`
  },
  {
    id: 'lcd-display',
    title: 'I2C LCD 文字表示',
    description: '16x2 I2C LCD に2行のメッセージを表示',
    category: 'motor',
    language: 'arduino',
    blocklyXml: `<xml xmlns="https://developers.google.com/blockly/xml"><block type="arduino_setup" x="50" y="50"><statement name="SETUP"><block type="lcd_init"><field name="COLS">16</field><field name="ROWS">2</field><field name="ADDR">0x27</field></block></statement></block><block type="arduino_loop" x="50" y="250"><statement name="LOOP"><block type="lcd_clear"><next><block type="lcd_print_at"><field name="X">0</field><field name="Y">0</field><value name="TEXT"><block type="text"><field name="TEXT">Hello</field></block></value><next><block type="lcd_print_at"><field name="X">0</field><field name="Y">1</field><value name="TEXT"><block type="text"><field name="TEXT">DigiCode!</field></block></value><next><block type="esp32_delay"><value name="TIME"><block type="math_number"><field name="NUM">2000</field></block></value></block></next></block></next></block></next></block></statement></block></xml>`
  },
  {
    id: 'dfplayer-music',
    title: 'DFPlayer 音楽再生',
    description: 'DFPlayer Mini で2トラックを順番に再生 (各10秒)',
    category: 'motor',
    language: 'arduino',
    blocklyXml: `<xml xmlns="https://developers.google.com/blockly/xml"><block type="arduino_setup" x="50" y="50"><statement name="SETUP"><block type="esp32_serial_begin"><field name="BAUD">115200</field><next><block type="controls_if"><value name="IF0"><block type="dfplayer_init"><field name="RX">14</field><field name="TX">12</field></block></value><statement name="DO0"><block type="dfplayer_volume"><field name="VOL">20</field></block></statement></block></next></block></statement></block><block type="arduino_loop" x="50" y="250"><statement name="LOOP"><block type="dfplayer_play"><field name="TRACK">1</field><next><block type="esp32_delay"><value name="TIME"><block type="math_number"><field name="NUM">10000</field></block></value><next><block type="dfplayer_play"><field name="TRACK">2</field><next><block type="esp32_delay"><value name="TIME"><block type="math_number"><field name="NUM">10000</field></block></value></block></next></block></next></block></next></block></statement></block></xml>`
  }
];

export const sampleCategories = {
  basic: { name: '基本', icon: '📚' },
  sensor: { name: 'センサー', icon: '📡' },
  motor: { name: 'モーター/LED', icon: '⚙️' },
  robots: { name: 'ロボット', icon: '🤖' },
  iot: { name: 'IoT/HA', icon: '🏠' },
};

export function getSamplesByCategory(category: string): SampleProject[] {
  return sampleProjects.filter(p => p.category === category);
}

export function getSampleById(id: string): SampleProject | undefined {
  return sampleProjects.find(p => p.id === id);
}
