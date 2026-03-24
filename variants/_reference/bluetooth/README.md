# Bluetooth (BLE) 書込み参考コード

**重要:** このディレクトリのコードは、Phase 3（BLE実装）時の参考用です。

**注意（2025-12-14更新）:** このファイルは古いMicroPython時代のコードです。Phase 3実装では `bleFirmwareService.ts` を新規作成します。

---

## 目的

Phase 3でBluetooth書込み機能を実装する際に、既存コードを参考にするために保存しています。

---

## 保存ファイル

| ファイル | 説明 | サイズ | Phase 3での扱い |
|---------|------|--------|----------------|
| `BluetoothConnection.tsx` | Bluetooth接続UI（MicroPython用） | 2.8KB | 参考のみ（使用しない） |
| `bluetoothStore.ts` | Bluetoothストア（MicroPython用） | 3.3KB | 参考のみ（使用しない） |

---

## Phase 3実装時の注意

### Bluetooth仕様

**BLE (Bluetooth Low Energy) 一択:**
- Classic Bluetooth は非対応
- 理由: Web Bluetooth API が BLE のみ対応

**参照:** `prompt/maintenance/07_接続方式分離計画.md` - Bluetooth仕様の確定

### ~~用語の定義を確認~~ → 訂正（2025-12-14）

~~**BLE書込みとは:**~~
~~- **プログラム書込み**: Blocklyで作成したプログラム（Phase 3で実装予定）~~
~~- **ファームウェア書込み**: BLE経由では不可（USB経由のみ）~~

**訂正:** BLE経由でのファームウェア書込み（OTA更新）は**可能**です。

**技術調査結果（2025-12-14）:**
- `bluetooth_ota_firmware_update`ライブラリ（Raghav117）を使用
- 転送速度: 約12KB/s（1MBで約1分25秒）
- Web Bluetooth API対応
- 参照: [SparkFun BLE OTA Tutorial](https://learn.sparkfun.com/tutorials/esp32-ota-updates-over-ble-from-a-react-web-application/all)

**ただし「初回書き込み問題」あり:**
- 初回はUSB経由でBLE対応ファームウェアを書き込む必要
- 以降はBLE経由で更新可能

### 実装方針（Rule 13 + Phase 2からの教訓）

**統合実装しない:**
- OTA/USB機能と統合しようとしない
- BLE専用の完全独立実装

**~~variants/ble/ に完全分離~~ → 訂正（2025-12-14）:**
- **1エディタ統合方式**を採用（Phase 2 USB実装と同様）
- `variants/ota/frontend/src/services/bleFirmwareService.ts` として実装
- EditorPage.tsx にBLE書き込みオプションを追加

**参照:**
- `prompt/maintenance/04-03_教訓・注意事項(機能実装関連).md` Rule 13
- `prompt/logs/接続方式分離計画実施/チケット/Phase3-REV_BLE実装/` Phase 3計画

---

## 技術仕様

### Arduino C++側（ESP32）

```cpp
#include <BluetoothOTA.h>  // Raghav117ライブラリ

BluetoothOTA bleOta;

// UUIDs
#define SERVICE_UUID        "12345678-1234-5678-9ABC-DEF012345678"
#define OTA_CHAR_UUID       "87654321-4321-8765-CBA9-FEDCBA987654"

void setup() {
  bleOta.begin("DigiCode-robot001");
  bleOta.setUUIDs(SERVICE_UUID, OTA_CHAR_UUID, ...);

  bleOta.onProgress([](int percent) {
    Serial.printf("OTA Progress: %d%%\n", percent);
  });

  // {{BLOCKLY_SETUP_CODE}}
}

void loop() {
  bleOta.handle();  // BLE OTA処理
  // {{BLOCKLY_LOOP_CODE}}
}
```

### Web側（Web Bluetooth API）

```typescript
// bleFirmwareService.ts
async connect(onProgress: (progress: BleFlashProgress) => void) {
  // ユーザージェスチャーコンテキスト内で呼び出す（Rule 22）
  this.device = await navigator.bluetooth.requestDevice({
    filters: [{ namePrefix: 'DigiCode-' }],
    optionalServices: [SERVICE_UUID]
  });

  const server = await this.device.gatt.connect();
  const service = await server.getPrimaryService(SERVICE_UUID);
  this.characteristic = await service.getCharacteristic(OTA_CHAR_UUID);
}

async writeOta(firmwareBlob: Blob, onProgress: (progress: BleFlashProgress) => void) {
  // MTU分割送信（512バイトずつ）
  // ...
}
```

---

## 関連ドキュメント

- `prompt/maintenance/07_接続方式分離計画.md` - 全体計画
- `prompt/logs/接続方式分離計画実施/チケット/Phase3-REV_BLE実装/` - Phase 3計画（新版）
- [SparkFun BLE OTA Tutorial](https://learn.sparkfun.com/tutorials/esp32-ota-updates-over-ble-from-a-react-web-application/all)
- [bluetooth_ota_firmware_update](https://github.com/Raghav117/bluetooth_ota_firmware_update)
