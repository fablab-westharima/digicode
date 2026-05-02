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
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour('#4CAF50');
    this.setTooltip(Blockly.Msg.BLOCKS_HA_DEVICEINITTOOLTIP || 'Initialize a device that auto-registers with Home Assistant');
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

  return `  // HA Device Init
  haDevice.setName("${deviceName}");
  haDevice.setSoftwareVersion("1.0.0");
  haWifiConnect();
  haMqtt.begin(ha_broker, ha_port);
`;
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
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour('#4CAF50');
    this.setTooltip(Blockly.Msg.BLOCKS_HA_DEVICEINITAUTHTOOLTIP || 'Initialize HA device with MQTT authentication');
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

  return `  // HA Device Init with Auth
  haDevice.setName("${deviceName}");
  haDevice.setSoftwareVersion("1.0.0");
  haWifiConnect();
  haMqtt.begin(ha_broker, ha_port, "${mqttUser}", "${mqttPass}");
`;
};

// ===== センサー登録 =====

/**
 * ha_sensor_create - HAセンサー作成
 */
Blockly.Blocks['ha_sensor_create'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('📊 ' + (Blockly.Msg.BLOCKS_HA_SENSORCREATE || 'HA Sensor Register'))
        .appendField(new Blockly.FieldTextInput('temperature'), 'SENSOR_ID');
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_NAME || 'Name')
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
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour('#FF9800');
    this.setTooltip(Blockly.Msg.BLOCKS_HA_SENSORCREATETOOLTIP || 'Create a sensor to register with Home Assistant');
  }
};

javascriptGenerator.forBlock['ha_sensor_create'] = function(block: Blockly.Block) {
  ensureArduinoHAInclude();
  const sensorId = block.getFieldValue('SENSOR_ID');
  const name = block.getFieldValue('NAME');
  const deviceClass = block.getFieldValue('DEVICE_CLASS');
  const unit = block.getFieldValue('UNIT');

  const varName = `haSensor_${sensorId.replace(/[^a-zA-Z0-9]/g, '_')}`;

  generator.definitions_[`ha_sensor_${sensorId}`] = `HASensorNumber ${varName}("${sensorId}", HASensorNumber::PrecisionP1);`;

  let code = `  // HA Sensor: ${name}\n`;
  code += `  ${varName}.setName("${name}");\n`;
  if (deviceClass !== 'None') {
    code += `  ${varName}.setDeviceClass("${deviceClass}");\n`;
  }
  code += `  ${varName}.setUnitOfMeasurement("${unit}");\n`;

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
        .appendField('🔘 ' + (Blockly.Msg.BLOCKS_HA_BINARYSENSORCREATE || 'HA Binary Sensor Register'))
        .appendField(new Blockly.FieldTextInput('motion'), 'SENSOR_ID');
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_NAME || 'Name')
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
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour('#E91E63');
    this.setTooltip(Blockly.Msg.BLOCKS_HA_BINARYSENSORCREATETOOLTIP || 'Create an ON/OFF binary sensor');
  }
};

javascriptGenerator.forBlock['ha_binary_sensor_create'] = function(block: Blockly.Block) {
  ensureArduinoHAInclude();
  const sensorId = block.getFieldValue('SENSOR_ID');
  const name = block.getFieldValue('NAME');
  const deviceClass = block.getFieldValue('DEVICE_CLASS');

  const varName = `haBinarySensor_${sensorId.replace(/[^a-zA-Z0-9]/g, '_')}`;

  generator.definitions_[`ha_binary_sensor_${sensorId}`] = `HABinarySensor ${varName}("${sensorId}");`;

  let code = `  // HA Binary Sensor: ${name}\n`;
  code += `  ${varName}.setName("${name}");\n`;
  if (deviceClass !== 'None') {
    code += `  ${varName}.setDeviceClass("${deviceClass}");\n`;
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
        .appendField('🔌 ' + (Blockly.Msg.BLOCKS_HA_SWITCHCREATE || 'HA Switch Register'))
        .appendField(new Blockly.FieldTextInput('relay'), 'SWITCH_ID');
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_NAME || 'Name')
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
    this.setTooltip(Blockly.Msg.BLOCKS_HA_SWITCHCREATETOOLTIP || 'Create a switch controllable from Home Assistant');
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
        .appendField('💡 ' + (Blockly.Msg.BLOCKS_HA_LIGHTCREATE || 'HA Light Register'))
        .appendField(new Blockly.FieldTextInput('led'), 'LIGHT_ID');
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_NAME || 'Name')
        .appendField(new Blockly.FieldTextInput('LED'), 'NAME');
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_HA_BRIGHTNESS || 'Brightness')
        .appendField(new Blockly.FieldCheckbox('TRUE'), 'BRIGHTNESS');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour('#FFEB3B');
    this.setTooltip(Blockly.Msg.BLOCKS_HA_LIGHTCREATETOOLTIP || 'Create a light controllable from Home Assistant');
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
  const callback = javascriptGenerator.statementToCode(block, 'CALLBACK');
  const varName = `haLight_${lightId.replace(/[^a-zA-Z0-9]/g, '_')}`;

  generator.definitions_['ha_light_state_var'] = 'bool ha_light_state = false;';
  generator.definitions_['ha_light_brightness_var'] = 'uint8_t ha_light_brightness = 0;';

  generator.definitions_[`ha_light_callback_${lightId}`] = `
void onLight_${lightId.replace(/[^a-zA-Z0-9]/g, '_')}Command(bool state, uint8_t brightness) {
  ha_light_state = state;
  ha_light_brightness = brightness;
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
  return ['ha_light_state', Order.ATOMIC];
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
  return ['ha_light_brightness', Order.ATOMIC];
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
        .appendField('🔘 ' + (Blockly.Msg.BLOCKS_HA_BUTTONCREATE || 'HA Button Register'))
        .appendField(new Blockly.FieldTextInput('restart'), 'BUTTON_ID');
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_NAME || 'Name')
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
    this.setTooltip(Blockly.Msg.BLOCKS_HA_BUTTONCREATETOOLTIP || 'Create a button pressable from Home Assistant');
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
        .appendField('🔢 ' + (Blockly.Msg.BLOCKS_HA_NUMBERCREATE || 'HA Number Register'))
        .appendField(new Blockly.FieldTextInput('servo_angle'), 'NUMBER_ID');
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_NAME || 'Name')
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
    this.setTooltip(Blockly.Msg.BLOCKS_HA_NUMBERCREATETOOLTIP || 'Create an entity that accepts number input from Home Assistant');
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
  return ['ha_number_value', Order.ATOMIC];
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
  const value = javascriptGenerator.valueToCode(block, 'VALUE', Order.ATOMIC) || '0';
  const varName = `haNumber_${numberId.replace(/[^a-zA-Z0-9]/g, '_')}`;

  return `  ${varName}.setState(${value});\n`;
};

// ===== ファン（HAFan） =====

/**
 * ha_fan_create - HAファン作成
 */
Blockly.Blocks['ha_fan_create'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🌀 ' + (Blockly.Msg.BLOCKS_HA_FANCREATE || 'HA Fan Register'))
        .appendField(new Blockly.FieldTextInput('fan'), 'FAN_ID');
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_NAME || 'Name')
        .appendField(new Blockly.FieldTextInput('換気扇'), 'NAME');
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_HA_SPEEDCONTROL || 'Speed Control')
        .appendField(new Blockly.FieldCheckbox('TRUE'), 'SPEEDS');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour('#795548');
    this.setTooltip(Blockly.Msg.BLOCKS_HA_FANCREATETOOLTIP || 'Create a fan controllable from Home Assistant');
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
  return ['ha_fan_state', Order.ATOMIC];
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
  return ['ha_fan_speed', Order.ATOMIC];
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
        .appendField('🚪 ' + (Blockly.Msg.BLOCKS_HA_COVERCREATE || 'HA Cover Register'))
        .appendField(new Blockly.FieldTextInput('shutter'), 'COVER_ID');
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_NAME || 'Name')
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
    this.setTooltip(Blockly.Msg.BLOCKS_HA_COVERCREATETOOLTIP || 'Create a cover (shutter, etc.) controllable from Home Assistant');
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
        .appendField('🌈 ' + (Blockly.Msg.BLOCKS_HA_LIGHTCREATERGB || 'HA Light Register (RGB)'))
        .appendField(new Blockly.FieldTextInput('rgb_led'), 'LIGHT_ID');
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_NAME || 'Name')
        .appendField(new Blockly.FieldTextInput('RGB LED'), 'NAME');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour('#FFEB3B');
    this.setTooltip(Blockly.Msg.BLOCKS_HA_LIGHTCREATERGBTOOLTIP || 'Create an RGB color-controllable light');
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
  return ['ha_light_r', Order.ATOMIC];
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
  return ['ha_light_g', Order.ATOMIC];
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
  return ['ha_light_b', Order.ATOMIC];
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

  generator.definitions_[`ha_trigger_${triggerId}`] = `HADeviceTrigger ${varName}(HADeviceTrigger::${type.charAt(0).toUpperCase() + type.slice(1)}Type, "${subtype}");`;

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
        .appendField('🎬 ' + (Blockly.Msg.BLOCKS_HA_SCENECREATE || 'HA Scene Register'))
        .appendField(new Blockly.FieldTextInput('night_mode'), 'SCENE_ID');
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_NAME || 'Name')
        .appendField(new Blockly.FieldTextInput('ナイトモード'), 'NAME');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour('#3F51B5');
    this.setTooltip(Blockly.Msg.BLOCKS_HA_SCENECREATETOOLTIP || 'Create a scene executable from HA');
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
        .appendField('🏷️ ' + (Blockly.Msg.BLOCKS_HA_TAGSCANNERCREATE || 'HA Tag Scanner Register'))
        .appendField(new Blockly.FieldTextInput('nfc_reader'), 'SCANNER_ID');
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_NAME || 'Name')
        .appendField(new Blockly.FieldTextInput('NFCリーダー'), 'NAME');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour('#009688');
    this.setTooltip(Blockly.Msg.BLOCKS_HA_TAGSCANNERCREATETOOLTIP || 'Register NFC tag scanner, etc.');
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
  const tagId = javascriptGenerator.valueToCode(block, 'TAG_ID', Order.ATOMIC) || '""';
  const varName = `haTagScanner_${scannerId.replace(/[^a-zA-Z0-9]/g, '_')}`;

  return `  ${varName}.tagScanned(${tagId});\n`;
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
