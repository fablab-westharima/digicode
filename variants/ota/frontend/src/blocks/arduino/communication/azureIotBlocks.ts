/**
 * Azure IoT ブロック (51.md Phase A+B、第78回 commit #4-A 着手 / 2026-05-04)
 * — Microsoft Azure IoT Hub / IoT Central 連携用
 *
 * 9 ブロック構成 (azure_iot_*):
 *   #4-A (本コミット):
 *     - azure_iot_hub_connect          (Boolean output)
 *     - azure_iot_hub_publish_d2c      (statement)
 *     - azure_iot_hub_on_c2d           (statement, loopPre_ パターン)
 *     - azure_iot_received_value       (String output、HANDLER 内専用)
 *   #4-B (続コミット):
 *     - azure_iot_central_connect      (Boolean)
 *     - azure_iot_central_publish      (statement)
 *     - azure_iot_subscribe_direct_method (statement, loopPre_)
 *     - azure_iot_update_device_twin   (statement)
 *   #4-C (続コミット):
 *     - azure_iot_is_connected         (Boolean)
 *
 * 内部 lib: `azure/Azure SDK for C @ ^1.1.8` (lib_deps、commit #2 で追加済) +
 *           ESP32 core (`WiFi.h` / `WiFiClientSecure.h`) + `PubSubClient` (既存 lib)。
 *
 * 認証: connection_string 形式 (`HostName=...;DeviceId=...;SharedAccessKey=...`) を
 *       parse → SAS token を mbedtls HMAC-SHA256 + base64 で生成 → MQTT TLS 接続。
 *
 * smoke 検証: `S-1 Azure SDK for C` で az_iot_hub_client_options_default() 含む build OK
 *             (2026-05-04 commit #2 直後、wall 31s / firmware 1.81 MB)。
 *
 * boardRequires: `supportsWifi` (catalog 経由)、`category=='m5stack'` フィルタは別軸。
 *
 * i18n: `Blockly.Msg.BLOCKS_AZURE_IOT_*` JP fallback (D-22、ja.json 等への登録不要)。
 */
import * as Blockly from 'blockly';
import { javascriptGenerator, Order } from 'blockly/javascript';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const generator = javascriptGenerator as any;

const AZURE_IOT_COLOR = '#0078D4'; // Azure brand color

// ============================================================================
// C++ ヘルパー (definitions_ に dedupe key で 1 回 emit、N ブロック使用でも 1 回)
// ============================================================================

// 51.md commit #5 (iot_cloud): 抽象化レイヤーから internal call するため export
// (key dedupe + 同 key で azureIotBlocks.ts と iotCloudBlocks.ts が同じ定数値を emit)
export const AZURE_IOT_INCLUDE = `#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <PubSubClient.h>
#include <az_core.h>
#include <az_iot_hub_client.h>
#include <mbedtls/md.h>
#include <mbedtls/base64.h>
#include <time.h>`;

// DigiCert Global Root G2 — Azure IoT Hub TLS root CA (有効期限 2038-01-15)
// 出典: https://learn.microsoft.com/azure/security/fundamentals/tls-certificate-changes
const AZURE_IOT_ROOT_CA = `const char AZURE_IOT_ROOT_CA[] PROGMEM = R"CERT(
-----BEGIN CERTIFICATE-----
MIIDjjCCAnagAwIBAgIQAzrx5qcRqaC7KGSxHQn65TANBgkqhkiG9w0BAQsFADBh
MQswCQYDVQQGEwJVUzEVMBMGA1UEChMMRGlnaUNlcnQgSW5jMRkwFwYDVQQLExB3
d3cuZGlnaWNlcnQuY29tMSAwHgYDVQQDExdEaWdpQ2VydCBHbG9iYWwgUm9vdCBH
MjAeFw0xMzA4MDExMjAwMDBaFw0zODAxMTUxMjAwMDBaMGExCzAJBgNVBAYTAlVT
MRUwEwYDVQQKEwxEaWdpQ2VydCBJbmMxGTAXBgNVBAsTEHd3dy5kaWdpY2VydC5j
b20xIDAeBgNVBAMTF0RpZ2lDZXJ0IEdsb2JhbCBSb290IEcyMIIBIjANBgkqhkiG
9w0BAQEFAAOCAQ8AMIIBCgKCAQEAuzfNNNx7a8myaJCtSnX/RrohCgiN9RlUyfuI
2/Ou8jqJkTx65qsGGmvPrC3oXgkkRLpimn7Wo6h+4FR1IAWsULecYxpsMNzaHxmx
1x7e/dfgy5SDN67sH0NO3Xss0r0upS/kqbitOtSZpLYl6ZtrAGCSYP9PIUkY92eQ
q2EGnI/yuum06ZIya7XzV+hdG82MHauVBJVJ8zUtluNJbd134/tJS7SsVQepj5Wz
tCO7TG1F8PapspUwtP1MVYwnSlcUfIKdzXOS0xZKBgyMUNGPHgm+F6HmIcr9g+UQ
vIOlCsRnKPZzFBQ9RnbDhxSJITRNrw9FDKZJobq7nMWxM4MphQIDAQABo0IwQDAP
BgNVHRMBAf8EBTADAQH/MA4GA1UdDwEB/wQEAwIBhjAdBgNVHQ4EFgQUTiJUIBiV
5uNu5g/6+rkS7QYXjzkwDQYJKoZIhvcNAQELBQADggEBAGBnKJRvDkhj6zHd6mcY
1Yl9PMWLSn/pvtsrF9+wX3N3KjITOYFnQoQj8kVnNeyIv/iPsGEMNKSuIEyExtv4
NeF22d+mQrvHRAiGfzZ0JFrabA0UWTW98kndth/Jsw1HKj2ZL7tcu7XUIOGZX1NG
Fdtom/DzMNU+MeKNhJ7jitralj41E6Vf8PlwUHBHQRFXGU7Aj64GxJUTFy8bJZ91
8rGOmaFvE7FBcf6IKshPECBV1/MUReXgRPTqh5Uykw7+U0b6LJ3/iyK5S9kJRaTe
pLiaWN0bfVKfjllDiIGknibVb63dDcY3fe0Dkhvld1927jyNxF1WW6LZZm6zNTfl
MrY=
-----END CERTIFICATE-----
)CERT";`;

export const AZURE_IOT_GLOBALS = `${AZURE_IOT_ROOT_CA}
WiFiClientSecure azureIotSecureClient;
PubSubClient azureIotMqttClient(azureIotSecureClient);
az_iot_hub_client azureIotClient;
String azureIotC2DMessage = "";
char azureIotIotHubFQDN[96] = {0};
char azureIotDeviceId[96] = {0};
String azureIotSharedAccessKey = "";
// Direct Method (post commit #4-B): name / payload / requestId は HANDLER 内専用
String azureIotDirectMethodName = "";
String azureIotDirectMethodPayload = "";
String azureIotDirectMethodRequestId = "";
typedef void (*_AzureIoTC2DCallback)();
typedef void (*_AzureIoTDirectMethodCallback)();
struct _AzureIoTC2DReg { static _AzureIoTC2DCallback _cb; _AzureIoTC2DReg(_AzureIoTC2DCallback cb) { _cb = cb; } };
struct _AzureIoTDirectMethodReg { static _AzureIoTDirectMethodCallback _cb; _AzureIoTDirectMethodReg(_AzureIoTDirectMethodCallback cb) { _cb = cb; } };`;

export const AZURE_IOT_GLOBALS_CB = `_AzureIoTC2DCallback _AzureIoTC2DReg::_cb = nullptr;
_AzureIoTDirectMethodCallback _AzureIoTDirectMethodReg::_cb = nullptr;`;

// substantive helper: connection string parse + SAS token gen + MQTT connect + publish + C2D dispatch
export const AZURE_IOT_HELPERS = `
// 51.md Phase A+B: Azure IoT Hub helpers (parse connStr / SAS token / MQTT TLS / D2C / C2D)

static String _azureIotUrlEncode(const char* msg) {
  static const char hex[] = "0123456789ABCDEF";
  String out;
  for (size_t i = 0; msg[i]; i++) {
    char c = msg[i];
    if ((c >= '0' && c <= '9') || (c >= 'A' && c <= 'Z') || (c >= 'a' && c <= 'z') || c == '-' || c == '_' || c == '.' || c == '~') {
      out += c;
    } else {
      out += '%';
      out += hex[(c >> 4) & 0xF];
      out += hex[c & 0xF];
    }
  }
  return out;
}

static bool _azureIotParseConnStr(const String& cs) {
  // HostName=xxx.azure-devices.net;DeviceId=xxx;SharedAccessKey=base64==
  int hp = cs.indexOf("HostName=");
  int dp = cs.indexOf(";DeviceId=");
  int kp = cs.indexOf(";SharedAccessKey=");
  if (hp != 0 || dp < 0 || kp < 0) return false;
  String host = cs.substring(9, dp);
  String dev  = cs.substring(dp + 10, kp);
  String key  = cs.substring(kp + 17);
  if (host.length() == 0 || host.length() >= sizeof(azureIotIotHubFQDN)) return false;
  if (dev.length() == 0 || dev.length() >= sizeof(azureIotDeviceId)) return false;
  strncpy(azureIotIotHubFQDN, host.c_str(), sizeof(azureIotIotHubFQDN) - 1);
  strncpy(azureIotDeviceId,   dev.c_str(),  sizeof(azureIotDeviceId) - 1);
  azureIotSharedAccessKey = key;
  return true;
}

static String _azureIotGenerateSasToken(uint64_t expirySec) {
  // resource_uri = <hostFQDN>%2Fdevices%2F<deviceId>
  String resource = String(azureIotIotHubFQDN) + "/devices/" + String(azureIotDeviceId);
  String resourceEncoded = _azureIotUrlEncode(resource.c_str());
  String stringToSign = resourceEncoded + "\\n" + String((unsigned long)expirySec);

  // base64-decode the SharedAccessKey
  uint8_t keyBin[64];
  size_t keyBinLen = 0;
  if (mbedtls_base64_decode(keyBin, sizeof(keyBin), &keyBinLen,
                            (const unsigned char*)azureIotSharedAccessKey.c_str(),
                            azureIotSharedAccessKey.length()) != 0) {
    return String();
  }

  // HMAC-SHA256
  uint8_t hmac[32];
  const mbedtls_md_info_t* md = mbedtls_md_info_from_type(MBEDTLS_MD_SHA256);
  mbedtls_md_context_t ctx;
  mbedtls_md_init(&ctx);
  mbedtls_md_setup(&ctx, md, 1);
  mbedtls_md_hmac_starts(&ctx, keyBin, keyBinLen);
  mbedtls_md_hmac_update(&ctx, (const unsigned char*)stringToSign.c_str(), stringToSign.length());
  mbedtls_md_hmac_finish(&ctx, hmac);
  mbedtls_md_free(&ctx);

  // base64-encode the HMAC
  uint8_t sigB64[128];
  size_t sigB64Len = 0;
  mbedtls_base64_encode(sigB64, sizeof(sigB64), &sigB64Len, hmac, sizeof(hmac));
  String sigB64Str((char*)sigB64);
  sigB64Str.remove(sigB64Len);
  String sigEncoded = _azureIotUrlEncode(sigB64Str.c_str());

  return "SharedAccessSignature sr=" + resourceEncoded
       + "&sig=" + sigEncoded
       + "&se=" + String((unsigned long)expirySec);
}

bool azureIotHubInit(const String& connStr) {
  if (!_azureIotParseConnStr(connStr)) {
    Serial.println("[azure_iot] connection string parse failed");
    return false;
  }
  // SDK init
  az_span hostSpan = az_span_create((uint8_t*)azureIotIotHubFQDN, strlen(azureIotIotHubFQDN));
  az_span devSpan  = az_span_create((uint8_t*)azureIotDeviceId,   strlen(azureIotDeviceId));
  if (az_result_failed(az_iot_hub_client_init(&azureIotClient, hostSpan, devSpan, NULL))) {
    Serial.println("[azure_iot] az_iot_hub_client_init failed");
    return false;
  }
  // NTP for SAS expiry timestamp
  configTime(0, 0, "pool.ntp.org", "time.nist.gov");
  unsigned long ntpStart = millis();
  while (time(nullptr) < 1700000000UL && millis() - ntpStart < 15000UL) delay(100);
  if (time(nullptr) < 1700000000UL) {
    Serial.println("[azure_iot] NTP sync timeout");
    return false;
  }
  // TLS root CA
  azureIotSecureClient.setCACert(AZURE_IOT_ROOT_CA);
  azureIotMqttClient.setServer(azureIotIotHubFQDN, 8883);
  azureIotMqttClient.setBufferSize(1024);
  // MQTT username (from SDK)
  char user[256]; size_t userLen;
  if (az_result_failed(az_iot_hub_client_get_user_name(&azureIotClient, user, sizeof(user), &userLen))) {
    return false;
  }
  user[userLen] = 0;
  // SAS token (1 hour expiry)
  uint64_t expiry = (uint64_t)time(nullptr) + 3600;
  String sas = _azureIotGenerateSasToken(expiry);
  if (sas.length() == 0) return false;
  // Connect
  if (!azureIotMqttClient.connect(azureIotDeviceId, user, sas.c_str())) {
    Serial.printf("[azure_iot] MQTT connect failed rc=%d\\n", azureIotMqttClient.state());
    return false;
  }
  // Subscribe to C2D
  azureIotMqttClient.subscribe(AZ_IOT_HUB_CLIENT_C2D_SUBSCRIBE_TOPIC);
  Serial.println("[azure_iot] connected");
  return true;
}

void azureIotHubPublishD2C(const String& payload) {
  if (!azureIotMqttClient.connected()) return;
  char topic[128]; size_t topicLen;
  if (az_result_failed(az_iot_hub_client_telemetry_get_publish_topic(&azureIotClient, NULL, topic, sizeof(topic), &topicLen))) return;
  topic[topicLen] = 0;
  azureIotMqttClient.publish(topic, payload.c_str());
}

void _azureIotMqttCallback(char* topic, byte* payload, unsigned int len) {
  String topicStr(topic);
  String payloadStr;
  payloadStr.reserve(len);
  for (unsigned int i = 0; i < len; i++) payloadStr += (char)payload[i];

  if (topicStr.startsWith("$iothub/methods/POST/")) {
    // Direct Method: $iothub/methods/POST/<methodName>/?$rid=<requestId>
    int methodStart = 21; // strlen("$iothub/methods/POST/")
    int methodEnd = topicStr.indexOf("/", methodStart);
    if (methodEnd < 0) return;
    azureIotDirectMethodName = topicStr.substring(methodStart, methodEnd);
    int ridIdx = topicStr.indexOf("$rid=");
    if (ridIdx >= 0) azureIotDirectMethodRequestId = topicStr.substring(ridIdx + 5);
    azureIotDirectMethodPayload = payloadStr;
    if (_AzureIoTDirectMethodReg::_cb) _AzureIoTDirectMethodReg::_cb();
    // ACK with 200 OK (empty payload)
    String resTopic = "$iothub/methods/res/200/?$rid=" + azureIotDirectMethodRequestId;
    azureIotMqttClient.publish(resTopic.c_str(), "{}");
    azureIotDirectMethodName = "";
    azureIotDirectMethodPayload = "";
    azureIotDirectMethodRequestId = "";
  } else if (topicStr.startsWith("devices/")) {
    // C2D message
    azureIotC2DMessage = payloadStr;
    if (_AzureIoTC2DReg::_cb) _AzureIoTC2DReg::_cb();
    azureIotC2DMessage = "";
  }
}

void azureIotCheckC2D() {
  if (!azureIotMqttClient.connected()) return;
  static bool _cbInstalled = false;
  if (!_cbInstalled) { azureIotMqttClient.setCallback(_azureIotMqttCallback); _cbInstalled = true; }
  azureIotMqttClient.loop();
}

// ----- IoT Central (commit #4-B): DPS provisioning + Hub connect -----

static String _azureIotDpsSasToken(const String& scopeId, const String& deviceId, const String& deviceKeyB64, uint64_t expirySec) {
  // resource_uri = <scopeId>/registrations/<deviceId>
  String resource = scopeId + "/registrations/" + deviceId;
  String resourceEncoded = _azureIotUrlEncode(resource.c_str());
  String stringToSign = resourceEncoded + "\\n" + String((unsigned long)expirySec);

  uint8_t keyBin[64];
  size_t keyBinLen = 0;
  if (mbedtls_base64_decode(keyBin, sizeof(keyBin), &keyBinLen,
                            (const unsigned char*)deviceKeyB64.c_str(), deviceKeyB64.length()) != 0) {
    return String();
  }
  uint8_t hmac[32];
  const mbedtls_md_info_t* md = mbedtls_md_info_from_type(MBEDTLS_MD_SHA256);
  mbedtls_md_context_t ctx;
  mbedtls_md_init(&ctx);
  mbedtls_md_setup(&ctx, md, 1);
  mbedtls_md_hmac_starts(&ctx, keyBin, keyBinLen);
  mbedtls_md_hmac_update(&ctx, (const unsigned char*)stringToSign.c_str(), stringToSign.length());
  mbedtls_md_hmac_finish(&ctx, hmac);
  mbedtls_md_free(&ctx);
  uint8_t sigB64[128];
  size_t sigB64Len = 0;
  mbedtls_base64_encode(sigB64, sizeof(sigB64), &sigB64Len, hmac, sizeof(hmac));
  String sigB64Str((char*)sigB64);
  sigB64Str.remove(sigB64Len);
  String sigEncoded = _azureIotUrlEncode(sigB64Str.c_str());
  return "SharedAccessSignature sr=" + resourceEncoded
       + "&sig=" + sigEncoded
       + "&se=" + String((unsigned long)expirySec)
       + "&skn=registration";
}

// minimal JSON value extractor (returns "" if key not found / type mismatch)
static String _azureIotJsonGet(const String& body, const String& key) {
  String needle = "\\"" + key + "\\"";
  int p = body.indexOf(needle);
  if (p < 0) return "";
  int colon = body.indexOf(":", p + needle.length());
  if (colon < 0) return "";
  int valStart = colon + 1;
  while (valStart < (int)body.length() && (body[valStart] == ' ' || body[valStart] == '\\t' || body[valStart] == '\\n')) valStart++;
  if (valStart >= (int)body.length()) return "";
  if (body[valStart] == '"') {
    int valEnd = body.indexOf('"', valStart + 1);
    if (valEnd < 0) return "";
    return body.substring(valStart + 1, valEnd);
  }
  // bare value
  int valEnd = valStart;
  while (valEnd < (int)body.length() && body[valEnd] != ',' && body[valEnd] != '}' && body[valEnd] != ' ') valEnd++;
  return body.substring(valStart, valEnd);
}

bool azureIotCentralInit(const String& scopeId, const String& deviceId, const String& deviceKey) {
  // NTP for SAS expiry
  configTime(0, 0, "pool.ntp.org", "time.nist.gov");
  unsigned long ntpStart = millis();
  while (time(nullptr) < 1700000000UL && millis() - ntpStart < 15000UL) delay(100);
  if (time(nullptr) < 1700000000UL) return false;

  WiFiClientSecure dpsClient;
  dpsClient.setCACert(AZURE_IOT_ROOT_CA);
  HTTPClient http;
  http.setTimeout(15000);
  uint64_t expiry = (uint64_t)time(nullptr) + 3600;
  String dpsSas = _azureIotDpsSasToken(scopeId, deviceId, deviceKey, expiry);
  if (dpsSas.length() == 0) return false;

  // 1. PUT register
  String regUrl = "https://global.azure-devices-provisioning.net/" + scopeId + "/registrations/" + deviceId + "/register?api-version=2021-06-01";
  if (!http.begin(dpsClient, regUrl)) return false;
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Authorization", dpsSas);
  String regBody = "{\\"registrationId\\":\\"" + deviceId + "\\"}";
  int regCode = http.PUT(regBody);
  String regResp = (regCode > 0) ? http.getString() : String();
  http.end();
  if (regCode != 202) {
    Serial.printf("[azure_iot_central] register HTTP %d\\n", regCode);
    return false;
  }
  String operationId = _azureIotJsonGet(regResp, "operationId");
  if (operationId.length() == 0) return false;

  // 2. Poll status until "assigned" (max 30s)
  String statusUrl = "https://global.azure-devices-provisioning.net/" + scopeId + "/registrations/" + deviceId + "/operations/" + operationId + "?api-version=2021-06-01";
  String assignedHub;
  for (int attempt = 0; attempt < 10 && assignedHub.length() == 0; attempt++) {
    delay(2000);
    if (!http.begin(dpsClient, statusUrl)) return false;
    http.addHeader("Authorization", dpsSas);
    int statusCode = http.GET();
    String statusResp = (statusCode > 0) ? http.getString() : String();
    http.end();
    if (statusCode != 200) continue;
    String statusVal = _azureIotJsonGet(statusResp, "status");
    if (statusVal == "assigned") {
      assignedHub = _azureIotJsonGet(statusResp, "assignedHub");
    }
  }
  if (assignedHub.length() == 0) {
    Serial.println("[azure_iot_central] DPS provisioning timed out");
    return false;
  }
  // 3. Build connection string and dispatch to Hub init
  String connStr = "HostName=" + assignedHub + ";DeviceId=" + deviceId + ";SharedAccessKey=" + deviceKey;
  bool ok = azureIotHubInit(connStr);
  if (ok) {
    // Subscribe to Direct Method + Device Twin patches
    azureIotMqttClient.subscribe("$iothub/methods/POST/#");
  }
  return ok;
}

void azureIotCentralPublish(const String& key, const String& value) {
  String payload = "{\\"" + key + "\\":\\"" + value + "\\"}";
  azureIotHubPublishD2C(payload);
}

void azureIotSubscribeDirectMethod() {
  if (!azureIotMqttClient.connected()) return;
  azureIotMqttClient.subscribe("$iothub/methods/POST/#");
}

void azureIotUpdateDeviceTwin(const String& key, const String& value) {
  if (!azureIotMqttClient.connected()) return;
  String requestId = String((unsigned long)millis(), HEX);
  char topic[160]; size_t topicLen;
  az_span ridSpan = az_span_create((uint8_t*)requestId.c_str(), requestId.length());
  if (az_result_failed(az_iot_hub_client_twin_patch_get_publish_topic(&azureIotClient, ridSpan, topic, sizeof(topic), &topicLen))) return;
  topic[topicLen] = 0;
  String payload = "{\\"" + key + "\\":\\"" + value + "\\"}";
  azureIotMqttClient.publish(topic, payload.c_str());
}
`;

// ============================================================================
// Block 定義
// ============================================================================

/**
 * azure_iot_hub_connect — Azure IoT Hub に接続 (Boolean output)
 */
Blockly.Blocks['azure_iot_hub_connect'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('☁️ ' + (Blockly.Msg.BLOCKS_AZURE_IOT_HUB_CONNECT || 'Azure IoT Hub に接続'));
    this.appendValueInput('CONNECTION_STRING')
        .setCheck('String')
        .appendField(Blockly.Msg.BLOCKS_AZURE_IOT_CONNECTION_STRING || '接続文字列');
    this.setOutput(true, 'Boolean');
    this.setColour(AZURE_IOT_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_AZURE_IOT_HUB_CONNECT_TOOLTIP || 'Azure IoT Hub に接続文字列で接続します。WiFi 接続済が前提です。成功時 true を返します。');
  }
};

generator.forBlock['azure_iot_hub_connect'] = function(block: Blockly.Block) {
  const cs = generator.valueToCode(block, 'CONNECTION_STRING', Order.ATOMIC) || '""';
  generator.definitions_['include_azure_iot'] = AZURE_IOT_INCLUDE;
  generator.definitions_['azure_iot_globals'] = AZURE_IOT_GLOBALS;
  generator.definitions_['azure_iot_globals_cb'] = AZURE_IOT_GLOBALS_CB;
  generator.definitions_['azure_iot_helpers'] = AZURE_IOT_HELPERS;
  return [`azureIotHubInit(${cs})`, Order.FUNCTION_CALL];
};

/**
 * azure_iot_hub_publish_d2c — Azure IoT Hub にテレメトリ送信 (statement)
 */
Blockly.Blocks['azure_iot_hub_publish_d2c'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('☁️ ' + (Blockly.Msg.BLOCKS_AZURE_IOT_HUB_PUBLISH_D2C || 'Azure IoT Hub にテレメトリ送信'));
    this.appendValueInput('PAYLOAD')
        .appendField(Blockly.Msg.BLOCKS_AZURE_IOT_PAYLOAD || 'ペイロード');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(AZURE_IOT_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_AZURE_IOT_HUB_PUBLISH_D2C_TOOLTIP || 'Azure IoT Hub に Device-to-Cloud (D2C) メッセージを送信します。事前に接続が必要です。JSON 文字列を渡すのが一般的です。');
  }
};

generator.forBlock['azure_iot_hub_publish_d2c'] = function(block: Blockly.Block) {
  const payload = generator.valueToCode(block, 'PAYLOAD', Order.ATOMIC) || '""';
  generator.definitions_['include_azure_iot'] = AZURE_IOT_INCLUDE;
  generator.definitions_['azure_iot_globals'] = AZURE_IOT_GLOBALS;
  generator.definitions_['azure_iot_globals_cb'] = AZURE_IOT_GLOBALS_CB;
  generator.definitions_['azure_iot_helpers'] = AZURE_IOT_HELPERS;
  return `azureIotHubPublishD2C(String(${payload}));\n`;
};

/**
 * azure_iot_hub_on_c2d — Azure IoT Hub から C2D メッセージを受信したら (HANDLER)
 * loopPre_ パターン (post-U5 lesson、`rules/digicode/03-block-workflow.md` § Loop-side dedupe)
 */
Blockly.Blocks['azure_iot_hub_on_c2d'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('☁️ ' + (Blockly.Msg.BLOCKS_AZURE_IOT_HUB_ON_C2D || 'Azure IoT Hub からメッセージを受信したら'));
    this.appendStatementInput('HANDLER')
        .setCheck(null)
        .appendField(Blockly.Msg.BLOCKS_AZURE_IOT_HANDLER || 'ハンドラ');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(AZURE_IOT_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_AZURE_IOT_HUB_ON_C2D_TOOLTIP || 'Azure IoT Hub から Cloud-to-Device (C2D) メッセージを受信したときの処理を定義します。HANDLER 内で「受信メッセージ」ブロックで値が取得できます。arduino_loop の中に配置してください。');
  }
};

generator.forBlock['azure_iot_hub_on_c2d'] = function(block: Blockly.Block) {
  const handler = javascriptGenerator.statementToCode(block, 'HANDLER');
  generator.definitions_['include_azure_iot'] = AZURE_IOT_INCLUDE;
  generator.definitions_['azure_iot_globals'] = AZURE_IOT_GLOBALS;
  generator.definitions_['azure_iot_globals_cb'] = AZURE_IOT_GLOBALS_CB;
  generator.definitions_['azure_iot_helpers'] = AZURE_IOT_HELPERS;
  // handler 関数 + static-init register (dedupe via key)
  generator.definitions_['azure_iot_c2d_handler_func'] = `
void azureIotHandleC2D() {
${handler}}
static _AzureIoTC2DReg _azureIotC2DReg(azureIotHandleC2D);`;
  // loopPre_ で 1 回だけ tick (N handler でも 1 回、placement 不要)
  if (!generator.loopPre_) generator.loopPre_ = {};
  generator.loopPre_['azure_iot_check_c2d'] = '  azureIotCheckC2D();';
  return '';
};

/**
 * azure_iot_received_value — Azure IoT 受信メッセージ取得 (String output)
 * HANDLER 内のみ valid (HANDLER 外では空文字列)
 */
Blockly.Blocks['azure_iot_received_value'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('☁️ ' + (Blockly.Msg.BLOCKS_AZURE_IOT_RECEIVED_VALUE || 'Azure IoT 受信メッセージ'));
    this.setOutput(true, 'String');
    this.setColour(AZURE_IOT_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_AZURE_IOT_RECEIVED_VALUE_TOOLTIP || 'Azure IoT Hub の C2D ハンドラ内で受信メッセージを取得します。HANDLER 外で使うと空文字列を返します。');
  }
};

generator.forBlock['azure_iot_received_value'] = function() {
  generator.definitions_['include_azure_iot'] = AZURE_IOT_INCLUDE;
  generator.definitions_['azure_iot_globals'] = AZURE_IOT_GLOBALS;
  generator.definitions_['azure_iot_globals_cb'] = AZURE_IOT_GLOBALS_CB;
  return ['azureIotC2DMessage', Order.ATOMIC];
};

// ============================================================================
// commit #4-B: Azure IoT Central (DPS provisioning) + Direct Method + Device Twin
// ============================================================================

/**
 * azure_iot_central_connect — Azure IoT Central に接続 (Boolean)
 * 内部で DPS provisioning → assigned hub に MQTT TLS 接続。
 */
Blockly.Blocks['azure_iot_central_connect'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('☁️ ' + (Blockly.Msg.BLOCKS_AZURE_IOT_CENTRAL_CONNECT || 'Azure IoT Central に接続'));
    this.appendValueInput('SCOPE_ID')
        .setCheck('String')
        .appendField(Blockly.Msg.BLOCKS_AZURE_IOT_SCOPE_ID || 'Scope ID');
    this.appendValueInput('DEVICE_ID')
        .setCheck('String')
        .appendField(Blockly.Msg.BLOCKS_AZURE_IOT_DEVICE_ID || 'Device ID');
    this.appendValueInput('DEVICE_KEY')
        .setCheck('String')
        .appendField(Blockly.Msg.BLOCKS_AZURE_IOT_DEVICE_KEY || 'Device Key');
    this.setOutput(true, 'Boolean');
    this.setColour(AZURE_IOT_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_AZURE_IOT_CENTRAL_CONNECT_TOOLTIP || 'Azure IoT Central に接続します。Scope ID / Device ID / Device Key は IoT Central デバイス画面で取得できます。内部で DPS 経由で IoT Hub に登録されます。WiFi 接続済が前提です。');
  }
};

generator.forBlock['azure_iot_central_connect'] = function(block: Blockly.Block) {
  const scope = generator.valueToCode(block, 'SCOPE_ID', Order.ATOMIC) || '""';
  const dev = generator.valueToCode(block, 'DEVICE_ID', Order.ATOMIC) || '""';
  const key = generator.valueToCode(block, 'DEVICE_KEY', Order.ATOMIC) || '""';
  generator.definitions_['include_azure_iot'] = AZURE_IOT_INCLUDE;
  generator.definitions_['azure_iot_globals'] = AZURE_IOT_GLOBALS;
  generator.definitions_['azure_iot_globals_cb'] = AZURE_IOT_GLOBALS_CB;
  generator.definitions_['azure_iot_helpers'] = AZURE_IOT_HELPERS;
  return [`azureIotCentralInit(${scope}, ${dev}, ${key})`, Order.FUNCTION_CALL];
};

/**
 * azure_iot_central_publish — IoT Central に key/value 形式で送信 (statement)
 */
Blockly.Blocks['azure_iot_central_publish'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('☁️ ' + (Blockly.Msg.BLOCKS_AZURE_IOT_CENTRAL_PUBLISH || 'Azure IoT Central に送信'));
    this.appendValueInput('KEY')
        .setCheck('String')
        .appendField(Blockly.Msg.BLOCKS_AZURE_IOT_KEY || 'キー');
    this.appendValueInput('VALUE')
        .appendField(Blockly.Msg.BLOCKS_AZURE_IOT_VALUE || '値');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(AZURE_IOT_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_AZURE_IOT_CENTRAL_PUBLISH_TOOLTIP || 'Azure IoT Central にキー/値ペアでテレメトリを送信します (内部 JSON 化)。事前に接続が必要です。');
  }
};

generator.forBlock['azure_iot_central_publish'] = function(block: Blockly.Block) {
  const key = generator.valueToCode(block, 'KEY', Order.ATOMIC) || '""';
  const value = generator.valueToCode(block, 'VALUE', Order.ATOMIC) || '""';
  generator.definitions_['include_azure_iot'] = AZURE_IOT_INCLUDE;
  generator.definitions_['azure_iot_globals'] = AZURE_IOT_GLOBALS;
  generator.definitions_['azure_iot_globals_cb'] = AZURE_IOT_GLOBALS_CB;
  generator.definitions_['azure_iot_helpers'] = AZURE_IOT_HELPERS;
  return `azureIotCentralPublish(${key}, String(${value}));\n`;
};

/**
 * azure_iot_subscribe_direct_method — Direct Method 受信ハンドラ (loopPre_)
 * 全 Direct Method 名で発火、HANDLER 内で azure_iot_received_value で payload 取得。
 */
Blockly.Blocks['azure_iot_subscribe_direct_method'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('☁️ ' + (Blockly.Msg.BLOCKS_AZURE_IOT_SUBSCRIBE_DIRECT_METHOD || 'Direct Method を受信したら'));
    this.appendStatementInput('HANDLER')
        .setCheck(null)
        .appendField(Blockly.Msg.BLOCKS_AZURE_IOT_HANDLER || 'ハンドラ');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(AZURE_IOT_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_AZURE_IOT_SUBSCRIBE_DIRECT_METHOD_TOOLTIP || 'Azure IoT の Direct Method 呼び出しを受信したときの処理を定義します。HANDLER 内で「受信メッセージ」ブロックで payload (JSON) が取得できます。arduino_loop の中に配置してください。');
  }
};

generator.forBlock['azure_iot_subscribe_direct_method'] = function(block: Blockly.Block) {
  const handler = javascriptGenerator.statementToCode(block, 'HANDLER');
  generator.definitions_['include_azure_iot'] = AZURE_IOT_INCLUDE;
  generator.definitions_['azure_iot_globals'] = AZURE_IOT_GLOBALS;
  generator.definitions_['azure_iot_globals_cb'] = AZURE_IOT_GLOBALS_CB;
  generator.definitions_['azure_iot_helpers'] = AZURE_IOT_HELPERS;
  generator.definitions_['azure_iot_direct_method_handler'] = `
void azureIotHandleDirectMethod() {
${handler}}
static _AzureIoTDirectMethodReg _azureIotDirectMethodReg(azureIotHandleDirectMethod);`;
  // Subscribe at setup time (idempotent on reconnect via callback); also
  // ensure C2D loop tick is registered so MQTT loop runs.
  if (!generator.setups_) generator.setups_ = {};
  generator.setups_['azure_iot_subscribe_direct_method'] = '/* azure_iot_subscribe_direct_method: subscribe occurs inside azureIotHubInit/azureIotCentralInit */';
  if (!generator.loopPre_) generator.loopPre_ = {};
  generator.loopPre_['azure_iot_check_c2d'] = '  azureIotCheckC2D();';
  return '';
};

/**
 * azure_iot_update_device_twin — Device Twin reported プロパティ更新 (statement)
 */
Blockly.Blocks['azure_iot_update_device_twin'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('☁️ ' + (Blockly.Msg.BLOCKS_AZURE_IOT_UPDATE_DEVICE_TWIN || 'Device Twin を更新'));
    this.appendValueInput('KEY')
        .setCheck('String')
        .appendField(Blockly.Msg.BLOCKS_AZURE_IOT_KEY || 'キー');
    this.appendValueInput('VALUE')
        .appendField(Blockly.Msg.BLOCKS_AZURE_IOT_VALUE || '値');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(AZURE_IOT_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_AZURE_IOT_UPDATE_DEVICE_TWIN_TOOLTIP || 'Azure IoT の Device Twin reported プロパティを更新します。事前に接続が必要です。');
  }
};

generator.forBlock['azure_iot_update_device_twin'] = function(block: Blockly.Block) {
  const key = generator.valueToCode(block, 'KEY', Order.ATOMIC) || '""';
  const value = generator.valueToCode(block, 'VALUE', Order.ATOMIC) || '""';
  generator.definitions_['include_azure_iot'] = AZURE_IOT_INCLUDE;
  generator.definitions_['azure_iot_globals'] = AZURE_IOT_GLOBALS;
  generator.definitions_['azure_iot_globals_cb'] = AZURE_IOT_GLOBALS_CB;
  generator.definitions_['azure_iot_helpers'] = AZURE_IOT_HELPERS;
  return `azureIotUpdateDeviceTwin(${key}, String(${value}));\n`;
};

// ============================================================================
// commit #4-C: azure_iot_is_connected (Boolean output)
// ============================================================================

/**
 * azure_iot_is_connected — Azure IoT 接続状態 (Boolean output)
 * azureIotMqttClient.connected() を返す。Hub / Central どちらの接続にも有効。
 */
Blockly.Blocks['azure_iot_is_connected'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('☁️ ' + (Blockly.Msg.BLOCKS_AZURE_IOT_IS_CONNECTED || 'Azure IoT 接続中'));
    this.setOutput(true, 'Boolean');
    this.setColour(AZURE_IOT_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_AZURE_IOT_IS_CONNECTED_TOOLTIP || 'Azure IoT Hub / IoT Central との MQTT 接続が維持されている場合 true を返します。WiFi 切断や TLS タイムアウト時に false になります。');
  }
};

generator.forBlock['azure_iot_is_connected'] = function() {
  generator.definitions_['include_azure_iot'] = AZURE_IOT_INCLUDE;
  generator.definitions_['azure_iot_globals'] = AZURE_IOT_GLOBALS;
  generator.definitions_['azure_iot_globals_cb'] = AZURE_IOT_GLOBALS_CB;
  return ['azureIotMqttClient.connected()', Order.FUNCTION_CALL];
};
