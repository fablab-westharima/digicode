/*
 * DigiCode - Block-based ESP32 Programming Tool
 * Copyright (C) 2024-2026 DigiCo LLC
 *
 * Licensed under the GNU Affero General Public License version 3 or later.
 * See LICENSE file in the repository root for full terms.
 */

/**
 * ArduinoHA統合ブロック - Home Assistant Auto Discovery対応
 * home-assistant-integrationライブラリ（ArduinoHA）を使用
 *
 * i18n: Uses Blockly.Msg.* for dynamic language switching
 */
import * as Blockly from 'blockly';
import { javascriptGenerator, Order } from 'blockly/javascript';

// 型アサーション用のヘルパー
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const generator = javascriptGenerator as any;

// BUG-057: Every HA block — even ha_xxx_create used without ha_device_init —
// emits a global declaration referencing ArduinoHA classes (HASensorNumber,
// HALight, HAFan, ...). Without <ArduinoHA.h> the type is unknown and the
// build dies with "'X' does not name a type" before the user code runs.
// All 43 HA forBlock generators call this idempotent helper at the top so
// the include is always present whenever any HA block is used.
function ensureArduinoHAInclude() {
  generator.definitions_['include_arduinoha'] = '#include <ArduinoHA.h>';
}

// post-Phase 4-4 commit 2-6 (case_0266-0302 fix): HA 11 entity の operation
// block (ha_<entity>_update / on_command / set_state / state / value / etc) は
// それぞれ ha_<entity>_create が declare する entity instance (haSensor_<id> /
// haSwitch_<id> / haLight_<id> 等) を参照する。Phase 4-4 で _create 不在 +
// operation 単独配置の 25 case が `'ha<Entity>_<id>' was not declared` で fail。
//
// 各 operation block forBlock 冒頭で対応する ensureHa<Entity>Default(id) helper
// を呼び、_create と同 definitions_ key で conditional default declare。
// Order analysis (generator.definitions_ last-write-wins):
//  - ha_<entity>_create alone, before operation → unconditional 値あり →
//                                                  helper guard skip → user 設定 (Name/DeviceClass/Unit/etc) 維持
//  - ha_<entity>_create after operation         → operation default 先 →
//                                                  ha_<entity>_create unconditional override → user 設定維持
//  - operation alone (_create 不在)             → default 値で compile pass
//
// commit 2-6 = 最大 cluster (25/77 = 32%)、case_0266-0302 全件解消。
// See rules/digicode/03-block-workflow.md "Init block protocol".
function ensureHaSensorDefault(sensorId: string) {
  if (!generator.definitions_[`ha_sensor_${sensorId}`]) {
    const varName = `haSensor_${sensorId.replace(/[^a-zA-Z0-9]/g, '_')}`;
    generator.definitions_[`ha_sensor_${sensorId}`] = `HASensorNumber ${varName}("${sensorId}", HASensorNumber::PrecisionP1);`;
  }
}
function ensureHaBinarySensorDefault(sensorId: string) {
  if (!generator.definitions_[`ha_binary_sensor_${sensorId}`]) {
    const varName = `haBinarySensor_${sensorId.replace(/[^a-zA-Z0-9]/g, '_')}`;
    generator.definitions_[`ha_binary_sensor_${sensorId}`] = `HABinarySensor ${varName}("${sensorId}");`;
  }
}
function ensureHaSwitchDefault(switchId: string) {
  if (!generator.definitions_[`ha_switch_${switchId}`]) {
    const varName = `haSwitch_${switchId.replace(/[^a-zA-Z0-9]/g, '_')}`;
    generator.definitions_[`ha_switch_${switchId}`] = `HASwitch ${varName}("${switchId}");`;
  }
}
function ensureHaLightDefault(lightId: string) {
  if (!generator.definitions_[`ha_light_${lightId}`]) {
    const varName = `haLight_${lightId.replace(/[^a-zA-Z0-9]/g, '_')}`;
    // Default = BrightnessFeature (ha_light_create 'BRIGHTNESS' default 'TRUE' と一致)
    generator.definitions_[`ha_light_${lightId}`] = `HALight ${varName}("${lightId}", HALight::BrightnessFeature);`;
  }
}
function ensureHaLightRgbDefault(lightId: string) {
  if (!generator.definitions_[`ha_light_${lightId}`]) {
    const varName = `haLight_${lightId.replace(/[^a-zA-Z0-9]/g, '_')}`;
    generator.definitions_[`ha_light_${lightId}`] = `HALight ${varName}("${lightId}", HALight::BrightnessFeature | HALight::RGBFeature);`;
  }
}
function ensureHaNumberDefault(numberId: string) {
  if (!generator.definitions_[`ha_number_${numberId}`]) {
    const varName = `haNumber_${numberId.replace(/[^a-zA-Z0-9]/g, '_')}`;
    generator.definitions_[`ha_number_${numberId}`] = `HANumber ${varName}("${numberId}", HANumber::PrecisionP1);`;
  }
}
function ensureHaFanDefault(fanId: string) {
  if (!generator.definitions_[`ha_fan_${fanId}`]) {
    const varName = `haFan_${fanId.replace(/[^a-zA-Z0-9]/g, '_')}`;
    // Default = SpeedsFeature (ha_fan_create 'SPEEDS' default 'TRUE' と一致)
    generator.definitions_[`ha_fan_${fanId}`] = `HAFan ${varName}("${fanId}", HAFan::SpeedsFeature);`;
  }
}
function ensureHaCoverDefault(coverId: string) {
  if (!generator.definitions_[`ha_cover_${coverId}`]) {
    const varName = `haCover_${coverId.replace(/[^a-zA-Z0-9]/g, '_')}`;
    generator.definitions_[`ha_cover_${coverId}`] = `HACover ${varName}("${coverId}");`;
  }
}
function ensureHaButtonDefault(buttonId: string) {
  if (!generator.definitions_[`ha_button_${buttonId}`]) {
    const varName = `haButton_${buttonId.replace(/[^a-zA-Z0-9]/g, '_')}`;
    generator.definitions_[`ha_button_${buttonId}`] = `HAButton ${varName}("${buttonId}");`;
  }
}
function ensureHaDeviceTriggerDefault(triggerId: string) {
  if (!generator.definitions_[`ha_trigger_${triggerId}`]) {
    const varName = `haTrigger_${triggerId.replace(/[^a-zA-Z0-9]/g, '_')}`;
    // Default = ('button', 'default') = ha_device_trigger_create 'TYPE' default 'button'
    generator.definitions_[`ha_trigger_${triggerId}`] = `HADeviceTrigger ${varName}("button", "default");`;
  }
}
function ensureHaSceneDefault(sceneId: string) {
  if (!generator.definitions_[`ha_scene_${sceneId}`]) {
    const varName = `haScene_${sceneId.replace(/[^a-zA-Z0-9]/g, '_')}`;
    generator.definitions_[`ha_scene_${sceneId}`] = `HAScene ${varName}("${sceneId}");`;
  }
}
function ensureHaTagScannerDefault(scannerId: string) {
  if (!generator.definitions_[`ha_tag_scanner_${scannerId}`]) {
    const varName = `haTagScanner_${scannerId.replace(/[^a-zA-Z0-9]/g, '_')}`;
    generator.definitions_[`ha_tag_scanner_${scannerId}`] = `HATagScanner ${varName}("${scannerId}");`;
  }
}

// Global var helpers (ha_light_state / brightness / r/g/b、ha_number_value、
// ha_fan_state / speed) — declared by callback (_on_command / _on_rgb_command)
// blocks; output blocks reference them. operation block 単独配置で fail 防御。
function ensureHaLightStateVars() {
  if (!generator.definitions_['ha_light_state_var']) {
    generator.definitions_['ha_light_state_var'] = 'bool ha_light_state = false;';
  }
  if (!generator.definitions_['ha_light_brightness_var']) {
    generator.definitions_['ha_light_brightness_var'] = 'uint8_t ha_light_brightness = 0;';
  }
}
function ensureHaLightRgbVars() {
  if (!generator.definitions_['ha_light_rgb_vars']) {
    generator.definitions_['ha_light_rgb_vars'] = `uint8_t ha_light_r = 0;
uint8_t ha_light_g = 0;
uint8_t ha_light_b = 0;`;
  }
}
function ensureHaNumberValueVar() {
  if (!generator.definitions_['ha_number_value_var']) {
    generator.definitions_['ha_number_value_var'] = 'float ha_number_value = 0;';
  }
}
function ensureHaFanStateVars() {
  if (!generator.definitions_['ha_fan_state_var']) {
    generator.definitions_['ha_fan_state_var'] = 'bool ha_fan_state = false;';
  }
  if (!generator.definitions_['ha_fan_speed_var']) {
    generator.definitions_['ha_fan_speed_var'] = 'uint16_t ha_fan_speed = 0;';
  }
}

// ===== デバイス初期化 =====

/**
 * ha_device_init - Home Assistantデバイス初期化
 */
Blockly.Blocks['ha_device_init'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🏠 ' + (Blockly.Msg.BLOCKS_HA_DEVICEINIT || 'HA Device Init'));
    this.appendDummyInput()
        .appendField('WiFi SSID')
        .appendField(new Blockly.FieldTextInput('your_ssid'), 'SSID');
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_WIFI_PASSWORD || 'WiFi Password')
        .appendField(new Blockly.FieldTextInput('your_password'), 'WIFI_PASS');
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_MQTT_BROKER || 'MQTT Broker')
        .appendField(new Blockly.FieldTextInput('192.168.1.100'), 'BROKER');
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_PORT || 'Port')
        .appendField(new Blockly.FieldNumber(1883, 1, 65535), 'PORT');
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_HA_DEVICENAME || 'Device Name')
        .appendField(new Blockly.FieldTextInput('ESP32センサー'), 'DEVICE_NAME');
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_HA_DEVICEID || 'Device ID')
        .appendField(new Blockly.FieldTextInput('esp32_sensor'), 'DEVICE_ID');
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_HA_MANUFACTURER || 'Manufacturer')
        .appendField(new Blockly.FieldTextInput('Digi Co LLC'), 'MANUFACTURER');
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_HA_MODEL || 'Model')
        .appendField(new Blockly.FieldTextInput('ESP32'), 'MODEL');
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_HA_SOFTWAREVERSION || 'Software Version')
        .appendField(new Blockly.FieldTextInput('1.0.0'), 'SOFTWARE_VERSION');
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_HA_AUTOUNIQUEID || 'Auto deviceId (MAC)')
        .appendField(new Blockly.FieldCheckbox('TRUE'), 'AUTO_UNIQUE_ID');
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_HA_AVAILABILITY || 'Availability (LWT)')
        .appendField(new Blockly.FieldCheckbox('TRUE'), 'AVAILABILITY');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour('#4CAF50');
    this.setTooltip(Blockly.Msg.BLOCKS_HA_DEVICEINITTOOLTIP || 'Initialize a device that auto-registers with Home Assistant. Manufacturer/Model/Software Version appear on HA Devices page. Auto deviceId (MAC) avoids collisions across multiple ESP32. Availability (LWT) marks the device Unavailable in HA UI on disconnect.');
  }
};

javascriptGenerator.forBlock['ha_device_init'] = function(block: Blockly.Block) {
  ensureArduinoHAInclude();
  const ssid = block.getFieldValue('SSID');
  const wifiPass = block.getFieldValue('WIFI_PASS');
  const broker = block.getFieldValue('BROKER');
  const port = block.getFieldValue('PORT');
  const deviceName = block.getFieldValue('DEVICE_NAME');
  const deviceId = block.getFieldValue('DEVICE_ID');
  const manufacturer = block.getFieldValue('MANUFACTURER') || 'Digi Co LLC';
  const model = block.getFieldValue('MODEL') || 'ESP32';
  const softwareVersion = block.getFieldValue('SOFTWARE_VERSION') || '1.0.0';
  const autoUniqueId = block.getFieldValue('AUTO_UNIQUE_ID') === 'TRUE';
  const availability = block.getFieldValue('AVAILABILITY') === 'TRUE';

  // インクルードとグローバル変数
  generator.definitions_['include_wifi'] = '#include <WiFi.h>';
  generator.definitions_['include_arduinoha'] = '#include <ArduinoHA.h>';
  generator.definitions_['ha_wifi_client'] = 'WiFiClient haClient;';
  generator.definitions_['ha_device'] = `HADevice haDevice("${deviceId}");`;
  generator.definitions_['ha_mqtt'] = 'HAMqtt haMqtt(haClient, haDevice);';
  generator.definitions_['ha_ssid'] = `const char* ha_ssid = "${ssid}";`;
  generator.definitions_['ha_wifi_pass'] = `const char* ha_wifi_pass = "${wifiPass}";`;
  generator.definitions_['ha_broker'] = `const char* ha_broker = "${broker}";`;
  generator.definitions_['ha_port'] = `const uint16_t ha_port = ${port};`;

  // WiFi接続関数
  generator.definitions_['ha_wifi_connect_func'] = `
void haWifiConnect() {
  Serial.print("WiFi connecting to ");
  Serial.println(ha_ssid);
  WiFi.begin(ha_ssid, ha_wifi_pass);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("");
  Serial.print("WiFi connected. IP: ");
  Serial.println(WiFi.localIP());
}`;

  // commit 2: connect WiFi first so the WiFi peripheral is fully initialised,
  // then read MAC (eFuse-backed, but safer post-init), then call HADevice
  // setters. setUniqueId / enableSharedAvailability MUST happen before
  // haMqtt.begin so the MQTT Discovery payload picks them up.
  let body = '  // HA Device Init\n';
  body += `  haWifiConnect();\n`;
  if (autoUniqueId) {
    body += `  uint8_t _haMac[6];\n`;
    body += `  WiFi.macAddress(_haMac);\n`;
    body += `  haDevice.setUniqueId(_haMac, 6);\n`;
  }
  body += `  haDevice.setName("${deviceName}");\n`;
  body += `  haDevice.setManufacturer("${manufacturer}");\n`;
  body += `  haDevice.setModel("${model}");\n`;
  body += `  haDevice.setSoftwareVersion("${softwareVersion}");\n`;
  if (availability) {
    body += `  haDevice.enableSharedAvailability();\n`;
    body += `  haDevice.enableLastWill();\n`;
  }
  body += `  haMqtt.begin(ha_broker, ha_port);\n`;
  return body;
};

/**
 * ha_device_init_auth - 認証付きHome Assistantデバイス初期化
 */
Blockly.Blocks['ha_device_init_auth'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🔐 ' + (Blockly.Msg.BLOCKS_HA_DEVICEINITAUTH || 'HA Device Init (Auth)'));
    this.appendDummyInput()
        .appendField('WiFi SSID')
        .appendField(new Blockly.FieldTextInput('your_ssid'), 'SSID');
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_WIFI_PASSWORD || 'WiFi Password')
        .appendField(new Blockly.FieldTextInput('your_password'), 'WIFI_PASS');
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_MQTT_BROKER || 'MQTT Broker')
        .appendField(new Blockly.FieldTextInput('192.168.1.100'), 'BROKER');
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_PORT || 'Port')
        .appendField(new Blockly.FieldNumber(1883, 1, 65535), 'PORT');
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_MQTT_USER || 'MQTT User')
        .appendField(new Blockly.FieldTextInput(''), 'MQTT_USER');
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_MQTT_PASSWORD || 'MQTT Password')
        .appendField(new Blockly.FieldTextInput(''), 'MQTT_PASS');
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_HA_DEVICENAME || 'Device Name')
        .appendField(new Blockly.FieldTextInput('ESP32センサー'), 'DEVICE_NAME');
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_HA_DEVICEID || 'Device ID')
        .appendField(new Blockly.FieldTextInput('esp32_sensor'), 'DEVICE_ID');
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_HA_MANUFACTURER || 'Manufacturer')
        .appendField(new Blockly.FieldTextInput('Digi Co LLC'), 'MANUFACTURER');
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_HA_MODEL || 'Model')
        .appendField(new Blockly.FieldTextInput('ESP32'), 'MODEL');
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_HA_SOFTWAREVERSION || 'Software Version')
        .appendField(new Blockly.FieldTextInput('1.0.0'), 'SOFTWARE_VERSION');
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_HA_AUTOUNIQUEID || 'Auto deviceId (MAC)')
        .appendField(new Blockly.FieldCheckbox('TRUE'), 'AUTO_UNIQUE_ID');
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_HA_AVAILABILITY || 'Availability (LWT)')
        .appendField(new Blockly.FieldCheckbox('TRUE'), 'AVAILABILITY');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour('#4CAF50');
    this.setTooltip(Blockly.Msg.BLOCKS_HA_DEVICEINITAUTHTOOLTIP || 'Initialize HA device with MQTT authentication. Manufacturer/Model/Software Version appear on HA Devices page. Auto deviceId (MAC) avoids collisions across multiple ESP32. Availability (LWT) marks the device Unavailable in HA UI on disconnect.');
  }
};

javascriptGenerator.forBlock['ha_device_init_auth'] = function(block: Blockly.Block) {
  ensureArduinoHAInclude();
  const ssid = block.getFieldValue('SSID');
  const wifiPass = block.getFieldValue('WIFI_PASS');
  const broker = block.getFieldValue('BROKER');
  const port = block.getFieldValue('PORT');
  const mqttUser = block.getFieldValue('MQTT_USER');
  const mqttPass = block.getFieldValue('MQTT_PASS');
  const deviceName = block.getFieldValue('DEVICE_NAME');
  const deviceId = block.getFieldValue('DEVICE_ID');
  const manufacturer = block.getFieldValue('MANUFACTURER') || 'Digi Co LLC';
  const model = block.getFieldValue('MODEL') || 'ESP32';
  const softwareVersion = block.getFieldValue('SOFTWARE_VERSION') || '1.0.0';
  const autoUniqueId = block.getFieldValue('AUTO_UNIQUE_ID') === 'TRUE';
  const availability = block.getFieldValue('AVAILABILITY') === 'TRUE';

  generator.definitions_['include_wifi'] = '#include <WiFi.h>';
  generator.definitions_['include_arduinoha'] = '#include <ArduinoHA.h>';
  generator.definitions_['ha_wifi_client'] = 'WiFiClient haClient;';
  generator.definitions_['ha_device'] = `HADevice haDevice("${deviceId}");`;
  generator.definitions_['ha_mqtt'] = 'HAMqtt haMqtt(haClient, haDevice);';
  generator.definitions_['ha_ssid'] = `const char* ha_ssid = "${ssid}";`;
  generator.definitions_['ha_wifi_pass'] = `const char* ha_wifi_pass = "${wifiPass}";`;
  generator.definitions_['ha_broker'] = `const char* ha_broker = "${broker}";`;
  generator.definitions_['ha_port'] = `const uint16_t ha_port = ${port};`;

  generator.definitions_['ha_wifi_connect_func'] = `
void haWifiConnect() {
  Serial.print("WiFi connecting to ");
  Serial.println(ha_ssid);
  WiFi.begin(ha_ssid, ha_wifi_pass);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("");
  Serial.print("WiFi connected. IP: ");
  Serial.println(WiFi.localIP());
}`;

  let body = '  // HA Device Init with Auth\n';
  body += `  haWifiConnect();\n`;
  if (autoUniqueId) {
    body += `  uint8_t _haMac[6];\n`;
    body += `  WiFi.macAddress(_haMac);\n`;
    body += `  haDevice.setUniqueId(_haMac, 6);\n`;
  }
  body += `  haDevice.setName("${deviceName}");\n`;
  body += `  haDevice.setManufacturer("${manufacturer}");\n`;
  body += `  haDevice.setModel("${model}");\n`;
  body += `  haDevice.setSoftwareVersion("${softwareVersion}");\n`;
  if (availability) {
    body += `  haDevice.enableSharedAvailability();\n`;
    body += `  haDevice.enableLastWill();\n`;
  }
  body += `  haMqtt.begin(ha_broker, ha_port, "${mqttUser}", "${mqttPass}");\n`;
  return body;
};

// ===== センサー登録 =====

/**
 * ha_sensor_create - HAセンサー作成
 */
Blockly.Blocks['ha_sensor_create'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('📊 ' + (Blockly.Msg.BLOCKS_HA_SENSORCREATE || 'HA Sensor Register'));
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_HA_OBJECTID || 'Object ID (entity_id)')
        .appendField(new Blockly.FieldTextInput('temperature'), 'SENSOR_ID');
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_HA_DISPLAYNAME || 'Display Name (HA UI)')
        .appendField(new Blockly.FieldTextInput('温度'), 'NAME');
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_HA_DEVICECLASS || 'Device Class')
        .appendField(new Blockly.FieldDropdown([
          [(Blockly.Msg.BLOCKS_HA_DC_TEMPERATURE || 'Temperature'), 'temperature'],
          [(Blockly.Msg.BLOCKS_HA_DC_HUMIDITY || 'Humidity'), 'humidity'],
          [(Blockly.Msg.BLOCKS_HA_DC_PRESSURE || 'Pressure'), 'pressure'],
          [(Blockly.Msg.BLOCKS_HA_DC_ILLUMINANCE || 'Illuminance'), 'illuminance'],
          [(Blockly.Msg.BLOCKS_HA_DC_VOLTAGE || 'Voltage'), 'voltage'],
          [(Blockly.Msg.BLOCKS_HA_DC_CURRENT || 'Current'), 'current'],
          [(Blockly.Msg.BLOCKS_HA_DC_POWER || 'Power'), 'power'],
          [(Blockly.Msg.BLOCKS_HA_DC_ENERGY || 'Energy'), 'energy'],
          [(Blockly.Msg.BLOCKS_HA_DC_BATTERY || 'Battery'), 'battery'],
          [(Blockly.Msg.BLOCKS_HA_DC_CO2 || 'CO2'), 'carbon_dioxide'],
          [(Blockly.Msg.BLOCKS_HA_DC_PM25 || 'PM2.5'), 'pm25'],
          [(Blockly.Msg.BLOCKS_HA_DC_DISTANCE || 'Distance'), 'distance'],
          [(Blockly.Msg.BLOCKS_NONE || 'None'), 'None']
        ]), 'DEVICE_CLASS');
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_UNIT || 'Unit')
        .appendField(new Blockly.FieldTextInput('°C'), 'UNIT');
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_ICON || 'Icon')
        .appendField(new Blockly.FieldDropdown([
          [(Blockly.Msg.BLOCKS_HA_ICON_THERMOMETER || 'Thermometer (mdi:thermometer)'), 'mdi:thermometer'],
          [(Blockly.Msg.BLOCKS_HA_ICON_WATER || 'Water (mdi:water-percent)'), 'mdi:water-percent'],
          [(Blockly.Msg.BLOCKS_HA_ICON_GAUGE || 'Gauge (mdi:gauge)'), 'mdi:gauge'],
          [(Blockly.Msg.BLOCKS_HA_ICON_LIGHTNING || 'Lightning (mdi:lightning-bolt)'), 'mdi:lightning-bolt'],
          [(Blockly.Msg.BLOCKS_HA_ICON_BATTERY || 'Battery (mdi:battery)'), 'mdi:battery'],
          [(Blockly.Msg.BLOCKS_HA_ICON_GAS_CYLINDER || 'Gas (mdi:gas-cylinder)'), 'mdi:gas-cylinder'],
          [(Blockly.Msg.BLOCKS_HA_ICON_BRIGHTNESS || 'Brightness (mdi:brightness-5)'), 'mdi:brightness-5'],
          [(Blockly.Msg.BLOCKS_NONE || 'None'), '']
        ]), 'ICON');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour('#FF9800');
    this.setTooltip(Blockly.Msg.BLOCKS_HA_SENSORCREATETOOLTIP || 'Create a sensor to register with Home Assistant. Object ID = HA entity_id (ASCII snake_case). Display Name = HA UI label (any language). Icon overrides the HA UI icon.');
  }
};

javascriptGenerator.forBlock['ha_sensor_create'] = function(block: Blockly.Block) {
  ensureArduinoHAInclude();
  const sensorId = block.getFieldValue('SENSOR_ID');
  const name = block.getFieldValue('NAME');
  const deviceClass = block.getFieldValue('DEVICE_CLASS');
  const unit = block.getFieldValue('UNIT');
  const icon = block.getFieldValue('ICON') || '';

  const varName = `haSensor_${sensorId.replace(/[^a-zA-Z0-9]/g, '_')}`;

  generator.definitions_[`ha_sensor_${sensorId}`] = `HASensorNumber ${varName}("${sensorId}", HASensorNumber::PrecisionP1);`;

  let code = `  // HA Sensor: ${name}\n`;
  code += `  ${varName}.setName("${name}");\n`;
  if (deviceClass !== 'None') {
    code += `  ${varName}.setDeviceClass("${deviceClass}");\n`;
  }
  code += `  ${varName}.setUnitOfMeasurement("${unit}");\n`;
  if (icon) {
    code += `  ${varName}.setIcon("${icon}");\n`;
  }

  return code;
};

/**
 * ha_sensor_update - HAセンサー値更新
 */
Blockly.Blocks['ha_sensor_update'] = {
  init: function() {
    this.appendValueInput('VALUE')
        .setCheck('Number')
        .appendField('📤 ' + (Blockly.Msg.BLOCKS_HA_SENSORUPDATE || 'HA Sensor Update'))
        .appendField(new Blockly.FieldTextInput('temperature'), 'SENSOR_ID')
        .appendField(Blockly.Msg.BLOCKS_VALUE || 'Value');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour('#FF9800');
    this.setTooltip(Blockly.Msg.BLOCKS_HA_SENSORUPDATETOOLTIP || 'Send sensor value to Home Assistant');
  }
};

javascriptGenerator.forBlock['ha_sensor_update'] = function(block: Blockly.Block) {
  ensureArduinoHAInclude();
  const sensorId = block.getFieldValue('SENSOR_ID');
  ensureHaSensorDefault(sensorId);
  const value = javascriptGenerator.valueToCode(block, 'VALUE', Order.ATOMIC) || '0';
  const varName = `haSensor_${sensorId.replace(/[^a-zA-Z0-9]/g, '_')}`;

  // ArduinoHA v2.1 HASensorNumber::setValue has 3 overloads (uint16_t / uint32_t /
  // float) via _SET_VALUE_OVERLOAD macro; passing an int from math_number is
  // ambiguous. ha_sensor_create initializes with PrecisionP1 (1 decimal) so
  // float is the design intent; static_cast resolves the overload set
  // unambiguously and is loss-less for any int that fits the underlying types.
  // (BUG-066)
  return `  ${varName}.setValue(static_cast<float>(${value}));\n`;
};

// ===== バイナリセンサー =====

/**
 * ha_binary_sensor_create - HAバイナリセンサー作成
 */
Blockly.Blocks['ha_binary_sensor_create'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🔘 ' + (Blockly.Msg.BLOCKS_HA_BINARYSENSORCREATE || 'HA Binary Sensor Register'));
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_HA_OBJECTID || 'Object ID (entity_id)')
        .appendField(new Blockly.FieldTextInput('motion'), 'SENSOR_ID');
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_HA_DISPLAYNAME || 'Display Name (HA UI)')
        .appendField(new Blockly.FieldTextInput('人感センサー'), 'NAME');
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_HA_DEVICECLASS || 'Device Class')
        .appendField(new Blockly.FieldDropdown([
          [(Blockly.Msg.BLOCKS_HA_DC_MOTION || 'Motion'), 'motion'],
          [(Blockly.Msg.BLOCKS_HA_DC_DOOR || 'Door'), 'door'],
          [(Blockly.Msg.BLOCKS_HA_DC_WINDOW || 'Window'), 'window'],
          [(Blockly.Msg.BLOCKS_HA_DC_SMOKE || 'Smoke'), 'smoke'],
          [(Blockly.Msg.BLOCKS_HA_DC_MOISTURE || 'Moisture'), 'moisture'],
          [(Blockly.Msg.BLOCKS_HA_DC_VIBRATION || 'Vibration'), 'vibration'],
          [(Blockly.Msg.BLOCKS_HA_DC_OCCUPANCY || 'Occupancy'), 'occupancy'],
          [(Blockly.Msg.BLOCKS_HA_DC_GAS || 'Gas'), 'gas'],
          [(Blockly.Msg.BLOCKS_HA_DC_PROBLEM || 'Problem'), 'problem'],
          [(Blockly.Msg.BLOCKS_HA_DC_CONNECTIVITY || 'Connectivity'), 'connectivity'],
          [(Blockly.Msg.BLOCKS_NONE || 'None'), 'None']
        ]), 'DEVICE_CLASS');
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_ICON || 'Icon')
        .appendField(new Blockly.FieldDropdown([
          [(Blockly.Msg.BLOCKS_HA_ICON_MOTION_SENSOR || 'Motion (mdi:motion-sensor)'), 'mdi:motion-sensor'],
          [(Blockly.Msg.BLOCKS_HA_ICON_DOOR_BIN || 'Door (mdi:door)'), 'mdi:door'],
          [(Blockly.Msg.BLOCKS_HA_ICON_WATER_ALERT || 'Leak (mdi:water-alert)'), 'mdi:water-alert'],
          [(Blockly.Msg.BLOCKS_HA_ICON_SMOKE_DETECTOR || 'Smoke (mdi:smoke-detector)'), 'mdi:smoke-detector'],
          [(Blockly.Msg.BLOCKS_HA_ICON_WINDOW_OPEN || 'Window (mdi:window-open)'), 'mdi:window-open'],
          [(Blockly.Msg.BLOCKS_HA_ICON_VIBRATE || 'Vibration (mdi:vibrate)'), 'mdi:vibrate'],
          [(Blockly.Msg.BLOCKS_HA_ICON_ACCOUNT || 'Occupancy (mdi:account)'), 'mdi:account'],
          [(Blockly.Msg.BLOCKS_HA_ICON_WIFI || 'Connectivity (mdi:wifi)'), 'mdi:wifi'],
          [(Blockly.Msg.BLOCKS_NONE || 'None'), '']
        ]), 'ICON');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour('#E91E63');
    this.setTooltip(Blockly.Msg.BLOCKS_HA_BINARYSENSORCREATETOOLTIP || 'Create an ON/OFF binary sensor. Object ID = HA entity_id (ASCII snake_case). Display Name = HA UI label (any language). Icon overrides the HA UI icon.');
  }
};

javascriptGenerator.forBlock['ha_binary_sensor_create'] = function(block: Blockly.Block) {
  ensureArduinoHAInclude();
  const sensorId = block.getFieldValue('SENSOR_ID');
  const name = block.getFieldValue('NAME');
  const deviceClass = block.getFieldValue('DEVICE_CLASS');
  const icon = block.getFieldValue('ICON') || '';

  const varName = `haBinarySensor_${sensorId.replace(/[^a-zA-Z0-9]/g, '_')}`;

  generator.definitions_[`ha_binary_sensor_${sensorId}`] = `HABinarySensor ${varName}("${sensorId}");`;

  let code = `  // HA Binary Sensor: ${name}\n`;
  code += `  ${varName}.setName("${name}");\n`;
  if (deviceClass !== 'None') {
    code += `  ${varName}.setDeviceClass("${deviceClass}");\n`;
  }
  if (icon) {
    code += `  ${varName}.setIcon("${icon}");\n`;
  }

  return code;
};

/**
 * ha_binary_sensor_update - HAバイナリセンサー値更新
 */
Blockly.Blocks['ha_binary_sensor_update'] = {
  init: function() {
    this.appendValueInput('VALUE')
        .setCheck('Boolean')
        .appendField('📤 ' + (Blockly.Msg.BLOCKS_HA_BINARYSENSORUPDATE || 'HA Binary Sensor Update'))
        .appendField(new Blockly.FieldTextInput('motion'), 'SENSOR_ID')
        .appendField(Blockly.Msg.BLOCKS_STATE || 'State');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour('#E91E63');
    this.setTooltip(Blockly.Msg.BLOCKS_HA_BINARYSENSORUPDATETOOLTIP || 'Send binary sensor state to Home Assistant');
  }
};

javascriptGenerator.forBlock['ha_binary_sensor_update'] = function(block: Blockly.Block) {
  ensureArduinoHAInclude();
  const sensorId = block.getFieldValue('SENSOR_ID');
  ensureHaBinarySensorDefault(sensorId);
  const value = javascriptGenerator.valueToCode(block, 'VALUE', Order.ATOMIC) || 'false';
  const varName = `haBinarySensor_${sensorId.replace(/[^a-zA-Z0-9]/g, '_')}`;

  return `  ${varName}.setState(${value});\n`;
};

// ===== スイッチ =====

/**
 * ha_switch_create - HAスイッチ作成
 */
Blockly.Blocks['ha_switch_create'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🔌 ' + (Blockly.Msg.BLOCKS_HA_SWITCHCREATE || 'HA Switch Register'));
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_HA_OBJECTID || 'Object ID (entity_id)')
        .appendField(new Blockly.FieldTextInput('relay'), 'SWITCH_ID');
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_HA_DISPLAYNAME || 'Display Name (HA UI)')
        .appendField(new Blockly.FieldTextInput('リレー'), 'NAME');
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_ICON || 'Icon')
        .appendField(new Blockly.FieldDropdown([
          [(Blockly.Msg.BLOCKS_HA_ICON_POWER || 'Power (mdi:power)'), 'mdi:power'],
          [(Blockly.Msg.BLOCKS_HA_ICON_LIGHTBULB || 'Lightbulb (mdi:lightbulb)'), 'mdi:lightbulb'],
          [(Blockly.Msg.BLOCKS_HA_ICON_FAN || 'Fan (mdi:fan)'), 'mdi:fan'],
          [(Blockly.Msg.BLOCKS_HA_ICON_PLUG || 'Plug (mdi:power-plug)'), 'mdi:power-plug'],
          [(Blockly.Msg.BLOCKS_HA_ICON_SWITCH || 'Switch (mdi:toggle-switch)'), 'mdi:toggle-switch'],
          [(Blockly.Msg.BLOCKS_NONE || 'None'), '']
        ]), 'ICON');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour('#2196F3');
    this.setTooltip(Blockly.Msg.BLOCKS_HA_SWITCHCREATETOOLTIP || 'Create a switch controllable from Home Assistant. Object ID = HA entity_id (ASCII snake_case). Display Name = HA UI label (any language).');
  }
};

javascriptGenerator.forBlock['ha_switch_create'] = function(block: Blockly.Block) {
  ensureArduinoHAInclude();
  const switchId = block.getFieldValue('SWITCH_ID');
  const name = block.getFieldValue('NAME');
  const icon = block.getFieldValue('ICON');

  const varName = `haSwitch_${switchId.replace(/[^a-zA-Z0-9]/g, '_')}`;

  generator.definitions_[`ha_switch_${switchId}`] = `HASwitch ${varName}("${switchId}");`;

  let code = `  // HA Switch: ${name}\n`;
  code += `  ${varName}.setName("${name}");\n`;
  if (icon) {
    code += `  ${varName}.setIcon("${icon}");\n`;
  }

  return code;
};

/**
 * ha_switch_on_command - HAスイッチコマンド受信時
 */
Blockly.Blocks['ha_switch_on_command'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🎮 ' + (Blockly.Msg.BLOCKS_HA_SWITCH || 'HA Switch'))
        .appendField(new Blockly.FieldTextInput('relay'), 'SWITCH_ID')
        .appendField(Blockly.Msg.BLOCKS_HA_ONCOMMAND || 'On Command');
    this.appendStatementInput('ON_CALLBACK')
        .setCheck(null)
        .appendField(Blockly.Msg.BLOCKS_HA_WHENON || 'When ON');
    this.appendStatementInput('OFF_CALLBACK')
        .setCheck(null)
        .appendField(Blockly.Msg.BLOCKS_HA_WHENOFF || 'When OFF');
    this.setColour('#2196F3');
    this.setTooltip(Blockly.Msg.BLOCKS_HA_SWITCHONCOMMANDTOOLTIP || 'Handle switch commands from Home Assistant');
  }
};

javascriptGenerator.forBlock['ha_switch_on_command'] = function(block: Blockly.Block) {
  ensureArduinoHAInclude();
  const switchId = block.getFieldValue('SWITCH_ID');
  ensureHaSwitchDefault(switchId);
  const onCallback = javascriptGenerator.statementToCode(block, 'ON_CALLBACK');
  const offCallback = javascriptGenerator.statementToCode(block, 'OFF_CALLBACK');
  const varName = `haSwitch_${switchId.replace(/[^a-zA-Z0-9]/g, '_')}`;

  generator.definitions_[`ha_switch_callback_${switchId}`] = `
void onSwitch_${switchId.replace(/[^a-zA-Z0-9]/g, '_')}Command(bool state, HASwitch* sender) {
  if (state) {
${onCallback}  } else {
${offCallback}  }
  sender->setState(state);
}`;

  generator.setups_[`ha_switch_callback_${switchId}`] = `  ${varName}.onCommand(onSwitch_${switchId.replace(/[^a-zA-Z0-9]/g, '_')}Command);`;

  return '';
};

/**
 * ha_switch_set_state - HAスイッチ状態設定
 */
Blockly.Blocks['ha_switch_set_state'] = {
  init: function() {
    this.appendValueInput('STATE')
        .setCheck('Boolean')
        .appendField('📤 ' + (Blockly.Msg.BLOCKS_HA_SWITCH || 'HA Switch'))
        .appendField(new Blockly.FieldTextInput('relay'), 'SWITCH_ID')
        .appendField(Blockly.Msg.BLOCKS_HA_SETSTATE || 'Set State');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour('#2196F3');
    this.setTooltip(Blockly.Msg.BLOCKS_HA_SWITCHSETSTATETOOLTIP || 'Send switch state to Home Assistant');
  }
};

javascriptGenerator.forBlock['ha_switch_set_state'] = function(block: Blockly.Block) {
  ensureArduinoHAInclude();
  const switchId = block.getFieldValue('SWITCH_ID');
  ensureHaSwitchDefault(switchId);
  const state = javascriptGenerator.valueToCode(block, 'STATE', Order.ATOMIC) || 'false';
  const varName = `haSwitch_${switchId.replace(/[^a-zA-Z0-9]/g, '_')}`;

  return `  ${varName}.setState(${state});\n`;
};

// ===== ライト =====

/**
 * ha_light_create - HAライト作成（調光対応）
 */
Blockly.Blocks['ha_light_create'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('💡 ' + (Blockly.Msg.BLOCKS_HA_LIGHTCREATE || 'HA Light Register'));
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_HA_OBJECTID || 'Object ID (entity_id)')
        .appendField(new Blockly.FieldTextInput('led'), 'LIGHT_ID');
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_HA_DISPLAYNAME || 'Display Name (HA UI)')
        .appendField(new Blockly.FieldTextInput('LED'), 'NAME');
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_HA_BRIGHTNESS || 'Brightness')
        .appendField(new Blockly.FieldCheckbox('TRUE'), 'BRIGHTNESS');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour('#FFEB3B');
    this.setTooltip(Blockly.Msg.BLOCKS_HA_LIGHTCREATETOOLTIP || 'Create a light controllable from Home Assistant. Object ID = HA entity_id (ASCII snake_case). Display Name = HA UI label (any language).');
  }
};

javascriptGenerator.forBlock['ha_light_create'] = function(block: Blockly.Block) {
  ensureArduinoHAInclude();
  const lightId = block.getFieldValue('LIGHT_ID');
  const name = block.getFieldValue('NAME');
  const hasBrightness = block.getFieldValue('BRIGHTNESS') === 'TRUE';

  const varName = `haLight_${lightId.replace(/[^a-zA-Z0-9]/g, '_')}`;

  if (hasBrightness) {
    generator.definitions_[`ha_light_${lightId}`] = `HALight ${varName}("${lightId}", HALight::BrightnessFeature);`;
  } else {
    generator.definitions_[`ha_light_${lightId}`] = `HALight ${varName}("${lightId}");`;
  }

  return `  // HA Light: ${name}\n  ${varName}.setName("${name}");\n`;
};

/**
 * ha_light_on_command - HAライトコマンド受信時
 */
Blockly.Blocks['ha_light_on_command'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🎮 ' + (Blockly.Msg.BLOCKS_HA_LIGHT || 'HA Light'))
        .appendField(new Blockly.FieldTextInput('led'), 'LIGHT_ID')
        .appendField(Blockly.Msg.BLOCKS_HA_ONSTATECHANGE || 'On State Change');
    this.appendStatementInput('CALLBACK')
        .setCheck(null)
        .appendField(Blockly.Msg.BLOCKS_DO || 'Do');
    this.setColour('#FFEB3B');
    this.setTooltip(Blockly.Msg.BLOCKS_HA_LIGHTONCOMMANDTOOLTIP || 'Handle light commands. Use ha_light_state and ha_light_brightness.');
  }
};

javascriptGenerator.forBlock['ha_light_on_command'] = function(block: Blockly.Block) {
  ensureArduinoHAInclude();
  const lightId = block.getFieldValue('LIGHT_ID');
  ensureHaLightDefault(lightId);
  const callback = javascriptGenerator.statementToCode(block, 'CALLBACK');
  const varName = `haLight_${lightId.replace(/[^a-zA-Z0-9]/g, '_')}`;

  // post-Phase 4-4 commit W fix (case_0273):
  // ArduinoHA v2.x で `HALight::onStateCommand` の callback signature が
  // 変更されている (verified via ML30 grep on
  // `.pio/libdeps/.../device-types/HALight.h:9`):
  //   旧 (本 generator が emit していた form):
  //     void(bool state, uint8_t brightness)
  //   新 (lib v2.x、HALIGHT_STATE_CALLBACK macro 経由):
  //     void(bool state, HALight* sender)
  // brightness は別 callback `onBrightnessCommand` (HALIGHT_BRIGHTNESS_CALLBACK)
  // で受信する設計に分離。state callback 内で現在 brightness が必要なら
  // `sender->getCurrentBrightness()` (line 168) 経由で取得。
  // 同 file 内の他 entity callback (switch/number/fan/cover/light RGB/scene)
  // は commit 2-6 で正規化済、本 entry のみ migration 漏れ = systematic
  // 設計欠陥 (lib upgrade 時の追従漏れ、BUG-056 / 058 / 065 / 066 と同 cluster)。
  // user-facing globals (ha_light_state / ha_light_brightness) は維持、
  // brightness は sender->getCurrentBrightness() 経由で取得継続。
  // emits: ha_light_state_var + ha_light_brightness_var + ha_light_callback_*
  // requires: HALight ${varName} declared (ensureHaLightDefault 経由).
  generator.definitions_['ha_light_state_var'] = 'bool ha_light_state = false;';
  generator.definitions_['ha_light_brightness_var'] = 'uint8_t ha_light_brightness = 0;';

  generator.definitions_[`ha_light_callback_${lightId}`] = `
void onLight_${lightId.replace(/[^a-zA-Z0-9]/g, '_')}Command(bool state, HALight* sender) {
  ha_light_state = state;
  ha_light_brightness = sender->getCurrentBrightness();
${callback}}`;

  generator.setups_[`ha_light_callback_${lightId}`] = `  ${varName}.onStateCommand(onLight_${lightId.replace(/[^a-zA-Z0-9]/g, '_')}Command);`;

  return '';
};

/**
 * ha_light_state - ライト状態取得
 */
Blockly.Blocks['ha_light_state'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('💡 ' + (Blockly.Msg.BLOCKS_HA_LIGHTSTATE || 'HA Light State'));
    this.setOutput(true, 'Boolean');
    this.setColour('#FFEB3B');
    this.setTooltip(Blockly.Msg.BLOCKS_HA_LIGHTSTATETOOLTIP || 'Received light ON/OFF state');
  }
};

javascriptGenerator.forBlock['ha_light_state'] = function() {
  ensureArduinoHAInclude();
  ensureHaLightStateVars();
  return ['/* requires: ha_light_state (template global) */ ha_light_state', Order.ATOMIC];
};

/**
 * ha_light_brightness - ライト明るさ取得
 */
Blockly.Blocks['ha_light_brightness'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('💡 ' + (Blockly.Msg.BLOCKS_HA_LIGHTBRIGHTNESS || 'HA Light Brightness'));
    this.setOutput(true, 'Number');
    this.setColour('#FFEB3B');
    this.setTooltip(Blockly.Msg.BLOCKS_HA_LIGHTBRIGHTNESSTOOLTIP || 'Received light brightness (0-255)');
  }
};

javascriptGenerator.forBlock['ha_light_brightness'] = function() {
  ensureArduinoHAInclude();
  ensureHaLightStateVars();
  return ['/* requires: ha_light_brightness (template global) */ ha_light_brightness', Order.ATOMIC];
};

/**
 * ha_light_set_state - HAライト状態設定
 */
Blockly.Blocks['ha_light_set_state'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('📤 ' + (Blockly.Msg.BLOCKS_HA_LIGHT || 'HA Light'))
        .appendField(new Blockly.FieldTextInput('led'), 'LIGHT_ID')
        .appendField(Blockly.Msg.BLOCKS_HA_REPORTSTATE || 'Report State');
    this.appendValueInput('STATE')
        .setCheck('Boolean')
        .appendField('ON/OFF');
    this.appendValueInput('BRIGHTNESS')
        .setCheck('Number')
        .appendField(Blockly.Msg.BLOCKS_HA_BRIGHTNESS || 'Brightness');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour('#FFEB3B');
    this.setTooltip(Blockly.Msg.BLOCKS_HA_LIGHTSETSTATETOOLTIP || 'Report light state to Home Assistant');
  }
};

javascriptGenerator.forBlock['ha_light_set_state'] = function(block: Blockly.Block) {
  ensureArduinoHAInclude();
  const lightId = block.getFieldValue('LIGHT_ID');
  ensureHaLightDefault(lightId);
  const state = javascriptGenerator.valueToCode(block, 'STATE', Order.ATOMIC) || 'false';
  const brightness = javascriptGenerator.valueToCode(block, 'BRIGHTNESS', Order.ATOMIC) || '255';
  const varName = `haLight_${lightId.replace(/[^a-zA-Z0-9]/g, '_')}`;

  return `  ${varName}.setState(${state}, ${brightness});\n`;
};

// ===== ボタン =====

/**
 * ha_button_create - HAボタン作成
 */
Blockly.Blocks['ha_button_create'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🔘 ' + (Blockly.Msg.BLOCKS_HA_BUTTONCREATE || 'HA Button Register'));
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_HA_OBJECTID || 'Object ID (entity_id)')
        .appendField(new Blockly.FieldTextInput('restart'), 'BUTTON_ID');
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_HA_DISPLAYNAME || 'Display Name (HA UI)')
        .appendField(new Blockly.FieldTextInput('再起動'), 'NAME');
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_ICON || 'Icon')
        .appendField(new Blockly.FieldDropdown([
          [(Blockly.Msg.BLOCKS_HA_ICON_RESTART || 'Restart (mdi:restart)'), 'mdi:restart'],
          [(Blockly.Msg.BLOCKS_HA_ICON_UPDATE || 'Update (mdi:update)'), 'mdi:update'],
          [(Blockly.Msg.BLOCKS_HA_ICON_PLAY || 'Play (mdi:play)'), 'mdi:play'],
          [(Blockly.Msg.BLOCKS_HA_ICON_STOP || 'Stop (mdi:stop)'), 'mdi:stop'],
          [(Blockly.Msg.BLOCKS_NONE || 'None'), '']
        ]), 'ICON');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour('#9C27B0');
    this.setTooltip(Blockly.Msg.BLOCKS_HA_BUTTONCREATETOOLTIP || 'Create a button pressable from Home Assistant. Object ID = HA entity_id (ASCII snake_case). Display Name = HA UI label (any language).');
  }
};

javascriptGenerator.forBlock['ha_button_create'] = function(block: Blockly.Block) {
  ensureArduinoHAInclude();
  const buttonId = block.getFieldValue('BUTTON_ID');
  const name = block.getFieldValue('NAME');
  const icon = block.getFieldValue('ICON');

  const varName = `haButton_${buttonId.replace(/[^a-zA-Z0-9]/g, '_')}`;

  generator.definitions_[`ha_button_${buttonId}`] = `HAButton ${varName}("${buttonId}");`;

  let code = `  // HA Button: ${name}\n`;
  code += `  ${varName}.setName("${name}");\n`;
  if (icon) {
    code += `  ${varName}.setIcon("${icon}");\n`;
  }

  return code;
};

/**
 * ha_button_on_press - HAボタン押下時
 */
Blockly.Blocks['ha_button_on_press'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🎮 ' + (Blockly.Msg.BLOCKS_HA_BUTTON || 'HA Button'))
        .appendField(new Blockly.FieldTextInput('restart'), 'BUTTON_ID')
        .appendField(Blockly.Msg.BLOCKS_HA_ONPRESS || 'On Press');
    this.appendStatementInput('CALLBACK')
        .setCheck(null)
        .appendField(Blockly.Msg.BLOCKS_DO || 'Do');
    this.setColour('#9C27B0');
    this.setTooltip(Blockly.Msg.BLOCKS_HA_BUTTONONPRESSTOOLTIP || 'Handle button press from Home Assistant');
  }
};

javascriptGenerator.forBlock['ha_button_on_press'] = function(block: Blockly.Block) {
  ensureArduinoHAInclude();
  const buttonId = block.getFieldValue('BUTTON_ID');
  ensureHaButtonDefault(buttonId);
  const callback = javascriptGenerator.statementToCode(block, 'CALLBACK');
  const varName = `haButton_${buttonId.replace(/[^a-zA-Z0-9]/g, '_')}`;

  generator.definitions_[`ha_button_callback_${buttonId}`] = `
void onButton_${buttonId.replace(/[^a-zA-Z0-9]/g, '_')}Press(HAButton* sender) {
${callback}}`;

  generator.setups_[`ha_button_callback_${buttonId}`] = `  ${varName}.onCommand(onButton_${buttonId.replace(/[^a-zA-Z0-9]/g, '_')}Press);`;

  return '';
};

// ===== ループ処理 =====

/**
 * ha_loop - HAループ処理
 */
Blockly.Blocks['ha_loop'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🔄 ' + (Blockly.Msg.BLOCKS_HA_LOOP || 'HA Loop'));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour('#4CAF50');
    this.setTooltip(Blockly.Msg.BLOCKS_HA_LOOPTOOLTIP || 'Maintain HA communication. Call in loop().');
  }
};

javascriptGenerator.forBlock['ha_loop'] = function() {
  ensureArduinoHAInclude();
  return `  haMqtt.loop();\n`;
};

/**
 * ha_is_connected - HA接続状態確認
 */
Blockly.Blocks['ha_is_connected'] = {
  init: function() {
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_HA_ISCONNECTED || 'HA Connected');
    this.setOutput(true, 'Boolean');
    this.setColour('#4CAF50');
    this.setTooltip(Blockly.Msg.BLOCKS_HA_ISCONNECTEDTOOLTIP || 'Returns true if connected to Home Assistant');
  }
};

javascriptGenerator.forBlock['ha_is_connected'] = function() {
  ensureArduinoHAInclude();
  return ['haMqtt.isConnected()', Order.FUNCTION_CALL];
};

// ===== 数値コントローラー（HANumber） =====

/**
 * ha_number_create - HAナンバー作成
 */
Blockly.Blocks['ha_number_create'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🔢 ' + (Blockly.Msg.BLOCKS_HA_NUMBERCREATE || 'HA Number Register'));
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_HA_OBJECTID || 'Object ID (entity_id)')
        .appendField(new Blockly.FieldTextInput('servo_angle'), 'NUMBER_ID');
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_HA_DISPLAYNAME || 'Display Name (HA UI)')
        .appendField(new Blockly.FieldTextInput('サーボ角度'), 'NAME');
    this.appendValueInput('MIN').appendField(Blockly.Msg.BLOCKS_MIN || 'Min');
    this.appendValueInput('MAX').appendField(Blockly.Msg.BLOCKS_MAX || 'Max');
    this.appendValueInput('STEP').appendField(Blockly.Msg.BLOCKS_STEP || 'Step');
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_UNIT || 'Unit')
        .appendField(new Blockly.FieldTextInput('°'), 'UNIT');
    this.setInputsInline(true);
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_MODE || 'Mode')
        .appendField(new Blockly.FieldDropdown([
          [(Blockly.Msg.BLOCKS_HA_MODE_AUTO || 'Slider (auto)'), 'auto'],
          [(Blockly.Msg.BLOCKS_HA_MODE_BOX || 'Box (box)'), 'box'],
          [(Blockly.Msg.BLOCKS_HA_MODE_SLIDER || 'Slider (slider)'), 'slider']
        ]), 'MODE');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour('#00BCD4');
    this.setTooltip(Blockly.Msg.BLOCKS_HA_NUMBERCREATETOOLTIP || 'Create an entity that accepts number input from Home Assistant. Object ID = HA entity_id (ASCII snake_case). Display Name = HA UI label (any language).');
  }
};

javascriptGenerator.forBlock['ha_number_create'] = function(block: Blockly.Block) {
  ensureArduinoHAInclude();
  const numberId = block.getFieldValue('NUMBER_ID');
  const name = block.getFieldValue('NAME');
  const min = generator.valueToCode(block, 'MIN', generator.ORDER_ATOMIC) || '0';
  const max = generator.valueToCode(block, 'MAX', generator.ORDER_ATOMIC) || '180';
  const step = generator.valueToCode(block, 'STEP', generator.ORDER_ATOMIC) || '1';
  const unit = block.getFieldValue('UNIT');
  const mode = block.getFieldValue('MODE');

  const varName = `haNumber_${numberId.replace(/[^a-zA-Z0-9]/g, '_')}`;

  generator.definitions_[`ha_number_${numberId}`] = `HANumber ${varName}("${numberId}", HANumber::PrecisionP1);`;

  let code = `  // HA Number: ${name}\n`;
  code += `  ${varName}.setName("${name}");\n`;
  code += `  ${varName}.setMin(String(${min}).toInt());\n`;
  code += `  ${varName}.setMax(String(${max}).toInt());\n`;
  code += `  ${varName}.setStep(String(${step}).toInt());\n`;
  if (unit) {
    code += `  ${varName}.setUnitOfMeasurement("${unit}");\n`;
  }
  code += `  ${varName}.setMode(HANumber::Mode${mode.charAt(0).toUpperCase() + mode.slice(1)});\n`;

  return code;
};

/**
 * ha_number_on_command - HA数値コマンド受信時
 */
Blockly.Blocks['ha_number_on_command'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🎮 ' + (Blockly.Msg.BLOCKS_HA_NUMBER || 'HA Number'))
        .appendField(new Blockly.FieldTextInput('servo_angle'), 'NUMBER_ID')
        .appendField(Blockly.Msg.BLOCKS_HA_ONCHANGE || 'On Change');
    this.appendStatementInput('CALLBACK')
        .setCheck(null)
        .appendField(Blockly.Msg.BLOCKS_DO || 'Do');
    this.setColour('#00BCD4');
    this.setTooltip(Blockly.Msg.BLOCKS_HA_NUMBERONCOMMANDTOOLTIP || 'Handle number change. Use ha_number_value.');
  }
};

javascriptGenerator.forBlock['ha_number_on_command'] = function(block: Blockly.Block) {
  ensureArduinoHAInclude();
  const numberId = block.getFieldValue('NUMBER_ID');
  ensureHaNumberDefault(numberId);
  const callback = javascriptGenerator.statementToCode(block, 'CALLBACK');
  const varName = `haNumber_${numberId.replace(/[^a-zA-Z0-9]/g, '_')}`;

  generator.definitions_['ha_number_value_var'] = 'float ha_number_value = 0;';

  generator.definitions_[`ha_number_callback_${numberId}`] = `
void onNumber_${numberId.replace(/[^a-zA-Z0-9]/g, '_')}Command(HANumeric number, HANumber* sender) {
  if (number.isSet()) {
    ha_number_value = number.toFloat();
${callback}    sender->setState(number);
  }
}`;

  generator.setups_[`ha_number_callback_${numberId}`] = `  ${varName}.onCommand(onNumber_${numberId.replace(/[^a-zA-Z0-9]/g, '_')}Command);`;

  return '';
};

/**
 * ha_number_value - 受信した数値取得
 */
Blockly.Blocks['ha_number_value'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🔢 ' + (Blockly.Msg.BLOCKS_HA_NUMBERVALUE || 'HA Received Number'));
    this.setOutput(true, 'Number');
    this.setColour('#00BCD4');
    this.setTooltip(Blockly.Msg.BLOCKS_HA_NUMBERVALUETOOLTIP || 'Received number value');
  }
};

javascriptGenerator.forBlock['ha_number_value'] = function() {
  ensureArduinoHAInclude();
  ensureHaNumberValueVar();
  return ['/* requires: ha_number_value (template global) */ ha_number_value', Order.ATOMIC];
};

/**
 * ha_number_set_state - HA数値状態設定
 */
Blockly.Blocks['ha_number_set_state'] = {
  init: function() {
    this.appendValueInput('VALUE')
        .setCheck('Number')
        .appendField('📤 ' + (Blockly.Msg.BLOCKS_HA_NUMBER || 'HA Number'))
        .appendField(new Blockly.FieldTextInput('servo_angle'), 'NUMBER_ID')
        .appendField(Blockly.Msg.BLOCKS_HA_SETVALUE || 'Set');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour('#00BCD4');
    this.setTooltip(Blockly.Msg.BLOCKS_HA_NUMBERSETSTATETOOLTIP || 'Report number state to Home Assistant');
  }
};

javascriptGenerator.forBlock['ha_number_set_state'] = function(block: Blockly.Block) {
  ensureArduinoHAInclude();
  const numberId = block.getFieldValue('NUMBER_ID');
  ensureHaNumberDefault(numberId);
  const value = javascriptGenerator.valueToCode(block, 'VALUE', Order.ATOMIC) || '0';
  const varName = `haNumber_${numberId.replace(/[^a-zA-Z0-9]/g, '_')}`;

  // post-Phase 4-4 commit X fix (case_0286):
  // ArduinoHA `HANumber::setState` は `_SET_STATE_OVERLOAD(type)` macro 経由で
  // 8 overloads (int8/int16/int32/uint8/uint16/uint32/int/float) を提供
  // (verified via ML30 grep on .../device-types/HANumber.h:5-12 macro
  // definition + lines 59-68 instantiations)。`setState(0)` の int literal は
  // integer promotion / narrowing / widening の全 conversion が同 rank の
  // implicit conversion candidate となり `call of overloaded 'setState(int)'
  // is ambiguous` で全 8 候補を提示してコンパイル fail。connected な
  // valueToCode でも `int` / `float` 連結式は同 ambiguity に陥る。
  //
  // BUG-066 (改定log 第61回 closure) の `ha_*::setValue(static_cast<float>())`
  // 適用と同根 cluster (lib upgrade で overload 増加 → mixed-type
  // implicit conversion ambiguous)、本 commit で setState 系も同 fix を
  // 適用して整合性確保。
  //
  // 罠 B defense (本セッション 12 件目): Phase 4-4 stderr
  // `'haNumber_servo_angle' was not declared` は commit 2-6 effective 前の
  // stale cached fail。cache eviction 後の fresh smoke で真因 (overload
  // ambiguity) が露呈、commit W と同 pattern (本 session 2 件目の stale
  // stderr 発見)。
  //
  // emits: nothing extra / requires: HANumber ${varName} declared
  // (ensureHaNumberDefault 経由).
  return `  ${varName}.setState(static_cast<float>(${value}));\n`;
};

// ===== ファン（HAFan） =====

/**
 * ha_fan_create - HAファン作成
 */
Blockly.Blocks['ha_fan_create'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🌀 ' + (Blockly.Msg.BLOCKS_HA_FANCREATE || 'HA Fan Register'));
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_HA_OBJECTID || 'Object ID (entity_id)')
        .appendField(new Blockly.FieldTextInput('fan'), 'FAN_ID');
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_HA_DISPLAYNAME || 'Display Name (HA UI)')
        .appendField(new Blockly.FieldTextInput('換気扇'), 'NAME');
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_HA_SPEEDCONTROL || 'Speed Control')
        .appendField(new Blockly.FieldCheckbox('TRUE'), 'SPEEDS');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour('#795548');
    this.setTooltip(Blockly.Msg.BLOCKS_HA_FANCREATETOOLTIP || 'Create a fan controllable from Home Assistant. Object ID = HA entity_id (ASCII snake_case). Display Name = HA UI label (any language).');
  }
};

javascriptGenerator.forBlock['ha_fan_create'] = function(block: Blockly.Block) {
  ensureArduinoHAInclude();
  const fanId = block.getFieldValue('FAN_ID');
  const name = block.getFieldValue('NAME');
  const hasSpeeds = block.getFieldValue('SPEEDS') === 'TRUE';

  const varName = `haFan_${fanId.replace(/[^a-zA-Z0-9]/g, '_')}`;

  if (hasSpeeds) {
    generator.definitions_[`ha_fan_${fanId}`] = `HAFan ${varName}("${fanId}", HAFan::SpeedsFeature);`;
  } else {
    generator.definitions_[`ha_fan_${fanId}`] = `HAFan ${varName}("${fanId}");`;
  }

  let code = `  // HA Fan: ${name}\n`;
  code += `  ${varName}.setName("${name}");\n`;
  if (hasSpeeds) {
    code += `  ${varName}.setSpeedRangeMin(1);\n`;
    code += `  ${varName}.setSpeedRangeMax(100);\n`;
  }

  return code;
};

/**
 * ha_fan_on_command - HAファンコマンド受信時
 */
Blockly.Blocks['ha_fan_on_command'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🎮 ' + (Blockly.Msg.BLOCKS_HA_FAN || 'HA Fan'))
        .appendField(new Blockly.FieldTextInput('fan'), 'FAN_ID')
        .appendField(Blockly.Msg.BLOCKS_HA_ONSTATECHANGE || 'On State Change');
    this.appendStatementInput('CALLBACK')
        .setCheck(null)
        .appendField(Blockly.Msg.BLOCKS_DO || 'Do');
    this.setColour('#795548');
    this.setTooltip(Blockly.Msg.BLOCKS_HA_FANONCOMMANDTOOLTIP || 'Handle fan commands. Use ha_fan_state and ha_fan_speed.');
  }
};

javascriptGenerator.forBlock['ha_fan_on_command'] = function(block: Blockly.Block) {
  ensureArduinoHAInclude();
  const fanId = block.getFieldValue('FAN_ID');
  ensureHaFanDefault(fanId);
  const callback = javascriptGenerator.statementToCode(block, 'CALLBACK');
  const varName = `haFan_${fanId.replace(/[^a-zA-Z0-9]/g, '_')}`;

  generator.definitions_['ha_fan_state_var'] = 'bool ha_fan_state = false;';
  generator.definitions_['ha_fan_speed_var'] = 'uint16_t ha_fan_speed = 0;';

  generator.definitions_[`ha_fan_state_callback_${fanId}`] = `
void onFan_${fanId.replace(/[^a-zA-Z0-9]/g, '_')}StateCommand(bool state, HAFan* sender) {
  ha_fan_state = state;
${callback}  sender->setState(state);
}`;

  generator.definitions_[`ha_fan_speed_callback_${fanId}`] = `
void onFan_${fanId.replace(/[^a-zA-Z0-9]/g, '_')}SpeedCommand(uint16_t speed, HAFan* sender) {
  ha_fan_speed = speed;
${callback}  sender->setSpeed(speed);
}`;

  generator.setups_[`ha_fan_state_callback_${fanId}`] = `  ${varName}.onStateCommand(onFan_${fanId.replace(/[^a-zA-Z0-9]/g, '_')}StateCommand);`;
  generator.setups_[`ha_fan_speed_callback_${fanId}`] = `  ${varName}.onSpeedCommand(onFan_${fanId.replace(/[^a-zA-Z0-9]/g, '_')}SpeedCommand);`;

  return '';
};

/**
 * ha_fan_state - ファン状態取得
 */
Blockly.Blocks['ha_fan_state'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🌀 ' + (Blockly.Msg.BLOCKS_HA_FANSTATE || 'HA Fan State'));
    this.setOutput(true, 'Boolean');
    this.setColour('#795548');
    this.setTooltip(Blockly.Msg.BLOCKS_HA_FANSTATETOOLTIP || 'Received fan ON/OFF state');
  }
};

javascriptGenerator.forBlock['ha_fan_state'] = function() {
  ensureArduinoHAInclude();
  ensureHaFanStateVars();
  return ['/* requires: ha_fan_state (template global) */ ha_fan_state', Order.ATOMIC];
};

/**
 * ha_fan_speed - ファン速度取得
 */
Blockly.Blocks['ha_fan_speed'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🌀 ' + (Blockly.Msg.BLOCKS_HA_FANSPEED || 'HA Fan Speed'));
    this.setOutput(true, 'Number');
    this.setColour('#795548');
    this.setTooltip(Blockly.Msg.BLOCKS_HA_FANSPEEDTOOLTIP || 'Received fan speed (0-100)');
  }
};

javascriptGenerator.forBlock['ha_fan_speed'] = function() {
  ensureArduinoHAInclude();
  ensureHaFanStateVars();
  return ['/* requires: ha_fan_speed (template global) */ ha_fan_speed', Order.ATOMIC];
};

/**
 * ha_fan_set_state - HAファン状態設定
 */
Blockly.Blocks['ha_fan_set_state'] = {
  init: function() {
    this.appendValueInput('STATE')
        .setCheck('Boolean')
        .appendField('📤 ' + (Blockly.Msg.BLOCKS_HA_FAN || 'HA Fan'))
        .appendField(new Blockly.FieldTextInput('fan'), 'FAN_ID')
        .appendField('ON/OFF');
    this.appendValueInput('SPEED')
        .setCheck('Number')
        .appendField(Blockly.Msg.BLOCKS_HA_SPEED || 'Speed');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour('#795548');
    this.setTooltip(Blockly.Msg.BLOCKS_HA_FANSETSTATETOOLTIP || 'Report fan state to Home Assistant');
  }
};

javascriptGenerator.forBlock['ha_fan_set_state'] = function(block: Blockly.Block) {
  ensureArduinoHAInclude();
  const fanId = block.getFieldValue('FAN_ID');
  ensureHaFanDefault(fanId);
  const state = javascriptGenerator.valueToCode(block, 'STATE', Order.ATOMIC) || 'false';
  const speed = javascriptGenerator.valueToCode(block, 'SPEED', Order.ATOMIC) || '0';
  const varName = `haFan_${fanId.replace(/[^a-zA-Z0-9]/g, '_')}`;

  return `  ${varName}.setState(${state});\n  ${varName}.setSpeed(${speed});\n`;
};

// ===== カバー（HACover） =====

/**
 * ha_cover_create - HAカバー作成
 */
Blockly.Blocks['ha_cover_create'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🚪 ' + (Blockly.Msg.BLOCKS_HA_COVERCREATE || 'HA Cover Register'));
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_HA_OBJECTID || 'Object ID (entity_id)')
        .appendField(new Blockly.FieldTextInput('shutter'), 'COVER_ID');
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_HA_DISPLAYNAME || 'Display Name (HA UI)')
        .appendField(new Blockly.FieldTextInput('シャッター'), 'NAME');
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_HA_DEVICECLASS || 'Device Class')
        .appendField(new Blockly.FieldDropdown([
          [(Blockly.Msg.BLOCKS_HA_DC_SHUTTER || 'Shutter'), 'shutter'],
          [(Blockly.Msg.BLOCKS_HA_DC_BLIND || 'Blind'), 'blind'],
          [(Blockly.Msg.BLOCKS_HA_DC_CURTAIN || 'Curtain'), 'curtain'],
          [(Blockly.Msg.BLOCKS_HA_DC_GARAGE || 'Garage'), 'garage'],
          [(Blockly.Msg.BLOCKS_HA_DC_GATE || 'Gate'), 'gate'],
          [(Blockly.Msg.BLOCKS_NONE || 'None'), 'None']
        ]), 'DEVICE_CLASS');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour('#607D8B');
    this.setTooltip(Blockly.Msg.BLOCKS_HA_COVERCREATETOOLTIP || 'Create a cover (shutter, etc.) controllable from Home Assistant. Object ID = HA entity_id (ASCII snake_case). Display Name = HA UI label (any language).');
  }
};

javascriptGenerator.forBlock['ha_cover_create'] = function(block: Blockly.Block) {
  ensureArduinoHAInclude();
  const coverId = block.getFieldValue('COVER_ID');
  const name = block.getFieldValue('NAME');
  const deviceClass = block.getFieldValue('DEVICE_CLASS');

  const varName = `haCover_${coverId.replace(/[^a-zA-Z0-9]/g, '_')}`;

  generator.definitions_[`ha_cover_${coverId}`] = `HACover ${varName}("${coverId}");`;

  let code = `  // HA Cover: ${name}\n`;
  code += `  ${varName}.setName("${name}");\n`;
  if (deviceClass !== 'None') {
    code += `  ${varName}.setDeviceClass("${deviceClass}");\n`;
  }

  return code;
};

/**
 * ha_cover_on_command - HAカバーコマンド受信時
 */
Blockly.Blocks['ha_cover_on_command'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🎮 ' + (Blockly.Msg.BLOCKS_HA_COVER || 'HA Cover'))
        .appendField(new Blockly.FieldTextInput('shutter'), 'COVER_ID')
        .appendField(Blockly.Msg.BLOCKS_HA_ONCOMMAND || 'On Command');
    this.appendStatementInput('OPEN_CALLBACK')
        .setCheck(null)
        .appendField(Blockly.Msg.BLOCKS_HA_WHENOPEN || 'When Open');
    this.appendStatementInput('CLOSE_CALLBACK')
        .setCheck(null)
        .appendField(Blockly.Msg.BLOCKS_HA_WHENCLOSE || 'When Close');
    this.appendStatementInput('STOP_CALLBACK')
        .setCheck(null)
        .appendField(Blockly.Msg.BLOCKS_HA_WHENSTOP || 'When Stop');
    this.setColour('#607D8B');
    this.setTooltip(Blockly.Msg.BLOCKS_HA_COVERONCOMMANDTOOLTIP || 'Handle cover commands from Home Assistant');
  }
};

javascriptGenerator.forBlock['ha_cover_on_command'] = function(block: Blockly.Block) {
  ensureArduinoHAInclude();
  const coverId = block.getFieldValue('COVER_ID');
  ensureHaCoverDefault(coverId);
  const openCallback = javascriptGenerator.statementToCode(block, 'OPEN_CALLBACK');
  const closeCallback = javascriptGenerator.statementToCode(block, 'CLOSE_CALLBACK');
  const stopCallback = javascriptGenerator.statementToCode(block, 'STOP_CALLBACK');
  const varName = `haCover_${coverId.replace(/[^a-zA-Z0-9]/g, '_')}`;

  generator.definitions_[`ha_cover_callback_${coverId}`] = `
void onCover_${coverId.replace(/[^a-zA-Z0-9]/g, '_')}Command(HACover::CoverCommand cmd, HACover* sender) {
  if (cmd == HACover::CommandOpen) {
${openCallback}    sender->setState(HACover::StateOpen);
  } else if (cmd == HACover::CommandClose) {
${closeCallback}    sender->setState(HACover::StateClosed);
  } else if (cmd == HACover::CommandStop) {
${stopCallback}    sender->setState(HACover::StateStopped);
  }
}`;

  generator.setups_[`ha_cover_callback_${coverId}`] = `  ${varName}.onCommand(onCover_${coverId.replace(/[^a-zA-Z0-9]/g, '_')}Command);`;

  return '';
};

/**
 * ha_cover_set_state - HAカバー状態設定
 */
Blockly.Blocks['ha_cover_set_state'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('📤 ' + (Blockly.Msg.BLOCKS_HA_COVER || 'HA Cover'))
        .appendField(new Blockly.FieldTextInput('shutter'), 'COVER_ID')
        .appendField(Blockly.Msg.BLOCKS_HA_SETSTATE || 'Set State');
    this.appendDummyInput()
        .appendField(new Blockly.FieldDropdown([
          [(Blockly.Msg.BLOCKS_HA_STATE_OPEN || 'Open'), 'StateOpen'],
          [(Blockly.Msg.BLOCKS_HA_STATE_CLOSED || 'Closed'), 'StateClosed'],
          [(Blockly.Msg.BLOCKS_HA_STATE_OPENING || 'Opening'), 'StateOpening'],
          [(Blockly.Msg.BLOCKS_HA_STATE_CLOSING || 'Closing'), 'StateClosing'],
          [(Blockly.Msg.BLOCKS_HA_STATE_STOPPED || 'Stopped'), 'StateStopped']
        ]), 'STATE');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour('#607D8B');
    this.setTooltip(Blockly.Msg.BLOCKS_HA_COVERSETSTATETOOLTIP || 'Report cover state to Home Assistant');
  }
};

javascriptGenerator.forBlock['ha_cover_set_state'] = function(block: Blockly.Block) {
  ensureArduinoHAInclude();
  const coverId = block.getFieldValue('COVER_ID');
  ensureHaCoverDefault(coverId);
  const state = block.getFieldValue('STATE');
  const varName = `haCover_${coverId.replace(/[^a-zA-Z0-9]/g, '_')}`;

  return `  ${varName}.setState(HACover::${state});\n`;
};

// ===== RGBライト =====

/**
 * ha_light_create_rgb - HAライト作成（RGB対応）
 */
Blockly.Blocks['ha_light_create_rgb'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🌈 ' + (Blockly.Msg.BLOCKS_HA_LIGHTCREATERGB || 'HA Light Register (RGB)'));
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_HA_OBJECTID || 'Object ID (entity_id)')
        .appendField(new Blockly.FieldTextInput('rgb_led'), 'LIGHT_ID');
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_HA_DISPLAYNAME || 'Display Name (HA UI)')
        .appendField(new Blockly.FieldTextInput('RGB LED'), 'NAME');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour('#FFEB3B');
    this.setTooltip(Blockly.Msg.BLOCKS_HA_LIGHTCREATERGBTOOLTIP || 'Create an RGB color-controllable light. Object ID = HA entity_id (ASCII snake_case). Display Name = HA UI label (any language).');
  }
};

javascriptGenerator.forBlock['ha_light_create_rgb'] = function(block: Blockly.Block) {
  ensureArduinoHAInclude();
  const lightId = block.getFieldValue('LIGHT_ID');
  const name = block.getFieldValue('NAME');

  const varName = `haLight_${lightId.replace(/[^a-zA-Z0-9]/g, '_')}`;

  generator.definitions_[`ha_light_${lightId}`] = `HALight ${varName}("${lightId}", HALight::BrightnessFeature | HALight::RGBFeature);`;

  return `  // HA RGB Light: ${name}\n  ${varName}.setName("${name}");\n`;
};

/**
 * ha_light_on_rgb_command - HAライトRGBコマンド受信時
 */
Blockly.Blocks['ha_light_on_rgb_command'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🎮 ' + (Blockly.Msg.BLOCKS_HA_LIGHT || 'HA Light'))
        .appendField(new Blockly.FieldTextInput('rgb_led'), 'LIGHT_ID')
        .appendField(Blockly.Msg.BLOCKS_HA_ONRGBCHANGE || 'On RGB Change');
    this.appendStatementInput('CALLBACK')
        .setCheck(null)
        .appendField(Blockly.Msg.BLOCKS_DO || 'Do');
    this.setColour('#FFEB3B');
    this.setTooltip(Blockly.Msg.BLOCKS_HA_LIGHTONRGBCOMMANDTOOLTIP || 'Handle RGB color change. Use ha_light_r/g/b.');
  }
};

javascriptGenerator.forBlock['ha_light_on_rgb_command'] = function(block: Blockly.Block) {
  ensureArduinoHAInclude();
  const lightId = block.getFieldValue('LIGHT_ID');
  ensureHaLightRgbDefault(lightId);
  const callback = javascriptGenerator.statementToCode(block, 'CALLBACK');
  const varName = `haLight_${lightId.replace(/[^a-zA-Z0-9]/g, '_')}`;

  generator.definitions_['ha_light_rgb_vars'] = `uint8_t ha_light_r = 0;
uint8_t ha_light_g = 0;
uint8_t ha_light_b = 0;`;

  generator.definitions_[`ha_light_rgb_callback_${lightId}`] = `
void onLight_${lightId.replace(/[^a-zA-Z0-9]/g, '_')}RGBCommand(HALight::RGBColor color, HALight* sender) {
  ha_light_r = color.red;
  ha_light_g = color.green;
  ha_light_b = color.blue;
${callback}  sender->setRGBColor(color);
}`;

  generator.setups_[`ha_light_rgb_callback_${lightId}`] = `  ${varName}.onRGBColorCommand(onLight_${lightId.replace(/[^a-zA-Z0-9]/g, '_')}RGBCommand);`;

  return '';
};

/**
 * ha_light_rgb_r - RGB R値取得
 */
Blockly.Blocks['ha_light_rgb_r'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🔴 ' + (Blockly.Msg.BLOCKS_HA_RGBR || 'HA RGB R Value'));
    this.setOutput(true, 'Number');
    this.setColour('#FFEB3B');
    this.setTooltip(Blockly.Msg.BLOCKS_HA_RGBRTOOLTIP || 'Received RGB red component (0-255)');
  }
};

javascriptGenerator.forBlock['ha_light_rgb_r'] = function() {
  ensureArduinoHAInclude();
  ensureHaLightRgbVars();
  return ['/* requires: ha_light_r (template global) */ ha_light_r', Order.ATOMIC];
};

/**
 * ha_light_rgb_g - RGB G値取得
 */
Blockly.Blocks['ha_light_rgb_g'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🟢 ' + (Blockly.Msg.BLOCKS_HA_RGBG || 'HA RGB G Value'));
    this.setOutput(true, 'Number');
    this.setColour('#FFEB3B');
    this.setTooltip(Blockly.Msg.BLOCKS_HA_RGBGTOOLTIP || 'Received RGB green component (0-255)');
  }
};

javascriptGenerator.forBlock['ha_light_rgb_g'] = function() {
  ensureArduinoHAInclude();
  ensureHaLightRgbVars();
  return ['/* requires: ha_light_g (template global) */ ha_light_g', Order.ATOMIC];
};

/**
 * ha_light_rgb_b - RGB B値取得
 */
Blockly.Blocks['ha_light_rgb_b'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🔵 ' + (Blockly.Msg.BLOCKS_HA_RGBB || 'HA RGB B Value'));
    this.setOutput(true, 'Number');
    this.setColour('#FFEB3B');
    this.setTooltip(Blockly.Msg.BLOCKS_HA_RGBBTOOLTIP || 'Received RGB blue component (0-255)');
  }
};

javascriptGenerator.forBlock['ha_light_rgb_b'] = function() {
  ensureArduinoHAInclude();
  ensureHaLightRgbVars();
  return ['/* requires: ha_light_b (template global) */ ha_light_b', Order.ATOMIC];
};

/**
 * ha_light_set_rgb - HAライトRGB設定
 */
Blockly.Blocks['ha_light_set_rgb'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('📤 ' + (Blockly.Msg.BLOCKS_HA_LIGHT || 'HA Light'))
        .appendField(new Blockly.FieldTextInput('rgb_led'), 'LIGHT_ID')
        .appendField(Blockly.Msg.BLOCKS_HA_REPORTRGB || 'Report RGB');
    this.appendValueInput('R')
        .setCheck('Number')
        .appendField('R');
    this.appendValueInput('G')
        .setCheck('Number')
        .appendField('G');
    this.appendValueInput('B')
        .setCheck('Number')
        .appendField('B');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour('#FFEB3B');
    this.setTooltip(Blockly.Msg.BLOCKS_HA_LIGHTSETRGBTOOLTIP || 'Report RGB color to Home Assistant');
  }
};

javascriptGenerator.forBlock['ha_light_set_rgb'] = function(block: Blockly.Block) {
  ensureArduinoHAInclude();
  const lightId = block.getFieldValue('LIGHT_ID');
  ensureHaLightRgbDefault(lightId);
  const r = javascriptGenerator.valueToCode(block, 'R', Order.ATOMIC) || '0';
  const g = javascriptGenerator.valueToCode(block, 'G', Order.ATOMIC) || '0';
  const b = javascriptGenerator.valueToCode(block, 'B', Order.ATOMIC) || '0';
  const varName = `haLight_${lightId.replace(/[^a-zA-Z0-9]/g, '_')}`;

  return `  ${varName}.setRGBColor(HALight::RGBColor(${r}, ${g}, ${b}));\n`;
};

// ===== デバイストリガー =====

/**
 * ha_device_trigger_create - HAデバイストリガー作成
 */
Blockly.Blocks['ha_device_trigger_create'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('⚡ ' + (Blockly.Msg.BLOCKS_HA_TRIGGERCREATE || 'HA Trigger Register'))
        .appendField(new Blockly.FieldTextInput('button_press'), 'TRIGGER_ID');
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_TYPE || 'Type')
        .appendField(new Blockly.FieldDropdown([
          [(Blockly.Msg.BLOCKS_HA_TYPE_BUTTON || 'Button'), 'button'],
          [(Blockly.Msg.BLOCKS_HA_TYPE_REMOTE || 'Remote'), 'remote'],
          [(Blockly.Msg.BLOCKS_HA_TYPE_SENSOR || 'Sensor'), 'sensor']
        ]), 'TYPE');
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_HA_SUBTYPE || 'Subtype')
        .appendField(new Blockly.FieldTextInput('button_1'), 'SUBTYPE');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour('#673AB7');
    this.setTooltip(Blockly.Msg.BLOCKS_HA_TRIGGERCREATETOOLTIP || 'Register an event as a trigger for HA automation');
  }
};

javascriptGenerator.forBlock['ha_device_trigger_create'] = function(block: Blockly.Block) {
  ensureArduinoHAInclude();
  const triggerId = block.getFieldValue('TRIGGER_ID');
  const type = block.getFieldValue('TYPE');
  const subtype = block.getFieldValue('SUBTYPE');

  const varName = `haTrigger_${triggerId.replace(/[^a-zA-Z0-9]/g, '_')}`;

  // ArduinoHA v2.1+ `HADeviceTrigger(const char* type, const char* subtype)`
  // accepts a free-form type string, not nested enums (`HADeviceTrigger::
  // ButtonType` etc. don't exist in the public header). The dropdown value
  // ('button' / 'remote' / 'sensor') is forwarded as-is; HA-canonical types
  // (e.g. 'button_short_press') are a future UX refinement.
  generator.definitions_[`ha_trigger_${triggerId}`] = `HADeviceTrigger ${varName}("${type}", "${subtype}");`;

  return `  // HA Device Trigger: ${triggerId}\n`;
};

/**
 * ha_device_trigger_fire - HAトリガー発火
 */
Blockly.Blocks['ha_device_trigger_fire'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('⚡ ' + (Blockly.Msg.BLOCKS_HA_TRIGGERFIRE || 'HA Trigger Fire'))
        .appendField(new Blockly.FieldTextInput('button_press'), 'TRIGGER_ID');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour('#673AB7');
    this.setTooltip(Blockly.Msg.BLOCKS_HA_TRIGGERFIRETOOLTIP || 'Fire HA automation trigger');
  }
};

javascriptGenerator.forBlock['ha_device_trigger_fire'] = function(block: Blockly.Block) {
  ensureArduinoHAInclude();
  const triggerId = block.getFieldValue('TRIGGER_ID');
  ensureHaDeviceTriggerDefault(triggerId);
  const varName = `haTrigger_${triggerId.replace(/[^a-zA-Z0-9]/g, '_')}`;

  return `  ${varName}.trigger();\n`;
};

// ===== シーン =====

/**
 * ha_scene_create - HAシーン作成
 */
Blockly.Blocks['ha_scene_create'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🎬 ' + (Blockly.Msg.BLOCKS_HA_SCENECREATE || 'HA Scene Register'));
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_HA_OBJECTID || 'Object ID (entity_id)')
        .appendField(new Blockly.FieldTextInput('night_mode'), 'SCENE_ID');
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_HA_DISPLAYNAME || 'Display Name (HA UI)')
        .appendField(new Blockly.FieldTextInput('ナイトモード'), 'NAME');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour('#3F51B5');
    this.setTooltip(Blockly.Msg.BLOCKS_HA_SCENECREATETOOLTIP || 'Create a scene executable from HA. Object ID = HA entity_id (ASCII snake_case). Display Name = HA UI label (any language).');
  }
};

javascriptGenerator.forBlock['ha_scene_create'] = function(block: Blockly.Block) {
  ensureArduinoHAInclude();
  const sceneId = block.getFieldValue('SCENE_ID');
  const name = block.getFieldValue('NAME');

  const varName = `haScene_${sceneId.replace(/[^a-zA-Z0-9]/g, '_')}`;

  generator.definitions_[`ha_scene_${sceneId}`] = `HAScene ${varName}("${sceneId}");`;

  return `  // HA Scene: ${name}\n  ${varName}.setName("${name}");\n`;
};

/**
 * ha_scene_on_command - HAシーン実行時
 */
Blockly.Blocks['ha_scene_on_command'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🎮 ' + (Blockly.Msg.BLOCKS_HA_SCENE || 'HA Scene'))
        .appendField(new Blockly.FieldTextInput('night_mode'), 'SCENE_ID')
        .appendField(Blockly.Msg.BLOCKS_HA_ONEXECUTE || 'On Execute');
    this.appendStatementInput('CALLBACK')
        .setCheck(null)
        .appendField(Blockly.Msg.BLOCKS_DO || 'Do');
    this.setColour('#3F51B5');
    this.setTooltip(Blockly.Msg.BLOCKS_HA_SCENEONCOMMANDTOOLTIP || 'Handle scene execution from Home Assistant');
  }
};

javascriptGenerator.forBlock['ha_scene_on_command'] = function(block: Blockly.Block) {
  ensureArduinoHAInclude();
  const sceneId = block.getFieldValue('SCENE_ID');
  ensureHaSceneDefault(sceneId);
  const callback = javascriptGenerator.statementToCode(block, 'CALLBACK');
  const varName = `haScene_${sceneId.replace(/[^a-zA-Z0-9]/g, '_')}`;

  generator.definitions_[`ha_scene_callback_${sceneId}`] = `
void onScene_${sceneId.replace(/[^a-zA-Z0-9]/g, '_')}Command(HAScene* sender) {
${callback}}`;

  generator.setups_[`ha_scene_callback_${sceneId}`] = `  ${varName}.onCommand(onScene_${sceneId.replace(/[^a-zA-Z0-9]/g, '_')}Command);`;

  return '';
};

// ===== タグスキャナー =====

/**
 * ha_tag_scanner_create - HAタグスキャナー作成
 */
Blockly.Blocks['ha_tag_scanner_create'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🏷️ ' + (Blockly.Msg.BLOCKS_HA_TAGSCANNERCREATE || 'HA Tag Scanner Register'));
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_HA_OBJECTID || 'Object ID (entity_id)')
        .appendField(new Blockly.FieldTextInput('nfc_reader'), 'SCANNER_ID');
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_HA_DISPLAYNAME || 'Display Name (HA UI)')
        .appendField(new Blockly.FieldTextInput('NFCリーダー'), 'NAME');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour('#009688');
    this.setTooltip(Blockly.Msg.BLOCKS_HA_TAGSCANNERCREATETOOLTIP || 'Register NFC tag scanner, etc. Object ID = HA entity_id (ASCII snake_case). Display Name = HA UI label (any language).');
  }
};

javascriptGenerator.forBlock['ha_tag_scanner_create'] = function(block: Blockly.Block) {
  ensureArduinoHAInclude();
  const scannerId = block.getFieldValue('SCANNER_ID');
  const name = block.getFieldValue('NAME');

  const varName = `haTagScanner_${scannerId.replace(/[^a-zA-Z0-9]/g, '_')}`;

  generator.definitions_[`ha_tag_scanner_${scannerId}`] = `HATagScanner ${varName}("${scannerId}");`;

  return `  // HA Tag Scanner: ${name}\n  ${varName}.setName("${name}");\n`;
};

/**
 * ha_tag_scanner_scanned - HAタグスキャン報告
 */
Blockly.Blocks['ha_tag_scanner_scanned'] = {
  init: function() {
    this.appendValueInput('TAG_ID')
        .setCheck('String')
        .appendField('🏷️ ' + (Blockly.Msg.BLOCKS_HA_TAGSCANNED || 'HA Tag Scanned'))
        .appendField(new Blockly.FieldTextInput('nfc_reader'), 'SCANNER_ID')
        .appendField(Blockly.Msg.BLOCKS_HA_TAGID || 'Tag ID');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour('#009688');
    this.setTooltip(Blockly.Msg.BLOCKS_HA_TAGSCANNEDTOOLTIP || 'Report scanned tag ID to HA');
  }
};

javascriptGenerator.forBlock['ha_tag_scanner_scanned'] = function(block: Blockly.Block) {
  ensureArduinoHAInclude();
  const scannerId = block.getFieldValue('SCANNER_ID');
  ensureHaTagScannerDefault(scannerId);
  const tagId = javascriptGenerator.valueToCode(block, 'TAG_ID', Order.ATOMIC) || '""';
  const varName = `haTagScanner_${scannerId.replace(/[^a-zA-Z0-9]/g, '_')}`;

  return `  ${varName}.tagScanned(${tagId});\n`;
};

// ===== 接続/切断ハンドラ =====

/**
 * ha_on_connected - HA 接続時 callback (commit 4)
 *
 * HAMqtt broker 接続成功時に発火 (初回接続 + 再接続毎、HAMqtt.h:144 docstring
 * 「The callback is also fired after reconnecting to the broker」)。
 *
 * HAMqtt 内部 callback storage (`_connectedCallback`) は単一 member、複数
 * onConnected() 呼び出しは last-wins (HAMqtt.h:417 verify 済)。よって 1 block
 * per project が推奨、複数配置すると最後の登録のみ動作 (silent override)。
 */
Blockly.Blocks['ha_on_connected'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🔗 ' + (Blockly.Msg.BLOCKS_HA_ONCONNECTED || 'HA Connected'));
    this.appendStatementInput('CALLBACK')
        .setCheck(null)
        .appendField(Blockly.Msg.BLOCKS_DO || 'Do');
    this.setColour('#4CAF50');
    this.setTooltip(Blockly.Msg.BLOCKS_HA_ONCONNECTEDTOOLTIP || 'Fires when MQTT connection to the HA broker is acquired (initial connect + every reconnect). Place once at the top level of arduino_loop or arduino_setup. Multiple placements will silently overwrite each other (HAMqtt holds a single callback).');
  }
};

javascriptGenerator.forBlock['ha_on_connected'] = function(block: Blockly.Block) {
  ensureArduinoHAInclude();
  const callback = javascriptGenerator.statementToCode(block, 'CALLBACK');

  // Fixed function name (D-4.1) + setups_/definitions_ key dedupe = last-wins
  // when multiple ha_on_connected blocks are placed (D-4.2).
  generator.definitions_['ha_on_connected_func'] = `
void onHaConnected() {
${callback}}`;
  generator.setups_['ha_on_connected_register'] = '  haMqtt.onConnected(onHaConnected);';

  return '';
};

/**
 * ha_on_disconnected - HA 切断時 callback (commit 4)
 *
 * HAMqtt broker 切断時に発火。HAMqtt.h:152 onDisconnected。
 * ha_on_connected と同じく単一 callback、last-wins。
 */
Blockly.Blocks['ha_on_disconnected'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🔌 ' + (Blockly.Msg.BLOCKS_HA_ONDISCONNECTED || 'HA Disconnected'));
    this.appendStatementInput('CALLBACK')
        .setCheck(null)
        .appendField(Blockly.Msg.BLOCKS_DO || 'Do');
    this.setColour('#4CAF50');
    this.setTooltip(Blockly.Msg.BLOCKS_HA_ONDISCONNECTEDTOOLTIP || 'Fires when MQTT connection to the HA broker is lost. Place once at the top level of arduino_loop or arduino_setup. Multiple placements will silently overwrite each other (HAMqtt holds a single callback).');
  }
};

javascriptGenerator.forBlock['ha_on_disconnected'] = function(block: Blockly.Block) {
  ensureArduinoHAInclude();
  const callback = javascriptGenerator.statementToCode(block, 'CALLBACK');

  generator.definitions_['ha_on_disconnected_func'] = `
void onHaDisconnected() {
${callback}}`;
  generator.setups_['ha_on_disconnected_register'] = '  haMqtt.onDisconnected(onHaDisconnected);';

  return '';
};

// ===== 自動診断 (RSSI / Uptime / Heap / ResetReason) =====

/**
 * ha_diagnostics_auto - HA 自動診断 (commit 3)
 *
 * 4 health indicators (RSSI / Uptime / Free Heap / Reset Reason) を独立 millis()
 * timer で定期 publish。ha_report_interval の `_lastHAReport` / `_haReportInterval`
 * とは別変数 (`_lastHaDiagReport` / `_haDiagInterval`) で動作 = D-3.6 確定。
 *
 * ArduinoHA v2.1.0 は `setEntityCategory` API を提供しないため (HABaseDeviceType.h
 * 240 行精読 + HASerializer.cpp/.h grep + ML30 installed lib v2.1.0 grep の
 * triple verify、`entity_category` mention 0 件 確定)、本 commit では
 * `entity_category: diagnostic` Discovery payload を emit しない。HA UI 上は
 * 通常 sensor として表示される。release 前 entity_category 自前 override は
 * commit 6 (via_device payload override infrastructure) と統合予定 = D-3.3 (B' 案)。
 *
 * Reset Reason は HASensor (string、人間可読 "PowerOn" / "Software" 等) で publish
 * = D-3.2 確定。boot 時 esp_reset_reason() 1 回読取で確定値を初回 publish 後不変。
 */
Blockly.Blocks['ha_diagnostics_auto'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🩺 ' + (Blockly.Msg.BLOCKS_HA_DIAGNOSTICSAUTO || 'HA Auto Diagnostics'));
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_HA_DIAGNOSTICREPORTINTERVAL || 'Report Interval (s)')
        .appendField(new Blockly.FieldNumber(60, 10, 3600), 'REPORT_INTERVAL');
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_HA_ENABLERSSI || 'WiFi RSSI')
        .appendField(new Blockly.FieldCheckbox('TRUE'), 'ENABLE_RSSI');
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_HA_ENABLEUPTIME || 'Uptime')
        .appendField(new Blockly.FieldCheckbox('TRUE'), 'ENABLE_UPTIME');
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_HA_ENABLEHEAP || 'Free Heap')
        .appendField(new Blockly.FieldCheckbox('TRUE'), 'ENABLE_HEAP');
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_HA_ENABLERESETREASON || 'Reset Reason')
        .appendField(new Blockly.FieldCheckbox('TRUE'), 'ENABLE_RESET_REASON');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour('#4CAF50');
    this.setTooltip(Blockly.Msg.BLOCKS_HA_DIAGNOSTICSAUTOTOOLTIP || 'Automatically publish RSSI / Uptime / Free Heap / Reset Reason to HA at the specified interval. Operates on an independent millis() timer (separate from ha_report_interval). entity_category is not yet supported by ArduinoHA, so entities currently appear as regular sensors in the HA UI. Place inside arduino_setup; at least one item must be enabled.');
  }
};

javascriptGenerator.forBlock['ha_diagnostics_auto'] = function(block: Blockly.Block) {
  ensureArduinoHAInclude();
  const intervalRaw = parseInt(block.getFieldValue('REPORT_INTERVAL') || '60', 10);
  const interval = Number.isFinite(intervalRaw) && intervalRaw >= 10 ? intervalRaw : 60;
  const enableRssi = block.getFieldValue('ENABLE_RSSI') === 'TRUE';
  const enableUptime = block.getFieldValue('ENABLE_UPTIME') === 'TRUE';
  const enableHeap = block.getFieldValue('ENABLE_HEAP') === 'TRUE';
  const enableResetReason = block.getFieldValue('ENABLE_RESET_REASON') === 'TRUE';

  // D-3.7: silent skip when all four ENABLE_* are OFF — block is a no-op,
  // tooltip already advises "at least one item must be enabled".
  if (!enableRssi && !enableUptime && !enableHeap && !enableResetReason) {
    return '';
  }

  // RSSI uses WiFi.RSSI() — ensure WiFi.h include is present even if the user
  // somehow places this block without ha_device_init (singleton-strategy case).
  if (enableRssi) {
    generator.definitions_['include_wifi'] = '#include <WiFi.h>';
  }

  // Entity declarations (D-3.4: setIcon hard-coded in setup body, no Dropdown).
  // RSSI/Uptime/Heap = HASensorNumber, Reset Reason = HASensor (string, D-3.2).
  if (enableRssi) {
    generator.definitions_['ha_diag_rssi_entity'] =
      'HASensorNumber haDiag_wifi_rssi("wifi_rssi", HASensorNumber::PrecisionP0);';
  }
  if (enableUptime) {
    generator.definitions_['ha_diag_uptime_entity'] =
      'HASensorNumber haDiag_uptime("uptime", HASensorNumber::PrecisionP0);';
  }
  if (enableHeap) {
    generator.definitions_['ha_diag_heap_entity'] =
      'HASensorNumber haDiag_free_heap("free_heap", HASensorNumber::PrecisionP0);';
  }
  if (enableResetReason) {
    generator.definitions_['ha_diag_reset_reason_entity'] =
      'HASensor haDiag_reset_reason("reset_reason");';
    generator.definitions_['include_esp_system'] = '#include <esp_system.h>';
    generator.definitions_['ha_diag_reset_reason_helper'] = `
const char* _haDiagResetReasonStr() {
  switch (esp_reset_reason()) {
    case ESP_RST_POWERON:  return "PowerOn";
    case ESP_RST_EXT:      return "External";
    case ESP_RST_SW:       return "Software";
    case ESP_RST_PANIC:    return "Panic";
    case ESP_RST_INT_WDT:  return "WDT-Int";
    case ESP_RST_TASK_WDT: return "WDT-Task";
    case ESP_RST_WDT:      return "WDT-Other";
    case ESP_RST_UNKNOWN:  return "Unknown";
    default:               return "Other";
  }
}`;
  }

  // Independent millis() timer (D-3.6) — variable names distinct from
  // ha_report_interval's _lastHAReport / _haReportInterval.
  generator.definitions_['ha_diag_timer_vars'] = `unsigned long _lastHaDiagReport = 0;
unsigned long _haDiagInterval = ${interval * 1000}UL;`;

  // Setup body (runs once when block placed inside arduino_setup) — entity
  // metadata: setName / setDeviceClass / setUnitOfMeasurement / setIcon.
  // BUG-066 cluster: setValue(int) is ambiguous against the 8-overload set;
  // emit static_cast<float>(...) at every call site for unambiguous dispatch.
  let setupBody = '  // HA Auto Diagnostics: setup\n';
  if (enableRssi) {
    setupBody += '  haDiag_wifi_rssi.setName("WiFi RSSI");\n';
    setupBody += '  haDiag_wifi_rssi.setDeviceClass("signal_strength");\n';
    setupBody += '  haDiag_wifi_rssi.setUnitOfMeasurement("dBm");\n';
    setupBody += '  haDiag_wifi_rssi.setIcon("mdi:wifi");\n';
  }
  if (enableUptime) {
    setupBody += '  haDiag_uptime.setName("Uptime");\n';
    setupBody += '  haDiag_uptime.setDeviceClass("duration");\n';
    setupBody += '  haDiag_uptime.setUnitOfMeasurement("s");\n';
    setupBody += '  haDiag_uptime.setIcon("mdi:clock-outline");\n';
  }
  if (enableHeap) {
    setupBody += '  haDiag_free_heap.setName("Free Heap");\n';
    setupBody += '  haDiag_free_heap.setDeviceClass("data_size");\n';
    setupBody += '  haDiag_free_heap.setUnitOfMeasurement("B");\n';
    setupBody += '  haDiag_free_heap.setIcon("mdi:memory");\n';
  }
  if (enableResetReason) {
    setupBody += '  haDiag_reset_reason.setName("Reset Reason");\n';
    setupBody += '  haDiag_reset_reason.setIcon("mdi:restart");\n';
    setupBody += '  haDiag_reset_reason.setValue(_haDiagResetReasonStr());\n';
  }

  // Periodic tick via loopPre_ (rule 03 "Loop-side dedupe" — auto-injected
  // into loop() prologue, placement-independent). RSSI / Uptime / Heap update
  // every interval; Reset Reason is fixed at boot (no periodic update needed).
  if (enableRssi || enableUptime || enableHeap) {
    if (!generator.loopPre_) generator.loopPre_ = {};
    let loopTick = `  if (millis() - _lastHaDiagReport >= _haDiagInterval) {
    _lastHaDiagReport = millis();
`;
    if (enableRssi) {
      loopTick += '    haDiag_wifi_rssi.setValue(static_cast<float>(WiFi.RSSI()));\n';
    }
    if (enableUptime) {
      loopTick += '    haDiag_uptime.setValue(static_cast<float>(millis() / 1000UL));\n';
    }
    if (enableHeap) {
      loopTick += '    haDiag_free_heap.setValue(static_cast<float>(ESP.getFreeHeap()));\n';
    }
    loopTick += '  }\n';
    generator.loopPre_['ha_diagnostics_auto_tick'] = loopTick;
  }

  return setupBody;
};

// ===== 報告間隔制御 =====

/**
 * ha_report_interval - HA報告間隔設定
 */
Blockly.Blocks['ha_report_interval'] = {
  init: function() {
    this.appendValueInput('INTERVAL')
        .setCheck('Number')
        .appendField('⏱️ ' + (Blockly.Msg.BLOCKS_HA_REPORTINTERVAL || 'HA Report Interval'));
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_HA_EVERYSECONDS || 'seconds, do');
    this.appendStatementInput('CALLBACK')
        .setCheck(null)
        .appendField(Blockly.Msg.BLOCKS_EXECUTE || 'Execute');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour('#4CAF50');
    this.setTooltip(Blockly.Msg.BLOCKS_HA_REPORTINTERVALTOOLTIP || 'Execute HA reporting at specified interval (use in loop)');
  }
};

javascriptGenerator.forBlock['ha_report_interval'] = function(block: Blockly.Block) {
  ensureArduinoHAInclude();
  const interval = javascriptGenerator.valueToCode(block, 'INTERVAL', Order.ATOMIC) || '30';
  const callback = javascriptGenerator.statementToCode(block, 'CALLBACK');

  generator.definitions_['ha_report_interval_vars'] = `unsigned long _lastHAReport = 0;
unsigned long _haReportInterval = 30000;`;

  return `  _haReportInterval = ${interval} * 1000UL;
  if (millis() - _lastHAReport >= _haReportInterval) {
    _lastHAReport = millis();
${callback}  }
`;
};

console.log('ArduinoHA blocks loaded');
