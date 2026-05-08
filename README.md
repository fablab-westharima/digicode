# DigiCode

ESP32マイコンを使ったロボット・IoTデバイスのプログラミングを、ブロックで簡単に行えるビジュアル開発環境です。

## 受付窓口について

DigiCode は AGPL-3.0 のオープンソースソフトウェアとして公開されていますが、現時点で GitHub 上での Issue / Pull Request / Discussions による外部貢献の受付は行っておりません。

ご質問・お問い合わせは以下のいずれかからお願いします:

- DigiCode 利用中のユーザー: アプリ内 HELP メニュー →「要望を送る」
- 一般のお問い合わせ: [ファブラボ西播磨 お問い合わせフォーム](https://fablab-westharima.jp/contact)

将来的にコミュニティからの貢献受付方針を変更する場合は、本リポジトリで告知します。

## 特徴

- 🎨 **ビジュアルプログラミング** - Blocklyによる直感的なブロックエディタ
- 🚀 **ESP32対応** - ESP32、ESP32-S2、ESP32-S3、ESP32-C3に対応
- 📡 **WiFi OTA更新** - USBケーブル不要の無線書き込み
- 🏆 **競技ロボット対応** - ライントレース、マイクロマウス向け機能完備
- 🤖 **多形態ロボット対応** - 二足歩行・変形・車輪型ロボット用カスタムライブラリ (DigiCodeHumanoid / DigiCodeTransform / DigiCodeWheel) 搭載
- 📊 **開発ツール** - PIDチューニング、シリアルプロッター

## クイックスタート

### 1. 必要なもの
- ESP32開発ボード
- USBケーブル
- 最新のWebブラウザ（Chrome、Edge、Safari推奨）

### 2. ファームウェア書き込み
1. DigiCodeにアクセス
2. 「ファームウェア書き込み」からESP32に専用ファームウェアを書き込み

### 3. プログラム作成
1. 「新規プロジェクト」でエディタを開く
2. ブロックを配置してプログラムを作成
3. 「書き込み」ボタンでESP32に転送

詳細は[はじめかた](./docs/getting-started.md)を参照してください。

## ドキュメント

### ユーザー向け
- [はじめかた](./docs/getting-started.md) - 初回セットアップ手順
- [ハードウェア接続ガイド](./docs/hardware-setup.md) - センサー・モーターの配線方法
- [トラブルシューティング](./docs/troubleshooting.md) - よくある問題と解決方法

### 開発者向け
- [アーキテクチャ概要](./docs/architecture.md) - システム構成と技術スタック

## システム構成

```
DigiCode/
├── esp32-blockly-frontend/  # React + Blockly フロントエンド
├── esp32-blockly-backend/   # Cloudflare Workers バックエンドAPI
├── Arduino/                 # ESP32ファームウェア
├── docs/                    # ドキュメント
└── prompt/                  # 開発計画・記録
```

## 技術スタック

| レイヤー | 技術 |
|---------|------|
| **フロントエンド** | React 19, Vite, TypeScript, Blockly, Tailwind CSS |
| **バックエンドAPI** | Cloudflare Workers, Hono, D1 (SQLite) |
| **コンパイルサーバー** | Node.js, Hono, PlatformIO Core |
| **ファームウェア** | ESP32 (Arduino C++ / MicroPython) |

## 開発

### 環境構築

```bash
# フロントエンド
cd esp32-blockly-frontend
npm install
npm run dev  # http://localhost:5173

# バックエンドAPI
cd esp32-blockly-backend
npm install
npm run dev  # http://localhost:8787

# コンパイルサーバー (Docker)
docker pull ghcr.io/fablab-westharima/digicode-compile-api:latest
docker run -d -p 3001:3001 ghcr.io/fablab-westharima/digicode-compile-api:latest
```

### テスト

```bash
# E2Eテスト（Playwright）
cd esp32-blockly-frontend
npm run test:e2e

# ユニットテスト（Vitest）
npm run test
```

## 対応デバイス・センサー

### マイコン
- ESP32 (標準)
- ESP32-S2
- ESP32-S3
- ESP32-C3

### センサー
- 超音波センサー（距離測定）
- DHT11/DHT22（温湿度）
- QTRラインセンサー（8ch対応）
- 壁センサー（IR反射型）
- ロータリーエンコーダー

### アクチュエーター
- サーボモーター（角度制御）
- DCモーター（PWM制御）
- ステッピングモーター
- NeoPixel LED（フルカラー）

## ライセンス

GNU Affero General Public License version 3 (AGPL-3.0)

Copyright © 2024-2026 DigiCo LLC。詳細は [LICENSE](./LICENSE) を参照。

ソースコードは [GitHub リポジトリ](https://github.com/fablab-westharima/digicode) で公開されています。

## DigiCode Ecosystem

DigiCode は複数のリポジトリに分かれて配布されています:

- [DigiCode](https://github.com/fablab-westharima/digicode) — 本リポジトリ (Block-based ESP32 programming tool、frontend + Workers backend)
- [digicode-compile-api](https://github.com/fablab-westharima/digicode-compile-api) — PlatformIO compile server (ESP32 firmware build API)
- [DigiCode-Finder](https://github.com/fablab-westharima/DigiCode-Finder) — mDNS device detector (WiFi OTA 用デスクトップアプリ)
- [digicode-installer](https://github.com/fablab-westharima/digicode-installer) — Local compile server installer (Mac / Windows / Linux)

## サポート

問題が発生した場合は、[トラブルシューティング](./docs/troubleshooting.md)をご参照ください。本リポジトリでの Issue 受付は行っていないため、お問い合わせは README 冒頭「[受付窓口について](#受付窓口について)」section をご参照ください。

## お問い合わせ

ご質問・お問い合わせは README 冒頭「[受付窓口について](#受付窓口について)」section をご参照ください。

開発: [ファブラボ西播磨](https://fablab-westharima.jp) (DigiCo LLC / 合同会社デジコ)
