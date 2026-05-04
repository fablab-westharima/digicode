/**
 * ESP32 静電容量タッチブロック (52.md Phase C、第80回 commit #5 / 2026-05-04)
 *
 * 2 ブロック構成 (Phase C 仕様書 §6.6 + 52.md §4.3):
 *   - esp32_touch_read              (PIN dropdown 9 choices、Number raw value)
 *   - esp32_touch_attach_interrupt  (PIN/THRESHOLD/HANDLER、loopPre_ pattern)
 *
 * 内部 lib: なし (ESP32 core 組込み touchRead / touchAttachInterrupt API)
 * boardRequires: null (DigiCode は ESP32 系 16 boards 専用、56.md 2026-05-05)
 *                ⚠️ ESP32-C3 / C6 / H2 はタッチセンサ不搭載 (compile fail) — tooltip で警告
 *                ⚠️ ESP32-S2 / S3 はタッチピン番号異なる (T1-T14 ≈ GPIO 1-14) — 将来 chip 別 dropdown 検討
 * 仕様: ESP32 オリジナル準拠 9 pin (T0=4 / T2=2 / T3=15 / T4=13 / T5=12 / T6=14 / T7=27 / T8=33 / T9=32)
 */
import * as Blockly from 'blockly';
import { javascriptGenerator, Order } from 'blockly/javascript';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const generator = javascriptGenerator as any;

const ESP32_TOUCH_COLOR = '#00BCD4';

const TOUCH_PIN_OPTIONS: [string, string][] = [
  ['T0 (GPIO 4)', '4'],
  ['T2 (GPIO 2)', '2'],
  ['T3 (GPIO 15)', '15'],
  ['T4 (GPIO 13)', '13'],
  ['T5 (GPIO 12)', '12'],
  ['T6 (GPIO 14)', '14'],
  ['T7 (GPIO 27)', '27'],
  ['T8 (GPIO 33)', '33'],
  ['T9 (GPIO 32)', '32'],
];

Blockly.Blocks['esp32_touch_read'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('✋ ' + (Blockly.Msg.BLOCKS_ESP32_TOUCH_READ || 'ESP32 タッチ ピン'))
        .appendField(new Blockly.FieldDropdown(TOUCH_PIN_OPTIONS), 'PIN');
    this.setOutput(true, 'Number');
    this.setColour(ESP32_TOUCH_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_ESP32_TOUCH_READ_TOOLTIP || 'ESP32 静電容量タッチピンの raw 値を読み取ります (0-1023、未接触で大きい / 触れると小さい)。ESP32 オリジナル + S2/S3 のみ動作、C3/C6/H2 不対応。');
  }
};

generator.forBlock['esp32_touch_read'] = function(block: Blockly.Block) {
  const pin = block.getFieldValue('PIN');
  return [`touchRead(${pin})`, Order.FUNCTION_CALL];
};

Blockly.Blocks['esp32_touch_attach_interrupt'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('✋ ' + (Blockly.Msg.BLOCKS_ESP32_TOUCH_ATTACH || 'ESP32 タッチ割り込み'))
        .appendField(Blockly.Msg.BLOCKS_ESP32_TOUCH_PIN || 'ピン')
        .appendField(new Blockly.FieldDropdown(TOUCH_PIN_OPTIONS), 'PIN');
    this.appendValueInput('THRESHOLD')
        .setCheck('Number')
        .appendField(Blockly.Msg.BLOCKS_ESP32_TOUCH_THRESHOLD || 'しきい値');
    this.appendStatementInput('HANDLER')
        .setCheck(null)
        .appendField(Blockly.Msg.BLOCKS_ESP32_TOUCH_HANDLER || 'したら');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(ESP32_TOUCH_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_ESP32_TOUCH_ATTACH_TOOLTIP || 'ESP32 タッチピンが指定しきい値より低い (=触れた) 時 HANDLER を実行します。touchAttachInterrupt 経由 ISR + loopPre_ で安全に loop 内実行。HANDLER は arduino_loop の中に配置必須。');
  }
};

generator.forBlock['esp32_touch_attach_interrupt'] = function(block: Blockly.Block) {
  const pin = block.getFieldValue('PIN');
  const threshold = generator.valueToCode(block, 'THRESHOLD', Order.ATOMIC) || '40';
  const handler = generator.statementToCode(block, 'HANDLER');

  // ISR: ESP32 IDF 4.x: touchAttachInterrupt(pin, fn, threshold). fn は IRAM_ATTR 必須。
  generator.definitions_[`esp32_touch_isr_${pin}`] = `
volatile bool esp32_touch_flag_${pin} = false;
void IRAM_ATTR esp32_touch_isr_${pin}() {
  esp32_touch_flag_${pin} = true;
}`;

  // ハンドラ関数 (loopPre_ で呼ばれる、ISR 外で安全に Serial / delay 利用可)
  generator.definitions_[`esp32_touch_handler_${pin}`] = `
void handleEsp32Touch_${pin}() {
${handler}}`;

  // setups_ で touchAttachInterrupt 登録
  if (!generator.setups_) generator.setups_ = {};
  generator.setups_[`esp32_touch_attach_${pin}`] =
    `touchAttachInterrupt(${pin}, esp32_touch_isr_${pin}, (uint16_t)(${threshold}));`;

  // loopPre_ でフラグ確認 + handler 実行 (post-U5 教訓、第69回確立)
  if (!generator.loopPre_) generator.loopPre_ = {};
  generator.loopPre_[`esp32_touch_check_${pin}`] = `
  if (esp32_touch_flag_${pin}) {
    esp32_touch_flag_${pin} = false;
    handleEsp32Touch_${pin}();
  }`;

  return '';
};

console.log('ESP32 capacitive touch blocks loaded');
