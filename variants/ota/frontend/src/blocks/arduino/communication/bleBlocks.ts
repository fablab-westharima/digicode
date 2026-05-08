/*
 * DigiCode - Block-based ESP32 Programming Tool
 * Copyright (C) 2024-2026 DigiCo LLC
 *
 * Licensed under the GNU Affero General Public License version 3 or later.
 * See LICENSE file in the repository root for full terms.
 */

/**
 * BLE ブロック (BP4-1a / BP4-2, 2026-04-20)
 *
 * ESP32 専用 (NimBLE-Arduino ライブラリ、DigiCode は ESP32 系 16 boards 専用)。
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

/**
 * post-Phase 4-4 commit 2-8 (case_0089/0091/0093/0096 fix): BLE GATT operation
 * block (ble_add_service / ble_notify / ble_disconnect / ble_on_write /
 * ble_start_advertising) は ble_init が declare する pBleServer / bleConnected /
 * bleCharMap / bleServiceMap を参照する。Phase 4-4 で ble_init 不在 + operation
 * 単独配置で fail。
 *
 * 各 operation block forBlock 冒頭で本 helper を呼び、ble_init が contribute
 * する definitions_ keys を conditional default declare。同 key で ble_init と
 * dedupe、ble_init 同梱時は user device name 反映 (last-write-wins):
 *  - ble_init alone, before operation → ble_init 値既在 → guard skip → user 値勝ち
 *  - ble_init after operation         → operation default 先 → ble_init
 *                                        unconditional override → user 値勝ち
 *  - operation alone (ble_init 不在) → default device name 'DigiCode' で compile pass
 *
 * 注: ble_init / operation 全 block は NimBLE v2 API + bleConnected / bleMessage
 * 等の global vars に依存、ble_init forBlock の return code には if(!pBleServer)
 * guard ed init/createServer/setCallbacks/enableScanResponse/setName が含まれる
 * が、これは setup() 内 statement で operation 単独配置では user code に
 * 含まれない。本 helper は file-scope global declarations のみを保証 (BLE_GLOBALS /
 * GATT_GLOBALS / SERVER_CALLBACKS、setup() 内の init は ble_init 同梱時のみ)。
 *
 * See rules/digicode/03-block-workflow.md "Init block protocol".
 */
function ensureBleInitDefault() {
  if (!generator.definitions_['include_nimble']) {
    generator.definitions_['include_nimble'] = NimBLE_INCLUDE;
  }
  if (!generator.definitions_['ble_globals']) {
    // emits: pBleServer, pBleTxChar, bleConnected, bleMessage, bleWriteCharUuid
    generator.definitions_['ble_globals'] = BLE_GLOBALS;
  }
  if (!generator.definitions_['ble_gatt_globals']) {
    // emits: bleCharMap, bleServiceMap, bleStartedServices
    generator.definitions_['ble_gatt_globals'] = GATT_GLOBALS;
  }
  if (!generator.definitions_['ble_server_callbacks']) {
    generator.definitions_['ble_server_callbacks'] = SERVER_CALLBACKS;
  }
}

const NUS_UUIDS = `
#define NUS_SERVICE_UUID "6E400001-B5A3-F393-E0A9-E50E24DCCA9E"
#define NUS_RX_UUID      "6E400002-B5A3-F393-E0A9-E50E24DCCA9E"
#define NUS_TX_UUID      "6E400003-B5A3-F393-E0A9-E50E24DCCA9E"`;

// `bleWriteCharUuid` (Bug U5 race fix, 2026-05-03):
// Promoted from GATT_GLOBALS to BLE_GLOBALS so it is ALWAYS declared, even
// in NUS-only programs. The NUS receive callback (`BleRxCallbacks::onWrite`)
// now explicitly clears this flag to mark "this message is NUS, not GATT",
// and `bleCheckReceive()` guards on its emptiness so a GATT-originated
// message is not consumed by the NUS handler before its GATT handler runs.
//
// Original bug: NUS and GATT writes both target the SAME `bleMessage`
// buffer. Static-init order made `bleCheckReceive` the first handler in
// `bleLoopTick()`, so for any GATT write it ran first (no uuid check),
// printed/echoed/cleared the message, leaving subsequent
// `bleCheckWrite_<uuid>()` to find an empty buffer and silently skip
// the user's `digitalWrite` / `servo.write` / etc. handler.
const BLE_GLOBALS = `
NimBLEServer* pBleServer = nullptr;
NimBLECharacteristic* pBleTxChar = nullptr;
bool bleConnected = false;
String bleMessage = "";
String bleWriteCharUuid = "";`;

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
  // U5 race fix (2026-05-03): explicitly clear `bleWriteCharUuid` so
  // bleCheckReceive (the NUS handler) sees "this message is NUS" and
  // processes it. Without this clear, a stale uuid from a prior unprocessed
  // GATT write would cause bleCheckReceive to skip the NUS message.
  // Set order is uuid-first / message-second so a torn read by
  // bleCheckReceive between the two assignments still skips safely
  // (bleMessage check fails when only uuid was reset).
  generator.definitions_['ble_rx_callbacks'] = `
class BleRxCallbacks : public NimBLECharacteristicCallbacks {
  void onWrite(NimBLECharacteristic* c, NimBLEConnInfo& connInfo) {
    bleWriteCharUuid = "";
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
  // (runs before main()), and a single unified `bleLoopTick();` call (now
  // injected into loop() via loopPre_, see post-U5 cleanup) walks all
  // registered handlers idempotently.
  generator.definitions_['ble_loop_tick_globals'] = BLE_LOOP_TICK_GLOBALS;
  // U5 race fix (2026-05-03): guard on `bleWriteCharUuid.length() == 0`
  // so a GATT-originated message (which sets bleWriteCharUuid to its
  // characteristic UUID) is NOT consumed by the NUS handler before its
  // matching `bleCheckWrite_<uuid>()` runs. Static-init order made this
  // function the first handler in bleLoopTick(), so without the guard it
  // ate every message regardless of source — the U5 LED toggle / Servo
  // slider symptom (writes accepted, handlers never fired). The NUS
  // BleRxCallbacks now explicitly sets bleWriteCharUuid="" to mark its
  // own messages as NUS-origin.
  generator.definitions_['ble_receive_func'] = `
void bleCheckReceive() {
  if (bleMessage.length() > 0 && bleWriteCharUuid.length() == 0) {
${handler}    bleMessage = "";
  }
}
static _BleLoopRegister _reg_bleCheckReceive(bleCheckReceive);`;
  // Post-U5 cleanup (2026-05-03): emit `bleLoopTick();` exactly once via
  // loopPre_ (dedupe by key), regardless of how many BLE handler blocks the
  // user has. Previous behavior (each handler returning its own inline
  // `bleLoopTick();`) functionally worked but produced N redundant calls in
  // loop(). Block now returns empty — handler is registered via the static
  // _BleLoopRegister above, and BlocklyEditor.tsx injects the tick call.
  if (!generator.loopPre_) generator.loopPre_ = {};
  generator.loopPre_['ble_loop_tick'] = '  bleLoopTick();';
  return '';
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
  // post-Phase 4-4 commit 2-8 layer 3 fix (case_0096): 2 件の v2 API drift:
  //  1. NimBLEAdvertisementData::addData は `(const std::string&)` overload
  //     不在 (利用可能 = `(const uint8_t*, size_t)` または
  //     `(const std::vector<uint8_t>&)`)。
  //  2. NimBLEBeacon::getData() return type は v2 で `const BeaconData&`
  //     (struct、std::string ではない)。string operator+= で fail。
  // BeaconData struct には `operator std::vector<uint8_t>()` 変換オペレータ
  // 既定義 (NimBLEBeacon.h:struct BeaconData)、vector form で safe & cleanest:
  //   - vector に length byte (26) + AD type (0xFF) を push_back
  //   - oBeacon.getData() を std::vector<uint8_t> に implicit conversion
  //   - vector::insert で連結
  //   - addData(vector) overload 呼出
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
  std::vector<uint8_t> beaconData;
  beaconData.reserve(2 + sizeof(NimBLEBeacon::BeaconData));
  beaconData.push_back(26);   // iBeacon manufacturer data length
  beaconData.push_back(0xFF); // AD type: Manufacturer Specific Data
  std::vector<uint8_t> bdVec = oBeacon.getData();  // implicit BeaconData → vector
  beaconData.insert(beaconData.end(), bdVec.begin(), bdVec.end());
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
  // does not strand the call. Tick call is injected into loop() once via
  // loopPre_ (post-U5 cleanup), no matter how many BLE handler blocks exist.
  generator.definitions_['ble_loop_tick_globals'] = BLE_LOOP_TICK_GLOBALS;
  generator.definitions_['ble_device_found_func'] = `
void bleCheckDeviceFound() {
  if (bleDeviceFound) {
    bleDeviceFound = false;
${handler}  }
}
static _BleLoopRegister _reg_bleCheckDeviceFound(bleCheckDeviceFound);`;
  if (!generator.loopPre_) generator.loopPre_ = {};
  generator.loopPre_['ble_loop_tick'] = '  bleLoopTick();';
  return '';
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
  ensureBleInitDefault();
  generator.definitions_['include_nimble'] = NimBLE_INCLUDE;
  generator.definitions_['ble_globals'] = BLE_GLOBALS;
  // post-Phase 4-4 commit 2-8 layer 2 fix (case_0089): NimBLE-Arduino v2.4.0
  // で `disconnectAll()` method 不在 (BUG-065 第60回 closure 残漏れ、当時 v2
  // callback signature drift fix で全 API drift 列挙されず)。NimBLEServer.h
  // で確認した v2 API:
  //   - disconnect(uint16_t connHandle, uint8_t reason) ✅ 存在
  //   - getPeerDevices() → std::vector<uint16_t> connection handles
  // per-conn loop で全 client disconnect、再 advertising に統一。
  // requires: pBleServer (declared by ble_init or ensureBleInitDefault)
  return `  if (pBleServer) {
    for (uint16_t _connHandle : pBleServer->getPeerDevices()) {
      pBleServer->disconnect(_connHandle);
    }
    NimBLEDevice::startAdvertising();
  }\n`;
};

// ===== BP4-1b: GATT カスタムサービス =====

const GATT_COLOR = '#1565C0';

// `bleStartedServices` (Bug 2 fix, 2026-05-03): tracks which services have
// already been start()-ed so ble_start_advertising can call start() exactly
// once per service even if invoked multiple times (or after dynamic add).
// Previously ble_add_characteristic called start() per characteristic — for
// 3 characteristics on the same service, start() ran 3 times which corrupts
// the service's GATT table state in NimBLE.
//
// `bleWriteCharUuid` was MOVED to BLE_GLOBALS (U5 race fix, 2026-05-03)
// so the NUS callback can clear it. It must always be declared whenever
// either NUS or GATT is in use — placing it in BLE_GLOBALS satisfies this
// since every block here also emits BLE_GLOBALS.
const GATT_GLOBALS = `
#include <map>
#include <set>
std::map<std::string, NimBLECharacteristic*> bleCharMap;
std::map<std::string, NimBLEService*> bleServiceMap;
std::set<std::string> bleStartedServices;`;

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
  // `if (!pBleServer)`.
  //
  // Post-U5 cleanup (2026-05-03): enableScanResponse + setName moved INSIDE
  // the guard. Previously they ran unconditionally to handle the case where
  // ble_init runs standalone (no preceding ble_uart_setup) — but in that
  // case we're inside the !pBleServer branch anyway. In the mixed flow
  // (ble_uart_setup → ble_init), ble_uart_setup already calls both
  // enableScanResponse(true) and setName("..."), so re-running them after
  // pAdv->start() was just visual noise (no functional difference, both
  // setters are idempotent). Inside-guard placement keeps standalone
  // ble_init working AND eliminates the dup lines in mixed flows.
  return `
  if (!pBleServer) {
    NimBLEDevice::init("${name}");
    pBleServer = NimBLEDevice::createServer();
    pBleServer->setCallbacks(new BleServerCallbacks());
    NimBLEDevice::getAdvertising()->enableScanResponse(true);
    NimBLEDevice::getAdvertising()->setName("${name}");
  }
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
  ensureBleInitDefault();
  const uuid = block.getFieldValue('UUID');
  generator.definitions_['include_nimble'] = NimBLE_INCLUDE;
  generator.definitions_['ble_gatt_globals'] = GATT_GLOBALS;
  // U5 first-connect bug fix (2026-05-03 follow-up to c03e98a):
  //   Symptom = first connect after boot exposes only services that existed
  //   when advertising started. Custom GATT service (added in ble_add_service
  //   AFTER ble_uart_setup's pAdv->start()) became invisible to clients until
  //   the user manually disconnect+reconnect, at which point the next GATT
  //   discovery saw the now-fully-built table. NimBLE-Arduino requires the
  //   GATT structure to be FROZEN while advertising is active — service
  //   start()-ed after pAdv->start() updates the in-RAM service object but
  //   does NOT commit the new handle range to the active GATT table the
  //   server hands to clients during discovery.
  //
  //   Fix = pause advertising the moment a custom service is being declared.
  //   ble_start_advertising at end of setup() restarts it, by which time
  //   every service.start() and every characteristic registration has
  //   committed cleanly. NimBLEDevice::stopAdvertising() is idempotent /
  //   safe to call when advertising was never started (e.g. ble_init-only
  //   flow without preceding ble_uart_setup).
  return `
  NimBLEDevice::stopAdvertising();
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
  ensureBleInitDefault();
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
  ensureBleInitDefault();
  const charUuid = block.getFieldValue('CHAR_UUID');
  const value = javascriptGenerator.valueToCode(block, 'VALUE', 0) || '""';
  generator.definitions_['include_nimble'] = NimBLE_INCLUDE;
  generator.definitions_['ble_gatt_globals'] = GATT_GLOBALS;
  // requires: bleConnected, bleCharMap (declared by ble_init or ensureBleInitDefault)
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
  ensureBleInitDefault();
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
  // Post-U5 cleanup (2026-05-03): tick injected via loopPre_ once, see
  // ble_uart_on_receive note. Block returns empty.
  if (!generator.loopPre_) generator.loopPre_ = {};
  generator.loopPre_['ble_loop_tick'] = '  bleLoopTick();';
  return '';
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
  ensureBleInitDefault();
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
