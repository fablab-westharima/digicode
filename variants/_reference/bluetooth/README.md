# Bluetooth (BLE) 書込み参考コード

**重要:** このディレクトリのコードは、Phase 3（BLE実装）時の参考用です。

---

## 目的

Phase 3でBluetooth書込み機能を実装する際に、既存コードを参考にするために保存しています。

---

## 保存ファイル

| ファイル | 説明 | サイズ |
|---------|------|--------|
| `BluetoothConnection.tsx` | Bluetooth接続UI | 2.8KB |
| `bluetoothStore.ts` | Bluetoothストア（Web Bluetooth API） | 3.3KB |

---

## Phase 3実装時の注意

### Bluetooth仕様

**BLE (Bluetooth Low Energy) 一択:**
- Classic Bluetooth は非対応
- 理由: Web Bluetooth API が BLE のみ対応

**参照:** `prompt/maintenance/07_接続方式分離計画.md` - Bluetooth仕様の確定

### 用語の定義を確認

👉 **必読:** `prompt/maintenance/04-00_教訓・注意事項(共通項目).md`

**BLE書込みとは:**
- **プログラム書込み**: Blocklyで作成したプログラム（Phase 3で実装予定）
- **ファームウェア書込み**: BLE経由では不可（USB経由のみ）

### 実装方針（Rule 13）

**統合実装しない:**
- OTA/USB機能と統合しようとしない
- BLE専用の完全独立実装
- variants/ble/ に完全分離

**参照:** `prompt/maintenance/04-03_教訓・注意事項(機能実装関連).md` Rule 13

---

## 技術仕様

### Arduino C++側（ESP32）

```cpp
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>

// Service UUID定義
// Characteristic UUID定義
```

### Web側（Web Bluetooth API）

```typescript
navigator.bluetooth.requestDevice({
  filters: [{ services: ['service-uuid'] }]
})
```

---

## 関連ドキュメント

- `prompt/maintenance/07_接続方式分離計画.md` - Phase 3詳細計画
- `prompt/logs/接続方式分離計画実施/チケット/Phase3_BLE実装/` - Phase 3チケット（作成予定）
