/**
 * HTTPリクエストブロック - REST API連携用
 * HTTPClientライブラリを使用
 *
 * i18n: Uses Blockly.Msg.* for dynamic language switching
 */
import * as Blockly from 'blockly';
import { javascriptGenerator, Order } from 'blockly/javascript';

// 型アサーション用のヘルパー
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const generator = javascriptGenerator as any;

// ===== HTTP GET =====

/**
 * http_get - HTTP GETリクエスト
 */
Blockly.Blocks['http_get'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🌐 ' + (Blockly.Msg.BLOCKS_HTTP_GET || 'HTTP GET'));
    this.appendValueInput('URL')
        .setCheck('String')
        .appendField('URL');
    this.setOutput(true, 'String');
    this.setColour('#2196F3');
    this.setTooltip(Blockly.Msg.BLOCKS_HTTP_GETTOOLTIP || 'Send a GET request to the specified URL and get the response');
  }
};

javascriptGenerator.forBlock['http_get'] = function(block: Blockly.Block) {
  const url = javascriptGenerator.valueToCode(block, 'URL', Order.ATOMIC) || '""';

  generator.definitions_['include_httpclient'] = '#include <HTTPClient.h>';
  generator.definitions_['include_wifi'] = '#include <WiFi.h>';

  generator.definitions_['http_get_func'] = `
String httpGet(String url) {
  HTTPClient http;
  String result = "";
  http.begin(url);
  int httpCode = http.GET();
  if (httpCode > 0) {
    result = http.getString();
  } else {
    Serial.print("HTTP GET failed: ");
    Serial.println(http.errorToString(httpCode));
  }
  http.end();
  return result;
}`;

  return [`httpGet(${url})`, Order.FUNCTION_CALL];
};

/**
 * http_get_with_headers - ヘッダー付きHTTP GETリクエスト
 */
Blockly.Blocks['http_get_with_headers'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🌐 ' + (Blockly.Msg.BLOCKS_HTTP_GETWITHHEADERS || 'HTTP GET with Headers'));
    this.appendValueInput('URL')
        .setCheck('String')
        .appendField('URL');
    this.appendValueInput('HEADER_NAME')
        .setCheck('String')
        .appendField(Blockly.Msg.BLOCKS_HTTP_HEADERNAME || 'Header Name');
    this.appendValueInput('HEADER_VALUE')
        .setCheck('String')
        .appendField(Blockly.Msg.BLOCKS_HTTP_HEADERVALUE || 'Header Value');
    this.setOutput(true, 'String');
    this.setColour('#2196F3');
    this.setTooltip(Blockly.Msg.BLOCKS_HTTP_GETWITHHEADERSTOOLTIP || 'Send GET request with custom header (for API Key auth, etc.)');
  }
};

javascriptGenerator.forBlock['http_get_with_headers'] = function(block: Blockly.Block) {
  const url = javascriptGenerator.valueToCode(block, 'URL', Order.ATOMIC) || '""';
  const headerName = javascriptGenerator.valueToCode(block, 'HEADER_NAME', Order.ATOMIC) || '""';
  const headerValue = javascriptGenerator.valueToCode(block, 'HEADER_VALUE', Order.ATOMIC) || '""';

  generator.definitions_['include_httpclient'] = '#include <HTTPClient.h>';
  generator.definitions_['include_wifi'] = '#include <WiFi.h>';

  generator.definitions_['http_get_header_func'] = `
String httpGetWithHeader(String url, String headerName, String headerValue) {
  HTTPClient http;
  String result = "";
  http.begin(url);
  http.addHeader(headerName, headerValue);
  int httpCode = http.GET();
  if (httpCode > 0) {
    result = http.getString();
  } else {
    Serial.print("HTTP GET failed: ");
    Serial.println(http.errorToString(httpCode));
  }
  http.end();
  return result;
}`;

  return [`httpGetWithHeader(${url}, ${headerName}, ${headerValue})`, Order.FUNCTION_CALL];
};

// ===== HTTP POST =====

/**
 * http_post - HTTP POSTリクエスト
 */
Blockly.Blocks['http_post'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('📤 ' + (Blockly.Msg.BLOCKS_HTTP_POST || 'HTTP POST'));
    this.appendValueInput('URL')
        .setCheck('String')
        .appendField('URL');
    this.appendValueInput('BODY')
        .setCheck('String')
        .appendField(Blockly.Msg.BLOCKS_HTTP_BODY || 'Body');
    this.appendDummyInput()
        .appendField('Content-Type')
        .appendField(new Blockly.FieldDropdown([
          ['application/json', 'application/json'],
          ['application/x-www-form-urlencoded', 'application/x-www-form-urlencoded'],
          ['text/plain', 'text/plain']
        ]), 'CONTENT_TYPE');
    this.setOutput(true, 'String');
    this.setColour('#4CAF50');
    this.setTooltip(Blockly.Msg.BLOCKS_HTTP_POSTTOOLTIP || 'Send POST request to the specified URL and get response');
  }
};

javascriptGenerator.forBlock['http_post'] = function(block: Blockly.Block) {
  const url = javascriptGenerator.valueToCode(block, 'URL', Order.ATOMIC) || '""';
  const body = javascriptGenerator.valueToCode(block, 'BODY', Order.ATOMIC) || '""';
  const contentType = block.getFieldValue('CONTENT_TYPE');

  generator.definitions_['include_httpclient'] = '#include <HTTPClient.h>';
  generator.definitions_['include_wifi'] = '#include <WiFi.h>';

  generator.definitions_['http_post_func'] = `
String httpPost(String url, String body, String contentType) {
  HTTPClient http;
  String result = "";
  http.begin(url);
  http.addHeader("Content-Type", contentType);
  int httpCode = http.POST(body);
  if (httpCode > 0) {
    result = http.getString();
  } else {
    Serial.print("HTTP POST failed: ");
    Serial.println(http.errorToString(httpCode));
  }
  http.end();
  return result;
}`;

  return [`httpPost(${url}, ${body}, "${contentType}")`, Order.FUNCTION_CALL];
};

/**
 * http_post_json - JSON POSTリクエスト（簡易版）
 */
Blockly.Blocks['http_post_json'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('📤 ' + (Blockly.Msg.BLOCKS_HTTP_POSTJSON || 'HTTP POST JSON'));
    this.appendValueInput('URL')
        .setCheck('String')
        .appendField('URL');
    this.appendValueInput('JSON')
        .setCheck('String')
        .appendField('JSON');
    this.setOutput(true, 'String');
    this.setColour('#4CAF50');
    this.setTooltip(Blockly.Msg.BLOCKS_HTTP_POSTJSONTOOLTIP || 'POST JSON data');
  }
};

javascriptGenerator.forBlock['http_post_json'] = function(block: Blockly.Block) {
  const url = javascriptGenerator.valueToCode(block, 'URL', Order.ATOMIC) || '""';
  const json = javascriptGenerator.valueToCode(block, 'JSON', Order.ATOMIC) || '"{}"';

  generator.definitions_['include_httpclient'] = '#include <HTTPClient.h>';
  generator.definitions_['include_wifi'] = '#include <WiFi.h>';

  generator.definitions_['http_post_func'] = `
String httpPost(String url, String body, String contentType) {
  HTTPClient http;
  String result = "";
  http.begin(url);
  http.addHeader("Content-Type", contentType);
  int httpCode = http.POST(body);
  if (httpCode > 0) {
    result = http.getString();
  } else {
    Serial.print("HTTP POST failed: ");
    Serial.println(http.errorToString(httpCode));
  }
  http.end();
  return result;
}`;

  return [`httpPost(${url}, ${json}, "application/json")`, Order.FUNCTION_CALL];
};

// ===== HTTP PUT / DELETE =====

/**
 * http_put - HTTP PUTリクエスト
 */
Blockly.Blocks['http_put'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('📝 ' + (Blockly.Msg.BLOCKS_HTTP_PUT || 'HTTP PUT'));
    this.appendValueInput('URL')
        .setCheck('String')
        .appendField('URL');
    this.appendValueInput('BODY')
        .setCheck('String')
        .appendField(Blockly.Msg.BLOCKS_HTTP_BODY || 'Body');
    this.setOutput(true, 'String');
    this.setColour('#FF9800');
    this.setTooltip(Blockly.Msg.BLOCKS_HTTP_PUTTOOLTIP || 'Send PUT request to the specified URL');
  }
};

javascriptGenerator.forBlock['http_put'] = function(block: Blockly.Block) {
  const url = javascriptGenerator.valueToCode(block, 'URL', Order.ATOMIC) || '""';
  const body = javascriptGenerator.valueToCode(block, 'BODY', Order.ATOMIC) || '""';

  generator.definitions_['include_httpclient'] = '#include <HTTPClient.h>';
  generator.definitions_['include_wifi'] = '#include <WiFi.h>';

  generator.definitions_['http_put_func'] = `
String httpPut(String url, String body) {
  HTTPClient http;
  String result = "";
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  int httpCode = http.PUT(body);
  if (httpCode > 0) {
    result = http.getString();
  } else {
    Serial.print("HTTP PUT failed: ");
    Serial.println(http.errorToString(httpCode));
  }
  http.end();
  return result;
}`;

  return [`httpPut(${url}, ${body})`, Order.FUNCTION_CALL];
};

/**
 * http_delete - HTTP DELETEリクエスト
 */
Blockly.Blocks['http_delete'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🗑️ ' + (Blockly.Msg.BLOCKS_HTTP_DELETE || 'HTTP DELETE'));
    this.appendValueInput('URL')
        .setCheck('String')
        .appendField('URL');
    this.setOutput(true, 'Number');
    this.setColour('#f44336');
    this.setTooltip(Blockly.Msg.BLOCKS_HTTP_DELETETOOLTIP || 'Send DELETE request to the specified URL (returns HTTP status code)');
  }
};

javascriptGenerator.forBlock['http_delete'] = function(block: Blockly.Block) {
  const url = javascriptGenerator.valueToCode(block, 'URL', Order.ATOMIC) || '""';

  generator.definitions_['include_httpclient'] = '#include <HTTPClient.h>';
  generator.definitions_['include_wifi'] = '#include <WiFi.h>';

  generator.definitions_['http_delete_func'] = `
int httpDelete(String url) {
  HTTPClient http;
  http.begin(url);
  int httpCode = http.sendRequest("DELETE");
  http.end();
  return httpCode;
}`;

  return [`httpDelete(${url})`, Order.FUNCTION_CALL];
};

// ===== HTTPステータス =====

/**
 * http_status_code - 最後のHTTPステータスコード
 */
Blockly.Blocks['http_last_status'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('📊 ' + (Blockly.Msg.BLOCKS_HTTP_LASTSTATUS || 'HTTP Last Status'));
    this.setOutput(true, 'Number');
    this.setColour('#607D8B');
    this.setTooltip(Blockly.Msg.BLOCKS_HTTP_LASTSTATUSTOOLTIP || 'Get the status code of the last HTTP request');
  }
};

javascriptGenerator.forBlock['http_last_status'] = function() {
  generator.definitions_['http_last_status_var'] = 'int _httpLastStatus = 0;';
  return ['_httpLastStatus', Order.ATOMIC];
};

/**
 * http_is_success - HTTPステータスが成功か判定
 */
Blockly.Blocks['http_is_success'] = {
  init: function() {
    this.appendValueInput('CODE')
        .setCheck('Number')
        .appendField(Blockly.Msg.BLOCKS_HTTP_STATUS || 'HTTP Status');
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_HTTP_ISSUCCESS || 'is Success (2xx)');
    this.setOutput(true, 'Boolean');
    this.setColour('#607D8B');
    this.setTooltip(Blockly.Msg.BLOCKS_HTTP_ISSUCCESSTOOLTIP || 'Check if HTTP status code is 2xx (success)');
  }
};

javascriptGenerator.forBlock['http_is_success'] = function(block: Blockly.Block) {
  const code = javascriptGenerator.valueToCode(block, 'CODE', Order.ATOMIC) || '0';
  return [`(${code} >= 200 && ${code} < 300)`, Order.LOGICAL_AND];
};

// ===== URL構築ヘルパー =====

/**
 * http_url_encode - URLエンコード
 */
Blockly.Blocks['http_url_encode'] = {
  init: function() {
    this.appendValueInput('TEXT')
        .setCheck('String')
        .appendField('🔗 ' + (Blockly.Msg.BLOCKS_HTTP_URLENCODE || 'URL Encode'));
    this.setOutput(true, 'String');
    this.setColour('#607D8B');
    this.setTooltip(Blockly.Msg.BLOCKS_HTTP_URLENCODETOOLTIP || 'URL encode a string');
  }
};

javascriptGenerator.forBlock['http_url_encode'] = function(block: Blockly.Block) {
  const text = javascriptGenerator.valueToCode(block, 'TEXT', Order.ATOMIC) || '""';

  generator.definitions_['url_encode_func'] = `
String urlEncode(String str) {
  String encoded = "";
  char c;
  char code0;
  char code1;
  for (int i = 0; i < str.length(); i++) {
    c = str.charAt(i);
    if (c == ' ') {
      encoded += '+';
    } else if (isalnum(c)) {
      encoded += c;
    } else {
      code0 = (c >> 4) & 0xF;
      code1 = c & 0xF;
      encoded += '%';
      encoded += "0123456789ABCDEF"[code0];
      encoded += "0123456789ABCDEF"[code1];
    }
  }
  return encoded;
}`;

  return [`urlEncode(${text})`, Order.FUNCTION_CALL];
};

/**
 * http_build_url - URLパラメータ付きURL構築
 */
Blockly.Blocks['http_build_url'] = {
  init: function() {
    this.appendValueInput('BASE_URL')
        .setCheck('String')
        .appendField('🔗 ' + (Blockly.Msg.BLOCKS_HTTP_BUILDURL || 'Build URL') + ' ' + (Blockly.Msg.BLOCKS_HTTP_BASEURL || 'Base'));
    this.appendValueInput('PARAM1_NAME')
        .setCheck('String')
        .appendField(Blockly.Msg.BLOCKS_HTTP_PARAM1NAME || 'Param1 Name');
    this.appendValueInput('PARAM1_VALUE')
        .setCheck(['String', 'Number'])
        .appendField(Blockly.Msg.BLOCKS_HTTP_VALUE || 'Value');
    this.setOutput(true, 'String');
    this.setColour('#607D8B');
    this.setTooltip(Blockly.Msg.BLOCKS_HTTP_BUILDURLTOOLTIP || 'Add query parameters to base URL');
  }
};

javascriptGenerator.forBlock['http_build_url'] = function(block: Blockly.Block) {
  const baseUrl = javascriptGenerator.valueToCode(block, 'BASE_URL', Order.ATOMIC) || '""';
  const param1Name = javascriptGenerator.valueToCode(block, 'PARAM1_NAME', Order.ATOMIC) || '""';
  const param1Value = javascriptGenerator.valueToCode(block, 'PARAM1_VALUE', Order.ATOMIC) || '""';

  generator.definitions_['url_encode_func'] = `
String urlEncode(String str) {
  String encoded = "";
  char c;
  char code0;
  char code1;
  for (int i = 0; i < str.length(); i++) {
    c = str.charAt(i);
    if (c == ' ') {
      encoded += '+';
    } else if (isalnum(c)) {
      encoded += c;
    } else {
      code0 = (c >> 4) & 0xF;
      code1 = c & 0xF;
      encoded += '%';
      encoded += "0123456789ABCDEF"[code0];
      encoded += "0123456789ABCDEF"[code1];
    }
  }
  return encoded;
}`;

  return [`(${baseUrl} + "?" + ${param1Name} + "=" + urlEncode(String(${param1Value})))`, Order.ADDITION];
};

console.log('HTTP blocks loaded');
