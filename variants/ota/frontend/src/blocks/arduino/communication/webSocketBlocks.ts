/**
 * WebSocket ブロック (BP6-1, 2026-04-20)
 *
 * ArduinoWebsockets ライブラリ使用（Gil Maimon）
 * WiFi 接続済みを前提とする（supportsWifi フィルタで非対応ボードは非表示）
 *
 * i18n: Blockly.Msg.* パターン（ルール33）
 */
import * as Blockly from 'blockly';
import { javascriptGenerator } from 'blockly/javascript';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const generator = javascriptGenerator as any;

if (!generator.definitions_) generator.definitions_ = {};

const WS_COLOR = '#00BCD4';

const WS_INCLUDE = `
#include <ArduinoWebsockets.h>
using namespace websockets;
WebsocketsClient wsClient;
bool wsConnected = false;
String wsMessage = "";`;

const WS_CALLBACKS = `
void wsSetupCallbacks() {
  wsClient.onMessage([](WebsocketsMessage msg) {
    wsMessage = msg.data();
  });
  wsClient.onEvent([](WebsocketsEvent event, String data) {
    if (event == WebsocketsEvent::ConnectionOpened) wsConnected = true;
    else if (event == WebsocketsEvent::ConnectionClosed) wsConnected = false;
  });
}`;

/**
 * websocket_connect - WebSocket サーバーに接続
 */
Blockly.Blocks['websocket_connect'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🔌 ' + (Blockly.Msg.BLOCKS_WS_CONNECT || 'WebSocket Connect'))
        .appendField(Blockly.Msg.BLOCKS_WS_HOST || 'host')
        .appendField(new Blockly.FieldTextInput('192.168.1.100'), 'HOST');
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_WS_PORT || 'port')
        .appendField(new Blockly.FieldNumber(8080, 1, 65535), 'PORT')
        .appendField(Blockly.Msg.BLOCKS_WS_PATH || 'path')
        .appendField(new Blockly.FieldTextInput('/'), 'PATH');
    this.setOutput(true, 'Boolean');
    this.setColour(WS_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_WS_CONNECTTOOLTIP || 'Connect to a WebSocket server. Returns true if successful. Requires WiFi connection.');
  }
};

generator.forBlock['websocket_connect'] = function(block: Blockly.Block) {
  const host = block.getFieldValue('HOST');
  const port = block.getFieldValue('PORT');
  const path = block.getFieldValue('PATH');
  generator.definitions_['include_ws'] = WS_INCLUDE;
  generator.definitions_['ws_callbacks'] = WS_CALLBACKS;
  generator.definitions_['ws_setup_call'] = 'wsSetupCallbacks();';
  return [`wsClient.connect("${host}", ${port}, "${path}")`, 0];
};

/**
 * websocket_send - テキスト送信
 */
Blockly.Blocks['websocket_send'] = {
  init: function() {
    this.appendValueInput('TEXT')
        .setCheck(null)
        .appendField('🔌 ' + (Blockly.Msg.BLOCKS_WS_SEND || 'WebSocket Send'));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(WS_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_WS_SENDTOOLTIP || 'Send a text message to the connected WebSocket server.');
  }
};

generator.forBlock['websocket_send'] = function(block: Blockly.Block) {
  const text = javascriptGenerator.valueToCode(block, 'TEXT', 0) || '""';
  generator.definitions_['include_ws'] = WS_INCLUDE;
  return `  if (wsConnected) { wsClient.send(String(${text})); }\n`;
};

/**
 * websocket_on_message - 受信コールバック（loop 内で呼ぶ）
 * wsMessage 変数で受信テキストを参照
 */
Blockly.Blocks['websocket_on_message'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🔌 ' + (Blockly.Msg.BLOCKS_WS_ONMESSAGE || 'WebSocket On Message'));
    this.appendStatementInput('HANDLER')
        .setCheck(null)
        .appendField(Blockly.Msg.BLOCKS_WS_HANDLER || 'handler');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(WS_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_WS_ONMESSAGETOOLTIP || 'Execute handler when a WebSocket message is received. Use wsMessage variable. Place in loop block.');
  }
};

generator.forBlock['websocket_on_message'] = function(block: Blockly.Block) {
  const handler = javascriptGenerator.statementToCode(block, 'HANDLER');
  generator.definitions_['include_ws'] = WS_INCLUDE;
  generator.definitions_['ws_msg_check_func'] = `
void wsCheckMessage() {
  wsClient.poll();
  if (wsMessage.length() > 0) {
    String _msg = wsMessage;
    wsMessage = "";
${handler}  }
}`;
  return `  wsCheckMessage();\n`;
};

/**
 * websocket_is_connected - 接続状態
 */
Blockly.Blocks['websocket_is_connected'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🔌 ' + (Blockly.Msg.BLOCKS_WS_ISCONNECTED || 'WebSocket Connected?'));
    this.setOutput(true, 'Boolean');
    this.setColour(WS_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_WS_ISCONNECTEDTOOLTIP || 'Returns true if currently connected to a WebSocket server.');
  }
};

generator.forBlock['websocket_is_connected'] = function() {
  generator.definitions_['include_ws'] = WS_INCLUDE;
  return ['wsConnected', 0];
};

/**
 * websocket_disconnect - 接続切断
 */
Blockly.Blocks['websocket_disconnect'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🔌 ' + (Blockly.Msg.BLOCKS_WS_DISCONNECT || 'WebSocket Disconnect'));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(WS_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_WS_DISCONNECTTOOLTIP || 'Close the WebSocket connection.');
  }
};

generator.forBlock['websocket_disconnect'] = function() {
  generator.definitions_['include_ws'] = WS_INCLUDE;
  return `  wsClient.close();\n`;
};

console.log('WebSocket blocks loaded');
