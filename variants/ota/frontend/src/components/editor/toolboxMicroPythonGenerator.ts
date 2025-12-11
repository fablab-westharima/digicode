/**
 * MicroPython Toolbox Generator
 * ロボットモードに応じたツールボックスを動的生成
 */
import type { RobotMode } from '../../stores/robotModeStore';
import i18n from '@/i18n';

// i18n ヘルパー関数
const t = (key: string) => i18n.t(key);
const cat = (key: string) => t(`toolboxMp.categories.${key}`);
const label = (key: string) => t(`toolboxMp.labels.${key}`);

// 基本カテゴリ（共通）
const getBaseCategories = () => ({
  logic: `
  <category name="${cat('logic')}" colour="#5C81A6">
    <block type="controls_if"></block>
    <block type="controls_ifelse"></block>
    <block type="logic_compare"><field name="OP">EQ</field></block>
    <block type="logic_operation"><field name="OP">AND</field></block>
    <block type="logic_negate"></block>
    <block type="logic_boolean"><field name="BOOL">TRUE</field></block>
    <block type="logic_null"></block>
    <block type="logic_ternary"></block>
  </category>`,

  loops: `
  <category name="${cat('loops')}" colour="#5CA65C">
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
    <block type="controls_forEach"></block>
    <block type="controls_flow_statements"><field name="FLOW">BREAK</field></block>
  </category>`,

  math: `
  <category name="${cat('math')}" colour="#5C68A6">
    <block type="math_number"><field name="NUM">0</field></block>
    <block type="math_arithmetic">
      <value name="A"><shadow type="math_number"><field name="NUM">1</field></shadow></value>
      <value name="B"><shadow type="math_number"><field name="NUM">1</field></shadow></value>
    </block>
    <block type="math_single">
      <value name="NUM"><shadow type="math_number"><field name="NUM">9</field></shadow></value>
    </block>
    <block type="math_trig">
      <value name="NUM"><shadow type="math_number"><field name="NUM">45</field></shadow></value>
    </block>
    <block type="math_constant"><field name="CONSTANT">PI</field></block>
    <block type="math_random_int">
      <value name="FROM"><shadow type="math_number"><field name="NUM">1</field></shadow></value>
      <value name="TO"><shadow type="math_number"><field name="NUM">100</field></shadow></value>
    </block>
    <block type="math_modulo">
      <value name="DIVIDEND"><shadow type="math_number"><field name="NUM">64</field></shadow></value>
      <value name="DIVISOR"><shadow type="math_number"><field name="NUM">10</field></shadow></value>
    </block>
    <block type="math_constrain">
      <value name="VALUE"><shadow type="math_number"><field name="NUM">50</field></shadow></value>
      <value name="LOW"><shadow type="math_number"><field name="NUM">1</field></shadow></value>
      <value name="HIGH"><shadow type="math_number"><field name="NUM">100</field></shadow></value>
    </block>
  </category>`,

  text: `
  <category name="${cat('text')}" colour="#5CA68D">
    <block type="text"><field name="TEXT"></field></block>
    <block type="text_join"></block>
    <block type="text_length">
      <value name="VALUE"><shadow type="text"><field name="TEXT">abc</field></shadow></value>
    </block>
    <block type="text_print">
      <value name="TEXT"><shadow type="text"><field name="TEXT">Hello</field></shadow></value>
    </block>
    <block type="text_isEmpty">
      <value name="VALUE"><shadow type="text"><field name="TEXT"></field></shadow></value>
    </block>
  </category>`,

  variables: `<category name="${cat('variables')}" colour="#A65C81" custom="VARIABLE"></category>`,
  functions: `<category name="${cat('functions')}" colour="#9A5CA6" custom="PROCEDURE"></category>`,

  lists: `
  <category name="${cat('lists')}" colour="#9C27B0">
    <label text="${label('createList')}"></label>
    <block type="mp_list_create_empty"></block>
    <block type="mp_list_create_with"></block>
    <sep></sep>
    <label text="${label('addInsert')}"></label>
    <block type="mp_list_append"></block>
    <block type="mp_list_insert"></block>
    <sep></sep>
    <label text="${label('getSet')}"></label>
    <block type="mp_list_get"></block>
    <block type="mp_list_set"></block>
    <block type="mp_list_length"></block>
    <sep></sep>
    <label text="${label('delete')}"></label>
    <block type="mp_list_remove_index"></block>
    <block type="mp_list_remove_value"></block>
    <block type="mp_list_clear"></block>
    <sep></sep>
    <label text="${label('searchCheck')}"></label>
    <block type="mp_list_contains"></block>
    <block type="mp_list_index"></block>
    <sep></sep>
    <label text="${label('operation')}"></label>
    <block type="mp_list_reverse"></block>
    <block type="mp_list_sort"></block>
  </category>`,
});

// MicroPython Machineカテゴリ
const getMachineCategories = () => ({
  pin: `
  <category name="${cat('gpio')}" colour="#4CAF50">
    <label text="${label('digitalOutput')}"></label>
    <block type="mp_pin_output"></block>
    <block type="mp_pin_toggle"></block>
    <sep></sep>
    <label text="${label('digitalInput')}"></label>
    <block type="mp_pin_input"></block>
  </category>`,

  pwm: `
  <category name="${cat('pwm')}" colour="#4CAF50">
    <block type="mp_pwm_init"></block>
    <block type="mp_pwm_duty"></block>
  </category>`,

  adc: `
  <category name="${cat('adc')}" colour="#4CAF50">
    <block type="mp_adc_read"></block>
  </category>`,

  time: `
  <category name="${cat('time')}" colour="#4CAF50">
    <block type="mp_sleep_ms">
      <value name="TIME"><shadow type="math_number"><field name="NUM">1000</field></shadow></value>
    </block>
    <block type="mp_sleep">
      <value name="TIME"><shadow type="math_number"><field name="NUM">1</field></shadow></value>
    </block>
    <block type="mp_ticks_ms"></block>
  </category>`,

  i2c: `
  <category name="${cat('i2c')}" colour="#4CAF50">
    <block type="mp_i2c_init"></block>
    <block type="mp_i2c_scan"></block>
  </category>`,

  uart: `
  <category name="${cat('uart')}" colour="#4CAF50">
    <block type="mp_uart_init"></block>
    <block type="mp_uart_write"></block>
    <block type="mp_uart_read"></block>
  </category>`,
});

// ロボットカテゴリ
const getRobotCategories = () => ({
  otto_bipedal: `
  <category name="${cat('ottoBipedal')}" colour="#FF6B35">
    <label text="${label('initialize')}"></label>
    <block type="mp_otto_init"></block>
    <block type="mp_otto_home"></block>
    <sep></sep>
    <label text="${label('movement')}"></label>
    <block type="mp_otto_walk"></block>
    <block type="mp_otto_turn"></block>
    <block type="mp_otto_jump"></block>
    <block type="mp_otto_moonwalk"></block>
    <sep></sep>
    <label text="${label('gesture')}"></label>
    <block type="mp_otto_dance"></block>
    <block type="mp_otto_swing"></block>
    <block type="mp_otto_bend"></block>
    <sep></sep>
    <label text="${label('detailedControl')}"></label>
    <block type="mp_otto_servo"></block>
  </category>`,

  otto_wheel: `
  <category name="${cat('ottoWheel')}" colour="#4CAF50">
    <label text="${label('initialize')}"></label>
    <block type="mp_otto_wheel_init"></block>
    <sep></sep>
    <label text="${label('movement')}"></label>
    <block type="mp_otto_wheel_forward"></block>
    <block type="mp_otto_wheel_backward"></block>
    <block type="mp_otto_wheel_turn_left"></block>
    <block type="mp_otto_wheel_turn_right"></block>
    <sep></sep>
    <label text="${label('spin')}"></label>
    <block type="mp_otto_wheel_spin_left"></block>
    <block type="mp_otto_wheel_spin_right"></block>
    <block type="mp_otto_wheel_stop"></block>
    <sep></sep>
    <label text="${label('detailedControl')}"></label>
    <block type="mp_otto_wheel_motors"></block>
  </category>`,

  otto_ninja: `
  <category name="${cat('ottoNinja')}" colour="#9C27B0">
    <label text="${label('initSettings')}"></label>
    <block type="mp_otto_ninja_init"></block>
    <block type="mp_otto_ninja_mode"></block>
    <block type="mp_otto_ninja_transform"></block>
    <block type="mp_otto_ninja_align"></block>
    <block type="mp_otto_ninja_home"></block>
    <sep></sep>
    <label text="${label('walkMode')}"></label>
    <block type="mp_otto_ninja_walk"></block>
    <block type="mp_otto_ninja_turn"></block>
    <block type="mp_otto_ninja_trot"></block>
    <block type="mp_otto_ninja_stop"></block>
    <sep></sep>
    <label text="${label('rollMode')}"></label>
    <block type="mp_otto_ninja_roll"></block>
    <block type="mp_otto_ninja_roll_rotate"></block>
    <sep></sep>
    <label text="${label('gesture')}"></label>
    <block type="mp_otto_ninja_pushup"></block>
    <block type="mp_otto_ninja_dance"></block>
  </category>`,
});

// センサーカテゴリ
const getSensorCategories = () => ({
  ultrasonic: `
  <category name="${cat('ultrasonic')}" colour="#FF9800">
    <block type="mp_ultrasonic_init"></block>
    <block type="mp_ultrasonic_distance"></block>
  </category>`,

  dht: `
  <category name="${cat('dht')}" colour="#FF9800">
    <block type="mp_dht_init"></block>
    <block type="mp_dht_temperature"></block>
    <block type="mp_dht_humidity"></block>
  </category>`,

  digital: `
  <category name="${cat('digitalSensor')}" colour="#FF9800">
    <block type="mp_button_sensor"></block>
    <block type="mp_pir_sensor"></block>
    <block type="mp_digital_sensor"></block>
  </category>`,

  analog: `
  <category name="${cat('analogSensor')}" colour="#FF9800">
    <block type="mp_potentiometer"></block>
    <block type="mp_ldr_sensor"></block>
    <block type="mp_soil_sensor"></block>
    <block type="mp_analog_sensor"></block>
  </category>`,
});

/**
 * ロボットモードに応じたMicroPythonツールボックスを生成
 */
export function generateMicroPythonToolbox(mode: RobotMode): string {
  const categories: string[] = [];

  // カテゴリを取得（翻訳を適用）
  const baseCategories = getBaseCategories();
  const machineCategories = getMachineCategories();
  const robotCategories = getRobotCategories();
  const sensorCategories = getSensorCategories();

  // 基本カテゴリ
  categories.push(baseCategories.logic);
  categories.push(baseCategories.loops);
  categories.push(baseCategories.math);
  categories.push(baseCategories.text);
  categories.push(baseCategories.variables);
  categories.push(baseCategories.functions);
  categories.push(baseCategories.lists);

  // セパレータ
  categories.push('<sep></sep>');

  // Machine カテゴリ
  categories.push(machineCategories.pin);
  categories.push(machineCategories.pwm);
  categories.push(machineCategories.adc);
  categories.push(machineCategories.time);

  // セパレータ
  categories.push('<sep></sep>');

  // ロボットモードに応じたカテゴリ
  switch (mode) {
    case 'otto_bipedal':
      categories.push(robotCategories.otto_bipedal);
      categories.push(sensorCategories.ultrasonic);
      break;

    case 'otto_wheel':
      categories.push(robotCategories.otto_wheel);
      categories.push(sensorCategories.ultrasonic);
      break;

    case 'otto_ninja':
      categories.push(robotCategories.otto_ninja);
      categories.push(sensorCategories.ultrasonic);
      break;

    case 'micromouse':
    case 'line_trace':
      // マウス・ライントレース用（基本センサー）
      categories.push(sensorCategories.ultrasonic);
      categories.push(sensorCategories.digital);
      categories.push(sensorCategories.analog);
      break;

    case 'custom':
    default:
      // カスタムモード：全カテゴリ表示
      categories.push(robotCategories.otto_bipedal);
      categories.push(robotCategories.otto_wheel);
      categories.push(robotCategories.otto_ninja);
      categories.push('<sep></sep>');
      categories.push(sensorCategories.ultrasonic);
      categories.push(sensorCategories.dht);
      categories.push(sensorCategories.digital);
      categories.push(sensorCategories.analog);
      categories.push('<sep></sep>');
      categories.push(machineCategories.i2c);
      categories.push(machineCategories.uart);
      break;
  }

  return `<xml xmlns="https://developers.google.com/blockly/xml" id="toolbox" style="display: none">
${categories.join('\n')}
</xml>`;
}
