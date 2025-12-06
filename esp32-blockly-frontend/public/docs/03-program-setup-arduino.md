# プログラム書き込み_Arduino系

**最終更新:** 2025-12-06

> **用語の定義:** このドキュメントで使用する「ファームウェア初期書き込み」と「プログラム書き込み」の定義については、[プログラム書き込み_共通手順](./01-program-setup-common.md) の「用語の定義」セクションをご参照ください。

---

## 対応ボード

- Arduino Uno
- Arduino Nano
- Arduino Nano (Old Bootloader)
- Arduino Leonardo
- その他 ATmega328P / ATmega32U4 搭載ボード

---

## Arduino の特徴

Arduino は AVR マイコンを使った標準的な開発ボード。以下の特徴があります：

- **言語:** Arduino C++（C/C++）のみ対応
- **接続方法:** USB（バーチャルシリアルポート）または FTDI などのシリアル変換アダプタ
- **ブートローダー:** ROM に固定（通常は置き換え不要）
- **書き込み形式:** Intel HEX または Binary

---

## 書き込み手順

### 方法 1: USB 有線接続

**対応ボード:**
- Arduino Uno（USB ネイティブ）
- Arduino Nano（USB ネイティブ）
- Arduino Leonardo（ATmega32U4）

#### 準備

1. **パソコンと接続**
   - USB ケーブルで Arduino をパソコンに接続
   - Arduino IDE や `dmesg` で シリアルポート確認

   ```bash
   # Macの場合
   ls -la /dev/tty.usbmodem*
   # または
   ls -la /dev/tty.usbserial*

   # Linuxの場合
   ls -la /dev/ttyUSB*
   # または
   ls -la /dev/ttyACM*
   ```

2. **DigiCode でバイナリを生成**
   - [DigiCode](https://digicode-frontend.pages.dev) にアクセス
   - ログイン
   - ボード選択: **Arduino Uno** または **Arduino Nano** を選択
   - 言語: **Arduino C++** を選択
   - プログラムを作成
   - **コンパイル** をクリック
   - `*.hex` または `*.bin` ファイルがダウンロード可能に

3. **avrdude で書き込み（コマンドライン）**

   ```bash
   # Arduino Uno の場合
   avrdude -p atmega328p -c arduino -P /dev/tty.usbmodem14201 -b 115200 -D -U flash:w:program.hex:i

   # Arduino Nano の場合（標準ブートローダー）
   avrdude -p atmega328p -c arduino -P /dev/tty.usbserial-14101 -b 57600 -D -U flash:w:program.hex:i

   # Arduino Nano (Old Bootloader) の場合
   avrdude -p atmega328p -c arduino -P /dev/tty.usbserial-14101 -b 115200 -D -U flash:w:program.hex:i
   ```

   **各パラメータの説明:**
   - `-p atmega328p`: マイコン型（Uno / Nano）
   - `-c arduino`: ボードタイプ
   - `-P`: シリアルポート（環境に合わせて変更）
   - `-b`: ボーレート（Uno: 115200、Nano: 57600）
   - `-D`: EEPROM 消去をスキップ
   - `-U flash:w:`: フラッシュメモリに書き込み

4. **書き込み完了**
   ```
   avrdude: safemode: Fuses OK (E:00, H:00, L:FF)
   avrdude done.  Thank you.
   ```

#### Arduino IDE での書き込み（GUI）

1. Arduino IDE を開く
2. **ツール → ボード** から対応ボード選択
3. **ツール → シリアルポート** から接続ポート選択
4. **スケッチ → バイナリをアップロード**（事前に HEX ファイル配置）
5. または Ctrl+U でアップロード（コード直接書き込み）

---

### 方法 2: FTDI 等のシリアル変換アダプタ経由

**対応状況:**
- Arduino Nano（FTDI で TX/RX 接続）
- Arduino 互換ボード（TX/RX ピン露出）
- **非推奨:** USB ネイティブ ボード（Uno / Leonardo）

#### 準備

1. **FTDI アダプタの接続**
   ```
   FTDI GND  → Arduino GND
   FTDI TX   → Arduino RX (pin 0)
   FTDI RX   → Arduino TX (pin 1)
   FTDI 5V   → Arduino 5V
   ```

   **注意:** 電圧は必ず確認（3.3V / 5V）

2. **DigiCode で バイナリを生成**
   - （方法 1 と同じ）

3. **avrdude で書き込み**
   ```bash
   # FTDI を使用する場合
   avrdude -p atmega328p -c ftdi -P /dev/tty.usbserial-FT3JHQ2H -b 115200 -D -U flash:w:program.hex:i
   ```

   **パラメータの変更点:**
   - `-c ftdi`: ボードタイプを FTDI に変更
   - `-P`: FTDI のシリアルポート
   - `-b`: 通常 115200 bps

4. **FTDI ドライバの確認**
   - Mac / Linux: 通常インストール済み
   - Windows: [FTDI ドライバ](https://ftdichip.com/drivers/) をインストール

#### 回路確認ツール

```bash
# FTDI ボードが認識されているか確認
dmesg | grep FTDI

# または
ls -la /dev/tty.usbserial*
```

---

## シリアルモニタで動作確認

Arduino IDE での確認方法：

1. **ツール → シリアルモニタ** を開く
2. ボーレート設定: **9600 bps**（プログラムで `Serial.begin(9600)` の場合）
3. Arduino からの出力が表示される

コマンドラインでの確認：

```bash
# Macの場合
screen /dev/tty.usbmodem14201 9600

# Linuxの場合
screen /dev/ttyACM0 9600
```

終了: `Ctrl+A` → `Ctrl+X`

---

## ボード・ブートローダーの判定

Arduino Nano の場合、ボードのバージョン確認が重要です：

### 判定方法

1. **古い RP2040 または A4-A5 ジャンパなし**
   → Old Bootloader の可能性あり

2. **avrdude で自動判定**
   ```bash
   # バイナリ書き込み時に -b パラメータで判定
   # 57600 bps  : 標準ブートローダー
   # 115200 bps : Old Bootloader
   ```

3. **DigiCode で確認**
   - ボード選択時に `Arduino Nano (Old Bootloader)` を選べる
   - これを選ぶと 115200 bps 向けバイナリが生成される

---

## トラブルシューティング

| 症状 | 原因 | 対処 |
|------|------|------|
| シリアルポート表示されない | USB ドライバ不足 | Arduino IDE で ドライバ確認（Windows） |
| `avrdude: ser_open(): can't open device` | ポート名ミス | `ls /dev/tty.*` で確認 |
| `avrdude: stk500_recv(): programmer is not responding` | ボーレート間違い | Old Bootloader チェック |
| 書き込み後、プログラム動作なし | ブートローダー破損 | Arduino IDE で ブートローダー書き込み |
| FTDI 接続後も反応なし | TX/RX 接続逆 | ケーブル配線確認 |

---

## avrdude のインストール

### Mac

```bash
brew install avrdude
```

### Linux (Ubuntu/Debian)

```bash
sudo apt-get install avrdude
```

### Windows

- [AVRDUDE ダウンロード](https://www.nongnu.org/avrdude/)
- または Arduino IDE に付属

---

## 参考リンク

- [Arduino 公式ドキュメント](https://docs.arduino.cc/)
- [AVRDUDE マニュアル](https://www.nongnu.org/avrdude/user-manual/avrdude_4.html)
- [ATmega328P データシート](https://ww1.microchip.com/downloads/en/DeviceDoc/Atmel-7810-UART-Automotive-Microcontroller-ATmega328P_Datasheet.pdf)

---

## 次のステップ

- [プログラム書き込み_共通手順](./01_プログラム書き込み_共通手順.md) に戻る
- [ESP32系の書き込み手順](./04_プログラム書き込み_ESP32.md) を確認
- [OTA設定ガイド](./05_OTA設定ガイド.md)（ESP32 OTA 書き込み時）
