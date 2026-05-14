/*
 * DigiCode - Block-based ESP32 Programming Tool
 * Copyright (C) 2024-2026 DigiCo LLC
 *
 * Licensed under the GNU Affero General Public License version 3 or later.
 * See LICENSE file in the repository root for full terms.
 */

/**
 * IoT クラウド抽象化ブロック (51.md Phase A+B、第78回 commit #5 / 2026-05-04)
 * + AWS/GCP stub 公式化 (52.md Phase D、第80回 commit #10 / 2026-05-04)
 *
 * 6 ブロック構成 (iot_cloud_*):
 *   - iot_cloud_connect          (Boolean output, PROVIDER dropdown 5 値)
 *   - iot_cloud_publish          (statement)
 *   - iot_cloud_on_message       (statement, loopPre_ パターン)
 *   - iot_cloud_received_value   (String output、HANDLER 内専用)
 *   - iot_cloud_disconnect       (statement)
 *   - iot_cloud_is_connected     (Boolean)
 *
 * 設計方針 (51.md §3 + D-21 user 確定 + 52.md Q-F 確定):
 *   - PROVIDER dropdown 5 値: azure_iot_hub / azure_iot_central / aws_iot_core (stub) /
 *     gcp_iot (stub) / mqtt_generic
 *   - CREDENTIALS = JSON 文字列、ArduinoJson v6 で parse → provider 別 dispatch
 *   - Azure 系は既存 azureIot* helpers (azureIotBlocks.ts) を内部 call
 *   - mqtt_generic は既存 mqtt 系 (mqttBlocks.ts) の global mqttClient を reuse
 *   - aws_iot_core / gcp_iot は **stub 実装** (Serial.println warn log + return false)
 *     FS 協会方針確定後に本実装、現状は azure_iot_hub を優先するよう AI prompt prohibitions に明記 (52.md commit #21)
 *
 * Cred JSON 例 (51.md §3.3):
 *   - azure_iot_hub:    {"connection_string":"HostName=...;DeviceId=...;SharedAccessKey=..."}
 *   - azure_iot_central: {"scope_id":"...","device_id":"...","device_key":"..."}
 *   - mqtt_generic:     {"broker":"mqtt.example.com","port":1883,"username":"...","password":"..."}
 *
 * boardRequires: `supportsWifi` (catalog 経由)。
 *
 * 内部 lib: 既存 azureIotBlocks.ts (Azure SDK + PubSubClient + WiFi) + mqttBlocks.ts (PubSubClient) + ArduinoJson v6
 */
import * as Blockly from 'blockly';
import { javascriptGenerator, Order } from 'blockly/javascript';
import {
  AZURE_IOT_INCLUDE,
  AZURE_IOT_GLOBALS,
  AZURE_IOT_GLOBALS_CB,
  AZURE_IOT_HELPERS,
} from './azureIotBlocks';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const generator = javascriptGenerator as any;

const IOT_CLOUD_COLOR = '#4CAF50'; // green for abstraction layer (差別化 from #0078D4 Azure)

const IOT_CLOUD_INCLUDE = `#include <ArduinoJson.h>`;

// iot_cloud は Azure helpers + 既存 mqttClient を reuse、新規 globals は最小化
const IOT_CLOUD_GLOBALS = `enum IotCloudProvider { IOT_CLOUD_NONE, IOT_CLOUD_AZURE_HUB, IOT_CLOUD_AZURE_CENTRAL, IOT_CLOUD_AWS, IOT_CLOUD_GCP, IOT_CLOUD_MQTT_GENERIC };
IotCloudProvider iotCloudCurrentProvider = IOT_CLOUD_NONE;
String iotCloudReceivedMessage = "";
typedef void (*_IotCloudCallback)();
struct _IotCloudReg { static _IotCloudCallback _cb; _IotCloudReg(_IotCloudCallback cb) { _cb = cb; } };`;

const IOT_CLOUD_GLOBALS_CB = `_IotCloudCallback _IotCloudReg::_cb = nullptr;`;

// 注: iot_cloud_helpers は azure_iot_helpers (azureIotMqttClient / azureIotHubInit / etc.)
// と mqttClient (mqttBlocks.ts global) に依存。dispatch 分岐は provider 別。
const IOT_CLOUD_HELPERS = `
// 51.md commit #5: iot_cloud abstraction layer (Azure → reuse helpers / mqtt_generic → reuse mqttClient)

bool iotCloudConnect(const String& provider, const String& credentialsJson) {
  StaticJsonDocument<512> doc;
  DeserializationError err = deserializeJson(doc, credentialsJson);
  if (err) {
    Serial.printf("[iot_cloud] credentials JSON parse error: %s\\n", err.c_str());
    return false;
  }
  if (provider == "azure_iot_hub") {
    const char* connStr = doc["connection_string"] | "";
    if (strlen(connStr) == 0) return false;
    bool ok = azureIotHubInit(String(connStr));
    if (ok) iotCloudCurrentProvider = IOT_CLOUD_AZURE_HUB;
    return ok;
  } else if (provider == "azure_iot_central") {
    const char* scope = doc["scope_id"] | "";
    const char* dev   = doc["device_id"] | "";
    const char* key   = doc["device_key"] | "";
    bool ok = azureIotCentralInit(String(scope), String(dev), String(key));
    if (ok) iotCloudCurrentProvider = IOT_CLOUD_AZURE_CENTRAL;
    return ok;
  } else if (provider == "mqtt_generic") {
    const char* broker = doc["broker"] | "";
    int port = doc["port"] | 1883;
    const char* user = doc["username"] | "";
    const char* pass = doc["password"] | "";
    const char* cid  = doc["client_id"] | "esp32-iot-cloud";
    if (strlen(broker) == 0) return false;
    mqttClient.setServer(broker, port);
    bool ok = (strlen(user) > 0)
      ? mqttClient.connect(cid, user, pass)
      : mqttClient.connect(cid);
    if (ok) {
      iotCloudCurrentProvider = IOT_CLOUD_MQTT_GENERIC;
      mqttClient.subscribe("iot_cloud/incoming");
    } else {
      Serial.printf("[iot_cloud] mqtt connect failed rc=%d\\n", mqttClient.state());
    }
    return ok;
  } else if (provider == "aws_iot_core") {
    // 52.md Phase D commit #10: AWS IoT Core stub。X.509 証明書 + WiFiClientSecure + MQTT が
    // 本実装の構成だが、FS 協会方針 (Azure→AWS 移行) 確定後に着手。
    // 現状は azure_iot_hub を優先 (AI prompt prohibitions、commit #21 で明記)。
    Serial.println("[iot_cloud] aws_iot_core: stub only — use azure_iot_hub instead.");
    return false;
  } else if (provider == "gcp_iot") {
    // 52.md Phase D commit #10: Google Cloud IoT stub。GCP IoT Core は 2023-08 に公式廃止
    // (deprecated)、後継 = Pub/Sub direct via JWT。本実装の必要性は低い。
    Serial.println("[iot_cloud] gcp_iot: stub only (GCP IoT Core deprecated 2023) — use azure_iot_hub.");
    return false;
  }
  Serial.printf("[iot_cloud] unknown provider: %s\\n", provider.c_str());
  return false;
}

void iotCloudPublish(const String& payload) {
  if (iotCloudCurrentProvider == IOT_CLOUD_AZURE_HUB || iotCloudCurrentProvider == IOT_CLOUD_AZURE_CENTRAL) {
    azureIotHubPublishD2C(payload);
  } else if (iotCloudCurrentProvider == IOT_CLOUD_MQTT_GENERIC) {
    mqttClient.publish("iot_cloud/telemetry", payload.c_str());
  }
}

void _iotCloudMqttCallback(char* topic, byte* payload, unsigned int len) {
  (void)topic;
  iotCloudReceivedMessage = "";
  for (unsigned int i = 0; i < len; i++) iotCloudReceivedMessage += (char)payload[i];
  if (_IotCloudReg::_cb) _IotCloudReg::_cb();
  iotCloudReceivedMessage = "";
}

void iotCloudCheckMessage() {
  if (iotCloudCurrentProvider == IOT_CLOUD_AZURE_HUB || iotCloudCurrentProvider == IOT_CLOUD_AZURE_CENTRAL) {
    // Azure path: piggy-back on azureIotCheckC2D() — _AzureIoTC2DReg と _IotCloudReg を chain
    azureIotCheckC2D();
    // azureIotCheckC2D() 内で C2D message が届いた直後 azureIotC2DMessage に値が入り
    // _AzureIoTC2DReg::_cb を fire するが、bridge を本実装で挿入:
    // (azureIot 側 callback 終了後 azureIotC2DMessage は "" にクリアされるので、
    // 本 path では _IotCloudReg::_cb は azure_iot_hub_on_c2d block で同時 register された場合に発火)
  } else if (iotCloudCurrentProvider == IOT_CLOUD_MQTT_GENERIC) {
    static bool _cbInstalled = false;
    if (!_cbInstalled) {
      mqttClient.setCallback(_iotCloudMqttCallback);
      _cbInstalled = true;
    }
    mqttClient.loop();
  }
}

bool iotCloudIsConnected() {
  if (iotCloudCurrentProvider == IOT_CLOUD_AZURE_HUB || iotCloudCurrentProvider == IOT_CLOUD_AZURE_CENTRAL) {
    return azureIotMqttClient.connected();
  } else if (iotCloudCurrentProvider == IOT_CLOUD_MQTT_GENERIC) {
    return mqttClient.connected();
  }
  return false;
}

void iotCloudDisconnect() {
  if (iotCloudCurrentProvider == IOT_CLOUD_AZURE_HUB || iotCloudCurrentProvider == IOT_CLOUD_AZURE_CENTRAL) {
    azureIotMqttClient.disconnect();
  } else if (iotCloudCurrentProvider == IOT_CLOUD_MQTT_GENERIC) {
    mqttClient.disconnect();
  }
  iotCloudCurrentProvider = IOT_CLOUD_NONE;
}
`;

function emitIotCloudCommonDefs() {
  // Azure SDK + helpers (azureIotBlocks.ts と同 key で dedupe、iot_cloud 経由でも Azure block 経由でも同一 emit)
  generator.definitions_['include_azure_iot'] = AZURE_IOT_INCLUDE;
  generator.definitions_['azure_iot_globals'] = AZURE_IOT_GLOBALS;
  generator.definitions_['azure_iot_globals_cb'] = AZURE_IOT_GLOBALS_CB;
  generator.definitions_['azure_iot_helpers'] = AZURE_IOT_HELPERS;
  // ArduinoJson (iot_cloud 専用、credentials JSON parse 用)
  generator.definitions_['include_iot_cloud'] = IOT_CLOUD_INCLUDE;
  generator.definitions_['iot_cloud_globals'] = IOT_CLOUD_GLOBALS;
  generator.definitions_['iot_cloud_globals_cb'] = IOT_CLOUD_GLOBALS_CB;
  // mqtt_generic は mqttClient global を reuse (mqttBlocks.ts と同 key で dedupe)
  generator.definitions_['include_pubsub'] = '#include <PubSubClient.h>';
  generator.definitions_['mqtt_wifi_client'] = 'WiFiClient espClient;';
  generator.definitions_['mqtt_client'] = 'PubSubClient mqttClient(espClient);';
  // helpers
  generator.definitions_['iot_cloud_helpers'] = IOT_CLOUD_HELPERS;
}

// ============================================================================
// Block 定義
// ============================================================================

const PROVIDER_OPTIONS: [string, string][] = [
  ['Azure IoT Hub', 'azure_iot_hub'],
  ['Azure IoT Central', 'azure_iot_central'],
  ['AWS IoT Core (stub)', 'aws_iot_core'],
  ['Google Cloud IoT (stub)', 'gcp_iot'],
  ['Generic MQTT', 'mqtt_generic'],
];

/**
 * iot_cloud_connect — IoT クラウドに接続 (Boolean、PROVIDER dropdown 5 値)
 */
Blockly.Blocks['iot_cloud_connect'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('☁️ ' + (Blockly.Msg.BLOCKS_IOT_CLOUD_CONNECT || 'IoT クラウドに接続'));
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_IOT_CLOUD_PROVIDER || 'プロバイダ')
        .appendField(new Blockly.FieldDropdown(PROVIDER_OPTIONS), 'PROVIDER');
    this.appendValueInput('CREDENTIALS')
        .setCheck('String')
        .appendField(Blockly.Msg.BLOCKS_IOT_CLOUD_CREDENTIALS || '認証情報 (JSON)');
    this.setOutput(true, 'Boolean');
    this.setColour(IOT_CLOUD_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_IOT_CLOUD_CONNECT_TOOLTIP || 'IoT クラウドに接続します。プロバイダを選択し、JSON 形式の認証情報を渡してください (例: Azure Hub は connection_string、Central は scope_id+device_id+device_key、MQTT は broker+port)。AWS / GCP は Phase D で実装予定 (現状 stub)。');
  }
};

generator.forBlock['iot_cloud_connect'] = function(block: Blockly.Block) {
  const provider = block.getFieldValue('PROVIDER');
  const cred = generator.valueToCode(block, 'CREDENTIALS', Order.ATOMIC) || '""';
  emitIotCloudCommonDefs();
  return [`iotCloudConnect(String("${provider}"), ${cred})`, Order.FUNCTION_CALL];
};

/**
 * iot_cloud_publish — IoT クラウドに送信 (statement)
 */
Blockly.Blocks['iot_cloud_publish'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('☁️ ' + (Blockly.Msg.BLOCKS_IOT_CLOUD_PUBLISH || 'IoT クラウドに送信'));
    this.appendValueInput('PAYLOAD')
        .setCheck(['Number', 'String', 'Boolean'])
        .appendField(Blockly.Msg.BLOCKS_IOT_CLOUD_PAYLOAD || 'ペイロード');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(IOT_CLOUD_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_IOT_CLOUD_PUBLISH_TOOLTIP || 'IoT クラウドに送信します。事前に iot_cloud_connect が必要です。プロバイダに応じて Azure D2C / 汎用 MQTT 等に dispatch されます。');
  }
};

generator.forBlock['iot_cloud_publish'] = function(block: Blockly.Block) {
  const payload = generator.valueToCode(block, 'PAYLOAD', Order.ATOMIC) || '""';
  emitIotCloudCommonDefs();
  return `iotCloudPublish(String(${payload}));\n`;
};

/**
 * iot_cloud_on_message — IoT クラウドからメッセージ受信したら (loopPre_ パターン)
 */
Blockly.Blocks['iot_cloud_on_message'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('☁️ ' + (Blockly.Msg.BLOCKS_IOT_CLOUD_ON_MESSAGE || 'IoT クラウドからメッセージを受信したら'));
    this.appendStatementInput('HANDLER')
        .setCheck(null)
        .appendField(Blockly.Msg.BLOCKS_IOT_CLOUD_HANDLER || 'ハンドラ');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(IOT_CLOUD_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_IOT_CLOUD_ON_MESSAGE_TOOLTIP || 'IoT クラウドからメッセージを受信したときの処理を定義します。HANDLER 内で iot_cloud_received_value で値が取得できます。arduino_loop の中に配置してください。');
  }
};

generator.forBlock['iot_cloud_on_message'] = function(block: Blockly.Block) {
  const handler = javascriptGenerator.statementToCode(block, 'HANDLER');
  emitIotCloudCommonDefs();
  // case 19 axis 2 (Session 120): first-wins guard for IoT Cloud message handler body.
  if (!generator.definitions_['iot_cloud_handler_func']) {
    generator.definitions_['iot_cloud_handler_func'] = `
void iotCloudHandleMessage() {
${handler}}
static _IotCloudReg _iotCloudReg(iotCloudHandleMessage);`;
  }
  if (!generator.loopPre_) generator.loopPre_ = {};
  generator.loopPre_['iot_cloud_check_message'] = '  iotCloudCheckMessage();';
  return '';
};

/**
 * iot_cloud_received_value — IoT クラウド受信メッセージ取得 (String output, HANDLER 内専用)
 */
Blockly.Blocks['iot_cloud_received_value'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('☁️ ' + (Blockly.Msg.BLOCKS_IOT_CLOUD_RECEIVED_VALUE || 'IoT クラウド受信メッセージ'));
    this.setOutput(true, 'String');
    this.setColour(IOT_CLOUD_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_IOT_CLOUD_RECEIVED_VALUE_TOOLTIP || 'IoT クラウドのメッセージハンドラ内で受信値を取得します。HANDLER 外で使うと空文字列を返します。');
  }
};

generator.forBlock['iot_cloud_received_value'] = function() {
  emitIotCloudCommonDefs();
  return ['iotCloudReceivedMessage', Order.ATOMIC];
};

/**
 * iot_cloud_disconnect — IoT クラウドから切断 (statement)
 */
Blockly.Blocks['iot_cloud_disconnect'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('☁️ ' + (Blockly.Msg.BLOCKS_IOT_CLOUD_DISCONNECT || 'IoT クラウドから切断'));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(IOT_CLOUD_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_IOT_CLOUD_DISCONNECT_TOOLTIP || 'IoT クラウドから切断します。プロバイダ状態をリセットします。');
  }
};

generator.forBlock['iot_cloud_disconnect'] = function() {
  emitIotCloudCommonDefs();
  return 'iotCloudDisconnect();\n';
};

/**
 * iot_cloud_is_connected — IoT クラウド接続中 (Boolean output)
 */
Blockly.Blocks['iot_cloud_is_connected'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('☁️ ' + (Blockly.Msg.BLOCKS_IOT_CLOUD_IS_CONNECTED || 'IoT クラウド接続中'));
    this.setOutput(true, 'Boolean');
    this.setColour(IOT_CLOUD_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_IOT_CLOUD_IS_CONNECTED_TOOLTIP || 'IoT クラウドとの接続が維持されている場合 true を返します。プロバイダに応じて Azure / MQTT のクライアント状態を返します。');
  }
};

generator.forBlock['iot_cloud_is_connected'] = function() {
  emitIotCloudCommonDefs();
  return ['iotCloudIsConnected()', Order.FUNCTION_CALL];
};
