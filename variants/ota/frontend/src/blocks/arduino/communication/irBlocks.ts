/**
 * IR リモコンブロック (BP6-2, 2026-04-20)
 *
 * IRremoteESP8266 ライブラリ使用（ESP32/ESP8266 両対応、名前はESP8266だが実態は両対応）
 * ESP32 専用ではないが DigiCode の主要ターゲットは ESP32
 *
 * i18n: Blockly.Msg.* パターン（ルール33）
 */
import * as Blockly from 'blockly';
import { javascriptGenerator } from 'blockly/javascript';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const generator = javascriptGenerator as any;

if (!generator.definitions_) generator.definitions_ = {};

const IR_COLOR = '#FF6F00';

/**
 * ir_receiver_init - IR 受信器初期化
 */
Blockly.Blocks['ir_receiver_init'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('📺 ' + (Blockly.Msg.BLOCKS_IR_RECEIVERINIT || 'IR Receiver Init'))
        .appendField(Blockly.Msg.BLOCKS_IR_PIN || 'pin')
        .appendField(new Blockly.FieldNumber(14, 0, 39), 'PIN');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(IR_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_IR_RECEIVERINITTOOLTIP || 'Initialize IR receiver on the specified pin. Call in setup block.');
  }
};

generator.forBlock['ir_receiver_init'] = function(block: Blockly.Block) {
  const pin = block.getFieldValue('PIN');
  generator.definitions_['include_ir_recv'] = `
#include <IRrecv.h>
#include <IRutils.h>
IRrecv irRecv(${pin});
decode_results irResults;`;
  return `  irRecv.enableIRIn();\n`;
};

/**
 * ir_receiver_decode - 受信コードを取得（ポーリング方式）
 * 受信データがあれば hex 文字列、なければ "0" を返す
 */
Blockly.Blocks['ir_receiver_decode'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('📺 ' + (Blockly.Msg.BLOCKS_IR_RECEIVERDECODE || 'IR Receive Code'));
    this.setOutput(true, 'String');
    this.setColour(IR_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_IR_RECEIVERDECODETOOLTIP || 'Read received IR code as hex string. Returns "0" if no signal received. Place in loop block and compare to known codes.');
  }
};

generator.forBlock['ir_receiver_decode'] = function() {
  generator.definitions_['include_ir_recv'] = generator.definitions_['include_ir_recv'] || `
#include <IRrecv.h>
#include <IRutils.h>
IRrecv irRecv(14);
decode_results irResults;`;
  generator.definitions_['ir_decode_func'] = `
String irDecode() {
  if (irRecv.decode(&irResults)) {
    String code = String(irResults.value, HEX);
    irRecv.resume();
    return code;
  }
  return "0";
}`;
  return ['irDecode()', 0];
};

/**
 * ir_sender_init - IR 送信器初期化
 */
Blockly.Blocks['ir_sender_init'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('📺 ' + (Blockly.Msg.BLOCKS_IR_SENDERINIT || 'IR Sender Init'))
        .appendField(Blockly.Msg.BLOCKS_IR_PIN || 'pin')
        .appendField(new Blockly.FieldNumber(4, 0, 39), 'PIN');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(IR_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_IR_SENDERINIT_TOOLTIP || 'Initialize IR sender (LED) on the specified pin. Call in setup block.');
  }
};

generator.forBlock['ir_sender_init'] = function(block: Blockly.Block) {
  const pin = block.getFieldValue('PIN');
  generator.definitions_['include_ir_send'] = `
#include <IRsend.h>
IRsend irSend(${pin});`;
  return `  irSend.begin();\n`;
};

/**
 * ir_sender_send - IR 信号送信
 */
Blockly.Blocks['ir_sender_send'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('📺 ' + (Blockly.Msg.BLOCKS_IR_SEND || 'IR Send'))
        .appendField(new Blockly.FieldDropdown([
          ['NEC', 'NEC'],
          ['Sony', 'SONY'],
          ['Samsung', 'SAMSUNG'],
          ['RC5', 'RC5'],
          ['RC6', 'RC6'],
          ['JVC', 'JVC'],
          ['Panasonic', 'PANASONIC'],
        ]), 'PROTOCOL');
    this.appendValueInput('CODE')
        .setCheck('Number')
        .appendField(Blockly.Msg.BLOCKS_IR_CODE || 'code (hex)');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(IR_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_IR_SENDTOOLTIP || 'Send an IR signal with the specified protocol and code. Use the same code captured by ir_receiver_decode.');
  }
};

generator.forBlock['ir_sender_send'] = function(block: Blockly.Block) {
  const protocol = block.getFieldValue('PROTOCOL');
  const code = javascriptGenerator.valueToCode(block, 'CODE', 0) || '0';
  // post-Phase 4-4 commit 13 fix (case_0504):
  // IRremoteESP8266 v2.8+ の `IRsend::send` には 2 overload (verified via
  // ML30 stderr diagnostic、IRsend.h:298 + 300):
  //   1. `bool send(decode_type_t type, uint64_t data, uint16_t nbits, uint16_t repeat=0)`
  //   2. `bool send(decode_type_t type, const uint8_t* state, uint16_t nbytes)`
  // generator は `${code}` (default `'0'`) を 2 番目の arg として渡すが、
  // C++ では `0` literal は **null pointer constant** として解釈可能、
  // overload 1 (uint64_t) も overload 2 (const uint8_t*) も match して
  // `call of overloaded 'send(decode_type_t, int, int)' is ambiguous` で fail。
  // Fix: `(uint64_t)` cast で overload 1 に明示 dispatch、null pointer
  // 解釈 path を物理的に閉じる。第 3 引数 `32` (uint16_t nbits) は両 overload
  // 同型のため ambiguity に寄与せず維持。
  // emits: include_ir_send (IRsend instance) / requires: irSend declared
  // by ir_sender_init.
  generator.definitions_['include_ir_send'] = generator.definitions_['include_ir_send'] || `
#include <IRsend.h>
IRsend irSend(4);`;
  return `  /* requires: irSend (ir_sender_init) */ irSend.send(decode_type_t::${protocol}, (uint64_t)(${code}), 32);\n`;
};

console.log('IR remote blocks loaded');
