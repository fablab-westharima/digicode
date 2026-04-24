/**
 * DigiCode Display Blocks
 *
 * I2C OLED display blocks for ESP32/Arduino.
 * Supports SSD1306 128x64 OLED.
 * Default pins: SDA=GPIO 21, SCL=GPIO 22
 *
 * i18n: Uses Blockly.Msg.* for dynamic language switching
 */

import * as Blockly from 'blockly';
import { javascriptGenerator } from 'blockly/javascript';
import { pythonGenerator } from 'blockly/python';
import { getDisplayPins } from '@/utils/pinHelper';

// 型アサーション用のヘルパー（definitions_やsetups_はprotectedまたは存在しないため）
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const generator = javascriptGenerator as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const pyGen = pythonGenerator as any;

const DISPLAY_COLOR = '#3F51B5';

// ===== Display Init =====
Blockly.Blocks['display_init'] = {
  init: function() {
    const pins = getDisplayPins();
    this.appendDummyInput()
        .appendField('📺 ' + ((Blockly.Msg as any).BLOCKS_DISPLAY_OLEDINIT || 'Initialize OLED'))
        .appendField((Blockly.Msg as any).BLOCKS_DISPLAY_WIDTH || 'Width')
        .appendField(new Blockly.FieldDropdown([
          ['128', '128'],
          ['64', '64']
        ]), 'WIDTH')
        .appendField((Blockly.Msg as any).BLOCKS_DISPLAY_HEIGHT || 'Height')
        .appendField(new Blockly.FieldDropdown([
          ['64', '64'],
          ['32', '32']
        ]), 'HEIGHT');
    this.appendDummyInput()
        .appendField('SDA:')
        .appendField(new Blockly.FieldNumber(pins.sda, 0, 39), 'SDA')
        .appendField('SCL:')
        .appendField(new Blockly.FieldNumber(pins.scl, 0, 39), 'SCL');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(DISPLAY_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_DISPLAY_OLEDINITTOOLTIP || 'Initialize I2C OLED display (SSD1306)');
  }
};

javascriptGenerator.forBlock['display_init'] = function(block: Blockly.Block) {
  const width = block.getFieldValue('WIDTH');
  const height = block.getFieldValue('HEIGHT');
  const sda = block.getFieldValue('SDA');
  const scl = block.getFieldValue('SCL');

  generator.definitions_['include_display'] = '#include <Wire.h>\n#include <Adafruit_GFX.h>\n#include <Adafruit_SSD1306.h>';
  generator.definitions_['display_instance'] = `
#define SCREEN_WIDTH ${width}
#define SCREEN_HEIGHT ${height}
#define OLED_RESET -1
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);`;

  return `  Wire.begin(${sda}, ${scl});
  if(!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
    Serial.println(F("SSD1306 allocation failed"));
  }
  display.clearDisplay();
  display.display();
`;
};

pythonGenerator.forBlock['display_init'] = function(block: Blockly.Block) {
  const width = block.getFieldValue('WIDTH');
  const height = block.getFieldValue('HEIGHT');
  const sda = block.getFieldValue('SDA');
  const scl = block.getFieldValue('SCL');

  pyGen.definitions_['import_display'] = 'from machine import Pin, I2C\nfrom ssd1306 import SSD1306_I2C';
  pyGen.definitions_['display_instance'] = `i2c = I2C(0, scl=Pin(${scl}), sda=Pin(${sda}), freq=400000)
oled = SSD1306_I2C(${width}, ${height}, i2c)`;

  return `oled.fill(0)
oled.show()
`;
};

// ===== Display Text =====
Blockly.Blocks['display_text'] = {
  init: function() {
    this.appendValueInput('TEXT')
        .setCheck('String')
        .appendField('📝 ' + ((Blockly.Msg as any).BLOCKS_DISPLAY_OLEDTEXT || 'OLED Text'))
        .appendField((Blockly.Msg as any).BLOCKS_DISPLAY_TEXT || 'Text');
    this.appendDummyInput()
        .appendField('X:')
        .appendField(new Blockly.FieldNumber(0, 0, 128), 'X')
        .appendField('Y:')
        .appendField(new Blockly.FieldNumber(0, 0, 64), 'Y')
        .appendField((Blockly.Msg as any).BLOCKS_DISPLAY_SIZE || 'Size')
        .appendField(new Blockly.FieldDropdown([
          [(Blockly.Msg as any).BLOCKS_DISPLAY_SIZESMALL || 'Small', '1'],
          [(Blockly.Msg as any).BLOCKS_DISPLAY_SIZEMEDIUM || 'Medium', '2'],
          [(Blockly.Msg as any).BLOCKS_DISPLAY_SIZELARGE || 'Large', '3']
        ]), 'SIZE');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(DISPLAY_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_DISPLAY_OLEDTEXTTOOLTIP || 'Display text on OLED');
  }
};

javascriptGenerator.forBlock['display_text'] = function(block: Blockly.Block) {
  const text = generator.valueToCode(block, 'TEXT', generator.ORDER_ATOMIC) || '""';
  const x = block.getFieldValue('X');
  const y = block.getFieldValue('Y');
  const size = block.getFieldValue('SIZE');

  return `  display.setTextSize(${size});
  display.setTextColor(SSD1306_WHITE);
  display.setCursor(${x}, ${y});
  display.println(${text});
`;
};

pythonGenerator.forBlock['display_text'] = function(block: Blockly.Block) {
  const text = pyGen.valueToCode(block, 'TEXT', pyGen.ORDER_ATOMIC) || '""';
  const x = block.getFieldValue('X');
  const y = block.getFieldValue('Y');
  // Size is retrieved but MicroPython ssd1306 doesn't support text scaling
  const _size = block.getFieldValue('SIZE');

  // MicroPython ssd1306 doesn't have built-in text size, use default 8x8
  return `oled.text(str(${text}), ${x}, ${y})
`;
};

// ===== Display Clear =====
Blockly.Blocks['display_clear'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🗑️ ' + ((Blockly.Msg as any).BLOCKS_DISPLAY_OLEDCLEAR || 'Clear OLED'));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(DISPLAY_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_DISPLAY_OLEDCLEARTOOLTIP || 'Clear OLED display');
  }
};

javascriptGenerator.forBlock['display_clear'] = function() {
  return `  display.clearDisplay();\n`;
};

pythonGenerator.forBlock['display_clear'] = function() {
  return `oled.fill(0)\n`;
};

// ===== Display Show =====
Blockly.Blocks['display_show'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('✅ ' + ((Blockly.Msg as any).BLOCKS_DISPLAY_OLEDSHOW || 'Update OLED'));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(DISPLAY_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_DISPLAY_OLEDSHOWTOOLTIP || 'Update OLED display');
  }
};

javascriptGenerator.forBlock['display_show'] = function() {
  return `  display.display();\n`;
};

pythonGenerator.forBlock['display_show'] = function() {
  return `oled.show()\n`;
};

// ===== Display Draw Line =====
Blockly.Blocks['display_line'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('📏 ' + ((Blockly.Msg as any).BLOCKS_DISPLAY_OLEDLINE || 'OLED Line'))
        .appendField((Blockly.Msg as any).BLOCKS_DISPLAY_STARTX || 'Start X:')
        .appendField(new Blockly.FieldNumber(0, 0, 128), 'X1')
        .appendField('Y:')
        .appendField(new Blockly.FieldNumber(0, 0, 64), 'Y1');
    this.appendDummyInput()
        .appendField((Blockly.Msg as any).BLOCKS_DISPLAY_ENDX || 'End X:')
        .appendField(new Blockly.FieldNumber(127, 0, 128), 'X2')
        .appendField('Y:')
        .appendField(new Blockly.FieldNumber(63, 0, 64), 'Y2');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(DISPLAY_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_DISPLAY_OLEDLINETOOLTIP || 'Draw line on OLED');
  }
};

javascriptGenerator.forBlock['display_line'] = function(block: Blockly.Block) {
  const x1 = block.getFieldValue('X1');
  const y1 = block.getFieldValue('Y1');
  const x2 = block.getFieldValue('X2');
  const y2 = block.getFieldValue('Y2');

  return `  display.drawLine(${x1}, ${y1}, ${x2}, ${y2}, SSD1306_WHITE);\n`;
};

pythonGenerator.forBlock['display_line'] = function(block: Blockly.Block) {
  const x1 = block.getFieldValue('X1');
  const y1 = block.getFieldValue('Y1');
  const x2 = block.getFieldValue('X2');
  const y2 = block.getFieldValue('Y2');

  return `oled.line(${x1}, ${y1}, ${x2}, ${y2}, 1)\n`;
};

// ===== Display Draw Rectangle =====
Blockly.Blocks['display_rect'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('▭ ' + ((Blockly.Msg as any).BLOCKS_DISPLAY_OLEDRECT || 'OLED Rectangle'))
        .appendField('X:')
        .appendField(new Blockly.FieldNumber(10, 0, 128), 'X')
        .appendField('Y:')
        .appendField(new Blockly.FieldNumber(10, 0, 64), 'Y');
    this.appendDummyInput()
        .appendField((Blockly.Msg as any).BLOCKS_DISPLAY_WIDTHCOLON || 'Width:')
        .appendField(new Blockly.FieldNumber(50, 1, 128), 'W')
        .appendField((Blockly.Msg as any).BLOCKS_DISPLAY_HEIGHTCOLON || 'Height:')
        .appendField(new Blockly.FieldNumber(30, 1, 64), 'H')
        .appendField(new Blockly.FieldDropdown([
          [(Blockly.Msg as any).BLOCKS_DISPLAY_OUTLINE || 'Outline', 'false'],
          [(Blockly.Msg as any).BLOCKS_DISPLAY_FILLED || 'Filled', 'true']
        ]), 'FILL');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(DISPLAY_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_DISPLAY_OLEDRECTTOOLTIP || 'Draw rectangle on OLED');
  }
};

javascriptGenerator.forBlock['display_rect'] = function(block: Blockly.Block) {
  const x = block.getFieldValue('X');
  const y = block.getFieldValue('Y');
  const w = block.getFieldValue('W');
  const h = block.getFieldValue('H');
  const fill = block.getFieldValue('FILL');

  const func = fill === 'true' ? 'fillRect' : 'drawRect';
  return `  display.${func}(${x}, ${y}, ${w}, ${h}, SSD1306_WHITE);\n`;
};

pythonGenerator.forBlock['display_rect'] = function(block: Blockly.Block) {
  const x = block.getFieldValue('X');
  const y = block.getFieldValue('Y');
  const w = block.getFieldValue('W');
  const h = block.getFieldValue('H');
  const fill = block.getFieldValue('FILL');

  if (fill === 'true') {
    return `oled.fill_rect(${x}, ${y}, ${w}, ${h}, 1)\n`;
  } else {
    return `oled.rect(${x}, ${y}, ${w}, ${h}, 1)\n`;
  }
};

export {}; // Make this a module
