/**
 * DigiCode Audio Blocks
 *
 * Blocks for buzzer and tone output
 * Supports both Arduino C++ and MicroPython.
 *
 * i18n: Uses Blockly.Msg.* for dynamic language switching
 */

import * as Blockly from 'blockly';
import { javascriptGenerator } from 'blockly/javascript';
import { pythonGenerator } from 'blockly/python';
import { getSensorPins } from '@/utils/pinHelper';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const pyGen = pythonGenerator as any;

const AUDIO_COLOR = '#8BC34A';  // Light green for audio blocks

// ===== Tone Output =====

Blockly.Blocks['buzzer_tone'] = {
  init: function() {
    const pins = getSensorPins();
    this.appendDummyInput()
        .appendField('🔊 ' + ((Blockly.Msg as any).BLOCKS_AUDIO_BUZZERTONE || 'Buzzer Tone'))
        .appendField((Blockly.Msg as any).BLOCKS_AUDIO_PIN || 'Pin')
        .appendField(new Blockly.FieldNumber(pins.buzzer, 0, 39), 'PIN')
        .appendField((Blockly.Msg as any).BLOCKS_AUDIO_FREQUENCY || 'Frequency')
        .appendField(new Blockly.FieldDropdown([
          [(Blockly.Msg as any).BLOCKS_AUDIO_NOTEC || 'C (262Hz)', '262'],
          [(Blockly.Msg as any).BLOCKS_AUDIO_NOTED || 'D (294Hz)', '294'],
          [(Blockly.Msg as any).BLOCKS_AUDIO_NOTEE || 'E (330Hz)', '330'],
          [(Blockly.Msg as any).BLOCKS_AUDIO_NOTEF || 'F (349Hz)', '349'],
          [(Blockly.Msg as any).BLOCKS_AUDIO_NOTEG || 'G (392Hz)', '392'],
          [(Blockly.Msg as any).BLOCKS_AUDIO_NOTEA || 'A (440Hz)', '440'],
          [(Blockly.Msg as any).BLOCKS_AUDIO_NOTEB || 'B (494Hz)', '494'],
          [(Blockly.Msg as any).BLOCKS_AUDIO_CUSTOM || 'Custom', 'custom']
        ]), 'FREQ_SELECT');
    this.appendValueInput('FREQ_CUSTOM')
        .setCheck('Number')
        .appendField((Blockly.Msg as any).BLOCKS_AUDIO_HZ || 'Hz');
    this.appendValueInput('DURATION')
        .setCheck('Number')
        .appendField((Blockly.Msg as any).BLOCKS_AUDIO_DURATION || 'Duration (ms)');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(AUDIO_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_AUDIO_BUZZERTONETOOLTIP || 'Play a tone on the buzzer');
  }
};

javascriptGenerator.forBlock['buzzer_tone'] = function(block: Blockly.Block) {
  const pin = block.getFieldValue('PIN');
  const freqSelect = block.getFieldValue('FREQ_SELECT');
  const freqCustom = javascriptGenerator.valueToCode(block, 'FREQ_CUSTOM', javascriptGenerator.ORDER_ATOMIC) || '440';
  const duration = javascriptGenerator.valueToCode(block, 'DURATION', javascriptGenerator.ORDER_ATOMIC) || '500';

  const freq = freqSelect === 'custom' ? freqCustom : freqSelect;

  return `  tone(${pin}, ${freq}, ${duration});\n` +
         `  delay(${duration});\n`;
};

pythonGenerator.forBlock['buzzer_tone'] = function(block: Blockly.Block) {
  const pin = block.getFieldValue('PIN');
  const freqSelect = block.getFieldValue('FREQ_SELECT');
  const freqCustom = pythonGenerator.valueToCode(block, 'FREQ_CUSTOM', pythonGenerator.ORDER_ATOMIC) || '440';
  const duration = pythonGenerator.valueToCode(block, 'DURATION', pythonGenerator.ORDER_ATOMIC) || '500';

  const freq = freqSelect === 'custom' ? freqCustom : freqSelect;

  if (!pyGen.definitions_['import_buzzer']) {
    pyGen.definitions_['import_buzzer'] = 'from machine import Pin, PWM\nimport time';
  }

  if (!pyGen.definitions_['buzzer_function']) {
    pyGen.definitions_['buzzer_function'] =
      `# Buzzer tone function\n` +
      `def play_tone(pin, freq, duration_ms):\n` +
      `    buzzer = PWM(Pin(pin), freq=freq, duty=512)\n` +
      `    time.sleep_ms(duration_ms)\n` +
      `    buzzer.deinit()`;
  }

  return `play_tone(${pin}, ${freq}, ${duration})\n`;
};

// ===== Stop Tone =====

Blockly.Blocks['buzzer_stop'] = {
  init: function() {
    const pins = getSensorPins();
    this.appendDummyInput()
        .appendField('🔇 ' + ((Blockly.Msg as any).BLOCKS_AUDIO_BUZZERSTOP || 'Stop Buzzer'))
        .appendField((Blockly.Msg as any).BLOCKS_AUDIO_PIN || 'Pin')
        .appendField(new Blockly.FieldNumber(pins.buzzer, 0, 39), 'PIN');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(AUDIO_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_AUDIO_BUZZERSTOPTOOLTIP || 'Stop the buzzer sound');
  }
};

javascriptGenerator.forBlock['buzzer_stop'] = function(block: Blockly.Block) {
  const pin = block.getFieldValue('PIN');
  return `  noTone(${pin});\n`;
};

pythonGenerator.forBlock['buzzer_stop'] = function(block: Blockly.Block) {
  const pin = block.getFieldValue('PIN');

  if (!pyGen.definitions_['import_buzzer']) {
    pyGen.definitions_['import_buzzer'] = 'from machine import Pin, PWM\nimport time';
  }

  return `PWM(Pin(${pin})).deinit()\n`;
};

// ===== Play Melody =====

Blockly.Blocks['buzzer_melody'] = {
  init: function() {
    const pins = getSensorPins();
    this.appendDummyInput()
        .appendField('🎵 ' + ((Blockly.Msg as any).BLOCKS_AUDIO_BUZZERMELODY || 'Play Melody'))
        .appendField((Blockly.Msg as any).BLOCKS_AUDIO_PIN || 'Pin')
        .appendField(new Blockly.FieldNumber(pins.buzzer, 0, 39), 'PIN')
        .appendField(new Blockly.FieldDropdown([
          [(Blockly.Msg as any).BLOCKS_AUDIO_STARTUP || 'Startup', 'startup'],
          [(Blockly.Msg as any).BLOCKS_AUDIO_SUCCESS || 'Success', 'success'],
          [(Blockly.Msg as any).BLOCKS_AUDIO_ERROR || 'Error', 'error'],
          [(Blockly.Msg as any).BLOCKS_AUDIO_COMPLETE || 'Complete', 'complete']
        ]), 'MELODY');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(AUDIO_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_AUDIO_BUZZERMELODYTOOLTIP || 'Play a predefined melody');
  }
};

javascriptGenerator.forBlock['buzzer_melody'] = function(block: Blockly.Block) {
  const pin = block.getFieldValue('PIN');
  const melody = block.getFieldValue('MELODY');

  const melodies: { [key: string]: string } = {
    startup: `  tone(${pin}, 262, 100); delay(100);\n` +
             `  tone(${pin}, 330, 100); delay(100);\n` +
             `  tone(${pin}, 392, 100); delay(100);\n`,
    success: `  tone(${pin}, 523, 100); delay(100);\n` +
             `  tone(${pin}, 659, 100); delay(100);\n` +
             `  tone(${pin}, 784, 200); delay(200);\n`,
    error:   `  tone(${pin}, 392, 200); delay(200);\n` +
             `  tone(${pin}, 330, 200); delay(200);\n` +
             `  tone(${pin}, 262, 400); delay(400);\n`,
    complete: `  tone(${pin}, 440, 100); delay(100);\n` +
              `  tone(${pin}, 440, 100); delay(100);\n` +
              `  tone(${pin}, 523, 300); delay(300);\n`
  };

  return melodies[melody] || '';
};

pythonGenerator.forBlock['buzzer_melody'] = function(block: Blockly.Block) {
  const pin = block.getFieldValue('PIN');
  const melody = block.getFieldValue('MELODY');

  if (!pyGen.definitions_['import_buzzer']) {
    pyGen.definitions_['import_buzzer'] = 'from machine import Pin, PWM\nimport time';
  }

  if (!pyGen.definitions_['buzzer_function']) {
    pyGen.definitions_['buzzer_function'] =
      `# Buzzer tone function\n` +
      `def play_tone(pin, freq, duration_ms):\n` +
      `    buzzer = PWM(Pin(pin), freq=freq, duty=512)\n` +
      `    time.sleep_ms(duration_ms)\n` +
      `    buzzer.deinit()`;
  }

  const melodies: { [key: string]: string } = {
    startup: `play_tone(${pin}, 262, 100)\n` +
             `play_tone(${pin}, 330, 100)\n` +
             `play_tone(${pin}, 392, 100)\n`,
    success: `play_tone(${pin}, 523, 100)\n` +
             `play_tone(${pin}, 659, 100)\n` +
             `play_tone(${pin}, 784, 200)\n`,
    error:   `play_tone(${pin}, 392, 200)\n` +
             `play_tone(${pin}, 330, 200)\n` +
             `play_tone(${pin}, 262, 400)\n`,
    complete: `play_tone(${pin}, 440, 100)\n` +
              `play_tone(${pin}, 440, 100)\n` +
              `play_tone(${pin}, 523, 300)\n`
  };

  return melodies[melody] || '';
};

export {}; // Make this a module
