/**
 * デジタルセンサーブロック（Arduino C++）
 * Otto Blocklyスタイル - ボタン、PIR、傾斜、振動等
 * ピン番号は数値入力（FieldNumber）で統一
 *
 * i18n: Uses Blockly.Msg.* for dynamic language switching
 */
import * as Blockly from 'blockly';
import { javascriptGenerator, Order } from 'blockly/javascript';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const generator = javascriptGenerator as any;

const SENSOR_COLOR = '#f59e0b';  // Amber - デジタルセンサー

// ========================================
// ボタン/スイッチセンサー
// ========================================
Blockly.Blocks['button_sensor'] = {
  init: function(this: Blockly.Block) {
    this.appendDummyInput()
      .appendField((Blockly.Msg as any).BLOCKS_SENSOR_BUTTON_LABEL || 'Button Pin')
      .appendField(new Blockly.FieldNumber(2, 0, 39), 'PIN')
      .appendField(new Blockly.FieldDropdown([
        [(Blockly.Msg as any).BLOCKS_SENSOR_BUTTON_PRESSED || 'Pressed', 'pressed'],
        [(Blockly.Msg as any).BLOCKS_SENSOR_BUTTON_RELEASED || 'Released', 'released']
      ]) as any, 'STATE');
    this.setOutput(true, 'Boolean');
    this.setColour(SENSOR_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_SENSOR_BUTTON_TOOLTIP || 'Get button state');
  }
};

javascriptGenerator.forBlock['button_sensor'] = function(block: Blockly.Block) {
  const pin = block.getFieldValue('PIN');
  const state = block.getFieldValue('STATE');

  generator.definitions_[`button_pin_${pin}`] = `#define BUTTON_PIN_${pin} ${pin}`;
  generator.setups_[`button_setup_${pin}`] = `  pinMode(BUTTON_PIN_${pin}, INPUT_PULLUP);`;

  const code = state === 'pressed'
    ? `(digitalRead(BUTTON_PIN_${pin}) == LOW)`
    : `(digitalRead(BUTTON_PIN_${pin}) == HIGH)`;
  return [code, Order.RELATIONAL];
};

// ========================================
// PIRモーションセンサー
// ========================================
Blockly.Blocks['pir_sensor'] = {
  init: function(this: Blockly.Block) {
    this.appendDummyInput()
      .appendField((Blockly.Msg as any).BLOCKS_SENSOR_PIR_LABEL || 'PIR Sensor Pin')
      .appendField(new Blockly.FieldNumber(2, 0, 39), 'PIN')
      .appendField((Blockly.Msg as any).BLOCKS_SENSOR_PIR_DETECT || 'Motion Detected');
    this.setOutput(true, 'Boolean');
    this.setColour(SENSOR_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_SENSOR_PIR_TOOLTIP || 'Detect motion');
  }
};

javascriptGenerator.forBlock['pir_sensor'] = function(block: Blockly.Block) {
  const pin = block.getFieldValue('PIN');

  generator.definitions_[`pir_pin_${pin}`] = `#define PIR_PIN_${pin} ${pin}`;
  generator.setups_[`pir_setup_${pin}`] = `  pinMode(PIR_PIN_${pin}, INPUT);`;

  const code = `(digitalRead(PIR_PIN_${pin}) == HIGH)`;
  return [code, Order.RELATIONAL];
};

// ========================================
// 傾斜センサー
// ========================================
Blockly.Blocks['tilt_sensor'] = {
  init: function(this: Blockly.Block) {
    this.appendDummyInput()
      .appendField((Blockly.Msg as any).BLOCKS_SENSOR_TILT_LABEL || 'Tilt Sensor Pin')
      .appendField(new Blockly.FieldNumber(2, 0, 39), 'PIN')
      .appendField((Blockly.Msg as any).BLOCKS_SENSOR_TILT_DETECT || 'Tilt Detected');
    this.setOutput(true, 'Boolean');
    this.setColour(SENSOR_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_SENSOR_TILT_TOOLTIP || 'Detect tilt');
  }
};

javascriptGenerator.forBlock['tilt_sensor'] = function(block: Blockly.Block) {
  const pin = block.getFieldValue('PIN');

  generator.definitions_[`tilt_pin_${pin}`] = `#define TILT_PIN_${pin} ${pin}`;
  generator.setups_[`tilt_setup_${pin}`] = `  pinMode(TILT_PIN_${pin}, INPUT);`;

  const code = `(digitalRead(TILT_PIN_${pin}) == HIGH)`;
  return [code, Order.RELATIONAL];
};

// ========================================
// 振動センサー（デジタル）
// ========================================
Blockly.Blocks['vibration_sensor'] = {
  init: function(this: Blockly.Block) {
    this.appendDummyInput()
      .appendField((Blockly.Msg as any).BLOCKS_SENSOR_VIBRATION_LABEL || 'Vibration Sensor Pin')
      .appendField(new Blockly.FieldNumber(2, 0, 39), 'PIN')
      .appendField((Blockly.Msg as any).BLOCKS_SENSOR_VIBRATION_DETECT || 'Vibration Detected');
    this.setOutput(true, 'Boolean');
    this.setColour(SENSOR_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_SENSOR_VIBRATION_TOOLTIP || 'Detect vibration');
  }
};

javascriptGenerator.forBlock['vibration_sensor'] = function(block: Blockly.Block) {
  const pin = block.getFieldValue('PIN');

  generator.definitions_[`vibration_pin_${pin}`] = `#define VIBRATION_PIN_${pin} ${pin}`;
  generator.setups_[`vibration_setup_${pin}`] = `  pinMode(VIBRATION_PIN_${pin}, INPUT);`;

  const code = `(digitalRead(VIBRATION_PIN_${pin}) == HIGH)`;
  return [code, Order.RELATIONAL];
};

// ========================================
// ホールセンサー（磁気センサー）
// ========================================
Blockly.Blocks['hall_sensor'] = {
  init: function(this: Blockly.Block) {
    this.appendDummyInput()
      .appendField((Blockly.Msg as any).BLOCKS_SENSOR_HALL_LABEL || 'Hall Sensor Pin')
      .appendField(new Blockly.FieldNumber(2, 0, 39), 'PIN')
      .appendField((Blockly.Msg as any).BLOCKS_SENSOR_HALL_DETECT || 'Magnet Detected');
    this.setOutput(true, 'Boolean');
    this.setColour(SENSOR_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_SENSOR_HALL_TOOLTIP || 'Detect magnet');
  }
};

javascriptGenerator.forBlock['hall_sensor'] = function(block: Blockly.Block) {
  const pin = block.getFieldValue('PIN');

  generator.definitions_[`hall_pin_${pin}`] = `#define HALL_PIN_${pin} ${pin}`;
  generator.setups_[`hall_setup_${pin}`] = `  pinMode(HALL_PIN_${pin}, INPUT);`;

  const code = `(digitalRead(HALL_PIN_${pin}) == LOW)`;
  return [code, Order.RELATIONAL];
};

// ========================================
// ESP32内蔵ホールセンサー
// ========================================
Blockly.Blocks['hall_sensor_esp32'] = {
  init: function(this: Blockly.Block) {
    this.appendDummyInput()
      .appendField((Blockly.Msg as any).BLOCKS_SENSOR_HALLESP32_LABEL || 'ESP32 Built-in Hall Sensor');
    this.setOutput(true, 'Number');
    this.setColour(SENSOR_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_SENSOR_HALLESP32_TOOLTIP || 'Get ESP32 hall sensor value');
  }
};

javascriptGenerator.forBlock['hall_sensor_esp32'] = function() {
  const code = 'hallRead()';
  return [code, Order.FUNCTION_CALL];
};

// ========================================
// IRフォトインタラプタ
// ========================================
Blockly.Blocks['photo_interrupter'] = {
  init: function(this: Blockly.Block) {
    this.appendDummyInput()
      .appendField((Blockly.Msg as any).BLOCKS_SENSOR_PHOTOINTERRUPTER_LABEL || 'Photo Interrupter Pin')
      .appendField(new Blockly.FieldNumber(2, 0, 39), 'PIN')
      .appendField((Blockly.Msg as any).BLOCKS_SENSOR_PHOTOINTERRUPTER_DETECT || 'Interrupted');
    this.setOutput(true, 'Boolean');
    this.setColour(SENSOR_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_SENSOR_PHOTOINTERRUPTER_TOOLTIP || 'Detect interruption');
  }
};

javascriptGenerator.forBlock['photo_interrupter'] = function(block: Blockly.Block) {
  const pin = block.getFieldValue('PIN');

  generator.definitions_[`photo_pin_${pin}`] = `#define PHOTO_INT_PIN_${pin} ${pin}`;
  generator.setups_[`photo_setup_${pin}`] = `  pinMode(PHOTO_INT_PIN_${pin}, INPUT);`;

  const code = `(digitalRead(PHOTO_INT_PIN_${pin}) == LOW)`;
  return [code, Order.RELATIONAL];
};

// ========================================
// IR障害物センサー
// ========================================
Blockly.Blocks['ir_obstacle_sensor'] = {
  init: function(this: Blockly.Block) {
    this.appendDummyInput()
      .appendField((Blockly.Msg as any).BLOCKS_SENSOR_IROBSTACLE_LABEL || 'IR Obstacle Sensor Pin')
      .appendField(new Blockly.FieldNumber(2, 0, 39), 'PIN')
      .appendField((Blockly.Msg as any).BLOCKS_SENSOR_IROBSTACLE_DETECT || 'Obstacle Detected');
    this.setOutput(true, 'Boolean');
    this.setColour(SENSOR_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_SENSOR_IROBSTACLE_TOOLTIP || 'Detect obstacle');
  }
};

javascriptGenerator.forBlock['ir_obstacle_sensor'] = function(block: Blockly.Block) {
  const pin = block.getFieldValue('PIN');

  generator.definitions_[`ir_obs_pin_${pin}`] = `#define IR_OBS_PIN_${pin} ${pin}`;
  generator.setups_[`ir_obs_setup_${pin}`] = `  pinMode(IR_OBS_PIN_${pin}, INPUT);`;

  const code = `(digitalRead(IR_OBS_PIN_${pin}) == LOW)`;
  return [code, Order.RELATIONAL];
};

// ========================================
// 炎センサー（デジタル）
// ========================================
Blockly.Blocks['flame_sensor_digital'] = {
  init: function(this: Blockly.Block) {
    this.appendDummyInput()
      .appendField((Blockly.Msg as any).BLOCKS_SENSOR_FLAMEDIGITAL_LABEL || 'Flame Sensor(D) Pin')
      .appendField(new Blockly.FieldNumber(2, 0, 39), 'PIN')
      .appendField((Blockly.Msg as any).BLOCKS_SENSOR_FLAMEDIGITAL_DETECT || 'Flame Detected');
    this.setOutput(true, 'Boolean');
    this.setColour(SENSOR_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_SENSOR_FLAMEDIGITAL_TOOLTIP || 'Detect flame');
  }
};

javascriptGenerator.forBlock['flame_sensor_digital'] = function(block: Blockly.Block) {
  const pin = block.getFieldValue('PIN');

  generator.definitions_[`flame_pin_${pin}`] = `#define FLAME_PIN_${pin} ${pin}`;
  generator.setups_[`flame_setup_${pin}`] = `  pinMode(FLAME_PIN_${pin}, INPUT);`;

  const code = `(digitalRead(FLAME_PIN_${pin}) == LOW)`;
  return [code, Order.RELATIONAL];
};

// ========================================
// ガスセンサー（デジタル出力）
// ========================================
Blockly.Blocks['gas_sensor_digital'] = {
  init: function(this: Blockly.Block) {
    this.appendDummyInput()
      .appendField((Blockly.Msg as any).BLOCKS_SENSOR_GASDIGITAL_LABEL || 'Gas Sensor(D) Pin')
      .appendField(new Blockly.FieldNumber(2, 0, 39), 'PIN')
      .appendField((Blockly.Msg as any).BLOCKS_SENSOR_GASDIGITAL_DETECT || 'Gas Detected');
    this.setOutput(true, 'Boolean');
    this.setColour(SENSOR_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_SENSOR_GASDIGITAL_TOOLTIP || 'Detect gas');
  }
};

javascriptGenerator.forBlock['gas_sensor_digital'] = function(block: Blockly.Block) {
  const pin = block.getFieldValue('PIN');

  generator.definitions_[`gas_pin_${pin}`] = `#define GAS_PIN_${pin} ${pin}`;
  generator.setups_[`gas_setup_${pin}`] = `  pinMode(GAS_PIN_${pin}, INPUT);`;

  const code = `(digitalRead(GAS_PIN_${pin}) == LOW)`;
  return [code, Order.RELATIONAL];
};

// ========================================
// リミットスイッチ
// ========================================
Blockly.Blocks['limit_switch'] = {
  init: function(this: Blockly.Block) {
    this.appendDummyInput()
      .appendField((Blockly.Msg as any).BLOCKS_SENSOR_LIMITSWITCH_LABEL || 'Limit Switch Pin')
      .appendField(new Blockly.FieldNumber(2, 0, 39), 'PIN')
      .appendField((Blockly.Msg as any).BLOCKS_SENSOR_LIMITSWITCH_DETECT || 'Switch Activated');
    this.setOutput(true, 'Boolean');
    this.setColour(SENSOR_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_SENSOR_LIMITSWITCH_TOOLTIP || 'Get limit switch state');
  }
};

javascriptGenerator.forBlock['limit_switch'] = function(block: Blockly.Block) {
  const pin = block.getFieldValue('PIN');

  generator.definitions_[`limit_pin_${pin}`] = `#define LIMIT_PIN_${pin} ${pin}`;
  generator.setups_[`limit_setup_${pin}`] = `  pinMode(LIMIT_PIN_${pin}, INPUT_PULLUP);`;

  const code = `(digitalRead(LIMIT_PIN_${pin}) == LOW)`;
  return [code, Order.RELATIONAL];
};

// ========================================
// デジタル入力（汎用）
// ========================================
Blockly.Blocks['digital_read'] = {
  init: function(this: Blockly.Block) {
    this.appendDummyInput()
      .appendField((Blockly.Msg as any).BLOCKS_SENSOR_DIGITALREAD_LABEL || 'Digital Read Pin')
      .appendField(new Blockly.FieldNumber(2, 0, 39), 'PIN')
      .appendField(new Blockly.FieldDropdown([
        [(Blockly.Msg as any).BLOCKS_SENSOR_DIGITALREAD_PULLUP || 'Pull-up', 'pullup'],
        [(Blockly.Msg as any).BLOCKS_SENSOR_DIGITALREAD_PULLDOWN || 'Pull-down', 'pulldown'],
        [(Blockly.Msg as any).BLOCKS_SENSOR_DIGITALREAD_NONE || 'None', 'none']
      ]) as any, 'MODE');
    this.setOutput(true, 'Boolean');
    this.setColour(SENSOR_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_SENSOR_DIGITALREAD_TOOLTIP || 'Read digital pin state');
  }
};

javascriptGenerator.forBlock['digital_read'] = function(block: Blockly.Block) {
  const pin = block.getFieldValue('PIN');
  const mode = block.getFieldValue('MODE');

  let modeStr = 'INPUT';
  if (mode === 'pullup') modeStr = 'INPUT_PULLUP';
  else if (mode === 'pulldown') modeStr = 'INPUT_PULLDOWN';

  generator.definitions_[`din_pin_${pin}`] = `#define DIN_PIN_${pin} ${pin}`;
  generator.setups_[`din_setup_${pin}`] = `  pinMode(DIN_PIN_${pin}, ${modeStr});`;

  const code = `(digitalRead(DIN_PIN_${pin}) == HIGH)`;
  return [code, Order.RELATIONAL];
};

export {};
