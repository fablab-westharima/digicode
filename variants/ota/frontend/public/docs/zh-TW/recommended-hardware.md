# 推薦硬體清單

**最後更新：** 2026-04-21

DigiCode 已驗證裝置清單。建議從可信賴的零售商購買以確保穩定運作。

---

## 重要注意事項

> **關於廉價仿製品 / 相容品**
>
> 在 AliExpress、Wish、Temu 等平台販售的廉價仿製品有以下問題的回報：
> - 腳位配置不同
> - 電壓 / 電流規格與標示不符
> - 驅動 IC 不同（不相容）
> - 品質差異大
>
> 我們無法提供技術支援，請從推薦零售商購買。

---

## 推薦零售商

| 零售商 | 特色 | URL |
|--------|------|-----|
| **秋月電子通商** | 電子零件老字號，品項豐富 | https://akizukidenshi.com/ |
| **Switch Science** | 面向 Maker，日文文件充實 | https://www.switch-science.com/ |
| **千石電商** | 秋葉原老店，可現場購買 | https://www.sengoku.co.jp/ |
| **Marutsu Online** | 支援企業採購，品質保證 | https://www.marutsu.co.jp/ |
| **M5Stack 官方商店** | M5Stack 系列一手貨源 | https://m5stack.com/ |
| **Seeed Studio 官方** | XIAO 系列一手貨源 | https://www.seeedstudio.com/ |
| **DigiKey** | 海外授權代理商，品質保證 | https://www.digikey.jp/ |
| **Mouser** | 海外授權代理商，品質保證 | https://www.mouser.jp/ |

---

## ESP32 開發板

DigiCode 是**專為 ESP32 系列設計**的積木編輯器。

### 一般 ESP32 系列

| 產品名稱 | 參考價格 | 備註 | 連結 |
|---------|---------|------|------|
| **ESP32 NodeMCU（含擴充板）** | ¥1,782 | 適合初學者的全能配置，附 DC 插座（6.5-16V） | [Switch Science](https://www.switch-science.com/products/9667) |
| **ESP32-DevKitC-32E** | ¥1,480〜 | 標準開發板，已取得技適認證 | [秋月電子](https://akizukidenshi.com/catalog/g/g115673/) / [DigiKey](https://www.digikey.jp/ja/products/detail/espressif-systems/ESP32-DEVKITC-32E/12091810) |
| **ESP32-DevKitC-VE** | ¥1,770〜 | 8MB Flash/RAM，大容量 | [秋月電子](https://akizukidenshi.com/catalog/g/g115674/) |
| **ESPr Developer 32** | ¥2,200 | 日本設計，已取得技適認證 | [Switch Science](https://www.switch-science.com/products/3210) |

### M5Stack 系列

| 產品名稱 | 參考價格 | 備註 | 連結 |
|---------|---------|------|------|
| **M5StampS3A + 專用擴充板** | — | **DigiCode 推薦主控板（專用擴充板開發中，販售開始時將追加詳細資訊）** | [M5Stack 官方](https://shop.m5stack.com/) |
| **M5StickC Plus2** | ¥4,400 | 小型，附螢幕 | [Switch Science](https://www.switch-science.com/products/9426) |
| **ATOM Lite** | ¥1,815 | 超小型，附 1 顆 NeoPixel | [Switch Science](https://www.switch-science.com/products/6262) |
| **ATOM Matrix** | ¥2,420 | NeoPixel 5x5 矩陣 | [Switch Science](https://www.switch-science.com/products/6260) |
| **M5Camera / Unit Cam S3 / Timer Cam** | ¥3,000〜 | 支援攝影機的模組（BP7 相容） | [M5Stack 官方](https://shop.m5stack.com/) |

### Seeed XIAO 系列

| 產品名稱 | 參考價格 | 備註 | 連結 |
|---------|---------|------|------|
| **XIAO ESP32S3** | ¥1,100 | 超小型，USB-C | [Switch Science](https://www.switch-science.com/products/8887) |
| **XIAO ESP32S3 Sense** | ¥2,530 | 內建攝影機 + 麥克風（BP7 相容） | [Switch Science](https://www.switch-science.com/products/8868) |
| **XIAO ESP32C3** | ¥980 | 低功耗，RISC-V | [Switch Science](https://www.switch-science.com/products/8363) |
| **XIAO ESP32C6** | ¥1,280 | 支援 Matter | [Seeed Studio](https://www.seeedstudio.com/Seeed-XIAO-ESP32C6-p-5884.html) |

### 支援但有限制

| 產品 | 限制 |
|------|------|
| ESP32-CAM（OV2640） | 腳位數少，不適合伺服馬達控制等（建議僅作攝影機使用） |

### DigiCode 不支援

| 產品 | 原因 |
|------|------|
| Arduino Uno / Nano | DigiCode 為 ESP32 專用，不在支援範圍 |
| Raspberry Pi Pico（無線版之外） | 無 WiFi，功能受到嚴重限制 |
| ESP8266 | DigiCode 不支援 ESP8266 |
| 其他廠商的微控制器（Renesas / STM 等） | 無支援計畫 |

---

## 伺服馬達

### 推薦伺服馬達（180度）

| 產品名稱 | 參考價格 | 用途 | 連結 |
|---------|---------|------|------|
| **SG90** | ¥440 | 雙足機器人標準，輕負載 | [秋月電子](https://akizukidenshi.com/catalog/g/g108761/) |
| **MG90S** | ¥1,240 | 金屬齒輪，中等負載 | [秋月電子](https://akizukidenshi.com/catalog/g/g113227/) |
| **SG92R** | ¥700 | 高扭力 | [秋月電子](https://akizukidenshi.com/catalog/g/g108914/) |
| **MG996R** | ¥1,480 | 高扭力，大型機器人 | [秋月電子](https://akizukidenshi.com/catalog/g/g112534/) |

### 推薦伺服馬達（連續旋轉 / 360度）

| 產品名稱 | 參考價格 | 用途 | 連結 |
|---------|---------|------|------|
| **FS90R** | ¥500 | 連續旋轉，Wheel 機器人用 | [秋月電子](https://akizukidenshi.com/catalog/g/g113206/) |

### 伺服馬達使用注意事項

```
⚠️ 電源相關重要事項
- 伺服馬達在 USB 供電（500mA）下可能運作不穩定
- 使用多個伺服馬達時必須使用外部電源（5V/2A 以上）
- 請勿從 ESP32 的 3.3V 腳位為伺服馬達供電（需要 5V）
```

---

## 感測器

### 超音波感測器

| 產品名稱 | 參考價格 | 用途 | 連結 |
|---------|---------|------|------|
| **HC-SR04** | ¥300〜 | 標準超音波感測器 | [秋月電子](https://akizukidenshi.com/catalog/g/g111009/) / [Switch Science](https://www.switch-science.com/products/6080) |
| **VL53L0X ToF 感測器** | ¥1,500〜 | 高精度距離測量（30-1200mm） | [Switch Science](https://www.switch-science.com/products/7385) |

### 溫溼度 / 環境感測器

| 產品名稱 | 參考價格 | 精度 | 連結 |
|---------|---------|------|------|
| **DHT11** | ¥550 | 溫度±2℃，濕度±5% | [秋月電子](https://akizukidenshi.com/catalog/g/g107003/) |
| **DHT22（AM2302）** | ¥1,160 | 溫度±0.5℃，濕度±2% | [秋月電子](https://akizukidenshi.com/catalog/g/g107002/) |
| **BME280 模組** | ¥1,380〜 | 溫度 + 濕度 + 氣壓（高精度） | [秋月電子](https://akizukidenshi.com/catalog/g/g109421/) |
| **BMP280 模組** | ¥550〜 | 溫度 + 氣壓（無濕度） | [秋月電子](https://akizukidenshi.com/catalog/g/g109058/) |

### 運動 / 姿態感測器

| 產品名稱 | 參考價格 | 用途 | 連結 |
|---------|---------|------|------|
| **MPU6050 模組** | ¥500〜 | 加速度 + 陀螺儀（倒立擺、微型鼠） | [秋月電子](https://akizukidenshi.com/catalog/g/g109026/) |
| **AS5600 磁性編碼器模組** | ¥600〜 | 絕對角度感測器 | [Switch Science](https://www.switch-science.com/products/9069) |

### HC-SR04 使用注意事項

```
⚠️ 電壓準位相關注意事項
- HC-SR04 以 5V 工作，ESP32 以 3.3V 工作
- Echo 腳位可能輸出 5V
- 建議在 Echo 腳位加上分壓電路（1kΩ + 2kΩ）
```

---

## 顯示器

### OLED（SSD1306）

| 產品名稱 | 尺寸 | 參考價格 | 連結 |
|---------|------|---------|------|
| **0.96 吋 OLED（白色）** | 128x64 | ¥580 | [秋月電子](https://akizukidenshi.com/catalog/g/g112031/) |
| **0.96 吋 OLED（藍色）** | 128x64 | ¥580 | [秋月電子](https://akizukidenshi.com/catalog/g/g115870/) |

### LCD 字元型（I2C 16x2）

| 產品名稱 | 參考價格 | 備註 | 連結 |
|---------|---------|------|------|
| **I2C 16x2 字元型 LCD** | ¥800〜 | 透過 PCF8574，價格實惠且常見 | [秋月電子](https://akizukidenshi.com/catalog/g/g109109/) |

### TFT（ILI9341 / ST7789 / ST7735）

| 產品名稱 | 尺寸 | 參考價格 | 備註 |
|---------|------|---------|------|
| **ST7789 1.3 吋 TFT** | 240x240 | ¥1,500〜 | SPI 連接，彩色 |
| **ILI9341 2.4 吋 TFT** | 240x320 | ¥1,800〜 | SPI 連接，大螢幕 |

---

## NeoPixel（WS2812B）

| 產品名稱 | LED 數量 | 參考價格 | 連結 |
|---------|---------|---------|------|
| **NeoPixel Ring 12LED** | 12 | ¥1,078 | [Switch Science](https://www.switch-science.com/products/1593) |
| **NeoPixel Ring 16LED** | 16 | ¥1,287 | [Switch Science](https://www.switch-science.com/products/1537) |
| **WS2812B 8LED 燈條** | 8 | ¥350 | [秋月電子](https://akizukidenshi.com/catalog/g/g114307/) |
| **WS2812B 模組（單顆）** | 1 | ¥70 | [秋月電子](https://akizukidenshi.com/catalog/g/g108414/) |

### 電源相關注意事項

```
⚠️ 電流消耗
- 每顆 LED 最大 60mA（白色全亮時）
- 8 顆 LED = 最大 480mA
- 16 顆 LED = 最大 960mA
- 大量 LED 必須使用外部電源（5V）
```

---

## 馬達驅動器

| 產品名稱 | 額定電流 | 參考價格 | 連結 |
|---------|---------|---------|------|
| **L298N 2A 雙路馬達控制器** | 2A/ch | ¥2,180 | [秋月電子](https://akizukidenshi.com/catalog/g/g106680/) |
| **DRV8835 馬達驅動模組** | 1.2A/ch | ¥550 | [秋月電子](https://akizukidenshi.com/catalog/g/g109848/) |
| **TB6612FNG 雙路 DC 馬達驅動套件** | 1.2A/ch | ¥450 | [秋月電子](https://akizukidenshi.com/catalog/g/g111219/) / [Switch Science](https://www.switch-science.com/products/236) |

---

## 蜂鳴器 / 音訊

| 產品名稱 | 種類 | 參考價格 | 連結 |
|---------|------|---------|------|
| **壓電喇叭（被動型）** | 被動型 | ¥40 | [秋月電子](https://akizukidenshi.com/catalog/g/g104118/) |
| **DFPlayer Mini（MP3 播放器）** | MP3 | ¥600〜 | [秋月電子](https://akizukidenshi.com/catalog/g/g113277/) |

**DigiCode 推薦使用被動蜂鳴器**（支援旋律播放）

---

## 機器人專用

### 推薦配置（Humanoid 雙足步行）

| 零件 | 推薦品 | 數量 | 單價 | 連結 |
|------|--------|------|------|------|
| ESP32 開發板 | ESP32 NodeMCU（含擴充板） | 1 | ¥1,782 | [Switch Science](https://www.switch-science.com/products/9667) |
| 伺服馬達 | SG90 | 4 | ¥440 | [秋月電子](https://akizukidenshi.com/catalog/g/g108761/) |
| 超音波感測器 | HC-SR04 | 1 | ¥300 | [秋月電子](https://akizukidenshi.com/catalog/g/g111009/) |
| 蜂鳴器 | 壓電喇叭 | 1 | ¥40 | [秋月電子](https://akizukidenshi.com/catalog/g/g104118/) |
| **合計** | | | **¥3,882** | |

> M5StampS3A + 專用擴充板開始販售後，將推薦更省空間的配置。

### 推薦配置（Wheel 機器人）

| 零件 | 推薦品 | 數量 | 單價 | 連結 |
|------|--------|------|------|------|
| ESP32 開發板 | ESP32 NodeMCU（含擴充板） | 1 | ¥1,782 | [Switch Science](https://www.switch-science.com/products/9667) |
| 連續旋轉伺服馬達 | FS90R | 2 | ¥500 | [秋月電子](https://akizukidenshi.com/catalog/g/g113206/) |
| 超音波感測器 | HC-SR04 | 1 | ¥300 | [秋月電子](https://akizukidenshi.com/catalog/g/g111009/) |
| **合計** | | | **¥3,082** | |

---

## 相關文件

- [硬體連接指南](./hardware-setup.md)
- [故障排除](./troubleshooting.md)
- [入門指南](./getting-started.md)
