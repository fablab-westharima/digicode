/**
 * DigiCode NeoPixel Blocks
 *
 * Blocks for controlling WS2812B RGB LEDs
 * Supports both Arduino C++ and MicroPython.
 *
 * i18n: Uses Blockly.Msg.* for dynamic language switching
 */

import * as Blockly from 'blockly';
import { javascriptGenerator } from 'blockly/javascript';
import { getSensorPins } from '@/utils/pinHelper';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const generator = javascriptGenerator as any;

const NEOPIXEL_COLOR = '#E91E63';  // Pink for NeoPixel blocks

// ===== NeoPixel Init =====

Blockly.Blocks['neopixel_init'] = {
  init: function() {
    const pins = getSensorPins();
    this.appendDummyInput()
        .appendField('💡 ' + (Blockly.Msg.BLOCKS_NEOPIXEL_INIT || 'Initialize NeoPixel Ring'))
        .appendField(Blockly.Msg.BLOCKS_NEOPIXEL_PIN || 'Pin')
        .appendField(new Blockly.FieldNumber(pins.neopixelRing, 0, 39), 'PIN')
        .appendField(Blockly.Msg.BLOCKS_NEOPIXEL_NUMLED || 'LED Count')
        .appendField(new Blockly.FieldNumber(13, 1, 256), 'NUM_LEDS');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(NEOPIXEL_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_NEOPIXEL_INITTOOLTIP || 'Initialize NeoPixel ring');
  }
};

javascriptGenerator.forBlock['neopixel_init'] = function(block: Blockly.Block) {
  const pin = block.getFieldValue('PIN');
  const numLeds = block.getFieldValue('NUM_LEDS');

  generator.definitions_['include_neopixel'] = '#include <Adafruit_NeoPixel.h>';
  generator.definitions_['neopixel_instance'] =
    `// NeoPixel strip\n` +
    `#define NEOPIXEL_PIN ${pin}\n` +
    `#define NUM_PIXELS ${numLeds}\n` +
    `Adafruit_NeoPixel pixels(NUM_PIXELS, NEOPIXEL_PIN, NEO_GRB + NEO_KHZ800);`;

  generator.setups_['neopixel_begin'] = `  pixels.begin();`;

  return '';  // Init doesn't generate runtime code
};

// ===== Set Pixel Color =====

Blockly.Blocks['neopixel_set_color'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🎨 ' + (Blockly.Msg.BLOCKS_NEOPIXEL_SETCOLOR || 'LED'))
        .appendField(new Blockly.FieldNumber(0, 0, 255), 'INDEX')
        .appendField(Blockly.Msg.BLOCKS_NEOPIXEL_INDEX || '#');
    this.appendValueInput('RED')
        .setCheck('Number')
        .appendField('R');
    this.appendValueInput('GREEN')
        .setCheck('Number')
        .appendField('G');
    this.appendValueInput('BLUE')
        .setCheck('Number')
        .appendField('B');
    this.setInputsInline(false);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(NEOPIXEL_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_NEOPIXEL_SETCOLORTOOLTIP || 'Set LED color (0-255)');
  }
};

javascriptGenerator.forBlock['neopixel_set_color'] = function(block: Blockly.Block) {
  const index = block.getFieldValue('INDEX');
  const red = javascriptGenerator.valueToCode(block, 'RED', javascriptGenerator.ORDER_ATOMIC) || '0';
  const green = javascriptGenerator.valueToCode(block, 'GREEN', javascriptGenerator.ORDER_ATOMIC) || '0';
  const blue = javascriptGenerator.valueToCode(block, 'BLUE', javascriptGenerator.ORDER_ATOMIC) || '0';

  return `  pixels.setPixelColor(${index}, pixels.Color(${red}, ${green}, ${blue}));\n`;
};

// ===== Set All Pixels =====

Blockly.Blocks['neopixel_set_all'] = {
  init: function() {
    this.appendValueInput('RED')
        .setCheck('Number')
        .appendField('🌈 ' + (Blockly.Msg.BLOCKS_NEOPIXEL_SETALL || 'Set All LEDs') + ' R');
    this.appendValueInput('GREEN')
        .setCheck('Number')
        .appendField('G');
    this.appendValueInput('BLUE')
        .setCheck('Number')
        .appendField('B');
    this.setInputsInline(false);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(NEOPIXEL_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_NEOPIXEL_SETALLTOOLTIP || 'Set all LED colors');
  }
};

javascriptGenerator.forBlock['neopixel_set_all'] = function(block: Blockly.Block) {
  const red = javascriptGenerator.valueToCode(block, 'RED', javascriptGenerator.ORDER_ATOMIC) || '0';
  const green = javascriptGenerator.valueToCode(block, 'GREEN', javascriptGenerator.ORDER_ATOMIC) || '0';
  const blue = javascriptGenerator.valueToCode(block, 'BLUE', javascriptGenerator.ORDER_ATOMIC) || '0';

  return `  for (int i = 0; i < NUM_PIXELS; i++) {\n` +
         `    pixels.setPixelColor(i, pixels.Color(${red}, ${green}, ${blue}));\n` +
         `  }\n`;
};

// ===== Show =====

Blockly.Blocks['neopixel_show'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('✨ ' + (Blockly.Msg.BLOCKS_NEOPIXEL_SHOW || 'Update NeoPixel'));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(NEOPIXEL_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_NEOPIXEL_SHOWTOOLTIP || 'Apply color settings to LEDs');
  }
};

javascriptGenerator.forBlock['neopixel_show'] = function() {
  return `  pixels.show();\n`;
};

// ===== Clear =====

Blockly.Blocks['neopixel_clear'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('⬛ ' + (Blockly.Msg.BLOCKS_NEOPIXEL_CLEAR || 'Clear All NeoPixels'));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(NEOPIXEL_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_NEOPIXEL_CLEARTOOLTIP || 'Turn off all LEDs');
  }
};

javascriptGenerator.forBlock['neopixel_clear'] = function() {
  return `  pixels.clear();\n` +
         `  pixels.show();\n`;
};

// ===== Set Brightness =====

Blockly.Blocks['neopixel_brightness'] = {
  init: function() {
    this.appendValueInput('BRIGHTNESS')
        .setCheck('Number')
        .appendField('☀️ ' + (Blockly.Msg.BLOCKS_NEOPIXEL_BRIGHTNESS || 'NeoPixel Brightness'));
    this.appendDummyInput()
        .appendField('(0-255)');
    this.setInputsInline(true);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(NEOPIXEL_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_NEOPIXEL_BRIGHTNESSTOOLTIP || 'Set LED brightness (0-255)');
  }
};

javascriptGenerator.forBlock['neopixel_brightness'] = function(block: Blockly.Block) {
  const brightness = javascriptGenerator.valueToCode(block, 'BRIGHTNESS', javascriptGenerator.ORDER_ATOMIC) || '50';
  return `  pixels.setBrightness(${brightness});\n`;
};

// ===== Rainbow Effect =====

Blockly.Blocks['neopixel_rainbow'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🌈 ' + (Blockly.Msg.BLOCKS_NEOPIXEL_RAINBOW || 'Rainbow Effect'))
        .appendField(new Blockly.FieldDropdown([
          [Blockly.Msg.BLOCKS_NEOPIXEL_SPEEDNORMAL || 'Normal', 'normal'],
          [Blockly.Msg.BLOCKS_NEOPIXEL_SPEEDFAST || 'Fast', 'fast'],
          [Blockly.Msg.BLOCKS_NEOPIXEL_SPEEDSLOW || 'Slow', 'slow']
        ]), 'SPEED');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(NEOPIXEL_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_NEOPIXEL_RAINBOWTOOLTIP || 'Display rainbow effect');
  }
};

javascriptGenerator.forBlock['neopixel_rainbow'] = function(block: Blockly.Block) {
  const speed = block.getFieldValue('SPEED');
  const delayMs = speed === 'fast' ? 5 : speed === 'slow' ? 20 : 10;

  if (!generator.definitions_['neopixel_rainbow_func']) {
    generator.definitions_['neopixel_rainbow_func'] =
      `void rainbowCycle(int wait) {\n` +
      `  for (int j = 0; j < 256; j++) {\n` +
      `    for (int i = 0; i < NUM_PIXELS; i++) {\n` +
      `      int hue = (i * 65536 / NUM_PIXELS + j * 256) & 65535;\n` +
      `      pixels.setPixelColor(i, pixels.gamma32(pixels.ColorHSV(hue)));\n` +
      `    }\n` +
      `    pixels.show();\n` +
      `    delay(wait);\n` +
      `  }\n` +
      `}`;
  }

  return `  rainbowCycle(${delayMs});\n`;
};

// ===== Bounce Effect =====

Blockly.Blocks['neopixel_bounce'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('⬅️➡️ ' + (Blockly.Msg.BLOCKS_NEOPIXEL_BOUNCE || 'Bounce Effect'))
        .appendField(new Blockly.FieldDropdown([
          [Blockly.Msg.BLOCKS_NEOPIXEL_COLORRED || 'Red', 'ff0000'],
          [Blockly.Msg.BLOCKS_NEOPIXEL_COLORGREEN || 'Green', '00ff00'],
          [Blockly.Msg.BLOCKS_NEOPIXEL_COLORBLUE || 'Blue', '0000ff'],
          [Blockly.Msg.BLOCKS_NEOPIXEL_COLORYELLOW || 'Yellow', 'ffff00'],
          [Blockly.Msg.BLOCKS_NEOPIXEL_COLORPURPLE || 'Purple', 'ff00ff'],
          [Blockly.Msg.BLOCKS_NEOPIXEL_COLORCYAN || 'Cyan', '00ffff'],
          [Blockly.Msg.BLOCKS_NEOPIXEL_COLORWHITE || 'White', 'ffffff']
        ]), 'COLOR')
        .appendField(new Blockly.FieldDropdown([
          [Blockly.Msg.BLOCKS_NEOPIXEL_SPEEDNORMAL || 'Normal', 'normal'],
          [Blockly.Msg.BLOCKS_NEOPIXEL_SPEEDFAST || 'Fast', 'fast'],
          [Blockly.Msg.BLOCKS_NEOPIXEL_SPEEDSLOW || 'Slow', 'slow']
        ]), 'SPEED');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(NEOPIXEL_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_NEOPIXEL_BOUNCETOOLTIP || 'LED bouncing effect');
  }
};

javascriptGenerator.forBlock['neopixel_bounce'] = function(block: Blockly.Block) {
  const color = block.getFieldValue('COLOR');
  const speed = block.getFieldValue('SPEED');
  const delayMs = speed === 'fast' ? 30 : speed === 'slow' ? 100 : 50;
  const r = parseInt(color.substring(0, 2), 16);
  const g = parseInt(color.substring(2, 4), 16);
  const b = parseInt(color.substring(4, 6), 16);

  if (!generator.definitions_['neopixel_bounce_func']) {
    generator.definitions_['neopixel_bounce_func'] =
      `void bounceEffect(int r, int g, int b, int wait) {\n` +
      `  for (int i = 0; i < NUM_PIXELS; i++) {\n` +
      `    pixels.clear();\n` +
      `    pixels.setPixelColor(i, pixels.Color(r, g, b));\n` +
      `    pixels.show();\n` +
      `    delay(wait);\n` +
      `  }\n` +
      `  for (int i = NUM_PIXELS - 2; i > 0; i--) {\n` +
      `    pixels.clear();\n` +
      `    pixels.setPixelColor(i, pixels.Color(r, g, b));\n` +
      `    pixels.show();\n` +
      `    delay(wait);\n` +
      `  }\n` +
      `}`;
  }

  return `  bounceEffect(${r}, ${g}, ${b}, ${delayMs});\n`;
};

// ===== Cycle Effect =====

Blockly.Blocks['neopixel_cycle'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🔄 ' + (Blockly.Msg.BLOCKS_NEOPIXEL_CYCLE || 'Cycle Effect'))
        .appendField(new Blockly.FieldDropdown([
          [Blockly.Msg.BLOCKS_NEOPIXEL_COLORRED || 'Red', 'ff0000'],
          [Blockly.Msg.BLOCKS_NEOPIXEL_COLORGREEN || 'Green', '00ff00'],
          [Blockly.Msg.BLOCKS_NEOPIXEL_COLORBLUE || 'Blue', '0000ff'],
          [Blockly.Msg.BLOCKS_NEOPIXEL_COLORYELLOW || 'Yellow', 'ffff00'],
          [Blockly.Msg.BLOCKS_NEOPIXEL_COLORPURPLE || 'Purple', 'ff00ff'],
          [Blockly.Msg.BLOCKS_NEOPIXEL_COLORCYAN || 'Cyan', '00ffff'],
          [Blockly.Msg.BLOCKS_NEOPIXEL_COLORWHITE || 'White', 'ffffff']
        ]), 'COLOR')
        .appendField(new Blockly.FieldDropdown([
          [Blockly.Msg.BLOCKS_NEOPIXEL_SPEEDNORMAL || 'Normal', 'normal'],
          [Blockly.Msg.BLOCKS_NEOPIXEL_SPEEDFAST || 'Fast', 'fast'],
          [Blockly.Msg.BLOCKS_NEOPIXEL_SPEEDSLOW || 'Slow', 'slow']
        ]), 'SPEED');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(NEOPIXEL_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_NEOPIXEL_CYCLETOOLTIP || 'LED rotation effect');
  }
};

javascriptGenerator.forBlock['neopixel_cycle'] = function(block: Blockly.Block) {
  const color = block.getFieldValue('COLOR');
  const speed = block.getFieldValue('SPEED');
  const delayMs = speed === 'fast' ? 30 : speed === 'slow' ? 100 : 50;
  const r = parseInt(color.substring(0, 2), 16);
  const g = parseInt(color.substring(2, 4), 16);
  const b = parseInt(color.substring(4, 6), 16);

  if (!generator.definitions_['neopixel_cycle_func']) {
    generator.definitions_['neopixel_cycle_func'] =
      `void cycleEffect(int r, int g, int b, int wait) {\n` +
      `  for (int j = 0; j < NUM_PIXELS; j++) {\n` +
      `    for (int i = 0; i < NUM_PIXELS; i++) {\n` +
      `      if (i == j) {\n` +
      `        pixels.setPixelColor(i, pixels.Color(r, g, b));\n` +
      `      } else {\n` +
      `        pixels.setPixelColor(i, pixels.Color(r/10, g/10, b/10));\n` +
      `      }\n` +
      `    }\n` +
      `    pixels.show();\n` +
      `    delay(wait);\n` +
      `  }\n` +
      `}`;
  }

  return `  cycleEffect(${r}, ${g}, ${b}, ${delayMs});\n`;
};

// ===== Color Lights (simple color dropdown) =====

Blockly.Blocks['neopixel_color_simple'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('💡 ' + (Blockly.Msg.BLOCKS_NEOPIXEL_ALLLEDCOLOR || 'All LED Color'))
        .appendField(new Blockly.FieldDropdown([
          [Blockly.Msg.BLOCKS_NEOPIXEL_COLORRED || 'Red', 'ff0000'],
          [Blockly.Msg.BLOCKS_NEOPIXEL_COLORORANGE || 'Orange', 'ff8000'],
          [Blockly.Msg.BLOCKS_NEOPIXEL_COLORYELLOW || 'Yellow', 'ffff00'],
          [Blockly.Msg.BLOCKS_NEOPIXEL_COLORLIME || 'Lime', '80ff00'],
          [Blockly.Msg.BLOCKS_NEOPIXEL_COLORGREEN || 'Green', '00ff00'],
          [Blockly.Msg.BLOCKS_NEOPIXEL_COLORCYAN || 'Cyan', '00ffff'],
          [Blockly.Msg.BLOCKS_NEOPIXEL_COLORBLUE || 'Blue', '0000ff'],
          [Blockly.Msg.BLOCKS_NEOPIXEL_COLORPURPLE || 'Purple', '8000ff'],
          [Blockly.Msg.BLOCKS_NEOPIXEL_COLORPINK || 'Pink', 'ff00ff'],
          [Blockly.Msg.BLOCKS_NEOPIXEL_COLORWHITE || 'White', 'ffffff'],
          [Blockly.Msg.BLOCKS_NEOPIXEL_COLOROFF || 'Off', '000000']
        ]), 'COLOR');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(NEOPIXEL_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_NEOPIXEL_ALLLEDCOLORTOOLTIP || 'Set all LEDs to specified color');
  }
};

javascriptGenerator.forBlock['neopixel_color_simple'] = function(block: Blockly.Block) {
  const color = block.getFieldValue('COLOR');
  const r = parseInt(color.substring(0, 2), 16);
  const g = parseInt(color.substring(2, 4), 16);
  const b = parseInt(color.substring(4, 6), 16);

  return `  for (int i = 0; i < NUM_PIXELS; i++) {\n` +
         `    pixels.setPixelColor(i, pixels.Color(${r}, ${g}, ${b}));\n` +
         `  }\n` +
         `  pixels.show();\n`;
};

// ===== Light # with simple color =====

Blockly.Blocks['neopixel_light_simple'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('💡 LED #')
        .appendField(new Blockly.FieldNumber(0, 0, 255), 'INDEX')
        .appendField(new Blockly.FieldDropdown([
          [Blockly.Msg.BLOCKS_NEOPIXEL_COLORRED || 'Red', 'ff0000'],
          [Blockly.Msg.BLOCKS_NEOPIXEL_COLORORANGE || 'Orange', 'ff8000'],
          [Blockly.Msg.BLOCKS_NEOPIXEL_COLORYELLOW || 'Yellow', 'ffff00'],
          [Blockly.Msg.BLOCKS_NEOPIXEL_COLORLIME || 'Lime', '80ff00'],
          [Blockly.Msg.BLOCKS_NEOPIXEL_COLORGREEN || 'Green', '00ff00'],
          [Blockly.Msg.BLOCKS_NEOPIXEL_COLORCYAN || 'Cyan', '00ffff'],
          [Blockly.Msg.BLOCKS_NEOPIXEL_COLORBLUE || 'Blue', '0000ff'],
          [Blockly.Msg.BLOCKS_NEOPIXEL_COLORPURPLE || 'Purple', '8000ff'],
          [Blockly.Msg.BLOCKS_NEOPIXEL_COLORPINK || 'Pink', 'ff00ff'],
          [Blockly.Msg.BLOCKS_NEOPIXEL_COLORWHITE || 'White', 'ffffff'],
          [Blockly.Msg.BLOCKS_NEOPIXEL_COLOROFF || 'Off', '000000']
        ]), 'COLOR');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(NEOPIXEL_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_NEOPIXEL_LIGHTSIMPLETOOLTIP || 'Set specified LED color');
  }
};

javascriptGenerator.forBlock['neopixel_light_simple'] = function(block: Blockly.Block) {
  const index = block.getFieldValue('INDEX');
  const color = block.getFieldValue('COLOR');
  const r = parseInt(color.substring(0, 2), 16);
  const g = parseInt(color.substring(2, 4), 16);
  const b = parseInt(color.substring(4, 6), 16);

  return `  pixels.setPixelColor(${index}, pixels.Color(${r}, ${g}, ${b}));\n`;
};

export {}; // Make this a module
