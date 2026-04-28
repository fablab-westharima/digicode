# DigiCode

ESP32マイコンを使ったロボット・IoTデバイスのプログラミングを、ブロックで簡単に行えるビジュアル開発環境です。

## 特徴

- 🎨 **ビジュアルプログラミング** - Blocklyによる直感的なブロックエディタ
- 🚀 **ESP32対応** - ESP32、ESP32-S2、ESP32-S3、ESP32-C3に対応
- 📡 **WiFi OTA更新** - USBケーブル不要の無線書き込み
- 🏆 **競技ロボット対応** - ライントレース、マイクロマウス向け機能完備
- 🤖 **OTTO互換** - カスタムOTTOライブラリ搭載
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
├── compile-api/             # Node.js + Hono コンパイルサーバー (PlatformIO Core)
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

MIT License

## コントリビューション

Issue・Pull Requestを歓迎します。

## サポート

問題が発生した場合は、[トラブルシューティング](./docs/troubleshooting.md)を確認するか、GitHubのIssueで報告してください。

## 開発者

- GitHub: [your-username]
- Email: your-email@example.com
