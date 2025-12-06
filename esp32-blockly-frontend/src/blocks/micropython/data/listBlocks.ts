/**
 * MicroPython リストブロック（動的配列）
 * UIFlow2/Scratchスタイル
 */
import * as Blockly from 'blockly';
import { pythonGenerator } from 'blockly/python';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const pyGen = pythonGenerator as any;

const LIST_COLOR = '#9C27B0';

// ========================================
// リスト作成（空）
// ========================================
Blockly.Blocks['mp_list_create_empty'] = {
  init: function(this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('📋 ' + ((Blockly.Msg as any).BLOCKS_MICROPYTHON_LIST_CREATEEMPTY_LABEL || 'Create Empty List'))
      .appendField(new Blockly.FieldTextInput('myList'), 'VAR');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(LIST_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_MICROPYTHON_LIST_CREATEEMPTY_TOOLTIP || 'Create an empty list');
  }
};

pythonGenerator.forBlock['mp_list_create_empty'] = function(block: Blockly.Block) {
  const varName = block.getFieldValue('VAR');
  return `${varName} = []\n`;
};

// ========================================
// リスト作成（要素付き）
// ========================================
Blockly.Blocks['mp_list_create_with'] = {
  init: function(this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('📋 ' + ((Blockly.Msg as any).BLOCKS_MICROPYTHON_LIST_CREATEWITH_LABEL || 'Create List'))
      .appendField(new Blockly.FieldTextInput('myList'), 'VAR')
      .appendField((Blockly.Msg as any).BLOCKS_MICROPYTHON_LIST_CREATEWITH_ELEMENTS || 'Elements')
      .appendField(new Blockly.FieldDropdown([
        ['2', '2'], ['3', '3'], ['4', '4'], ['5', '5'],
        ['6', '6'], ['8', '8'], ['10', '10']
      ], this.updateShape_.bind(this)), 'COUNT');

    this.itemCount_ = 3;
    this.updateShape_('3');

    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(LIST_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_MICROPYTHON_LIST_CREATEWITH_TOOLTIP || 'Create a list with elements');
  },

  itemCount_: 3,

  updateShape_: function(this: Blockly.Block, newValue: string) {
    const count = parseInt(newValue, 10);

    // 既存の入力を削除
    for (let i = 0; i < 15; i++) {
      if (this.getInput(`ITEM${i}`)) this.removeInput(`ITEM${i}`);
    }

    // 新しい入力を追加
    for (let i = 0; i < count; i++) {
      this.appendValueInput(`ITEM${i}`)
        .appendField(i === 0 ? '=' : ',');
    }

    this.itemCount_ = count;
    return newValue;
  },

  mutationToDom: function(this: Blockly.Block) {
    const container = Blockly.utils.xml.createElement('mutation');
    container.setAttribute('items', String(this.itemCount_));
    return container;
  },

  domToMutation: function(this: Blockly.Block, xmlElement: Element) {
    const items = xmlElement.getAttribute('items') || '3';
    this.setFieldValue(items, 'COUNT');
    this.updateShape_(items);
  }
};

pythonGenerator.forBlock['mp_list_create_with'] = function(block: Blockly.Block) {
  const varName = block.getFieldValue('VAR');
  const count = block.itemCount_ || 3;
  const items: string[] = [];

  for (let i = 0; i < count; i++) {
    const item = pythonGenerator.valueToCode(block, `ITEM${i}`, pyGen.ORDER_NONE) || '0';
    items.push(item);
  }

  return `${varName} = [${items.join(', ')}]\n`;
};

// ========================================
// リストに追加
// ========================================
Blockly.Blocks['mp_list_append'] = {
  init: function(this: Blockly.Block) {
    this.appendValueInput('ITEM')
      .appendField('📋 ' + ((Blockly.Msg as any).BLOCKS_MICROPYTHON_LIST_APPEND_LABEL || 'List'))
      .appendField(new Blockly.FieldTextInput('myList'), 'VAR')
      .appendField((Blockly.Msg as any).BLOCKS_MICROPYTHON_LIST_APPEND_TO || 'append');
    this.setInputsInline(true);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(LIST_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_MICROPYTHON_LIST_APPEND_TOOLTIP || 'Append element to end of list');
  }
};

pythonGenerator.forBlock['mp_list_append'] = function(block: Blockly.Block) {
  const varName = block.getFieldValue('VAR');
  const item = pythonGenerator.valueToCode(block, 'ITEM', pyGen.ORDER_NONE) || '0';
  return `${varName}.append(${item})\n`;
};

// ========================================
// リストに挿入
// ========================================
Blockly.Blocks['mp_list_insert'] = {
  init: function(this: Blockly.Block) {
    this.appendValueInput('INDEX')
      .setCheck('Number')
      .appendField('📋 ' + ((Blockly.Msg as any).BLOCKS_MICROPYTHON_LIST_INSERT_LABEL || 'List'))
      .appendField(new Blockly.FieldTextInput('myList'), 'VAR')
      .appendField((Blockly.Msg as any).BLOCKS_MICROPYTHON_LIST_INSERT_ATINDEX || 'at index');
    this.appendValueInput('ITEM')
      .appendField((Blockly.Msg as any).BLOCKS_MICROPYTHON_LIST_INSERT_INSERT || 'insert');
    this.setInputsInline(true);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(LIST_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_MICROPYTHON_LIST_INSERT_TOOLTIP || 'Insert element at specified position in list');
  }
};

pythonGenerator.forBlock['mp_list_insert'] = function(block: Blockly.Block) {
  const varName = block.getFieldValue('VAR');
  const index = pythonGenerator.valueToCode(block, 'INDEX', pyGen.ORDER_NONE) || '0';
  const item = pythonGenerator.valueToCode(block, 'ITEM', pyGen.ORDER_NONE) || '0';
  return `${varName}.insert(${index}, ${item})\n`;
};

// ========================================
// リストから削除（インデックス）
// ========================================
Blockly.Blocks['mp_list_remove_index'] = {
  init: function(this: Blockly.Block) {
    this.appendValueInput('INDEX')
      .setCheck('Number')
      .appendField('📋 ' + ((Blockly.Msg as any).BLOCKS_MICROPYTHON_LIST_REMOVEINDEX_LABEL || 'List'))
      .appendField(new Blockly.FieldTextInput('myList'), 'VAR')
      .appendField((Blockly.Msg as any).BLOCKS_MICROPYTHON_LIST_REMOVEINDEX_ATINDEX || 'at index');
    this.appendDummyInput()
      .appendField((Blockly.Msg as any).BLOCKS_MICROPYTHON_LIST_REMOVEINDEX_REMOVE || 'remove');
    this.setInputsInline(true);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(LIST_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_MICROPYTHON_LIST_REMOVEINDEX_TOOLTIP || 'Remove element at specified position from list');
  }
};

pythonGenerator.forBlock['mp_list_remove_index'] = function(block: Blockly.Block) {
  const varName = block.getFieldValue('VAR');
  const index = pythonGenerator.valueToCode(block, 'INDEX', pyGen.ORDER_NONE) || '0';
  return `${varName}.pop(${index})\n`;
};

// ========================================
// リストから削除（値）
// ========================================
Blockly.Blocks['mp_list_remove_value'] = {
  init: function(this: Blockly.Block) {
    this.appendValueInput('VALUE')
      .appendField('📋 ' + ((Blockly.Msg as any).BLOCKS_MICROPYTHON_LIST_REMOVEVALUE_LABEL || 'List'))
      .appendField(new Blockly.FieldTextInput('myList'), 'VAR')
      .appendField((Blockly.Msg as any).BLOCKS_MICROPYTHON_LIST_REMOVEVALUE_FROM || 'remove value');
    this.appendDummyInput()
      .appendField((Blockly.Msg as any).BLOCKS_MICROPYTHON_LIST_REMOVEVALUE_REMOVE || 'from list');
    this.setInputsInline(true);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(LIST_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_MICROPYTHON_LIST_REMOVEVALUE_TOOLTIP || 'Remove specified value from list');
  }
};

pythonGenerator.forBlock['mp_list_remove_value'] = function(block: Blockly.Block) {
  const varName = block.getFieldValue('VAR');
  const value = pythonGenerator.valueToCode(block, 'VALUE', pyGen.ORDER_NONE) || '0';
  return `${varName}.remove(${value})\n`;
};

// ========================================
// リスト要素取得
// ========================================
Blockly.Blocks['mp_list_get'] = {
  init: function(this: Blockly.Block) {
    this.appendValueInput('INDEX')
      .setCheck('Number')
      .appendField('📋 ' + ((Blockly.Msg as any).BLOCKS_MICROPYTHON_LIST_GET_LABEL || 'List'))
      .appendField(new Blockly.FieldTextInput('myList'), 'VAR')
      .appendField('[');
    this.appendDummyInput()
      .appendField(']');
    this.setInputsInline(true);
    this.setOutput(true);
    this.setColour(LIST_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_MICROPYTHON_LIST_GET_TOOLTIP || 'Get element at specified position in list');
  }
};

pythonGenerator.forBlock['mp_list_get'] = function(block: Blockly.Block) {
  const varName = block.getFieldValue('VAR');
  const index = pythonGenerator.valueToCode(block, 'INDEX', pyGen.ORDER_NONE) || '0';
  const code = `${varName}[${index}]`;
  return [code, pyGen.ORDER_MEMBER];
};

// ========================================
// リスト要素設定
// ========================================
Blockly.Blocks['mp_list_set'] = {
  init: function(this: Blockly.Block) {
    this.appendValueInput('INDEX')
      .setCheck('Number')
      .appendField('📋 ' + ((Blockly.Msg as any).BLOCKS_MICROPYTHON_LIST_SET_LABEL || 'List'))
      .appendField(new Blockly.FieldTextInput('myList'), 'VAR')
      .appendField('[');
    this.appendValueInput('VALUE')
      .appendField('] =');
    this.setInputsInline(true);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(LIST_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_MICROPYTHON_LIST_SET_TOOLTIP || 'Set value at specified position in list');
  }
};

pythonGenerator.forBlock['mp_list_set'] = function(block: Blockly.Block) {
  const varName = block.getFieldValue('VAR');
  const index = pythonGenerator.valueToCode(block, 'INDEX', pyGen.ORDER_NONE) || '0';
  const value = pythonGenerator.valueToCode(block, 'VALUE', pyGen.ORDER_NONE) || '0';
  return `${varName}[${index}] = ${value}\n`;
};

// ========================================
// リストの長さ
// ========================================
Blockly.Blocks['mp_list_length'] = {
  init: function(this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('📋 ' + ((Blockly.Msg as any).BLOCKS_MICROPYTHON_LIST_LENGTH_LABEL || 'List'))
      .appendField(new Blockly.FieldTextInput('myList'), 'VAR')
      .appendField((Blockly.Msg as any).BLOCKS_MICROPYTHON_LIST_LENGTH_LENGTHOF || 'length of');
    this.setOutput(true, 'Number');
    this.setColour(LIST_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_MICROPYTHON_LIST_LENGTH_TOOLTIP || 'Return number of elements in list');
  }
};

pythonGenerator.forBlock['mp_list_length'] = function(block: Blockly.Block) {
  const varName = block.getFieldValue('VAR');
  const code = `len(${varName})`;
  return [code, pyGen.ORDER_FUNCTION_CALL];
};

// ========================================
// リストに含まれるか
// ========================================
Blockly.Blocks['mp_list_contains'] = {
  init: function(this: Blockly.Block) {
    this.appendValueInput('VALUE')
      .appendField('📋 ' + ((Blockly.Msg as any).BLOCKS_MICROPYTHON_LIST_CONTAINS_LABEL || 'List'))
      .appendField(new Blockly.FieldTextInput('myList'), 'VAR')
      .appendField((Blockly.Msg as any).BLOCKS_MICROPYTHON_LIST_CONTAINS_IN || 'contains');
    this.appendDummyInput()
      .appendField((Blockly.Msg as any).BLOCKS_MICROPYTHON_LIST_CONTAINS_CONTAINS || '?');
    this.setInputsInline(true);
    this.setOutput(true, 'Boolean');
    this.setColour(LIST_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_MICROPYTHON_LIST_CONTAINS_TOOLTIP || 'Check if list contains value');
  }
};

pythonGenerator.forBlock['mp_list_contains'] = function(block: Blockly.Block) {
  const varName = block.getFieldValue('VAR');
  const value = pythonGenerator.valueToCode(block, 'VALUE', pyGen.ORDER_NONE) || '0';
  const code = `(${value} in ${varName})`;
  return [code, pyGen.ORDER_COMPARISON];
};

// ========================================
// リストのインデックス検索
// ========================================
Blockly.Blocks['mp_list_index'] = {
  init: function(this: Blockly.Block) {
    this.appendValueInput('VALUE')
      .appendField('📋 ' + ((Blockly.Msg as any).BLOCKS_MICROPYTHON_LIST_INDEX_LABEL || 'List'))
      .appendField(new Blockly.FieldTextInput('myList'), 'VAR')
      .appendField((Blockly.Msg as any).BLOCKS_MICROPYTHON_LIST_INDEX_OF || 'index of');
    this.appendDummyInput()
      .appendField((Blockly.Msg as any).BLOCKS_MICROPYTHON_LIST_INDEX_POSITION || 'in list');
    this.setInputsInline(true);
    this.setOutput(true, 'Number');
    this.setColour(LIST_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_MICROPYTHON_LIST_INDEX_TOOLTIP || 'Return position of value in list (-1 if not found)');
  }
};

pythonGenerator.forBlock['mp_list_index'] = function(block: Blockly.Block) {
  const varName = block.getFieldValue('VAR');
  const value = pythonGenerator.valueToCode(block, 'VALUE', pyGen.ORDER_NONE) || '0';

  // index()はValueErrorを発生させるのでtry-exceptでラップ
  pyGen.definitions_['list_index_safe'] =
    `def list_index_safe(lst, val):\n` +
    `    try:\n` +
    `        return lst.index(val)\n` +
    `    except ValueError:\n` +
    `        return -1`;

  const code = `list_index_safe(${varName}, ${value})`;
  return [code, pyGen.ORDER_FUNCTION_CALL];
};

// ========================================
// リストをクリア
// ========================================
Blockly.Blocks['mp_list_clear'] = {
  init: function(this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('📋 ' + ((Blockly.Msg as any).BLOCKS_MICROPYTHON_LIST_CLEAR_LABEL || 'List'))
      .appendField(new Blockly.FieldTextInput('myList'), 'VAR')
      .appendField((Blockly.Msg as any).BLOCKS_MICROPYTHON_LIST_CLEAR_CLEAR || 'clear');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(LIST_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_MICROPYTHON_LIST_CLEAR_TOOLTIP || 'Remove all elements from list');
  }
};

pythonGenerator.forBlock['mp_list_clear'] = function(block: Blockly.Block) {
  const varName = block.getFieldValue('VAR');
  return `${varName}.clear()\n`;
};

// ========================================
// リストを逆順
// ========================================
Blockly.Blocks['mp_list_reverse'] = {
  init: function(this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('📋 ' + ((Blockly.Msg as any).BLOCKS_MICROPYTHON_LIST_REVERSE_LABEL || 'List'))
      .appendField(new Blockly.FieldTextInput('myList'), 'VAR')
      .appendField((Blockly.Msg as any).BLOCKS_MICROPYTHON_LIST_REVERSE_REVERSE || 'reverse');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(LIST_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_MICROPYTHON_LIST_REVERSE_TOOLTIP || 'Reverse order of list');
  }
};

pythonGenerator.forBlock['mp_list_reverse'] = function(block: Blockly.Block) {
  const varName = block.getFieldValue('VAR');
  return `${varName}.reverse()\n`;
};

// ========================================
// リストをソート
// ========================================
Blockly.Blocks['mp_list_sort'] = {
  init: function(this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('📋 ' + ((Blockly.Msg as any).BLOCKS_MICROPYTHON_LIST_SORT_LABEL || 'List'))
      .appendField(new Blockly.FieldTextInput('myList'), 'VAR')
      .appendField(new Blockly.FieldDropdown([
        [(Blockly.Msg as any).BLOCKS_MICROPYTHON_LIST_SORT_ASCENDING || 'Ascending', 'asc'],
        [(Blockly.Msg as any).BLOCKS_MICROPYTHON_LIST_SORT_DESCENDING || 'Descending', 'desc']
      ]), 'ORDER')
      .appendField((Blockly.Msg as any).BLOCKS_MICROPYTHON_LIST_SORT_SORT || 'sort');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(LIST_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_MICROPYTHON_LIST_SORT_TOOLTIP || 'Sort list');
  }
};

pythonGenerator.forBlock['mp_list_sort'] = function(block: Blockly.Block) {
  const varName = block.getFieldValue('VAR');
  const order = block.getFieldValue('ORDER');

  if (order === 'asc') {
    return `${varName}.sort()\n`;
  } else {
    return `${varName}.sort(reverse=True)\n`;
  }
};

export {};
