# DigiCode アーキテクチャ概要

**最終更新:** 2026-04-21

DigiCodeシステムの全体構成と技術スタックを説明します。

## システム構成

| コンポーネント | 技術 | デプロイ先 |
|-------------|------|-----------|
| **フロントエンド** | React 19 + Blockly | Cloudflare Pages |
| **バックエンド API** | Hono + Cloudflare Workers | Cloudflare Workers |
| **クラスサーバー** | Hono + better-sqlite3 | HPE ML30 (`class.digital-fab.jp`) |
| **コンパイルサーバー** | Node.js + Arduino CLI | HPE ML30 / Railway |
| **データベース** | Cloudflare D1 (SQLite) | Cloudflare |
| **ファイルストレージ** | Cloudflare R2 | Cloudflare（Bucket配置済み、現状未使用） |
| **決済** | Stripe Billing | Stripe（本番稼働中） |

---

## 技術スタック

### フロントエンド

- **フレームワーク:** React 19 + TypeScript
- **ビルドツール:** Vite 7
- **UI:** Tailwind CSS + shadcn/ui
- **ブロックエディタ:** Blockly 10.4
- **状態管理:** Zustand
- **ルーティング:** React Router 7
- **デバイス書き込み:** esp-web-tools, esptool-js
- **国際化:** i18next（日本語 / 英語 / スペイン語 / ポルトガル語 / 繁体中文の5言語）

### バックエンド API

- **ランタイム:** Cloudflare Workers
- **フレームワーク:** Hono
- **データベース:** Cloudflare D1（users, classes, class_members, compile_usage, subscriptions 等）
- **認証:** JWT
- **決済:** Stripe Billing（Phase D-1、2026-04-18 本番稼働）

### クラスサーバー（独立）

- **リポジトリ:** `fablab-westharima/digicode-class-server`（Private）
- **ランタイム:** Node.js + Hono + better-sqlite3
- **役割:** 課題（assignments）・答案（submissions）の管理。大容量XMLをD1ではなくSQLiteで管理
- **デプロイ先:** HPE ML30（`https://class.digital-fab.jp`）

### コンパイルサーバー

- **リポジトリ:** [`fablab-westharima/digicode-compile-api`](https://github.com/fablab-westharima/digicode-compile-api)（Public、MIT、2026-05-08 切り出し）
- **ランタイム:** Node.js + Hono
- **コンパイラ:** PlatformIO Core 6.1.19（pioarduino fork、ESP32 専用）
- **ターゲット:** ESP32 16 boards（warmup-pio.ts で esp32dev/s3/c3 = 3 target precompile baked）
- **デプロイ先:** HPE ML30（クラウドコンパイル、`https://compile.digital-fab.jp`）/ Railway（バックアップ、復旧 phase 6 後判断）
- **配布:**
  - `ghcr.io/fablab-westharima/digicode-compile-api:latest`（canonical、CLI / orchestrator 向け）
  - `docker.io/digicollc/digicode-compile-server:latest`（DockerHub mirror、Docker Desktop GUI 向け、両 registry に同 digest publish）

### ESP32ファームウェア

- **言語:** Arduino C++
- **OTA:** ArduinoOTA / WiFi OTA
- **mDNS:** ESP32 mDNS
- **ライブラリ:** DigiCodeHumanoid / DigiCodeTransform / DigiCodeWheel（独自実装）

---

## データフロー

### プログラム書き込みフロー（USB）

```
ブロックエディタ → コンパイルサーバー → バイナリ生成 → ブラウザのWeb Serial API → ESP32
```

### プログラム書き込みフロー（WiFi OTA）

```
ブロックエディタ → コンパイルサーバー → バイナリ生成 → HTTP POSTでESP32のOTAエンドポイントへ
```

### クラス機能フロー

```
教員: ブラウザ → バックエンドAPI(D1) → クラスサーバー(ML30 SQLite)
生徒: ブラウザ → バックエンドAPI → 課題取得・答案提出 → クラスサーバー
```

---

## ディレクトリ構造

### フロントエンド

```
variants/ota/frontend/
├── public/
│   ├── firmware/         # ファームウェアバイナリ
│   └── docs/             # ドキュメント（5言語）
├── src/
│   ├── blocks/           # Blockly ブロック定義（arduino/ + common/）
│   ├── components/       # Reactコンポーネント
│   │   ├── editor/       # エディタ・モードセレクター
│   │   ├── serial/       # シリアルモニター
│   │   ├── device/       # デバイス管理
│   │   ├── settings/     # 設定・プラン
│   │   └── ui/           # UIコンポーネント（shadcn）
│   ├── pages/            # ページコンポーネント
│   ├── services/         # APIサービス
│   ├── stores/           # Zustandストア
│   ├── i18n/             # 多言語対応（5言語）
│   └── data/             # サンプルプロジェクト等
```

### バックエンドAPI

```
esp32-blockly-backend/
├── src/
│   ├── index.ts          # エントリーポイント
│   ├── routes/           # APIルート
│   ├── middleware/       # 認証等
│   └── db/               # D1スキーマ
└── wrangler.toml         # Cloudflare Workers設定
```

---

## セキュリティ

### 認証・認可
- JWT トークンによるセッション管理
- すべての API リクエストにトークン付与
- プラン別機能制限（Stripe 連携）

### CORS
- フロントエンドからのリクエストを許可
- ESP32 デバイスからのリクエストを許可（OTA用）

### データ保護
- パスワードはハッシュ化して保存
- HTTPS 通信（本番環境）
- XSS 対策（React のエスケープ機能）

---

## テスト

- **ユニットテスト:** vitest 環境構築済み（テスト実装は今後）
- **E2Eテスト:** 未実装

---

## スケーラビリティ

### 水平スケーリング
- Cloudflare Workers: 自動スケール
- Cloudflare D1: 自動レプリケーション
- コンパイルサーバー: ML30 + Railway のデュアル構成

### パフォーマンス最適化
- フロントエンド: Vite による高速ビルド、コード分割
- バックエンド: Workers の Edge 配信
- データベース: インデックス最適化

---

## 参考資料

- [React Documentation](https://react.dev/)
- [Blockly Documentation](https://developers.google.com/blockly)
- [Cloudflare Workers](https://developers.cloudflare.com/workers/)
- [Arduino CLI](https://arduino.github.io/arduino-cli/)
- [ESP32 Arduino Core](https://github.com/espressif/arduino-esp32)
