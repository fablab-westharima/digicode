# 推奨ハードウェアリスト

**最終更新:** 2026-04-21

DigiCode で動作確認済みの推奨デバイスリストです。安定した動作のため、信頼できる販売店からの購入を推奨します。

---

## 重要なお知らせ

> **安価なコピー品・互換品について**
>
> AliExpress、Wish、Temu 等で販売されている安価なコピー品は、以下の問題が報告されています：
> - ピン配置が異なる
> - 電圧・電流仕様が表記と異なる
> - ドライバー IC が異なる（互換性なし）
> - 品質のばらつきが大きい
>
> サポート対応できないため、推奨販売店からの購入をお願いします。

---

## 推奨販売店

| 販売店 | 特徴 | URL |
|--------|------|-----|
| **秋月電子通商** | 電子部品の老舗、豊富な品揃え | https://akizukidenshi.com/ |
| **スイッチサイエンス** | Maker 向け、日本語ドキュメント充実 | https://www.switch-science.com/ |
| **千石電商** | 秋葉原の老舗、店頭購入可能 | https://www.sengoku.co.jp/ |
| **マルツオンライン** | 法人対応、品質保証 | https://www.marutsu.co.jp/ |
| **M5Stack 公式ストア** | M5Stack シリーズの一次仕入れ | https://m5stack.com/ |
| **Seeed Studio 公式** | XIAO シリーズの一次仕入れ | https://www.seeedstudio.com/ |
| **DigiKey** | 海外正規代理店、品質保証 | https://www.digikey.jp/ |
| **Mouser** | 海外正規代理店、品質保証 | https://www.mouser.jp/ |

---

## ESP32 ボード

DigiCode は **ESP32 系専用** のブロックエディタです。

### Generic ESP32 系

| 製品名 | 価格目安 | 備考 | リンク |
|--------|---------|------|--------|
| **ESP32 NodeMCU（拡張ボード付き）** | ¥1,782 | 初学者向け万能構成。DC ジャック (6.5-16V) 付き | [スイッチサイエンス](https://www.switch-science.com/products/9667) |
| **ESP32-DevKitC-32E** | ¥1,480〜 | 標準的な開発ボード、技適取得済み | [秋月電子](https://akizukidenshi.com/catalog/g/g115673/) / [DigiKey](https://www.digikey.jp/ja/products/detail/espressif-systems/ESP32-DEVKITC-32E/12091810) |
| **ESP32-DevKitC-VE** | ¥1,770〜 | 8MB Flash/RAM、大容量 | [秋月電子](https://akizukidenshi.com/catalog/g/g115674/) |
| **ESPr Developer 32** | ¥2,200 | 日本設計、技適取得済み | [スイッチサイエンス](https://www.switch-science.com/products/3210) |

### M5Stack 系

| 製品名 | 価格目安 | 備考 | リンク |
|--------|---------|------|--------|
| **M5StampS3A + 専用ブレイクアウトボード** | — | **DigiCode 推奨メインマイコン（専用ブレイクアウトボード開発中、販売開始時に詳細追加）** | [M5Stack 公式](https://shop.m5stack.com/) |
| **M5StickC Plus2** | ¥4,400 | 小型・ディスプレイ付き | [スイッチサイエンス](https://www.switch-science.com/products/9426) |
| **ATOM Lite** | ¥1,815 | 超小型、NeoPixel 1 発付き | [スイッチサイエンス](https://www.switch-science.com/products/6262) |
| **ATOM Matrix** | ¥2,420 | NeoPixel 5x5 マトリクス付き | [スイッチサイエンス](https://www.switch-science.com/products/6260) |
| **M5Camera / Unit Cam S3 / Timer Cam** | ¥3,000〜 | カメラ対応モジュール（BP7 対応） | [M5Stack 公式](https://shop.m5stack.com/) |

### Seeed XIAO 系

| 製品名 | 価格目安 | 備考 | リンク |
|--------|---------|------|--------|
| **XIAO ESP32S3** | ¥1,100 | 超小型、USB-C | [スイッチサイエンス](https://www.switch-science.com/products/8887) |
| **XIAO ESP32S3 Sense** | ¥2,530 | カメラ + マイク内蔵（BP7 対応） | [スイッチサイエンス](https://www.switch-science.com/products/8868) |
| **XIAO ESP32C3** | ¥980 | 省電力、RISC-V | [スイッチサイエンス](https://www.switch-science.com/products/8363) |
| **XIAO ESP32C6** | ¥1,280 | Matter 対応 | [Seeed Studio](https://www.seeedstudio.com/Seeed-XIAO-ESP32C6-p-5884.html) |

### 対応するが制約あり

| 製品 | 制約 |
|------|------|
| ESP32-CAM (OV2640) | ピン数が少なく、サーボ制御等には不向き（カメラ専用として使用） |

### DigiCode 非対応

| 製品 | 理由 |
|------|------|
| Arduino Uno / Nano | DigiCode は ESP32 系専用、サポート対象外 |
| Raspberry Pi Pico（無印） | WiFi 非対応、機能が大幅に制限される |
| ESP8266 | DigiCode は ESP8266 をサポートしていません |
| 他社マイコン（Renesas / STM 等） | 対応予定なし |

---

## サーボモーター

### 推奨サーボ（180度）

| 製品名 | 価格目安 | 用途 | リンク |
|--------|---------|------|--------|
| **SG90** | ¥440 | 2足歩行ロボット標準、軽負荷 | [秋月電子](https://akizukidenshi.com/catalog/g/g108761/) |
| **MG90S** | ¥1,240 | 金属ギア、中負荷 | [秋月電子](https://akizukidenshi.com/catalog/g/g113227/) |
| **SG92R** | ¥700 | 高トルク | [秋月電子](https://akizukidenshi.com/catalog/g/g108914/) |
| **MG996R** | ¥1,480 | 高トルク、大型ロボット | [秋月電子](https://akizukidenshi.com/catalog/g/g112534/) |

### 推奨サーボ（連続回転/360度）

| 製品名 | 価格目安 | 用途 | リンク |
|--------|---------|------|--------|
| **FS90R** | ¥500 | 連続回転、Wheel ロボット用 | [秋月電子](https://akizukidenshi.com/catalog/g/g113206/) |

### サーボ使用時の注意

```
⚠️ 電源に関する重要事項
- サーボモーターは USB 給電（500mA）では動作不安定
- 複数サーボ使用時は外部電源（5V/2A 以上）必須
- ESP32 の 3.3V ピンからはサーボ NG（5V 必要）
```

---

## センサー

### 超音波センサー

| 製品名 | 価格目安 | 用途 | リンク |
|--------|---------|------|--------|
| **HC-SR04** | ¥300〜 | 標準的な超音波センサー | [秋月電子](https://akizukidenshi.com/catalog/g/g111009/) / [スイッチサイエンス](https://www.switch-science.com/products/6080) |
| **VL53L0X ToF センサー** | ¥1,500〜 | 高精度距離測定（30-1200mm） | [スイッチサイエンス](https://www.switch-science.com/products/7385) |

### 温湿度・環境センサー

| 製品名 | 価格目安 | 精度 | リンク |
|--------|---------|------|--------|
| **DHT11** | ¥550 | 温度±2℃、湿度±5% | [秋月電子](https://akizukidenshi.com/catalog/g/g107003/) |
| **DHT22 (AM2302)** | ¥1,160 | 温度±0.5℃、湿度±2% | [秋月電子](https://akizukidenshi.com/catalog/g/g107002/) |
| **BME280 モジュール** | ¥1,380〜 | 温湿度+気圧（高精度） | [秋月電子](https://akizukidenshi.com/catalog/g/g109421/) |
| **BMP280 モジュール** | ¥550〜 | 温度+気圧（湿度なし） | [秋月電子](https://akizukidenshi.com/catalog/g/g109058/) |

### モーション・姿勢センサー

| 製品名 | 価格目安 | 用途 | リンク |
|--------|---------|------|--------|
| **MPU6050 モジュール** | ¥500〜 | 加速度・ジャイロ（倒立振子、マイクロマウス） | [秋月電子](https://akizukidenshi.com/catalog/g/g109026/) |
| **AS5600 磁気エンコーダモジュール** | ¥600〜 | 絶対角度センサー | [スイッチサイエンス](https://www.switch-science.com/products/9069) |

### HC-SR04 使用時の注意

```
⚠️ 電圧レベルに関する注意
- HC-SR04 は 5V 動作、ESP32 は 3.3V
- Echo ピンに 5V が出力される場合あり
- 分圧回路（1kΩ + 2kΩ）の使用を推奨
```

---

## ディスプレイ

### OLED（SSD1306）

| 製品名 | サイズ | 価格目安 | リンク |
|--------|--------|---------|--------|
| **0.96 インチ OLED（白）** | 128x64 | ¥580 | [秋月電子](https://akizukidenshi.com/catalog/g/g112031/) |
| **0.96 インチ OLED（青）** | 128x64 | ¥580 | [秋月電子](https://akizukidenshi.com/catalog/g/g115870/) |

### LCD キャラクタ（I2C 16x2）

| 製品名 | 価格目安 | 備考 | リンク |
|--------|---------|------|--------|
| **I2C 16x2 キャラクタ LCD** | ¥800〜 | PCF8574 経由、安価で定番 | [秋月電子](https://akizukidenshi.com/catalog/g/g109109/) |

### TFT（ILI9341 / ST7789 / ST7735）

| 製品名 | サイズ | 価格目安 | 備考 |
|--------|--------|---------|------|
| **ST7789 1.3 インチ TFT** | 240x240 | ¥1,500〜 | SPI 接続、カラー |
| **ILI9341 2.4 インチ TFT** | 240x320 | ¥1,800〜 | SPI 接続、大画面 |

---

## NeoPixel（WS2812B）

| 製品名 | LED 数 | 価格目安 | リンク |
|--------|--------|---------|--------|
| **NeoPixel Ring 12LED** | 12 | ¥1,078 | [スイッチサイエンス](https://www.switch-science.com/products/1593) |
| **NeoPixel Ring 16LED** | 16 | ¥1,287 | [スイッチサイエンス](https://www.switch-science.com/products/1537) |
| **WS2812B 8LED スティック** | 8 | ¥350 | [秋月電子](https://akizukidenshi.com/catalog/g/g114307/) |
| **WS2812B モジュール（単体）** | 1 | ¥70 | [秋月電子](https://akizukidenshi.com/catalog/g/g108414/) |

### 電源に関する注意

```
⚠️ 電流消費について
- 1LED あたり最大 60mA（白色フル発光時）
- 8LED = 最大 480mA
- 16LED = 最大 960mA
- 大量の LED は外部電源必須（5V）
```

---

## モータードライバー

| 製品名 | 対応電流 | 価格目安 | リンク |
|--------|---------|---------|--------|
| **L298N 2A デュアルモーターコントローラー** | 2A/ch | ¥2,180 | [秋月電子](https://akizukidenshi.com/catalog/g/g106680/) |
| **DRV8835 モータードライバーモジュール** | 1.2A/ch | ¥550 | [秋月電子](https://akizukidenshi.com/catalog/g/g109848/) |
| **TB6612FNG Dual DC モータードライブキット** | 1.2A/ch | ¥450 | [秋月電子](https://akizukidenshi.com/catalog/g/g111219/) / [スイッチサイエンス](https://www.switch-science.com/products/236) |

---

## ブザー・オーディオ

| 製品名 | 種類 | 価格目安 | リンク |
|--------|------|---------|--------|
| **圧電スピーカー（パッシブ）** | パッシブ | ¥40 | [秋月電子](https://akizukidenshi.com/catalog/g/g104118/) |
| **DFPlayer Mini（MP3 プレーヤー）** | MP3 | ¥600〜 | [秋月電子](https://akizukidenshi.com/catalog/g/g113277/) |

**DigiCode ではパッシブブザーを推奨**（メロディ再生対応）

---

## ロボット専用

### 推奨構成（Humanoid 2足歩行）

| 部品 | 推奨品 | 数量 | 単価 | リンク |
|------|--------|------|------|--------|
| ESP32ボード | ESP32 NodeMCU（拡張ボード付き） | 1 | ¥1,782 | [スイッチサイエンス](https://www.switch-science.com/products/9667) |
| サーボ | SG90 | 4 | ¥440 | [秋月電子](https://akizukidenshi.com/catalog/g/g108761/) |
| 超音波センサー | HC-SR04 | 1 | ¥300 | [秋月電子](https://akizukidenshi.com/catalog/g/g111009/) |
| ブザー | 圧電スピーカー | 1 | ¥40 | [秋月電子](https://akizukidenshi.com/catalog/g/g104118/) |
| **合計** | | | **¥3,882** | |

> M5StampS3A + 専用ブレイクアウトボードが販売開始されれば、より省スペースな構成を推奨予定です。

### 推奨構成（Wheel ロボット）

| 部品 | 推奨品 | 数量 | 単価 | リンク |
|------|--------|------|------|--------|
| ESP32ボード | ESP32 NodeMCU（拡張ボード付き） | 1 | ¥1,782 | [スイッチサイエンス](https://www.switch-science.com/products/9667) |
| 連続回転サーボ | FS90R | 2 | ¥500 | [秋月電子](https://akizukidenshi.com/catalog/g/g113206/) |
| 超音波センサー | HC-SR04 | 1 | ¥300 | [秋月電子](https://akizukidenshi.com/catalog/g/g111009/) |
| **合計** | | | **¥3,082** | |

---

## 関連ドキュメント

- [ハードウェア接続ガイド](./hardware-setup.md)
- [トラブルシューティング](./troubleshooting.md)
- [はじめかた](./getting-started.md)
