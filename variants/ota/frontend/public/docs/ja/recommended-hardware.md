# 推奨ハードウェアリスト

DigiCodeで動作確認済みの推奨デバイスリストです。安定した動作のため、信頼できる販売店からの購入を推奨します。

## 重要なお知らせ

> **安価なコピー品・互換品について**
>
> AliExpress、Wish、Temu等で販売されている安価なコピー品は、以下の問題が報告されています：
> - ピン配置が異なる
> - 電圧・電流仕様が表記と異なる
> - ドライバーICが異なる（互換性なし）
> - 品質のばらつきが大きい
>
> サポート対応できないため、推奨販売店からの購入をお願いします。

---

## 推奨販売店

| 販売店 | 特徴 | URL |
|--------|------|-----|
| **秋月電子通商** | 電子部品の老舗、豊富な品揃え | https://akizukidenshi.com/ |
| **スイッチサイエンス** | Maker向け、日本語ドキュメント充実 | https://www.switch-science.com/ |
| **千石電商** | 秋葉原の老舗、店頭購入可能 | https://www.sengoku.co.jp/ |
| **マルツオンライン** | 法人対応、品質保証 | https://www.marutsu.co.jp/ |
| **DigiKey** | 海外正規代理店、品質保証 | https://www.digikey.jp/ |
| **Mouser** | 海外正規代理店、品質保証 | https://www.mouser.jp/ |

---

## ESP32ボード

| 製品名 | 価格目安 | 備考 | リンク |
|--------|----------|------|--------|
| **ESP32 NodeMCU（拡張ボード付き）** | ¥1,782 | **最推奨**。DCジャック(6.5-16V)付きで電子工作全般に便利 | [スイッチサイエンス](https://www.switch-science.com/products/9667) |
| **ESP32-DevKitC-32E** | ¥1,480〜 | 標準的な開発ボード。技適取得済み | [秋月電子](https://akizukidenshi.com/catalog/g/g115673/) / [DigiKey](https://www.digikey.jp/ja/products/detail/espressif-systems/ESP32-DEVKITC-32E/12091810) / [Mouser](https://www.mouser.jp/ProductDetail/Espressif-Systems/ESP32-DevKitC-32E?qs=GedFDFLaBXFpgD0kAZWDrQ%3D%3D) |
| **ESP32-DevKitC-VE** | ¥1,770〜 | 8MB Flash/RAM、大容量 | [秋月電子](https://akizukidenshi.com/catalog/g/g115674/) / [DigiKey](https://www.digikey.jp/ja/products/detail/espressif-systems/ESP32-DEVKITC-VE/12091812) / [Mouser](https://www.mouser.jp/ProductDetail/Espressif-Systems/ESP32-DevKitC-VE?qs=vmHwEFxEFR%2BnPxzX%2FBK62A%3D%3D) |
| **ESPr Developer 32** | ¥2,200 | 日本設計、技適取得済み | [スイッチサイエンス](https://www.switch-science.com/products/3210) |

### 非推奨ボード

| 製品 | 理由 |
|------|------|
| NodeMCU-32S (安価品) | ピン配置が異なる場合あり |
| ESP32-CAM (OV2640) | ピン数が少なく、サーボ制御に不向き |
| ESP32-S2 | GPIO配置が異なる、一部機能非対応 |
| ESP32-C3 | ADC/タッチセンサー仕様が異なる |

---

## サーボモーター

### 推奨サーボ（180度）

| 製品名 | 価格目安 | 用途 | リンク |
|--------|----------|------|--------|
| **SG90** | ¥440 | OTTO標準、軽負荷 | [秋月電子](https://akizukidenshi.com/catalog/g/g108761/) |
| **MG90S** | ¥1,240 | 金属ギア、中負荷 | [秋月電子](https://akizukidenshi.com/catalog/g/g113227/) |
| **SG92R** | ¥700 | 高トルク | [秋月電子](https://akizukidenshi.com/catalog/g/g108914/) |
| **MG996R** | ¥1,480 | 高トルク、大型ロボット | [秋月電子](https://akizukidenshi.com/catalog/g/g112534/) |

### 推奨サーボ（連続回転/360度）

| 製品名 | 価格目安 | 用途 | リンク |
|--------|----------|------|--------|
| **FS90R** | ¥500 | 連続回転、OTTO Wheel用 | [秋月電子](https://akizukidenshi.com/catalog/g/g113206/) |

### サーボ使用時の注意

```
⚠️ 電源に関する重要事項
- サーボモーターはUSB給電（500mA）では動作不安定
- 複数サーボ使用時は外部電源（5V/2A以上）必須
- ESP32の3.3VピンからはサーボNG（5V必要）
```

---

## 超音波センサー

| 製品名 | 価格目安 | 用途 | リンク |
|--------|----------|------|--------|
| **HC-SR04** | ¥300〜 | 標準的な超音波センサー | [秋月電子](https://akizukidenshi.com/catalog/g/g111009/) / [スイッチサイエンス](https://www.switch-science.com/products/6080) / [Mouser](https://www.mouser.jp/ProductDetail/OSEPP-Electronics/HC-SR04?qs=wNBL%252BABd93PqZEhuhHkuOw%3D%3D) |

### HC-SR04使用時の注意

```
⚠️ 電圧レベルに関する注意
- HC-SR04は5V動作、ESP32は3.3V
- Echoピンに5Vが出力される場合あり
- 分圧回路（1kΩ + 2kΩ）の使用を推奨
```

---

## 温湿度センサー

| 製品名 | 価格目安 | 精度 | リンク |
|--------|----------|------|--------|
| **DHT11** | ¥550 | 温度±2℃、湿度±5% | [秋月電子](https://akizukidenshi.com/catalog/g/g107003/) |
| **DHT22 (AM2302)** | ¥1,160 | 温度±0.5℃、湿度±2% | [秋月電子](https://akizukidenshi.com/catalog/g/g107002/) |
| **SHT31モジュール** | ¥1,280 | 高精度I2C | [秋月電子](https://akizukidenshi.com/catalog/g/g112125/) / [スイッチサイエンス](https://www.switch-science.com/products/2853) |
| **BME280モジュール** | ¥1,380〜 | 温湿度+気圧 | [秋月電子](https://akizukidenshi.com/catalog/g/g109421/) / [スイッチサイエンス](https://www.switch-science.com/products/2236) |

---

## ディスプレイ (OLED)

| 製品名 | サイズ | 価格目安 | リンク |
|--------|--------|----------|--------|
| **0.96インチ OLED (白)** | 128x64 | ¥580 | [秋月電子](https://akizukidenshi.com/catalog/g/g112031/) |
| **0.96インチ OLED (青)** | 128x64 | ¥580 | [秋月電子](https://akizukidenshi.com/catalog/g/g115870/) |
| **Grove 0.96インチ OLED** | 128x64 | ¥1,247 | [スイッチサイエンス](https://www.switch-science.com/products/7002) |

---

## NeoPixel (WS2812B)

| 製品名 | LED数 | 価格目安 | リンク |
|--------|-------|----------|--------|
| **NeoPixel Ring 12LED** | 12 | ¥1,078 | [スイッチサイエンス](https://www.switch-science.com/products/1593) |
| **NeoPixel Ring 16LED** | 16 | ¥1,287 | [スイッチサイエンス](https://www.switch-science.com/products/1537) |
| **WS2812B 8LEDスティック** | 8 | ¥350 | [秋月電子](https://akizukidenshi.com/catalog/g/g114307/) |
| **WS2812Bモジュール（単体）** | 1 | ¥70 | [秋月電子](https://akizukidenshi.com/catalog/g/g108414/) |

### 電源に関する注意

```
⚠️ 電流消費について
- 1LED あたり最大60mA（白色フル発光時）
- 8LED = 最大480mA
- 16LED = 最大960mA
- 大量のLEDは外部電源必須（5V）
```

---

## モータードライバー

| 製品名 | 対応電流 | 価格目安 | リンク |
|--------|----------|----------|--------|
| **L298N 2Aデュアルモーターコントローラー** | 2A/ch | ¥2,180 | [秋月電子](https://akizukidenshi.com/catalog/g/g106680/) |
| **DRV8835 モータードライバーモジュール** | 1.2A/ch | ¥550 | [秋月電子](https://akizukidenshi.com/catalog/g/g109848/) |
| **TB6612FNG Dual DCモータードライブキット** | 1.2A/ch | ¥450 | [秋月電子](https://akizukidenshi.com/catalog/g/g111219/) / [スイッチサイエンス](https://www.switch-science.com/products/236) |

---

## ブザー・スピーカー

| 製品名 | 種類 | 価格目安 | リンク |
|--------|------|----------|--------|
| **圧電スピーカー** | パッシブ | ¥40 | [秋月電子](https://akizukidenshi.com/catalog/g/g104118/) |

**DigiCodeでは「パッシブブザー」を推奨**（メロディ再生対応）

---

## OTTOロボット専用

### 推奨構成（OTTO 2足歩行）

| 部品 | 推奨品 | 数量 | 単価 | リンク |
|------|--------|------|------|--------|
| ESP32ボード | ESP32 NodeMCU（拡張ボード付き） | 1 | ¥1,782 | [スイッチサイエンス](https://www.switch-science.com/products/9667) |
| サーボ | SG90 | 4 | ¥440 | [秋月電子](https://akizukidenshi.com/catalog/g/g108761/) |
| 超音波センサー | HC-SR04 | 1 | ¥300 | [秋月電子](https://akizukidenshi.com/catalog/g/g111009/) |
| ブザー | 圧電スピーカー | 1 | ¥40 | [秋月電子](https://akizukidenshi.com/catalog/g/g104118/) |
| **合計** | | | **¥3,882** | |

### 推奨構成（OTTO Wheel）

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
