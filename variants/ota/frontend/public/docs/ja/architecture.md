# DigiCode アーキテクチャ概要

DigiCodeシステムの全体構成と技術スタックを説明します。

## システム構成

![システム構成図](/docs/images/system-architecture.svg)

## 技術スタック

### フロントエンド
- **フレームワーク:** React 19 + TypeScript
- **ビルドツール:** Vite 7
- **UI:** Tailwind CSS + shadcn/ui
- **ブロックエディタ:** Blockly 10.4
- **状態管理:** Zustand
- **ルーティング:** React Router 7
- **デバイス書き込み:** esp-web-tools, esptool-js

### バックエンドAPI
- **ランタイム:** Cloudflare Workers
- **フレームワーク:** Hono
- **データベース:** Cloudflare D1 (SQLite)
- **認証:** JWT
- **ファイルストレージ:** Cloudflare R2

### コンパイルサーバー
- **ランタイム:** Node.js
- **フレームワーク:** Express
- **コンパイラ:** Arduino CLI 1.3.1
- **ターゲット:** ESP32 Arduino Core 3.3.4

### ESP32ファームウェア
- **言語:** Arduino C++
- **OTA:** ArduinoOTA / WiFi OTA
- **mDNS:** ESP32 mDNS
- **通信:** HTTP Server, WebSocket（予定）

## データフロー

### 1. プログラム作成フロー

![プログラム作成フロー](/docs/images/flow-program-creation.svg)

### 2. 認証フロー

![認証フロー](/docs/images/flow-auth.svg)

### 3. WiFi OTA更新フロー

![WiFi OTA更新フロー](/docs/images/flow-ota.svg)

## ディレクトリ構造

### フロントエンド
```
esp32-blockly-frontend/
├── public/
│   └── firmware/         # ファームウェアバイナリ
├── src/
│   ├── blocks/           # Blockly ブロック定義
│   ├── components/       # Reactコンポーネント
│   │   ├── editor/       # エディタ関連
│   │   ├── serial/       # シリアルモニター
│   │   ├── device/       # デバイス管理
│   │   └── ui/           # UI コンポーネント（shadcn）
│   ├── pages/            # ページコンポーネント
│   ├── services/         # API サービス
│   ├── stores/           # Zustand ストア
│   └── data/             # サンプルプロジェクト等
├── e2e/                  # E2Eテスト（Playwright）
└── playwright.config.ts
```

### バックエンドAPI
```
esp32-blockly-backend/
├── src/
│   ├── index.ts          # エントリーポイント
│   ├── routes/           # API ルート
│   ├── middleware/       # 認証等
│   └── db/               # D1 スキーマ
└── wrangler.toml         # Cloudflare Workers設定
```

### コンパイルサーバー
```
arduino-compile-server/
├── server.js             # Express サーバー
├── templates/            # コード生成テンプレート
├── temp/                 # 一時ファイル
└── build/                # ビルド出力
```

## セキュリティ

### 認証・認可
- JWT トークンによるセッション管理
- ローカルストレージにトークン保存
- すべてのAPI リクエストにトークン付与

### CORS
- フロントエンド（localhost:5173）からのリクエストを許可
- ESP32 デバイスからのリクエストを許可（OTA用）

### データ保護
- パスワードはハッシュ化して保存
- HTTPS 通信（本番環境）
- XSS 対策（React のエスケープ機能）

## スケーラビリティ

### 水平スケーリング
- Cloudflare Workers: 自動スケール
- Cloudflare D1: 自動レプリケーション
- コンパイルサーバー: VPS でスケールアウト可能

### パフォーマンス最適化
- フロントエンド: Vite による高速ビルド、コード分割
- バックエンド: Workers の Edge 配信
- データベース: インデックス最適化

## 今後の拡張

### 短期
- ユニットテスト・E2Eテスト拡充
- CI/CD パイプライン構築
- エラーハンドリング強化

### 中期
- WebSocket によるリアルタイム通信
- デバイスファームウェア自動更新
- クラウドプロジェクト共有機能

### 長期
- デバイス間協調制御
- 教育向けコンテンツ拡充
- 複数言語対応（国際化）

## 参考資料

- [React Documentation](https://react.dev/)
- [Blockly Documentation](https://developers.google.com/blockly)
- [Cloudflare Workers](https://developers.cloudflare.com/workers/)
- [Arduino CLI](https://arduino.github.io/arduino-cli/)
- [ESP32 Arduino Core](https://github.com/espressif/arduino-esp32)
