import type { Tutorial } from '@/stores/tutorialStore';

export const tutorials: Tutorial[] = [
  // チュートリアル1: はじめてのLED点滅
  {
    id: 'led-blink',
    title: 'はじめてのLED点滅',
    description: 'LEDを点滅させるプログラム',
    difficulty: 'beginner',
    estimatedTime: 5,
    category: 'basic',
    sampleXml: `
<xml xmlns="https://developers.google.com/blockly/xml">
  <block type="arduino_setup" x="50" y="30">
    <statement name="SETUP">
      <block type="esp32_pin_mode">
        <field name="PIN">2</field>
        <field name="MODE">OUTPUT</field>
      </block>
    </statement>
  </block>
  <block type="arduino_loop" x="50" y="150">
    <statement name="LOOP">
      <block type="esp32_digital_write">
        <field name="PIN">2</field>
        <field name="VALUE">HIGH</field>
        <next>
          <block type="esp32_delay">
            <value name="TIME">
              <block type="math_number">
                <field name="NUM">1000</field>
              </block>
            </value>
            <next>
              <block type="esp32_digital_write">
                <field name="PIN">2</field>
                <field name="VALUE">LOW</field>
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
    </statement>
  </block>
</xml>`,
    steps: [
      {
        id: 'led-1',
        title: 'LED点滅プログラム',
        content: 'GPIO2のLEDを1秒ごとに点滅させます。「書き込み」ボタンで実行してみましょう！',
        position: 'center',
      },
    ],
  },

  // チュートリアル2: 超音波センサー
  {
    id: 'sensor-basic',
    title: '超音波センサー',
    description: '距離を測定してシリアル出力',
    difficulty: 'beginner',
    estimatedTime: 5,
    category: 'basic',
    sampleXml: `
<xml xmlns="https://developers.google.com/blockly/xml">
  <block type="arduino_setup" x="50" y="30">
    <statement name="SETUP">
      <block type="ultrasonic_init">
        <field name="TRIG_PIN">18</field>
        <field name="ECHO_PIN">19</field>
        <next>
          <block type="esp32_serial_begin">
            <value name="BAUD">
              <block type="math_number">
                <field name="NUM">115200</field>
              </block>
            </value>
          </block>
        </next>
      </block>
    </statement>
  </block>
  <block type="arduino_loop" x="50" y="200">
    <statement name="LOOP">
      <block type="esp32_serial_println">
        <value name="TEXT">
          <block type="ultrasonic_distance"></block>
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
    </statement>
  </block>
</xml>`,
    steps: [
      {
        id: 'sensor-1',
        title: '距離測定',
        content: 'HC-SR04センサーで距離を測定し、シリアルモニターに表示します。',
        position: 'center',
      },
    ],
  },

  // チュートリアル3: サーボモーター
  {
    id: 'motor-basic',
    title: 'サーボモーター',
    description: 'サーボを0度と180度で往復',
    difficulty: 'beginner',
    estimatedTime: 5,
    category: 'basic',
    sampleXml: `
<xml xmlns="https://developers.google.com/blockly/xml">
  <block type="arduino_setup" x="50" y="30">
    <statement name="SETUP">
      <block type="servo_attach">
        <field name="PIN">13</field>
      </block>
    </statement>
  </block>
  <block type="arduino_loop" x="50" y="130">
    <statement name="LOOP">
      <block type="servo_write">
        <field name="PIN">13</field>
        <field name="ANGLE">0</field>
        <next>
          <block type="esp32_delay">
            <value name="TIME">
              <block type="math_number">
                <field name="NUM">1000</field>
              </block>
            </value>
            <next>
              <block type="servo_write">
                <field name="PIN">13</field>
                <field name="ANGLE">180</field>
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
    </statement>
  </block>
</xml>`,
    steps: [
      {
        id: 'motor-1',
        title: 'サーボ制御',
        content: 'サーボモーターを0度と180度の間で1秒ごとに往復させます。',
        position: 'center',
      },
    ],
  },

  // チュートリアル4: Humanoidはじめての歩行
  {
    id: 'humanoid-basic',
    title: 'Humanoidはじめて',
    description: 'Humanoidロボットを歩かせる',
    difficulty: 'beginner',
    estimatedTime: 5,
    category: 'robots',
    sampleXml: `
<xml xmlns="https://developers.google.com/blockly/xml">
  <block type="arduino_setup" x="50" y="30">
    <statement name="SETUP">
      <block type="humanoid_init">
        <field name="PIN_LL">2</field>
        <field name="PIN_RL">4</field>
        <field name="PIN_LF">5</field>
        <field name="PIN_RF">18</field>
        <next>
          <block type="humanoid_home"></block>
        </next>
      </block>
    </statement>
  </block>
  <block type="arduino_loop" x="50" y="180">
    <statement name="LOOP">
      <block type="humanoid_walk">
        <field name="STEPS">2</field>
        <field name="DIRECTION">1</field>
        <field name="SPEED">1000</field>
        <next>
          <block type="humanoid_turn">
            <field name="STEPS">2</field>
            <field name="DIRECTION">1</field>
            <field name="SPEED">1000</field>
          </block>
        </next>
      </block>
    </statement>
  </block>
</xml>`,
    steps: [
      {
        id: 'humanoid-1',
        title: 'Humanoid歩行',
        content: 'Humanoidが前に2歩歩き、左に2回転します。ピン番号は環境に合わせて変更してください。',
        position: 'center',
      },
    ],
  },

  // チュートリアル5: Humanoidジェスチャー
  {
    id: 'humanoid-gesture',
    title: 'Humanoidの感情表現',
    description: 'ジェスチャーで感情を表現',
    difficulty: 'beginner',
    estimatedTime: 5,
    category: 'robots',
    sampleXml: `
<xml xmlns="https://developers.google.com/blockly/xml">
  <block type="arduino_setup" x="50" y="30">
    <statement name="SETUP">
      <block type="humanoid_init">
        <field name="PIN_LL">2</field>
        <field name="PIN_RL">4</field>
        <field name="PIN_LF">5</field>
        <field name="PIN_RF">18</field>
        <next>
          <block type="humanoid_home"></block>
        </next>
      </block>
    </statement>
  </block>
  <block type="arduino_loop" x="50" y="180">
    <statement name="LOOP">
      <block type="humanoid_gesture">
        <field name="GESTURE">Happy</field>
        <next>
          <block type="esp32_delay">
            <value name="TIME">
              <block type="math_number">
                <field name="NUM">2000</field>
              </block>
            </value>
            <next>
              <block type="humanoid_gesture">
                <field name="GESTURE">Sad</field>
                <next>
                  <block type="esp32_delay">
                    <value name="TIME">
                      <block type="math_number">
                        <field name="NUM">2000</field>
                      </block>
                    </value>
                    <next>
                      <block type="humanoid_gesture">
                        <field name="GESTURE">Victory</field>
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
</xml>`,
    steps: [
      {
        id: 'gesture-1',
        title: 'ジェスチャー',
        content: 'Humanoidが「ハッピー」→「悲しい」→「勝利」のジェスチャーを順番に表現します。',
        position: 'center',
      },
    ],
  },

  // チュートリアル6: Humanoidダンス
  {
    id: 'humanoid-dance',
    title: 'Humanoidでダンス',
    description: '様々なダンス動作',
    difficulty: 'intermediate',
    estimatedTime: 5,
    category: 'robots',
    sampleXml: `
<xml xmlns="https://developers.google.com/blockly/xml">
  <block type="arduino_setup" x="50" y="30">
    <statement name="SETUP">
      <block type="humanoid_init">
        <field name="PIN_LL">2</field>
        <field name="PIN_RL">4</field>
        <field name="PIN_LF">5</field>
        <field name="PIN_RF">18</field>
        <next>
          <block type="humanoid_home"></block>
        </next>
      </block>
    </statement>
  </block>
  <block type="arduino_loop" x="50" y="180">
    <statement name="LOOP">
      <block type="humanoid_swing">
        <field name="STEPS">2</field>
        <next>
          <block type="humanoid_dance">
            <field name="STEPS">4</field>
            <next>
              <block type="humanoid_moonwalk">
                <field name="STEPS">2</field>
                <field name="DIRECTION">1</field>
                <next>
                  <block type="humanoid_crusaito">
                    <field name="STEPS">2</field>
                    <field name="DIRECTION">1</field>
                    <next>
                      <block type="humanoid_jitter">
                        <field name="STEPS">4</field>
                        <next>
                          <block type="humanoid_updown">
                            <field name="STEPS">2</field>
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
</xml>`,
    steps: [
      {
        id: 'dance-1',
        title: 'ダンスパフォーマンス',
        content: 'スウィング→ダンス→ムーンウォーク→クルサイト→ジッター→アップダウンを連続実行します。',
        position: 'center',
      },
    ],
  },

  // チュートリアル7: タッチセンサーでHumanoid操作
  {
    id: 'humanoid-touch',
    title: 'タッチで操作',
    description: 'タッチセンサーでHumanoidを動かす',
    difficulty: 'intermediate',
    estimatedTime: 5,
    category: 'robots',
    sampleXml: `
<xml xmlns="https://developers.google.com/blockly/xml">
  <block type="arduino_setup" x="50" y="30">
    <statement name="SETUP">
      <block type="touch_init">
        <field name="PIN">4</field>
        <field name="THRESHOLD">40</field>
        <next>
          <block type="humanoid_init">
            <field name="PIN_LL">2</field>
            <field name="PIN_RL">14</field>
            <field name="PIN_LF">5</field>
            <field name="PIN_RF">18</field>
            <next>
              <block type="humanoid_home"></block>
            </next>
          </block>
        </next>
      </block>
    </statement>
  </block>
  <block type="arduino_loop" x="50" y="220">
    <statement name="LOOP">
      <block type="controls_if">
        <value name="IF0">
          <block type="touch_read"></block>
        </value>
        <statement name="DO0">
          <block type="humanoid_gesture">
            <field name="GESTURE">Happy</field>
            <next>
              <block type="humanoid_walk">
                <field name="STEPS">2</field>
                <field name="DIRECTION">1</field>
                <field name="SPEED">1000</field>
              </block>
            </next>
          </block>
        </statement>
      </block>
    </statement>
  </block>
</xml>`,
    steps: [
      {
        id: 'touch-1',
        title: 'タッチ操作',
        content: 'GPIO4に触れるとHumanoidがハッピーになり、2歩前進します。',
        position: 'center',
      },
    ],
  },

  // チュートリアル8: 音に反応するHumanoid
  {
    id: 'humanoid-sound-react',
    title: '音に反応',
    description: '拍手や声でHumanoidが動く',
    difficulty: 'intermediate',
    estimatedTime: 5,
    category: 'robots',
    sampleXml: `
<xml xmlns="https://developers.google.com/blockly/xml">
  <block type="arduino_setup" x="50" y="30">
    <statement name="SETUP">
      <block type="sound_init">
        <field name="PIN">34</field>
        <next>
          <block type="humanoid_init">
            <field name="PIN_LL">2</field>
            <field name="PIN_RL">4</field>
            <field name="PIN_LF">5</field>
            <field name="PIN_RF">18</field>
            <next>
              <block type="humanoid_home"></block>
            </next>
          </block>
        </next>
      </block>
    </statement>
  </block>
  <block type="arduino_loop" x="50" y="220">
    <statement name="LOOP">
      <block type="controls_if">
        <value name="IF0">
          <block type="sound_detected">
            <field name="THRESHOLD">1500</field>
          </block>
        </value>
        <statement name="DO0">
          <block type="humanoid_gesture">
            <field name="GESTURE">SuperHappy</field>
            <next>
              <block type="humanoid_dance">
                <field name="STEPS">4</field>
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
        </statement>
      </block>
    </statement>
  </block>
</xml>`,
    steps: [
      {
        id: 'sound-1',
        title: '音反応',
        content: '拍手や大きな音を検出するとHumanoidが超ハッピーになってダンスします。しきい値は環境に合わせて調整してください。',
        position: 'center',
      },
    ],
  },

  // チュートリアル9: 障害物回避
  {
    id: 'humanoid-obstacle',
    title: '障害物回避',
    description: '超音波センサーで障害物を避ける',
    difficulty: 'intermediate',
    estimatedTime: 5,
    category: 'robots',
    sampleXml: `
<xml xmlns="https://developers.google.com/blockly/xml">
  <block type="arduino_setup" x="50" y="30">
    <statement name="SETUP">
      <block type="ultrasonic_init">
        <field name="TRIG_PIN">12</field>
        <field name="ECHO_PIN">13</field>
        <next>
          <block type="humanoid_init">
            <field name="PIN_LL">2</field>
            <field name="PIN_RL">4</field>
            <field name="PIN_LF">5</field>
            <field name="PIN_RF">18</field>
            <next>
              <block type="humanoid_home"></block>
            </next>
          </block>
        </next>
      </block>
    </statement>
  </block>
  <block type="arduino_loop" x="50" y="220">
    <statement name="LOOP">
      <block type="controls_if">
        <mutation else="1"></mutation>
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
          <block type="humanoid_gesture">
            <field name="GESTURE">Confused</field>
            <next>
              <block type="humanoid_turn">
                <field name="STEPS">3</field>
                <field name="DIRECTION">1</field>
                <field name="SPEED">800</field>
              </block>
            </next>
          </block>
        </statement>
        <statement name="ELSE">
          <block type="humanoid_walk">
            <field name="STEPS">1</field>
            <field name="DIRECTION">1</field>
            <field name="SPEED">1000</field>
          </block>
        </statement>
      </block>
    </statement>
  </block>
</xml>`,
    steps: [
      {
        id: 'obstacle-1',
        title: '障害物回避',
        content: '20cm以内に障害物があると困惑して左に回転、なければ前進します。',
        position: 'center',
      },
    ],
  },

];

// カテゴリ別にグループ化
export const tutorialCategories = {
  basic: {
    name: '基本',
    description: 'プログラミングの基礎',
    tutorials: tutorials.filter(t => t.category === 'basic'),
  },
  robots: {
    name: 'ロボット',
    description: 'ロボットを動かす',
    tutorials: tutorials.filter(t => t.category === 'robots'),
  },
  competition: {
    name: '競技ロボット',
    description: 'ライントレース等',
    tutorials: tutorials.filter(t => t.category === 'competition'),
  },
};

// チュートリアルを取得
export function getTutorialById(id: string): Tutorial | undefined {
  return tutorials.find(t => t.id === id);
}
