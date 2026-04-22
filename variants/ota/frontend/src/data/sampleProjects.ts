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
          <block type="controls_for">
            <field name="VAR">angle</field>
            <value name="FROM">
              <block type="math_number">
                <field name="NUM">0</field>
              </block>
            </value>
            <value name="TO">
              <block type="math_number">
                <field name="NUM">180</field>
              </block>
            </value>
            <value name="BY">
              <block type="math_number">
                <field name="NUM">10</field>
              </block>
            </value>
            <statement name="CALLBACK">
              <block type="servo_write">
                <field name="PIN">13</field>
                <value name="ANGLE">
                  <block type="variables_get">
                    <field name="VAR">angle</field>
                  </block>
                </value>
                <next>
                  <block type="esp32_delay">
                    <value name="TIME">
                      <block type="math_number">
                        <field name="NUM">50</field>
                      </block>
                    </value>
                  </block>
                </next>
              </block>
            </statement>
            <next>
              <block type="controls_for">
                <field name="VAR">angle</field>
                <value name="FROM">
                  <block type="math_number">
                    <field name="NUM">180</field>
                  </block>
                </value>
                <value name="TO">
                  <block type="math_number">
                    <field name="NUM">0</field>
                  </block>
                </value>
                <value name="BY">
                  <block type="math_number">
                    <field name="NUM">10</field>
                  </block>
                </value>
                <statement name="CALLBACK">
                  <block type="servo_write">
                    <field name="PIN">13</field>
                    <value name="ANGLE">
                      <block type="variables_get">
                        <field name="VAR">angle</field>
                      </block>
                    </value>
                    <next>
                      <block type="esp32_delay">
                        <value name="TIME">
                          <block type="math_number">
                            <field name="NUM">50</field>
                          </block>
                        </value>
                      </block>
                    </next>
                  </block>
                </statement>
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
            <field name="NUM">8</field>
          </block>
        </statement>
</block>
<block type="arduino_loop" x="50" y="250">
<statement name="LOOP">
          <block type="neopixel_set_color">
            <field name="INDEX">0</field>
            <field name="COLOR">#ff0000</field>
            <next>
              <block type="neopixel_set_color">
                <field name="INDEX">1</field>
                <field name="COLOR">#ff7f00</field>
                <next>
                  <block type="neopixel_set_color">
                    <field name="INDEX">2</field>
                    <field name="COLOR">#ffff00</field>
                    <next>
                      <block type="neopixel_set_color">
                        <field name="INDEX">3</field>
                        <field name="COLOR">#00ff00</field>
                        <next>
                          <block type="neopixel_set_color">
                            <field name="INDEX">4</field>
                            <field name="COLOR">#0000ff</field>
                            <next>
                              <block type="neopixel_set_color">
                                <field name="INDEX">5</field>
                                <field name="COLOR">#4b0082</field>
                                <next>
                                  <block type="neopixel_set_color">
                                    <field name="INDEX">6</field>
                                    <field name="COLOR">#9400d3</field>
                                    <next>
                                      <block type="neopixel_set_color">
                                        <field name="INDEX">7</field>
                                        <field name="COLOR">#ff1493</field>
                                        <next>
                                          <block type="neopixel_show">
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
            <field name="PASSWORD">your_password</field>
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
                <field name="COUNT">1</field>
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
