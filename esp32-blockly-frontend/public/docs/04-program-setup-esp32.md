# プログラム書き込み_ESP32系

**最終更新:** 2025-12-06

> **用語の定義:** このドキュメントで使用する「ファームウェア初期書き込み」と「プログラム書き込み」の定義については、[プログラム書き込み_共通手順](./01-program-setup-common.md) の「用語の定義」セクションをご参照ください。

---

## 対応ボード

- ESP32
- ESP32-S2 / S3
- ESP32-C2 / C3 / C5 / C6
- ESP8266
- その他 ESP-IDF 対応ボード

---

## ESP32 の特徴

ESP32 は WiFi/Bluetooth を搭載した高機能マイコン。以下の特徴があります：

- **言語:** Arduino C++ と MicroPython 両対応
- **接続方法:** USB 有線、WiFi (OTA)、または バイナリ直指定
- **ブートローダー:** ROM に固定（通常は置き換え不要）
- **書き込み形式:** Binary (.bin)、Intel HEX、UF2 (RP2040 との互換性用)

---

## 書き込み手順

### 方法 1: USB 有線接続

**推奨:** 初回設定時や確実に書き込みたい場合

#### 準備

1. **パソコンと接続**
   - USB ケーブルで ESP32 をパソコンに接続
   - シリアルポート確認

   ```bash
   # Macの場合
   ls -la /dev/tty.usbserial*
   # または
   ls -la /dev/tty.usbmodem*

   # Linuxの場合
   ls -la /dev/ttyUSB*

   # Windowsの場合（PowerShell）
   Get-WmiObject Win32_SerialPort
   ```

2. **DigiCode でバイナリを生成**
   - [DigiCode](https://digicode-frontend.pages.dev) にアクセス
   - ログイン
   - ボード選択: **ESP32** など選択
   - 言語: **Arduino C++** または **MicroPython** を選択
   - プログラムを作成
   - **コンパイル** をクリック
   - **ダウンロード** で `.bin` ファイルを取得

3. **esptool.py で書き込み**

   ```bash
   # インストール（初回のみ）
   pip install esptool

   # 書き込み
   esptool.py -p /dev/tty.usbserial-14101 -b 460800 write_flash 0x1000 firmware.bin
   ```

   **各パラメータの説明:**
   - `-p`: シリアルポート（環境に合わせて変更）
   - `-b`: ボーレート（通常 460800 - 921600 で高速化可能）
   - `write_flash`: フラッシュメモリに書き込み
   - `0x1000`: オフセットアドレス（ESP32 の標準）
   - `firmware.bin`: バイナリファイル名

4. **書き込み完了**
   ```
   Compressed 50 bytes to 33...
   Wrote 50 bytes (33 compressed) at 0x00001000 in 0.1 seconds (effective 4.5 kbit/s)...
   Leaving...
   ```

   すぐに ESP32 が起動します。シリアルモニタで確認可能。

#### トラブル: USB が認識されない場合

**Mac / Linux:**
```bash
# CP2102 / CH340 ドライバが必要な場合
brew install wch-ch34x-usb-serial-driver  # Mac
```

**Windows:**
- [CP2102 ドライバ](https://www.silabs.com/products/development-tools/software/usb-to-uart-bridge-vcp-drivers)
- [CH340 ドライバ](http://www.wch.cn/downloads/CH341SER_ZIP.html)

---

### 方法 2: OTA (Over-The-Air) 書き込み

**推奨:** ファームウェアが正常に動作している場合の更新

OTA 書き込みは WiFi 経由で書き込みを実行します。初回はファームウェアの設定が必要です。

#### 前提条件

- ESP32 にファームウェア（BLE/OTA対応版）が既に書き込まれている
- WiFi ルータが利用可能
- AP 名（SSID）とデバイス名が設定されている

#### 詳細手順

**→ [OTA設定ガイド](./05_OTA設定ガイド.md) を参照**

#### 簡易手順

```bash
# OTA 書き込み（1台の場合）
esptool.py --chip esp32 -p OTA -h <デバイスIP> write_flash 0x1000 firmware.bin

# 複数台を一括書き込み（スクリプト例）
for ip in 192.168.1.100 192.168.1.101 192.168.1.102; do
  echo "書き込み中: $ip"
  esptool.py --chip esp32 -p OTA -h $ip write_flash 0x1000 firmware.bin
done
```

---

### 方法 3: Binary ファイルを直接指定

**用途:** すでにプログラムがある場合、または検証用

#### 手順

1. **Binary ファイルを準備**
   - DigiCode からダウンロード、または
   - Arduino IDE からエクスポート

2. **esptool.py で書き込み**
   ```bash
   esptool.py -p /dev/tty.usbserial-14101 write_flash 0x0 bootloader.bin 0x8000 partitions.bin 0x10000 app.bin
   ```

   **複数のバイナリファイル (ブートローダ + パーティション + アプリ):**
   - `0x0`: ブートローダー
   - `0x8000`: パーティションテーブル
   - `0x10000`: アプリケーション（主プログラム）

3. **DigiCode が自動生成する場合**
   - DigiCode はアプリケーション部分 (`0x10000`) のバイナリのみを生成
   - ブートローダーとパーティションテーブルはファームウェアに含まれている

---

## シリアルモニタで動作確認

### Arduino IDE

1. **ツール → シリアルモニタ** を開く
2. ボーレート設定: **115200 bps**
3. ESP32 からの出力が表示される

### コマンドライン

```bash
# Macの場合
screen /dev/tty.usbserial-14101 115200

# Linuxの場合
screen /dev/ttyUSB0 115200
```

終了: `Ctrl+A` → `Ctrl+X`

---

## WiFi 設定と mDNS 確認

OTA 書き込みを使用する場合、WiFi とデバイス名の確認が重要です。

### WiFi 情報の確認

ESP32 をシリアルモニタで見て、以下の情報を確認：

```
WiFi Connected!
IP: 192.168.1.100
Device Name: esp32-a1b2c3
mDNS: esp32-a1b2c3.local
```

### mDNS で検出

```bash
# デバイスをスキャン
dns-sd -B _digicode._tcp local.

# 出力例
Browsing for _digicode._tcp
DATE TIME  Start
DATE TIME  ..
DATE TIME  Instance "esp32-a1b2c3" in domain local
```

### IP アドレスで直接確認

```bash
# ホストネームから IP を解決
ping esp32-a1b2c3.local

# HTTP でサーバー確認
curl http://192.168.1.100/
```

---

## トラブルシューティング

| 症状 | 原因 | 対処 |
|------|------|------|
| シリアルポート表示されない | USB ドライバ不足 | CP2102 / CH340 ドライバインストール |
| `esptool.py: command not found` | esptool.py 未インストール | `pip install esptool` |
| 書き込み中に `TIMEOUT` エラー | USB ケーブル接種不安定 | ケーブル再接続、別のポート試す |
| OTA 書き込み失敗（`Connection refused`） | ファームウェア未対応 | USB 有線で正式ファームウェア書き込み |
| WiFi 接続できない | AP 設定ミス | シリアルコンソールから WiFi 再設定 |

---

## esptool.py インストール

### Mac / Linux

```bash
pip install esptool
# または
pip3 install esptool
```

### Windows

```powershell
pip install esptool
```

Python がインストールされていない場合は [python.org](https://www.python.org/downloads/) からインストール。

---

## 参考リンク

- [ESP-IDF 公式ドキュメント](https://docs.espressif.com/projects/esp-idf/en/latest/)
- [esptool.py GitHub](https://github.com/espressif/esptool)
- [Arduino Core for ESP32](https://github.com/espressif/arduino-esp32)

---

## 次のステップ

- [プログラム書き込み_共通手順](./01_プログラム書き込み_共通手順.md) に戻る
- [OTA設定ガイド](./05_OTA設定ガイド.md) で詳細な OTA 設定確認
