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
        .appendField('📶 ' + ((Blockly.Msg as any).BLOCKS_BLE_UARTSETUP || 'BLE UART Setup'))
        .appendField((Blockly.Msg as any).BLOCKS_BLE_DEVICENAME || 'device name')
        .appendField(new Blockly.FieldTextInput('DigiCode'), 'NAME');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(BLE_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_BLE_UARTSETUOPTOOLTIP || 'Initialize BLE and start Nordic UART Service (NUS). Use nRF Connect app to connect and communicate.');
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
        .appendField('📶 ' + ((Blockly.Msg as any).BLOCKS_BLE_UARTWRITE || 'BLE Send'));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(BLE_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_BLE_UARTWRITETOOLTIP || 'Send a string to the connected smartphone via BLE Notify (NUS TX characteristic).');
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
        .appendField('📶 ' + ((Blockly.Msg as any).BLOCKS_BLE_UARTONRECEIVE || 'BLE On Receive'));
    this.appendStatementInput('HANDLER')
        .setCheck(null)
        .appendField((Blockly.Msg as any).BLOCKS_BLE_HANDLER || 'handler');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(BLE_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_BLE_UARTONRECEIVETOOLTIP || 'Execute handler when a BLE message is received. Use "bleMessage" variable to get the received text. Place in loop block.');
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
 * ble_is_connected - BLE 接続状態（Boolean 出力）
 */
Blockly.Blocks['ble_is_connected'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('📶 ' + ((Blockly.Msg as any).BLOCKS_BLE_ISCONNECTED || 'BLE Connected?'));
    this.setOutput(true, 'Boolean');
    this.setColour(BLE_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_BLE_ISCONNECTEDTOOLTIP || 'Returns true if a smartphone is currently connected via BLE.');
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
        .appendField('📡 ' + ((Blockly.Msg as any).BLOCKS_BLE_BEACON || 'iBeacon Broadcast'));
    this.appendDummyInput()
        .appendField((Blockly.Msg as any).BLOCKS_BLE_MAJOR || 'major')
        .appendField(new Blockly.FieldNumber(1, 0, 65535), 'MAJOR')
        .appendField((Blockly.Msg as any).BLOCKS_BLE_MINOR || 'minor')
        .appendField(new Blockly.FieldNumber(1, 0, 65535), 'MINOR');
    this.appendDummyInput()
        .appendField('UUID')
        .appendField(new Blockly.FieldTextInput('FDA50693-A4E2-4FB1-AFCF-C6EB07647825'), 'UUID');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(BLE_SCAN_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_BLE_BEACONTOOLTIP || 'Start broadcasting as an iBeacon with the specified UUID, major and minor values. Detectable by smartphone apps.');
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
        .appendField('📡 ' + ((Blockly.Msg as any).BLOCKS_BLE_SCANSTART || 'BLE Scan Start'))
        .appendField((Blockly.Msg as any).BLOCKS_BLE_DURATION || 'duration (sec)')
        .appendField(new Blockly.FieldNumber(5, 1, 60), 'DURATION');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(BLE_SCAN_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_BLE_SCANSTARTTOOLTIP || 'Start scanning for nearby BLE devices for the specified duration. Use ble_on_device_found to handle results.');
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
  if (!NimBLEDevice::getInitialized()) NimBLEDevice::init("");
  NimBLEScan* pScan = NimBLEDevice::getScan();
  pScan->setScanCallbacks(new BleScanCallbacks(), false);
  pScan->setActiveScan(true);
  pScan->start(${duration}, false);
`;
};

/**
 * ble_on_device_found - デバイス検出コールバック（loop 内で呼ぶ）
 * bleFoundName / bleFoundAddress / bleFoundRssi 変数で参照可能
 */
Blockly.Blocks['ble_on_device_found'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('📡 ' + ((Blockly.Msg as any).BLOCKS_BLE_ONDEVICEFOUND || 'BLE On Device Found'));
    this.appendStatementInput('HANDLER')
        .setCheck(null)
        .appendField((Blockly.Msg as any).BLOCKS_BLE_HANDLER || 'handler');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(BLE_SCAN_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_BLE_ONDEVICEFOUNDTOOLTIP || 'Execute handler when a BLE device is found during scan. Use bleFoundName, bleFoundAddress, bleFoundRssi variables.');
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

/**
 * ble_get_rssi - 接続中デバイスの RSSI 取得
 */
Blockly.Blocks['ble_get_rssi'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('📶 ' + ((Blockly.Msg as any).BLOCKS_BLE_GETRSSI || 'BLE RSSI'));
    this.setOutput(true, 'Number');
    this.setColour(BLE_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_BLE_GETRSSITOOLTIP || 'Get the RSSI (signal strength) of the connected BLE device. Returns dBm value (negative, closer to 0 = stronger signal).');
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
        .appendField('📶 ' + ((Blockly.Msg as any).BLOCKS_BLE_DISCONNECT || 'BLE Disconnect'));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(BLE_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_BLE_DISCONNECTTOOLTIP || 'Disconnect the currently connected BLE device and restart advertising.');
  }
};

generator.forBlock['ble_disconnect'] = function() {
  generator.definitions_['include_nimble'] = NimBLE_INCLUDE;
  generator.definitions_['ble_globals'] = BLE_GLOBALS;
  return `  if (pBleServer) { pBleServer->disconnectAll(); NimBLEDevice::startAdvertising(); }\n`;
};

console.log('BLE blocks loaded');
