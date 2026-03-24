/**
 * 配列ブロック定義（Otto Blocklyスタイル）
 * Arduino C++に最適化された配列操作ブロック
 *
 * i18n: Uses Blockly.Msg.* for dynamic language switching
 */
import * as Blockly from 'blockly';
import { javascriptGenerator, Order } from 'blockly/javascript';

// 配列ブロックの色
const ARRAY_HUE = '#FF8900';

// 型の選択肢
const TYPE_OPTIONS: [string, string][] = [
  ['int', 'int'],
  ['float', 'float'],
  ['double', 'double'],
  ['char', 'char'],
  ['bool', 'bool'],
  ['byte', 'byte'],
  ['long', 'long'],
  ['unsigned int', 'unsigned int'],
];

// ========================================
// 配列作成ブロック
// ========================================
Blockly.Blocks['array_create'] = {
  init: function(this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('📦 ' + ((Blockly.Msg as any).BLOCKS_ARRAY_CREATE || 'Create Array'))
      .appendField(new Blockly.FieldTextInput('myArray'), 'VAR')
      .appendField((Blockly.Msg as any).BLOCKS_TYPE || 'Type')
      .appendField(new Blockly.FieldDropdown(TYPE_OPTIONS) as any, 'TYPE');
    this.appendDummyInput('DIM_INPUT')
      .appendField((Blockly.Msg as any).BLOCKS_ARRAY_DIMENSION || 'Dimension')
      .appendField(new Blockly.FieldDropdown([
        [((Blockly.Msg as any).BLOCKS_ARRAY_1D || '1D'), '1'],
        [((Blockly.Msg as any).BLOCKS_ARRAY_2D || '2D'), '2'],
        [((Blockly.Msg as any).BLOCKS_ARRAY_3D || '3D'), '3']
      ],
        (this as any).updateShape_.bind(this)
      ) as any, 'DIM')
      .appendField((Blockly.Msg as any).BLOCKS_ARRAY_INIT || 'Init')
      .appendField(new Blockly.FieldDropdown([
        [((Blockly.Msg as any).BLOCKS_ARRAY_BYSIZE || 'By Size'), 'size'],
        [((Blockly.Msg as any).BLOCKS_ARRAY_BYCONTENT || 'By Content'), 'content']
      ],
        (this as any).updateShape_.bind(this)
      ) as any, 'INIT_TYPE');

    // 初期状態：1次元、サイズ指定
    this.appendValueInput('SIZE0')
      .setCheck('Number')
      .setAlign(Blockly.inputs.Align.RIGHT)
      .appendField((Blockly.Msg as any).BLOCKS_SIZE || 'Size');

    this.setInputsInline(false);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(ARRAY_HUE);
    this.setTooltip((Blockly.Msg as any).BLOCKS_ARRAY_CREATETOOLTIP || 'Create an array. Specify type, dimension, size or content.');
  },

  dimCount_: 1,
  initType_: 'size',

  updateShape_: function(this: Blockly.Block, _newValue: string) {
    const dim = parseInt(this.getFieldValue('DIM') || '1', 10);
    const initType = this.getFieldValue('INIT_TYPE') || 'size';

    // 既存の入力を削除
    for (let i = 0; i < 5; i++) {
      if (this.getInput(`SIZE${i}`)) this.removeInput(`SIZE${i}`);
      if (this.getInput(`CONTENT${i}`)) this.removeInput(`CONTENT${i}`);
    }

    const sizeLabel = (Blockly.Msg as any).BLOCKS_SIZE || 'Size';
    const contentLabel = (Blockly.Msg as any).BLOCKS_CONTENT || 'Content';

    if (initType === 'size') {
      // サイズ指定モード
      for (let i = 0; i < dim; i++) {
        this.appendValueInput(`SIZE${i}`)
          .setCheck('Number')
          .setAlign(Blockly.inputs.Align.RIGHT)
          .appendField(dim > 1 ? `${sizeLabel}${i + 1}` : sizeLabel);
      }
    } else {
      // 内容指定モード
      for (let i = 0; i < dim; i++) {
        this.appendValueInput(`CONTENT${i}`)
          .setAlign(Blockly.inputs.Align.RIGHT)
          .appendField(dim > 1 ? `${contentLabel}${i + 1}` : contentLabel);
      }
    }

    (this as any).dimCount_ = dim;
    (this as any).initType_ = initType;
    return _newValue;
  },

  mutationToDom: function(this: Blockly.Block) {
    const container = Blockly.utils.xml.createElement('mutation');
    container.setAttribute('dim', String(this.getFieldValue('DIM') || '1'));
    container.setAttribute('init_type', this.getFieldValue('INIT_TYPE') || 'size');
    return container;
  },

  domToMutation: function(this: Blockly.Block, xmlElement: Element) {
    const dim = xmlElement.getAttribute('dim') || '1';
    const initType = xmlElement.getAttribute('init_type') || 'size';
    this.setFieldValue(dim, 'DIM');
    this.setFieldValue(initType, 'INIT_TYPE');
    (this as any).updateShape_(dim);
  }
};

javascriptGenerator.forBlock['array_create'] = function(block: Blockly.Block) {
  const varName = block.getFieldValue('VAR');
  const type = block.getFieldValue('TYPE');
  const dim = parseInt(block.getFieldValue('DIM'), 10);
  const initType = block.getFieldValue('INIT_TYPE');

  if (initType === 'size') {
    // サイズ指定: int arr[5]; または int arr[3][4];
    let sizeStr = '';
    for (let i = 0; i < dim; i++) {
      const size = javascriptGenerator.valueToCode(block, `SIZE${i}`, Order.ATOMIC) || '0';
      sizeStr += `[${size}]`;
    }
    javascriptGenerator.definitions_[`array_${varName}`] = `${type} ${varName}${sizeStr};`;
  } else {
    // 内容指定: int arr[] = {1, 2, 3};
    let contentStr = '';
    let sizeStr = '';
    for (let i = 0; i < dim; i++) {
      const content = javascriptGenerator.valueToCode(block, `CONTENT${i}`, Order.ATOMIC) || '{}';
      if (i === 0) {
        contentStr = content;
        // 内容から要素数を推測（簡易版）
        const elements = content.replace(/[{}]/g, '').split(',');
        sizeStr += `[${elements.length}]`;
      } else {
        contentStr = `{${contentStr}, ${content}}`;
        sizeStr = `[]${sizeStr}`;
      }
    }
    javascriptGenerator.definitions_[`array_${varName}`] = `${type} ${varName}${sizeStr} = ${contentStr};`;
  }

  return '';
};

// ========================================
// 配列要素設定ブロック
// ========================================
Blockly.Blocks['array_set'] = {
  init: function(this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('📦 ' + ((Blockly.Msg as any).BLOCKS_ARRAY || 'Array'))
      .appendField(new Blockly.FieldTextInput('myArray'), 'VAR');
    this.appendDummyInput('DIM_INPUT')
      .appendField((Blockly.Msg as any).BLOCKS_ARRAY_DIMENSION || 'Dimension')
      .appendField(new Blockly.FieldDropdown([
        [((Blockly.Msg as any).BLOCKS_ARRAY_1D || '1D'), '1'],
        [((Blockly.Msg as any).BLOCKS_ARRAY_2D || '2D'), '2'],
        [((Blockly.Msg as any).BLOCKS_ARRAY_3D || '3D'), '3']
      ],
        (this as any).updateShape_.bind(this)
      ) as any, 'DIM');
    this.appendValueInput('INDEX0')
      .setCheck('Number')
      .appendField('[');
    this.appendDummyInput('CLOSE0')
      .appendField(']');
    this.appendValueInput('VALUE')
      .appendField('=');
    this.appendDummyInput()
      .appendField((Blockly.Msg as any).BLOCKS_SET || 'Set');

    this.setInputsInline(true);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(ARRAY_HUE);
    this.setTooltip((Blockly.Msg as any).BLOCKS_ARRAY_SETTOOLTIP || 'Set value at specified position in array.');
  },

  dimCount_: 1,

  updateShape_: function(this: Blockly.Block, newValue: string) {
    const dim = parseInt(newValue, 10);

    // 既存のインデックス入力を削除
    for (let i = 0; i < 5; i++) {
      if (this.getInput(`INDEX${i}`)) this.removeInput(`INDEX${i}`);
      if (this.getInput(`CLOSE${i}`)) this.removeInput(`CLOSE${i}`);
    }
    // VALUE入力も一旦削除して再追加
    if (this.getInput('VALUE')) this.removeInput('VALUE');
    const lastDummy = this.getInput('');
    if (lastDummy) this.removeInput('');

    // 新しいインデックス入力を追加
    for (let i = 0; i < dim; i++) {
      this.appendValueInput(`INDEX${i}`)
        .setCheck('Number')
        .appendField('[');
      this.appendDummyInput(`CLOSE${i}`)
        .appendField(']');
    }

    this.appendValueInput('VALUE')
      .appendField('=');
    this.appendDummyInput()
      .appendField((Blockly.Msg as any).BLOCKS_SET || 'Set');

    (this as any).dimCount_ = dim;
    return newValue;
  },

  mutationToDom: function(this: Blockly.Block) {
    const container = Blockly.utils.xml.createElement('mutation');
    container.setAttribute('dim', String(this.getFieldValue('DIM') || '1'));
    return container;
  },

  domToMutation: function(this: Blockly.Block, xmlElement: Element) {
    const dim = xmlElement.getAttribute('dim') || '1';
    this.setFieldValue(dim, 'DIM');
    (this as any).updateShape_(dim);
  }
};

javascriptGenerator.forBlock['array_set'] = function(block: Blockly.Block) {
  const varName = block.getFieldValue('VAR');
  const dim = parseInt(block.getFieldValue('DIM'), 10);
  const value = javascriptGenerator.valueToCode(block, 'VALUE', Order.ATOMIC) || '0';

  let indexStr = '';
  for (let i = 0; i < dim; i++) {
    const index = javascriptGenerator.valueToCode(block, `INDEX${i}`, Order.ATOMIC) || '0';
    indexStr += `[${index}]`;
  }

  return `${varName}${indexStr} = ${value};\n`;
};

// ========================================
// 配列要素取得ブロック
// ========================================
Blockly.Blocks['array_get'] = {
  init: function(this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('📦 ' + ((Blockly.Msg as any).BLOCKS_ARRAY || 'Array'))
      .appendField(new Blockly.FieldTextInput('myArray'), 'VAR')
      .appendField((Blockly.Msg as any).BLOCKS_ARRAY_DIMENSION || 'Dimension')
      .appendField(new Blockly.FieldDropdown([
        [((Blockly.Msg as any).BLOCKS_ARRAY_1D || '1D'), '1'],
        [((Blockly.Msg as any).BLOCKS_ARRAY_2D || '2D'), '2'],
        [((Blockly.Msg as any).BLOCKS_ARRAY_3D || '3D'), '3']
      ],
        (this as any).updateShape_.bind(this)
      ) as any, 'DIM');
    this.appendValueInput('INDEX0')
      .setCheck('Number')
      .appendField('[');
    this.appendDummyInput('CLOSE0')
      .appendField(']');

    this.setInputsInline(true);
    this.setOutput(true);
    this.setColour(ARRAY_HUE);
    this.setTooltip((Blockly.Msg as any).BLOCKS_ARRAY_GETTOOLTIP || 'Get value at specified position in array.');
  },

  dimCount_: 1,

  updateShape_: function(this: Blockly.Block, newValue: string) {
    const dim = parseInt(newValue, 10);

    // 既存のインデックス入力を削除
    for (let i = 0; i < 5; i++) {
      if (this.getInput(`INDEX${i}`)) this.removeInput(`INDEX${i}`);
      if (this.getInput(`CLOSE${i}`)) this.removeInput(`CLOSE${i}`);
    }

    // 新しいインデックス入力を追加
    for (let i = 0; i < dim; i++) {
      this.appendValueInput(`INDEX${i}`)
        .setCheck('Number')
        .appendField('[');
      this.appendDummyInput(`CLOSE${i}`)
        .appendField(']');
    }

    (this as any).dimCount_ = dim;
    return newValue;
  },

  mutationToDom: function(this: Blockly.Block) {
    const container = Blockly.utils.xml.createElement('mutation');
    container.setAttribute('dim', String(this.getFieldValue('DIM') || '1'));
    return container;
  },

  domToMutation: function(this: Blockly.Block, xmlElement: Element) {
    const dim = xmlElement.getAttribute('dim') || '1';
    this.setFieldValue(dim, 'DIM');
    (this as any).updateShape_(dim);
  }
};

javascriptGenerator.forBlock['array_get'] = function(block: Blockly.Block) {
  const varName = block.getFieldValue('VAR');
  const dim = parseInt(block.getFieldValue('DIM'), 10);

  let indexStr = '';
  for (let i = 0; i < dim; i++) {
    const index = javascriptGenerator.valueToCode(block, `INDEX${i}`, Order.ATOMIC) || '0';
    indexStr += `[${index}]`;
  }

  return [`${varName}${indexStr}`, Order.ATOMIC];
};

// ========================================
// 配列サイズ取得ブロック
// ========================================
Blockly.Blocks['array_size'] = {
  init: function(this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('📦 ' + ((Blockly.Msg as any).BLOCKS_ARRAY || 'Array'))
      .appendField(new Blockly.FieldTextInput('myArray'), 'VAR')
      .appendField((Blockly.Msg as any).BLOCKS_ARRAY_SIZE || 'Size');

    this.setInputsInline(true);
    this.setOutput(true, 'Number');
    this.setColour(ARRAY_HUE);
    this.setTooltip((Blockly.Msg as any).BLOCKS_ARRAY_SIZETOOLTIP || 'Get the number of elements in the array.');
  }
};

javascriptGenerator.forBlock['array_size'] = function(block: Blockly.Block) {
  const varName = block.getFieldValue('VAR');
  return [`sizeof(${varName})/sizeof(${varName}[0])`, Order.ATOMIC];
};

// ========================================
// 配列内容ブロック（{1, 2, 3}形式）
// ========================================
Blockly.Blocks['array_content'] = {
  init: function(this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('📦 {');
    this.appendDummyInput('ITEM_COUNT')
      .appendField((Blockly.Msg as any).BLOCKS_ARRAY_ITEMCOUNT || 'Items')
      .appendField(new Blockly.FieldDropdown(
        [['2', '2'], ['3', '3'], ['4', '4'], ['5', '5'], ['6', '6'], ['8', '8'], ['10', '10']],
        (this as any).updateShape_.bind(this)
      ) as any, 'COUNT');

    // 初期状態：3要素
    (this as any).itemCount_ = 3;
    (this as any).updateShape_('3');

    this.setInputsInline(true);
    this.setOutput(true, 'Array');
    this.setColour(ARRAY_HUE);
    this.setTooltip((Blockly.Msg as any).BLOCKS_ARRAY_CONTENTTOOLTIP || 'Create array content. Example: {1, 2, 3}');
  },

  itemCount_: 3,

  updateShape_: function(this: Blockly.Block, newValue: string) {
    const count = parseInt(newValue, 10);

    // 既存の入力を削除
    for (let i = 0; i < 15; i++) {
      if (this.getInput(`ITEM${i}`)) this.removeInput(`ITEM${i}`);
    }
    if (this.getInput('CLOSE')) this.removeInput('CLOSE');

    // 新しい入力を追加
    for (let i = 0; i < count; i++) {
      const input = this.appendValueInput(`ITEM${i}`)
        .setCheck('Number');
      if (i > 0) {
        input.appendField(',');
      }
    }

    this.appendDummyInput('CLOSE')
      .appendField('}');

    (this as any).itemCount_ = count;
    return newValue;
  },

  mutationToDom: function(this: Blockly.Block) {
    const container = Blockly.utils.xml.createElement('mutation');
    container.setAttribute('items', String((this as any).itemCount_));
    return container;
  },

  domToMutation: function(this: Blockly.Block, xmlElement: Element) {
    const items = xmlElement.getAttribute('items') || '3';
    this.setFieldValue(items, 'COUNT');
    (this as any).updateShape_(items);
  }
};

javascriptGenerator.forBlock['array_content'] = function(block: Blockly.Block) {
  const count = (block as any).itemCount_ || 3;
  const items: string[] = [];

  for (let i = 0; i < count; i++) {
    const item = javascriptGenerator.valueToCode(block, `ITEM${i}`, Order.ATOMIC) || '0';
    items.push(item);
  }

  return [`{${items.join(', ')}}`, Order.ATOMIC];
};

export {};
