# DigiCode ドキュメント

**最終更新:** 2025-12-28

DigiCodeは、ESP32マイコンを使ったロボット・IoTデバイスのプログラミングを、ブロックで簡単に行えるビジュアル開発環境です。

---

## 全体の流れ

![全体の流れ](/docs/images/flow-overview.svg)

| ステップ | 内容 | 頻度 |
|---------|------|------|
| **1. 準備** | ESP32ボードとUSBケーブルを用意 | 最初のみ |
| **2. ファームウェア書き込み** | DigiCodeの基盤プログラムをUSBで書き込み | 初回のみ |
| **3. 接続設定** | WiFi接続やBLE設定（使用する方式により異なる） | 初回または変更時 |
| **4. プログラム書き込み** | ブロックで作ったプログラムを書き込み | 何度でも |

---

## 3つの書き込み方式

DigiCodeでは、ESP32へのプログラム書き込みに3つの方式が使えます。

![3つの書き込み方式](/docs/images/upload-methods.svg)

### 方式比較表

| 方式 | 速度 | ケーブル | 必要なもの | おすすめ用途 |
|------|------|----------|-----------|-------------|
| **WiFi OTA** | 最速 | 不要 | WiFiルータ、DigiCode Finder | 通常の開発、複数台更新 |
| **BLE** | 中速 | 不要 | Web Bluetooth対応ブラウザ | WiFiなし環境、ケース入りデバイス |
| **USB** | 高速 | 必要 | USBケーブル、ドライバー | 初回設定、トラブル復旧 |

> **初めての方へ:** まずUSBでファームウェアを書き込み、その後はWiFi OTAでプログラムを更新するのがおすすめです。

---

## クイックスタートガイド

### 初めてのセットアップ（15分）

![初期セットアップ](/docs/images/quickstart-initial.svg)

1. **USB接続** - ESP32をPCにUSB接続
2. **ファームウェア書き込み** - 左メニュー「ファームウェア書き込み」→「INSTALL」
3. **WiFi設定** - 「WiFi設定」でSSIDとパスワードを入力
4. **DigiCode Finder** - デスクトップアプリでデバイスを検出

→ 詳細: [はじめかた](./getting-started.md)

---

### 2回目以降（1分）

![2回目以降](/docs/images/quickstart-repeat.svg)

1. ブロックエディタでプログラムを作成
2. 「書き込み」→「WiFi OTA」を選択
3. デバイスを選んで書き込み開始

---

## 対応マイコンボード

### ESP32系（WiFi OTA / BLE / USB）

| ボード | WiFi OTA | BLE | USB | 備考 |
|--------|:--------:|:---:|:---:|------|
| ESP32 | ○ | ○ | ○ | 推奨 |
| ESP32-S3 | ○ | ○ | ○ | 高性能 |
| ESP32-C3 | ○ | ○ | ○ | 省電力 |
| ESP32-S2 | ○ | - | ○ | BLE非対応 |

→ 詳細: [ESP32書き込みガイド](./04-program-setup-esp32.md)

### その他のマイコン（USB）

| ボード | 書き込み | 備考 |
|--------|:--------:|------|
| Arduino Uno/Nano | USB | 入門向け |
| Raspberry Pi Pico | USB | 高性能 |

→ 詳細: [Arduino](./03-program-setup-arduino.md) / [RP2040](./02-program-setup-rp2040.md)

---

## 必要なソフトウェア

| ソフトウェア | 用途 | 必須/任意 |
|-------------|------|----------|
| **Webブラウザ** (Chrome/Edge) | DigiCode本体 | 必須 |
| **DigiCode Finder** | WiFiデバイス検出 | WiFi OTA使用時 |
| **USBドライバー** | シリアル通信 | USB使用時 |

### DigiCode Finder のダウンロード

WiFi OTA書き込みには、デバイス検出用のデスクトップアプリが必要です。

**ダウンロード:** https://github.com/fablab-westharima/DigiCode-Finder/releases

| OS | ファイル |
|----|---------|
| Windows | `.exe` |
| macOS | `.dmg` |
| Linux | `.AppImage` |

→ 詳細: [OTA設定ガイド](./05-ota-guide.md)

---

## ドキュメント一覧

### 入門

| ドキュメント | 内容 |
|-------------|------|
| [はじめかた](./getting-started.md) | 初期セットアップ、最初のプログラム |
| [推奨ハードウェア](./recommended-hardware.md) | 動作確認済みデバイス一覧 |

### 書き込みガイド

| ドキュメント | 内容 |
|-------------|------|
| [共通手順](./01-program-setup-common.md) | 用語定義、全マイコン共通手順 |
| [RP2040](./02-program-setup-rp2040.md) | Raspberry Pi Pico系 |
| [Arduino](./03-program-setup-arduino.md) | Arduino Uno/Nano系 |
| [ESP32](./04-program-setup-esp32.md) | ESP32全般（WiFi OTA/BLE/USB） |
| [OTA設定](./05-ota-guide.md) | WiFi OTA詳細設定 |

### リファレンス

| ドキュメント | 内容 |
|-------------|------|
| [ブロックリファレンス](./block-reference.md) | 全ブロックの使い方 |
| [ハードウェア接続](./hardware-setup.md) | センサー・モーターの配線 |
| [トラブルシューティング](./troubleshooting.md) | よくある問題と解決方法 |
| [FAQ](./faq.md) | よくある質問 |

### 上級者向け

| ドキュメント | 内容 |
|-------------|------|
| [アーキテクチャ](./architecture.md) | システム構成と技術スタック |
| [ローカルコンパイルサーバー](./local-compile-server.md) | 自分のPCでコンパイル |

---

## サポート

問題が発生した場合は、以下を参照してください：

1. [トラブルシューティング](./troubleshooting.md)
2. [FAQ](./faq.md)
3. [GitHub Issues](https://github.com/fablab-westharima/DigiCode/issues)
