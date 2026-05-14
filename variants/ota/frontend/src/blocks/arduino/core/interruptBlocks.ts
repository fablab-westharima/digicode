/*
 * DigiCode - Block-based ESP32 Programming Tool
 * Copyright (C) 2024-2026 DigiCo LLC
 *
 * Licensed under the GNU Affero General Public License version 3 or later.
 * See LICENSE file in the repository root for full terms.
 */

/**
 * 割り込み・タイマーブロック (BP2-1, 2026-04-20)
 *
 * attach_interrupt / detach_interrupt: Arduino 標準 API
 * ticker_attach / ticker_detach: ESP32 の Ticker.h
 *
 * DigiCode は ESP32 系 16 boards 専用 (56.md 2026-05-05)。
 *
 * ハンドラは appendStatementInput('HANDLER') パターンで定義
 * （mqtt_on_message のコールバックパターンを流用）
 *
 * i18n: Blockly.Msg.* パターン（ルール33）
 */
import * as Blockly from 'blockly';
import { javascriptGenerator } from 'blockly/javascript';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const generator = javascriptGenerator as any;

if (!generator.definitions_) generator.definitions_ = {};

const INTERRUPT_COLOR = '#E91E63';
const TICKER_COLOR = '#9C27B0';

// ===== ピン割り込み =====

/**
 * attach_interrupt - ピン割り込み設定
 * appendStatementInput でハンドラコードを定義
 */
Blockly.Blocks['attach_interrupt'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('⚡ ' + (Blockly.Msg.BLOCKS_INTERRUPT_ATTACH || 'Attach Interrupt'))
        .appendField(Blockly.Msg.BLOCKS_INTERRUPT_PIN || 'pin')
        .appendField(new Blockly.FieldNumber(2, 0, 39), 'PIN')
        .appendField(Blockly.Msg.BLOCKS_INTERRUPT_MODE || 'mode')
        .appendField(new Blockly.FieldDropdown([
          ['RISING', 'RISING'],
          ['FALLING', 'FALLING'],
          ['CHANGE', 'CHANGE'],
        ]), 'MODE');
    this.appendStatementInput('HANDLER')
        .setCheck(null)
        .appendField(Blockly.Msg.BLOCKS_INTERRUPT_HANDLER || 'handler');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(INTERRUPT_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_INTERRUPT_ATTACHTOOLTIP || 'Attach an interrupt handler to a pin. Handler runs when the pin state changes. Avoid delay() and Serial inside the handler.');
  }
};

javascriptGenerator.forBlock['attach_interrupt'] = function(block: Blockly.Block) {
  const pin = block.getFieldValue('PIN');
  const mode = block.getFieldValue('MODE');
  const handler = javascriptGenerator.statementToCode(block, 'HANDLER');

  const funcName = `isr_pin${pin}`;

  // case 19 axis 2 (Session 119 G5): 同 pin に対する attach_interrupt 二重配置で
  // handler statement が silent 上書きされる risk を first-wins guard で防御。
  // ESP32 attachInterrupt 自身も同 pin 二度目呼び出しは latter-wins 仕様だが、
  // ここでは emit 側を first-wins 化し、user の最初の意図 (handler body) を保持する。
  if (!generator.definitions_[`volatile_isr_${pin}`]) {
    generator.definitions_[`volatile_isr_${pin}`] = `volatile bool isr_flag_${pin} = false;`;
  }
  if (!generator.definitions_[`isr_func_${pin}`]) {
    generator.definitions_[`isr_func_${pin}`] = `
void IRAM_ATTR ${funcName}() {
  isr_flag_${pin} = true;
}`;
  }
  if (!generator.definitions_[`isr_handler_${pin}`]) {
    generator.definitions_[`isr_handler_${pin}`] = `
void handleInterrupt_${pin}() {
  if (isr_flag_${pin}) {
    isr_flag_${pin} = false;
${handler}  }
}`;
  }

  return `  attachInterrupt(digitalPinToInterrupt(${pin}), ${funcName}, ${mode});\n`;
};

/**
 * detach_interrupt - ピン割り込み解除
 */
Blockly.Blocks['detach_interrupt'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('⚡ ' + (Blockly.Msg.BLOCKS_INTERRUPT_DETACH || 'Detach Interrupt'))
        .appendField(Blockly.Msg.BLOCKS_INTERRUPT_PIN || 'pin')
        .appendField(new Blockly.FieldNumber(2, 0, 39), 'PIN');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(INTERRUPT_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_INTERRUPT_DETACHTOOLTIP || 'Remove the interrupt handler from a pin');
  }
};

javascriptGenerator.forBlock['detach_interrupt'] = function(block: Blockly.Block) {
  const pin = block.getFieldValue('PIN');
  return `  detachInterrupt(digitalPinToInterrupt(${pin}));\n`;
};

/**
 * check_interrupt - 割り込みフラグ確認（loop 内で呼ぶ）
 */
Blockly.Blocks['check_interrupt'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('⚡ ' + (Blockly.Msg.BLOCKS_INTERRUPT_CHECK || 'Check Interrupt'))
        .appendField(Blockly.Msg.BLOCKS_INTERRUPT_PIN || 'pin')
        .appendField(new Blockly.FieldNumber(2, 0, 39), 'PIN');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(INTERRUPT_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_INTERRUPT_CHECKTOOLTIP || 'Check and execute the interrupt handler if triggered. Place this in the loop block.');
  }
};

javascriptGenerator.forBlock['check_interrupt'] = function(block: Blockly.Block) {
  const pin = block.getFieldValue('PIN');
  return `  handleInterrupt_${pin}();\n`;
};

// ===== Ticker（ESP32 専用）=====

/**
 * ticker_attach - Ticker 定期実行（ESP32 専用）
 *
 * INTERVAL_MS is a value input (default shadow math_number 1000). Conversion
 * to seconds (Ticker.attach() expects float seconds) now happens at runtime
 * so dynamic intervals work correctly. Legacy XML field-style loads with
 * empty input; generator falls back to '1000' ms (sunset: 2027-05-03).
 */
Blockly.Blocks['ticker_attach'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('⏱️ ' + (Blockly.Msg.BLOCKS_TICKER_ATTACH || 'Ticker Start'));
    this.appendValueInput('INTERVAL_MS')
        .setCheck('Number')
        .appendField(Blockly.Msg.BLOCKS_TICKER_INTERVAL || 'interval');
    this.appendDummyInput()
        .appendField('ms');
    this.appendStatementInput('CALLBACK')
        .setCheck(null)
        .appendField(Blockly.Msg.BLOCKS_TICKER_HANDLER || 'handler');
    this.setInputsInline(true);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(TICKER_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_TICKER_ATTACHTOOLTIP || 'Execute handler code periodically at the specified interval (ESP32 only, uses Ticker.h)');
  }
};

javascriptGenerator.forBlock['ticker_attach'] = function(block: Blockly.Block) {
  const intervalMs = generator.valueToCode(block, 'INTERVAL_MS', generator.ORDER_ATOMIC) || '1000';
  const callback = javascriptGenerator.statementToCode(block, 'CALLBACK');

  generator.definitions_['include_ticker'] = '#include <Ticker.h>';
  generator.definitions_['ticker_instance'] = 'Ticker digicodeTicker;';
  generator.definitions_['ticker_flag'] = 'volatile bool tickerFlag = false;';
  generator.definitions_['ticker_isr'] = `
void tickerISR() {
  tickerFlag = true;
}`;
  generator.definitions_['ticker_handler'] = `
void tickerHandler() {
  if (tickerFlag) {
    tickerFlag = false;
${callback}  }
}`;

  // String().toInt() wrap so any input type compiles (BLE String, variable,
  // numeric literal). Ticker.attach() expects seconds (float) — divide by
  // 1000.0 at runtime; minor truncation OK for typical ms-int intervals.
  return `  digicodeTicker.attach(String(${intervalMs}).toInt() / 1000.0, tickerISR);\n`;
};

/**
 * ticker_detach - Ticker 停止
 */
Blockly.Blocks['ticker_detach'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('⏱️ ' + (Blockly.Msg.BLOCKS_TICKER_DETACH || 'Ticker Stop'));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(TICKER_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_TICKER_DETACHTOOLTIP || 'Stop the periodic ticker');
  }
};

javascriptGenerator.forBlock['ticker_detach'] = function() {
  return '  digicodeTicker.detach();\n';
};

/**
 * check_ticker - Ticker ハンドラ確認（loop 内で呼ぶ）
 */
Blockly.Blocks['check_ticker'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('⏱️ ' + (Blockly.Msg.BLOCKS_TICKER_CHECK || 'Check Ticker'));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(TICKER_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_TICKER_CHECKTOOLTIP || 'Check and execute the ticker handler if triggered. Place this in the loop block.');
  }
};

javascriptGenerator.forBlock['check_ticker'] = function() {
  return '  tickerHandler();\n';
};

console.log('Interrupt/Ticker blocks loaded');
