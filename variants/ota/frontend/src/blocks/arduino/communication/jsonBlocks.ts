/*
 * DigiCode - Block-based ESP32 Programming Tool
 * Copyright (C) 2024-2026 DigiCo LLC
 *
 * Licensed under the GNU Affero General Public License version 3 or later.
 * See LICENSE file in the repository root for full terms.
 */

/**
 * JSONパース/生成ブロック
 * ArduinoJsonライブラリを使用
 *
 * i18n: Uses Blockly.Msg.* for dynamic language switching
 */
import * as Blockly from 'blockly';
import { javascriptGenerator, Order } from 'blockly/javascript';

// 型アサーション用のヘルパー
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const generator = javascriptGenerator as any;

// ===== JSONパース =====

/**
 * json_parse_size - バッファサイズ指定でJSONパース (case 19 cluster R2-A 第113回:
 * 旧 json_parse 削除統合。両 block は同 key `json_doc` を unconditional 上書き合戦
 * = 後勝ちで silent buffer-size mismatch (user 4096 指定が json_parse 後発で 2048
 * に縮小されると ArduinoJson が無音 overflow)。json_parse_size が完全 superset
 * (size dropdown に 2048 default 含む) で代替可、json_parse 削除で穴塞ぎ。)
 */
Blockly.Blocks['json_parse_size'] = {
  init: function() {
    this.appendValueInput('JSON')
        .setCheck('String')
        .appendField('📋 ' + (Blockly.Msg.BLOCKS_JSON_PARSEWITHSIZE || 'JSON Parse (with size)'));
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_JSON_BUFFER || 'Buffer')
        .appendField(new Blockly.FieldDropdown([
          ['512 ' + (Blockly.Msg.BLOCKS_JSON_BYTES || 'bytes'), '512'],
          ['1024 ' + (Blockly.Msg.BLOCKS_JSON_BYTES || 'bytes'), '1024'],
          ['2048 ' + (Blockly.Msg.BLOCKS_JSON_BYTES || 'bytes'), '2048'],
          ['4096 ' + (Blockly.Msg.BLOCKS_JSON_BYTES || 'bytes'), '4096'],
          ['8192 ' + (Blockly.Msg.BLOCKS_JSON_BYTES || 'bytes'), '8192']
        ]), 'SIZE');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour('#FF5722');
    this.setTooltip(Blockly.Msg.BLOCKS_JSON_PARSEWITHSIZETOOLTIP || 'Increase buffer size for large JSON');
  }
};

javascriptGenerator.forBlock['json_parse_size'] = function(block: Blockly.Block) {
  const json = javascriptGenerator.valueToCode(block, 'JSON', Order.ATOMIC) || '"{}"';
  const size = block.getFieldValue('SIZE');

  generator.definitions_['include_arduinojson'] = '#include <ArduinoJson.h>';
  generator.definitions_['json_doc'] = `StaticJsonDocument<${size}> _jsonDoc;`;

  return `  // JSON Parse
  _jsonDoc.clear();
  deserializeJson(_jsonDoc, ${json});
`;
};

// ===== JSON値取得 =====

/**
 * json_get_string - JSON文字列値を取得
 */
Blockly.Blocks['json_get_string'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('📖 ' + (Blockly.Msg.BLOCKS_JSON_GETSTRING || 'JSON Get String'))
        .appendField(new Blockly.FieldTextInput('key'), 'KEY');
    this.setOutput(true, 'String');
    this.setColour('#FF5722');
    this.setTooltip(Blockly.Msg.BLOCKS_JSON_GETSTRINGTOOLTIP || 'Get string value from JSON by key');
  }
};

javascriptGenerator.forBlock['json_get_string'] = function(block: Blockly.Block) {
  const key = block.getFieldValue('KEY');
  return [`_jsonDoc["${key}"].as<String>()`, Order.FUNCTION_CALL];
};

/**
 * json_get_number - JSON数値を取得
 */
Blockly.Blocks['json_get_number'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('📖 ' + (Blockly.Msg.BLOCKS_JSON_GETNUMBER || 'JSON Get Number'))
        .appendField(new Blockly.FieldTextInput('key'), 'KEY');
    this.setOutput(true, 'Number');
    this.setColour('#FF5722');
    this.setTooltip(Blockly.Msg.BLOCKS_JSON_GETNUMBERTOOLTIP || 'Get number value from JSON by key');
  }
};

javascriptGenerator.forBlock['json_get_number'] = function(block: Blockly.Block) {
  const key = block.getFieldValue('KEY');
  return [`_jsonDoc["${key}"].as<float>()`, Order.FUNCTION_CALL];
};

/**
 * json_get_int - JSON整数を取得
 */
Blockly.Blocks['json_get_int'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('📖 ' + (Blockly.Msg.BLOCKS_JSON_GETINT || 'JSON Get Integer'))
        .appendField(new Blockly.FieldTextInput('key'), 'KEY');
    this.setOutput(true, 'Number');
    this.setColour('#FF5722');
    this.setTooltip(Blockly.Msg.BLOCKS_JSON_GETINTTOOLTIP || 'Get integer value from JSON by key');
  }
};

javascriptGenerator.forBlock['json_get_int'] = function(block: Blockly.Block) {
  const key = block.getFieldValue('KEY');
  return [`_jsonDoc["${key}"].as<int>()`, Order.FUNCTION_CALL];
};

/**
 * json_get_bool - JSON真偽値を取得
 */
Blockly.Blocks['json_get_bool'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('📖 ' + (Blockly.Msg.BLOCKS_JSON_GETBOOL || 'JSON Get Boolean'))
        .appendField(new Blockly.FieldTextInput('key'), 'KEY');
    this.setOutput(true, 'Boolean');
    this.setColour('#FF5722');
    this.setTooltip(Blockly.Msg.BLOCKS_JSON_GETBOOLTOOLTIP || 'Get boolean value from JSON by key');
  }
};

javascriptGenerator.forBlock['json_get_bool'] = function(block: Blockly.Block) {
  const key = block.getFieldValue('KEY');
  return [`_jsonDoc["${key}"].as<bool>()`, Order.FUNCTION_CALL];
};

/**
 * json_get_nested - ネストしたJSON値を取得
 *
 * RB-3 (Session 120 zero-base re-audit, case 19 axis 1 storage 外領域 sweep):
 * TYPE dropdown (String/float/int/bool) で C++ emit `.as<${type}>()` の出力型が変わるが、
 * 旧コードは `setOutput(true, null)` で unrestricted output (Session 119 R5 と同根の
 * latent type-leak)。本 fix で TYPE field の validator 経由で setOutput を
 * String → 'String' / float|int → 'Number' / bool → 'Boolean' に動的切替。
 * R5 (preferences_get) と同 pattern、JSON 通信領域に sweep。
 */
Blockly.Blocks['json_get_nested'] = {
  init: function() {
    const setOutputForType = (type: string) => {
      if (type === 'String') {
        this.setOutput(true, 'String');
      } else if (type === 'bool') {
        this.setOutput(true, 'Boolean');
      } else {
        this.setOutput(true, 'Number'); // float / int
      }
    };
    this.appendDummyInput()
        .appendField('📖 ' + (Blockly.Msg.BLOCKS_JSON_GETNESTED || 'JSON Get Nested'));
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_JSON_PATH || 'Path')
        .appendField(new Blockly.FieldTextInput('data.value'), 'PATH');
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_JSON_TYPE || 'Type')
        .appendField(new Blockly.FieldDropdown([
          [Blockly.Msg.BLOCKS_JSON_TYPESTRING || 'String', 'String'],
          [Blockly.Msg.BLOCKS_JSON_TYPENUMBER || 'Number', 'float'],
          [Blockly.Msg.BLOCKS_JSON_TYPEINT || 'Integer', 'int'],
          [Blockly.Msg.BLOCKS_JSON_TYPEBOOL || 'Boolean', 'bool']
        ]), 'TYPE');
    // R5 pattern: 初期型 'String' で起点、TYPE 変更で動的切替
    // setValidator は appendField 後に attach (FieldDropdown constructor callback だと
    // catalog generator regex `new Blockly.FieldDropdown([...]), 'NAME'` 非 match)
    setOutputForType('String');
    const typeField = this.getField('TYPE');
    if (typeField) {
      typeField.setValidator((newValue: string) => {
        setOutputForType(newValue);
        return newValue;
      });
    }
    this.setColour('#FF5722');
    this.setTooltip(Blockly.Msg.BLOCKS_JSON_GETNESTEDTOOLTIP || 'Get nested JSON value (e.g., data.items[0].name)');
  }
};

javascriptGenerator.forBlock['json_get_nested'] = function(block: Blockly.Block) {
  const path = block.getFieldValue('PATH');
  const type = block.getFieldValue('TYPE');

  // パスを分解してアクセスコードを生成
  const parts = path.split('.');
  let accessor = '_jsonDoc';
  for (const part of parts) {
    // 配列アクセスをチェック
    const arrayMatch = part.match(/^(\w+)\[(\d+)\]$/);
    if (arrayMatch) {
      accessor += `["${arrayMatch[1]}"][${arrayMatch[2]}]`;
    } else {
      accessor += `["${part}"]`;
    }
  }

  return [`${accessor}.as<${type}>()`, Order.FUNCTION_CALL];
};

/**
 * json_has_key - JSONにキーが存在するか
 */
Blockly.Blocks['json_has_key'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('📖 ' + (Blockly.Msg.BLOCKS_JSON_HASKEY || 'JSON has key'))
        .appendField(new Blockly.FieldTextInput('key'), 'KEY')
        .appendField(Blockly.Msg.BLOCKS_JSON_EXISTS || 'exists');
    this.setOutput(true, 'Boolean');
    this.setColour('#FF5722');
    this.setTooltip(Blockly.Msg.BLOCKS_JSON_HASKEYTOOLTIP || 'Check if JSON has the specified key');
  }
};

javascriptGenerator.forBlock['json_has_key'] = function(block: Blockly.Block) {
  const key = block.getFieldValue('KEY');
  return [`_jsonDoc.containsKey("${key}")`, Order.FUNCTION_CALL];
};

/**
 * json_array_size - JSON配列のサイズを取得
 */
Blockly.Blocks['json_array_size'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('📖 ' + (Blockly.Msg.BLOCKS_JSON_ARRAYSIZE || 'JSON Array Size'))
        .appendField(new Blockly.FieldTextInput('items'), 'KEY');
    this.setOutput(true, 'Number');
    this.setColour('#FF5722');
    this.setTooltip(Blockly.Msg.BLOCKS_JSON_ARRAYSIZETOOLTIP || 'Get the number of elements in JSON array');
  }
};

javascriptGenerator.forBlock['json_array_size'] = function(block: Blockly.Block) {
  const key = block.getFieldValue('KEY');
  return [`_jsonDoc["${key}"].size()`, Order.FUNCTION_CALL];
};

/**
 * json_array_get - JSON配列の要素を取得
 *
 * RB-4 (Session 120 zero-base re-audit, case 19 axis 1 storage 外領域 sweep):
 * RB-3 (json_get_nested) と同根の dynamic output type pattern。TYPE dropdown
 * (String/float/int) で `.as<${type}>()` C++ emit が変わるため、R5 pattern で
 * setOutput を動的切替。bool は本 block では未提供 (json_array は number/string
 * 主体)、3 型 → String → 'String' / float|int → 'Number'。
 */
Blockly.Blocks['json_array_get'] = {
  init: function() {
    const setOutputForType = (type: string) => {
      this.setOutput(true, type === 'String' ? 'String' : 'Number');
    };
    this.appendDummyInput()
        .appendField('📖 ' + (Blockly.Msg.BLOCKS_JSON_ARRAY || 'JSON Array'))
        .appendField(new Blockly.FieldTextInput('items'), 'KEY');
    this.appendValueInput('INDEX')
        .setCheck('Number')
        .appendField(Blockly.Msg.BLOCKS_JSON_INDEX || 'index');
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_JSON_GETAS || 'get as')
        .appendField(new Blockly.FieldDropdown([
          [Blockly.Msg.BLOCKS_JSON_TYPESTRING || 'String', 'String'],
          [Blockly.Msg.BLOCKS_JSON_TYPENUMBER || 'Number', 'float'],
          [Blockly.Msg.BLOCKS_JSON_TYPEINT || 'Integer', 'int']
        ]), 'TYPE');
    setOutputForType('String');
    const typeField = this.getField('TYPE');
    if (typeField) {
      typeField.setValidator((newValue: string) => {
        setOutputForType(newValue);
        return newValue;
      });
    }
    this.setColour('#FF5722');
    this.setTooltip(Blockly.Msg.BLOCKS_JSON_ARRAYGETTOOLTIP || 'Get element from JSON array at specified index');
  }
};

javascriptGenerator.forBlock['json_array_get'] = function(block: Blockly.Block) {
  const key = block.getFieldValue('KEY');
  const index = javascriptGenerator.valueToCode(block, 'INDEX', Order.ATOMIC) || '0';
  const type = block.getFieldValue('TYPE');

  return [`_jsonDoc["${key}"][${index}].as<${type}>()`, Order.FUNCTION_CALL];
};

// ===== JSON生成 =====

/**
 * json_create_object - JSONオブジェクト作成開始
 */
Blockly.Blocks['json_create_object'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('📝 ' + (Blockly.Msg.BLOCKS_JSON_CREATE || 'JSON Create Start'));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour('#8BC34A');
    this.setTooltip(Blockly.Msg.BLOCKS_JSON_CREATETOOLTIP || 'Start creating a new JSON object');
  }
};

javascriptGenerator.forBlock['json_create_object'] = function() {
  generator.definitions_['include_arduinojson'] = '#include <ArduinoJson.h>';
  generator.definitions_['json_out_doc'] = 'StaticJsonDocument<1024> _jsonOutDoc;';

  return `  // JSON Create
  _jsonOutDoc.clear();
`;
};

/**
 * json_set_string - JSON文字列値を設定
 */
Blockly.Blocks['json_set_string'] = {
  init: function() {
    this.appendValueInput('VALUE')
        .setCheck('String')
        .appendField('📝 ' + (Blockly.Msg.BLOCKS_JSON_SET || 'JSON Set'))
        .appendField(new Blockly.FieldTextInput('key'), 'KEY')
        .appendField('=');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour('#8BC34A');
    this.setTooltip(Blockly.Msg.BLOCKS_JSON_SETSTRINGTOOLTIP || 'Set string value in JSON');
  }
};

javascriptGenerator.forBlock['json_set_string'] = function(block: Blockly.Block) {
  const key = block.getFieldValue('KEY');
  const value = javascriptGenerator.valueToCode(block, 'VALUE', Order.ATOMIC) || '""';

  return `  _jsonOutDoc["${key}"] = ${value};\n`;
};

/**
 * json_set_number - JSON数値を設定
 */
Blockly.Blocks['json_set_number'] = {
  init: function() {
    this.appendValueInput('VALUE')
        .setCheck('Number')
        .appendField('📝 ' + (Blockly.Msg.BLOCKS_JSON_SET || 'JSON Set'))
        .appendField(new Blockly.FieldTextInput('key'), 'KEY')
        .appendField('=');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour('#8BC34A');
    this.setTooltip(Blockly.Msg.BLOCKS_JSON_SETNUMBERTOOLTIP || 'Set number value in JSON');
  }
};

javascriptGenerator.forBlock['json_set_number'] = function(block: Blockly.Block) {
  const key = block.getFieldValue('KEY');
  const value = javascriptGenerator.valueToCode(block, 'VALUE', Order.ATOMIC) || '0';

  return `  _jsonOutDoc["${key}"] = ${value};\n`;
};

/**
 * json_set_bool - JSON真偽値を設定
 */
Blockly.Blocks['json_set_bool'] = {
  init: function() {
    this.appendValueInput('VALUE')
        .setCheck('Boolean')
        .appendField('📝 ' + (Blockly.Msg.BLOCKS_JSON_SET || 'JSON Set'))
        .appendField(new Blockly.FieldTextInput('key'), 'KEY')
        .appendField('=');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour('#8BC34A');
    this.setTooltip(Blockly.Msg.BLOCKS_JSON_SETBOOLTOOLTIP || 'Set boolean value in JSON');
  }
};

javascriptGenerator.forBlock['json_set_bool'] = function(block: Blockly.Block) {
  const key = block.getFieldValue('KEY');
  const value = javascriptGenerator.valueToCode(block, 'VALUE', Order.ATOMIC) || 'false';

  return `  _jsonOutDoc["${key}"] = ${value};\n`;
};

/**
 * json_to_string - JSONを文字列に変換
 */
Blockly.Blocks['json_to_string'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('📝 ' + (Blockly.Msg.BLOCKS_JSON_TOSTRING || 'JSON to String'));
    this.setOutput(true, 'String');
    this.setColour('#8BC34A');
    this.setTooltip(Blockly.Msg.BLOCKS_JSON_TOSTRINGTOOLTIP || 'Convert JSON object to string');
  }
};

javascriptGenerator.forBlock['json_to_string'] = function() {
  generator.definitions_['json_serialize_func'] = `
String jsonSerialize() {
  String output;
  serializeJson(_jsonOutDoc, output);
  return output;
}`;

  return ['jsonSerialize()', Order.FUNCTION_CALL];
};

/**
 * json_to_string_pretty - JSONを整形された文字列に変換
 */
Blockly.Blocks['json_to_string_pretty'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('📝 ' + (Blockly.Msg.BLOCKS_JSON_TOSTRINGPRETTY || 'JSON to Formatted String'));
    this.setOutput(true, 'String');
    this.setColour('#8BC34A');
    this.setTooltip(Blockly.Msg.BLOCKS_JSON_TOSTRINGPRETTYTOOLTIP || 'Convert JSON object to formatted string');
  }
};

javascriptGenerator.forBlock['json_to_string_pretty'] = function() {
  generator.definitions_['json_serialize_pretty_func'] = `
String jsonSerializePretty() {
  String output;
  serializeJsonPretty(_jsonOutDoc, output);
  return output;
}`;

  return ['jsonSerializePretty()', Order.FUNCTION_CALL];
};

// ===== 簡易JSON生成 =====

/**
 * json_simple - 簡易JSONオブジェクト生成
 */
Blockly.Blocks['json_simple'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('📝 ' + (Blockly.Msg.BLOCKS_JSON_SIMPLE || 'Simple JSON Create'));
    this.appendValueInput('KEY1')
        .setCheck('String')
        .appendField(Blockly.Msg.BLOCKS_JSON_KEY1 || 'Key1');
    this.appendValueInput('VALUE1')
        .setCheck(['String', 'Number', 'Boolean'])
        .appendField(Blockly.Msg.BLOCKS_JSON_VALUE1 || 'Value1');
    this.appendValueInput('KEY2')
        .setCheck('String')
        .appendField(Blockly.Msg.BLOCKS_JSON_KEY2 || 'Key2');
    this.appendValueInput('VALUE2')
        .setCheck(['String', 'Number', 'Boolean'])
        .appendField(Blockly.Msg.BLOCKS_JSON_VALUE2 || 'Value2');
    this.setOutput(true, 'String');
    this.setColour('#8BC34A');
    this.setTooltip(Blockly.Msg.BLOCKS_JSON_SIMPLETOOLTIP || 'Generate JSON from two key-value pairs');
  }
};

javascriptGenerator.forBlock['json_simple'] = function(block: Blockly.Block) {
  const key1 = javascriptGenerator.valueToCode(block, 'KEY1', Order.ATOMIC) || '"key1"';
  const value1 = javascriptGenerator.valueToCode(block, 'VALUE1', Order.ATOMIC) || '""';
  const key2 = javascriptGenerator.valueToCode(block, 'KEY2', Order.ATOMIC) || '"key2"';
  const value2 = javascriptGenerator.valueToCode(block, 'VALUE2', Order.ATOMIC) || '""';

  generator.definitions_['include_arduinojson'] = '#include <ArduinoJson.h>';

  // post-Phase 4-4 commit 10 fix (case_0367, v2):
  // 旧実装は 2 overload (String,String,String,String) と (String,float,String,float)
  // を提供。VALUE1/VALUE2 setCheck は ['String','Number','Boolean'] 混在許容
  // のため、`jsonSimple("", "", "", 0)` のような mixed-type 呼出が発生し、
  // 4 番目の int → String 変換が `String(const char*)` と
  // `String(const __FlashStringHelper*)` の両 candidate で ambiguous。
  //
  // v1 試行: helper を template (typename V1, V2) 1 個に集約 → Arduino/PIO
  // auto-prototype が `template` clause を hoist せず、自動生成した forward
  // declaration の中で V1/V2 が undeclared になり別エラーで fail
  // (`'V1' has not been declared`)。Arduino preprocessor の構造的制約。
  //
  // v2 採用: helper は all-String 単一 overload に簡素化、call site で
  // `String(${valueN})` wrap で int/float/bool を実体的に String 化して
  // 一意 dispatch。trade-off: JSON 出力は string typed values (`"k1":"42"`)
  // だが、本 block は "simple JSON" 用途で型保持より「ambiguity 不在 +
  // mixed-type 入力受容」を優先。型保持が必要な場合は別 block (json_create
  // _object + 型別 json_add_*) を使う設計。
  //
  // emits: include_arduinojson + json_simple_func (single overload) /
  // requires: nothing extra (Arduino String 標準 ctor は int/float/bool 受領).
  generator.definitions_['json_simple_func'] = `
String jsonSimple(const String& k1, const String& v1, const String& k2, const String& v2) {
  StaticJsonDocument<256> doc;
  doc[k1] = v1;
  doc[k2] = v2;
  String output;
  serializeJson(doc, output);
  return output;
}`;

  return [`jsonSimple(${key1}, String(${value1}), ${key2}, String(${value2}))`, Order.FUNCTION_CALL];
};

console.log('JSON blocks loaded');
