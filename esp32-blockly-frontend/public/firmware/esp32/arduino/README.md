# DigiCode Arduino ファームウェア（OTA対応）

## 概要

このディレクトリには、DigiCode競技用のArduino C++ファームウェアを配置します。

## 必要なファイル

ESP32にArduinoファームウェアを書き込むには、以下の4つのファイルが必要です：

| ファイル名 | オフセット | サイズ | 説明 |
|-----------|----------|--------|------|
| `bootloader.bin` | 0x1000 (4096) | 約26KB | ESP32ブートローダー |
| `partitions.bin` | 0x8000 (32768) | 約3KB | パーティションテーブル |
| `boot_app0.bin` | 0xe000 (57344) | 約4KB | ブートアプリケーション |
| `digicode-ota.bin` | 0x10000 (65536) | 可変 | DigiCode OTA対応ファームウェア |

---

## ファームウェアの作成方法

### オプション1: Arduino IDEを使用（推奨・初心者向け）

1. **Arduino IDEのインストール**
   - https://www.arduino.cc/en/software からダウンロード

2. **ESP32ボードサポートの追加**
   - Arduino IDE > 環境設定 > 追加のボードマネージャのURL:
   ```
   https://espressif.github.io/arduino-esp32/package_esp32_index.json
   ```
   - ツール > ボード > ボードマネージャ > 「esp32」で検索 > インストール

3. **OTA対応スケッチの作成**

   **基本スケッチ (`digicode-ota.ino`)**:
   ```cpp
   #include <WiFi.h>
   #include <ESPmDNS.h>
   #include <WiFiUdp.h>
   #include <ArduinoOTA.h>

   // WiFi設定（APモード）
   const char* ap_ssid = "DigiCode-Robot";
   const char* ap_password = "digicode2025";

   void setup() {
     Serial.begin(115200);
     Serial.println("DigiCode OTA Firmware Starting...");

     // APモード設定
     WiFi.mode(WIFI_AP);
     WiFi.softAP(ap_ssid, ap_password);

     IPAddress IP = WiFi.softAPIP();
     Serial.print("AP IP address: ");
     Serial.println(IP);

     // OTA設定
     ArduinoOTA.setHostname("digicode-robot");
     ArduinoOTA.setPassword("digicode2025");

     ArduinoOTA.onStart([]() {
       String type = (ArduinoOTA.getCommand() == U_FLASH) ? "sketch" : "filesystem";
       Serial.println("Start updating " + type);
     });

     ArduinoOTA.onEnd([]() {
       Serial.println("\nEnd");
     });

     ArduinoOTA.onProgress([](unsigned int progress, unsigned int total) {
       Serial.printf("Progress: %u%%\r", (progress / (total / 100)));
     });

     ArduinoOTA.onError([](ota_error_t error) {
       Serial.printf("Error[%u]: ", error);
       if (error == OTA_AUTH_ERROR) Serial.println("Auth Failed");
       else if (error == OTA_BEGIN_ERROR) Serial.println("Begin Failed");
       else if (error == OTA_CONNECT_ERROR) Serial.println("Connect Failed");
       else if (error == OTA_RECEIVE_ERROR) Serial.println("Receive Failed");
       else if (error == OTA_END_ERROR) Serial.println("End Failed");
     });

     ArduinoOTA.begin();

     Serial.println("Ready");
     Serial.print("IP address: ");
     Serial.println(IP);

     // 内蔵LED設定
     pinMode(LED_BUILTIN, OUTPUT);
   }

   void loop() {
     ArduinoOTA.handle();

     // ユーザーコードをここに追加
     // （Blocklyから生成されたコードが挿入される）

     // LED点滅（動作確認用）
     digitalWrite(LED_BUILTIN, HIGH);
     delay(1000);
     digitalWrite(LED_BUILTIN, LOW);
     delay(1000);
   }
   ```

4. **ボード設定**
   - ツール > ボード > ESP32 Arduino > ESP32 Dev Module
   - ツール > Partition Scheme > **"Minimal SPIFFS (1.9MB APP with OTA/190KB SPIFFS)"**
   - ツール > Flash Size > 4MB
   - ツール > Upload Speed > 921600

5. **コンパイル**
   - スケッチ > 検証・コンパイル（Cmd+R / Ctrl+R）

6. **バイナリファイルの取得**
   - スケッチ > コンパイルしたバイナリを出力
   - 出力先ディレクトリ（例: `/var/folders/.../.../build/esp32.esp32.esp32/`）を開く
   - 以下のファイルをコピー:
     ```
     bootloader.bin           → このディレクトリの bootloader.bin
     partitions.bin           → このディレクトリの partitions.bin
     boot_app0.bin            → このディレクトリの boot_app0.bin
     digicode-ota.ino.bin     → このディレクトリの digicode-ota.bin
     ```

---

### オプション2: Arduino CLI を使用（上級者向け）

```bash
# ESP32ボードサポートインストール（初回のみ、時間かかる）
arduino-cli config init
arduino-cli core update-index
arduino-cli core install esp32:esp32 --additional-urls https://espressif.github.io/arduino-esp32/package_esp32_index.json

# OTAライブラリのインストール（ESP32ボードサポートに含まれる）

# スケッチのコンパイル
arduino-cli compile --fqbn esp32:esp32:esp32 \
  --build-property "build.partitions=min_spiffs" \
  --output-dir ./build \
  digicode-ota

# バイナリファイルをコピー
cp ./build/digicode-ota.ino.bootloader.bin ./bootloader.bin
cp ./build/digicode-ota.ino.partitions.bin ./partitions.bin
cp ./build/boot_app0.bin ./boot_app0.bin
cp ./build/digicode-ota.ino.bin ./digicode-ota.bin
```

---

### オプション3: PlatformIO を使用

```ini
; platformio.ini
[env:esp32dev]
platform = espressif32
board = esp32dev
framework = arduino

; OTA用パーティション
board_build.partitions = min_spiffs.csv

; 必要なライブラリ
lib_deps =
    ESPmDNS
    WiFi
    ArduinoOTA
```

---

## ファームウェアの配置

1. 上記の方法でコンパイルしたバイナリファイルを取得
2. このディレクトリ（`public/firmware/esp32/arduino/`）に配置:
   ```
   esp32/arduino/
   ├── bootloader.bin
   ├── partitions.bin
   ├── boot_app0.bin
   ├── digicode-ota.bin
   └── README.md (このファイル)
   ```

3. esp-web-tools が自動的にこれらのファイルを使用してESP32に書き込む

---

## パーティション構成

**Minimal SPIFFS (1.9MB APP with OTA)**:
```
# Name,   Type, SubType, Offset,  Size, Flags
nvs,      data, nvs,     0x9000,  0x5000,
otadata,  data, ota,     0xe000,  0x2000,
app0,     app,  ota_0,   0x10000, 0x1E0000,  ← メインアプリ（1.9MB）
app1,     app,  ota_1,   0x1F0000,0x1E0000,  ← OTA更新用（1.9MB）
spiffs,   data, spiffs,  0x3D0000,0x30000,   ← ファイルシステム（190KB）
```

---

## 動作確認

1. **ファームウェア書き込み後**
   - ESP32が「DigiCode-Robot」というAPを作成
   - シリアルモニタでIPアドレス確認（通常 192.168.4.1）
   - 内蔵LEDが1秒ごとに点滅

2. **OTA接続テスト**
   - PCをESP32のAPに接続
   - ホスト名: `digicode-robot.local` または `192.168.4.1`
   - パスワード: `digicode2025`

---

## 参考資料

- [ESP32 Arduino Core](https://github.com/espressif/arduino-esp32)
- [ArduinoOTA Library](https://github.com/esp8266/Arduino/tree/master/libraries/ArduinoOTA)
- [ESP32 Partition Tables](https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-guides/partition-tables.html)

---

*最終更新: 2025年11月25日*
