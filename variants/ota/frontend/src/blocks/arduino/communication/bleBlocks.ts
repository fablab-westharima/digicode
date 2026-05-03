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

// Unified loop-tick mechanism (Bug 3 defensive fix, 2026-05-03):
// ble_uart_on_receive / ble_on_write previously each emitted a separate
// `bleCheckXxx();` call from the block return value. If the user misplaced
// the block (top-level, setup-only, etc.) the call landed at file scope
// (compile error) or in the wrong scope. Now every BLE handler registers
// itself into `bleLoopHandlers` via static initializer, and a single
// `bleLoopTick()` walks them. Block return value emits `bleLoopTick();` —
// one identical call regardless of how many handlers, idempotent across
// duplicate placements.
const BLE_LOOP_TICK_GLOBALS = `
#include <vector>
typedef void (*BleLoopHandler)();
std::vector<BleLoopHandler>& _bleLoopHandlers() {
  static std::vector<BleLoopHandler> v;
  return v;
}
struct _BleLoopRegister {
  _BleLoopRegister(BleLoopHandler h) { _bleLoopHandlers().push_back(h); }
};
void bleLoopTick() {
  for (auto h : _bleLoopHandlers()) h();
}`;

// NimBLE-Arduino v2.4.0 (vendored) signatures: onConnect / onDisconnect now
// take NimBLEConnInfo&, and onDisconnect adds an int reason. The library no
// longer auto-restarts advertising on disconnect (migration guide § Server),
// so the manual NimBLEDevice::startAdvertising() call below is the supported
// migrate path. Args are unused by us — body unchanged from v1. (BUG-065)
const SERVER_CALLBACKS = `
class BleServerCallbacks : public NimBLEServerCallbacks {
  void onConnect(NimBLEServer* s, NimBLEConnInfo& connInfo) { bleConnected = true; }
  void onDisconnect(NimBLEServer* s, NimBLEConnInfo& connInfo, int reason) {
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
  // NimBLE v2: onWrite takes NimBLEConnInfo& (BUG-065). Arg unused, body unchanged.
  generator.definitions_['ble_rx_callbacks'] = `
class BleRxCallbacks : public NimBLECharacteristicCallbacks {
  void onWrite(NimBLECharacteristic* c, NimBLEConnInfo& connInfo) {
    std::string v = c->getValue();
    bleMessage = String(v.c_str());
  }
};`;
  // NimBLE v2: advertising name は default 非自動 + scan response も default
  // OFF (migration guide § Advertising line 192/195)。Primary advertising
  // packet は 31 byte 上限 (Flags 3 + 128-bit NUS Service UUID 18 = 21 byte
  // 占有、残 10 byte で name overhead 2 byte 引くと name は 8 byte 上限 →
  // "DigiCodeTest" 12 byte は entry できず silently drop)。
  // scan response を enableScanResponse(true) で有効化 → setName() が
  // m_scanResp フラグを参照して scan response data に name を配置 → 12+ byte
  // name も収容可能。onDisconnect 内の NimBLEDevice::startAdvertising() 再
  // advertise 時も同 config 継続。(BUG-069 round 2)
  //
  // Bug 1 fix (2026-05-03): make NimBLEDevice::init / createServer idempotent.
  // U5 mix (NUS + GATT custom) chained ble_uart_setup → ble_init both calling
  // createServer() overwrote pBleServer and lost the NUS service. Guard with
  // `if (!pBleServer)` so the second caller skips re-init. NUS service start
  // remains self-contained inline (NOT in bleServiceMap) so that NUS-only
  // programs (U1) without ble_start_advertising still work — preserves
  // backwards compat. NimBLEService::start() / NimBLEAdvertising::start()
  // duplicate calls in mixed flows (NUS + GATT custom) are safe — NimBLE v2
  // handles re-start as a no-op for the advertising layer; pNus->start() runs
  // exactly once because pNus is local and never observed by ble_start_adv.
  return `
  if (!pBleServer) {
    NimBLEDevice::init("${name}");
    pBleServer = NimBLEDevice::createServer();
    pBleServer->setCallbacks(new BleServerCallbacks());
  }
  {
    NimBLEService* pNus = pBleServer->createService(NUS_SERVICE_UUID);
    pBleTxChar = pNus->createCharacteristic(NUS_TX_UUID, NIMBLE_PROPERTY::NOTIFY);
    NimBLECharacteristic* pRxChar = pNus->createCharacteristic(NUS_RX_UUID, NIMBLE_PROPERTY::WRITE | NIMBLE_PROPERTY::WRITE_NR);
    pRxChar->setCallbacks(new BleRxCallbacks());
    pNus->start();
    NimBLEAdvertising* pAdv = NimBLEDevice::getAdvertising();
    pAdv->addServiceUUID(NUS_SERVICE_UUID);
    pAdv->enableScanResponse(true);
    pAdv->setName("${name}");
    pAdv->start();
  }
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
  // Bug 3 fix (2026-05-03): register the check via static initializer so the
  // call always lands inside the right scope. Previously the block returned
  // `  bleCheckReceive();\n` which the user had to manually place inside
  // arduino_loop — misplacement (top-level / setup-only) caused file-scope
  // statements (compile error) or one-shot execution. Now we register
  // bleCheckReceive into _bleLoopHandlers via a global static initializer
  // (runs before main()), and the block emits a single unified
  // `bleLoopTick();` call that walks all registered handlers idempotently.
  generator.definitions_['ble_loop_tick_globals'] = BLE_LOOP_TICK_GLOBALS;
  generator.definitions_['ble_receive_func'] = `
void bleCheckReceive() {
  if (bleMessage.length() > 0) {
${handler}    bleMessage = "";
  }
}
static _BleLoopRegister _reg_bleCheckReceive(bleCheckReceive);`;
  return `  bleLoopTick();\n`;
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
    this.appendValueInput('MAJOR').appendField(Blockly.Msg.BLOCKS_BLE_MAJOR || 'major');
    this.appendValueInput('MINOR').appendField(Blockly.Msg.BLOCKS_BLE_MINOR || 'minor');
    this.appendDummyInput()
        .appendField('UUID')
        .appendField(new Blockly.FieldTextInput('FDA50693-A4E2-4FB1-AFCF-C6EB07647825'), 'UUID');
    this.setInputsInline(true);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(BLE_SCAN_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_BLE_BEACONTOOLTIP || 'Start broadcasting as an iBeacon with the specified UUID, major and minor values. Detectable by smartphone apps.');
  }
};

generator.forBlock['ble_beacon_broadcast'] = function(block: Blockly.Block) {
  const major = generator.valueToCode(block, 'MAJOR', generator.ORDER_ATOMIC) || '1';
  const minor = generator.valueToCode(block, 'MINOR', generator.ORDER_ATOMIC) || '1';
  const uuid = block.getFieldValue('UUID');
  generator.definitions_['include_nimble'] = NimBLE_INCLUDE;
  generator.definitions_['include_nimble_beacon'] = '#include <NimBLEBeacon.h>';
  return `
  NimBLEDevice::init("");
  NimBLEAdvertising* pAdv = NimBLEDevice::getAdvertising();
  NimBLEBeacon oBeacon;
  oBeacon.setManufacturerId(0x4C00);
  oBeacon.setProximityUUID(NimBLEUUID("${uuid}"));
  oBeacon.setMajor(String(${major}).toInt());
  oBeacon.setMinor(String(${minor}).toInt());
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
        .appendField('📡 ' + (Blockly.Msg.BLOCKS_BLE_SCANSTART || 'BLE Scan Start'));
    this.appendValueInput('DURATION')
        .appendField(Blockly.Msg.BLOCKS_BLE_DURATION || 'duration (sec)');
    this.setInputsInline(true);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(BLE_SCAN_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_BLE_SCANSTARTTOOLTIP || 'Start scanning for nearby BLE devices for the specified duration. Use ble_on_device_found to handle results.');
  }
};

generator.forBlock['ble_scan_start'] = function(block: Blockly.Block) {
  const duration = generator.valueToCode(block, 'DURATION', generator.ORDER_ATOMIC) || '5';
  generator.definitions_['include_nimble'] = NimBLE_INCLUDE;
  generator.definitions_['ble_scan_globals'] = `
bool bleDeviceFound = false;
String bleFoundName = "";
String bleFoundAddress = "";
int bleFoundRssi = 0;`;
  // NimBLE v2: onResult takes const NimBLEAdvertisedDevice* (was non-const).
  // d->getName / getAddress / getRSSI are const methods → body unchanged. (BUG-065)
  generator.definitions_['ble_scan_callbacks'] = `
class BleScanCallbacks : public NimBLEScanCallbacks {
  void onResult(const NimBLEAdvertisedDevice* d) {
    bleDeviceFound = true;
    bleFoundName = String(d->getName().c_str());
    bleFoundAddress = String(d->getAddress().toString().c_str());
    bleFoundRssi = d->getRSSI();
  }
};`;
  // NimBLE v2: NimBLEScan::start time unit changed from seconds → milliseconds.
  // UI label keeps "duration (sec)" for UX continuity; convert here. (BUG-065)
  return `
  if (!NimBLEDevice::isInitialized()) NimBLEDevice::init("");
  NimBLEScan* pScan = NimBLEDevice::getScan();
  pScan->setScanCallbacks(new BleScanCallbacks(), false);
  pScan->setActiveScan(true);
  pScan->start(String(${duration}).toInt() * 1000, false);
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
  // Audit 2 follow-up (2026-05-03): same defensive pattern as bug 3 fix.
  // Auto-register the check via _BleLoopRegister so misplacement (top-level)
  // does not strand the call. Block return is unified `bleLoopTick();`.
  generator.definitions_['ble_loop_tick_globals'] = BLE_LOOP_TICK_GLOBALS;
  generator.definitions_['ble_device_found_func'] = `
void bleCheckDeviceFound() {
  if (bleDeviceFound) {
    bleDeviceFound = false;
${handler}  }
}
static _BleLoopRegister _reg_bleCheckDeviceFound(bleCheckDeviceFound);`;
  return `  bleLoopTick();\n`;
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

// `bleStartedServices` (Bug 2 fix, 2026-05-03): tracks which services have
// already been start()-ed so ble_start_advertising can call start() exactly
// once per service even if invoked multiple times (or after dynamic add).
// Previously ble_add_characteristic called start() per characteristic — for
// 3 characteristics on the same service, start() ran 3 times which corrupts
// the service's GATT table state in NimBLE.
const GATT_GLOBALS = `
#include <map>
#include <set>
std::map<std::string, NimBLECharacteristic*> bleCharMap;
std::map<std::string, NimBLEService*> bleServiceMap;
std::set<std::string> bleStartedServices;
String bleWriteCharUuid = "";`;

// NimBLE v2: onWrite takes NimBLEConnInfo& (BUG-065). Arg unused, body unchanged.
const GATT_WRITE_CALLBACKS = `
class GattWriteCallbacks : public NimBLECharacteristicCallbacks {
  std::string _uuid;
public:
  GattWriteCallbacks(const std::string& uuid) : _uuid(uuid) {}
  void onWrite(NimBLECharacteristic* c, NimBLEConnInfo& connInfo) {
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
  // NimBLE v2: advertising name は default 非自動 + scan response も default
  // OFF (migration guide § Advertising line 192/195)。GATT custom service
  // が長い 128-bit UUID を addServiceUUID() で primary adv に積む可能性が
  // 高く、12+ byte name は scan response 経由でなければ収容不能。ble_init
  // で enableScanResponse(true) + setName() を pre-set しておけば、後の
  // ble_start_advertising (= NimBLEDevice::startAdvertising() 静的呼出) +
  // onDisconnect の re-advertise も config 保持で名前付き advertising 継続。
  // (BUG-069 round 2)
  //
  // Bug 1 fix (2026-05-03): make NimBLEDevice::init / createServer idempotent.
  // U5 mix (NUS + GATT custom) chained ble_uart_setup → ble_init both calling
  // createServer() overwrote pBleServer and lost the NUS service. Guard with
  // `if (!pBleServer)`. setName / enableScanResponse always run (cheap, safe
  // to re-set; later GATT 128-bit Service UUID requires scan response anyway).
  return `
  if (!pBleServer) {
    NimBLEDevice::init("${name}");
    pBleServer = NimBLEDevice::createServer();
    pBleServer->setCallbacks(new BleServerCallbacks());
  }
  NimBLEDevice::getAdvertising()->enableScanResponse(true);
  NimBLEDevice::getAdvertising()->setName("${name}");
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
 *
 * 47.md commit #0 (2026-05-02): LABEL / DATA_TYPE / MIN / MAX の 4 field 追加。
 * 既存 XML には新 field がないため、init で default 値が auto-fill される
 * (Blockly 標準動作、後方互換 OK)。新 field は controller schema 推論用 metadata
 * 専用、forBlock の C++ 生成には影響しない (firmware wire format = ASCII string で統一)。
 * sunset (新 field 周りの comment cleanup): 2027-05-02
 */
Blockly.Blocks['ble_add_characteristic'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('📶 ' + (Blockly.Msg.BLOCKS_BLE_ADDCHAR || 'BLE Add Characteristic'))
        .appendField(Blockly.Msg.BLOCKS_BLE_LABEL || 'label')
        .appendField(new Blockly.FieldTextInput('Characteristic'), 'LABEL');
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_BLE_SERVICEUUID || 'service UUID')
        .appendField(new Blockly.FieldTextInput('12345678-1234-1234-1234-123456789ABC'), 'SERVICE_UUID');
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_BLE_CHARUUID || 'char UUID')
        .appendField(new Blockly.FieldTextInput('00001111-1234-1234-1234-123456789ABC'), 'CHAR_UUID');
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
    this.setColour(GATT_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_BLE_ADDCHARTOOLTIP || 'Add a characteristic to a GATT service. Set label/data type for the auto-generated WebBLE controller UI. MIN/MAX apply to numeric types (slider widget). Check read/write/notify as needed. The service must be created with ble_add_service first.');
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

  // Bug 2 fix (2026-05-03): drop the per-characteristic `service->start()`
  // call. The service is now started exactly once by ble_start_advertising
  // (which iterates bleServiceMap and uses bleStartedServices to dedupe).
  // Calling start() per characteristic corrupts the GATT table when 2+ chars
  // share a service (U5 = 3 chars on one service surfaced this).
  return `
  if (bleServiceMap.count("${serviceUuid}")) {
    NimBLECharacteristic* c = bleServiceMap["${serviceUuid}"]->createCharacteristic("${charUuid}", ${propsStr});
    bleCharMap["${charUuid}"] = c;
${writeCallback}
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
  // Bug 3 fix (2026-05-03): static-initializer self-register into
  // _bleLoopHandlers. See ble_uart_on_receive note for rationale. Each
  // ble_on_write block registers its own bleCheckWrite_<uuid>() — the
  // unified `bleLoopTick();` call walks all of them in registration order.
  generator.definitions_['ble_loop_tick_globals'] = BLE_LOOP_TICK_GLOBALS;
  const safeUuid = charUuid.replace(/-/g, '_');
  const funcKey = `ble_on_write_${safeUuid}`;
  // BUG-053 fix: bleMessage / bleWriteCharUuid のリセットを HANDLER 後に移動。
  // NUS UART (bleCheckReceive) と対称、ble_received_value が HANDLER 内で受信値を取得可能になる。
  generator.definitions_[funcKey] = `
void bleCheckWrite_${safeUuid}() {
  if (bleWriteCharUuid == "${charUuid}" && bleMessage.length() > 0) {
${handler}    bleMessage = "";
    bleWriteCharUuid = "";
  }
}
static _BleLoopRegister _reg_bleCheckWrite_${safeUuid}(bleCheckWrite_${safeUuid});`;
  return `  bleLoopTick();\n`;
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
  // Bug 2 fix (2026-05-03): start every service that has not yet been started.
  // bleStartedServices guards against re-start (NimBLEService::start() is not
  // idempotent in v2 — second call corrupts the GATT table).
  // ble_add_characteristic no longer calls start(); ble_start_advertising is
  // now the single point that does it, immediately before the advertise.
  return `  for (auto& kv : bleServiceMap) {
    if (!bleStartedServices.count(kv.first)) {
      kv.second->start();
      bleStartedServices.insert(kv.first);
    }
  }
  NimBLEDevice::startAdvertising();
`;
};

console.log('BLE blocks loaded');
