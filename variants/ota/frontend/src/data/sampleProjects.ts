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
                    <value name="STEPS"><block type="math_number"><field name="NUM">4</field></block></value>
                    <next>
                      <block type="humanoid_swing">
                        <value name="STEPS"><block type="math_number"><field name="NUM">4</field></block></value>
                        <next>
                          <block type="humanoid_moonwalk">
                            <value name="STEPS"><block type="math_number"><field name="NUM">4</field></block></value>
                            <field name="DIRECTION">1</field>
                            <next>
                              <block type="humanoid_jump">
                                <value name="STEPS"><block type="math_number"><field name="NUM">2</field></block></value>
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
            <value name="PORT"><block type="math_number"><field name="NUM">1883</field></block></value>
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
    blocklyXml: `<xml xmlns="https://developers.google.com/blockly/xml"><block type="arduino_setup" x="50" y="50"><statement name="SETUP"><block type="esp32_serial_begin"><field name="BAUD">115200</field><next><block type="ble_scan_start"><value name="DURATION"><block type="math_number"><field name="NUM">5</field></block></value></block></next></block></statement></block><block type="arduino_loop" x="50" y="250"><statement name="LOOP"><block type="ble_on_device_found"><statement name="HANDLER"><block type="esp32_serial_println"><value name="VALUE"><block type="text"><field name="TEXT">BLE device found</field></block></value></block></statement><next><block type="esp32_delay"><value name="TIME"><block type="math_number"><field name="NUM">1000</field></block></value></block></next></block></statement></block></xml>`
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
    blocklyXml: `<xml xmlns="https://developers.google.com/blockly/xml"><block type="arduino_setup" x="50" y="50"><statement name="SETUP"><block type="esp32_serial_begin"><field name="BAUD">115200</field><next><block type="ble_scan_start"><value name="DURATION"><block type="math_number"><field name="NUM">10</field></block></value></block></next></block></statement></block><block type="arduino_loop" x="50" y="250"><statement name="LOOP"><block type="ble_on_device_found"><statement name="HANDLER"><block type="controls_if"><value name="IF0"><block type="logic_compare"><field name="OP">EQ</field><value name="A"><block type="ble_scan_found_name"></block></value><value name="B"><block type="text"><field name="TEXT">MyDevice</field></block></value></block></value><statement name="DO0"><block type="esp32_serial_println"><value name="VALUE"><block type="text"><field name="TEXT">MATCH</field></block></value><next><block type="esp32_serial_println"><value name="VALUE"><block type="ble_scan_found_address"></block></value><next><block type="esp32_serial_println"><value name="VALUE"><block type="ble_scan_found_rssi"></block></value></block></next></block></next></block></statement></block></statement></block></statement></block></xml>`
  },
  {
    id: 'humanoid-walk',
    title: 'Humanoid 歩行',
    description: 'Humanoidが前後に歩行する基本動作',
    category: 'robots',
    language: 'arduino',
    blocklyXml: `<xml xmlns="https://developers.google.com/blockly/xml"><block type="arduino_setup" x="50" y="50"><statement name="SETUP"><block type="humanoid_init"><field name="PIN_LL">27</field><field name="PIN_RL">15</field><field name="PIN_LF">14</field><field name="PIN_RF">13</field></block></statement></block><block type="arduino_loop" x="50" y="250"><statement name="LOOP"><block type="humanoid_home"><next><block type="esp32_delay"><value name="TIME"><block type="math_number"><field name="NUM">500</field></block></value><next><block type="humanoid_walk"><value name="STEPS"><block type="math_number"><field name="NUM">4</field></block></value><field name="DIRECTION">1</field><field name="SPEED">1000</field><next><block type="esp32_delay"><value name="TIME"><block type="math_number"><field name="NUM">1000</field></block></value><next><block type="humanoid_walk"><value name="STEPS"><block type="math_number"><field name="NUM">4</field></block></value><field name="DIRECTION">-1</field><field name="SPEED">1000</field><next><block type="esp32_delay"><value name="TIME"><block type="math_number"><field name="NUM">1000</field></block></value></block></next></block></next></block></next></block></next></block></next></block></statement></block></xml>`
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
    blocklyXml: `<xml xmlns="https://developers.google.com/blockly/xml"><block type="arduino_setup" x="50" y="50"><statement name="SETUP"><block type="mqtt_setup"><value name="PORT"><block type="math_number"><field name="NUM">1883</field></block></value><field name="SSID">your_ssid</field><field name="WIFI_PASS">your_password</field><field name="BROKER">192.168.1.100</field><field name="CLIENT_ID">esp32_pub</field><next><block type="dht_init"><field name="PIN">4</field><field name="TYPE">DHT22</field><next><block type="mqtt_connect"><field name="USERNAME"></field><field name="PASSWORD"></field></block></next></block></next></block></statement></block><block type="arduino_loop" x="50" y="250"><statement name="LOOP"><block type="mqtt_loop"><next><block type="mqtt_publish"><field name="TOPIC">sensors/temperature</field><field name="RETAIN">FALSE</field><value name="MESSAGE"><block type="text_join"><value name="ADD0"><block type="text"><field name="TEXT">temp=</field></block></value><value name="ADD1"><block type="dht_temperature"></block></value></block></value><next><block type="esp32_delay"><value name="TIME"><block type="math_number"><field name="NUM">5000</field></block></value></block></next></block></next></block></statement></block></xml>`
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
    blocklyXml: `<xml xmlns="https://developers.google.com/blockly/xml"><block type="arduino_setup" x="50" y="50"><statement name="SETUP"><block type="lcd_init"><field name="COLS">16</field><field name="ROWS">2</field><field name="ADDR">0x27</field></block></statement></block><block type="arduino_loop" x="50" y="250"><statement name="LOOP"><block type="lcd_clear"><next><block type="lcd_print_at"><value name="X"><block type="math_number"><field name="NUM">0</field></block></value><value name="Y"><block type="math_number"><field name="NUM">0</field></block></value><value name="TEXT"><block type="text"><field name="TEXT">Hello</field></block></value><next><block type="lcd_print_at"><value name="X"><block type="math_number"><field name="NUM">0</field></block></value><value name="Y"><block type="math_number"><field name="NUM">1</field></block></value><value name="TEXT"><block type="text"><field name="TEXT">DigiCode!</field></block></value><next><block type="esp32_delay"><value name="TIME"><block type="math_number"><field name="NUM">2000</field></block></value></block></next></block></next></block></next></block></statement></block></xml>`
  },
  {
    id: 'dfplayer-music',
    title: 'DFPlayer 音楽再生',
    description: 'DFPlayer Mini で2トラックを順番に再生 (各10秒)',
    category: 'motor',
    language: 'arduino',
    blocklyXml: `<xml xmlns="https://developers.google.com/blockly/xml"><block type="arduino_setup" x="50" y="50"><statement name="SETUP"><block type="esp32_serial_begin"><field name="BAUD">115200</field><next><block type="controls_if"><value name="IF0"><block type="dfplayer_init"><field name="RX">14</field><field name="TX">12</field></block></value><statement name="DO0"><block type="dfplayer_volume"><value name="VOL"><block type="math_number"><field name="NUM">20</field></block></value></block></statement></block></next></block></statement></block><block type="arduino_loop" x="50" y="250"><statement name="LOOP"><block type="dfplayer_play"><value name="TRACK"><block type="math_number"><field name="NUM">1</field></block></value><next><block type="esp32_delay"><value name="TIME"><block type="math_number"><field name="NUM">10000</field></block></value><next><block type="dfplayer_play"><value name="TRACK"><block type="math_number"><field name="NUM">2</field></block></value><next><block type="esp32_delay"><value name="TIME"><block type="math_number"><field name="NUM">10000</field></block></value></block></next></block></next></block></next></block></statement></block></xml>`
  },
  {
    // 47.md Phase 2 commit #7 (第73回): canonical FEW_SHOT for the WiFi
    // controller story. Mirrors the W4 UAT scenario (LED toggle + servo
    // slider + temperature display in one project). Drives AI generation
    // toward the correct ws_server block usage when prompts mention
    // "websocket / wifi controller / LAN control / ブラウザ制御" etc.
    //
    // Setup chain: wifi_connect → websocket_server_start (port 81) →
    //   register("led", bool W) → register("servo", uint8 0-180 W) →
    //   register("temp", float R+N) → mpu6050_init wrapped in controls_if
    //   (init only when sensor present) → on_message("led") {if==="1"
    //   digitalWrite HIGH else LOW} → on_message("servo") {servo_write
    //   ANGLE=received_value} (servo_write generator wraps the String
    //   value via String().toInt(), so passing the String-typed
    //   websocket_server_received_value compiles cleanly).
    //
    // Loop chain: mpu6050_update → websocket_server_send("temp",
    //   mpu6050_read_temperature) → delay 1000ms (1 Hz broadcast).
    id: 'wifi-controller-mix',
    title: 'WiFi コントローラ統合 (LED + Servo + 温度)',
    description: 'WebSocket サーバーで LED toggle / Servo slider / 温度 display を 1 ESP32 にまとめてブラウザから制御・表示',
    category: 'iot',
    language: 'arduino',
    blocklyXml: `<xml xmlns="https://developers.google.com/blockly/xml"><block type="arduino_setup" x="50" y="50"><statement name="SETUP"><block type="wifi_connect"><field name="SSID">your_ssid</field><field name="PASSWORD">your_password</field><next><block type="websocket_server_start"><field name="PORT">81</field><field name="PATH">/</field><next><block type="websocket_server_register"><field name="CHANNEL_ID">led</field><field name="LABEL">LED</field><field name="DATA_TYPE">bool</field><field name="MIN">0</field><field name="MAX">1</field><field name="READ">TRUE</field><field name="WRITE">TRUE</field><field name="NOTIFY">FALSE</field><next><block type="websocket_server_register"><field name="CHANNEL_ID">servo</field><field name="LABEL">Servo</field><field name="DATA_TYPE">uint8</field><field name="MIN">0</field><field name="MAX">180</field><field name="READ">TRUE</field><field name="WRITE">TRUE</field><field name="NOTIFY">FALSE</field><next><block type="websocket_server_register"><field name="CHANNEL_ID">temp</field><field name="LABEL">Temperature</field><field name="DATA_TYPE">float</field><field name="MIN">0</field><field name="MAX">100</field><field name="READ">TRUE</field><field name="WRITE">FALSE</field><field name="NOTIFY">TRUE</field><next><block type="esp32_pin_mode"><field name="PIN">2</field><field name="MODE">OUTPUT</field><next><block type="controls_if"><value name="IF0"><block type="mpu6050_init"><field name="ACCEL_RANGE">MPU6050_RANGE_8_G</field><field name="GYRO_RANGE">MPU6050_RANGE_500_DEG</field></block></value><next><block type="websocket_server_on_message"><field name="CHANNEL_ID">led</field><statement name="HANDLER"><block type="controls_if"><value name="IF0"><block type="logic_compare"><field name="OP">EQ</field><value name="A"><block type="websocket_server_received_value"></block></value><value name="B"><block type="text"><field name="TEXT">1</field></block></value></block></value><statement name="DO0"><block type="esp32_digital_write"><field name="PIN">2</field><field name="VALUE">HIGH</field></block></statement><next><block type="controls_if"><value name="IF0"><block type="logic_compare"><field name="OP">EQ</field><value name="A"><block type="websocket_server_received_value"></block></value><value name="B"><block type="text"><field name="TEXT">0</field></block></value></block></value><statement name="DO0"><block type="esp32_digital_write"><field name="PIN">2</field><field name="VALUE">LOW</field></block></statement></block></next></block></statement><next><block type="websocket_server_on_message"><field name="CHANNEL_ID">servo</field><statement name="HANDLER"><block type="servo_write"><field name="PIN">18</field><value name="ANGLE"><block type="websocket_server_received_value"></block></value></block></statement></block></next></block></next></block></next></block></next></block></next></block></next></block></next></block></next></block></statement></block><block type="arduino_loop" x="50" y="450"><statement name="LOOP"><block type="mpu6050_update"><next><block type="websocket_server_send"><field name="CHANNEL_ID">temp</field><value name="VALUE"><block type="mpu6050_read_temperature"></block></value><next><block type="esp32_delay"><value name="TIME"><block type="math_number"><field name="NUM">1000</field></block></value></block></next></block></next></block></statement></block></xml>`
  },
  // 52.md commit #21 (2026-05-04 第80回): Phase C+D + 新規発見対応 6 sample
  {
    id: 'tm1637-clock',
    title: 'TM1637 デジタル時計',
    description: 'TM1637 4桁7セグでカウントアップ秒表示 (時刻形式 HH:MM)',
    category: 'iot',
    language: 'arduino',
    blocklyXml: `<xml xmlns="https://developers.google.com/blockly/xml"><block type="arduino_setup" x="50" y="50"><statement name="SETUP"><block type="tm1637_init"><field name="CLK">26</field><field name="DIO">25</field><next><block type="tm1637_set_brightness"><value name="LEVEL"><shadow type="math_number"><field name="NUM">5</field></shadow></value></block></next></block></statement></block><block type="arduino_loop" x="50" y="250"><statement name="LOOP"><block type="tm1637_show_with_colon"><value name="HH"><shadow type="math_number"><field name="NUM">12</field></shadow></value><value name="MM"><shadow type="math_number"><field name="NUM">34</field></shadow></value><next><block type="esp32_delay"><value name="TIME"><shadow type="math_number"><field name="NUM">1000</field></shadow></value></block></next></block></statement></block></xml>`
  },
  {
    id: 'max7219-scroll-text',
    title: 'MAX7219 文字スクロール',
    description: 'MAX7219 8x8 LED マトリクスに HELLO を左へスクロール表示',
    category: 'iot',
    language: 'arduino',
    blocklyXml: `<xml xmlns="https://developers.google.com/blockly/xml"><block type="arduino_setup" x="50" y="50"><statement name="SETUP"><block type="max7219_init"><field name="DIN">23</field><field name="CS">5</field><field name="CLK">18</field><field name="N">1</field><next><block type="max7219_set_brightness"><value name="LEVEL"><shadow type="math_number"><field name="NUM">8</field></shadow></value></block></next></block></statement></block><block type="arduino_loop" x="50" y="250"><statement name="LOOP"><block type="max7219_scroll_text"><value name="TEXT"><shadow type="text"><field name="TEXT">HELLO</field></shadow></value><value name="SPEED"><shadow type="math_number"><field name="NUM">100</field></shadow></value></block></statement></block></xml>`
  },
  {
    id: 'lora-mesh-sender',
    title: 'LoRa 長距離送信',
    description: 'LoRa SX1276 で 5 秒ごとに測定値を送信、受信時にシリアル出力',
    category: 'iot',
    language: 'arduino',
    blocklyXml: `<xml xmlns="https://developers.google.com/blockly/xml"><block type="arduino_setup" x="50" y="50"><statement name="SETUP"><block type="esp32_serial_begin"><field name="BAUD">115200</field><next><block type="lora_init"><field name="SS">5</field><field name="RST">14</field><field name="DIO0">2</field><next><block type="lora_set_freq"><field name="FREQ">920E6</field><next><block type="lora_set_power"><value name="POWER"><shadow type="math_number"><field name="NUM">14</field></shadow></value></block></next></block></next></block></next></block></statement></block><block type="arduino_loop" x="50" y="450"><statement name="LOOP"><block type="lora_on_receive"><statement name="HANDLER"><block type="esp32_serial_println"><value name="VALUE"><block type="lora_received_value"></block></value></block></statement><next><block type="lora_send"><value name="DATA"><shadow type="text"><field name="TEXT">ping</field></shadow></value><next><block type="esp32_delay"><value name="TIME"><shadow type="math_number"><field name="NUM">5000</field></shadow></value></block></next></block></next></block></statement></block></xml>`
  },
  {
    id: 'gps-tracker',
    title: 'GPS 位置トラッカー',
    description: 'GPS NEO-6M で 10 秒ごとに緯度・経度・高度・衛星数をシリアル出力',
    category: 'iot',
    language: 'arduino',
    blocklyXml: `<xml xmlns="https://developers.google.com/blockly/xml"><block type="arduino_setup" x="50" y="50"><statement name="SETUP"><block type="esp32_serial_begin"><field name="BAUD">115200</field><next><block type="gps_init"><field name="RX">16</field><field name="TX">17</field><field name="BAUD">9600</field></block></next></block></statement></block><block type="arduino_loop" x="50" y="250"><statement name="LOOP"><block type="esp32_serial_print"><value name="VALUE"><shadow type="text"><field name="TEXT">Lat: </field></shadow></value><next><block type="esp32_serial_println"><value name="VALUE"><block type="gps_get_lat"></block></value><next><block type="esp32_serial_print"><value name="VALUE"><shadow type="text"><field name="TEXT">Sat: </field></shadow></value><next><block type="esp32_serial_println"><value name="VALUE"><block type="gps_get_satellites_count"></block></value><next><block type="esp32_delay"><value name="TIME"><shadow type="math_number"><field name="NUM">10000</field></shadow></value></block></next></block></next></block></next></block></next></block></statement></block></xml>`
  },
  {
    id: 'modbus-temp-monitor',
    title: 'Modbus 産業センサ + クラウド',
    description: 'Modbus RTU でホールディングレジスタ読込 → iot_cloud に送信 (Industrial IoT)',
    category: 'iot',
    language: 'arduino',
    blocklyXml: `<xml xmlns="https://developers.google.com/blockly/xml"><block type="arduino_setup" x="50" y="50"><statement name="SETUP"><block type="wifi_connect"><field name="SSID">your_ssid</field><field name="PASSWORD">your_password</field><next><block type="modbus_init"><field name="RX">16</field><field name="TX">17</field><field name="DE_RE">4</field><field name="BAUD">9600</field><next><block type="controls_if"><value name="IF0"><block type="iot_cloud_connect"><field name="PROVIDER">azure_iot_hub</field><value name="CREDENTIALS"><shadow type="text"><field name="TEXT">{}</field></shadow></value></block></value></block></next></block></next></block></statement></block><block type="arduino_loop" x="50" y="350"><statement name="LOOP"><block type="iot_cloud_publish"><value name="PAYLOAD"><block type="modbus_read_holding_register"><value name="ADDR"><shadow type="math_number"><field name="NUM">0</field></shadow></value></block></value><next><block type="esp32_delay"><value name="TIME"><shadow type="math_number"><field name="NUM">5000</field></shadow></value></block></next></block></statement></block></xml>`
  },
  {
    id: 'air-quality-dashboard',
    title: '空気質ダッシュボード (CO2 + PM2.5 + OLED)',
    description: 'SCD30 (CO2) + PMS5003 (PM2.5) を OLED に表示 + iot_cloud に送信 (Factory IoT)',
    category: 'iot',
    language: 'arduino',
    blocklyXml: `<xml xmlns="https://developers.google.com/blockly/xml"><block type="arduino_setup" x="50" y="50"><statement name="SETUP"><block type="wifi_connect"><field name="SSID">your_ssid</field><field name="PASSWORD">your_password</field><next><block type="scd30_init"><next><block type="pms5003_init"><field name="RX">16</field><field name="TX">17</field><next><block type="oled_ssd1306_init"><field name="ADDR">0x3C</field><field name="WIDTH">128</field><field name="HEIGHT">64</field></block></next></block></next></block></next></block></statement></block><block type="arduino_loop" x="50" y="350"><statement name="LOOP"><block type="oled_ssd1306_clear"><next><block type="oled_ssd1306_print"><value name="TEXT"><block type="scd30_read_co2"></block></value><value name="X"><shadow type="math_number"><field name="NUM">0</field></shadow></value><value name="Y"><shadow type="math_number"><field name="NUM">10</field></shadow></value><next><block type="oled_ssd1306_print"><value name="TEXT"><block type="pms5003_read_pm25"></block></value><value name="X"><shadow type="math_number"><field name="NUM">0</field></shadow></value><value name="Y"><shadow type="math_number"><field name="NUM">30</field></shadow></value><next><block type="oled_ssd1306_display"><next><block type="esp32_delay"><value name="TIME"><shadow type="math_number"><field name="NUM">2000</field></shadow></value></block></next></block></next></block></next></block></next></block></statement></block></xml>`
  },
  // ========= 第88回 AI 参照ファイルメンテ (2026-05-08): 51.md/52.md 残カテゴリ FEW_SHOT 12 sample =========
  // 第78-80回 で 147 ブロック追加されたが、52.md commit #21 で 6 sample 追加止まりだった。
  // 第88回 Task 1 調査で残 ~22 カテゴリの FEW_SHOT 不在を確認 → 高優先 12 sample を追加。
  // sampleProjects.ts (本 file) + sampleProjectsI18n.ts (4 lang override) + fewShotSelector.ts
  // (KEYWORD_TO_SAMPLE) + catalogInvariants.test.ts (keyword 検証) を atomic で揃える。
  {
    id: 'm5stack-button-lcd',
    title: 'M5Stack ボタン + LCD 表示',
    description: 'M5Stack Core / Atom / StickC で本体ボタン押下時に LCD を更新 (m5stack_begin 必須)',
    category: 'basic',
    language: 'arduino',
    blocklyXml: `<xml xmlns="https://developers.google.com/blockly/xml"><block type="arduino_setup" x="50" y="50"><statement name="SETUP"><block type="m5stack_begin"><next><block type="m5stack_lcd_print"><value name="TEXT"><shadow type="text"><field name="TEXT">Press button A</field></shadow></value></block></next></block></statement></block><block type="arduino_loop" x="50" y="250"><statement name="LOOP"><block type="controls_if"><value name="IF0"><block type="m5stack_button_a_pressed"></block></value><statement name="DO0"><block type="m5stack_lcd_clear"><next><block type="m5stack_lcd_print"><value name="TEXT"><shadow type="text"><field name="TEXT">Hello!</field></shadow></value></block></next></block></statement><next><block type="esp32_delay"><value name="TIME"><shadow type="math_number"><field name="NUM">100</field></shadow></value></block></next></block></statement></block></xml>`
  },
  {
    id: 'hx711-scale',
    title: 'HX711 ロードセル 計量',
    description: 'HX711 で重量を読込んでシリアル出力 (ファクトリー秤、Fab Academy Final Project 例)',
    category: 'sensor',
    language: 'arduino',
    blocklyXml: `<xml xmlns="https://developers.google.com/blockly/xml"><block type="arduino_setup" x="50" y="50"><statement name="SETUP"><block type="esp32_serial_begin"><field name="BAUD">115200</field><next><block type="hx711_init"><field name="DOUT">27</field><field name="SCK">26</field><next><block type="hx711_set_scale"><value name="SCALE"><shadow type="math_number"><field name="NUM">420</field></shadow></value><next><block type="hx711_tare"></block></next></block></next></block></next></block></statement></block><block type="arduino_loop" x="50" y="320"><statement name="LOOP"><block type="esp32_serial_print"><value name="VALUE"><shadow type="text"><field name="TEXT">Weight (g): </field></shadow></value><next><block type="esp32_serial_println"><value name="VALUE"><block type="hx711_read_weight"></block></value><next><block type="esp32_delay"><value name="TIME"><shadow type="math_number"><field name="NUM">1000</field></shadow></value></block></next></block></next></block></statement></block></xml>`
  },
  {
    id: 'espnow-mesh-receiver',
    title: 'ESP-NOW 受信機',
    description: 'ESP-NOW で他デバイスからのメッセージを受信して Serial 出力 (Fab Academy Networking 週)',
    category: 'iot',
    language: 'arduino',
    blocklyXml: `<xml xmlns="https://developers.google.com/blockly/xml"><block type="arduino_setup" x="50" y="50"><statement name="SETUP"><block type="esp32_serial_begin"><field name="BAUD">115200</field><next><block type="espnow_init"></block></next></block></statement></block><block type="arduino_loop" x="50" y="250"><statement name="LOOP"><block type="espnow_on_receive"><statement name="HANDLER"><block type="esp32_serial_print"><value name="VALUE"><shadow type="text"><field name="TEXT">From: </field></shadow></value><next><block type="esp32_serial_print"><value name="VALUE"><block type="espnow_received_mac"></block></value><next><block type="esp32_serial_print"><value name="VALUE"><shadow type="text"><field name="TEXT"> data: </field></shadow></value><next><block type="esp32_serial_println"><value name="VALUE"><block type="espnow_received_data"></block></value></block></next></block></next></block></next></block></statement></block></statement></block></xml>`
  },
  {
    id: 'sht40-temp-humidity',
    title: 'SHT40 温湿度センサ',
    description: 'SHT40 (Sensirion 後継) で温湿度を 5 秒ごとに Serial 出力 (M5Stack ENV IV ユニット互換)',
    category: 'sensor',
    language: 'arduino',
    blocklyXml: `<xml xmlns="https://developers.google.com/blockly/xml"><block type="arduino_setup" x="50" y="50"><statement name="SETUP"><block type="esp32_serial_begin"><field name="BAUD">115200</field><next><block type="sht40_init"></block></next></block></statement></block><block type="arduino_loop" x="50" y="250"><statement name="LOOP"><block type="esp32_serial_print"><value name="VALUE"><shadow type="text"><field name="TEXT">Temp: </field></shadow></value><next><block type="esp32_serial_println"><value name="VALUE"><block type="sht40_read_temperature"></block></value><next><block type="esp32_serial_print"><value name="VALUE"><shadow type="text"><field name="TEXT">Hum: </field></shadow></value><next><block type="esp32_serial_println"><value name="VALUE"><block type="sht40_read_humidity"></block></value><next><block type="esp32_delay"><value name="TIME"><shadow type="math_number"><field name="NUM">5000</field></shadow></value></block></next></block></next></block></next></block></next></block></statement></block></xml>`
  },
  {
    id: 'epaper-status-display',
    title: 'e-Paper 状態表示',
    description: 'e-Paper (Adafruit_EPD) にステータステキストを 1 度表示して保持 (低消費電力サイネージ)',
    category: 'iot',
    language: 'arduino',
    blocklyXml: `<xml xmlns="https://developers.google.com/blockly/xml"><block type="arduino_setup" x="50" y="50"><statement name="SETUP"><block type="epaper_init"><field name="CS">5</field><field name="DC">17</field><field name="RST">16</field><field name="BUSY">4</field><next><block type="epaper_clear"><next><block type="epaper_print"><value name="TEXT"><shadow type="text"><field name="TEXT">Status: OK</field></shadow></value><value name="X"><shadow type="math_number"><field name="NUM">10</field></shadow></value><value name="Y"><shadow type="math_number"><field name="NUM">30</field></shadow></value><next><block type="epaper_full_refresh"></block></next></block></next></block></next></block></statement></block><block type="arduino_loop" x="50" y="350"><statement name="LOOP"><block type="esp32_delay"><value name="TIME"><shadow type="math_number"><field name="NUM">60000</field></shadow></value></block></statement></block></xml>`
  },
  {
    id: 'stepper-position-control',
    title: 'ステッパー 位置制御 (28BYJ-48)',
    description: '28BYJ-48 + ULN2003 で 90 度回転 → 1 秒待機 → 反対回転 (CNC / 自動化)',
    category: 'motor',
    language: 'arduino',
    blocklyXml: `<xml xmlns="https://developers.google.com/blockly/xml"><block type="arduino_setup" x="50" y="50"><statement name="SETUP"><block type="stepper_init"><field name="IN1">14</field><field name="IN2">27</field><field name="IN3">26</field><field name="IN4">25</field></block></statement></block><block type="arduino_loop" x="50" y="200"><statement name="LOOP"><block type="stepper_rotate"><field name="SPEED">5</field><value name="ANGLE"><shadow type="math_number"><field name="NUM">90</field></shadow></value><next><block type="esp32_delay"><value name="TIME"><shadow type="math_number"><field name="NUM">1000</field></shadow></value><next><block type="stepper_rotate"><field name="SPEED">5</field><value name="ANGLE"><shadow type="math_number"><field name="NUM">-90</field></shadow></value><next><block type="esp32_delay"><value name="TIME"><shadow type="math_number"><field name="NUM">1000</field></shadow></value></block></next></block></next></block></next></block></statement></block></xml>`
  },
  {
    id: 'relay-timer-control',
    title: 'リレー タイマー制御',
    description: 'リレーを 3 秒 ON → 5 秒 OFF で繰返す (Factory IoT 制御)',
    category: 'motor',
    language: 'arduino',
    blocklyXml: `<xml xmlns="https://developers.google.com/blockly/xml"><block type="arduino_setup" x="50" y="50"><statement name="SETUP"><block type="relay_init"><field name="PIN">26</field><field name="ACTIVE">HIGH</field></block></statement></block><block type="arduino_loop" x="50" y="200"><statement name="LOOP"><block type="relay_on"><field name="PIN">26</field><next><block type="esp32_delay"><value name="TIME"><shadow type="math_number"><field name="NUM">3000</field></shadow></value><next><block type="relay_off"><field name="PIN">26</field><next><block type="esp32_delay"><value name="TIME"><shadow type="math_number"><field name="NUM">5000</field></shadow></value></block></next></block></next></block></next></block></statement></block></xml>`
  },
  {
    id: 'neomatrix-pixel-display',
    title: 'NeoMatrix ピクセル描画',
    description: 'NeoMatrix 8x8 LED で対角に 2 色のピクセルを表示 → 1 秒待機 (NeoPixel 2D matrix)',
    category: 'motor',
    language: 'arduino',
    blocklyXml: `<xml xmlns="https://developers.google.com/blockly/xml"><block type="arduino_setup" x="50" y="50"><statement name="SETUP"><block type="neomatrix_init"><field name="PIN">16</field><field name="W">8</field><field name="H">8</field></block></statement></block><block type="arduino_loop" x="50" y="200"><statement name="LOOP"><block type="neomatrix_clear"><next><block type="neomatrix_set_pixel"><value name="X"><shadow type="math_number"><field name="NUM">0</field></shadow></value><value name="Y"><shadow type="math_number"><field name="NUM">0</field></shadow></value><value name="COLOR"><shadow type="math_number"><field name="NUM">16711680</field></shadow></value><next><block type="neomatrix_set_pixel"><value name="X"><shadow type="math_number"><field name="NUM">7</field></shadow></value><value name="Y"><shadow type="math_number"><field name="NUM">7</field></shadow></value><value name="COLOR"><shadow type="math_number"><field name="NUM">255</field></shadow></value><next><block type="neomatrix_show"><next><block type="esp32_delay"><value name="TIME"><shadow type="math_number"><field name="NUM">1000</field></shadow></value></block></next></block></next></block></next></block></next></block></statement></block></xml>`
  },
  {
    id: 'max30102-pulse-monitor',
    title: 'MAX30102 心拍 / SpO2 モニター',
    description: 'MAX30102 で心拍と SpO2 を 1 秒ごとに Serial 出力 (教育用、医療精度ではない)',
    category: 'sensor',
    language: 'arduino',
    blocklyXml: `<xml xmlns="https://developers.google.com/blockly/xml"><block type="arduino_setup" x="50" y="50"><statement name="SETUP"><block type="esp32_serial_begin"><field name="BAUD">115200</field><next><block type="max30102_init"></block></next></block></statement></block><block type="arduino_loop" x="50" y="250"><statement name="LOOP"><block type="esp32_serial_print"><value name="VALUE"><shadow type="text"><field name="TEXT">HR: </field></shadow></value><next><block type="esp32_serial_println"><value name="VALUE"><block type="max30102_read_heart_rate"></block></value><next><block type="esp32_serial_print"><value name="VALUE"><shadow type="text"><field name="TEXT">SpO2: </field></shadow></value><next><block type="esp32_serial_println"><value name="VALUE"><block type="max30102_read_spo2"></block></value><next><block type="esp32_delay"><value name="TIME"><shadow type="math_number"><field name="NUM">1000</field></shadow></value></block></next></block></next></block></next></block></next></block></statement></block></xml>`
  },
  {
    id: 'ina219-power-monitor',
    title: 'INA219 電力モニター',
    description: 'INA219 で電圧 / 電流 を 2 秒ごとに Serial 出力 (バッテリー / 太陽光発電)',
    category: 'sensor',
    language: 'arduino',
    blocklyXml: `<xml xmlns="https://developers.google.com/blockly/xml"><block type="arduino_setup" x="50" y="50"><statement name="SETUP"><block type="esp32_serial_begin"><field name="BAUD">115200</field><next><block type="ina219_init"><field name="ADDR">0</field></block></next></block></statement></block><block type="arduino_loop" x="50" y="250"><statement name="LOOP"><block type="esp32_serial_print"><value name="VALUE"><shadow type="text"><field name="TEXT">V: </field></shadow></value><next><block type="esp32_serial_println"><value name="VALUE"><block type="ina219_read_voltage"></block></value><next><block type="esp32_serial_print"><value name="VALUE"><shadow type="text"><field name="TEXT">I: </field></shadow></value><next><block type="esp32_serial_println"><value name="VALUE"><block type="ina219_read_current"></block></value><next><block type="esp32_delay"><value name="TIME"><shadow type="math_number"><field name="NUM">2000</field></shadow></value></block></next></block></next></block></next></block></next></block></statement></block></xml>`
  },
  {
    id: 'apds9960-gesture-control',
    title: 'APDS9960 ジェスチャー制御',
    description: 'APDS9960 でジェスチャー検出 (UP/DOWN/LEFT/RIGHT) を Serial 出力 (HCI 入力)',
    category: 'sensor',
    language: 'arduino',
    blocklyXml: `<xml xmlns="https://developers.google.com/blockly/xml"><block type="arduino_setup" x="50" y="50"><statement name="SETUP"><block type="esp32_serial_begin"><field name="BAUD">115200</field><next><block type="apds9960_init"></block></next></block></statement></block><block type="arduino_loop" x="50" y="250"><statement name="LOOP"><block type="esp32_serial_print"><value name="VALUE"><shadow type="text"><field name="TEXT">Gesture: </field></shadow></value><next><block type="esp32_serial_println"><value name="VALUE"><block type="apds9960_read_gesture"></block></value><next><block type="esp32_delay"><value name="TIME"><shadow type="math_number"><field name="NUM">100</field></shadow></value></block></next></block></next></block></statement></block></xml>`
  },
  {
    id: 'pushover-distance-alert',
    title: 'Pushover 距離アラート',
    description: '超音波距離が 10 cm 以下になったら Pushover でスマホに通知 (セキュリティ / 在室監視)',
    category: 'iot',
    language: 'arduino',
    blocklyXml: `<xml xmlns="https://developers.google.com/blockly/xml"><block type="arduino_setup" x="50" y="50"><statement name="SETUP"><block type="wifi_connect"><field name="SSID">your_ssid</field><field name="PASSWORD">your_password</field><next><block type="ultrasonic_init"><field name="TRIG_PIN">18</field><field name="ECHO_PIN">19</field></block></next></block></statement></block><block type="arduino_loop" x="50" y="250"><statement name="LOOP"><block type="controls_if"><value name="IF0"><block type="logic_compare"><field name="OP">LT</field><value name="A"><block type="ultrasonic_distance"></block></value><value name="B"><shadow type="math_number"><field name="NUM">10</field></shadow></value></block></value><statement name="DO0"><block type="pushover_send"><field name="PRIORITY">0</field><value name="TOKEN"><shadow type="text"><field name="TEXT">your_app_token</field></shadow></value><value name="USER"><shadow type="text"><field name="TEXT">your_user_key</field></shadow></value><value name="MESSAGE"><shadow type="text"><field name="TEXT">Object detected within 10 cm</field></shadow></value></block></statement><next><block type="esp32_delay"><value name="TIME"><shadow type="math_number"><field name="NUM">30000</field></shadow></value></block></next></block></statement></block></xml>`
  },
  // ─────────────────────────────────────────────────────────────────────────
  // HA 対応強化 commit 0-7 (第91-97回) で追加された 5 specific use case sample。
  // Session 98 Task 3 (Round 5 前 AI ref maintenance) で追加。既存 5 HA sample
  // (ha-led-control / ha-multi-sensor / ha-rgb-led / ha-smart-relay /
  // ha-temperature-sensor) は基本構成、本 5 sample は HA OTA / via_device 階層 /
  // watchdog 堅牢化 / 自動診断 / binary sensor の specific use case 補完。
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'ha-binary-sensor-motion',
    title: 'HA 人感センサー (binary_sensor)',
    description: 'GPIO 13 の人感センサー状態を Home Assistant に binary_sensor (motion) として自動登録 + 報告',
    category: 'iot',
    language: 'arduino',
    blocklyXml: `<xml xmlns="https://developers.google.com/blockly/xml"><block type="arduino_setup" x="50" y="50"><statement name="SETUP"><block type="esp32_serial_begin"><field name="BAUD">115200</field><next><block type="esp32_pin_mode"><field name="PIN">13</field><field name="MODE">INPUT</field><next><block type="ha_device_init"><field name="SSID">your_ssid</field><field name="WIFI_PASS">your_password</field><field name="BROKER">192.168.1.100</field><field name="PORT">1883</field><field name="DEVICE_NAME">人感センサー</field><field name="DEVICE_ID">motion_sensor</field><field name="MANUFACTURER">Digi Co LLC</field><field name="MODEL">ESP32</field><field name="SOFTWARE_VERSION">1.0.0</field><field name="AUTO_UNIQUE_ID">TRUE</field><field name="AVAILABILITY">TRUE</field><field name="VIA_DEVICE"></field><next><block type="ha_binary_sensor_create"><field name="SENSOR_ID">motion</field><field name="NAME">人感</field><field name="DEVICE_CLASS">motion</field><field name="ICON">mdi:motion-sensor</field></block></next></block></next></block></next></block></statement></block><block type="arduino_loop" x="50" y="350"><statement name="LOOP"><block type="ha_loop"><next><block type="ha_binary_sensor_update"><field name="SENSOR_ID">motion</field><value name="VALUE"><block type="esp32_digital_read"><field name="PIN">13</field></block></value></block></next></block></statement></block></xml>`
  },
  {
    id: 'ha-diagnostics-only',
    title: 'HA 自動診断のみ',
    description: 'WiFi RSSI / Uptime / Free Heap / Reset Reason を Home Assistant に自動診断 entity として登録 + 60 秒ごと自動 publish (user sensor 不在の純診断 sketch)',
    category: 'iot',
    language: 'arduino',
    blocklyXml: `<xml xmlns="https://developers.google.com/blockly/xml"><block type="arduino_setup" x="50" y="50"><statement name="SETUP"><block type="esp32_serial_begin"><field name="BAUD">115200</field><next><block type="ha_device_init"><field name="SSID">your_ssid</field><field name="WIFI_PASS">your_password</field><field name="BROKER">192.168.1.100</field><field name="PORT">1883</field><field name="DEVICE_NAME">ESP32 診断モニター</field><field name="DEVICE_ID">esp32_diag</field><field name="MANUFACTURER">Digi Co LLC</field><field name="MODEL">ESP32</field><field name="SOFTWARE_VERSION">1.0.0</field><field name="AUTO_UNIQUE_ID">TRUE</field><field name="AVAILABILITY">TRUE</field><field name="VIA_DEVICE"></field><next><block type="ha_diagnostics_auto"><field name="REPORT_INTERVAL">60</field><field name="ENABLE_RSSI">TRUE</field><field name="ENABLE_UPTIME">TRUE</field><field name="ENABLE_HEAP">TRUE</field><field name="ENABLE_RESET_REASON">TRUE</field></block></next></block></next></block></statement></block><block type="arduino_loop" x="50" y="350"><statement name="LOOP"><block type="ha_loop"></block></statement></block></xml>`
  },
  {
    id: 'ha-via-device-multi-esp32',
    title: 'HA 複数 ESP32 1機器構成 (via_device、押出機構側)',
    description: 'クレイ3D プリンタの押出機構側 ESP32。VIA_DEVICE field に親デバイス名「クレイ3Dプリンタ」を記入することで HA Devices ページで Z 軸機構 ESP32 等と階層表示 (Takeda 判断 3 use case)',
    category: 'iot',
    language: 'arduino',
    blocklyXml: `<xml xmlns="https://developers.google.com/blockly/xml"><block type="arduino_setup" x="50" y="50"><statement name="SETUP"><block type="esp32_serial_begin"><field name="BAUD">115200</field><next><block type="ha_device_init"><field name="SSID">your_ssid</field><field name="WIFI_PASS">your_password</field><field name="BROKER">192.168.1.100</field><field name="PORT">1883</field><field name="DEVICE_NAME">押出機構</field><field name="DEVICE_ID">extruder_esp32</field><field name="MANUFACTURER">Digi Co LLC</field><field name="MODEL">ESP32</field><field name="SOFTWARE_VERSION">1.0.0</field><field name="AUTO_UNIQUE_ID">TRUE</field><field name="AVAILABILITY">TRUE</field><field name="VIA_DEVICE">クレイ3Dプリンタ</field><next><block type="ha_sensor_create"><field name="SENSOR_ID">extruder_temp</field><field name="NAME">押出温度</field><field name="DEVICE_CLASS">temperature</field><field name="UNIT">°C</field><field name="ICON">mdi:thermometer</field><next><block type="ha_number_create"><field name="NUMBER_ID">extruder_speed</field><field name="NAME">押出速度</field><value name="MIN"><block type="math_number"><field name="NUM">0</field></block></value><value name="MAX"><block type="math_number"><field name="NUM">100</field></block></value><value name="STEP"><block type="math_number"><field name="NUM">1</field></block></value><field name="UNIT">%</field><field name="MODE">slider</field></block></next></block></next></block></next></block></statement></block><block type="arduino_loop" x="50" y="450"><statement name="LOOP"><block type="ha_report_interval"><value name="INTERVAL"><block type="math_number"><field name="NUM">30</field></block></value><statement name="CALLBACK"><block type="ha_sensor_update"><field name="SENSOR_ID">extruder_temp</field><value name="VALUE"><block type="math_number"><field name="NUM">25</field></block></value></block></statement><next><block type="ha_loop"></block></next></block></statement></block></xml>`
  },
  {
    id: 'ha-ota-firmware-update',
    title: 'HA OTA ファームウェア更新',
    description: 'Home Assistant UI の「インストール」ボタンから ESP32 が .bin を自己取得 + 書き換え + 再起動。DigiCode IDE のコンパイル完了ダイアログから .bin を export し、HA add-on local/ に手動アップロード後、HA UI から OTA 実行 (Takeda 判断 1 use case)',
    category: 'iot',
    language: 'arduino',
    blocklyXml: `<xml xmlns="https://developers.google.com/blockly/xml"><block type="arduino_setup" x="50" y="50"><statement name="SETUP"><block type="esp32_serial_begin"><field name="BAUD">115200</field><next><block type="ha_device_init"><field name="SSID">your_ssid</field><field name="WIFI_PASS">your_password</field><field name="BROKER">192.168.1.100</field><field name="PORT">1883</field><field name="DEVICE_NAME">スマート温度計</field><field name="DEVICE_ID">smart_thermo</field><field name="MANUFACTURER">Digi Co LLC</field><field name="MODEL">ESP32</field><field name="SOFTWARE_VERSION">1.0.0</field><field name="AUTO_UNIQUE_ID">TRUE</field><field name="AVAILABILITY">TRUE</field><field name="VIA_DEVICE"></field><next><block type="ha_sensor_create"><field name="SENSOR_ID">temperature</field><field name="NAME">温度</field><field name="DEVICE_CLASS">temperature</field><field name="UNIT">°C</field><field name="ICON">mdi:thermometer</field><next><block type="ha_ota_setup"><field name="OBJECT_ID">firmware_update</field><field name="NAME">ファームウェア更新</field><field name="FIRMWARE_URL">http://homeassistant.local:8123/local/firmware.bin</field></block></next></block></next></block></next></block></statement></block><block type="arduino_loop" x="50" y="450"><statement name="LOOP"><block type="ha_report_interval"><value name="INTERVAL"><block type="math_number"><field name="NUM">30</field></block></value><statement name="CALLBACK"><block type="ha_sensor_update"><field name="SENSOR_ID">temperature</field><value name="VALUE"><block type="math_number"><field name="NUM">25</field></block></value></block></statement><next><block type="ha_loop"></block></next></block></statement></block></xml>`
  },
  {
    id: 'ha-watchdog-resilience',
    title: 'HA 堅牢構成 (watchdog 連携)',
    description: 'watchdog_enable で loop ハングアップを 60 秒で自動再起動 + ha_diagnostics_auto で reset reason / RSSI / Uptime / Heap を HA に常時報告。24 時間稼働 sensor / 工場 IoT 等の堅牢構成',
    category: 'iot',
    language: 'arduino',
    blocklyXml: `<xml xmlns="https://developers.google.com/blockly/xml"><block type="arduino_setup" x="50" y="50"><statement name="SETUP"><block type="esp32_serial_begin"><field name="BAUD">115200</field><next><block type="ha_device_init"><field name="SSID">your_ssid</field><field name="WIFI_PASS">your_password</field><field name="BROKER">192.168.1.100</field><field name="PORT">1883</field><field name="DEVICE_NAME">堅牢温度モニター</field><field name="DEVICE_ID">robust_thermo</field><field name="MANUFACTURER">Digi Co LLC</field><field name="MODEL">ESP32</field><field name="SOFTWARE_VERSION">1.0.0</field><field name="AUTO_UNIQUE_ID">TRUE</field><field name="AVAILABILITY">TRUE</field><field name="VIA_DEVICE"></field><next><block type="ha_sensor_create"><field name="SENSOR_ID">temperature</field><field name="NAME">温度</field><field name="DEVICE_CLASS">temperature</field><field name="UNIT">°C</field><field name="ICON">mdi:thermometer</field><next><block type="watchdog_enable"><field name="TIMEOUT_SEC">60</field><next><block type="ha_diagnostics_auto"><field name="REPORT_INTERVAL">60</field><field name="ENABLE_RSSI">TRUE</field><field name="ENABLE_UPTIME">TRUE</field><field name="ENABLE_HEAP">TRUE</field><field name="ENABLE_RESET_REASON">TRUE</field></block></next></block></next></block></next></block></statement></block><block type="arduino_loop" x="50" y="500"><statement name="LOOP"><block type="ha_report_interval"><value name="INTERVAL"><block type="math_number"><field name="NUM">30</field></block></value><statement name="CALLBACK"><block type="ha_sensor_update"><field name="SENSOR_ID">temperature</field><value name="VALUE"><block type="math_number"><field name="NUM">25</field></block></value></block></statement><next><block type="ha_loop"></block></next></block></statement></block></xml>`
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
