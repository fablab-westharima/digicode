/**
 * BLE ブロック (BP4-1a / BP4-2, 2026-04-20)
 *
 * ESP32 専用 (NimBLE-Arduino ライブラリ)
 * RP2040 系は supportsBle: false → toolbox 非表示
 *
 * BP4-1a: Nordic UART Service (NUS) — スマホアプリ連携定番パターン
 * BP4-2:  iBeacon 送信 / BLE スキャン / 状態確認 / 切断
 *
 * i18n: Blockly.Msg.* パターン（ルール33）
 */
import * as Blockly from 'blockly';
import { javascriptGenerator } from 'blockly/javascript';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const generator = javascriptGenerator as any;

if (!generator.definitions_) generator.definitions_ = {};

const BLE_COLOR = '#2196F3';
const BLE_SCAN_COLOR = '#00BCD4';

// ===== 共通 definitions =====

const NimBLE_INCLUDE = `#include <NimBLEDevice.h>`;

const NUS_UUIDS = `
#define NUS_SERVICE_UUID "6E400001-B5A3-F393-E0A9-E50E24DCCA9E"
#define NUS_RX_UUID      "6E400002-B5A3-F393-E0A9-E50E24DCCA9E"
#define NUS_TX_UUID      "6E400003-B5A3-F393-E0A9-E50E24DCCA9E"`;

const BLE_GLOBALS = `
NimBLEServer* pBleServer = nullptr;
NimBLECharacteristic* pBleTxChar = nullptr;
bool bleConnected = false;
String bleMessage = "";`;

const SERVER_CALLBACKS = `
class BleServerCallbacks : public NimBLEServerCallbacks {
  void onConnect(NimBLEServer* s) { bleConnected = true; }
  void onDisconnect(NimBLEServer* s) {
    bleConnected = false;
    NimBLEDevice::startAdvertising();
  }
};`;

// ===== BP4-1a: Nordic UART Service =====

/**
 * ble_uart_setup - BLE 初期化 + NUS サービス起動
 */
Blockly.Blocks['ble_uart_setup'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('📶 ' + (Blockly.Msg.BLOCKS_BLE_UARTSETUP || 'BLE UART Setup'))
        .appendField(Blockly.Msg.BLOCKS_BLE_DEVICENAME || 'device name')
        .appendField(new Blockly.FieldTextInput('DigiCode'), 'NAME');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(BLE_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_BLE_UARTSETUOPTOOLTIP || 'Initialize BLE and start Nordic UART Service (NUS). Use nRF Connect app to connect and communicate.');
  }
};

generator.forBlock['ble_uart_setup'] = function(block: Blockly.Block) {
  const name = block.getFieldValue('NAME');
  generator.definitions_['include_nimble'] = NimBLE_INCLUDE;
  generator.definitions_['nus_uuids'] = NUS_UUIDS;
  generator.definitions_['ble_globals'] = BLE_GLOBALS;
  generator.definitions_['ble_server_callbacks'] = SERVER_CALLBACKS;
  generator.definitions_['ble_rx_callbacks'] = `
class BleRxCallbacks : public NimBLECharacteristicCallbacks {
  void onWrite(NimBLECharacteristic* c) {
    std::string v = c->getValue();
    bleMessage = String(v.c_str());
  }
};`;
  return `
  NimBLEDevice::init("${name}");
  pBleServer = NimBLEDevice::createServer();
  pBleServer->setCallbacks(new BleServerCallbacks());
  NimBLEService* pNus = pBleServer->createService(NUS_SERVICE_UUID);
  pBleTxChar = pNus->createCharacteristic(NUS_TX_UUID, NIMBLE_PROPERTY::NOTIFY);
  NimBLECharacteristic* pRxChar = pNus->createCharacteristic(NUS_RX_UUID, NIMBLE_PROPERTY::WRITE | NIMBLE_PROPERTY::WRITE_NR);
  pRxChar->setCallbacks(new BleRxCallbacks());
  pNus->start();
  NimBLEAdvertising* pAdv = NimBLEDevice::getAdvertising();
  pAdv->addServiceUUID(NUS_SERVICE_UUID);
  pAdv->start();
`;
};

/**
 * ble_uart_write - NUS 経由でスマホへ送信（Notify）
 */
Blockly.Blocks['ble_uart_write'] = {
  init: function() {
    this.appendValueInput('TEXT')
        .setCheck(null)
        .appendField('📶 ' + (Blockly.Msg.BLOCKS_BLE_UARTWRITE || 'BLE Send'));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(BLE_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_BLE_UARTWRITETOOLTIP || 'Send a string to the connected smartphone via BLE Notify (NUS TX characteristic).');
  }
};

generator.forBlock['ble_uart_write'] = function(block: Blockly.Block) {
  const text = javascriptGenerator.valueToCode(block, 'TEXT', 0) || '""';
  generator.definitions_['include_nimble'] = NimBLE_INCLUDE;
  generator.definitions_['ble_globals'] = BLE_GLOBALS;
  return `  if (bleConnected && pBleTxChar) { String _s = String(${text}); pBleTxChar->setValue(_s.c_str()); pBleTxChar->notify(); }\n`;
};

/**
 * ble_uart_on_receive - NUS 受信コールバック（loop 内で呼ぶ）
 * 受信文字列は bleMessage 変数で参照可能
 */
Blockly.Blocks['ble_uart_on_receive'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('📶 ' + (Blockly.Msg.BLOCKS_BLE_UARTONRECEIVE || 'BLE On Receive'));
    this.appendStatementInput('HANDLER')
        .setCheck(null)
        .appendField(Blockly.Msg.BLOCKS_BLE_HANDLER || 'handler');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(BLE_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_BLE_UARTONRECEIVETOOLTIP || 'Execute handler when a BLE UART message is received. Use the "BLE Received" value block inside the handler to read the received text. Place in loop block.');
  }
};

generator.forBlock['ble_uart_on_receive'] = function(block: Blockly.Block) {
  const handler = javascriptGenerator.statementToCode(block, 'HANDLER');
  generator.definitions_['include_nimble'] = NimBLE_INCLUDE;
  generator.definitions_['ble_globals'] = BLE_GLOBALS;
  generator.definitions_['ble_receive_func'] = `
void bleCheckReceive() {
  if (bleMessage.length() > 0) {
${handler}    bleMessage = "";
  }
}`;
  return `  bleCheckReceive();\n`;
};

/**
 * ble_received_value - BLE 受信値取得（NUS UART / GATT On Write 両 HANDLER で有効）
 * BUG-052 / BUG-053 解消: 各 HANDLER 内で受信値を Blockly レベル取得可能に
 * （旧 ble_uart_get_received を汎用化、3 系統の HANDLER で再利用）
 */
Blockly.Blocks['ble_received_value'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('📶 ' + (Blockly.Msg.BLOCKS_BLE_RECEIVEDVALUE || 'BLE Received'));
    this.setOutput(true, 'String');
    this.setColour(BLE_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_BLE_RECEIVEDVALUETOOLTIP || 'Get the message received last via BLE. Use only inside a BLE On Receive or BLE On Write handler. Returns an empty string when no message has arrived.');
  }
};

generator.forBlock['ble_received_value'] = function() {
  generator.definitions_['include_nimble'] = NimBLE_INCLUDE;
  generator.definitions_['ble_globals'] = BLE_GLOBALS;
  return ['bleMessage', 0];
};

// Legacy alias: ble_uart_get_received (BUG-052, sunset: 2027-04-26)
// 既存ユーザー XML の互換維持。catalog 生成スクリプトは Blockly.Blocks['xxx'] = { init: ... } のパターンのみ拾うため、本 alias は catalog に露出しない。
Blockly.Blocks['ble_uart_get_received'] = Blockly.Blocks['ble_received_value'];
generator.forBlock['ble_uart_get_received'] = generator.forBlock['ble_received_value'];

/**
 * ble_is_connected - BLE 接続状態（Boolean 出力）
 */
Blockly.Blocks['ble_is_connected'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('📶 ' + (Blockly.Msg.BLOCKS_BLE_ISCONNECTED || 'BLE Connected?'));
    this.setOutput(true, 'Boolean');
    this.setColour(BLE_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_BLE_ISCONNECTEDTOOLTIP || 'Returns true if a smartphone is currently connected via BLE.');
  }
};

generator.forBlock['ble_is_connected'] = function() {
  generator.definitions_['include_nimble'] = NimBLE_INCLUDE;
  generator.definitions_['ble_globals'] = BLE_GLOBALS;
  return ['bleConnected', 0];
};

// ===== BP4-2: Beacon / Scan / Status =====

/**
 * ble_beacon_broadcast - iBeacon 送信
 */
Blockly.Blocks['ble_beacon_broadcast'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('📡 ' + (Blockly.Msg.BLOCKS_BLE_BEACON || 'iBeacon Broadcast'));
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_BLE_MAJOR || 'major')
        .appendField(new Blockly.FieldNumber(1, 0, 65535), 'MAJOR')
        .appendField(Blockly.Msg.BLOCKS_BLE_MINOR || 'minor')
        .appendField(new Blockly.FieldNumber(1, 0, 65535), 'MINOR');
    this.appendDummyInput()
        .appendField('UUID')
        .appendField(new Blockly.FieldTextInput('FDA50693-A4E2-4FB1-AFCF-C6EB07647825'), 'UUID');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(BLE_SCAN_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_BLE_BEACONTOOLTIP || 'Start broadcasting as an iBeacon with the specified UUID, major and minor values. Detectable by smartphone apps.');
  }
};

generator.forBlock['ble_beacon_broadcast'] = function(block: Blockly.Block) {
  const major = block.getFieldValue('MAJOR');
  const minor = block.getFieldValue('MINOR');
  const uuid = block.getFieldValue('UUID');
  generator.definitions_['include_nimble'] = NimBLE_INCLUDE;
  generator.definitions_['include_nimble_beacon'] = '#include <NimBLEBeacon.h>';
  return `
  NimBLEDevice::init("");
  NimBLEAdvertising* pAdv = NimBLEDevice::getAdvertising();
  NimBLEBeacon oBeacon;
  oBeacon.setManufacturerId(0x4C00);
  oBeacon.setProximityUUID(NimBLEUUID("${uuid}"));
  oBeacon.setMajor(${major});
  oBeacon.setMinor(${minor});
  NimBLEAdvertisementData advData;
  advData.setFlags(0x04);
  std::string beaconData = "";
  beaconData += (char)26;
  beaconData += (char)0xFF;
  beaconData += oBeacon.getData();
  advData.addData(beaconData);
  pAdv->setAdvertisementData(advData);
  pAdv->start();
`;
};

/**
 * ble_scan_start - BLE スキャン開始
 */
Blockly.Blocks['ble_scan_start'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('📡 ' + (Blockly.Msg.BLOCKS_BLE_SCANSTART || 'BLE Scan Start'))
        .appendField(Blockly.Msg.BLOCKS_BLE_DURATION || 'duration (sec)')
        .appendField(new Blockly.FieldNumber(5, 1, 60), 'DURATION');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(BLE_SCAN_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_BLE_SCANSTARTTOOLTIP || 'Start scanning for nearby BLE devices for the specified duration. Use ble_on_device_found to handle results.');
  }
};

generator.forBlock['ble_scan_start'] = function(block: Blockly.Block) {
  const duration = block.getFieldValue('DURATION');
  generator.definitions_['include_nimble'] = NimBLE_INCLUDE;
  generator.definitions_['ble_scan_globals'] = `
bool bleDeviceFound = false;
String bleFoundName = "";
String bleFoundAddress = "";
int bleFoundRssi = 0;`;
  generator.definitions_['ble_scan_callbacks'] = `
class BleScanCallbacks : public NimBLEScanCallbacks {
  void onResult(NimBLEAdvertisedDevice* d) {
    bleDeviceFound = true;
    bleFoundName = String(d->getName().c_str());
    bleFoundAddress = String(d->getAddress().toString().c_str());
    bleFoundRssi = d->getRSSI();
  }
};`;
  return `
  if (!NimBLEDevice::isInitialized()) NimBLEDevice::init("");
  NimBLEScan* pScan = NimBLEDevice::getScan();
  pScan->setScanCallbacks(new BleScanCallbacks(), false);
  pScan->setActiveScan(true);
  pScan->start(${duration}, false);
`;
};

/**
 * ble_on_device_found - デバイス検出コールバック（loop 内で呼ぶ）
 * HANDLER 内では ble_scan_found_name / ble_scan_found_address / ble_scan_found_rssi で値取得
 */
Blockly.Blocks['ble_on_device_found'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('📡 ' + (Blockly.Msg.BLOCKS_BLE_ONDEVICEFOUND || 'BLE On Device Found'));
    this.appendStatementInput('HANDLER')
        .setCheck(null)
        .appendField(Blockly.Msg.BLOCKS_BLE_HANDLER || 'handler');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(BLE_SCAN_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_BLE_ONDEVICEFOUNDTOOLTIP || 'Execute handler when a BLE device is found during scan. Use the "BLE Scan Name / Address / RSSI" value blocks inside the handler to read the detected values.');
  }
};

generator.forBlock['ble_on_device_found'] = function(block: Blockly.Block) {
  const handler = javascriptGenerator.statementToCode(block, 'HANDLER');
  generator.definitions_['include_nimble'] = NimBLE_INCLUDE;
  generator.definitions_['ble_scan_globals'] = `
bool bleDeviceFound = false;
String bleFoundName = "";
String bleFoundAddress = "";
int bleFoundRssi = 0;`;
  generator.definitions_['ble_device_found_func'] = `
void bleCheckDeviceFound() {
  if (bleDeviceFound) {
    bleDeviceFound = false;
${handler}  }
}`;
  return `  bleCheckDeviceFound();\n`;
};

// 共通 globals 参照用（scan_found 系 value block で再利用）
const BLE_SCAN_GLOBALS = `
bool bleDeviceFound = false;
String bleFoundName = "";
String bleFoundAddress = "";
int bleFoundRssi = 0;`;

/**
 * ble_scan_found_name - スキャンで検出したデバイス名（HANDLER 内のみ有効）
 * BUG-054 解消: ble_on_device_found HANDLER 内で deviceName を Blockly レベル取得可能に
 */
Blockly.Blocks['ble_scan_found_name'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('📡 ' + (Blockly.Msg.BLOCKS_BLE_SCANFOUNDNAME || 'BLE Scan Name'));
    this.setOutput(true, 'String');
    this.setColour(BLE_SCAN_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_BLE_SCANFOUNDNAMETOOLTIP || 'Get the name of the BLE device just detected. Use only inside a BLE On Device Found handler. Returns an empty string when no device has been detected.');
  }
};

generator.forBlock['ble_scan_found_name'] = function() {
  generator.definitions_['include_nimble'] = NimBLE_INCLUDE;
  generator.definitions_['ble_scan_globals'] = BLE_SCAN_GLOBALS;
  return ['bleFoundName', 0];
};

/**
 * ble_scan_found_address - 検出デバイスの MAC アドレス（HANDLER 内のみ有効）
 */
Blockly.Blocks['ble_scan_found_address'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('📡 ' + (Blockly.Msg.BLOCKS_BLE_SCANFOUNDADDRESS || 'BLE Scan Address'));
    this.setOutput(true, 'String');
    this.setColour(BLE_SCAN_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_BLE_SCANFOUNDADDRESSTOOLTIP || 'Get the MAC address of the BLE device just detected. Use only inside a BLE On Device Found handler. Returns an empty string when no device has been detected.');
  }
};

generator.forBlock['ble_scan_found_address'] = function() {
  generator.definitions_['include_nimble'] = NimBLE_INCLUDE;
  generator.definitions_['ble_scan_globals'] = BLE_SCAN_GLOBALS;
  return ['bleFoundAddress', 0];
};

/**
 * ble_scan_found_rssi - 検出デバイスの RSSI（dBm、Number 出力、HANDLER 内のみ有効）
 */
Blockly.Blocks['ble_scan_found_rssi'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('📡 ' + (Blockly.Msg.BLOCKS_BLE_SCANFOUNDRSSI || 'BLE Scan RSSI'));
    this.setOutput(true, 'Number');
    this.setColour(BLE_SCAN_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_BLE_SCANFOUNDRSSITOOLTIP || 'Get the RSSI (dBm, negative; closer to 0 = stronger) of the BLE device just detected. Use only inside a BLE On Device Found handler. Returns 0 when no device has been detected.');
  }
};

generator.forBlock['ble_scan_found_rssi'] = function() {
  generator.definitions_['include_nimble'] = NimBLE_INCLUDE;
  generator.definitions_['ble_scan_globals'] = BLE_SCAN_GLOBALS;
  return ['bleFoundRssi', 0];
};

/**
 * ble_get_rssi - 接続中デバイスの RSSI 取得
 */
Blockly.Blocks['ble_get_rssi'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('📶 ' + (Blockly.Msg.BLOCKS_BLE_GETRSSI || 'BLE RSSI'));
    this.setOutput(true, 'Number');
    this.setColour(BLE_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_BLE_GETRSSITOOLTIP || 'Get the RSSI (signal strength) of the connected BLE device. Returns dBm value (negative, closer to 0 = stronger signal).');
  }
};

generator.forBlock['ble_get_rssi'] = function() {
  generator.definitions_['include_nimble'] = NimBLE_INCLUDE;
  generator.definitions_['ble_globals'] = BLE_GLOBALS;
  return ['(pBleServer && bleConnected ? pBleServer->getPeerInfo(0).getConnHandle() : 0)', 0];
};

/**
 * ble_disconnect - BLE 接続切断
 */
Blockly.Blocks['ble_disconnect'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('📶 ' + (Blockly.Msg.BLOCKS_BLE_DISCONNECT || 'BLE Disconnect'));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(BLE_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_BLE_DISCONNECTTOOLTIP || 'Disconnect the currently connected BLE device and restart advertising.');
  }
};

generator.forBlock['ble_disconnect'] = function() {
  generator.definitions_['include_nimble'] = NimBLE_INCLUDE;
  generator.definitions_['ble_globals'] = BLE_GLOBALS;
  return `  if (pBleServer) { pBleServer->disconnectAll(); NimBLEDevice::startAdvertising(); }\n`;
};

// ===== BP4-1b: GATT カスタムサービス =====

const GATT_COLOR = '#1565C0';

const GATT_GLOBALS = `
#include <map>
std::map<std::string, NimBLECharacteristic*> bleCharMap;
std::map<std::string, NimBLEService*> bleServiceMap;
String bleWriteCharUuid = "";`;

const GATT_WRITE_CALLBACKS = `
class GattWriteCallbacks : public NimBLECharacteristicCallbacks {
  std::string _uuid;
public:
  GattWriteCallbacks(const std::string& uuid) : _uuid(uuid) {}
  void onWrite(NimBLECharacteristic* c) {
    bleWriteCharUuid = String(_uuid.c_str());
    std::string v = c->getValue();
    bleMessage = String(v.c_str());
  }
};`;

/**
 * ble_init - BLE スタック初期化（UART を使わない場合の起点）
 */
Blockly.Blocks['ble_init'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('📶 ' + (Blockly.Msg.BLOCKS_BLE_INIT || 'BLE Init'))
        .appendField(Blockly.Msg.BLOCKS_BLE_DEVICENAME || 'device name')
        .appendField(new Blockly.FieldTextInput('DigiCode'), 'NAME');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(GATT_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_BLE_INITTOOLTIP || 'Initialize BLE stack. Call before ble_add_service. Use ble_uart_setup instead if only using Nordic UART.');
  }
};

generator.forBlock['ble_init'] = function(block: Blockly.Block) {
  const name = block.getFieldValue('NAME');
  generator.definitions_['include_nimble'] = NimBLE_INCLUDE;
  generator.definitions_['ble_globals'] = BLE_GLOBALS;
  generator.definitions_['ble_gatt_globals'] = GATT_GLOBALS;
  generator.definitions_['ble_server_callbacks'] = SERVER_CALLBACKS;
  return `
  NimBLEDevice::init("${name}");
  pBleServer = NimBLEDevice::createServer();
  pBleServer->setCallbacks(new BleServerCallbacks());
`;
};

/**
 * ble_add_service - カスタム GATT サービス追加
 */
Blockly.Blocks['ble_add_service'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('📶 ' + (Blockly.Msg.BLOCKS_BLE_ADDSERVICE || 'BLE Add Service'))
        .appendField('UUID')
        .appendField(new Blockly.FieldTextInput('12345678-1234-1234-1234-123456789ABC'), 'UUID');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(GATT_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_BLE_ADDSERVICETOOLTIP || 'Create a custom GATT service with the given UUID. Call ble_add_characteristic next, then ble_start_advertising.');
  }
};

generator.forBlock['ble_add_service'] = function(block: Blockly.Block) {
  const uuid = block.getFieldValue('UUID');
  generator.definitions_['include_nimble'] = NimBLE_INCLUDE;
  generator.definitions_['ble_gatt_globals'] = GATT_GLOBALS;
  return `
  {
    NimBLEService* svc = pBleServer->createService("${uuid}");
    bleServiceMap["${uuid}"] = svc;
  }
`;
};

/**
 * ble_add_characteristic - Characteristic 追加（read/write/notify チェックボックス）
 */
Blockly.Blocks['ble_add_characteristic'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('📶 ' + (Blockly.Msg.BLOCKS_BLE_ADDCHAR || 'BLE Add Characteristic'));
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_BLE_SERVICEUUID || 'service UUID')
        .appendField(new Blockly.FieldTextInput('12345678-1234-1234-1234-123456789ABC'), 'SERVICE_UUID');
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_BLE_CHARUUID || 'char UUID')
        .appendField(new Blockly.FieldTextInput('00001111-1234-1234-1234-123456789ABC'), 'CHAR_UUID');
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_BLE_PROPREAD || 'read')
        .appendField(new Blockly.FieldCheckbox('TRUE'), 'READ')
        .appendField(Blockly.Msg.BLOCKS_BLE_PROPWRITE || 'write')
        .appendField(new Blockly.FieldCheckbox('TRUE'), 'WRITE')
        .appendField(Blockly.Msg.BLOCKS_BLE_PROPNOTIFY || 'notify')
        .appendField(new Blockly.FieldCheckbox('FALSE'), 'NOTIFY');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(GATT_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_BLE_ADDCHARTOOLTIP || 'Add a characteristic to a GATT service. Check read/write/notify as needed. The service must be created with ble_add_service first.');
  }
};

generator.forBlock['ble_add_characteristic'] = function(block: Blockly.Block) {
  const serviceUuid = block.getFieldValue('SERVICE_UUID');
  const charUuid = block.getFieldValue('CHAR_UUID');
  const canRead = block.getFieldValue('READ') === 'TRUE';
  const canWrite = block.getFieldValue('WRITE') === 'TRUE';
  const canNotify = block.getFieldValue('NOTIFY') === 'TRUE';

  const props: string[] = [];
  if (canRead) props.push('NIMBLE_PROPERTY::READ');
  if (canWrite) props.push('NIMBLE_PROPERTY::WRITE | NIMBLE_PROPERTY::WRITE_NR');
  if (canNotify) props.push('NIMBLE_PROPERTY::NOTIFY');
  const propsStr = props.length > 0 ? props.join(' | ') : 'NIMBLE_PROPERTY::READ';

  generator.definitions_['include_nimble'] = NimBLE_INCLUDE;
  generator.definitions_['ble_globals'] = BLE_GLOBALS;
  generator.definitions_['ble_gatt_globals'] = GATT_GLOBALS;
  generator.definitions_['ble_gatt_write_callbacks'] = GATT_WRITE_CALLBACKS;

  const writeCallback = canWrite
    ? `    bleCharMap["${charUuid}"]->setCallbacks(new GattWriteCallbacks("${charUuid}"));`
    : '';

  return `
  if (bleServiceMap.count("${serviceUuid}")) {
    NimBLECharacteristic* c = bleServiceMap["${serviceUuid}"]->createCharacteristic("${charUuid}", ${propsStr});
    bleCharMap["${charUuid}"] = c;
${writeCallback}
    bleServiceMap["${serviceUuid}"]->start();
  }
`;
};

/**
 * ble_notify - 任意 Characteristic に notify 送信
 */
Blockly.Blocks['ble_notify'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('📶 ' + (Blockly.Msg.BLOCKS_BLE_NOTIFY || 'BLE Notify'))
        .appendField(Blockly.Msg.BLOCKS_BLE_CHARUUID || 'char UUID')
        .appendField(new Blockly.FieldTextInput('00001111-1234-1234-1234-123456789ABC'), 'CHAR_UUID');
    this.appendValueInput('VALUE')
        .setCheck(null)
        .appendField(Blockly.Msg.BLOCKS_BLE_VALUE || 'value');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(GATT_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_BLE_NOTIFYTOOLTIP || 'Send a notify to the connected device via the specified characteristic UUID. The characteristic must have notify enabled.');
  }
};

generator.forBlock['ble_notify'] = function(block: Blockly.Block) {
  const charUuid = block.getFieldValue('CHAR_UUID');
  const value = javascriptGenerator.valueToCode(block, 'VALUE', 0) || '""';
  generator.definitions_['include_nimble'] = NimBLE_INCLUDE;
  generator.definitions_['ble_gatt_globals'] = GATT_GLOBALS;
  return `  if (bleConnected && bleCharMap.count("${charUuid}")) { String _v = String(${value}); bleCharMap["${charUuid}"]->setValue(_v.c_str()); bleCharMap["${charUuid}"]->notify(); }\n`;
};

/**
 * ble_on_write - 任意 Characteristic への Write コールバック（loop 内）
 * BUG-053 解消: ble_received_value で HANDLER 内の受信値を Blockly レベル取得可能に
 */
Blockly.Blocks['ble_on_write'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('📶 ' + (Blockly.Msg.BLOCKS_BLE_ONWRITE || 'BLE On Write'))
        .appendField(Blockly.Msg.BLOCKS_BLE_CHARUUID || 'char UUID')
        .appendField(new Blockly.FieldTextInput('00001111-1234-1234-1234-123456789ABC'), 'CHAR_UUID');
    this.appendStatementInput('HANDLER')
        .setCheck(null)
        .appendField(Blockly.Msg.BLOCKS_BLE_HANDLER || 'handler');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(GATT_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_BLE_ONWRITETOOLTIP || 'Execute handler when the specified characteristic is written by the connected device. Use the "BLE Received" value block inside the handler to read the received text. Place in loop block.');
  }
};

generator.forBlock['ble_on_write'] = function(block: Blockly.Block) {
  const charUuid = block.getFieldValue('CHAR_UUID');
  const handler = javascriptGenerator.statementToCode(block, 'HANDLER');
  generator.definitions_['include_nimble'] = NimBLE_INCLUDE;
  generator.definitions_['ble_globals'] = BLE_GLOBALS;
  generator.definitions_['ble_gatt_globals'] = GATT_GLOBALS;
  const funcKey = `ble_on_write_${charUuid.replace(/-/g, '_')}`;
  // BUG-053 fix: bleMessage / bleWriteCharUuid のリセットを HANDLER 後に移動。
  // NUS UART (bleCheckReceive) と対称、ble_received_value が HANDLER 内で受信値を取得可能になる。
  generator.definitions_[funcKey] = `
void bleCheckWrite_${charUuid.replace(/-/g, '_')}() {
  if (bleWriteCharUuid == "${charUuid}" && bleMessage.length() > 0) {
${handler}    bleMessage = "";
    bleWriteCharUuid = "";
  }
}`;
  return `  bleCheckWrite_${charUuid.replace(/-/g, '_')}();\n`;
};

/**
 * ble_start_advertising - 全サービス登録後にアドバタイズ開始
 */
Blockly.Blocks['ble_start_advertising'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('📶 ' + (Blockly.Msg.BLOCKS_BLE_STARTADV || 'BLE Start Advertising'));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(GATT_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_BLE_STARTADVTOOLTIP || 'Start BLE advertising after all services and characteristics are added. Smartphones can then discover and connect to this device.');
  }
};

generator.forBlock['ble_start_advertising'] = function() {
  generator.definitions_['include_nimble'] = NimBLE_INCLUDE;
  generator.definitions_['ble_gatt_globals'] = GATT_GLOBALS;
  return `  NimBLEDevice::startAdvertising();\n`;
};

console.log('BLE blocks loaded');
