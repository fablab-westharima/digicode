# _reference/ - 参考用コード保管場所

このディレクトリは、将来のUSB/Bluetooth実装時に参考にするコードを保管する場所です。

---

## 目的

Phase 1.1-1.5（OTA専用化）で削除する機能のうち、USB/Bluetooth実装時に再利用できるコードを保管します。

**重要:** これらのコードは実行されません。参考資料として保管するのみです。

---

## ディレクトリ構成

```
variants/_reference/
├── usb/                    # USB版参考コード（Phase 2で使用）
│   ├── ConnectionSelector.tsx
│   ├── serialStore.ts
│   ├── UsbPortReleaseDialog.tsx
│   └── UsbDriverDialog.tsx
└── bluetooth/              # Bluetooth版参考コード（Phase 3で使用）
    ├── BluetoothConnection.tsx
    └── bluetoothStore.ts
```

---

## 使用タイミング

- **Phase 2（USB実装）:** `usb/` 内のコードを参考にしてUSB版を実装
- **Phase 3（BLE実装）:** `bluetooth/` 内のコードを参考にしてBLE版を実装

---

## 注意事項

- これらのコードはそのまま使えない可能性があります
- variants構造に合わせて再設計が必要です
- あくまで「参考資料」として扱ってください
