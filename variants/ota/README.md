# OTA版 DigiCode

**接続方式:** WiFi OTA（Over-The-Air）
**対象デバイス:** ESP32シリーズ（WiFi内蔵）

---

## 概要

OTA版は、WiFi経由で**プログラム**を書き込むvariantです。

**重要:** 初回セットアップ時は、USB経由で**ファームウェア**（DigiCodeOTA.ino）を書き込む必要があります。

---

## ディレクトリ構成

```
variants/ota/
├── frontend/          # OTA専用フロントエンド
│   └── src/
│       ├── pages/     # OTA専用ページ（EditorPage, DeviceSetupPage）
│       ├── components/
│       │   ├── device/     # デバイス選択ダイアログ
│       │   ├── wifi/       # WiFi設定ダイアログ
│       │   └── firmware/   # ファームウェアインストールダイアログ
│       ├── services/  # OTA書き込みサービス
│       └── stores/    # OTA専用ストア
├── firmware/          # OTAファームウェアテンプレート
│   └── templates/
│       └── DigiCodeOTA.ino
└── docs/              # OTA版ドキュメント
```

---

## 特徴

### メリット
- ✅ ケーブル不要（WiFi経由で書き込み）
- ✅ 書き込み速度が速い
- ✅ 複数デバイスに一括更新可能

### 制約
- ❌ 初回セットアップ時はUSB接続が必要
- ❌ WiFi接続必須（AP制限環境では使用不可）
- ❌ ESP32専用（RP2040は非対応）

---

## 起動方法

```bash
cd variants/ota/frontend
npm install
npm run dev
```

---

## 関連ドキュメント

- `prompt/maintenance/07_接続方式分離計画.md` - 全体計画
- `prompt/maintenance/04-00_教訓・注意事項(共通項目).md` - 用語定義
