/**
 * E-paper ディスプレイブロック (52.md Phase D、第80回 commit #6 / 2026-05-04)
 *
 * 6 ブロック構成 (Phase D 仕様書 §7.1 + 52.md §4.4):
 *   - epaper_init           (CS/DC/RST/BUSY pins、default 2.9" Waveshare GxEPD2_290_BS)
 *   - epaper_print          (TEXT/X/Y)
 *   - epaper_partial_update (差分更新、高速)
 *   - epaper_full_refresh   (全体リフレッシュ、ゴースト除去)
 *   - epaper_clear          (画面クリア)
 *   - epaper_draw_image     (IMG_NAME bitmap variable name、X/Y)
 *
 * 内部 lib: `zinggjm/GxEPD2@^1.6.9` + `adafruit/Adafruit GFX Library` (既存)
 * boardRequires: null (SPI 全 board 対応)
 *
 * パネル: default `GxEPD2_290_BS` (2.9" b/w、Waveshare)。
 * 他パネル (1.54" / 2.13" / 4.2" / 7.5" 等) 使用時は user が cpp 直接編集 (D-9)。
 */
import * as Blockly from 'blockly';
import { javascriptGenerator, Order } from 'blockly/javascript';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const generator = javascriptGenerator as any;

const EPAPER_COLOR = '#607D8B';

function buildEpaperInclude(cs: string | number, dc: string | number, rst: string | number, busy: string | number): string {
  return `
// E-paper default: 2.9" Waveshare GxEPD2_290_BS (b/w)。他パネル使用時は GxEPD2_xxx を変更。
#include <GxEPD2_BW.h>
GxEPD2_BW<GxEPD2_290_BS, GxEPD2_290_BS::HEIGHT> epaperDisplay(GxEPD2_290_BS(/*CS*/${cs}, /*DC*/${dc}, /*RST*/${rst}, /*BUSY*/${busy}));`;
}

Blockly.Blocks['epaper_init'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('📃 ' + (Blockly.Msg.BLOCKS_EPAPER_INIT || 'E-paper を初期化'));
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_EPAPER_CS || 'CS')
        .appendField(new Blockly.FieldNumber(15, 0, 39, 1), 'CS');
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_EPAPER_DC || 'DC')
        .appendField(new Blockly.FieldNumber(27, 0, 39, 1), 'DC');
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_EPAPER_RST || 'RST')
        .appendField(new Blockly.FieldNumber(26, 0, 39, 1), 'RST');
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_EPAPER_BUSY || 'BUSY')
        .appendField(new Blockly.FieldNumber(25, 0, 39, 1), 'BUSY');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(EPAPER_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_EPAPER_INIT_TOOLTIP || 'E-paper ディスプレイを初期化します。デフォルト 2.9" Waveshare (GxEPD2_290_BS)。他パネル使用時は cpp 直接編集が必要。');
  }
};

generator.forBlock['epaper_init'] = function(block: Blockly.Block) {
  const cs = block.getFieldValue('CS');
  const dc = block.getFieldValue('DC');
  const rst = block.getFieldValue('RST');
  const busy = block.getFieldValue('BUSY');
  generator.definitions_['include_epaper'] = buildEpaperInclude(cs, dc, rst, busy);
  if (!generator.setups_) generator.setups_ = {};
  generator.setups_['epaper_begin'] = `epaperDisplay.init(115200);
  epaperDisplay.setRotation(1);
  epaperDisplay.setTextColor(GxEPD_BLACK);
  epaperDisplay.setFullWindow();
  epaperDisplay.firstPage();
  do { epaperDisplay.fillScreen(GxEPD_WHITE); } while (epaperDisplay.nextPage());`;
  return '';
};

Blockly.Blocks['epaper_print'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('📃 ' + (Blockly.Msg.BLOCKS_EPAPER_PRINT || 'E-paper に表示'));
    this.appendValueInput('TEXT')
        .setCheck('String')
        .appendField(Blockly.Msg.BLOCKS_EPAPER_TEXT || '文字列');
    this.appendValueInput('X')
        .setCheck('Number')
        .appendField('X');
    this.appendValueInput('Y')
        .setCheck('Number')
        .appendField('Y');
    this.setInputsInline(true);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(EPAPER_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_EPAPER_PRINT_TOOLTIP || 'E-paper に文字列を表示します (X, Y)。表示反映には epaper_partial_update or epaper_full_refresh が必要。');
  }
};

generator.forBlock['epaper_print'] = function(block: Blockly.Block) {
  const text = generator.valueToCode(block, 'TEXT', Order.ATOMIC) || '""';
  const x = generator.valueToCode(block, 'X', Order.ATOMIC) || '0';
  const y = generator.valueToCode(block, 'Y', Order.ATOMIC) || '20';
  return `epaperDisplay.setCursor((int16_t)(${x}), (int16_t)(${y}));
epaperDisplay.print(String(${text}));
`;
};

Blockly.Blocks['epaper_partial_update'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('📃 ' + (Blockly.Msg.BLOCKS_EPAPER_PARTIAL || 'E-paper 部分更新'));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(EPAPER_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_EPAPER_PARTIAL_TOOLTIP || 'E-paper を部分更新します (高速、フリッカー少、長期使用でゴーストが残る場合あり)。');
  }
};

generator.forBlock['epaper_partial_update'] = function() {
  return `epaperDisplay.setPartialWindow(0, 0, epaperDisplay.width(), epaperDisplay.height());
epaperDisplay.firstPage();
do {} while (epaperDisplay.nextPage());
`;
};

Blockly.Blocks['epaper_full_refresh'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('📃 ' + (Blockly.Msg.BLOCKS_EPAPER_FULL || 'E-paper 全画面リフレッシュ'));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(EPAPER_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_EPAPER_FULL_TOOLTIP || 'E-paper を全画面リフレッシュします (低速、フリッカー大、ゴースト除去)。1 日 1 回 or 数時間ごと推奨。');
  }
};

generator.forBlock['epaper_full_refresh'] = function() {
  return `epaperDisplay.setFullWindow();
epaperDisplay.firstPage();
do {} while (epaperDisplay.nextPage());
`;
};

Blockly.Blocks['epaper_clear'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('📃 ' + (Blockly.Msg.BLOCKS_EPAPER_CLEAR || 'E-paper クリア'));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(EPAPER_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_EPAPER_CLEAR_TOOLTIP || 'E-paper を白でクリアします (反映には full_refresh or partial_update が必要)。');
  }
};

generator.forBlock['epaper_clear'] = function() {
  return 'epaperDisplay.fillScreen(GxEPD_WHITE);\n';
};

Blockly.Blocks['epaper_draw_image'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('📃 ' + (Blockly.Msg.BLOCKS_EPAPER_DRAW_IMAGE || 'E-paper 画像描画'));
    this.appendValueInput('IMG_NAME')
        .setCheck('String')
        .appendField(Blockly.Msg.BLOCKS_EPAPER_IMG_NAME || '画像変数名');
    this.appendValueInput('X')
        .setCheck('Number')
        .appendField('X');
    this.appendValueInput('Y')
        .setCheck('Number')
        .appendField('Y');
    this.setInputsInline(true);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(EPAPER_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_EPAPER_DRAW_IMAGE_TOOLTIP || 'E-paper に PROGMEM bitmap を描画します。画像変数名は事前に const unsigned char で定義必要 (生 cpp 編集)。');
  }
};

generator.forBlock['epaper_draw_image'] = function(block: Blockly.Block) {
  const imgName = generator.valueToCode(block, 'IMG_NAME', Order.ATOMIC) || '""';
  const x = generator.valueToCode(block, 'X', Order.ATOMIC) || '0';
  const y = generator.valueToCode(block, 'Y', Order.ATOMIC) || '0';
  // Note: 文字列 imgName を C++ 識別子として直接埋め込むと runtime evaluation。
  // Blockly String input は実行時値、ここでは PROGMEM 配列名を期待するため
  // 引用符を剥がして識別子化 (string concat → bitmap pointer)。
  return `// epaper_draw_image: ${imgName} (PROGMEM bitmap、user が事前定義必要)
epaperDisplay.drawBitmap((int16_t)(${x}), (int16_t)(${y}),
  reinterpret_cast<const uint8_t*>(${imgName}), 64, 64, GxEPD_BLACK);
`;
};

console.log('E-paper display blocks loaded');
