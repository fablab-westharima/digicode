/*
 * DigiCode - Block-based ESP32 Programming Tool
 * Copyright (C) 2024-2026 DigiCo LLC
 *
 * Licensed under the GNU Affero General Public License version 3 or later.
 * See LICENSE file in the repository root for full terms.
 */

/**
 * MQTT通信ブロック - Home Assistant連携用
 * PubSubClientライブラリを使用
 *
 * i18n: Uses Blockly.Msg.* for dynamic language switching
 */
import * as Blockly from 'blockly';
import { javascriptGenerator, Order } from 'blockly/javascript';

// 型アサーション用のヘルパー
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const generator = javascriptGenerator as any;

// ===== MQTT基盤ブロック（6個）=====

/**
 * 1. mqtt_setup - MQTT接続設定
 * WiFi接続とMQTTクライアントの初期設定
 */
Blockly.Blocks['mqtt_setup'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🏠 ' + (Blockly.Msg.BLOCKS_MQTT_SETUP || 'MQTT Setup'));
    this.appendDummyInput()
        .appendField('WiFi SSID')
        .appendField(new Blockly.FieldTextInput('your_ssid'), 'SSID');
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_WIFI_PASSWORD || 'WiFi Password')
        .appendField(new Blockly.FieldTextInput('your_password'), 'WIFI_PASS');
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_MQTT_BROKER || 'MQTT Broker')
        .appendField(new Blockly.FieldTextInput('192.168.1.100'), 'BROKER');
    this.appendValueInput('PORT')
        .appendField(Blockly.Msg.BLOCKS_MQTT_PORT || 'Port');
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_MQTT_CLIENTID || 'Client ID')
        .appendField(new Blockly.FieldTextInput('esp32_client'), 'CLIENT_ID');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour('#00BCD4');
    this.setTooltip(Blockly.Msg.BLOCKS_MQTT_SETUPTOOLTIP || 'Configure WiFi and MQTT broker connection');
  }
};

javascriptGenerator.forBlock['mqtt_setup'] = function(block: Blockly.Block) {
  const ssid = block.getFieldValue('SSID');
  const wifiPass = block.getFieldValue('WIFI_PASS');
  const broker = block.getFieldValue('BROKER');
  const port = generator.valueToCode(block, 'PORT', generator.ORDER_ATOMIC) || '1883';
  const clientId = block.getFieldValue('CLIENT_ID');

  // インクルードとグローバル変数
  generator.definitions_['include_wifi'] = '#include <WiFi.h>';
  generator.definitions_['include_pubsub'] = '#include <PubSubClient.h>';
  generator.definitions_['mqtt_wifi_client'] = 'WiFiClient espClient;';
  generator.definitions_['mqtt_client'] = 'PubSubClient mqttClient(espClient);';
  generator.definitions_['mqtt_ssid'] = `const char* mqtt_ssid = "${ssid}";`;
  generator.definitions_['mqtt_wifi_pass'] = `const char* mqtt_wifi_pass = "${wifiPass}";`;
  generator.definitions_['mqtt_broker'] = `const char* mqtt_broker = "${broker}";`;
  // Port is now emitted inside setup() so dynamic values (variables / BLE
  // strings) work; file-scope `const int` would break when ${port} is a
  // non-literal expression that has no static initializer.
  generator.definitions_['mqtt_client_id'] = `const char* mqtt_client_id = "${clientId}";`;

  // WiFi接続関数
  generator.definitions_['mqtt_wifi_connect_func'] = `
void mqttWifiConnect() {
  Serial.print("WiFi connecting to ");
  Serial.println(mqtt_ssid);
  WiFi.begin(mqtt_ssid, mqtt_wifi_pass);
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("");
    Serial.print("WiFi connected. IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("");
    Serial.println("WiFi connection failed!");
  }
}`;

  // post-Phase 4-4 commit 2-3 (case_0246/0254/0255/0794 fix): dependent blocks
  // reference identifiers that are otherwise only declared by sibling event/
  // configuration blocks:
  //   - mqtt_topic_value / mqtt_message_value → mqtt_topic / mqtt_message
  //     (String) — normally emitted by mqtt_on_message
  //   - mqtt_connect_with_lwt → mqtt_lwt_topic / mqtt_lwt_message /
  //     mqtt_lwt_qos / mqtt_lwt_retain (const) — normally emitted by
  //     mqtt_last_will
  //
  // Phase 4-4 confirmed combo strategy auto-prepended mqtt_setup but case_0794
  // STILL FAILED because mqtt_setup itself didn't declare these — so
  // INIT_DEPENDENCIES alone isn't sufficient (commit 1 contract case_0794 = the
  // canonical witness for "両手段必要").
  //
  // We register CONDITIONAL default declarations under the same definitions_
  // keys the sibling blocks use, so:
  //   - mqtt_on_message / mqtt_last_will alone, before mqtt_setup → sibling
  //     value already present → our `if (!...)` guard skips → user data wins
  //   - mqtt_setup before sibling → our defaults emit first, sibling
  //     unconditional assign overrides → user data wins
  //   - mqtt_setup alone → defaults emit, compile passes
  //
  // See rules/digicode/03-block-workflow.md "Init block protocol".
  if (!generator.definitions_['mqtt_topic_var']) {
    generator.definitions_['mqtt_topic_var'] =
      '// emits: mqtt_topic (mqtt_setup default、mqtt_on_message callback で書き換え)\n' +
      'String mqtt_topic = "";';
  }
  if (!generator.definitions_['mqtt_message_var']) {
    generator.definitions_['mqtt_message_var'] =
      '// emits: mqtt_message (mqtt_setup default、mqtt_on_message callback で書き換え)\n' +
      'String mqtt_message = "";';
  }
  if (!generator.definitions_['mqtt_lwt_topic']) {
    generator.definitions_['mqtt_lwt_topic'] =
      '// emits: mqtt_lwt_topic (mqtt_setup default、mqtt_last_will で user 値に override)\n' +
      'const char* mqtt_lwt_topic = "";';
  }
  if (!generator.definitions_['mqtt_lwt_message']) {
    generator.definitions_['mqtt_lwt_message'] =
      '// emits: mqtt_lwt_message (mqtt_setup default、mqtt_last_will で override)\n' +
      'const char* mqtt_lwt_message = "";';
  }
  if (!generator.definitions_['mqtt_lwt_retain']) {
    generator.definitions_['mqtt_lwt_retain'] =
      '// emits: mqtt_lwt_retain (mqtt_setup default、mqtt_last_will で override)\n' +
      'const bool mqtt_lwt_retain = false;';
  }
  if (!generator.definitions_['mqtt_lwt_qos']) {
    generator.definitions_['mqtt_lwt_qos'] =
      '// emits: mqtt_lwt_qos (mqtt_setup default、mqtt_last_will で override)\n' +
      'const int mqtt_lwt_qos = 0;';
  }

  return `  // MQTT Setup
  mqttClient.setServer(mqtt_broker, String(${port}).toInt());
  mqttWifiConnect();
`;
};

/**
 * 2. mqtt_connect - MQTTブローカーに接続
 */
Blockly.Blocks['mqtt_connect'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🔗 ' + (Blockly.Msg.BLOCKS_MQTT_CONNECT || 'Connect to MQTT Broker'));
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_MQTT_USERNAME || 'Username')
        .appendField(new Blockly.FieldTextInput(''), 'USERNAME')
        .appendField(Blockly.Msg.BLOCKS_MQTT_EMPTYNOAUTH || '(empty for no auth)');
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_MQTT_PASSWORD || 'Password')
        .appendField(new Blockly.FieldTextInput(''), 'PASSWORD');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour('#00BCD4');
    this.setTooltip(Blockly.Msg.BLOCKS_MQTT_CONNECTTOOLTIP || 'Connect to MQTT broker (with/without auth)');
  }
};

javascriptGenerator.forBlock['mqtt_connect'] = function(block: Blockly.Block) {
  const username = block.getFieldValue('USERNAME');
  const password = block.getFieldValue('PASSWORD');

  // 再接続関数を生成
  const hasAuth = username && username.length > 0;

  if (hasAuth) {
    generator.definitions_['mqtt_username'] = `const char* mqtt_username = "${username}";`;
    generator.definitions_['mqtt_password'] = `const char* mqtt_password = "${password}";`;
    generator.definitions_['mqtt_reconnect_func'] = `
void mqttReconnect() {
  while (!mqttClient.connected()) {
    Serial.print("MQTT connecting...");
    if (mqttClient.connect(mqtt_client_id, mqtt_username, mqtt_password)) {
      Serial.println("connected!");
    } else {
      Serial.print("failed, rc=");
      Serial.print(mqttClient.state());
      Serial.println(" retrying in 5s...");
      delay(5000);
    }
  }
}`;
  } else {
    generator.definitions_['mqtt_reconnect_func'] = `
void mqttReconnect() {
  while (!mqttClient.connected()) {
    Serial.print("MQTT connecting...");
    if (mqttClient.connect(mqtt_client_id)) {
      Serial.println("connected!");
    } else {
      Serial.print("failed, rc=");
      Serial.print(mqttClient.state());
      Serial.println(" retrying in 5s...");
      delay(5000);
    }
  }
}`;
  }

  return `  // MQTT Connect
  if (!mqttClient.connected()) {
    mqttReconnect();
  }
`;
};

/**
 * 3. mqtt_publish - トピックにメッセージを送信
 */
Blockly.Blocks['mqtt_publish'] = {
  init: function() {
    this.appendValueInput('MESSAGE')
        .setCheck(['String', 'Number'])
        .appendField('📤 ' + (Blockly.Msg.BLOCKS_MQTT_PUBLISH || 'MQTT Publish') + ' ' + (Blockly.Msg.BLOCKS_MQTT_TOPIC || 'Topic'))
        .appendField(new Blockly.FieldTextInput('home/esp32/state'), 'TOPIC')
        .appendField(Blockly.Msg.BLOCKS_MQTT_MESSAGE || 'Message');
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_MQTT_RETAIN || 'Retain')
        .appendField(new Blockly.FieldCheckbox('FALSE'), 'RETAIN');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour('#4CAF50');
    this.setTooltip(Blockly.Msg.BLOCKS_MQTT_PUBLISHTOOLTIP || 'Send message to specified topic');
  }
};

javascriptGenerator.forBlock['mqtt_publish'] = function(block: Blockly.Block) {
  const topic = block.getFieldValue('TOPIC');
  const message = javascriptGenerator.valueToCode(block, 'MESSAGE', Order.ATOMIC) || '""';
  const retain = block.getFieldValue('RETAIN') === 'TRUE';

  // String変換ヘルパー関数
  generator.definitions_['mqtt_to_string_func'] = `
String mqttToString(int val) { return String(val); }
String mqttToString(float val) { return String(val); }
String mqttToString(double val) { return String(val); }
String mqttToString(const char* val) { return String(val); }
String mqttToString(String val) { return val; }`;

  return `  // MQTT Publish
  {
    String _mqttMsg = mqttToString(${message});
    mqttClient.publish("${topic}", _mqttMsg.c_str(), ${retain});
  }
`;
};

/**
 * 4. mqtt_subscribe - トピックを購読
 */
Blockly.Blocks['mqtt_subscribe'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('📥 ' + (Blockly.Msg.BLOCKS_MQTT_SUBSCRIBE || 'MQTT Subscribe') + ' ' + (Blockly.Msg.BLOCKS_MQTT_TOPIC || 'Topic'))
        .appendField(new Blockly.FieldTextInput('home/esp32/command'), 'TOPIC');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour('#FF9800');
    this.setTooltip(Blockly.Msg.BLOCKS_MQTT_SUBSCRIBETOOLTIP || 'Subscribe to topic (wildcards # and + supported)');
  }
};

javascriptGenerator.forBlock['mqtt_subscribe'] = function(block: Blockly.Block) {
  const topic = block.getFieldValue('TOPIC');

  return `  mqttClient.subscribe("${topic}");
`;
};

/**
 * 5. mqtt_on_message - メッセージ受信時のコールバック設定
 */
Blockly.Blocks['mqtt_on_message'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('📨 ' + (Blockly.Msg.BLOCKS_MQTT_ONMESSAGE || 'MQTT On Message Received'));
    this.appendStatementInput('CALLBACK')
        .setCheck(null)
        .appendField(Blockly.Msg.BLOCKS_MQTT_HANDLER || 'Handler');
    this.setColour('#E91E63');
    this.setTooltip(Blockly.Msg.BLOCKS_MQTT_ONMESSAGETOOLTIP || 'Set handler when MQTT message is received. mqtt_topic and mqtt_message variables are available.');
  }
};

javascriptGenerator.forBlock['mqtt_on_message'] = function(block: Blockly.Block) {
  const statements = javascriptGenerator.statementToCode(block, 'CALLBACK');

  // グローバル変数
  generator.definitions_['mqtt_topic_var'] = 'String mqtt_topic = "";';
  generator.definitions_['mqtt_message_var'] = 'String mqtt_message = "";';

  // コールバック関数
  generator.definitions_['mqtt_callback_func'] = `
void mqttCallback(char* topic, byte* payload, unsigned int length) {
  mqtt_topic = String(topic);
  mqtt_message = "";
  for (unsigned int i = 0; i < length; i++) {
    mqtt_message += (char)payload[i];
  }
  Serial.print("MQTT received [");
  Serial.print(mqtt_topic);
  Serial.print("]: ");
  Serial.println(mqtt_message);
${statements}}`;

  // setupでコールバックを設定
  generator.setups_['mqtt_set_callback'] = '  mqttClient.setCallback(mqttCallback);';

  return '';
};

/**
 * 6. mqtt_loop - MQTTループ処理
 */
Blockly.Blocks['mqtt_loop'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🔄 ' + (Blockly.Msg.BLOCKS_MQTT_LOOP || 'MQTT Loop'));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour('#00BCD4');
    this.setTooltip(Blockly.Msg.BLOCKS_MQTT_LOOPTOOLTIP || 'Process MQTT communication. Call in loop().');
  }
};

javascriptGenerator.forBlock['mqtt_loop'] = function() {
  return `  mqttClient.loop();
`;
};

// ===== ヘルパーブロック =====

/**
 * mqtt_topic_value - 受信したトピック名を取得
 */
Blockly.Blocks['mqtt_topic_value'] = {
  init: function() {
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_MQTT_RECEIVEDTOPIC || 'Received Topic');
    this.setOutput(true, 'String');
    this.setColour('#E91E63');
    this.setTooltip(Blockly.Msg.BLOCKS_MQTT_RECEIVEDTOPICTOOLTIP || 'Get the topic name of received message');
  }
};

javascriptGenerator.forBlock['mqtt_topic_value'] = function() {
  // requires: mqtt_topic (declared by mqtt_setup default or mqtt_on_message
  // — see rules/digicode/03-block-workflow.md "Init block protocol")
  return ['/* requires: mqtt_topic */ mqtt_topic', Order.ATOMIC];
};

/**
 * mqtt_message_value - 受信したメッセージを取得
 */
Blockly.Blocks['mqtt_message_value'] = {
  init: function() {
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_MQTT_RECEIVEDMESSAGE || 'Received Message');
    this.setOutput(true, 'String');
    this.setColour('#E91E63');
    this.setTooltip(Blockly.Msg.BLOCKS_MQTT_RECEIVEDMESSAGETOOLTIP || 'Get the content of received message');
  }
};

javascriptGenerator.forBlock['mqtt_message_value'] = function() {
  // requires: mqtt_message (declared by mqtt_setup default or mqtt_on_message
  // — see rules/digicode/03-block-workflow.md "Init block protocol")
  return ['/* requires: mqtt_message */ mqtt_message', Order.ATOMIC];
};

/**
 * mqtt_is_connected - MQTT接続状態を確認
 */
Blockly.Blocks['mqtt_is_connected'] = {
  init: function() {
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_MQTT_ISCONNECTED || 'MQTT is Connected');
    this.setOutput(true, 'Boolean');
    this.setColour('#00BCD4');
    this.setTooltip(Blockly.Msg.BLOCKS_MQTT_ISCONNECTEDTOOLTIP || 'Returns whether connected to MQTT broker');
  }
};

javascriptGenerator.forBlock['mqtt_is_connected'] = function() {
  return ['mqttClient.connected()', Order.FUNCTION_CALL];
};

/**
 * wifi_is_connected - WiFi接続状態を確認
 */
Blockly.Blocks['wifi_is_connected'] = {
  init: function() {
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_WIFI_ISCONNECTED || 'WiFi is Connected');
    this.setOutput(true, 'Boolean');
    this.setColour('#00BCD4');
    this.setTooltip(Blockly.Msg.BLOCKS_WIFI_ISCONNECTEDTOOLTIP || 'Returns whether connected to WiFi');
  }
};

javascriptGenerator.forBlock['wifi_is_connected'] = function() {
  generator.definitions_['include_wifi'] = '#include <WiFi.h>';
  return ['(WiFi.status() == WL_CONNECTED)', Order.FUNCTION_CALL];
};

// ===== 追加ブロック =====

/**
 * mqtt_disconnect - MQTTブローカーから切断
 */
Blockly.Blocks['mqtt_disconnect'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🔌 ' + (Blockly.Msg.BLOCKS_MQTT_DISCONNECT || 'MQTT Disconnect'));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour('#9E9E9E');
    this.setTooltip(Blockly.Msg.BLOCKS_MQTT_DISCONNECTTOOLTIP || 'Disconnect from MQTT broker');
  }
};

javascriptGenerator.forBlock['mqtt_disconnect'] = function() {
  return `  mqttClient.disconnect();
`;
};

/**
 * mqtt_unsubscribe - トピックの購読を解除
 */
Blockly.Blocks['mqtt_unsubscribe'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🚫 ' + (Blockly.Msg.BLOCKS_MQTT_UNSUBSCRIBE || 'MQTT Unsubscribe') + ' ' + (Blockly.Msg.BLOCKS_MQTT_TOPIC || 'Topic'))
        .appendField(new Blockly.FieldTextInput('home/esp32/command'), 'TOPIC');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour('#FF9800');
    this.setTooltip(Blockly.Msg.BLOCKS_MQTT_UNSUBSCRIBETOOLTIP || 'Unsubscribe from topic');
  }
};

javascriptGenerator.forBlock['mqtt_unsubscribe'] = function(block: Blockly.Block) {
  const topic = block.getFieldValue('TOPIC');
  return `  mqttClient.unsubscribe("${topic}");
`;
};

/**
 * mqtt_set_buffer_size - バッファサイズの設定（大きいメッセージ用）
 */
Blockly.Blocks['mqtt_set_buffer_size'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('📦 ' + (Blockly.Msg.BLOCKS_MQTT_BUFFERSIZE || 'MQTT Buffer Size'));
    this.appendValueInput('SIZE');
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_MQTT_BYTES || 'bytes');
    this.setInputsInline(true);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour('#00BCD4');
    this.setTooltip(Blockly.Msg.BLOCKS_MQTT_BUFFERSIZETOOLTIP || 'Set maximum MQTT message size (default 256 bytes)');
  }
};

javascriptGenerator.forBlock['mqtt_set_buffer_size'] = function(block: Blockly.Block) {
  const size = generator.valueToCode(block, 'SIZE', generator.ORDER_ATOMIC) || '256';
  return `  mqttClient.setBufferSize(String(${size}).toInt());
`;
};

/**
 * mqtt_set_keepalive - キープアライブ間隔の設定
 */
Blockly.Blocks['mqtt_set_keepalive'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('⏱️ ' + (Blockly.Msg.BLOCKS_MQTT_KEEPALIVE || 'MQTT Keep Alive'));
    this.appendValueInput('SECONDS');
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_MQTT_SECONDS || 'seconds');
    this.setInputsInline(true);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour('#00BCD4');
    this.setTooltip(Blockly.Msg.BLOCKS_MQTT_KEEPALIVETOOLTIP || 'Set MQTT keep alive interval (default 15 seconds)');
  }
};

javascriptGenerator.forBlock['mqtt_set_keepalive'] = function(block: Blockly.Block) {
  const seconds = generator.valueToCode(block, 'SECONDS', generator.ORDER_ATOMIC) || '15';
  return `  mqttClient.setKeepAlive(String(${seconds}).toInt());
`;
};

/**
 * mqtt_last_will - Last Will and Testament（遺言）の設定
 */
Blockly.Blocks['mqtt_last_will'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('💀 ' + (Blockly.Msg.BLOCKS_MQTT_LASTWILL || 'MQTT Last Will'));
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_MQTT_TOPIC || 'Topic')
        .appendField(new Blockly.FieldTextInput('home/esp32/status'), 'TOPIC');
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_MQTT_MESSAGE || 'Message')
        .appendField(new Blockly.FieldTextInput('offline'), 'MESSAGE');
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_MQTT_RETAIN || 'Retain')
        .appendField(new Blockly.FieldCheckbox('TRUE'), 'RETAIN');
    this.appendDummyInput()
        .appendField('QoS')
        .appendField(new Blockly.FieldDropdown([
          [Blockly.Msg.BLOCKS_MQTT_QOS0 || '0 (at most once)', '0'],
          [Blockly.Msg.BLOCKS_MQTT_QOS1 || '1 (at least once)', '1'],
          [Blockly.Msg.BLOCKS_MQTT_QOS2 || '2 (exactly once)', '2']
        ]), 'QOS');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour('#795548');
    this.setTooltip(Blockly.Msg.BLOCKS_MQTT_LASTWILLTOOLTIP || 'Set message broker sends when client disconnects unexpectedly');
  }
};

javascriptGenerator.forBlock['mqtt_last_will'] = function(block: Blockly.Block) {
  const topic = block.getFieldValue('TOPIC');
  const message = block.getFieldValue('MESSAGE');
  const retain = block.getFieldValue('RETAIN') === 'TRUE';
  const qos = block.getFieldValue('QOS');

  // グローバル変数として保存（connect時に使用）
  generator.definitions_['mqtt_lwt_topic'] = `const char* mqtt_lwt_topic = "${topic}";`;
  generator.definitions_['mqtt_lwt_message'] = `const char* mqtt_lwt_message = "${message}";`;
  generator.definitions_['mqtt_lwt_retain'] = `const bool mqtt_lwt_retain = ${retain};`;
  generator.definitions_['mqtt_lwt_qos'] = `const int mqtt_lwt_qos = ${qos};`;

  return `  // Last Will設定済み - connect時に適用されます
`;
};

/**
 * mqtt_connect_with_lwt - Last Will付きでMQTTブローカーに接続
 */
Blockly.Blocks['mqtt_connect_with_lwt'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🔗 ' + (Blockly.Msg.BLOCKS_MQTT_CONNECTWITHLWT || 'Connect to MQTT with Last Will'));
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_MQTT_USERNAME || 'Username')
        .appendField(new Blockly.FieldTextInput(''), 'USERNAME');
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_MQTT_PASSWORD || 'Password')
        .appendField(new Blockly.FieldTextInput(''), 'PASSWORD');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour('#00BCD4');
    this.setTooltip(Blockly.Msg.BLOCKS_MQTT_CONNECTWITHLWTTOOLTIP || 'Connect to MQTT broker with Last Will settings');
  }
};

javascriptGenerator.forBlock['mqtt_connect_with_lwt'] = function(block: Blockly.Block) {
  const username = block.getFieldValue('USERNAME');
  const password = block.getFieldValue('PASSWORD');

  const hasAuth = username && username.length > 0;

  if (hasAuth) {
    generator.definitions_['mqtt_username'] = `const char* mqtt_username = "${username}";`;
    generator.definitions_['mqtt_password'] = `const char* mqtt_password = "${password}";`;
    generator.definitions_['mqtt_reconnect_lwt_func'] = `
// requires: mqtt_lwt_topic, mqtt_lwt_message, mqtt_lwt_qos, mqtt_lwt_retain — declared by mqtt_setup default or mqtt_last_will
void mqttReconnectLWT() {
  while (!mqttClient.connected()) {
    Serial.print("MQTT connecting with LWT...");
    if (mqttClient.connect(mqtt_client_id, mqtt_username, mqtt_password,
                           mqtt_lwt_topic, mqtt_lwt_qos, mqtt_lwt_retain, mqtt_lwt_message)) {
      Serial.println("connected!");
      mqttClient.publish(mqtt_lwt_topic, "online", true);
    } else {
      Serial.print("failed, rc=");
      Serial.print(mqttClient.state());
      Serial.println(" retrying in 5s...");
      delay(5000);
    }
  }
}`;
  } else {
    generator.definitions_['mqtt_reconnect_lwt_func'] = `
// requires: mqtt_lwt_topic, mqtt_lwt_message, mqtt_lwt_qos, mqtt_lwt_retain — declared by mqtt_setup default or mqtt_last_will
void mqttReconnectLWT() {
  while (!mqttClient.connected()) {
    Serial.print("MQTT connecting with LWT...");
    if (mqttClient.connect(mqtt_client_id, mqtt_lwt_topic, mqtt_lwt_qos, mqtt_lwt_retain, mqtt_lwt_message)) {
      Serial.println("connected!");
      mqttClient.publish(mqtt_lwt_topic, "online", true);
    } else {
      Serial.print("failed, rc=");
      Serial.print(mqttClient.state());
      Serial.println(" retrying in 5s...");
      delay(5000);
    }
  }
}`;
  }

  return `  // MQTT Connect with LWT
  if (!mqttClient.connected()) {
    mqttReconnectLWT();
  }
`;
};

/**
 * mqtt_get_state - MQTT接続状態コードを取得
 */
Blockly.Blocks['mqtt_get_state'] = {
  init: function() {
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_MQTT_GETSTATE || 'MQTT State Code');
    this.setOutput(true, 'Number');
    this.setColour('#00BCD4');
    this.setTooltip(Blockly.Msg.BLOCKS_MQTT_GETSTATETOOLTIP || 'Returns MQTT state code (-4:timeout, -3:disconnected, -2:failed, -1:disconnected, 0:connected, 1-4:error)');
  }
};

javascriptGenerator.forBlock['mqtt_get_state'] = function() {
  return ['mqttClient.state()', Order.FUNCTION_CALL];
};

/**
 * mqtt_publish_qos - QoS指定でトピックにメッセージを送信
 */
Blockly.Blocks['mqtt_publish_qos'] = {
  init: function() {
    this.appendValueInput('MESSAGE')
        .setCheck(['String', 'Number'])
        .appendField('📤 ' + (Blockly.Msg.BLOCKS_MQTT_PUBLISHQOS || 'MQTT Publish (QoS)'));
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_MQTT_TOPIC || 'Topic')
        .appendField(new Blockly.FieldTextInput('home/esp32/state'), 'TOPIC');
    this.appendDummyInput()
        .appendField('QoS')
        .appendField(new Blockly.FieldDropdown([
          [Blockly.Msg.BLOCKS_MQTT_QOS0 || '0 (at most once)', '0'],
          [Blockly.Msg.BLOCKS_MQTT_QOS1 || '1 (at least once)', '1']
        ]), 'QOS')
        .appendField(Blockly.Msg.BLOCKS_MQTT_RETAIN || 'Retain')
        .appendField(new Blockly.FieldCheckbox('FALSE'), 'RETAIN');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour('#4CAF50');
    this.setTooltip(Blockly.Msg.BLOCKS_MQTT_PUBLISHQOSTOOLTIP || 'Send message with specified QoS level');
  }
};

javascriptGenerator.forBlock['mqtt_publish_qos'] = function(block: Blockly.Block) {
  const topic = block.getFieldValue('TOPIC');
  const message = javascriptGenerator.valueToCode(block, 'MESSAGE', Order.ATOMIC) || '""';
  const qos = block.getFieldValue('QOS');
  const retain = block.getFieldValue('RETAIN') === 'TRUE';

  generator.definitions_['mqtt_to_string_func'] = `
String mqttToString(int val) { return String(val); }
String mqttToString(float val) { return String(val); }
String mqttToString(double val) { return String(val); }
String mqttToString(const char* val) { return String(val); }
String mqttToString(String val) { return val; }`;

  // QoS対応のpublish（beginPublish/print/endPublish方式）
  if (qos === '1') {
    return `  // MQTT Publish with QoS 1
  {
    String _mqttMsg = mqttToString(${message});
    mqttClient.beginPublish("${topic}", _mqttMsg.length(), ${retain});
    mqttClient.print(_mqttMsg);
    mqttClient.endPublish();
  }
`;
  }

  return `  // MQTT Publish with QoS 0
  {
    String _mqttMsg = mqttToString(${message});
    mqttClient.publish("${topic}", _mqttMsg.c_str(), ${retain});
  }
`;
};

/**
 * wifi_reconnect - WiFi再接続
 */
Blockly.Blocks['wifi_reconnect'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('📶 ' + (Blockly.Msg.BLOCKS_WIFI_RECONNECT || 'WiFi Reconnect'));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour('#00BCD4');
    this.setTooltip(Blockly.Msg.BLOCKS_WIFI_RECONNECTTOOLTIP || 'Reconnect to WiFi if disconnected');
  }
};

javascriptGenerator.forBlock['wifi_reconnect'] = function() {
  // post-Phase 4-4 commit 2-9 fix (case_0260):
  // Previous body called `mqttWifiConnect()` which is only declared by
  // mqtt_setup. Standalone `wifi_reconnect` (without mqtt_setup) failed with
  // "'mqttWifiConnect' was not declared in this scope" + missing WiFi.h.
  // Use the framework-provided `WiFi.reconnect()` instead so the block works
  // independently of mqtt_setup. emits: include_wifi only.
  generator.definitions_['include_wifi'] = '#include <WiFi.h>';
  return `  /* requires: WiFi (include_wifi) */
  if (WiFi.status() != WL_CONNECTED) {
    WiFi.reconnect();
  }
`;
};

/**
 * wifi_get_ip - WiFi IPアドレスを取得
 */
Blockly.Blocks['wifi_get_ip'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('📍 ' + (Blockly.Msg.BLOCKS_WIFI_GETIP || 'WiFi IP Address'));
    this.setOutput(true, 'String');
    this.setColour('#00BCD4');
    this.setTooltip(Blockly.Msg.BLOCKS_WIFI_GETIPTOOLTIP || 'Get current IP address as string');
  }
};

javascriptGenerator.forBlock['wifi_get_ip'] = function() {
  generator.definitions_['include_wifi'] = '#include <WiFi.h>';
  return ['WiFi.localIP().toString()', Order.FUNCTION_CALL];
};

/**
 * wifi_get_rssi - WiFi信号強度を取得
 */
Blockly.Blocks['wifi_get_rssi'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('📊 ' + (Blockly.Msg.BLOCKS_WIFI_GETRSSI || 'WiFi Signal Strength (RSSI)'));
    this.setOutput(true, 'Number');
    this.setColour('#00BCD4');
    this.setTooltip(Blockly.Msg.BLOCKS_WIFI_GETRSSITOOLTIP || 'Get WiFi signal strength in dBm (-30:very strong ~ -90:very weak)');
  }
};

javascriptGenerator.forBlock['wifi_get_rssi'] = function() {
  generator.definitions_['include_wifi'] = '#include <WiFi.h>';
  return ['WiFi.RSSI()', Order.FUNCTION_CALL];
};

console.log('MQTT blocks loaded');
