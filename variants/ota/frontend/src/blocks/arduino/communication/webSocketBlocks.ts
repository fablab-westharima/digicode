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
  // wsSetupCallbacks() is a function call statement; previously placed in
  // `definitions_` (file scope) caused "expected constructor, destructor, or
  // type conversion before ';' token" (Round 1 cluster #4 RCA, 4 failures).
  // Move to `setups_` so it runs inside setup().
  if (!generator.setups_) generator.setups_ = {};
  generator.setups_['ws_setup_call'] = '  wsSetupCallbacks();';
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

// Audit 2 follow-up (2026-05-03): bleLoopTick mirror for WebSocket. Auto-
// register the message-check via static initializer, return a unified
// `wsLoopTick();` so misplacement (top-level / setup-only) does not strand
// the call. Same defensive design as ble_uart_on_receive / ble_on_write.
const WS_LOOP_TICK_GLOBALS = `
#include <vector>
typedef void (*WsLoopHandler)();
std::vector<WsLoopHandler>& _wsLoopHandlers() {
  static std::vector<WsLoopHandler> v;
  return v;
}
struct _WsLoopRegister {
  _WsLoopRegister(WsLoopHandler h) { _wsLoopHandlers().push_back(h); }
};
void wsLoopTick() {
  for (auto h : _wsLoopHandlers()) h();
}`;

generator.forBlock['websocket_on_message'] = function(block: Blockly.Block) {
  const handler = javascriptGenerator.statementToCode(block, 'HANDLER');
  generator.definitions_['include_ws'] = WS_INCLUDE;
  generator.definitions_['ws_loop_tick_globals'] = WS_LOOP_TICK_GLOBALS;
  generator.definitions_['ws_msg_check_func'] = `
void wsCheckMessage() {
  wsClient.poll();
  if (wsMessage.length() > 0) {
    String _msg = wsMessage;
    wsMessage = "";
${handler}  }
}
static _WsLoopRegister _reg_wsCheckMessage(wsCheckMessage);`;
  // Post-U5 cleanup (2026-05-03): tick injected into loop() once via
  // loopPre_ (mirror of bleLoopTick approach). Multiple websocket_on_message
  // blocks no longer emit redundant `wsLoopTick();` lines in loop body.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const gen = generator as any;
  if (!gen.loopPre_) gen.loopPre_ = {};
  gen.loopPre_['ws_loop_tick'] = '  wsLoopTick();';
  return '';
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

// =================================================================
// Phase 2 commit #0 (47.md §5.3, 2026-05-04 起案 / 2026-05-XX 着手):
// 7 NEW WebSocket SERVER blocks for AI auto-generated WiFi controller UI.
//
//   websocket_server_start          ESP32 = HTTP+WS dual-port server
//   websocket_server_register   ★   schema source for inferWifiUiSchema (commit #3)
//   websocket_server_on_message     dispatch on WRITE per channel
//   websocket_server_send           broadcast as JSON envelope
//   websocket_server_on_connect     callback on new client
//   websocket_server_client_count   live count
//   websocket_server_received_value HANDLER-internal value getter
//
// Wire format: JSON envelope `{ "id": "<channelId>", "value": "<asString>" }`,
// ASCII string for value (matches BLE convention).
//
// Existing 5 client blocks above are unchanged. Server uses separate
// infrastructure (`_WsServerHandlerRegister`, `wsServerLoopTick()`, dedicated
// `wsServer` + `wsClients` vector + `WebServer http(80)`) so client and server
// can co-exist in the same program.
//
// Commit #0 emits a placeholder `controller_bundle_gz[] = {0}` and a minimal
// `schema_json` (devices=[]). Commit #2 will replace these with the gzipped
// vanilla HTML/JS controller bundle and the per-project schema generated from
// websocket_server_register blocks (47.md §5.5 / §5.6).
//
// i18n: shares BLE dataType / read / write / notify / label / min / max /
// value / handler keys (`BLOCKS_BLE_*`) — identical canonical JA strings, no
// duplicate translation work. WS server-specific labels (start / register /
// onMessage / send / onConnect / clientCount / receivedValue + tooltips +
// channelId) are new under `blocks.ws.server.*` namespace.
// =================================================================

const WS_SERVER_INCLUDE = `
#include <WiFi.h>
#include <WebServer.h>
#include <ArduinoWebsockets.h>
#include <ArduinoJson.h>
#include <vector>`;

const WS_SERVER_GLOBALS = `
WebServer http(80);
WebsocketsServer wsServer;
std::vector<WebsocketsClient> wsClients;
String wsServerMessage = "";
String wsServerCurrentChannel = "";

typedef void (*WsServerHandler)();
struct _WsServerHandlerEntry { String channelId; WsServerHandler fn; };
std::vector<_WsServerHandlerEntry>& _wsServerHandlers() {
  static std::vector<_WsServerHandlerEntry> v;
  return v;
}
struct _WsServerHandlerRegister {
  _WsServerHandlerRegister(const String& id, WsServerHandler h) {
    _wsServerHandlers().push_back({id, h});
  }
};
std::vector<WsServerHandler>& _wsServerOnConnectHandlers() {
  static std::vector<WsServerHandler> v;
  return v;
}
struct _WsServerOnConnectRegister {
  _WsServerOnConnectRegister(WsServerHandler h) {
    _wsServerOnConnectHandlers().push_back(h);
  }
};

void wsServerLoopTick() {
  if (wsServer.poll()) {
    WebsocketsClient client = wsServer.accept();
    client.onMessage([](WebsocketsMessage msg) {
      StaticJsonDocument<256> _wsDoc;
      DeserializationError _wsErr = deserializeJson(_wsDoc, msg.data());
      if (_wsErr) return;
      const char* _wsId  = _wsDoc["id"]    | "";
      const char* _wsVal = _wsDoc["value"] | "";
      if (_wsId[0] == '\\0') return;
      wsServerCurrentChannel = String(_wsId);
      wsServerMessage = String(_wsVal);
      for (auto& entry : _wsServerHandlers()) {
        if (entry.channelId == wsServerCurrentChannel) entry.fn();
      }
      wsServerCurrentChannel = "";
      wsServerMessage = "";
    });
    wsClients.push_back(client);
    for (auto& h : _wsServerOnConnectHandlers()) h();
  }
  for (auto it = wsClients.begin(); it != wsClients.end();) {
    if (!it->available()) { it = wsClients.erase(it); continue; }
    it->poll();
    ++it;
  }
  http.handleClient();
}`;

const WS_SERVER_BROADCAST_HELPER = `
void wsServerBroadcast(const String& msg) {
  for (auto& c : wsClients) if (c.available()) c.send(msg);
}`;

const WS_SERVER_BUNDLE_PLACEHOLDER = `
// Phase 2 commit #0 placeholder. The real gzipped controller HTML+JS bundle
// + project-specific schema JSON will be injected by commit #2 (47.md §5.5).
const uint8_t controller_bundle_gz[] PROGMEM = {0};
const size_t controller_bundle_gz_len = 0;
const char schema_json[] PROGMEM = R"DIGI({"connection":"wifi","version":"1.0","devices":[]})DIGI";

void serveBundle() {
  http.sendHeader("Content-Encoding", "gzip");
  http.send_P(200, "text/html", (const char*)controller_bundle_gz, controller_bundle_gz_len);
}
void serveSchema() {
  http.send_P(200, "application/json", schema_json);
}`;

/**
 * websocket_server_start - ESP32 を HTTP+WS dual-port サーバーとして起動。
 * setup の中で WiFi 接続後に置く前提。port = 81 (WS default、HTTP は 80 固定)。
 */
Blockly.Blocks['websocket_server_start'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🛰️ ' + (Blockly.Msg.BLOCKS_WS_SERVER_START || 'WebSocket Server Start'))
        .appendField(Blockly.Msg.BLOCKS_WS_PORT || 'port')
        .appendField(new Blockly.FieldNumber(81, 1, 65535), 'PORT')
        .appendField(Blockly.Msg.BLOCKS_WS_PATH || 'path')
        .appendField(new Blockly.FieldTextInput('/'), 'PATH');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(WS_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_WS_SERVER_STARTTOOLTIP || 'Start ESP32 as a WebSocket server. HTTP serves the controller HTML, WS handles channel traffic. Place in setup after WiFi is connected.');
  }
};

generator.forBlock['websocket_server_start'] = function(block: Blockly.Block) {
  const port = block.getFieldValue('PORT');
  // PATH currently captured for future WS path routing (commit #2). Default
  // HTTP routes are "/" (bundle) and "/schema.json" (schema), the WS endpoint
  // listens at the given port with default path.
  generator.definitions_['ws_server_include'] = WS_SERVER_INCLUDE;
  generator.definitions_['ws_server_globals'] = WS_SERVER_GLOBALS;
  generator.definitions_['ws_server_bundle_placeholder'] = WS_SERVER_BUNDLE_PLACEHOLDER;
  // wsServerLoopTick() injected once via loopPre_ (post-U5 cleanup pattern,
  // rules/digicode/03-block-workflow.md Loop-side dedupe). Placement of
  // ws_server_start (must be in setup) is independent of the tick injection.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const gen = generator as any;
  if (!gen.loopPre_) gen.loopPre_ = {};
  gen.loopPre_['ws_server_loop_tick'] = '  wsServerLoopTick();';
  return `  http.on("/", serveBundle);\n  http.on("/schema.json", serveSchema);\n  http.begin();\n  wsServer.listen(${port});\n`;
};

/**
 * websocket_server_register ★ Phase 2 中核ブロック。
 * channel の metadata (id/label/dataType/min/max/R-W-N) を宣言。
 * commit #3 の inferWifiUiSchema パーサーが workspace XML を walk してこの block の
 * field 値からコントローラ UI widget 種別を自動推論する。
 *
 * cpp runtime には影響しない (return はコメント 1 行のみ)。
 *
 * i18n: dataType / read / write / notify / label / min / max は BLE と完全同 7 値、
 * BLOCKS_BLE_* キーを共有 (5 lang 翻訳 dedup、2026-05-XX user 確認 Q2)。
 */
Blockly.Blocks['websocket_server_register'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🛰️ ' + (Blockly.Msg.BLOCKS_WS_SERVER_REGISTER || 'WebSocket Register Channel'))
        .appendField(Blockly.Msg.BLOCKS_WS_SERVER_CHANNELID || 'channel')
        .appendField(new Blockly.FieldTextInput('channel1'), 'CHANNEL_ID');
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_BLE_LABEL || 'label')
        .appendField(new Blockly.FieldTextInput('Channel'), 'LABEL');
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_BLE_DATATYPE || 'type')
        .appendField(new Blockly.FieldDropdown([
          [Blockly.Msg.BLOCKS_BLE_DATATYPESTRING || 'string (text)', 'string'],
          [Blockly.Msg.BLOCKS_BLE_DATATYPEBOOL || 'bool (true/false)', 'bool'],
          [Blockly.Msg.BLOCKS_BLE_DATATYPEUINT8 || 'uint8 (0-255)', 'uint8'],
          [Blockly.Msg.BLOCKS_BLE_DATATYPEUINT16 || 'uint16 (0-65535)', 'uint16'],
          [Blockly.Msg.BLOCKS_BLE_DATATYPEINT8 || 'int8 (-128 to 127)', 'int8'],
          [Blockly.Msg.BLOCKS_BLE_DATATYPEINT16 || 'int16 (-32768 to 32767)', 'int16'],
          [Blockly.Msg.BLOCKS_BLE_DATATYPEFLOAT || 'float', 'float']
        ]), 'DATA_TYPE')
        .appendField(Blockly.Msg.BLOCKS_BLE_MIN || 'min')
        .appendField(new Blockly.FieldNumber(0), 'MIN')
        .appendField(Blockly.Msg.BLOCKS_BLE_MAX || 'max')
        .appendField(new Blockly.FieldNumber(100), 'MAX');
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_BLE_PROPREAD || 'read')
        .appendField(new Blockly.FieldCheckbox('TRUE'), 'READ')
        .appendField(Blockly.Msg.BLOCKS_BLE_PROPWRITE || 'write')
        .appendField(new Blockly.FieldCheckbox('TRUE'), 'WRITE')
        .appendField(Blockly.Msg.BLOCKS_BLE_PROPNOTIFY || 'notify')
        .appendField(new Blockly.FieldCheckbox('FALSE'), 'NOTIFY');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(WS_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_WS_SERVER_REGISTERTOOLTIP || 'Declare a channel for the controller UI. The widget type is inferred from id/label/data type/min-max/read-write-notify. Place in setup.');
  }
};

generator.forBlock['websocket_server_register'] = function(block: Blockly.Block) {
  const channelId = block.getFieldValue('CHANNEL_ID');
  // No cpp runtime impact — schema metadata is consumed by inferWifiUiSchema
  // (commit #3) to drive controller widget rendering. Comment line keeps the
  // user's setup() block readable when generated cpp is inspected.
  return `  // ws_server_register channel="${channelId}"\n`;
};

/**
 * websocket_server_on_message - 指定 channel への WRITE 受信時 callback。
 * HANDLER 内では「WebSocket 受信値」block で受信値を取得可能。
 * placement-independent (loop / setup どこでも、loopPre_ 経由 tick auto-inject)。
 */
Blockly.Blocks['websocket_server_on_message'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🛰️ ' + (Blockly.Msg.BLOCKS_WS_SERVER_ONMESSAGE || 'WebSocket On Channel Message'))
        .appendField(Blockly.Msg.BLOCKS_WS_SERVER_CHANNELID || 'channel')
        .appendField(new Blockly.FieldTextInput('channel1'), 'CHANNEL_ID');
    this.appendStatementInput('HANDLER')
        .setCheck(null)
        .appendField(Blockly.Msg.BLOCKS_WS_HANDLER || 'handler');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(WS_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_WS_SERVER_ONMESSAGETOOLTIP || 'Run the handler when a write to the given channel is received. Use "WebSocket Received" inside HANDLER to read the value. Placement-independent.');
  }
};

generator.forBlock['websocket_server_on_message'] = function(block: Blockly.Block) {
  const channelId = block.getFieldValue('CHANNEL_ID');
  const handler = javascriptGenerator.statementToCode(block, 'HANDLER');
  generator.definitions_['ws_server_include'] = WS_SERVER_INCLUDE;
  generator.definitions_['ws_server_globals'] = WS_SERVER_GLOBALS;
  // Static-init self-register (mirror of ble_on_write `_BleLoopRegister`
  // pattern, post-U5 cleanup). Each on_message block emits its own
  // wsServerHandle_<safeId>() and registers it into _wsServerHandlers; the
  // single wsServerLoopTick() walks them in registration order on every
  // matching dispatch (channel match guarded inside the handler).
  const safeChannelId = channelId.replace(/[^a-zA-Z0-9]/g, '_');
  const funcKey = `ws_server_on_message_${safeChannelId}`;
  generator.definitions_[funcKey] = `
void wsServerHandle_${safeChannelId}() {
  if (wsServerCurrentChannel != "${channelId}") return;
${handler}}
static _WsServerHandlerRegister _reg_wsServerHandle_${safeChannelId}("${channelId}", wsServerHandle_${safeChannelId});`;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const gen = generator as any;
  if (!gen.loopPre_) gen.loopPre_ = {};
  gen.loopPre_['ws_server_loop_tick'] = '  wsServerLoopTick();';
  return '';
};

/**
 * websocket_server_send - 指定 channel の値を全 client に JSON envelope で broadcast。
 */
Blockly.Blocks['websocket_server_send'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🛰️ ' + (Blockly.Msg.BLOCKS_WS_SERVER_SEND || 'WebSocket Channel Send'))
        .appendField(Blockly.Msg.BLOCKS_WS_SERVER_CHANNELID || 'channel')
        .appendField(new Blockly.FieldTextInput('channel1'), 'CHANNEL_ID');
    this.appendValueInput('VALUE')
        .setCheck(null)
        .appendField(Blockly.Msg.BLOCKS_BLE_VALUE || 'value');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(WS_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_WS_SERVER_SENDTOOLTIP || 'Broadcast the value on the given channel to every connected controller as a JSON envelope.');
  }
};

generator.forBlock['websocket_server_send'] = function(block: Blockly.Block) {
  const channelId = block.getFieldValue('CHANNEL_ID');
  const value = javascriptGenerator.valueToCode(block, 'VALUE', 0) || '""';
  generator.definitions_['ws_server_include'] = WS_SERVER_INCLUDE;
  generator.definitions_['ws_server_globals'] = WS_SERVER_GLOBALS;
  generator.definitions_['ws_server_broadcast_helper'] = WS_SERVER_BROADCAST_HELPER;
  return `  {
    String _wsV = String(${value});
    StaticJsonDocument<128> _wsOutDoc;
    _wsOutDoc["id"] = "${channelId}";
    _wsOutDoc["value"] = _wsV;
    String _wsOutMsg;
    serializeJson(_wsOutDoc, _wsOutMsg);
    wsServerBroadcast(_wsOutMsg);
  }
`;
};

/**
 * websocket_server_on_connect - 新 client 接続時の callback。
 * placement-independent (handler は static-init register、tick 経由 dispatch)。
 */
Blockly.Blocks['websocket_server_on_connect'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🛰️ ' + (Blockly.Msg.BLOCKS_WS_SERVER_ONCONNECT || 'WebSocket On Client Connect'));
    this.appendStatementInput('HANDLER')
        .setCheck(null)
        .appendField(Blockly.Msg.BLOCKS_WS_HANDLER || 'handler');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(WS_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_WS_SERVER_ONCONNECTTOOLTIP || 'Run the handler when a new controller connects. E.g. broadcast the current state right after connection.');
  }
};

generator.forBlock['websocket_server_on_connect'] = function(block: Blockly.Block) {
  const handler = javascriptGenerator.statementToCode(block, 'HANDLER');
  generator.definitions_['ws_server_include'] = WS_SERVER_INCLUDE;
  generator.definitions_['ws_server_globals'] = WS_SERVER_GLOBALS;
  // Use Blockly block id for uniqueness so multiple on_connect blocks each
  // register a distinct handler function (cf. on_message which derives the
  // suffix from CHANNEL_ID — on_connect has no channel field).
  const blockUid = block.id.replace(/[^a-zA-Z0-9]/g, '_');
  const funcKey = `ws_server_on_connect_${blockUid}`;
  generator.definitions_[funcKey] = `
void wsServerOnConnect_${blockUid}() {
${handler}}
static _WsServerOnConnectRegister _reg_wsServerOnConnect_${blockUid}(wsServerOnConnect_${blockUid});`;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const gen = generator as any;
  if (!gen.loopPre_) gen.loopPre_ = {};
  gen.loopPre_['ws_server_loop_tick'] = '  wsServerLoopTick();';
  return '';
};

/**
 * websocket_server_client_count - 現在接続中のコントローラ数を返す Number value block。
 */
Blockly.Blocks['websocket_server_client_count'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🛰️ ' + (Blockly.Msg.BLOCKS_WS_SERVER_CLIENTCOUNT || 'WebSocket Client Count'));
    this.setOutput(true, 'Number');
    this.setColour(WS_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_WS_SERVER_CLIENTCOUNTTOOLTIP || 'Returns the number of currently-connected controllers.');
  }
};

generator.forBlock['websocket_server_client_count'] = function() {
  generator.definitions_['ws_server_include'] = WS_SERVER_INCLUDE;
  generator.definitions_['ws_server_globals'] = WS_SERVER_GLOBALS;
  return ['(int)wsClients.size()', 0];
};

/**
 * websocket_server_received_value - WebSocket on-message HANDLER 内で受信値を取得する
 * String value block (BLE の ble_received_value 同 pattern、BUG-053 の教訓を初手から反映)。
 */
Blockly.Blocks['websocket_server_received_value'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🛰️ ' + (Blockly.Msg.BLOCKS_WS_SERVER_RECEIVEDVALUE || 'WebSocket Received'));
    this.setOutput(true, 'String');
    this.setColour(WS_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_WS_SERVER_RECEIVEDVALUETOOLTIP || 'Inside a WebSocket on-message handler, returns the last received value as a string. Returns empty string outside the handler.');
  }
};

generator.forBlock['websocket_server_received_value'] = function() {
  generator.definitions_['ws_server_include'] = WS_SERVER_INCLUDE;
  generator.definitions_['ws_server_globals'] = WS_SERVER_GLOBALS;
  return ['wsServerMessage', 0];
};

console.log('WebSocket blocks loaded');
