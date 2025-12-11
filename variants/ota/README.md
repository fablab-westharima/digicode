# DigiCode OTA版

**接続方式:** WiFi OTA (Over-The-Air)
**対象デバイス:** ESP32シリーズ（WiFi内蔵）
**状態:** Phase 1.5b完了、本番環境デプロイ済み (2025-12-11)

---

## 概要

OTA版は、WiFi経由で**プログラム**を書き込むvariantです。

**重要:** 初回セットアップ時は、USB経由で**ファームウェア**（DigiCodeOTA.ino）を書き込む必要があります。その後は、WiFi経由でプログラムを何度でも書き込めます。

---

## ディレクトリ構成

```
variants/ota/
├── frontend/          # OTA専用フロントエンド（完全に独立動作）
│   ├── src/           # React アプリケーション（153ファイル）
│   ├── public/        # 静的アセット（ドキュメント、画像等）
│   ├── node_modules/  # 独立した依存関係（764パッケージ）
│   ├── package.json   # digicode-ota-frontend
│   ├── tsconfig.json  # TypeScript設定（@/shared/* パス設定済み）
│   ├── vite.config.ts # Vite設定
│   └── dist/          # ビルド成果物（npm run build実行後）
├── firmware/          # OTAファームウェアテンプレート（予定）
│   └── templates/
│       └── DigiCodeOTA.ino
└── docs/              # OTA版ドキュメント（予定）
```

---

## 起動方法

### 開発サーバー起動

```bash
cd variants/ota/frontend
npm run dev
```

→ http://localhost:5173 でアクセス

### プロダクションビルド

```bash
cd variants/ota/frontend
npm run build
```

→ `dist/` ディレクトリに成果物が生成されます

---

## 動作確認済み事項

**Phase 1.4b完了（2025-12-11）:**
- ✅ npm install: 成功（764パッケージ、脆弱性0件）
- ✅ npm run build: 成功（9.33秒、バンドルサイズ2.8MB）
- ✅ npm run dev: 成功（開発サーバー起動）
- ✅ React アプリケーション表示

**Phase 1.5a完了（2025-12-11）:**
- ✅ バックエンド環境構築（esp32-blockly-backend）
  - npm install: 171パッケージ、脆弱性0件
  - D1データベースマイグレーション適用（7ファイル）
  - .dev.vars作成（JWT_SECRET設定）
  - wrangler dev起動成功（port 8787）
- ✅ ログイン機能: 新規登録・ログイン成功
- ✅ プロジェクト保存/読込: DB連携正常
- ✅ コンパイル機能: Ubuntu server成功、.binダウンロード
- ✅ OTA書込み: ESP32への書込み成功、実機動作確認済み

**UI改善要望:**
- デバイス検索ボタンの常時表示化（`prompt/logs/ui_feedback/20251211_device_search_button.md`）

**Phase 1.5b完了（2025-12-11）:**
- ✅ esp32-blockly-frontend/ 削除完了（189ファイル削除、423MB削減）
- ✅ 最終動作確認（ログイン成功、全機能正常）
- ✅ variants/ota/frontend/ のみが稼働中

**ディレクトリ構造（Phase 1.5b完了後）:**
```
DigiCode/
├── esp32-blockly-backend/     # バックエンド
└── variants/
    └── ota/
        └── frontend/           # OTA版フロントエンド（唯一のフロントエンド）
```

---

## 特徴

### メリット
- ✅ ケーブル不要（WiFi経由で書き込み）
- ✅ 書き込み速度が速い
- ✅ 複数デバイスに一括更新可能
- ✅ 独立したnode_modules（他のvariantに影響しない）
- ✅ @/shared/* パス設定済み（将来の共通化に対応）

### 制約
- ❌ 初回セットアップ時はUSB接続が必要
- ❌ WiFi接続必須（AP制限環境では使用不可）
- ❌ ESP32専用（RP2040は非対応）

---

## 技術仕様

### フロントエンド
- **フレームワーク:** React 19.2.0
- **ビルドツール:** Vite 7.2.7
- **言語:** TypeScript 5.8.4
- **UIライブラリ:** shadcn/ui（Radix UI ベース）
- **状態管理:** Zustand 5.0.8
- **ブロックエディタ:** Blockly 10.4.3

### 依存関係
- 764パッケージ
- 脆弱性: 0件（2025-12-11時点）

---

## 開発の経緯

### Phase 1.1-1.4b（2025-12-11完了）

**Phase 1.1:** ディレクトリ構成作成（commit 522069b）
**Phase 1.2:** OTA専用ファイルコピー（commit 61d6b95）
**Phase 1.3:** USB/BLE参考コード保存（commit 27b4f4d）
**Phase 1.4:** shared/作成（commit d91aed6）
**Phase 1.4b:** 完全フロントエンドコピー（commit e1a9462）
- 方針変更: 部分コピー → 完全コピー
- 理由: 確実性・安定性を最優先
- 結果: 178ファイル、即座に動作可能

**動作確認:** npm install/build/dev（commit d34d40f）

### 設計判断

**なぜ完全コピーにしたか？**
- importパスの複雑な依存関係を回避
- 既存機能を100%保持
- ユーザー方針「確実・安定が最優先」に従った
- 即座に動作確認可能

**今後の方針:**
- Phase 1.5: 完全な動作確認後、不要な機能（USB/BLE）を削除予定
- Phase 2: USB版実装時の参考として既存システムを活用
- Phase 3: BLE版実装

---

## 用語の定義（重要）

DigiCodeには2種類の書き込みがあります：

### ファームウェア書き込み
- **何を:** DigiCodeOTA.ino（基盤システム）
- **方法:** USB経由のみ
- **頻度:** 初回のみ

### プログラム書き込み
- **何を:** Blocklyで作成したユーザープログラム
- **方法:** WiFi OTA（メイン）
- **頻度:** 何度でも

**詳細:** `prompt/maintenance/04-00_教訓・注意事項(共通項目).md`

---

## トラブルシューティング

### ビルドエラー: react-is not found
```bash
npm install react-is --legacy-peer-deps
```

### ポート5173が使用中
```bash
lsof -ti:5173 | xargs kill -9
```

### npm installが失敗
```bash
npm install --legacy-peer-deps
```

---

## 関連ドキュメント

### プロジェクト全体
- `prompt/00_README.md` - DigiCodeドキュメント索引
- `prompt/maintenance/07_接続方式分離計画.md` - OTA/USB/BLE分離計画

### 用語定義（必読）
- `prompt/maintenance/04-00_教訓・注意事項(共通項目).md` - 用語の定義
- `prompt/logs/session_state/_CRITICAL_DEFINITIONS.md` - 最重要用語

### 開発履歴
- `prompt/logs/session_state/current_work.md` - 現在の作業状態
- `prompt/maintenance/改定log.md` - 変更履歴

### Phase 1.1-1.5詳細
- `prompt/logs/接続方式分離計画実施/チケット/Phase1.1-1.5_OTA専用化/README.md`

---

## 次のステップ

### Phase 1.5a: 完全な動作確認
- [ ] バックエンド起動
- [ ] ログイン機能確認
- [ ] プロジェクト保存/読込確認
- [ ] コンパイル機能確認
- [ ] 実際のOTA書込み確認

### Phase 1.5b: 既存システム削除
- [ ] 完全な動作確認完了後
- [ ] git commitでバックアップ作成
- [ ] esp32-blockly-frontend/ 削除
- [ ] 最終動作確認

### Phase 1.5c: OTA専用化
- [ ] USB/BLE関連機能削除
- [ ] EditorPage.tsxのConnectionSelector削除
- [ ] serialStore, bluetoothStore削除

---

**作成日:** 2025-12-11
**最終更新:** 2025-12-11
**状態:** Phase 1.5b完了、既存システム削除済み
